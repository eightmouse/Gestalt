declare const recordMotion: {
  readonly paperRevealMs: number;
  readonly accessRevealMs: number;
  focusWithin(node: HTMLElement | null, host?: Window): () => void;
  createController(host?: Window): {
    minimize(options: { node: HTMLElement | null; target?: HTMLElement | null; enabled?: boolean; onComplete: () => void }): void;
    close(options: { node: HTMLElement | null; enabled?: boolean; onComplete: () => void }): void;
    cancel(): void;
    destroy(): void;
    readonly busy: boolean;
  };
};
export default recordMotion;
