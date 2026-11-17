import type { SearchResult } from "@/components/archive/types";
import type { RecordEntry } from "@/lib/types";
import type { ArchiveNote } from "@/public/note-inline.js";

declare const archiveSearch: {
  search(records: RecordEntry[], query: string, notesFor: (record: RecordEntry) => ArchiveNote[], currentGame?: RecordEntry, latestLog?: RecordEntry): SearchResult[];
  resultKey(result: SearchResult): string;
};

export default archiveSearch;
