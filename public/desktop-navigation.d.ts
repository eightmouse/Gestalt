export type DesktopNavigationMode = "fixed" | "auto";
export type DesktopNavigationController = {
  attach(shell: HTMLElement | null, settings: { mode: DesktopNavigationMode; ready: boolean; busy: boolean; palette?: boolean }): void;
  destroy(): void;
};
declare const navigation: {
  normalizeMode(value: unknown): DesktopNavigationMode;
  readMode(storage?: Pick<Storage, "getItem">): DesktopNavigationMode;
  saveMode(mode: DesktopNavigationMode, storage?: Pick<Storage, "setItem">): void;
  createController(host?: Window): DesktopNavigationController;
};
export default navigation;
