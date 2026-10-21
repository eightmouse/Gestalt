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

const chronology = compile(read("lib/log-archive.ts")).exports;
const dates = compile(functions("components/archive/record-utils.ts", ["formatReadableDate"])).exports;
const section = { id: "archive", code: "06_ARCHIVE", label: "Archive", icon: "archive" };
const { ArrowUp, FileText, Folder, FolderOpen, HardDrive, X } = require("lucide-react");
const react = compile(`${functions("components/archive/section-page.tsx", ["ArchiveFolders", "ArchiveFile", "sortByArchiveDate", "SectionReadout", "sectionReadout"])}\nexports.ArchiveFolders = ArchiveFolders;`, {
  ArrowUp, FileText, Folder, FolderOpen, HardDrive, X, ...chronology, ...dates, useEffect, useState,
  sectionRegistryLabels: { archive: "Field Archive" }
});
const staticContext = compile(functions("static-app.js", [
  "renderArchiveFolders", "renderArchiveFile", "sortArchiveRecords", "archiveUsesFolders", "escapeHtml", "readableDate", "sectionReadout", "renderSectionReadout"
]), {
  ...chronology, logArchiveAfterDays: chronology.LOG_ARCHIVE_AFTER_DAYS,
  state: { archiveFolderWindow: "" }, sectionRegistryLabels: { archive: "Field Archive" }
});

const base = { section: "logs", type: "Field Note", priority: 50, updated: "2025-02-01", started: "2025-01-01", status: "Filed", meta: {}, body: "Unchanged content", summary: "", milestones: [], progress: 0 };
const makeRecords = (count) => Array.from({ length: count }, (_, index) => ({ ...base, id: `note-${index}`, title: `Note ${index}`, writtenAt: `2025-01-${String(index + 1).padStart(2, "0")}` }));
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
  for (const html of htmls(makeRecords(count))) {
    assert.equal(html.includes('class="archive-root-files"'), count <= 24);
    assert.equal(html.includes('class="archive-folder-tiles"'), count > 24);
    assert.equal((html.match(/class="archive-file"/g) || []).length, count <= 24 ? count : 0);
    if (!count) assert.ok(html.includes("No records have reached the archive threshold yet."));
    if (count > 1 && count <= 24) assert.ok(html.indexOf(`title="Note ${count - 1}"`) < html.indexOf('title="Note 0"'), "Newest original date first");
  }
}

const mixed = [
  { ...base, id: "recent", title: "Newer year", writtenAt: "2025-03-01" },
  { ...base, id: "old", title: "Older year", writtenAt: "2024-12-01", updated: "2026-10-21" },
  { ...base, section: "archive", id: "manual", title: "Manual <script> & file" },
  { ...base, id: "future", title: "Not archived", writtenAt: "9999-01-01" }
];
for (const html of htmls(mixed)) {
  assert.equal((html.match(/class="archive-file"/g) || []).length, 3);
  assert.ok(html.indexOf('title="Newer year"') < html.indexOf('title="Older year"'));
  assert.ok(html.includes("MANUAL ARCHIVE"));
  assert.ok(html.includes("Manual &lt;script&gt; &amp; file"));
  assert.ok(!html.includes("Not archived"));
}
staticContext.state.archiveFolderWindow = "2025";
staticContext.records = makeRecords(25);
staticContext.section = section;
assert.ok(vm.runInContext("renderArchiveFolders(section, records)", staticContext).includes('role="dialog"'), "Larger collections retain the folder window");
staticContext.records = makeRecords(1);
const reduced = vm.runInContext("renderArchiveFolders(section, records)", staticContext);
assert.ok(!reduced.includes('role="dialog"'), "Shrinking a collection closes stale folder state");
assert.equal(staticContext.state.archiveFolderWindow, "");
console.log("Field Archive tests passed: root/folder threshold, renderer parity, original chronology, escaping, mixed records and stale-folder cleanup.");
