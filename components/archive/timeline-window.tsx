"use client";

import { motion } from "framer-motion";
import type { RecordEntry } from "@/lib/types";
import { formatReadableDate } from "@/components/archive/record-utils";
import type { ContentKey, TimelineItem } from "@/components/archive/types";

type TimelineWindowProps = {
  items: TimelineItem[];
  onClose: () => void;
  onOpenRecord: (record: RecordEntry, content: ContentKey) => void;
};

export function TimelineWindow({ items, onClose, onOpenRecord }: TimelineWindowProps) {
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
      <div className="timeline-body">
        <div className="timeline-summary">
          <p>RECENT SIGNALS</p>
          <strong>{items.length}</strong>
          <span>records and notes sorted by observed date</span>
        </div>
        <ol className="timeline-list">
          {items.map((item) => (
            <li key={item.id}>
              <time>{formatReadableDate(item.date)}</time>
              <button type="button" onClick={() => onOpenRecord(item.record, item.content)}>
                <span>{item.title}</span>
                <small>{item.detail}</small>
              </button>
            </li>
          ))}
        </ol>
      </div>
    </motion.article>
  );
}
