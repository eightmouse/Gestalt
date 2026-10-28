export type SearchEngine = "duckduckgo" | "google" | "yandex";
export type WorkspaceToolController = { open(options?: { mode?: "search" | "connections"; remember?: boolean; onClose?: () => void }): void; close(): void; destroy(): void };
declare const tools: {
  engines: ReadonlyArray<{ id: SearchEngine; label: string; url: string; parameter: string }>;
  connections: ReadonlyArray<{ name: string; detail: string; url: string }>;
  normalizeEngine(value: unknown): SearchEngine;
  searchUrl(engine: unknown, query: unknown): string | null;
  shouldOpenSearch(event: KeyboardEvent, state: { ready: boolean; busy: boolean }, doc: Document): boolean;
  renderConnections(): string;
  createController(host?: Window): WorkspaceToolController;
};
export default tools;
