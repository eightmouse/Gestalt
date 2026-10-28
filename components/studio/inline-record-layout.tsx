"use client";

import { BookOpen, ImagePlus, Save } from "lucide-react";
import type { ReactNode } from "react";
import { recordHeaderImage } from "@/components/archive/record-utils";
import type { RecordEntry } from "@/lib/types";
import { StudioSaveState, type SaveState } from "@/components/studio/save-state";
import imageFraming from "@/public/image-framing.js";

type InlineContent = "overview" | "notes" | "attachments" | "technical" | "samples" | "recommendation";

export function InlineRecordLayout({ record, content, controls, contents, activeContent, isNew, busy, message, exportRequired, titleAction, headerFraming, saveState, onContentChange, onUpdate, onPickHeader, onPickThumbnail, onSave, onRead, onRefresh }: {
  record: RecordEntry;
  content: ReactNode;
  controls?: ReactNode;
  contents: Array<{ key: InlineContent; label: string }>;
  activeContent: InlineContent;
  isNew: boolean;
  busy: boolean;
  message: string;
  exportRequired: boolean;
  titleAction?: ReactNode;
  headerFraming?: ReactNode;
  saveState: SaveState;
  onContentChange: (key: InlineContent) => void;
  onUpdate: (key: "title" | "status" | "started" | "updated", value: string) => void;
  onPickHeader: () => void;
  onPickThumbnail: () => void;
  onSave: () => void;
  onRead: () => void;
  onRefresh: () => void;
}) {
  const header = recordHeaderImage(record);
  return <>
    <div className="record-main inline-record-main" inert={busy}>
      <div className={header ? "record-heading has-heading-banner" : "record-heading"}>
        {header ? <img className="heading-banner-image" src={header} alt="" decoding="async" style={imageFraming.headerFrameStyle(record.meta)} /> : null}
        <span className="record-kind">{record.type.toUpperCase()}</span>
        <span className="record-id">{isNew ? "UNSAVED" : `#${record.section.slice(0, 3).toUpperCase()}-${record.priority.toString().padStart(3, "0")}`}</span>
        <h2><input className="inline-record-title" aria-label="Record title" placeholder={record.section === "logs" ? "New Note" : record.section === "games" ? "New Game" : "New Project"} value={record.title} onChange={(event) => onUpdate("title", event.target.value)} /></h2>
        {titleAction}
        <p className="inline-record-status">Status: <input aria-label="Record status" value={record.status} onChange={(event) => onUpdate("status", event.target.value)} /><span>.</span>Type: {record.type}</p>
        <div className="inline-record-media-actions" role="group" aria-label="Entry images">
          <button className="inline-record-header-action" type="button" title="Background behind the entry title; separate from overview artwork and samples" onClick={onPickHeader}><ImagePlus size={15} aria-hidden="true" />{header ? "Change header" : "Add header"}</button>
          {record.section === "games" ? <button className="inline-record-header-action" type="button" title="Game cover used for the dashboard and overview artwork; separate from the title background" onClick={onPickThumbnail}><ImagePlus size={15} aria-hidden="true" />{record.banner ? "Change thumbnail" : "Set thumbnail"}</button> : null}
        </div>
      </div>
      {headerFraming}
      {content}
    </div>
    <aside className="record-aside inline-record-aside" aria-label="Local record editing">
      <div inert={busy}><h3>CONTENTS</h3><ol>
        {contents.map(({ key, label }, index) => <li key={key} className={key === activeContent ? "is-active" : ""}><button type="button" onClick={() => onContentChange(key)}>{String(record.section === "projects" ? index : index + 1).padStart(2, "0")}_{label}</button></li>)}
      </ol></div>
      {controls ? <div inert={busy}>{controls}</div> : null}
      <dl className="record-meta"><div><dt>Created:</dt><dd><input type="date" aria-label="Created date" disabled={busy} value={record.started || ""} onChange={(event) => onUpdate("started", event.target.value)} /></dd></div><div><dt>Last Updated:</dt><dd><input type="date" aria-label="Updated date" disabled={busy} value={record.updated} onChange={(event) => onUpdate("updated", event.target.value)} /></dd></div></dl>
      <div className="inline-record-actions">
        <StudioSaveState state={saveState} />
        <button type="button" disabled={busy} onClick={onSave}><Save size={16} aria-hidden="true" />{busy ? "Working..." : "Save Record"}</button>
        <button type="button" disabled={busy} onClick={onRead} title={isNew ? "Close this entry; the draft is kept locally" : "Return to the saved entry; unsaved changes stay in your local draft"}><BookOpen size={16} aria-hidden="true" />{isNew ? "Close draft" : "Read Entry"}</button>
        {exportRequired ? <button type="button" disabled={busy} onClick={onRefresh}>Refresh archive</button> : null}
      </div>
      <p className="inline-record-message" role="status">{message}</p>
    </aside>
  </>;
}
