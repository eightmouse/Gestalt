export type PocketBootMode = "once" | "always";
type PocketSection = "projects" | "games" | "logs" | "setup" | "archive";
declare const pocket: {
  directory: ReadonlyArray<readonly [PocketSection, string, string]>;
  stamp: string;
  bootMarkup: string;
  isHandheld(host?: Window): boolean;
  normalizeBootMode(value: unknown): PocketBootMode;
  readBootMode(host?: Window): PocketBootMode;
  saveBootMode(value: PocketBootMode, host?: Window): boolean;
  markBootSeen(host?: Window): void;
  shouldPlayBoot(mode: PocketBootMode, remember: boolean, host?: Window): boolean;
  meterFrames(random?: () => number): Keyframe[];
  runBoot(shell: HTMLElement | null, onComplete: () => void, options: { mode: PocketBootMode; remember: boolean }, host?: Window): () => void;
  resolveTitle(title: HTMLElement | null, host?: Window): () => void;
};
export default pocket;
