export type MemoryStateMode = "trace" | "legacy";
export type MemoryEvent = "workspace.ready" | "section.enter" | "record.open" | "record.close" | "record.minimize" | "record.restore" | "record.resize" | "content.select" | "note.expand" | "terminal.open" | "terminal.close" | "terminal.minimize";
type TraceEntry = Readonly<{ id: number; time: string; name: MemoryEvent; detail: string }>;
declare const memoryState: {
  limit: number;
  normalizeMode(value: unknown): MemoryStateMode;
  readMode(storage?: Pick<Storage, "getItem">): MemoryStateMode;
  saveMode(value: MemoryStateMode, storage?: Pick<Storage, "getItem" | "setItem">): boolean;
  record(name: MemoryEvent, fields?: { section?: string; state?: string; view?: string; index?: number; source?: string }, host?: Window): void;
  entries(host?: Window): TraceEntry[];
  renderShell(): string;
  watchTrace(node: HTMLElement | null, host?: Window): () => void;
};
export default memoryState;
