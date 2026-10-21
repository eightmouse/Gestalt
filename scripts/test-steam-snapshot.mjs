import assert from "node:assert/strict";
import { mkdtemp, readFile, readdir, rm, stat } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fetchSteamSnapshot, publicSnapshot, readSteamSnapshot, safeSteamFailure, selectLastPlayed, writeSteamSnapshot } from "./steam-snapshot.mjs";

const now = new Date("2026-10-20T12:00:00.000Z");
const played = Math.floor(now.getTime() / 1000) - 3600;
const key = "fixture-key-not-a-real-credential";
const id = "00000000000000000";
const older = { appid: 1, name: "Earlier Game", rtime_last_played: played - 100, playtime_forever: 5000 };
const newest = { appid: 2, name: "Latest Game", rtime_last_played: played, playtime_forever: 123 };

function api({ games = [older, newest], achievements = [{ achieved: 1 }, { achieved: 0 }, { achieved: 1 }], statsError = false, libraryError = false, resolveError = false } = {}) {
  const requests = [];
  const fetchImpl = async (url, options) => {
    assert.equal(url.origin, "https://api.steampowered.com");
    assert.equal(options.redirect, "error", "Do not forward credentials on redirects");
    assert.ok(options.signal instanceof AbortSignal);
    requests.push(url);
    if (url.pathname.includes("ResolveVanityURL")) {
      return Response.json({ response: { success: resolveError ? 42 : 1, steamid: id } });
    }
    if (url.pathname.includes("GetOwnedGames")) {
      if (libraryError) throw new Error(`Sensitive URL ${url}`);
      return Response.json({ response: { games, steamid: id, key, unrelated: "private fixture payload" } });
    }
    if (statsError) throw new Error(`Sensitive URL ${url}`);
    return Response.json({ playerstats: { success: true, achievements, steamID: id, key } });
  };
  return { fetchImpl, requests };
}

assert.equal(selectLastPlayed([newest, older], now), newest, "Do not depend on API ordering");
assert.equal(selectLastPlayed([older, newest], now), newest);
assert.equal(selectLastPlayed([{ ...older, rtime_last_played: played }, newest], now).appid, 1, "Ties are deterministic");
assert.equal(selectLastPlayed([{ ...newest, rtime_last_played: played + 100_000 }, older], now), older, "Ignore implausible future timestamps");
for (const games of [undefined, [], [{ ...newest, rtime_last_played: 0 }], [{ ...newest, appid: -1 }], [null]]) {
  assert.throws(() => selectLastPlayed(games, now));
}

const firstApi = api();
const first = await fetchSteamSnapshot({ apiKey: key, steamId: id, now, fetchImpl: firstApi.fetchImpl });
assert.deepEqual(first.snapshot, {
  schemaVersion: 1,
  updatedAt: now.toISOString(),
  game: { appId: 2, title: "Latest Game", playtimeMinutes: 123, lastPlayedAt: new Date(played * 1000).toISOString(), achievements: { unlocked: 2, total: 3, percent: 67 } }
});
assert.equal(first.achievementsUnavailable, false);
assert.equal(firstApi.requests.length, 2, "One library request, one selected-game achievement request");
assert.equal(firstApi.requests[0].searchParams.get("include_appinfo"), "1");
assert.equal(JSON.stringify(first.snapshot).includes(key), false);
assert.equal(JSON.stringify(first.snapshot).includes(id), false);
assert.equal(JSON.stringify(first.snapshot).includes("private fixture"), false);

const nextApi = api();
const later = await fetchSteamSnapshot({ apiKey: key, steamId: id, now: new Date(now.getTime() + 60_000), previous: first.snapshot, fetchImpl: nextApi.fetchImpl });
assert.deepEqual(later.snapshot, first.snapshot, "No timestamp-only updates/commits");

for (const identity of ["fixture_owner", "https://steamcommunity.com/id/fixture_owner/", `https://steamcommunity.com/profiles/${id}/`]) {
  const mock = api();
  const result = await fetchSteamSnapshot({ apiKey: key, steamId: identity, now, fetchImpl: mock.fetchImpl });
  assert.equal(result.snapshot.game.appId, 2);
  assert.equal(mock.requests.length, identity.includes("profiles/") ? 2 : 3);
}
for (const identity of ["https://evil.example/id/fixture/", "https://steamcommunity.com@evil.example/id/fixture", "http://steamcommunity.com/id/fixture", "https://steamcommunity.com:444/id/fixture", "https://steamcommunity.com/id/a%2Fb"]) {
  const mock = api();
  await assert.rejects(fetchSteamSnapshot({ apiKey: key, steamId: identity, now, fetchImpl: mock.fetchImpl }));
  assert.equal(mock.requests.length, 0);
}

for (const options of [{ libraryError: true }, { games: null }, { games: [] }, { resolveError: true }]) {
  const mock = api(options);
  await assert.rejects(fetchSteamSnapshot({ apiKey: key, steamId: "fixture_owner", now, previous: first.snapshot, fetchImpl: mock.fetchImpl }), (error) => !error.message.includes(key) && !error.message.includes(id) && !error.message.includes("https://"));
}

