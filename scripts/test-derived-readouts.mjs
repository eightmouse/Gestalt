import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import vm from "node:vm";
import ts from "typescript";

const require = createRequire(import.meta.url);
const read = (file) => readFileSync(new URL(`../${file}`, import.meta.url), "utf8");
function compile(source, globals = {}) {
  const context = vm.createContext({ exports: {}, require, ...globals });
  vm.runInContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, context);
  return context;
}
const chronology = compile(read("lib/log-archive.ts")).exports;
const utils = compile(read("components/archive/record-utils.ts"), { require: (id) => id === "@/lib/log-archive" ? chronology : require(id) }).exports;
const search = compile(read("components/archive/search-utils.ts"), { require: (id) => id === "@/components/archive/record-utils" ? utils : require(id) }).exports;
const source = read("components/archive-os.tsx");
const ast = ts.createSourceFile("archive-os.tsx", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const component = ast.statements.find((node) => ts.isFunctionDeclaration(node) && node.name?.text === "ArchiveOS");
const names = ["projectDashboardRecords", "latestLog", "activity", "archiveMetrics", "metrics", "searchResults"];
const declarations = names.map((name) => {
  const statement = component.body.statements.find((node) => ts.isVariableStatement(node) && node.declarationList.declarations.some((item) => item.name.getText(ast) === name));
  assert.ok(statement, `${name} is derived in the real reader`);
  return statement.getText(ast);
});
const ranking = ast.statements.filter((node) => ts.isFunctionDeclaration(node) && node.name?.text === "projectStatusRank" || ts.isVariableStatement(node) && node.declarationList.declarations.some((item) => item.name.getText(ast) === "projectStatusOrder")).map((node) => node.getText(ast)).join("\n");
const base = { type: "Field Note", status: "Filed", started: "2026-10-01", updated: "2026-10-01", summary: "", priority: 10, body: "A small entry.", meta: {} };
const records = Object.freeze([
  Object.freeze({ ...base, id: "paused", title: "Paused project", section: "projects", status: "Paused" }),
  Object.freeze({ ...base, id: "active", title: "Active project", section: "projects", status: "Active" }),
  Object.freeze({ ...base, id: "old-log", title: "Older log", section: "logs", writtenAt: "2026-10-01" }),
  Object.freeze({ ...base, id: "new-log", title: "Newer log", section: "logs", writtenAt: "2026-10-02" }),
  Object.freeze({ ...base, id: "game", title: "A game", section: "games", type: "Play Log", status: "Playing" })
]);
const bySection = (items) => Object.fromEntries(["projects", "games", "logs"].map((section) => [section, Object.freeze(items.filter((record) => record.section === section))]));
const calls = { activity: 0, metrics: 0, search: 0 };
const slots = []; let slot = 0;
const context = compile(`${ranking}\nfunction derive() { ${declarations.join("\n")} return { ${names.join(",")} }; }\nexports.derive = derive;`, {
  archiveRecords: records, recordsBySection: bySection(records), currentGame: records.at(-1), currentGameDisplay: { title: "A game" },
  searchOpen: false, searchQuery: "a game", compareLogWritingOrder: chronology.compareLogWritingOrder,
  recentActivity(...args) { calls.activity++; return utils.recentActivity(...args); },
  getArchiveMetrics(...args) { calls.metrics++; return utils.getArchiveMetrics(...args); },
  getSearchResults(...args) { calls.search++; return search.getSearchResults(...args); },
  useMemo(calculate, dependencies) {
    const index = slot++, prior = slots[index];
    if (!prior || dependencies.some((value, at) => !Object.is(value, prior.dependencies[at]))) slots[index] = { dependencies, value: calculate() };
    return slots[index].value;
  }
});
function render() { slot = 0; return context.exports.derive(); }
const first = render();
assert.deepEqual(calls, { activity: 1, metrics: 1, search: 0 }, "A closed palette does not search a retained query");
assert.equal(first.projectDashboardRecords[0].id, "active");
assert.equal(context.recordsBySection.projects[0].id, "paused", "Dashboard ordering cannot mutate section input");
assert.equal(first.latestLog.id, "new-log");
for (let index = 0; index < 20; index++) {
  const next = render();
  for (const name of ["projectDashboardRecords", "latestLog", "activity", "archiveMetrics", "searchResults"]) assert.equal(next[name], first[name], `${name} survives unrelated clock/window state updates`);
}
assert.deepEqual(calls, { activity: 1, metrics: 1, search: 0 });
context.searchOpen = true;
const opened = render();
assert.ok(opened.searchResults.some((item) => item.record?.id === "game"));
render();
assert.equal(calls.search, 1, "An unchanged visible query is not recomputed on every render");
context.searchQuery = "newer";
assert.ok(render().searchResults.some((item) => item.record?.id === "new-log"));
assert.equal(calls.search, 2);
context.searchOpen = false;
render();
const saved = records.map((record) => Object.freeze(record.id === "game" ? { ...record, updated: "2026-11-07", body: ":::note 07 / 11 / 2026 - Fresh session\nA fresh thought.\n:::" } : record));
context.archiveRecords = saved;
context.recordsBySection = bySection(saved);
context.currentGame = saved.at(-1);
const refreshed = render();
assert.deepEqual(calls, { activity: 2, metrics: 2, search: 2 }, "Saved records invalidate readouts but not a closed search");
assert.equal(refreshed.activity[0].detail, "Play Log / Fresh session");
assert.equal(refreshed.archiveMetrics.latestActivityDate, "2026-11-07");
assert.equal(refreshed.latestLog.id, "new-log", "Saving another record preserves original log writing order");
context.searchOpen = true;
context.searchQuery = "fresh session";
assert.ok(render().searchResults.some((item) => item.record?.id === "game"), "A newly saved note title is searchable immediately");
context.currentGame = undefined;
context.currentGameDisplay = null;
const gameChanged = render();
assert.equal(gameChanged.metrics.activeGame, undefined);
assert.deepEqual(calls, { activity: 2, metrics: 3, search: 4 }, "A current-game change refreshes its dependent readouts only");
console.log("Derived readouts passed: stable inputs skip repeated work, closed search is idle, immutable ordering and saved-note/current-game invalidation remain fresh.");
