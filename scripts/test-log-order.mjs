import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import vm from "node:vm";
import ts from "typescript";

const require = createRequire(import.meta.url);
function compiled(file, dependencies = {}) {
  const source = readFileSync(new URL(file, import.meta.url), "utf8");
  const context = vm.createContext({ exports: {}, process, require: (name) => dependencies[name] || require(name) });
  vm.runInContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText, context);
  return context.exports;
}
const chronology = compiled("../lib/log-archive.ts");
const react = compiled("../components/archive/record-utils.ts", { "@/lib/log-archive": chronology });
const realRecords = compiled("../lib/content.ts").getRecords();
const staticSource = readFileSync(new URL("../static-app.js", import.meta.url), "utf8");
const ast = ts.createSourceFile("static-app.js", staticSource, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
const staticContext = vm.createContext({});
for (const name of ["logArchiveDate", "compareLogWritingOrder", "compareSectionRecords", "recentActivity", "activityDate", "recordLastUpdated", "datedNotes", "latestActivityNote", "setupActivityDetail", "setupGroupForActivity", "activityTraceTitle", "noteEntries", "splitUpdateIndex", "noteTitleDate", "textBlock", "notePage", "currentNotePage", "renderNoteRows", "renderNotesPage", "splitNoteTitle", "escapeHtml", "pocketIcon"]) {
  const declaration = ast.statements.find((node) => ts.isFunctionDeclaration(node) && node.name?.text === name);
  assert.ok(declaration, `Static function ${name} exists`);
  vm.runInContext(declaration.getText(ast), staticContext);
}

const base = { section: "logs", type: "Field Note", priority: 50, updated: "2026-10-20", started: "2026-10-20", meta: {}, body: ":::note 20 / 10 / 2026 - Note\nBody\n:::" };
const records = [
  { ...base, id: "modest", title: "Modest", writtenAt: "2026-10-20", writtenOrder: 1 },
  { ...base, id: "peaceful", title: "Peaceful", writtenAt: "2026-10-20", writtenOrder: 2 },
  { ...base, id: "older-edited", title: "Older", writtenAt: "2026-05-01", updated: "2027-01-01" },
  { ...base, id: "later", title: "Later", writtenAt: "2026-10-20T20:00:00.000Z" },
  { ...base, id: "earlier", title: "Earlier", writtenAt: "2026-10-20T10:00:00.000Z" }
];
const expected = ["later", "earlier", "peaceful", "modest", "older-edited"];
const ids = (values) => Array.from(values, (value) => value.record?.id || value.id);
for (const input of [records, [...records].reverse()]) {
  assert.deepEqual(ids([...input].sort(chronology.compareLogWritingOrder)), expected);
  staticContext.records = input;
  assert.deepEqual(ids(vm.runInContext("[...records].sort(compareSectionRecords)", staticContext)), expected);
  assert.deepEqual(ids(react.recentActivity(input, 10)), expected);
  assert.deepEqual(ids(vm.runInContext("recentActivity(10)", staticContext)), expected);
}
assert.equal(chronology.logArchiveDate(records[2]), "2026-05-01");
const legacy = [{ ...base, id: "b" }, { ...base, id: "a" }];
assert.deepEqual(ids(legacy.sort(chronology.compareLogWritingOrder)), ["a", "b"], "Legacy ties have a deterministic fallback");
const realLogs = realRecords.filter((record) => record.section === "logs").sort(chronology.compareLogWritingOrder);
const realIds = ids(realLogs);
if (realIds.includes("a-peaceful-entry") && realIds.includes("a-modest-signal")) {
  assert.ok(realIds.indexOf("a-peaceful-entry") < realIds.indexOf("a-modest-signal"), "Known relative order remains valid when future logs are added");
}
assert.equal(chronology.compareSectionRecords({ ...base, section: "games", updated: "2026-10-21" }, { ...base, section: "games" }) < 0, true, "Non-log sections retain updated-date ordering");

const session = { ...base, id: "session", title: "Session", section: "games", type: "Play Log", updated: "2026-11-01",
  body: ":::note 13 / 11 / 2026 - Same title\nSecond session.\n:::\n:::note 13 / 11 / 2026 - Same title\nFirst session.\n:::\n:::note 12 / 11 / 2026 - Empty\n:::\n:::note No date\nNot a dated update.\n:::" };
const project = { ...base, id: "project", title: "Project", section: "projects", updated: "2026-11-12", type: "Project Log",
  body: ":::note 11 / 11 / 2026 - An update\nOlder than the metadata edit.\n:::" };
const peripheral = { ...base, id: "peripheral", section: "setup", setupGroup: "peripherals", meta: { setupGroup: "peripherals" }, title: "Keyboard" };
const tool = { ...peripheral, id: "tool", setupGroup: "tools", meta: { setupGroup: "tools" } };
const snapshot = (items) => Array.from(items, ({ id, date, detail, noteIndex, content }) => [id, date, detail, noteIndex, content]);
for (const input of [[session, project, peripheral, tool], [tool, peripheral, project, session]]) {
  staticContext.records = input;
  const result = react.recentActivity(input, 10);
  assert.deepEqual(snapshot(result), snapshot(vm.runInContext("recentActivity(10)", staticContext)));
  assert.deepEqual(result.map((item) => item.id), ["session:note:0", "session:note:1", "project:record", "project:note:0", "peripheral:record"]);
  assert.deepEqual(result.slice(0, 2).map((item) => item.noteIndex), [0, 1], "Even identical same-day titles target their own note");
  assert.deepEqual(result.map((item) => item.date), ["2026-11-13", "2026-11-13", "2026-11-12", "2026-11-11", "2026-10-20"]);
  assert.deepEqual(snapshot(react.recentActivity(input, 2)), snapshot(result.slice(0, 2)), "Apply the limit after expanding and sorting notes");
}

const newerSession = {
  ...session,
  body: ":::note 14 / 11 / 2026 - Newer follow-up\nLater writing must take the first slot.\n:::\n" + session.body
};
staticContext.records = [newerSession, project];
const refreshedFeed = react.recentActivity(staticContext.records, 3);
assert.deepEqual(refreshedFeed.map((item) => item.detail), ["Play Log / Newer follow-up", "Play Log / Same title", "Play Log / Same title"]);
assert.deepEqual(refreshedFeed.map((item) => item.noteIndex), [0, 1, 2], "Newer notes shift the feed without losing the older entries or targets");
assert.deepEqual(snapshot(refreshedFeed), snapshot(vm.runInContext("recentActivity(3)", staticContext)));

const publicContext = vm.createContext({ window: {} });
vm.runInContext(readFileSync(new URL("../public/data/records.js", import.meta.url), "utf8"), publicContext);
staticContext.records = publicContext.window.__GESTALT_RECORDS;
const pagesFeed = vm.runInContext("recentActivity(6)", staticContext);
assert.deepEqual(snapshot(react.recentActivity(realRecords, 6)), snapshot(pagesFeed), "Real archive data agrees in both readers");
for (const [record, expected] of [[session, "2026-11-13"], [project, "2026-11-12"], [records[2], "2027-01-01"], [{ ...session, body: "No dated notes." }, "2026-11-01"]]) {
  assert.equal(react.recordLastUpdated(record), expected);
  assert.equal(staticContext.recordLastUpdated(record), expected);
}
assert.equal(react.activityDate(records[2]), "2026-05-01", "Field-log ordering uses writing date, not display freshness");
staticContext.state = { noteSearchQuery: "", focusedNoteIndex: 1 };
staticContext.markdownBody = staticContext.escapeHtml;
const targeted = staticContext.renderNotesPage(session);
assert.match(targeted, /data-note-index="0"[^>]*(?<! hidden)>/, "Other notes remain in the list");
assert.doesNotMatch(targeted, /data-note-index="0"[^>]*\b(?:open|hidden)\b>/, "A duplicate title stays collapsed, not hidden");
assert.match(targeted, /data-note-index="1"[^>]* open>/, "The selected note starts open");
assert.match(targeted, /First session\./);
assert.doesNotMatch(targeted, /Second session\./, "Other note bodies stay lazy");
assert.match(targeted, /class="note-pager"[^>]* hidden>/, "Short entries do not show navigation");

const long = Array.from({ length: 13 }, (_, index) => ({
  title: index % 2 === 0 ? `07 / 11 / 2026 - Signal ${index}` : `06 / 11 / 2026 - Session ${index}`,
  body: `Fixture body ${index}.`
}));
for (const paginate of [react.notePage, staticContext.notePage]) {
  const list = (result) => Array.from(result.notes, (note) => note.index);
  assert.deepEqual(list(paginate(long, "")), [0, 1, 2, 3, 4]);
  assert.equal(paginate(long, "").openIndex, 0);
  assert.equal(paginate(long, "", 1).openIndex, undefined, "Older browse pages start collapsed");
  assert.deepEqual(list(paginate(long, "", 99)), [10, 11, 12]);
  assert.deepEqual(list(paginate(long, "", undefined, 12)), [10, 11, 12]);
  assert.equal(paginate(long, "", undefined, 12).openIndex, 12, "Deep links expand an exact note on its page");
  assert.deepEqual(list(paginate(long, "  SIGNAL ", 1)), [10, 12], "Search includes notes beyond the first browse page");
  assert.deepEqual(list(paginate(long, "06 / 11", 1)), [11]);
  assert.deepEqual(list(paginate(long, "no match")), []);
}
console.log("Log order, Recent Activity and note paging passed: writing dates, same-day notes, exact destinations, full-entry search, limits and React/static parity.");
