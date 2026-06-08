import type { RecordEntry, RecordSection } from "@/lib/types";

export type ContentKey =
  | "overview"
  | "samples"
  | "technical"
  | "notes"
  | "changelog"
  | "recommendation"
  | "hardware"
  | "attachments";

export type TimelineItem = {
  content: ContentKey;
  date: string;
  detail: string;
  id: string;
  record: RecordEntry;
  title: string;
};

export type SearchResult =
  | { kind: "command"; id: string; title: string; detail: string; action?: "timeline"; section?: RecordSection; record?: RecordEntry; content?: ContentKey }
  | { kind: "record"; record: RecordEntry; detail: string };

export type SearchCommand = Extract<SearchResult, { kind: "command" }>;
