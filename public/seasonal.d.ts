export type SeasonalMode = "auto" | "off";
export type SeasonalDecoration = {
  readonly placement: "projects-web" | "game-pumpkin" | "memory-hanging" | "log-web";
  readonly image: string;
  readonly glowImage?: string;
};
export type SeasonalDetail = {
  readonly id: "october" | "december" | "january";
  readonly decorations: readonly SeasonalDecoration[];
};
declare const seasonal: {
  normalizeMode(value: unknown): SeasonalMode;
  readMode(storage?: Pick<Storage, "getItem">): SeasonalMode;
  saveMode(value: SeasonalMode, storage?: Pick<Storage, "setItem">): void;
  seasonFor(date: Date | null, mode?: SeasonalMode): SeasonalDetail | null;
};
export default seasonal;
