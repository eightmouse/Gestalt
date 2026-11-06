import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import vm from "node:vm";
import ts from "typescript";
import { createElement, useEffect, useState } from "react";
import { renderToStaticMarkup } from "react-dom/server";

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

const now = new Date("2026-11-05T12:00:00Z");
class ArchiveClock extends Date {
  constructor(...args) { super(...(args.length ? args : [now.getTime()])); }
  static now() { return now.getTime(); }
}
const chronology = compile(read("lib/log-archive.ts"), { Date: ArchiveClock }).exports;
const dates = compile(functions("components/archive/record-utils.ts", ["formatReadableDate"])).exports;
const section = { id: "archive", code: "06_ARCHIVE", label: "Archive", icon: "archive" };
const { ArrowUp, FileText, Folder, FolderOpen, HardDrive, X } = require("lucide-react");
const react = compile(`${functions("components/archive/section-page.tsx", ["ArchiveFolders", "ArchiveFile", "SectionReadout", "sectionReadout"])}\nexports.ArchiveFolders = ArchiveFolders;`, {
  ArrowUp, FileText, Folder, FolderOpen, HardDrive, X, ...chronology, ...dates, useEffect, useState,
  sectionRegistryLabels: { archive: "Field Archive" }
});
const staticSource = read("static-app.js");
for (const [name, value] of [["archiveRootFileLimit", chronology.ARCHIVE_ROOT_FILE_LIMIT], ["archiveRecentFileLimit", chronology.ARCHIVE_RECENT_FILE_LIMIT]]) {
  assert.match(staticSource, new RegExp(`const ${name} = ${value};`), `${name} agrees with the local reader`);
}
const staticContext = compile(functions("static-app.js", [
  "renderArchiveFolders", "renderArchiveFolderWindow", "renderArchiveFile", "buildFieldArchive", "sortArchiveRecords", "archiveUsesFolders", "logArchiveDate", "compareLogWritingOrder", "compareSectionRecords", "isLogArchivedByAge", "escapeHtml", "readableDate", "sectionReadout", "renderSectionReadout"
]), {
  Date: ArchiveClock, logArchiveAfterDays: chronology.LOG_ARCHIVE_AFTER_DAYS,
  archiveRootFileLimit: chronology.ARCHIVE_ROOT_FILE_LIMIT, archiveRecentFileLimit: chronology.ARCHIVE_RECENT_FILE_LIMIT,
  state: { archiveFolderWindow: "" }, sectionRegistryLabels: { archive: "Field Archive" }
});

