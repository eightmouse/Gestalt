import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const envPath = path.join(root, ".env.local");
const recordsDir = path.join(root, "content", "records");
const env = await readEnv(envPath);
const apiKey = env.STEAM_API_KEY;
const steamIdInput = env.STEAM_ID;

if (!apiKey || !steamIdInput) {
  console.error("Missing STEAM_API_KEY or STEAM_ID in .env.local.");
  process.exit(1);
}

const steamId = await resolveSteamId(steamIdInput);
const filenames = (await readdir(recordsDir)).filter((filename) => filename.endsWith(".mdx")).sort();
const updates = [];

for (const filename of filenames) {
  const filePath = path.join(recordsDir, filename);
  const source = await readFile(filePath, "utf8");
  const parsed = parseFrontmatter(source);

  if (!parsed || parsed.data.section !== "games" || !parsed.data.steamAppId) {
    continue;
  }

  const appId = Number(parsed.data.steamAppId);

  if (!Number.isInteger(appId)) {
    continue;
  }

  const [ownedGame, achievements] = await Promise.all([fetchOwnedGame(appId), fetchAchievements(appId)]);
  const nextFields = {};

  if (ownedGame) {
    nextFields.playtime = formatPlaytime(ownedGame.playtime_forever);

    if (ownedGame.rtime_last_played) {
      nextFields.lastPlayed = formatEuropeanDate(new Date(ownedGame.rtime_last_played * 1000));
    }
  }

  if (achievements) {
    nextFields.achievementCount = `${achievements.achieved} / ${achievements.total}`;
    nextFields.progress = achievements.total > 0 ? Math.round((achievements.achieved / achievements.total) * 100) : 0;
  }

  if (Object.keys(nextFields).length === 0) {
    continue;
  }

  const nextSource = writeFrontmatter(source, nextFields);

  if (nextSource !== source) {
    await writeFile(filePath, nextSource, "utf8");
    updates.push({ filename, fields: nextFields });
  }
}

if (updates.length === 0) {
  console.log("Steam sync completed: no record changes.");
} else {
  console.log(`Steam sync updated ${updates.length} record${updates.length === 1 ? "" : "s"}:`);

  for (const update of updates) {
    const fieldList = Object.entries(update.fields)
      .map(([key, value]) => `${key}=${value}`)
      .join(", ");

    console.log(`- ${update.filename}: ${fieldList}`);
  }
}

async function readEnv(filePath) {
  const source = await readFile(filePath, "utf8");
  const values = {};

  for (const line of source.split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);

    if (!match || match[1].startsWith("#")) {
      continue;
    }

    values[match[1]] = match[2].replace(/^["']|["']$/g, "");
  }

  return values;
}

function parseFrontmatter(source) {
  if (!source.startsWith("---")) {
    return null;
  }

  const endIndex = source.indexOf("\n---", 3);

  if (endIndex === -1) {
    return null;
  }

  const data = {};

  for (const line of source.slice(3, endIndex).trim().split(/\r?\n/)) {
    const separatorIndex = line.indexOf(":");

    if (separatorIndex === -1) {
      continue;
    }

    data[line.slice(0, separatorIndex).trim()] = parseScalar(line.slice(separatorIndex + 1));
  }

  return { data, endIndex };
}

function parseScalar(rawValue) {
  const value = rawValue.trim();

  if (value === "true") return true;
  if (value === "false") return false;
  if (/^-?\d+(\.\d+)?$/.test(value)) return Number(value);

  return value.replace(/^["']|["']$/g, "");
}

function writeFrontmatter(source, fields) {
  let next = source;

  for (const [key, value] of Object.entries(fields)) {
    const serialized = typeof value === "number" ? String(value) : `"${escapeFrontmatter(value)}"`;
    const pattern = new RegExp(`(^${escapeRegExp(key)}:\\s*).*$`, "m");

    if (pattern.test(next)) {
      next = next.replace(pattern, `${key}: ${serialized}`);
    } else {
      next = next.replace(/\n---/, `\n${key}: ${serialized}\n---`);
    }
  }

  return next;
}

async function fetchOwnedGame(appId) {
  const url = new URL("https://api.steampowered.com/IPlayerService/GetOwnedGames/v0001/");
  url.searchParams.set("key", apiKey);
  url.searchParams.set("steamid", steamId);
  url.searchParams.set("format", "json");
  url.searchParams.set("include_played_free_games", "1");

  const json = await fetchJson(url);
  return json.response?.games?.find((game) => Number(game.appid) === appId) ?? null;
}

async function resolveSteamId(value) {
  const cleanValue = value.trim().replace(/^["']|["']$/g, "").replace(/\/+$/, "");

  if (/^\d{17}$/.test(cleanValue)) {
    return cleanValue;
  }

  const vanityMatch = cleanValue.match(/steamcommunity\.com\/id\/([^/?#]+)/i);
  const vanityName = vanityMatch ? decodeURIComponent(vanityMatch[1]) : cleanValue;
  const url = new URL("https://api.steampowered.com/ISteamUser/ResolveVanityURL/v0001/");
  url.searchParams.set("key", apiKey);
  url.searchParams.set("vanityurl", vanityName);
  url.searchParams.set("format", "json");

  const json = await fetchJson(url);
  const resolved = json.response?.steamid;

  if (!resolved) {
    throw new Error("Could not resolve STEAM_ID. Use a SteamID64 or public /id/ profile URL.");
  }

  return resolved;
}

async function fetchAchievements(appId) {
  const url = new URL("https://api.steampowered.com/ISteamUserStats/GetPlayerAchievements/v0001/");
  url.searchParams.set("key", apiKey);
  url.searchParams.set("steamid", steamId);
  url.searchParams.set("appid", String(appId));
  url.searchParams.set("format", "json");

  const json = await fetchJson(url);
  const items = json.playerstats?.achievements;

  if (!Array.isArray(items)) {
    return null;
  }

  return {
    achieved: items.filter((achievement) => achievement.achieved === 1).length,
    total: items.length
  };
}

async function fetchJson(url) {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Steam request failed with ${response.status}: ${url.pathname}`);
  }

  return response.json();
}

function formatPlaytime(minutes) {
  return `${(Math.max(0, Number(minutes) || 0) / 60).toFixed(1)}h`;
}

function formatEuropeanDate(date) {
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();

  return `${day} / ${month} / ${year}`;
}

function escapeFrontmatter(value) {
  return String(value).replaceAll("\\", "\\\\").replaceAll('"', '\\"');
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
