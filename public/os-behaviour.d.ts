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
  initializeBootPresentation(doc?: Document, random?: () => number): string;
  normalizeStartupMode(value: unknown): StartupMode;
  readStartupMode(storage?: Pick<Storage, "getItem">): StartupMode;
  saveStartupMode(value: StartupMode, storage?: Pick<Storage, "getItem" | "setItem">): boolean;
  normalizeValues(values?: Partial<PreferenceValues>): PreferenceValues;
  renderContent(values: PreferenceValues, remember: boolean): string;
  createController(host?: Window): OsBehaviourController;
};
export default behaviour;
