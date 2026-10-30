declare const recordMotion: {
  createController(host?: Window): {
    minimize(options: { node: HTMLElement | null; target?: HTMLElement | null; enabled?: boolean; onComplete: () => void }): void;
    close(options: { node: HTMLElement | null; enabled?: boolean; onComplete: () => void }): void;
    cancel(): void;
    destroy(): void;
    readonly busy: boolean;
  };
};
export default recordMotion;
