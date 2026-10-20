import { readFile, rename, unlink, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { publicSnapshot } from "../public/steam-display.mjs";

export { publicSnapshot };

function positiveInteger(value) {
  return Number.isSafeInteger(value) && value > 0;
}

function gameTitle(value) {
  return typeof value === "string" ? value.replace(/[\u0000-\u001f\u007f\u202a-\u202e\u2066-\u2069]/g, "").trim().slice(0, 200) : "";
}

function achievementCounts(value) {
  if (!value || !positiveInteger(value.total) || !Number.isSafeInteger(value.unlocked) || value.unlocked < 0 || value.unlocked > value.total) {
    return null;
  }

  return { unlocked: value.unlocked, total: value.total, percent: Math.round(value.unlocked / value.total * 100) };
}

export function selectLastPlayed(games, now = new Date()) {
  if (!Array.isArray(games)) {
    throw new Error("Steam library is unavailable; the existing snapshot was kept.");
  }

  const latest = games.filter((game) => game && positiveInteger(game.appid) && game.appid <= 0xffffffff
    && positiveInteger(game.rtime_last_played) && game.rtime_last_played <= Math.floor(now.getTime() / 1000) + 300
    && gameTitle(game.name))
    .sort((a, b) => b.rtime_last_played - a.rtime_last_played || a.appid - b.appid)[0];

  if (!latest) {
    throw new Error("No usable last-played Steam game; the existing snapshot was kept.");
  }

  return latest;
}

function steamIdentity(value) {
  const clean = String(value || "").trim();

  if (/^\d{17}$/.test(clean)) return { id: clean };

  if (/^https?:\/\//i.test(clean)) {
    try {
      const url = new URL(clean);
      const match = url.pathname.match(/^\/(id|profiles)\/([^/]+)\/?$/);

      if (url.protocol !== "https:" || url.hostname !== "steamcommunity.com" || url.port || url.username || url.password || !match) throw new Error();
      const name = decodeURIComponent(match[2]);
      if (match[1] === "profiles" && /^\d{17}$/.test(name)) return { id: name };
      if (match[1] === "id" && /^[A-Za-z0-9_-]{1,128}$/.test(name)) return { vanity: name };
    } catch {
      // Never include the supplied identity in diagnostics.
    }
  } else if (/^[A-Za-z0-9_-]{1,128}$/.test(clean)) {
    return { vanity: clean };
  }

  throw new Error("STEAM_ID must be a SteamID64, vanity name, or HTTPS Steam profile URL.");
}

async function steamJson(endpoint, parameters, apiKey, fetchImpl) {
  const url = new URL(`https://api.steampowered.com/${endpoint}/v0001/`);
  url.search = new URLSearchParams({ key: apiKey, format: "json", ...parameters }).toString();

  try {
    const response = await fetchImpl(url, { signal: AbortSignal.timeout(15_000), redirect: "error" });
    if (!response.ok) throw new Error();
    return await response.json();
  } catch {
    // Upstream exceptions can contain a credential-bearing request URL.
    throw new Error("Steam request unavailable; no private request details were logged.");
  }
}

export async function fetchSteamSnapshot({ apiKey, steamId, previous, fetchImpl = fetch, now = new Date() }) {
  if (typeof apiKey !== "string" || !apiKey.trim() || typeof steamId !== "string" || !steamId.trim()) {
    throw new Error("STEAM_API_KEY and STEAM_ID are required; no snapshot was changed.");
  }

  if (!(now instanceof Date) || !Number.isFinite(now.getTime())) throw new Error("Invalid snapshot date.");
  const identity = steamIdentity(steamId);
  let id = identity.id;

  if (!id) {
    const resolved = await steamJson("ISteamUser/ResolveVanityURL", { vanityurl: identity.vanity }, apiKey, fetchImpl);
    if (!/^\d{17}$/.test(resolved?.response?.steamid || "") || resolved.response.success !== 1) {
      throw new Error("Steam profile could not be resolved; the existing snapshot was kept.");
    }
    id = resolved.response.steamid;
  }

  const owned = await steamJson("IPlayerService/GetOwnedGames", { steamid: id, include_appinfo: "1", include_played_free_games: "1" }, apiKey, fetchImpl);
  const latest = selectLastPlayed(owned?.response?.games, now);
  const old = publicSnapshot(previous);
  let achievements = old?.game.appId === latest.appid ? old.game.achievements : null;
  let achievementsUnavailable = false;

  try {
    const stats = await steamJson("ISteamUserStats/GetPlayerAchievements", { steamid: id, appid: String(latest.appid) }, apiKey, fetchImpl);
    const items = stats?.playerstats?.achievements;

    if (stats?.playerstats?.success !== true || !Array.isArray(items) || items.some((item) => !item || ![0, 1].includes(item.achieved))) {
      throw new Error();
    }

    achievements = achievementCounts({ unlocked: items.filter((item) => item.achieved === 1).length, total: items.length });
  } catch {
    achievementsUnavailable = true;
  }

  const snapshot = publicSnapshot({
    schemaVersion: 1,
    updatedAt: now.toISOString(),
    game: {
      appId: latest.appid,
      title: latest.name,
      playtimeMinutes: latest.playtime_forever,
      lastPlayedAt: new Date(latest.rtime_last_played * 1000).toISOString(),
      achievements
    }
  });

  // The timestamp means last changed, not presence or an always-fresh API check.
  if (old && JSON.stringify(snapshot.game) === JSON.stringify(old.game)) snapshot.updatedAt = old.updatedAt;
  return { snapshot, achievementsUnavailable };
}

export async function readSteamSnapshot(file) {
  try {
    return publicSnapshot(JSON.parse(await readFile(file, "utf8")));
  } catch (error) {
    if (error.code === "ENOENT" || error instanceof SyntaxError) return null;
    throw new Error("Existing Steam snapshot could not be read.");
  }
}

export async function writeSteamSnapshot(file, value) {
  const snapshot = publicSnapshot(value);
  if (!snapshot) throw new Error("Invalid Steam snapshot; no file was changed.");
  const serialized = `${JSON.stringify(snapshot, null, 2)}\n`;
  try {
    if (await readFile(file, "utf8") === serialized) return false;
  } catch (error) {
    if (error.code !== "ENOENT") throw new Error("Existing Steam snapshot could not be read.");
  }

  const temporary = `${file}.${randomUUID()}.tmp`;
  try {
    await writeFile(temporary, serialized, { encoding: "utf8", flag: "wx" });
    await rename(temporary, file);
  } finally {
    await unlink(temporary).catch((error) => { if (error.code !== "ENOENT") throw new Error("Steam snapshot temporary file could not be removed."); });
  }
  return true;
}

async function main() {
  const file = path.resolve("public", "data", "steam-current.json");
  const previous = await readSteamSnapshot(file);
  const { snapshot, achievementsUnavailable } = await fetchSteamSnapshot({ apiKey: process.env.STEAM_API_KEY, steamId: process.env.STEAM_ID, previous });
  const changed = await writeSteamSnapshot(file, snapshot);
  console.log(changed ? "Steam display snapshot updated. Archive records were not changed." : "Steam display snapshot unchanged.");
  if (achievementsUnavailable) console.log("Achievements unavailable; retained matching previous stats when possible.");
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  main().catch(() => {
    console.error("Steam snapshot refresh failed. The existing snapshot was kept; check configuration, profile visibility, and connectivity.");
    process.exitCode = 1;
  });
}
