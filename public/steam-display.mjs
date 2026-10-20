function positiveInteger(value) {
  return Number.isSafeInteger(value) && value > 0;
}

function gameTitle(value) {
  return typeof value === "string" ? value.replace(/[\u0000-\u001f\u007f\u202a-\u202e\u2066-\u2069]/g, "").trim().slice(0, 200) : "";
}

function isoDate(value) {
  return typeof value === "string" && Number.isFinite(Date.parse(value)) && new Date(value).toISOString() === value;
}

function achievementCounts(value) {
  if (!value || !positiveInteger(value.total) || !Number.isSafeInteger(value.unlocked) || value.unlocked < 0 || value.unlocked > value.total) return null;
  return { unlocked: value.unlocked, total: value.total, percent: Math.round(value.unlocked / value.total * 100) };
}

// Shared by the private generator and both public renderers. Unknown fields never pass through.
export function publicSnapshot(value) {
  const game = value?.game;
  if (value?.schemaVersion !== 1 || !isoDate(value.updatedAt) || !game || !positiveInteger(game.appId) || game.appId > 0xffffffff || !gameTitle(game.title) || !isoDate(game.lastPlayedAt)) return null;
  return {
    schemaVersion: 1,
    updatedAt: value.updatedAt,
    game: {
      appId: game.appId,
      title: gameTitle(game.title),
      playtimeMinutes: Number.isSafeInteger(game.playtimeMinutes) && game.playtimeMinutes >= 0 ? game.playtimeMinutes : null,
      lastPlayedAt: game.lastPlayedAt,
      achievements: achievementCounts(game.achievements)
    }
  };
}

function field(record, name) {
  return record?.meta?.[name] ?? record?.[name];
}

function text(value) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export function resolveCurrentGame(value, records) {
  const snapshot = publicSnapshot(value);
  if (snapshot) {
    const game = snapshot.game;
    const record = records.find((entry) => Number(field(entry, "steamAppId")) === game.appId);
    const date = new Date(game.lastPlayedAt);
    return {
      source: "steam",
      recordId: record?.id,
      title: game.title,
      coverAppId: game.appId,
      status: "Playing",
      completion: game.achievements ? `${game.achievements.percent}% Achievements` : null,
      playtime: game.playtimeMinutes === null ? null : `${(game.playtimeMinutes / 60).toFixed(1)}h`,
      lastPlayed: `${String(date.getUTCDate()).padStart(2, "0")} / ${String(date.getUTCMonth() + 1).padStart(2, "0")} / ${date.getUTCFullYear()}`,
      changedAt: snapshot.updatedAt
    };
  }

  const record = records.find((entry) => field(entry, "dashboardActive") === true)
    ?? records.find((entry) => entry.status === "Playing") ?? records[0];
  if (!record) return null;
  return {
    source: "manual",
    recordId: record.id,
    title: record.title,
    status: record.status,
    completion: Number.isFinite(record.progress) && record.progress >= 0 && record.progress <= 100
      ? `${record.progress}% ${text(field(record, "achievementCount")) ? "Achievements" : "Complete"}` : null,
    playtime: text(field(record, "playtime")),
    lastPlayed: text(field(record, "lastPlayed"))
  };
}

export function steamCoverUrl(appId) {
  return positiveInteger(appId) && appId <= 0xffffffff
    ? `https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/${appId}/library_600x900.jpg` : null;
}

export function createSteamSnapshotLoader(fetchImpl = fetch) {
  let pending;
  return (url) => {
    // One bounded attempt per page lifetime, including React Strict Mode remounts.
    pending ??= (async () => {
      try {
        const response = await fetchImpl(url, { cache: "no-cache", redirect: "error", signal: AbortSignal.timeout(8000) });
        if (!response.ok || !response.headers.get("content-type")?.includes("application/json")) return null;
        const reader = response.body?.getReader();
        if (!reader) return null;
        const chunks = [];
        let length = 0;
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          length += value.byteLength;
          if (length > 32 * 1024) {
            await reader.cancel();
            return null;
          }
          chunks.push(value);
        }
        const bytes = new Uint8Array(length);
        let offset = 0;
        for (const chunk of chunks) {
          bytes.set(chunk, offset);
          offset += chunk.byteLength;
        }
        return publicSnapshot(JSON.parse(new TextDecoder().decode(bytes)));
      } catch {
        return null;
      }
    })();
    return pending;
  };
}

export const loadSteamSnapshot = createSteamSnapshotLoader();