const base = { section: "logs", type: "Field Note", priority: 50, updated: "2025-02-01", started: "2025-01-01", status: "Filed", meta: {}, body: "Unchanged content", summary: "", milestones: [], progress: 0 };
const makeRecords = (count, month = "2025-01") => Array.from({ length: count }, (_, index) => ({ ...base, id: `${month}-${index}`, title: `Note ${month}-${index}`, writtenAt: `${month}-${String(index % 28 + 1).padStart(2, "0")}`, writtenOrder: index }));
const plain = (value) => JSON.parse(JSON.stringify(value));
function models(records) {
  staticContext.records = records;
  const before = JSON.stringify(records);
  const local = chronology.buildFieldArchive(records, now);
  const published = vm.runInContext("buildFieldArchive(records)", staticContext);
  assert.deepEqual(plain(published), plain(local), "Both grouping implementations agree");
  assert.equal(JSON.stringify(records), before, "Grouping must not change authored records or their order");
  const files = [...local.looseGroups, ...local.folders].flatMap((group) => group.records);
  assert.equal(files.length, local.archivedLogs.length + records.filter((record) => record.section !== "logs").length);
  assert.equal(new Set(files.map((record) => record.id)).size, files.length, "Each file appears exactly once");
  const looseIds = new Set(local.looseGroups.flatMap((group) => group.records.map((record) => record.id)));
  for (const record of local.archivedLogs.slice(0, 12)) assert.ok(looseIds.has(record.id), "Recent files stay loose");
  const foldedMonths = new Set();
  for (const folder of local.folders) {
    assert.ok(folder.records.length >= 2, "Do not create folders that save no space");
    const month = chronology.logArchiveDate(folder.records[0]).slice(0, 7);
    assert.equal(folder.title, `${month.slice(5, 7)}/${month.slice(0, 4)}`);
    for (const record of folder.records) assert.equal(chronology.logArchiveDate(record).slice(0, 7), month);
    foldedMonths.add(month);
  }
  for (const record of local.looseGroups.flatMap((group) => group.records).filter((record) => record.section === "logs")) {
    assert.ok(!foldedMonths.has(chronology.logArchiveDate(record).slice(0, 7)), "A month is never split between a folder and loose files");
  }
  return local;
}
function htmls(records) {
  staticContext.records = records;
  staticContext.section = section;
  const before = JSON.stringify(records);
  const html = [renderToStaticMarkup(createElement(react.exports.ArchiveFolders, { section, records, onOpenRecord() {} })), vm.runInContext("renderArchiveFolders(section, records)", staticContext)];
  assert.equal(JSON.stringify(records), before, "Browsing must not migrate or edit records");
  return html;
}
for (const count of [0, 1, 6, 12, 24, 25, 30]) {
  assert.equal(chronology.archiveUsesFolders(count), count > 24);
  staticContext.count = count;
  assert.equal(vm.runInContext("archiveUsesFolders(count)", staticContext), count > 24);
  const records = makeRecords(count);
  assert.equal(models(records).folders.length, 0, "A busy newest month stays loose even above the target");
  for (const html of htmls(records)) {
    assert.ok(html.includes('class="archive-root-files"'));
    assert.ok(!html.includes('class="archive-folder-tiles"'));
    assert.equal((html.match(/class="archive-file"/g) || []).length, count);
    if (!count) assert.ok(html.includes("No records have reached the archive threshold yet."));
    if (count > 1) assert.ok(html.indexOf(`title="Note 2025-01-${Math.min(count, 28) - 1}"`) < html.indexOf('title="Note 2025-01-0"'), "Newest original date first");
  }
}

const threshold = [...makeRecords(23, "2026-10"), ...makeRecords(2, "2026-09")];
assert.equal(models(threshold.slice(0, 24)).folders.length, 0, "No folders at exactly 24 notes");
const crossed = models(threshold);
assert.deepEqual(plain(crossed.folders.map((folder) => folder.title)), ["09/2026"]);
assert.equal(crossed.looseGroups[0].records.length, 23, "The 25th file folds only the older eligible month");

const gradual = [...makeRecords(12, "2026-10"), ...makeRecords(8, "2026-09"), ...makeRecords(6, "2026-08"), ...makeRecords(5, "2026-07")];
const partition = models(gradual);
assert.deepEqual(plain(partition.folders.map((folder) => folder.title)), ["08/2026", "07/2026"]);
assert.equal(partition.looseGroups[0].records.length, 20, "Stop tidying once the root fits, leaving newer older months loose too");
for (const html of htmls(gradual)) {
  assert.equal((html.match(/class="archive-file"/g) || []).length, 20);
  assert.equal((html.match(/class="archive-folder-tile"/g) || []).length, 2);
  assert.ok(html.indexOf("08/2026") < html.indexOf("07/2026"), "Month folders are newest first");
  assert.ok(html.includes("20 files / 2 folders"));
  assert.ok(html.includes("MONTHLY FILES"));
}
const olderEdit = gradual.map((record) => ({ ...record, updated: "2027-01-01" }));
assert.deepEqual(plain(models(olderEdit).folders.map((folder) => ({ title: folder.title, ids: folder.records.map((record) => record.id) }))), plain(partition.folders.map((folder) => ({ title: folder.title, ids: folder.records.map((record) => record.id) }))), "Editing must not reorganize writing chronology");
assert.equal(models([...makeRecords(5, "2026-10"), ...makeRecords(27, "2026-09")]).folders.length, 0, "Keep enough recent files without splitting their month");
const singleMonths = Array.from({ length: 30 }, (_, index) => makeRecords(1, `${2025 - Math.floor(index / 12)}-${String(12 - index % 12).padStart(2, "0")}`)[0]);
assert.equal(models(singleMonths).folders.length, 0, "Single-file months are not hidden merely to satisfy a number");
const manual = makeRecords(30).map((record) => ({ ...record, section: "archive" }));
assert.equal(models(manual).folders.length, 0, "Manual archive items do not trigger log grouping");
assert.equal(models([...gradual, ...manual]).folders.length, 2, "Manual items do not change the log partition");
const yearBoundary = [...makeRecords(12, "2025-01"), ...makeRecords(8, "2024-12"), ...makeRecords(6, "2024-11")];
assert.deepEqual(plain(models(yearBoundary).folders.map((folder) => folder.title)), ["11/2024"]);
const reverse = Object.freeze(gradual.toReversed().map((record) => Object.freeze(record)));
assert.deepEqual(plain(models(reverse)), plain(partition), "Input order does not affect the partition");

