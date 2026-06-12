import type { RecordEntry } from "@/lib/types";

export type ArchiveMetrics = {
  activeGame?: RecordEntry;
  activeProjects: number;
  latestActivityDate: string;
  mediaCount: number;
  recordCount: number;
};

export type ActivityEntry = {
  content?: "notes";
  date: string;
  detail: string;
  record: RecordEntry;
  title: string;
};

export function formatClock(date: Date | null): string {
  if (!date) {
    return "--:--";
  }

  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).format(date);
}

export function formatDate(date: Date | null): string {
  if (!date) {
    return "-- / -- / ----";
  }

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  })
    .format(date)
    .replaceAll("/", " / ");
}

export function shortDate(value: string): string {
  const [year, month, day] = value.split("-");
  return year && month && day ? `${day}/${month}` : "--/--";
}

export function formatReadableDate(value: string): string {
  const [year, month, day] = value.split("-");
  return year && month && day ? `${day} / ${month} / ${year}` : value;
}

export function recordHeaderImage(record: RecordEntry): string {
  return typeof record.meta.headerImage === "string" ? record.meta.headerImage : "";
}

export function recordDashboardImage(record: RecordEntry): string {
  return typeof record.meta.dashboardImage === "string" ? record.meta.dashboardImage : record.banner || "/images/archive-banner.png";
}

export function splitUpdateIndex(body: string): { mainBody: string; updates: string[] } {
  const lines = body.split(/\r?\n/);
  const startIndex = lines.findIndex((line) => line.trim() === "## Update Index");

  if (startIndex === -1) {
    return { mainBody: body, updates: [] };
  }

  let endIndex = lines.length;

  for (let index = startIndex + 1; index < lines.length; index += 1) {
    if (lines[index].startsWith("## ") || lines[index].startsWith(":::note ") || lines[index].startsWith(":::previous-note ")) {
      endIndex = index;
      break;
    }
  }

  const updates = lines
    .slice(startIndex + 1, endIndex)
    .map((line) => line.trim())
    .filter((line) => line.startsWith("- "))
    .map((line) => line.slice(2));
  const mainBody = [...lines.slice(0, startIndex), ...lines.slice(endIndex)].join("\n").trim();

  return { mainBody, updates };
}

export function noteEntries(body: string): Array<{ title: string; body: string }> {
  const { mainBody } = splitUpdateIndex(body);
  const lines = mainBody.split(/\r?\n/);
  const notes: Array<{ title: string; body: string }> = [];

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const notePrefix = line.startsWith(":::previous-note ") ? ":::previous-note " : ":::note ";

    if (!line.startsWith(":::note ") && !line.startsWith(":::previous-note ")) {
      continue;
    }

    const title = line.slice(notePrefix.length).trim() || "Untitled note";
    const innerLines: string[] = [];

    index += 1;

    while (index < lines.length && lines[index].trim() !== ":::") {
      innerLines.push(lines[index]);
      index += 1;
    }

    notes.push({ title, body: innerLines.join("\n").trim() });
  }

  if (!notes.length && mainBody.trim()) {
    notes.push({ title: "Current note", body: mainBody.trim() });
  }

  return notes;
}

export function setupHardwareFallback(body: string): string {
  const notes = noteEntries(body);

  if (!notes.length) {
    return body;
  }

  return notes.map((note) => note.body).filter(Boolean).join("\n\n") || body;
}

export function metaText(value: unknown): string {
  if (typeof value === "string") {
    return decodeTextBlock(value);
  }

  if (Array.isArray(value)) {
    return value.map((item) => String(item)).join("\n");
  }

  return "";
}

export function decodeTextBlock(value: string): string {
  return value.replace(/\\+n/g, "\n");
}

export function recentActivity(records: RecordEntry[], limit: number): ActivityEntry[] {
  return records
    .filter((record) => record.section !== "system")
    .map((record) => {
      const trace = activityTrace(record);
      const setupDetail = setupActivityDetail(record);

      return {
        content: trace && !setupDetail ? "notes" as const : undefined,
        date: trace?.date ?? record.updated,
        detail: setupDetail ?? (trace ? `${record.type} / ${activityTraceTitle(trace.note.title)}` : record.type),
        record,
        title: record.title
      };
    })
    .sort((a, b) => b.date.localeCompare(a.date) || b.record.updated.localeCompare(a.record.updated) || a.record.priority - b.record.priority)
    .slice(0, limit);
}

export function recordDisplaySummary(record: RecordEntry): string {
  const latestNote = noteEntries(record.body)[0];
  const fallback = excerptFromBody(latestNote?.body ?? record.body);
  const summary = cleanSummaryText(record.summary);

  if (summary && wordCount(summary) >= 22) {
    return summary;
  }

  return fallback || summary || "No summary recorded.";
}

export function getArchiveMetrics(records: RecordEntry[], activeGame?: RecordEntry): ArchiveMetrics {
  const publicRecords = records.filter((record) => record.section !== "system");
  const latestActivityDate = recentActivity(records, 1)[0]?.date ?? publicRecords[0]?.updated ?? "";

  return {
    activeGame,
    activeProjects: records.filter((record) => record.section === "projects" && ["active", "in progress", "planning"].includes(record.status.toLowerCase())).length,
    latestActivityDate,
    mediaCount: countMediaPaths(publicRecords),
    recordCount: publicRecords.length
  };
}

