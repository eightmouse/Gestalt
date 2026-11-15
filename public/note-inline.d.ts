export type ArchiveNote = { id?: string; title: string; body: string };

export type NoteInlineToken = {
  type: "text" | "code" | "strong" | "em" | "link";
  value?: string;
  href?: string;
  children?: NoteInlineToken[];
};

declare const noteInline: {
  safeNoteHref(value: unknown): string | null;
  tokenizeNoteInline(value: string): NoteInlineToken[];
  validNoteId(id: unknown): id is string;
  noteHeading(line: string, fallback?: string): Pick<ArchiveNote, "id" | "title"> | null;
  parseNotes(body: string): ArchiveNote[];
  addNoteIds(body: string, createId: () => string): string;
  noteIndexById(notes: ArchiveNote[], id: unknown): number;
};
export default noteInline;
