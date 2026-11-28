import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import vm from "node:vm";
import ts from "typescript";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import imageFraming from "../public/image-framing.js";
import recordLinks from "../public/record-links.js";

const require = createRequire(import.meta.url);
const read = (file) => readFileSync(new URL(`../${file}`, import.meta.url), "utf8");
function functions(file, names) {
  const source = read(file);
  const ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, file.endsWith("tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.JS);
  return names.map((name) => {
    const node = ast.statements.find((node) => ts.isFunctionDeclaration(node) && node.name?.text === name);
    assert.ok(node, `${file}: ${name} exists`);
    return node.getText(ast);
  }).join("\n");
}
function compile(source, globals = {}) {
  const context = vm.createContext({ exports: {}, require, ...globals });
  vm.runInContext(ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX }
  }).outputText, context);
  return context;
}
const policy = compile(read("lib/game-state.ts")).exports;
const names = ["gameLogPlacement", "gameActivityValue", "gameActivityLabel"];
const staticContext = compile(functions("static-app.js", [...names, "splitSectionRecords", "renderSelectorTiles", "gameDiskWindow", "recordStateKey", "recordTraceId", "escapeHtml"]), { window: { GestaltRecordLinks: recordLinks }, pocket: { diskWear: () => "--wear-x: 50%" } });
const react = compile(`${functions("components/archive/section-page.tsx", ["splitSectionRecords", "RecordSelectorTile", "GameDiskWindow", "recordStateKey"])}\nexports.split = splitSectionRecords; exports.Card = RecordSelectorTile;`, { ...policy, recordLinks, pocket: { gameDiskArt: () => "", diskWear: () => "--wear-x: 50%" } });
const studio = compile(`${functions("components/studio-client.tsx", ["splitStudioSectionRecords", "toRecordPreview", "readStudioDrafts"])}\nexports.split = splitStudioSectionRecords; exports.preview = toRecordPreview; exports.drafts = readStudioDrafts;`, {
  ...policy, imageFraming, studioDraftStorageKey: "fixture-drafts", mediaListFromText: () => []
});
for (const status of ["Playing", "Active", "In Progress", "Paused", "On Hold", "Planning", "Completed", "Filed", "Draft", "Inactive"]) {
  for (const placement of [undefined, "", "session", "past", "unexpected"]) {
    for (const activity of [undefined, "", "active", "inactive", "unexpected"]) {
      const record = { section: "games", status, meta: { gamePlacement: placement, gameActivity: activity } };
      const before = JSON.stringify(record);
      staticContext.record = { section: record.section, status, ...record.meta };
      const expected = placement === "session" || placement === "past" ? placement
        : ["Playing", "Active", "In Progress", "Paused", "On Hold", "Planning"].includes(status) ? "session" : "past";
      assert.equal(policy.gameLogPlacement(record), expected);
      for (const name of names) assert.equal(vm.runInContext(`${name}(record)`, staticContext), policy[name](record), "Flat Pages and React metadata agree");
      if (expected === "session" && ["active", "inactive"].includes(activity)) assert.equal(policy.gameActivityLabel(record), activity === "active" ? "Active" : "Inactive");
      else assert.equal(policy.gameActivityLabel(record), status);
      assert.equal(JSON.stringify(record), before, "Browsing does not migrate records");
    }
  }
}
const records = [
  { id: "inactive-online", section: "games", status: "Playing", meta: { gamePlacement: "session", gameActivity: "inactive" } },
  { id: "dlc-return", section: "games", status: "Completed", progress: 100, body: "Original notes", meta: { gamePlacement: "session", gameActivity: "active" } },
  { id: "quit-online", section: "games", status: "Playing", meta: { gamePlacement: "past", gameActivity: "inactive" } },
  { id: "legacy-playing", section: "games", status: "Playing", meta: {} },
  { id: "legacy-finished", section: "games", status: "Completed", meta: {} }
];
const groups = (values) => Array.from(values, (group) => ({ title: group.title, ids: Array.from(group.records, (record) => record.id) }));
const expected = [
  { title: "SESSION LOGS", ids: ["inactive-online", "dlc-return", "legacy-playing"] },
  { title: "PAST LOGS", ids: ["quit-online", "legacy-finished"] }
];
assert.deepEqual(groups(react.exports.split("games", records)), expected);
assert.deepEqual(groups(studio.exports.split("games", records)), expected);
staticContext.records = records.map(({ meta, ...record }) => ({ ...record, ...meta }));
assert.deepEqual(groups(vm.runInContext('splitSectionRecords("games", records)', staticContext)), expected);
const inactiveCard = { ...records[0], priority: 50, updated: "2026-10-21", type: "Play Log", title: "Online Game", summary: "Original notes" };
const tileHtml = (record) => {
  staticContext.card = { ...record, ...record.meta };
  return [renderToStaticMarkup(createElement(react.exports.Card, { record, onOpenRecord() {} })), vm.runInContext("renderSelectorTiles([card])", staticContext)];
};
for (const html of tileHtml(inactiveCard)) {
  assert.ok(html.includes('data-state="inactive"'));
  assert.ok(html.includes("Inactive"));
  assert.ok(!html.includes("Playing"), "An inactive Session card displays the authored activity");
  assert.ok(html.includes("data-game-sleeve"));
  assert.ok(!html.includes(recordLinks.traceId(inactiveCard.id, "games")), "The sleeve prioritizes the title over the filing ID");
}
for (const html of tileHtml({ ...inactiveCard, meta: { gamePlacement: "session", gameActivity: "active" } })) {
  assert.ok(html.includes('data-state="active"'));
  assert.ok(html.includes('<small>Active</small>') && html.includes('aria-label="Online Game, Active"'), "Session treats both activity states equally");
}
for (const html of tileHtml({ ...inactiveCard, status: "Inactive", meta: { gamePlacement: "past", gameActivity: "inactive" } })) {
  assert.ok(!html.includes("<small>Inactive</small>"), "Past Logs do not reuse the Session activity label");
}
for (const html of tileHtml({ ...inactiveCard, title: '<A "long" title>', banner: "/media/records/game/cover.webp", progress: 100 })) {
  assert.ok(html.includes('<strong>&lt;A') && html.includes('class="game-disk-hub"'), "Floppy renders the escaped title and hub");
  assert.ok(!html.includes("<img") && !html.includes("/media/records/game/cover.webp"), "A shelf does not request entry artwork");
  assert.ok(!html.includes("100%"), "The game tile doesn't imply achievement or completion progress");
}
assert.equal(imageFraming.recordHeadingArtwork({ ...inactiveCard, banner: "/media/records/game/cover.webp" }).src, "/media/records/game/cover.webp");
const form = { id: "fixture", section: "games", status: "Completed", gamePlacement: "session", gameActivity: "inactive" };
const preview = studio.exports.preview(form, "Unchanged note");
assert.equal(preview.meta.gamePlacement, "session");
assert.equal(preview.meta.gameActivity, "inactive");
assert.equal(preview.status, "Completed");
assert.equal(preview.body, "Unchanged note");
studio.window = { localStorage: { getItem: () => JSON.stringify({ "record:legacy": { form: { section: "games", status: "Playing" }, body: "Keep draft" }, "record:new": { form, body: "Keep new draft" } }) } };
const drafts = studio.exports.drafts();
assert.equal(drafts["record:legacy"].form.gamePlacement, "session");
assert.equal(drafts["record:legacy"].form.gameActivity, "");
assert.equal(drafts["record:legacy"].body, "Keep draft");
assert.equal(drafts["record:new"].form.gamePlacement, "session");
assert.equal(drafts["record:new"].form.gameActivity, "inactive");
const inspector = functions("components/studio-client.tsx", ["Inspector"]);
assert.ok(!inspector.includes('onUpdate("status"'), "Placement/activity controls must not overwrite authored status");
const steamSync = read("scripts/sync-steam.mjs");
for (const match of steamSync.matchAll(/nextFields\.(\w+)\s*=/g)) {
  assert.ok(["playtime", "lastPlayed", "achievementCount", "progress"].includes(match[1]), "Steam record sync cannot rewrite placement, activity or authored status");
}
console.log("Game state tests passed: independent placement/activity, legacy compatibility, reader/Studio parity, DLC returns, retirement and old drafts.");