export function activityDate(record: RecordEntry): string {
  return activityTrace(record)?.date ?? record.updated;
}

function activityTrace(record: RecordEntry): { date: string; note: { title: string; body: string } } | null {
  if (record.section === "setup" && setupGroupForActivity(record) !== "notes") {
    return null;
  }

  const latestNote = noteEntries(record.body)
    .map((note) => ({ date: noteTitleDate(note.title), note }))
    .filter((entry): entry is { date: string; note: { title: string; body: string } } => Boolean(entry.date))
    .sort((a, b) => b.date.localeCompare(a.date))[0];

  if (!latestNote || latestNote.date < record.updated) {
    return null;
  }

  return latestNote;
}

function setupActivityDetail(record: RecordEntry): string | null {
  if (record.section !== "setup") {
    return null;
  }

  const group = setupGroupForActivity(record);

  if (group === "tools") {
    return "Setup Tool / Shortcut";
  }

  if (group === "peripherals") {
    return "Setup Peripheral / Device";
  }

  if (group === "systems") {
    return "Setup System / Profile";
  }

  return null;
}

function setupGroupForActivity(record: RecordEntry): "systems" | "tools" | "peripherals" | "notes" {
  const explicitGroup = [record.meta.setupGroup, record.meta.setupKind, record.meta.category]
    .map((value) => (typeof value === "string" ? value.toLowerCase().trim() : ""))
    .find(Boolean);

  if (explicitGroup) {
    if (/\b(tool|tools|app|apps|software|shortcut)\b/.test(explicitGroup)) {
      return "tools";
    }

    if (/\b(peripheral|peripherals|device|hardware|gear|photo)\b/.test(explicitGroup)) {
      return "peripherals";
    }

    if (/\b(note|notes|file|memo)\b/.test(explicitGroup)) {
      return "notes";
    }

    return "systems";
  }

  const haystack = [record.title, record.type, record.summary, metaText(record.meta.hardware)].join(" ").toLowerCase();

  if (/\b(keyboard|mouse|monitor|display|headset|speaker|audio|mic|microphone|controller|tablet|dock|peripheral|device)\b/.test(haystack)) {
    return "peripherals";
  }

  if (/\b(tool|tools|software|app|apps|utility|utilities|editor|launcher|workflow|script|stack)\b/.test(haystack)) {
    return "tools";
  }

  if (/\b(note|notes|memo|file)\b/.test(haystack) && !/\b(windows|linux|arch|os|pc|laptop|desktop|machine|rig|system|hardware)\b/.test(haystack)) {
    return "notes";
  }

  return "systems";
}

function activityTraceTitle(title: string): string {
  const clean = title
    .replace(/^\s*\d{1,2}\s*\/\s*\d{1,2}\s*\/\s*\d{4}\s*[-:–—]?\s*/, "")
    .trim();

  return clean || "New note";
}

function excerptFromBody(body: string): string {
  const clean = body
    .split(/\r?\n/)
    .map(cleanExcerptLine)
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();

  if (!clean) {
    return "";
  }

  return clean.length > 180 ? `${clean.slice(0, 177).trim()}...` : clean;
}

function cleanSummaryText(value: string): string {
  const clean = value.trim();

  return clean.toLowerCase() === "no summary recorded." ? "" : clean;
}

function cleanExcerptLine(value: string): string {
  const line = value.trim();

  if (
    !line ||
    line.startsWith(":::") ||
    line.startsWith("#") ||
    line.startsWith("![") ||
    line === "---"
  ) {
    return "";
  }

  return line
    .replace(/^[-*>]\s*/, "")
    .replace(/!\[[^\]]*]\([^)]+\)/g, "")
    .replace(/\[([^\]]+)]\([^)]+\)/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/[*_~]/g, "")
    .trim();
}

function wordCount(value: string): number {
  return value.split(/\s+/).filter(Boolean).length;
}

export function noteTitleDate(title: string): string | null {
  const match = title.match(/\b(\d{1,2})\s*\/\s*(\d{1,2})\s*\/\s*(\d{4})\b/);

  if (!match) {
    return null;
  }

  const [, day, month, year] = match;
  return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
}

function countMediaPaths(records: RecordEntry[]): number {
  const paths = new Set<string>();
  const markdownImagePattern = /!\[(?:.*?)]\((.*?)\)/g;

  for (const record of records) {
    for (const value of [record.banner, record.meta.headerImage]) {
      if (typeof value === "string" && value) {
        paths.add(value);
      }
    }

    for (const key of ["samples", "attachments"] as const) {
      const value = record.meta[key];
      const list = Array.isArray(value) ? value : typeof value === "string" ? value.split(/\r?\n|,/) : [];

      for (const item of list) {
        if (String(item).trim()) {
          paths.add(String(item).trim());
        }
      }
    }

    for (const match of record.body.matchAll(markdownImagePattern)) {
      if (match[1]) {
        paths.add(match[1]);
      }
    }
  }

  return paths.size;
}
