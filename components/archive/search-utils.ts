import {
  activityDate,
  noteEntries,
  noteTitleDate
} from "@/components/archive/record-utils";
import { setupNarrativeNotes } from "@/components/archive/setup-utils";
import type { SearchResult, TimelineItem } from "@/components/archive/types";
import type { RecordEntry } from "@/lib/types";
import archiveSearch from "@/public/archive-search.js";

export function getTimelineItems(records: RecordEntry[], limit: number): TimelineItem[] {
  return records
    .filter((record) => record.section !== "system")
    .flatMap((record) => {
      const items: TimelineItem[] = [
        {
          content: "overview",
          date: activityDate(record),
          detail: `${record.type} / ${record.status}`,
          id: `${record.id}-activity-${activityDate(record)}`,
          kind: "record",
          record,
          title: `${record.title} updated`
        }
      ];

      noteEntries(record.body).forEach((note, index) => {
        const date = noteTitleDate(note.title);

        if (!date) {
          return;
        }

        items.push({
          content: "notes",
          date,
          detail: `${record.title} / Note ${index + 1}`,
          id: `${record.id}-note-${index}-${date}`,
          kind: "note",
          record,
          title: note.title
        });
      });

      return items;
    })
    .sort((a, b) => b.date.localeCompare(a.date)
      || (b.record.writtenAt || "").localeCompare(a.record.writtenAt || "")
      || (b.record.writtenOrder || 0) - (a.record.writtenOrder || 0)
      || a.record.priority - b.record.priority || a.title.localeCompare(b.title))
    .slice(0, limit);
}

export function getSearchResults(records: RecordEntry[], query: string, currentGame?: RecordEntry, latestLog?: RecordEntry): SearchResult[] {
  return archiveSearch.search(records, query, (record) => record.section === "setup" ? setupNarrativeNotes(record) : noteEntries(record.body), currentGame, latestLog);
}
