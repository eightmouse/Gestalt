"use client";

import { ImagePlus, Save } from "lucide-react";
import type { ReactNode } from "react";
import { recordHeaderImage } from "@/components/archive/record-utils";
import type { RecordEntry } from "@/lib/types";
import { StudioSaveState, type SaveState } from "@/components/studio/save-state";
import { useSaveShortcut } from "@/components/studio/save-shortcut";
import imageFraming from "@/public/image-framing.js";
import recordLinks from "@/public/record-links.js";

type InlineContent = "overview" | "notes" | "attachments" | "technical" | "samples" | "recommendation";

// One picture slot of an entry (its header, a game's cover, a project's overview art), shown as a
// tile with its own picture so every image an entry uses is changed, cleared and framed in one place.
export type InlinePicture = {
  key: string;
  label: string;
  hint: string;
  image: string;
  onPick: () => void;
  onClear: () => void;
  framing?: ReactNode;
};

// The statuses each kind of entry actually uses, offered as chips; anything else is typed in.
const STATUS_PRESETS: Record<string, string[]> = {
  projects: ["Active", "In Progress", "Paused", "Completed"],
  games: ["Playing", "Completed", "Dropped", "Draft"],
  logs: ["Draft", "Filed"]
};

export function InlineRecordLayout({ record, content, details, pictures = [], contents, activeContent, noteSearch, writingNote, isNew, busy, message, exportRequired, titleAction, saveState, onContentChange, onUpdate, onSave, onRefresh }: {
  record: RecordEntry;
  content: ReactNode;
  details?: ReactNode;
  pictures?: InlinePicture[];
  contents: Array<{ key: InlineContent; label: string }>;
  activeContent: InlineContent;
  noteSearch?: ReactNode;
  writingNote?: boolean;
  isNew: boolean;
  busy: boolean;
  message: string;
  exportRequired: boolean;
  titleAction?: ReactNode;
  saveState: SaveState;
  onContentChange: (key: InlineContent) => void;
  onUpdate: (key: "title" | "status" | "started" | "updated", value: string) => void;
  onSave: () => void;
  onRefresh: () => void;
}) {
  useSaveShortcut(onSave, busy);
  const header = recordHeaderImage(record);
  const editingMetadata = activeContent === "overview";
  const editingLog = record.section === "logs" && activeContent === "notes";
  const titleField = <input className="inline-record-title" aria-label="Record title" placeholder={record.section === "logs" ? "New Note" : record.section === "games" ? "New Game" : "New Project"} value={record.title} onChange={(event) => onUpdate("title", event.target.value)} />;
  const heading = <div className={header ? "record-heading has-heading-banner" : "record-heading"}>
      {header ? <img className="heading-banner-image" src={header} alt="" decoding="async" style={imageFraming.headerFrameStyle(record.meta)} /> : null}
      <span className="record-kind">{record.type.toUpperCase()}</span>
      <span className="record-id">{isNew ? "UNSAVED" : recordLinks.traceId(record.id, record.section)}</span>
      <h2>{record.title}</h2>
    </div>;

  const presets = STATUS_PRESETS[record.section] ?? [];
  const customStatus = presets.includes(record.status) ? "" : record.status;
  const identity = <section className="inline-editor-block inline-identity" aria-label="Identity">
    <header className="inline-editor-block-head"><span>Identity</span><small>{record.type} · {isNew ? "unsaved" : recordLinks.traceId(record.id, record.section)}</small></header>
    <div className="inline-identity-title">{titleField}{titleAction}</div>
    <div className="inline-status-row" role="group" aria-label="Record status">
      <span className="inline-field-label">Status</span>
      {presets.map((status) => <button key={status} type="button" className="inline-status-chip" aria-pressed={record.status === status} onClick={() => onUpdate("status", status)}>{status}</button>)}
      <input className="inline-status-custom" aria-label="Custom status" placeholder="Other…" value={customStatus} onChange={(event) => onUpdate("status", event.target.value || presets[0] || "")} />
    </div>
    <div className="inline-identity-dates">
      <label><span className="inline-field-label">Created</span><input type="date" aria-label="Created date" disabled={busy} value={record.started || ""} onChange={(event) => onUpdate("started", event.target.value)} /></label>
      <label><span className="inline-field-label">Last updated</span><input type="date" aria-label="Updated date" disabled={busy} value={record.updated} onChange={(event) => onUpdate("updated", event.target.value)} /></label>
    </div>
  </section>;

  const framings = pictures.filter((picture) => picture.image && picture.framing);
  const pictureBlock = pictures.length ? <section className="inline-editor-block inline-pictures" aria-label="Pictures">
    <header className="inline-editor-block-head"><span>Pictures</span></header>
    <div className="inline-picture-grid">
      {pictures.map((picture) => <div className="inline-picture" key={picture.key} data-empty={picture.image ? undefined : ""}>
        <button type="button" className="inline-picture-face" title={picture.hint} onClick={picture.onPick} aria-label={`${picture.image ? "Change" : "Add"} ${picture.label.toLowerCase()}`}>
          {picture.image ? <img src={picture.image} alt="" decoding="async" /> : <ImagePlus size={18} aria-hidden="true" />}
        </button>
        <div className="inline-picture-meta">
          <strong>{picture.label}</strong>
          {picture.image ? <button type="button" onClick={picture.onClear}>Clear</button> : <small>{picture.hint}</small>}
        </div>
      </div>)}
    </div>
    {framings.length ? <div className="inline-picture-framing">{framings.map((picture) => <div key={picture.key}>{picture.framing}</div>)}</div> : null}
  </section> : null;

  const saveBar = <div className="inline-record-actions inline-save-bar">
      <StudioSaveState state={saveState} />
      {message ? <p className="inline-record-message" role="status">{message}</p> : null}
      <kbd className="inline-save-hint" aria-hidden="true">Ctrl+S</kbd>
      {exportRequired ? <button type="button" disabled={busy} onClick={onRefresh}>Refresh archive</button> : null}
      <button type="button" disabled={busy} onClick={onSave}><Save size={16} aria-hidden="true" />{busy ? "Working..." : "Save Record"}</button>
    </div>;

  return <div className={`record-main inline-record-main inline-entry-editor${writingNote ? " is-writing-note" : ""}`}>
    <nav className="record-view-tabs" aria-label="Entry contents" inert={busy}>
      <div className="record-view-tab-links">
        {contents.map(({ key, label }) => <button type="button" key={key} aria-current={key === activeContent ? "true" : undefined} onClick={() => onContentChange(key)}>{label}</button>)}
      </div>
      {noteSearch}
    </nav>
    <div className="inline-entry-content" inert={busy}>
      {editingMetadata ? <div className="inline-overview">{identity}{pictureBlock}{details ?? content}</div>
        : <>{editingLog ? <div className="record-heading inline-log-title"><h2>{titleField}</h2>{titleAction}</div> : !writingNote ? heading : null}{content}</>}
    </div>
    {saveBar}
  </div>;

}
