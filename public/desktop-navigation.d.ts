import type recordMotion from "./record-motion.js";
export type DesktopNavigationMode = "fixed" | "terminal";
export type DirectoryRow = { id: "system" | "projects" | "games" | "logs" | "setup" | "archive"; name: string; date: string };
export type DesktopNavigationController = {
  attach(shell: HTMLElement | null, settings: { mode: DesktopNavigationMode; ready: boolean; busy: boolean; palette?: boolean; remember?: boolean }): void;
  destroy(): void;
};
declare const navigation: {
  normalizeMode(value: unknown): DesktopNavigationMode;
  readMode(storage?: Pick<Storage, "getItem">): DesktopNavigationMode;
  saveMode(mode: DesktopNavigationMode, storage?: Pick<Storage, "setItem">): void;
  directoryRows(entries: Array<{ section: string; date: string; archived: boolean }>): DirectoryRow[];
  createController(host?: Window, motionApi?: typeof recordMotion): DesktopNavigationController;
};
export default navigation;
