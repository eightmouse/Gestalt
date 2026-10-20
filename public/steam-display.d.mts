export type SteamSnapshot = {
  schemaVersion: 1;
  updatedAt: string;
  game: {
    appId: number;
    title: string;
    playtimeMinutes: number | null;
    lastPlayedAt: string;
    achievements: { unlocked: number; total: number; percent: number } | null;
  };
};

export type CurrentGameDisplay = {
  source: "steam" | "manual";
  recordId?: string;
  title: string;
  status: string;
  coverAppId?: number;
  completion: string | null;
  playtime: string | null;
  lastPlayed: string | null;
  changedAt?: string;
};

type GameRecord = {
  id: string;
  title: string;
  status: string;
  progress?: number;
  meta?: Record<string, unknown>;
};

export function publicSnapshot(value: unknown): SteamSnapshot | null;
export function resolveCurrentGame(snapshot: unknown, records: GameRecord[]): CurrentGameDisplay | null;
export function steamCoverUrl(appId?: number): string | null;
export function createSteamSnapshotLoader(fetchImpl?: typeof fetch): (url: string) => Promise<SteamSnapshot | null>;
export const loadSteamSnapshot: ReturnType<typeof createSteamSnapshotLoader>;
