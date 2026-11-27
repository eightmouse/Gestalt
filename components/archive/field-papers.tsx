import { useLayoutEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { fieldPaperExcerpt, formatReadableDate } from "@/components/archive/record-utils";
import { logArchiveDate } from "@/lib/log-archive";
import type { RecordEntry } from "@/lib/types";
import pocket from "@/public/pocket-index.js";

function FieldPaperFace({ record }: { record: RecordEntry }) {
  const date = logArchiveDate(record);
  const excerpt = fieldPaperExcerpt(record);
  return <span className="field-paper-face">
    <span className="field-paper-meta"><span>FIELD NOTE</span><time dateTime={date}>{formatReadableDate(date)}</time></span>
    <strong className="field-paper-title">{record.title}</strong>
    {excerpt && <span className="field-paper-excerpt">{excerpt}</span>}
  </span>;
}

export function FieldPapers({ records, onOpenRecord }: { records: RecordEntry[]; onOpenRecord: (record: RecordEntry) => void }) {
  const [selected, setSelected] = useState<string>();
  const front = useRef<HTMLButtonElement>(null);
  const focusFront = useRef(false);
  const { record, index, total, edges, previous, next } = pocket.fieldPaperStack(records, selected);

  useLayoutEffect(() => {
    if (focusFront.current) front.current?.focus({ preventScroll: true });
    focusFront.current = false;
  }, [record?.id]);

  if (!record) return <div className="field-paper-desk"><p className="search-empty">No recent field notes.</p></div>;

  return <section className="field-paper-desk" aria-label="Field papers">
    <div className="field-paper-deck" id="field-paper-deck">
      <button className="field-paper-front" key={record.id} ref={front} type="button" data-field-current={record.id} data-field-lean={index % 2 ? "right" : "left"} data-field-arriving={selected === record.id ? "" : undefined} aria-label={`Read ${record.title}`} onClick={() => onOpenRecord(record)}>
        <FieldPaperFace record={record} />
      </button>
      {edges.map((edge) =>
        <button className="field-paper-peek" key={edge.id} type="button" data-field-peek={edge.id} aria-label={`Bring ${edge.title} forward`} onClick={() => {
          focusFront.current = true;
          setSelected(edge.id);
        }}>
          <FieldPaperFace record={edge} />
          <span className="field-paper-spine-label" aria-hidden="true">{edge.title}</span>
        </button>
      )}
    </div>
    {total > 3 && <nav className="field-paper-pager" aria-label="Browse field papers">
      <button type="button" aria-label="Newer field note" aria-controls="field-paper-deck" aria-disabled={!previous} onClick={() => previous && setSelected(previous)}><ChevronLeft size={18} aria-hidden="true" /></button>
      <span role="status"><span className="field-paper-status-title">{record.title}: </span><span data-field-position>{index + 1} / {total}</span></span>
      <button type="button" aria-label="Older field note" aria-controls="field-paper-deck" aria-disabled={!next} onClick={() => next && setSelected(next)}><ChevronRight size={18} aria-hidden="true" /></button>
    </nav>}
  </section>;
}
