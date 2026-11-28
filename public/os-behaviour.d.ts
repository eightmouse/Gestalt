export type StartupMode = "full" | "quick";
export type PreferenceKey = "entry" | "startup" | "pocketBoot" | "seasonal" | "navigation" | "appearance" | "memory";
export type PreferenceValues = { entry: "first" | "always" | "off"; startup: StartupMode; pocketBoot?: "once" | "always"; seasonal: "auto" | "off"; navigation: "fixed" | "terminal"; appearance?: "night" | "day" | "auto"; memory?: "trace" | "legacy" };
export type PreferenceHandlers = { onChange(key: PreferenceKey, value: string): boolean | void; onClose(): void };
export type OsBehaviourController = {
  open(values: PreferenceValues, handlers: PreferenceHandlers, remember: boolean): void;
  update(values: PreferenceValues, remember: boolean): void;
  close(): void;
  destroy(): void;
};
declare const behaviour: {
  bootProfiles: readonly string[];
  bootReadiness(state?: { records?: number; appearance?: string; steam?: "reading" | "ready" | "offline"; lastSession?: string | null }): { key: string; label: string; value: string }[];
  readSettingsSeen(storage?: Pick<Storage, "getItem">): boolean;
  markSettingsSeen(doc?: Document, storage?: Pick<Storage, "getItem" | "setItem">): boolean;
  readLastSession(storage?: Pick<Storage, "getItem">): string | null | undefined;
  saveLastSession(now?: Date, storage?: Pick<Storage, "getItem" | "setItem">): boolean;
  lastSessionLabel(previous: string | null | undefined, now?: Date): string | null;
  bootModules: Readonly<Partial<Record<string, { readonly id: string; readonly order: number; readonly label: string }>>>;
  initializeBootPresentation(doc?: Document, random?: () => number): string;
  normalizeStartupMode(value: unknown): StartupMode;
  readStartupMode(storage?: Pick<Storage, "getItem">): StartupMode;
  saveStartupMode(value: StartupMode, storage?: Pick<Storage, "getItem" | "setItem">): boolean;
  normalizeValues(values?: Partial<PreferenceValues>): PreferenceValues;
  renderContent(values: PreferenceValues, remember: boolean): string;
  createController(host?: Window): OsBehaviourController;
};
export default behaviour;
