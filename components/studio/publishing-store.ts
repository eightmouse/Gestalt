"use client";

import { create } from "zustand";
import { readStudioResponse, type PublishState, type StudioPendingChanges } from "@/lib/studio-client-api";

type PublishingStore = {
  publishState: PublishState | null;
  pendingChanges: StudioPendingChanges | null;
  pendingChangesError: string;
  archiveRefreshRequired: boolean;
  checking: boolean;
  publishing: boolean;
  reviewOpen: boolean;
  setPublishState: (value: PublishState) => void;
  setArchiveRefreshRequired: (value: boolean) => void;
  setReviewOpen: (value: boolean) => void;
  refreshPendingChanges: (force?: boolean) => Promise<void>;
  refreshArchive: () => Promise<boolean>;
  publishChanges: () => Promise<boolean>;
};

let readSequence = 0;
let pendingRead: Promise<void> | null = null;

export const useStudioPublishing = create<PublishingStore>((set, get) => ({
  publishState: null, pendingChanges: null, pendingChangesError: "", archiveRefreshRequired: false,
  checking: false, publishing: false, reviewOpen: false,
  setPublishState: (publishState) => set({ publishState }),
  setArchiveRefreshRequired: (archiveRefreshRequired) => set({ archiveRefreshRequired }),
  setReviewOpen: (reviewOpen) => set({ reviewOpen }),
  refreshPendingChanges: (force = false) => {
    if (process.env.NODE_ENV !== "development") return Promise.resolve();
    if (pendingRead && !force) return pendingRead;
    const sequence = ++readSequence;
    set({ checking: true });
    const task = (async () => {
      try {
        const response = await fetch("/api/studio/changes", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}", signal: AbortSignal.timeout(15_000) });
        const data = await readStudioResponse(response);
        if (!response.ok || !Array.isArray(data.records)) throw new Error(data.error || "Could not read pending changes.");
        if (sequence !== readSequence) return;
        set({ pendingChanges: data as StudioPendingChanges, archiveRefreshRequired: data.staticExportRequired === true, pendingChangesError: "" });
      } catch (error) {
        if (sequence === readSequence) set({ pendingChangesError: error instanceof Error ? error.message : "Could not read pending changes." });
      } finally {
        if (sequence === readSequence) set({ checking: false });
      }
    })();
    pendingRead = task.finally(() => { if (sequence === readSequence) pendingRead = null; });
    return pendingRead;
  },
  refreshArchive: async () => {
    if (process.env.NODE_ENV !== "development" || get().publishing) return false;
    set({ publishing: true, publishState: { phase: "running", title: "Refreshing archive", detail: "Rebuilding the static archive from saved records." } });
    try {
      const response = await fetch("/api/studio/export", { method: "POST" });
      const data = await readStudioResponse(response);
      if (!response.ok) throw new Error(data.error || "Archive refresh failed.");
      set({ archiveRefreshRequired: false, publishState: { phase: "success", title: "Archive refreshed", detail: data.message || "Saved records are ready to publish." } });
      return true;
    } catch (error) {
      set({ archiveRefreshRequired: true, publishState: { phase: "error", title: "Archive refresh failed", detail: error instanceof Error ? error.message : "Retry the archive refresh." } });
      return false;
    } finally { await get().refreshPendingChanges(true); set({ publishing: false }); }
  },
  publishChanges: async () => {
    if (process.env.NODE_ENV !== "development" || get().publishing) return false;
    set({ publishing: true });
    try {
      await get().refreshPendingChanges(true);
      if (get().pendingChangesError) throw new Error("Refresh the pending list before publishing.");
      if (get().pendingChanges?.siteCodeFiles?.length) {
        set({ publishState: { phase: "error", title: "Site update pending", detail: "Your saved notes are safe. Publish becomes available once the pending site-code batch is reviewed and committed." } });
        return false;
      }
      if (get().archiveRefreshRequired) throw new Error("Refresh the archive before publishing.");
      set({ publishState: { phase: "running", title: "Publishing archive", detail: "Running checks, committing, and pushing saved changes to GitHub." } });
      const response = await fetch("/api/studio/publish", { method: "POST" });
      const data = await readStudioResponse(response);
      if (!response.ok) {
        const siteUpdatePending = data.code === "SITE_UPDATE_PENDING" || data.output?.includes("Publish blocked: public site code has uncommitted changes");
        const detail = siteUpdatePending
          ? "Your note is saved locally. Publishing is waiting for the current site-code changes to be reviewed and committed; no push was attempted."
          : data.error || "GitHub publish failed. Saved records remain local.";
        set({ publishState: { phase: "error", title: siteUpdatePending ? "Site update pending" : "Publish blocked", detail, output: data.output, summary: data.summary } });
        return false;
      }
      set({ publishState: { phase: "success", title: data.published === false ? "Nothing to publish" : "Archive pushed", detail: data.message || "GitHub received the update. Pages deployment runs separately.", output: data.output, summary: data.summary } });
      return true;
    } catch (error) {
      set({ publishState: { phase: "error", title: "Publish failed", detail: error instanceof Error ? error.message : "Publish failed. Saved records remain local." } });
      return false;
    } finally { await get().refreshPendingChanges(true); set({ publishing: false }); }
  }
}));
