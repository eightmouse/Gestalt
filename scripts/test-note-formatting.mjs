import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import vm from "node:vm";
import ts from "typescript";
import { createElement, useState } from "react";
import { renderToStaticMarkup } from "react-dom/server";

const require = createRequire(import.meta.url);
function compile(source, globals = {}) {
  const context = vm.createContext({ exports: {}, require, ...globals });
  vm.runInContext(ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText, context);
  return context;
}
function functions(file, names) {
  const source = readFileSync(new URL(file, import.meta.url), "utf8");
  const ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, file.endsWith("tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.JS);
  return names.map((name) => {
    const node = ast.statements.find((node) => ts.isFunctionDeclaration(node) && node.name?.text === name);
    assert.ok(node, `${name} exists in ${file}`);
    return node.getText(ast);
  }).join("\n");
}
const { formatNoteSelection } = compile(readFileSync(new URL("../lib/note-formatting.ts", import.meta.url), "utf8")).exports;
for (const [body, start, end, action, expected] of [
  ["Hello", 0, 5, "heading", "## Hello"],
  ["## Hello", 0, 8, "heading", "Hello"],
  ["## Hello", 4, 4, "subheading", "### Hello"],
  ["One\nTwo\nThree", 0, 4, "list", "- One\nTwo\nThree"],
  ["One\nTwo", 0, 7, "list", "- One\n- Two"],
  ["- One\nTwo", 0, 9, "list", "- One\n- Two"],
  ["One\n\nTwo", 0, 8, "quote", "> One\n\n> Two"],
  ["## One\nTwo", 0, 10, "heading", "## One\n## Two"],
  ["", 0, 0, "heading", "## "],
  ["![Banner](/media/a.png)", 0, 20, "heading", "![Banner](/media/a.png)"],
  [":::note Title\nBody\n:::", 0, 100, "quote", ":::note Title\n> Body\n:::"],
  ["First\r\nSecond", 0, 13, "list", "- First\r\n- Second"]
]) {
  const result = formatNoteSelection(body, start, end, action);
  assert.equal(result.body, expected);
  assert.ok(result.start >= 0 && result.end >= result.start && result.end <= result.body.length);
}
const caret = formatNoteSelection("Hello", 2, 2, "heading");
assert.equal(caret.start, 5);
assert.equal(caret.end, 5);
const selected = formatNoteSelection("One\nTwo", 0, 7, "list");
assert.equal(selected.start, 2);
assert.equal(selected.end, 11);
assert.equal(formatNoteSelection(selected.body, selected.start, selected.end, "list").body, "One\nTwo");

const mediaFunctions = ["parseNoteMediaOptions", "isNoteMediaToken", "noteMediaClassName"];
const react = compile(functions("../components/archive/record-content.tsx", ["RecordBody", ...mediaFunctions]), { useState });
const staticContext = compile(functions("../static-app.js", ["markdownBody", "escapeHtml", ...mediaFunctions]));
const studio = compile(`${functions("../components/studio-client.tsx", ["parseStudioNotes", "serializeStudioNotes", "splitStudioUpdateIndex"])}\nexports.parse = parseStudioNotes; exports.serialize = serializeStudioNotes;`);
const image = "![Screenshot | full=/media/full.png](/media/thumb.webp)";
for (const [action, tag] of [["heading", "h4"], ["subheading", "h5"], ["list", "p"], ["quote", "blockquote"]]) {
  const original = `${image}\n\nWords <script>alert(1)</script>\nA second line`;
  const formatted = formatNoteSelection(original, 0, original.length, action).body;
  assert.ok(formatted.startsWith(image), "Formatting must leave image syntax and full-original tokens unchanged");
  const serialized = studio.exports.serialize([{ title: "20 / 10 / 2026 - New note", body: formatted }, { title: "Older", body: "Untouched older note." }]);
  const notes = studio.exports.parse(serialized);
  assert.equal(notes[0].body, formatted);
  assert.equal(notes[1].body, "Untouched older note.");
  staticContext.body = notes[0].body;
  const htmls = [renderToStaticMarkup(createElement(react.exports.RecordBody, { body: notes[0].body })), vm.runInContext("markdownBody(body)", staticContext)];
  for (const html of htmls) {
    assert.ok(html.includes(`<${tag}`));
    assert.ok(html.includes("&lt;script&gt;"), "No raw HTML is enabled by the toolbar");
    assert.ok(!html.includes("<script>"));
    assert.ok(html.includes('/media/thumb.webp'));
    assert.ok(html.includes("Screenshot"));
  }
}
console.log("Note formatting tests passed: line toggles, caret/selection mapping, boundaries, media preservation, note round-trip and React/static rendering.");
