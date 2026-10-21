import type { RecordEntry } from "@/lib/types";

export const LOG_ARCHIVE_AFTER_DAYS = 7;
const millisecondsPerDay = 24 * 60 * 60 * 1000;

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