const mixed = [
  { ...base, id: "recent", title: "Newer year", writtenAt: "2025-03-01" },
  { ...base, id: "old", title: "Older year", writtenAt: "2024-12-01", updated: "2026-10-21" },
  { ...base, section: "archive", id: "manual", title: "Manual <script> & file" },
  { ...base, id: "future", title: "Not archived", writtenAt: "9999-01-01" },
  { ...base, id: "invalid", title: "Invalid date", writtenAt: "2025-02-31" },
  { ...base, id: "recent", title: "Too recent", writtenAt: "2026-11-04" }
];
models(mixed);
for (const html of htmls(mixed)) {
  assert.equal((html.match(/class="archive-file"/g) || []).length, 3);
  assert.ok(html.indexOf('title="Newer year"') < html.indexOf('title="Older year"'));
  assert.ok(html.includes("MANUAL ARCHIVE"));
  assert.ok(html.includes("Manual &lt;script&gt; &amp; file"));
  assert.ok(!html.includes("Not archived"));
  assert.ok(!html.includes("Invalid date"));
  assert.ok(!html.includes("Too recent"));
}
staticContext.state.archiveFolderWindow = "07/2026";
staticContext.records = gradual;
staticContext.section = section;
const active = vm.runInContext("renderArchiveFolders(section, records)", staticContext);
assert.ok(active.includes('role="dialog"'), "Month folders retain the existing folder window");
assert.ok(active.includes('tabindex="-1" aria-label="07/2026 folder"'), "The folder can take focus without native autofocus racing restoration");
assert.equal(vm.runInContext("renderArchiveFolderWindow(buildFieldArchive(records).folders)", staticContext), active.slice(active.indexOf('<div class="archive-folder-overlay">'), -"\n  </section>".length), "In-place opening uses exactly the same markup as a full render");
assert.ok(active.includes('aria-label="07/2026 folder"'));
assert.ok(active.includes("Sorted by date . Newest first"));
react.useState = () => ["07/2026", () => {}];
const localActive = renderToStaticMarkup(createElement(react.exports.ArchiveFolders, { section, records: gradual, onOpenRecord() {} }));
react.useState = useState;
assert.ok(localActive.includes('aria-label="07/2026 folder"'), "The local reader opens the same month window");
assert.equal((localActive.match(/class="archive-file"/g) || []).length, (active.match(/class="archive-file"/g) || []).length);
staticContext.state.archiveFolderWindow = "06/2026";
vm.runInContext("renderArchiveFolders(section, records)", staticContext);
assert.equal(staticContext.state.archiveFolderWindow, "", "A vanished folder closes even while other folders remain");
staticContext.state.archiveFolderWindow = "07/2026";
staticContext.records = makeRecords(1);
const reduced = vm.runInContext("renderArchiveFolders(section, records)", staticContext);
assert.ok(!reduced.includes('role="dialog"'), "Shrinking a collection closes stale folder state");
assert.equal(staticContext.state.archiveFolderWindow, "");
console.log("Field Archive tests passed: gradual month/year grouping, recent-file buffer, busy months, renderer parity, original chronology, no migration, manual records, escaping and stale-folder cleanup.");
