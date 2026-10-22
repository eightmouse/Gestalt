"use client";

import { motion } from "framer-motion";
import { useRef, useState } from "react";
import type { RecordEntry } from "@/lib/types";
import { formatReadableDate } from "@/components/archive/record-utils";
import type { ContentKey, TimelineItem } from "@/components/archive/types";
import { groupTimelineItems, timelineItemTitle, timelineSources } from "@/components/archive/timeline-utils";

type TimelineWindowProps = {
  items: TimelineItem[];
  onClose: () => void;
  onOpenRecord: (record: RecordEntry, content: ContentKey) => void;
};

export function TimelineWindow({ items, onClose, onOpenRecord }: TimelineWindowProps) {
  const [source, setSource] = useState("all");
  const bodyRef = useRef<HTMLDivElement>(null);
  const sources = timelineSources(items);
  const activeSource = source === "all" || sources.some((item) => item.id === source) ? source : "all";
  const groups = groupTimelineItems(items, activeSource);
  const visibleCount = groups.reduce((count, group) => count + group.items.length, 0);

  return (
    <motion.article
      className="timeline-window"
      aria-label="Archive timeline"
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 14 }}
      transition={{ duration: 0.18 }}
    >
      <header className="window-bar">
        <span>// TIMELINE RECONSTRUCTION</span>
        <div className="window-actions">
          <button type="button" data-window-action="close" aria-label="Close timeline" onClick={onClose}>
            close
          </button>
        </div>
      </header>
      <div className="timeline-toolbar">
        <div className="timeline-range">
          <span>RECENT SIGNALS</span>
          <strong>{items.length ? `${formatReadableDate(items[items.length - 1].date)} to ${formatReadableDate(items[0].date)}` : "No activity recorded"}</strong>
        </div>
        <label className="timeline-source">Source
          <select value={activeSource} aria-controls="timeline-results" onChange={(event) => {
            setSource(event.target.value);
            if (bodyRef.current) bodyRef.current.scrollTop = 0;
          }}>
            <option value="all">All sources ({items.length})</option>
            {sources.map((item) => <option key={item.id} value={item.id}>{item.label} ({item.count})</option>)}
          </select>
        </label>
      </div>
      <div className="timeline-body" ref={bodyRef}>
        <div id="timeline-results">
          <p className="timeline-scope" role="status">Showing {visibleCount} of {items.length} recent signals / Newest first</p>
          {groups.length ? groups.map((group) => (
            <section className="timeline-day" key={group.date} aria-label={formatReadableDate(group.date)}>
              <h2><time dateTime={group.date}>{formatReadableDate(group.date)}</time><span>{group.items.length} {group.items.length === 1 ? "SIGNAL" : "SIGNALS"}</span></h2>
              <ol className="timeline-list">
                {group.items.map((item) => (
                  <li data-state={timelineStateKey(item.record.status)} key={item.id}>
                    <button type="button" onClick={() => onOpenRecord(item.record, item.content)}>
                      <span>{timelineItemTitle(item)}</span>
                      <small>{item.detail}</small>
                      <i>{item.kind === "note" ? "NOTE" : "RECORD"}</i>
                    </button>
                  </li>
                ))}
              </ol>
            </section>
          )) : <p className="timeline-empty">No signals in this view.</p>}
        </div>
      </div>
    </motion.article>
  );
}

function timelineStateKey(status: string): string {
  return status.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "unknown";
}
