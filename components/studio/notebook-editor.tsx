"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Archive, BookOpen, Save, Settings } from "lucide-react";
import { fileNotebookRelease, validateRoadmap, type NotebookFiling, type PublicRoadmap, type RoadmapChapterId } from "@/public/roadmap.mjs";
import { useStudioPublishing } from "@/components/studio/publishing-store";
import "@/app/studio/notebook.css";

export type NotebookAuthoring = {
  data: PublicRoadmap;
  editing: boolean;
  busy: boolean;
  message: string;
  error: boolean;
  filingOpen: boolean;
  filingPanel: ReactNode;
  change: (chapter: RoadmapChapterId, index: number, patch: Partial<PublicRoadmap["groups"][number]["items"][number]>) => void;
  add: (chapter: RoadmapChapterId) => void;
  remove: (chapter: RoadmapChapterId, index: number) => void;
};
type Draft = { data: PublicRoadmap; revision: string };
const draftKey = "gestalt-notebook-draft-v1";
let retainedDraft: Draft | null = null;

function keepDraft(draft: Draft | null) {
  retainedDraft = draft;
  try { if (draft) sessionStorage.setItem(draftKey, JSON.stringify(draft)); else sessionStorage.removeItem(draftKey); } catch { /* In-memory recovery still works for this visit. */ }
}
function recoverDraft(): Draft | null {
  if (retainedDraft) return retainedDraft;
  try {
    const draft = JSON.parse(sessionStorage.getItem(draftKey) || "null");
    if (draft && typeof draft.revision === "string") {
      // Empty titles are allowed while typing, not on save.
      validateRoadmap({ ...draft.data, groups: draft.data.groups.map((group: PublicRoadmap["groups"][number]) => ({ ...group, items: group.items.map((item) => ({ ...item, title: item.title.trim() || "Untitled" })) })) });
      return draft;
    }
  } catch { /* A damaged draft must not prevent reading the notebook. */ }
  return null;
}
async function notebookRequest(payload: object) {
  const response = await fetch("/api/studio/notebook", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload), signal: AbortSignal.timeout(15_000) });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || "Notebook request failed. Your draft is kept.");
  return { data: validateRoadmap(result.data), revision: String(result.revision) };
}