const inaccessible = api({ statsError: true });
const retained = await fetchSteamSnapshot({ apiKey: key, steamId: id, now, previous: first.snapshot, fetchImpl: inaccessible.fetchImpl });
assert.equal(retained.achievementsUnavailable, true);
assert.deepEqual(retained.snapshot.game.achievements, first.snapshot.game.achievements);
const newGameApi = api({ games: [older], statsError: true });
const newGame = await fetchSteamSnapshot({ apiKey: key, steamId: id, now, previous: first.snapshot, fetchImpl: newGameApi.fetchImpl });
assert.equal(newGame.snapshot.game.achievements, null, "Never copy achievements from a different game");

for (const achievements of [[], null, [{ achieved: "invalid" }]]) {
  const mock = api({ achievements });
  const result = await fetchSteamSnapshot({ apiKey: key, steamId: id, now, fetchImpl: mock.fetchImpl });
  assert.equal(result.snapshot.game.achievements, null, "Missing/unsupported achievements are not a fabricated 0%");
}
const zeroApi = api({ achievements: [{ achieved: 0 }] });
const zero = await fetchSteamSnapshot({ apiKey: key, steamId: id, now, fetchImpl: zeroApi.fetchImpl });
assert.equal(zero.snapshot.game.achievements.percent, 0, "A real zero remains valid");
const noTimeApi = api({ games: [{ ...newest, playtime_forever: -1 }] });
const noTime = await fetchSteamSnapshot({ apiKey: key, steamId: id, now, fetchImpl: noTimeApi.fetchImpl });
assert.equal(noTime.snapshot.game.playtimeMinutes, null);
assert.equal(publicSnapshot({ ...first.snapshot, key, game: { ...first.snapshot.game, steamid: id, achievements: { unlocked: 1, total: 2, percent: 999 } } }).game.achievements.percent, 50);
assert.deepEqual(publicSnapshot({ ...first.snapshot, key, library: [older], game: { ...first.snapshot.game, steamid: id } }), first.snapshot);
assert.equal(publicSnapshot({ ...first.snapshot, schemaVersion: 999 }), null);
assert.equal(publicSnapshot({ ...first.snapshot, updatedAt: "not a date" }), null);
const failed = api();
await assert.rejects(fetchSteamSnapshot({ apiKey: "", steamId: id, fetchImpl: failed.fetchImpl }));
assert.equal(failed.requests.length, 0);
for (const [apiKey, steamId, expected] of [["", id, "STEAM_API_KEY is missing"], [key, "", "STEAM_ID is missing"], [key, "STEAM_ID=private-value", "STEAM_ID must be"]]) {
  await assert.rejects(fetchSteamSnapshot({ apiKey, steamId, fetchImpl: failed.fetchImpl }), (error) => safeSteamFailure(error).includes(expected));
}
assert.equal(failed.requests.length, 0, "Configuration diagnostics do not send incomplete credentials");
for (const [status, expected] of [[401, "HTTP 401/403"], [403, "HTTP 401/403"], [429, "HTTP 429"], [500, "Steam request failed"]]) {
  await assert.rejects(fetchSteamSnapshot({ apiKey: key, steamId: id, fetchImpl: async () => new Response(`private ${key} ${id}`, { status }) }), (error) => {
    const reason = safeSteamFailure(error);
    assert.ok(!reason.includes(key) && !reason.includes(id) && !reason.includes("https://"));
    return reason.includes(expected);
  });
}
for (const error of [new Error(`https://private.invalid/?key=${key}&id=${id}`), { name: "SteamSnapshotError", code: `injected ${key}`, message: key }]) {
  const reason = safeSteamFailure(error);
  assert.ok(!reason.includes(key) && !reason.includes(id) && !reason.includes("https://"), "Unknown upstream details never enter logs");
}
const trimmed = api();
await fetchSteamSnapshot({ apiKey: `  ${key}\n`, steamId: id, now, fetchImpl: trimmed.fetchImpl });
assert.equal(trimmed.requests[0].searchParams.get("key"), key, "Outer copy/paste whitespace is removed without logging the key");

const dir = await mkdtemp(path.join(os.tmpdir(), "gestalt-steam-test-"));
try {
  const file = path.join(dir, "steam-current.json");
  assert.equal(await readSteamSnapshot(file), null);
  assert.equal(await writeSteamSnapshot(file, first.snapshot), true);
  assert.deepEqual(await readSteamSnapshot(file), first.snapshot);
  const initial = await stat(file);
  assert.equal(await writeSteamSnapshot(file, later.snapshot), false);
  assert.equal((await stat(file)).mtimeMs, initial.mtimeMs);
  await assert.rejects(writeSteamSnapshot(file, { schemaVersion: 999 }));
  assert.deepEqual(JSON.parse(await readFile(file, "utf8")), first.snapshot);
  assert.equal(await writeSteamSnapshot(file, newGame.snapshot), true);
  assert.deepEqual(await readSteamSnapshot(file), newGame.snapshot, "Atomic replacement works for an existing file");
  assert.deepEqual(await readdir(dir), ["steam-current.json"], "No leftover temporary files");
} finally {
  if (path.dirname(dir) !== path.resolve(os.tmpdir()) || !path.basename(dir).startsWith("gestalt-steam-test-")) throw new Error("Unsafe fixture cleanup path");
  await rm(dir, { recursive: true, force: true });
}

console.log("Steam snapshot tests passed: recency, allowlisting, credentials, API failures, achievements and isolated atomic writes.");
