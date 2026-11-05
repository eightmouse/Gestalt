import type { RecordEntry } from "@/lib/types";

export const LOG_ARCHIVE_AFTER_DAYS = 7;
export const ARCHIVE_ROOT_FILE_LIMIT = 24;
export const ARCHIVE_RECENT_FILE_LIMIT = 12;
const millisecondsPerDay = 24 * 60 * 60 * 1000;

type ArchiveGroup = { title: string; detail: string; records: RecordEntry[] };

export function archiveUsesFolders(recordCount: number): boolean {
  return recordCount > ARCHIVE_ROOT_FILE_LIMIT;
}

export function buildFieldArchive(records: RecordEntry[], now = new Date()) {
  const archivedLogs = records.filter((record) => record.section === "logs" && isLogArchivedByAge(record, now)).sort(compareLogWritingOrder);
  const filedRecords = records.filter((record) => record.section !== "logs");
  const months = new Map<string, RecordEntry[]>();
  for (const record of archivedLogs) {
    const month = logArchiveDate(record).slice(0, 7);
    if (!months.has(month)) months.set(month, []);
    months.get(month)!.push(record);
  }

  const recentMonths = new Set(archivedLogs.slice(0, ARCHIVE_RECENT_FILE_LIMIT).map((record) => logArchiveDate(record).slice(0, 7)));
  const foldedMonths = new Set<string>();
  let rootItems = archivedLogs.length;
  // Keep complete recent months together; only fold older months when it saves space.
  for (const [month, monthRecords] of [...months.entries()].reverse()) {
    if (!archiveUsesFolders(rootItems)) break;
    if (recentMonths.has(month) || monthRecords.length < 2) continue;
    foldedMonths.add(month);
    rootItems -= monthRecords.length - 1;
  }

  const folders: ArchiveGroup[] = [];
  const years = new Map<string, RecordEntry[]>();
  for (const [month, monthRecords] of months) {
    if (foldedMonths.has(month)) {
      folders.push({ title: `${month.slice(5, 7)}/${month.slice(0, 4)}`, detail: "FIELD NOTES", records: monthRecords });
    } else {
      const year = month.slice(0, 4);
      if (!years.has(year)) years.set(year, []);
      years.get(year)!.push(...monthRecords);
    }
  }
  const looseGroups: ArchiveGroup[] = [...years].map(([title, yearRecords]) => ({ title, detail: "FIELD NOTES", records: yearRecords }));
  if (filedRecords.length) {
    looseGroups.push({ title: "FILED RECORDS", detail: "MANUAL ARCHIVE", records: sortArchiveRecords(filedRecords) });
  }
  return { archivedLogs, folders, looseGroups };
}

export function sortArchiveRecords(records: RecordEntry[]): RecordEntry[] {
  return [...records].sort((a, b) => logArchiveDate(b).localeCompare(logArchiveDate(a)) || compareSectionRecords(a, b));
}
export function logArchiveDate(record: RecordEntry): string {
  if (record.section === "logs" && record.writtenAt) {
    return record.writtenAt.slice(0, 10);
  }
  return record.started || record.updated;
}

export function compareLogWritingOrder(a: RecordEntry, b: RecordEntry): number {
  const left = a.writtenAt || logArchiveDate(a);
  const right = b.writtenAt || logArchiveDate(b);
  return right.localeCompare(left)
    || (b.writtenOrder || 0) - (a.writtenOrder || 0)
    || a.priority - b.priority
    || a.id.localeCompare(b.id);
}

export function compareSectionRecords(a: RecordEntry, b: RecordEntry): number {
  return a.section === "logs" && b.section === "logs"
    ? compareLogWritingOrder(a, b)
    : b.updated.localeCompare(a.updated) || a.priority - b.priority;
}

export function isLogArchivedByAge(record: RecordEntry, now = new Date()): boolean {
  const date = logArchiveDate(record);
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);

  if (!match) return false;

  const [year, month, day] = match.slice(1).map(Number);
  const entryTime = Date.UTC(year, month - 1, day);
  const validDate = new Date(entryTime);

  if (validDate.getUTCFullYear() !== year || validDate.getUTCMonth() !== month - 1 || validDate.getUTCDate() !== day) {
    return false;
  }

  const todayTime = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const ageInDays = Math.floor((todayTime - entryTime) / millisecondsPerDay);

  return ageInDays >= LOG_ARCHIVE_AFTER_DAYS;
}
