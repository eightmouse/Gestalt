import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import vm from "node:vm";
import ts from "typescript";
import { createElement, useState } from "react";
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
  const context = vm.createContext({ exports: {}, require, useState, ...globals });
  vm.runInContext(ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX }
  }).outputText, context);
  return context;
}
const common = ["getRecordContents", "recordMediaSources", "hasRecordAttachments", "contentOrdinal"];
const react = compile(`${functions("components/archive/record-utils.ts", ["metaText", "decodeTextBlock"])}\n${functions("components/archive/record-content.tsx", [...common, "getTextList", "SampleGrid", "AttachmentGrid", "RecordContentPanel"])}\nexports.samples = SampleGrid; exports.attachments = AttachmentGrid;`);
const staticContext = compile(functions("static-app.js", [...common, "textList", "textBlock", "escapeHtml", "normalizeContentKey", "renderSamplePage", "renderMediaPage", "renderTechnicalPage"]), { state: { activeContent: "overview" } });
const base = { id: "fixture", title: "Fixture", section: "projects", banner: "/media/header.png", body: "", meta: {} };
const staticRecord = (record) => ({ ...record, ...record.meta });
const keys = (items) => Array.from(items, (item) => item.key);
for (const [meta, expected] of [
  [{}, ["overview", "notes"]],
  [{ technicalStack: " \n | " , samples: [" ", ""] }, ["overview", "notes"]],
  [{ technicalStack: ["TypeScript", "Next.js"] }, ["technical", "overview", "notes"]],
  [{ samples: ["/media/sample.png"] }, ["overview", "notes", "samples"]],
  [{ technicalStack: "TypeScript | Next.js", samples: "/media/a.png, /media/b.png" }, ["technical", "overview", "notes", "samples"]]
]) {
  const record = { ...base, meta };
  react.record = record;
  staticContext.record = staticRecord(record);
  for (const context of [react, staticContext]) {
    assert.deepEqual(keys(vm.runInContext("getRecordContents(record)", context)), expected);
    assert.equal(vm.runInContext("contentOrdinal(record, 0)", context), expected[0] === "technical" ? "00" : "01");
  }
  staticContext.state.activeContent = "samples";
  assert.equal(vm.runInContext("normalizeContentKey(record)", staticContext), expected.includes("samples") ? "samples" : "overview");
}
for (const section of ["logs", "games", "archive", "setup"]) {
  for (const attachments of [undefined, [], [" "], ["/media/attachment.png"]]) {
    const record = { ...base, section, meta: { attachments } };
    react.record = record;
    staticContext.record = staticRecord(record);
    const reactContents = vm.runInContext("getRecordContents(record)", react);
    const staticContents = vm.runInContext("getRecordContents(record)", staticContext);
    assert.equal(JSON.stringify(reactContents), JSON.stringify(staticContents), "Public navigation labels and keys match");
    if (section === "logs") assert.equal(keys(reactContents).includes("attachments"), attachments?.[0]?.trim().length > 0);
  }
}
for (const kind of ["samples", "attachments"]) {
  for (const count of [0, 1, 2, 6, 8]) {
    const record = { ...base, meta: { [kind]: Array.from({ length: count }, (_, index) => `/media/${index}.png`) } };
    react.record = record;
    staticContext.record = staticRecord(record);
    assert.equal(JSON.stringify(vm.runInContext(`recordMediaSources(record, "${kind}")`, react)), JSON.stringify(vm.runInContext(`recordMediaSources(record, "${kind}")`, staticContext)));
    const component = kind === "samples" ? react.exports.samples : react.exports.attachments;
    const htmls = [renderToStaticMarkup(createElement(component, { record, prefix: "ATTACH", title: "ATTACHMENTS" })), vm.runInContext(kind === "samples" ? "renderSamplePage(record)" : "renderMediaPage(record)", staticContext)];
    for (const html of htmls) {
      assert.equal((html.match(/class="sample-terminal"/g) || []).length, Math.min(count, 6));
      assert.ok(!html.includes("Awaiting") && !html.includes("NO MEDIA") && !html.includes("NO CAPTURE"));
      assert.ok(!html.includes("disabled"));
      assert.ok(!html.includes("header.png"), "Header artwork is not an attachment or sample");
      assert.ok(!html.includes("media-alert-field"), "Attachments use a content-sized gallery, not an empty alert field");
    }
  }
}
react.record = base;
staticContext.record = staticRecord(base);
for (const html of [renderToStaticMarkup(createElement(react.exports.RecordContentPanel, { activeContent: "technical", record: base, noteSearchQuery: "" })), vm.runInContext("renderTechnicalPage(record)", staticContext)]) {
  assert.ok(!html.includes("Next.js"), "No fabricated project stack");
}
const studio = compile(`${functions("components/studio-client.tsx", ["getStudioContents"])}\nexports.contents = getStudioContents;`);
assert.deepEqual(keys(studio.exports.contents("projects")), ["technical", "overview", "notes", "samples"], "Studio retains empty authoring targets");
const windowSource = read("components/archive/record-window.tsx");
assert.match(windowSource, /contents\.some\(\(item\) => item\.key === requestedContent\) \? requestedContent : "overview"/, "React settles a removed tab to Overview");
assert.doesNotMatch(read("app/globals.css"), /\.record-layout:has\(\.record-heading\.has-heading-banner\)\s+\.record-aside/, "Header artwork must not change Contents alignment or impose an empty navigation height");
console.log("Contextual content tests passed: empty tabs, stable numbering, real media only, bounded galleries, reader parity and preserved Studio controls.");
