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
for (const name of ["logArchiveDate", "compareLogWritingOrder", "compareSectionRecords", "recentActivity", "activityDate", "activityTrace", "setupActivityDetail", "setupGroupForActivity", "activityTraceTitle", "noteEntries", "splitUpdateIndex", "noteTitleDate"]) {
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
console.log("Log order tests passed: original dates, same-day first-save times, known legacy order, stable fallback and React/static activity parity.");
