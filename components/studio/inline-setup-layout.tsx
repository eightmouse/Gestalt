"use client";

import { BookOpen, ChevronDown, ImagePlus, Plus, Save, Trash2, X } from "lucide-react";
import type { ReactNode } from "react";
import { setupGroupRegistry, type SetupGroupId } from "@/components/archive/setup-utils";
import { StudioSaveState, type SaveState } from "@/components/studio/save-state";
import { setupSpecDraft, setupSpecLine } from "@/lib/setup-editing";

type SetupField = "title" | "summary" | "externalUrl" | "status" | "hardware" | "body";
type SetupArtworkField = "headerImage" | "iconImage";

export function InlineSetupLayout({
  group, fields, image, assignedImage, titleHint, notes, busy, isNew, exportRequired, message, saveState,
  onUpdate, onPick, onDrop, onClear, onMove, onDelete, onSave, onRead, onRefresh, onMessage
}: {
  group: SetupGroupId;
  fields: Record<SetupField, string>;
  image: string;
  assignedImage: boolean;
  titleHint: string;
  notes: ReactNode;
  busy: boolean;
  isNew: boolean;
  exportRequired: boolean;
  message: string;
  saveState: SaveState;
  onUpdate: (field: SetupField, value: string) => void;
  onPick: (field: SetupArtworkField) => void;
  onDrop: (files: FileList, field: SetupArtworkField) => void;
  onClear: (field: SetupArtworkField) => void;
  onMove: (group: SetupGroupId) => void;
  onDelete: () => void;
  onSave: () => void;
  onRead: () => void;
  onRefresh: () => void;
  onMessage: (message: string) => void;
}) {
  const artwork = group === "tools" ? "iconImage" : "headerImage";
  const artworkLabel = group === "tools" ? "Shortcut icon" : group === "peripherals" ? "Device photo" : "Profile image";
  const title = <input aria-label="Record title" className="inline-setup-title" value={fields.title} placeholder={titleHint} onChange={(event) => onUpdate("title", event.target.value)} />;
  const summary = <label className="inline-setup-field">{group === "peripherals" ? "Description" : "Summary"}<textarea value={fields.summary} rows={2} onChange={(event) => onUpdate("summary", event.target.value)} /></label>;
  const media = <div className="inline-setup-media" onDragOver={(event) => event.preventDefault()} onDrop={(event) => {
    event.preventDefault();
    if (!busy && event.dataTransfer.files.length) onDrop(event.dataTransfer.files, artwork);
  }}>
    <button className={`inline-setup-image${image ? " has-image" : ""}`} type="button" aria-label={`${image ? "Replace" : "Add"} ${artworkLabel.toLowerCase()}`} onClick={() => onPick(artwork)}>
      {image ? <img src={image} alt="" decoding="async" /> : null}
      <span><ImagePlus size={16} aria-hidden="true" />{image ? `Replace ${artworkLabel.toLowerCase()}` : `Add ${artworkLabel.toLowerCase()}`}</span>
    </button>
    {assignedImage ? <button className="inline-setup-clear" type="button" aria-label={`Remove ${artworkLabel.toLowerCase()}`} title={`Remove ${artworkLabel.toLowerCase()}`} onClick={() => onClear(artwork)}><X size={16} aria-hidden="true" /></button> : null}
  </div>;

  return <div className={`inline-setup-editor inline-setup-editor--${group}`} aria-label="Edit Setup record" aria-busy={busy}>
    <div className="inline-setup-toolbar">
      <StudioSaveState state={saveState} />
      <button type="button" disabled={busy} onClick={onSave}><Save size={15} aria-hidden="true" />Save Record</button>
      <button type="button" disabled={busy} onClick={onRead}><BookOpen size={15} aria-hidden="true" />{isNew ? "Close draft" : "Read entry"}</button>
      {exportRequired ? <button type="button" disabled={busy} onClick={onRefresh}>Refresh archive</button> : null}
    </div>
    <p className="inline-setup-message" role="status">{message}</p>
    <div inert={busy}>
      {group === "systems" ? <>
        <div className="setup-console-body setup-console-body--system">
          {media}
          <div className="setup-fetch"><h2>{title}</h2>{summary}<SetupSpecEditor fields={fields} onUpdate={onUpdate} onMessage={onMessage} /></div>
        </div>
        <div className="inline-setup-notes">{notes}</div>
      </> : group === "peripherals" ? <div className="setup-console-body setup-console-body--peripheral">
        {media}<div className="setup-peripheral-copy"><h2>{title}</h2>{summary}</div>
      </div> : group === "tools" ? <div className="setup-console-body setup-console-body--tool">
        {media}<div className="setup-fetch"><h2>{title}</h2><label className="inline-setup-field">Public link<input type="url" inputMode="url" value={fields.externalUrl} onChange={(event) => onUpdate("externalUrl", event.target.value)} /></label></div>
      </div> : <div className="inline-setup-notes">
        <h2>{title}</h2>{summary}{notes}
      </div>}
      <details className="inline-setup-options">
        <summary>Record options</summary>
        <div>
          <label className="inline-setup-field">Status<input value={fields.status} onChange={(event) => onUpdate("status", event.target.value)} /></label>
          {!isNew ? <>
            <label className="inline-setup-field">Move to group
              <span className="studio-select-control">
                <select value={group} onChange={(event) => {
                  const target = setupGroupRegistry.find(({ id }) => id === event.target.value);
                  if (target) onMove(target.id);
                }}>{setupGroupRegistry.map(({ id, title }) => <option key={id} value={id}>{title[0] + title.slice(1).toLowerCase()}</option>)}</select>
                <ChevronDown aria-hidden="true" />
              </span>
            </label>
            <button className="studio-danger-action" type="button" onClick={onDelete}><Trash2 size={15} aria-hidden="true" />Delete record</button>
          </> : null}
        </div>
      </details>
    </div>
  </div>;
}

function SetupSpecEditor({ fields, onUpdate, onMessage }: {
  fields: Record<SetupField, string>;
  onUpdate: (field: SetupField, value: string) => void;
  onMessage: (message: string) => void;
}) {
  const { field, lines, rows } = setupSpecDraft(fields.hardware, fields.body);
  const change = (index: number, line: string | null, remove = false) => {
    const next = lines.slice();
    if (remove) next.splice(index, 1);
    else if (line !== null) next[index] = line;
    else { onMessage("Use a public spec label without a colon."); return; }
    onUpdate(field, next.join("\n"));
  };
  return <div className="inline-setup-specs" aria-label="System specs">
    {rows.map(({ index, label, value }, row) => <div key={index} className="inline-setup-spec">
      <input aria-label={`Spec ${row + 1} label`} value={label} placeholder="Label" maxLength={32} onChange={(event) => change(index, setupSpecLine(event.target.value, value))} />
      <input aria-label={`Spec ${row + 1} value`} value={value} placeholder="Value" onChange={(event) => change(index, setupSpecLine(label, event.target.value))} />
      <button type="button" aria-label={`Remove spec ${row + 1}`} title={`Remove ${label || "spec"}`} onClick={() => change(index, null, true)}><X size={16} aria-hidden="true" /></button>
    </div>)}
    <button className="inline-setup-add-spec" type="button" onClick={() => {
      const next = lines.slice();
      const last = rows.at(-1);
      next.splice(last ? last.index + 1 : next.length, 0, ": ");
      onUpdate(field, next.join("\n"));
    }}><Plus size={16} aria-hidden="true" />Add spec</button>
  </div>;
}
