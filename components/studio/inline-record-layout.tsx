"use client";

import { ImagePlus, Save } from "lucide-react";
import type { ReactNode } from "react";
import { recordHeaderImage } from "@/components/archive/record-utils";
import type { RecordEntry } from "@/lib/types";
import { StudioSaveState, type SaveState } from "@/components/studio/save-state";
import imageFraming from "@/public/image-framing.js";
import recordLinks from "@/public/record-links.js";

type InlineContent = "overview" | "notes" | "attachments" | "technical" | "samples" | "recommendation";

export function InlineRecordLayout({ record, content, controls, contents, activeContent, noteSearch, writingNote, isNew, busy, message, exportRequired, titleAction, headerFraming, saveState, onContentChange, onUpdate, onPickHeader, onPickThumbnail, onSave, onRefresh }: {
  record: RecordEntry;
  content: ReactNode;
  controls?: ReactNode;
  contents: Array<{ key: InlineContent; label: string }>;
  activeContent: InlineContent;
  noteSearch?: ReactNode;
  writingNote?: boolean;
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
  onRefresh: () => void;
}) {
  const header = recordHeaderImage(record);
  const editingMetadata = activeContent === "overview";
  const editingLog = record.section === "logs" && activeContent === "notes";
  const titleField = <input className="inline-record-title" aria-label="Record title" placeholder={record.section === "logs" ? "New Note" : record.section === "games" ? "New Game" : "New Project"} value={record.title} onChange={(event) => onUpdate("title", event.target.value)} />;
  const heading = <div className={header ? "record-heading has-heading-banner" : "record-heading"}>
      {header ? <img className="heading-banner-image" src={header} alt="" decoding="async" style={imageFraming.headerFrameStyle(record.meta)} /> : null}
      <span className="record-kind">{record.type.toUpperCase()}</span>
      <span className="record-id">{isNew ? "UNSAVED" : recordLinks.traceId(record.id, record.section)}</span>
      <h2>{editingMetadata ? titleField : record.title}</h2>
      {editingMetadata ? <>
        {titleAction}
        <p className="inline-record-status">Status: <input aria-label="Record status" value={record.status} onChange={(event) => onUpdate("status", event.target.value)} /><span>.</span>Type: {record.type}</p>
        <div className="inline-record-media-actions" role="group" aria-label="Entry images">
          <button className="inline-record-header-action" type="button" title="Background behind the entry title; separate from overview artwork and samples" onClick={onPickHeader}><ImagePlus size={15} aria-hidden="true" />{header ? "Change header" : "Add header"}</button>
          {record.section === "games" ? <button className="inline-record-header-action" type="button" title="Game cover used for the dashboard and overview artwork; separate from the title background" onClick={onPickThumbnail}><ImagePlus size={15} aria-hidden="true" />{record.banner ? "Change thumbnail" : "Set thumbnail"}</button> : null}
        </div>
      </> : null}
    </div>;
  const dates = <dl className="record-meta"><div><dt>Created:</dt><dd><input type="date" aria-label="Created date" disabled={busy} value={record.started || ""} onChange={(event) => onUpdate("started", event.target.value)} /></dd></div><div><dt>Last Updated:</dt><dd><input type="date" aria-label="Updated date" disabled={busy} value={record.updated} onChange={(event) => onUpdate("updated", event.target.value)} /></dd></div></dl>;
  const actions = <div className="inline-record-actions">
      <StudioSaveState state={saveState} />
      <button type="button" disabled={busy} onClick={onSave}><Save size={16} aria-hidden="true" />{busy ? "Working..." : "Save Record"}</button>
      {exportRequired ? <button type="button" disabled={busy} onClick={onRefresh}>Refresh archive</button> : null}
    </div>;
  const status = <p className="inline-record-message" role="status">{message}</p>;

  return <div className={`record-main inline-record-main inline-entry-editor${writingNote ? " is-writing-note" : ""}`}>
    <nav className="record-view-tabs" aria-label="Entry contents" inert={busy}>
      <div className="record-view-tab-links">
        {contents.map(({ key, label }) => <button type="button" key={key} aria-current={key === activeContent ? "true" : undefined} onClick={() => onContentChange(key)}>{label}</button>)}
      </div>
      {noteSearch}
    </nav>
    {actions}
    {message ? status : null}
    <div className="inline-entry-content" inert={busy}>
      {editingLog ? <div className="record-heading inline-log-title"><h2>{titleField}</h2>{titleAction}</div> : !writingNote ? heading : null}
      {editingMetadata ? <>{headerFraming}{dates}{controls ? <div className="inline-entry-controls">{controls}</div> : null}</> : null}
      {content}
    </div>
  </div>;

}