export function NotebookEditorControls({ data, onChange }: { data: PublicRoadmap; onChange: (editor: NotebookAuthoring) => void }) {
  const [draft, setDraft] = useState(data);
  const [saved, setSaved] = useState<Draft | null>(null);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");
  const [filingOpen, setFilingOpen] = useState(false);
  const [filing, setFiling] = useState<NotebookFiling>({ version: "", date: "", items: [] });
  const [filedVersion, setFiledVersion] = useState("");
  const draftRef = useRef(draft);
  const revision = useRef("");
  const mounted = useRef(true);
  const publishing = useStudioPublishing((state) => state.publishing);
  const refreshPendingChanges = useStudioPublishing((state) => state.refreshPendingChanges);
  const dirty = saved !== null && JSON.stringify(draft) !== JSON.stringify(saved.data);
  const completed = draft.groups.filter((group) => group.id !== "done").flatMap((group) => group.items.flatMap((item, index) => item.completed ? [{ key: `${group.id}:${index}`, title: item.title }] : []));

  useEffect(() => {
    mounted.current = true;
    let active = true;
    notebookRequest({ action: "read" }).then((current) => {
      if (!active) return;
      const recovery = recoverDraft();
      setSaved(current);
      revision.current = recovery?.revision || current.revision;
      draftRef.current = recovery?.data || current.data;
      setDraft(draftRef.current);
      if (recovery) {
        setEditing(true);
        if (recovery.revision !== current.revision) setError("A newer saved notebook exists. Your draft is kept. Reload saved copy to discard this draft, or keep it open for review.");
      }
    }).catch((failure) => { if (active) setError(failure.message); })
      .finally(() => { if (active) setBusy(false); });
    return () => { active = false; mounted.current = false; };
  }, []);

  const update = (next: PublicRoadmap) => {
    draftRef.current = next;
    setDraft(next);
    const reverted = saved !== null && JSON.stringify(next) === JSON.stringify(saved.data);
    if (reverted) revision.current = saved.revision;
    keepDraft(reverted ? null : { data: next, revision: revision.current });
    setError("");
  };
  useEffect(() => {
    onChange({ data: draft, editing, busy: busy || publishing, error: Boolean(error),
      filingOpen,
      filingPanel: filingOpen ? <form className="notebook-filing" aria-label="File notebook release" onSubmit={(event) => { event.preventDefault(); void save(filing); }}>
        <fieldset disabled={busy || publishing}>
          <legend>File release</legend>
          <div className="notebook-release-fields">
            <label>Version<input autoFocus required maxLength={32} placeholder="v1.70.0" value={filing.version} onChange={(event) => setFiling({ ...filing, version: event.target.value })} /></label>
            <label>Release date<input required type="date" value={filing.date} onChange={(event) => setFiling({ ...filing, date: event.target.value })} /></label>
          </div>
          <div className="notebook-file-selection">{completed.map((item) => <label key={item.key}><input type="checkbox" checked={filing.items.includes(item.key)} onChange={(event) => setFiling({ ...filing, items: event.target.checked ? [...filing.items, item.key] : filing.items.filter((key) => key !== item.key) })} /><span>{item.title}</span></label>)}</div>
          <div className="notebook-filing-actions"><button type="submit" disabled={!filing.items.length}><Archive size={14} />Save release locally</button><button type="button" onClick={() => setFilingOpen(false)}>Cancel</button></div>
        </fieldset>
      </form> : null,
      message: error || (busy ? "Working locally..." : !saved ? "Notebook editing unavailable." : dirty ? "Unsaved notebook draft" : filedVersion ? `Release ${filedVersion} saved locally` : "Saved locally"),
      change: (chapter, index, patch) => {
        if (busy || publishing || filingOpen || !editing || chapter === "done") return;
        update({ ...draft, groups: draft.groups.map((group) => group.id === chapter ? { ...group, items: group.items.map((item, i) => i === index ? { ...item, ...patch } : item) } : group) });
      },
      add: (chapter) => {
        if (busy || publishing || filingOpen || !editing || chapter === "done") return;
        update({ ...draft, groups: draft.groups.map((group) => group.id === chapter && group.items.length < 40 ? { ...group, items: [...group.items, { title: "New item", detail: "" }] } : group) });
      },
      remove: (chapter, index) => {
        if (busy || publishing || filingOpen || !editing || chapter === "done") return;
        const item = draft.groups.find((group) => group.id === chapter)?.items[index];
        if (!item || !window.confirm(`Remove "${item.title || "Untitled"}" from this notebook draft?`)) return;
        update({ ...draft, groups: draft.groups.map((group) => group.id === chapter ? { ...group, items: group.items.filter((_, i) => i !== index) } : group) });
      }
    });
  }, [draft, editing, busy, publishing, error, saved, dirty, filingOpen, filing, filedVersion, onChange]);

  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  useEffect(() => {
    if (!editing) return;
    const fit = () => document.querySelectorAll<HTMLTextAreaElement>(".roadmap-dialog .notebook-item-editor textarea").forEach((node) => {
      node.style.height = "auto"; node.style.height = `${node.scrollHeight + 2}px`;
    });
    window.addEventListener("resize", fit, { passive: true });
    return () => window.removeEventListener("resize", fit);
  }, [editing]);

  const save = async (release?: NotebookFiling) => {
    if (busy || publishing || !saved) return;
    if (release) {
      try { fileNotebookRelease(draftRef.current, release); }
      catch (failure) { setError(failure instanceof Error ? failure.message : "Check the release details."); return; }
    }
    setBusy(true); setError("");
    try {
      const result = await notebookRequest({ action: release ? "file" : "save", data: draftRef.current, revision: revision.current, ...(release ? { filing: release } : {}) });
      keepDraft(null);
      revision.current = result.revision;
      draftRef.current = result.data;
      if (mounted.current) { setSaved(result); setDraft(result.data); setFilingOpen(false); if (release) setFiledVersion(release.version.trim().replace(/^v?/, "v")); }
      await refreshPendingChanges(true);
    } catch (failure) { if (mounted.current) setError(failure instanceof Error ? failure.message : "Save failed. Your draft is kept."); }
    finally { if (mounted.current) setBusy(false); }
  };
  const reload = async () => {
    if (busy || publishing || (dirty && !window.confirm("Discard this notebook draft and reload the saved copy?"))) return;
    setBusy(true);
    try {
      const current = await notebookRequest({ action: "read" });
      keepDraft(null); revision.current = current.revision; draftRef.current = current.data;
      if (mounted.current) { setSaved(current); setDraft(current.data); setError(""); setFilingOpen(false); }
    } catch { if (mounted.current) setError("Could not reload. Your draft is kept."); }
    finally { if (mounted.current) setBusy(false); }
  };
  return <div className="notebook-editor-controls">
    {error ? <button type="button" disabled={busy || publishing} onClick={() => { void reload(); }} title="Reload saved copy" aria-label="Reload saved notebook"><BookOpen size={15} /></button> : null}
    {editing ? <button type="button" className="notebook-save" disabled={!dirty || busy || publishing || !saved || filingOpen} onClick={() => { void save(); }}><Save size={15} /><span>Save</span></button> : null}
    {editing && completed.length > 0 ? <button type="button" disabled={busy || publishing || !saved} aria-label="File release" title="File release" aria-pressed={filingOpen} onClick={() => {
      const today = new Date();
      setFiling({ version: "", date: `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`, items: completed.map((item) => item.key) });
      setFilingOpen((value) => !value); setError("");
    }}><Archive size={14} /></button> : null}
    <button type="button" className="window-edit-action" disabled={busy || publishing || !saved} onClick={() => { setEditing((value) => !value); setFilingOpen(false); }} aria-pressed={editing} title={editing ? "Read notebook" : "Edit notebook"} aria-label={editing ? "Read notebook" : "Edit notebook"}><Settings size={14} /></button>
  </div>;
}
