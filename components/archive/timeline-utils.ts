import type { TimelineItem } from "@/components/archive/types";

export function timelineSources(items: TimelineItem[]) {
  const labels = { projects: "Projects", games: "Games", logs: "Logs", setup: "Setup", archive: "Archive" };
  return Object.entries(labels)
    .map(([id, label]) => ({ id, label, count: items.filter((item) => item.record.section === id).length }))
    .filter((source) => source.count > 0);
}

export function groupTimelineItems(items: TimelineItem[], source = "all") {
  const groups = new Map<string, { date: string; items: TimelineItem[] }>();
  for (const item of items) {
    if (source !== "all" && item.record.section !== source) continue;
    const group = groups.get(item.date) ?? { date: item.date, items: [] };
    group.items.push(item);
    groups.set(item.date, group);
  }
  return [...groups.values()];
}

export function timelineItemTitle(item: TimelineItem): string {
  if (item.kind !== "note") return item.title;
  return item.title.replace(/^\s*\d{1,2}\s*\/\s*\d{1,2}\s*\/\s*\d{4}\s*[-:\u2013\u2014|]?\s*/, "").trim() || item.title;
}
