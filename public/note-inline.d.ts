export type NoteInlineToken = {
  type: "text" | "code" | "strong" | "em" | "link";
  value?: string;
  href?: string;
  children?: NoteInlineToken[];
};

declare const noteInline: {
  safeNoteHref(value: unknown): string | null;
  tokenizeNoteInline(value: string): NoteInlineToken[];
};
export default noteInline;
