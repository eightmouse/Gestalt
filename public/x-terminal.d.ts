export type XTerminalPhase = "idle" | "accessing" | "ready" | "unavailable";
declare const xTerminal: {
  mount(root: HTMLElement, options: { embedUrl: string; onPhase?: (phase: XTerminalPhase) => void }): { destroy(): void };
  preserveRender(root: HTMLElement, html: string): boolean;
};
export default xTerminal;
