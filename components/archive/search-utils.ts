import {
  activityDate,
  noteEntries,
  noteTitleDate
} from "@/components/archive/record-utils";
import type { ContentKey, SearchCommand, SearchResult, TimelineItem } from "@/components/archive/types";
import type { RecordEntry } from "@/lib/types";
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
    .sort((a, b) => b.date.localeCompare(a.date) || a.record.priority - b.record.priority || a.title.localeCompare(b.title))
    .slice(0, limit);
}

export function getSearchResults(records: RecordEntry[], query: string, currentGame?: RecordEntry, latestLog?: RecordEntry): SearchResult[] {
  const normalized = query.trim().toLowerCase();
  const commands: SearchCommand[] = [
    { kind: "command", id: "cmd-dashboard", title: "Open dashboard", detail: "Jump to system snapshot", section: "system" },
    { kind: "command", id: "cmd-timeline", title: "Open timeline", detail: "Reconstruct recent archive activity", action: "timeline" },
    { kind: "command", id: "cmd-projects", title: "Open projects", detail: "Browse active and filed processes", section: "projects" },
    { kind: "command", id: "cmd-games", title: "Open games", detail: "Browse session and past logs", section: "games" },
    { kind: "command", id: "cmd-logs", title: "Open logs", detail: "Browse field notes", section: "logs" },
    ...(currentGame ? [{ kind: "command" as const, id: "cmd-active-game", title: "Open active game", detail: currentGame.title, record: currentGame, content: "notes" as ContentKey }] : []),
    ...(latestLog ? [{ kind: "command" as const, id: "cmd-latest-log", title: "Open latest log", detail: latestLog.title, record: latestLog }] : [])
  ];

  if (!normalized) {
    const recentRecords = [...records]
      .filter((record) => record.section !== "system")
      .sort((a, b) => b.updated.localeCompare(a.updated))
      .slice(0, 4)
      .map<SearchResult>((record) => ({ kind: "record", record, detail: `${record.type} / ${record.status}` }));

    return [...commands.slice(0, 4), ...recentRecords].slice(0, 8);
  }

  const commandResults = commands.filter((command) => `${command.title} ${command.detail}`.toLowerCase().includes(normalized));
  const recordResults = records
    .filter((record) => record.section !== "system")
    .filter((record) => {
      const searchable = [
        record.title,
        record.type,
        record.status,
        record.section,
        record.summary,
        noteEntries(record.body).map((note) => note.title).join(" ")
      ].join(" ").toLowerCase();

      return searchable.includes(normalized);
    })
    .sort((a, b) => {
      const aStarts = a.title.toLowerCase().startsWith(normalized) ? 0 : 1;
      const bStarts = b.title.toLowerCase().startsWith(normalized) ? 0 : 1;
      return aStarts - bStarts || b.updated.localeCompare(a.updated) || a.priority - b.priority;
    })
    .slice(0, 6)
    .map<SearchResult>((record) => ({ kind: "record", record, detail: `${record.type} / ${record.status}` }));

  return [...commandResults, ...recordResults].slice(0, 8);
}
