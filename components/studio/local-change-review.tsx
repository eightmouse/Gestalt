"use client";

import { Bell } from "lucide-react";
import { createPortal } from "react-dom";
import { useEffect, useRef, useState } from "react";
import "@/app/studio/studio.css";
import { useStudioPublishing } from "@/components/studio/publishing-store";
import { PublishNotificationPanel } from "@/components/studio/change-review-panel";

export function LocalReviewButton() {
  const { pendingChanges, pendingChangesError, publishState, publishing, reviewOpen, setReviewOpen } = useStudioPublishing();
  const failed = Boolean(pendingChangesError || publishState?.phase === "error");
  const count = pendingChanges?.records.length;
  const badge = count === 0 && (pendingChanges?.changedFiles || pendingChanges?.unpushedCommits) ? "+" : count ?? "...";
  return <button className={`local-review-button${failed ? " is-error" : ""}`} type="button" aria-label={`Review saved changes${count === undefined ? "" : ` (${count})`}`}
    title="Review saved changes" aria-haspopup="dialog" aria-expanded={reviewOpen} aria-controls="local-change-review" onClick={() => setReviewOpen(!reviewOpen)}>
    <Bell size={17} aria-hidden="true" /><span aria-hidden="true">{publishing || publishState?.phase === "running" ? "..." : failed ? "!" : badge}</span>
  </button>;
}

export function LocalChangeReview({ busy, onReview }: { busy: boolean; onReview: (id: string) => boolean }) {
  const { pendingChanges, pendingChangesError, publishState, publishing, checking, archiveRefreshRequired,
    reviewOpen, setReviewOpen, refreshPendingChanges, refreshArchive, publishChanges } = useStudioPublishing();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [reviewError, setReviewError] = useState("");

  useEffect(() => {
    void refreshPendingChanges();
    const refresh = () => { if (document.visibilityState === "visible") void refreshPendingChanges(); };
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => { window.removeEventListener("focus", refresh); document.removeEventListener("visibilitychange", refresh); };
  }, [refreshPendingChanges]);

  useEffect(() => {
    if (!reviewOpen) return;
    setReviewError("");
    void refreshPendingChanges(true);
    const dialog = dialogRef.current;
    if (!dialog) return;
    const trigger = document.activeElement;
    dialog.showModal();
    return () => {
      if (dialog.open) dialog.close();
      if (trigger instanceof HTMLElement && trigger.isConnected && trigger !== document.body && trigger.getClientRects().length) trigger.focus({ preventScroll: true });
      else for (const button of document.querySelectorAll<HTMLElement>(".local-review-button")) {
        if (button.getClientRects().length) { button.focus({ preventScroll: true }); break; }
      }
    };
  }, [reviewOpen, refreshPendingChanges]);

  if (!reviewOpen || typeof document === "undefined") return null;
  return createPortal(<dialog ref={dialogRef} id="local-change-review" className="studio-review-dialog" aria-label="Review saved archive changes"
    onKeyDown={(event) => event.stopPropagation()} onCancel={(event) => { event.preventDefault(); setReviewOpen(false); }}
    onClick={(event) => { if (event.target === event.currentTarget) { event.stopPropagation(); setReviewOpen(false); } }}>
    <PublishNotificationPanel changes={pendingChanges} error={reviewError || pendingChangesError} notification={publishState} saving={busy || publishing} checking={checking}
      refreshRequired={archiveRefreshRequired} onClose={() => setReviewOpen(false)} onPublish={() => { void publishChanges(); }} onRefresh={() => { void refreshArchive(); }}
      onRetry={() => { setReviewError(""); void refreshPendingChanges(true); }} onReview={(id) => {
        if (busy || publishing) return;
        if (onReview(id)) setReviewOpen(false);
        else setReviewError("This saved record is not loaded in the reader yet. Refresh the local page, then review it again.");
      }} />
  </dialog>, document.body);
}
