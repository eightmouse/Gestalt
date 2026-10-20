import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import vm from "node:vm";
import ts from "typescript";
import { renderToStaticMarkup } from "react-dom/server";
import { createSteamSnapshotLoader, publicSnapshot, resolveCurrentGame, steamCoverUrl } from "../public/steam-display.mjs";

const now = "2026-10-20T12:00:00.000Z";
const snapshot = { schemaVersion: 1, updatedAt: now, game: { appId: 2, title: "Latest <Game>", playtimeMinutes: 123, lastPlayedAt: now, achievements: { unlocked: 1, total: 4 } } };
const reactRecords = [
  { id: "manual", section: "games", title: "Manual Game", status: "Playing", progress: 42, meta: { dashboardActive: true } },
  { id: "matched", section: "games", title: "Authored title", status: "Filed", progress: 100, meta: { steamAppId: "2", playtime: "older" } }
];
const staticRecords = reactRecords.map(({ meta, ...record }) => ({ ...record, ...meta }));
const before = JSON.stringify(reactRecords);
assert.deepEqual(resolveCurrentGame(snapshot, reactRecords), resolveCurrentGame(snapshot, staticRecords));
const display = resolveCurrentGame(snapshot, reactRecords);
assert.equal(display.recordId, "matched");
assert.equal(display.completion, "25% Achievements");
assert.equal(display.playtime, "2.0h");
assert.equal(display.lastPlayed, "20 / 10 / 2026");
assert.equal(JSON.stringify(reactRecords), before, "Resolving stats never changes authored records");
assert.equal(resolveCurrentGame(snapshot, []).recordId, undefined, "Unwritten games may display without an entry action");
assert.equal(resolveCurrentGame(null, reactRecords).recordId, "manual");
assert.equal(resolveCurrentGame({ ...snapshot, schemaVersion: 999 }, reactRecords).recordId, "manual");
assert.equal(resolveCurrentGame(null, []), null);
assert.equal(resolveCurrentGame(null, reactRecords).playtime, null, "No fabricated playtime");
assert.equal(resolveCurrentGame(null, reactRecords).lastPlayed, null, "No fabricated Today");
assert.equal(resolveCurrentGame({ ...snapshot, game: { ...snapshot.game, achievements: null, playtimeMinutes: null } }, []).completion, null);
assert.equal(steamCoverUrl("../../elsewhere"), null);
assert.equal(steamCoverUrl(0), null);
assert.match(steamCoverUrl(2), /^https:\/\/shared\.fastly\.steamstatic\.com\//);

let calls = 0;
const loader = createSteamSnapshotLoader(async (url, options) => {
  calls += 1;
  assert.equal(url, "https://example.test/Gestalt/public/data/steam-current.json");
  assert.equal(options.cache, "no-cache");
  assert.equal(options.redirect, "error");
  return Response.json(snapshot);
});
const url = "https://example.test/Gestalt/public/data/steam-current.json";
const results = await Promise.all([loader(url), loader(url), loader(url)]);
assert.equal(calls, 1, "Strict Mode and navigation do not repeat the fetch");
assert.deepEqual(results[0], publicSnapshot(snapshot));
for (const response of [new Response("missing", { status: 404 }), new Response("<html>fallback</html>"), new Response("{}", { headers: { "Content-Type": "application/json" } }), new Response("x".repeat(33 * 1024), { headers: { "Content-Type": "application/json" } })]) {
  const failed = createSteamSnapshotLoader(async () => response);
  assert.equal(await failed(url), null);
}
const offline = createSteamSnapshotLoader(async () => { throw new Error("Offline"); });
assert.equal(await offline(url), null);
assert.equal(await offline(url), null);

function declaration(file, name) {
  const source = readFileSync(new URL(file, import.meta.url), "utf8");
  const ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, file.endsWith("tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.JS);
  return ast.statements.find((node) => ts.isFunctionDeclaration(node) && node.name?.text === name).getText(ast);
}

const require = createRequire(import.meta.url);
const component = ts.transpileModule(`export ${declaration("../components/archive/dashboard.tsx", "CurrentGame")}`, { compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const react = vm.createContext({ exports: {}, require, steamCoverUrl, recordDashboardImage: () => "/cover.webp", dashboardRecordStateKey: () => "playing" });
vm.runInContext(component, react);
const staticContext = vm.createContext({
  steamDisplayModule: { steamCoverUrl },
  currentGameRecord: () => ({ id: "matched" }),
  currentGameDisplay: () => display,
  recordImage: () => "/cover.webp",
  recordStateKey: () => "playing"
});
for (const name of ["escapeHtml", "dashboardPanel", "currentGamePanel"]) vm.runInContext(declaration("../static-app.js", name), staticContext);
for (const model of [display, { ...display, completion: null, playtime: null, lastPlayed: null }]) {
  staticContext.currentGameDisplay = () => model;
  const reactHtml = renderToStaticMarkup(react.exports.CurrentGame({ display: model, record: reactRecords[1] }));
  const staticHtml = vm.runInContext("currentGamePanel()", staticContext);
  for (const html of [reactHtml, staticHtml]) {
    assert.ok(html.includes("Latest &lt;Game&gt;"), "Game titles are escaped");
    assert.equal(html.includes("25% Achievements"), Boolean(model.completion));
    assert.equal(html.includes("2.0h Play Time"), Boolean(model.playtime));
    assert.equal(html.includes("Last Played: 20 / 10 / 2026"), Boolean(model.lastPlayed));
    assert.equal(html.includes("18.7h"), false);
    assert.equal(html.includes("Today"), false);
  }
}
staticContext.currentGameRecord = () => undefined;
assert.equal(vm.runInContext("currentGamePanel()", staticContext).includes("data-open-record"), false);

console.log("Steam display tests passed: React/static parity, optional stats, escaping, fallback, one-shot fetch and bounded JSON.");
