import { Link2 } from "lucide-react";
import recordLinks from "@/public/record-links.js";

export function RecordLinkButton({ id, noteId }: { id: string; noteId?: string }) {
  const label = noteId ? "Copy note link" : "Copy record link";
  return <button className="record-link-button" type="button" aria-label={label} title={label} onClick={(event) => void recordLinks.copyFromControl(event.currentTarget, id, noteId)}><Link2 size={16} aria-hidden="true" /></button>;
}

export function RecordLinkFeedback({ note = false, unavailable = false }: { note?: boolean; unavailable?: boolean }) {
  return <div className="record-link-feedback"><span data-record-copy-status role="status">{unavailable ? "This note is not available in the record." : ""}</span><input aria-label={note ? "Note link" : "Record link"} type="url" readOnly hidden /></div>;
}

export function NoteLinkControl({ id, noteId }: { id: string; noteId: string }) {
  return <div className="note-link-tools"><RecordLinkButton id={id} noteId={noteId} /><RecordLinkFeedback note /></div>;
}
