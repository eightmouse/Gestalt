export type AppearanceMode = "night" | "day" | "auto";
declare const appearance: {
  normalizeMode(value: unknown): AppearanceMode;
  resolveMode(value: unknown, date?: Date): "day" | "night";
  readMode(storage?: Pick<Storage, "getItem">): AppearanceMode;
  getMode(doc?: Document): AppearanceMode;
  setMode(value: unknown, remember?: boolean, host?: Window): AppearanceMode;
  sync(doc?: Document, date?: Date): void;
  initialize(host?: Window): AppearanceMode;
};
export default appearance;
