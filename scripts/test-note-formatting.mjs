import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import vm from "node:vm";
import ts from "typescript";
import { createElement, useState } from "react";
import { renderToStaticMarkup } from "react-dom/server";

const require = createRequire(import.meta.url);
const noteInline = require("../public/note-inline.js");
function compile(source, globals = {}) {
  const context = vm.createContext({ exports: {}, require: (name) => name === "@/public/note-inline.js" ? noteInline : require(name), ...globals });
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
const { formatNoteSelection, insertNoteLink } = compile(readFileSync(new URL("../lib/note-formatting.ts", import.meta.url), "utf8")).exports;
for (const [body, start, end, action, expected] of [
  ["Hello", 0, 5, "heading", "## Hello"],
  ["Hello", 0, 5, "heading1", "# Hello"],
  ["# Hello", 0, 7, "heading1", "Hello"],
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
for (const [source, prefix] of [["heading1", "# "], ["heading", "## "], ["subheading", "### "]]) {
  for (const [target, nextPrefix] of [["heading1", "# "], ["heading", "## "], ["subheading", "### "]]) {
    const body = `${prefix}**Words**`;
    const result = formatNoteSelection(body, prefix.length, body.length, target);
    assert.equal(result.body, source === target ? "**Words**" : `${nextPrefix}**Words**`, "Heading levels replace rather than stack prefixes");
    assert.equal(result.body.slice(result.start, result.end), "**Words**", "Heading conversion preserves inline text selection");
  }
}
const selected = formatNoteSelection("One\nTwo", 0, 7, "list");
assert.equal(selected.start, 2);
assert.equal(selected.end, 11);
assert.equal(formatNoteSelection(selected.body, selected.start, selected.end, "list").body, "One\nTwo");

for (const [action, marker] of [["bold", "**"], ["italic", "*"], ["code", "`"]]) {
  for (const body of ["Words", "One\nTwo", "One\r\n\r\nTwo"]) {
    const formatted = formatNoteSelection(body, 0, body.length, action);
    assert.ok(formatted.body.startsWith(marker));
    assert.equal(formatNoteSelection(formatted.body, formatted.start, formatted.end, action).body, body, `${action} toggles around the preserved selection`);
  }
  const empty = formatNoteSelection("", 0, 0, action);
  assert.ok(empty.start < empty.end, "Inserted placeholder text is selected for replacement");
  const media = "![Session | full=/media/full.png](/media/thumb.webp)";
  assert.equal(formatNoteSelection(media, 4, 7, action).body, media, "Partial image selections are protected");
}
const bold = formatNoteSelection("Words", 0, 5, "bold");
const both = formatNoteSelection(bold.body, bold.start, bold.end, "italic");
assert.equal(both.body, "***Words***");
assert.equal(formatNoteSelection(both.body, both.start, both.end, "italic").body, "**Words**");
const codeTicks = formatNoteSelection("a`b", 0, 3, "code");
assert.equal(codeTicks.body, "``a`b``");
assert.equal(formatNoteSelection(codeTicks.body, codeTicks.start, codeTicks.end, "code").body, "a`b");

const insertedLink = insertNoteLink("Visit this", 6, 10, "https://example.test/path_(one)");
assert.equal(insertedLink.body, "Visit [this](https://example.test/path_(one))");
assert.equal(insertedLink.body.slice(insertedLink.start, insertedLink.end), "this");
assert.ok(insertNoteLink("Words", 0, 5, "javascript:alert(1)").error);
assert.ok(insertNoteLink("One\nTwo", 0, 7, "https://example.test").error);
assert.ok(formatNoteSelection("[Label](https://example.test)", 10, 15, "bold").error);
assert.ok(formatNoteSelection("[Label](https://example.test/path_(one))", 32, 35, "bold").error, "Balanced URL parentheses are protected");
assert.doesNotThrow(() => formatNoteSelection("[".repeat(32000) + "](unclosed", 0, 32000, "bold"));
for (const href of ["javascript:alert(1)", "data:text/html,test", "vbscript:test", "file:///test", "//example.test", "https://user:secret@example.test", "https://example.test\\@other.test", "https://example.test\n/path", "https://"]) {
  assert.equal(noteInline.safeNoteHref(href), null, `Reject unsafe or ambiguous destination ${JSON.stringify(href)}`);
}

const browserInline = vm.createContext({ URL });
vm.runInContext(readFileSync(new URL("../public/note-inline.js", import.meta.url), "utf8"), browserInline);
for (const text of ["plain", "**bold**", "*italic*", "***both***", "**bold *nested* text**", "*italic **nested** text*", "`**literal**`", "``a`b``", "[**Label**](https://example.test/path_(one))", "\\*literal\\*", "Unclosed **word", "[bad](javascript:alert(1))"]) {
  assert.equal(JSON.stringify(browserInline.GestaltNoteInline.tokenizeNoteInline(text)), JSON.stringify(noteInline.tokenizeNoteInline(text)), "Browser/CommonJS parser parity");
}

const mediaFunctions = ["parseNoteMediaOptions", "isNoteMediaToken", "noteMediaClassName"];
const react = compile(functions("../components/archive/record-content.tsx", ["RecordBody", "renderNoteInline", ...mediaFunctions]), { useState, noteInline });
const staticContext = compile(functions("../static-app.js", ["markdownBody", "renderNoteInline", "escapeHtml", ...mediaFunctions]), { window: { GestaltNoteInline: noteInline } });
const studio = compile(`${functions("../components/studio-client.tsx", ["parseStudioNotes", "serializeStudioNotes", "splitStudioUpdateIndex"])}\nexports.parse = parseStudioNotes; exports.serialize = serializeStudioNotes;`);
for (const action of ["bold", "italic", "code"]) {
  const formatted = formatNoteSelection("A thought", 0, 9, action).body;
  const source = studio.exports.serialize([{ title: "New note", body: formatted }, { title: "Older note", body: "Unchanged." }]);
  assert.equal(studio.exports.parse(source)[0].body, formatted);
  assert.equal(studio.exports.parse(source)[1].body, "Unchanged.");
}
assert.equal(studio.exports.parse(studio.exports.serialize([{ title: "New note", body: insertedLink.body }]))[0].body, insertedLink.body);
const image = "![Screenshot | full=/media/full.png](/media/thumb.webp)";
for (const [action, tag] of [["heading1", "h3"], ["heading", "h4"], ["subheading", "h5"], ["list", "p"], ["quote", "blockquote"]]) {
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
for (const [body, expected] of [
  ["**bold** and *italic*", ["<strong>bold</strong>", "<em>italic</em>"]],
  ["***both***", ["<strong><em>both</em></strong>"]],
  ["**bold *nested* text**", ["<strong>bold <em>nested</em> text</strong>"]],
  ["*italic **nested** text*", ["<em>italic <strong>nested</strong> text</em>"]],
  ["`**literal**`", ["<code>**literal**</code>"]],
  ["``a`b``", ["<code>a`b</code>"]],
  ["**bold `**literal**` end**", ["<strong>bold <code>**literal**</code> end</strong>"]],
  ["`path\\`", ["<code>path\\</code>"]],
  ["[**Label**](https://example.test)", ['href="https://example.test/"', '<strong>Label</strong>', 'rel="noopener noreferrer"']],
  ["[bad](javascript:alert(1)) <img src=x onerror=alert(1)>", ["[bad](javascript:alert(1))", "&lt;img"]],
  ["- **Bullet**\n> *Quote*\n## **Heading**", ["<strong>Bullet</strong>", "<em>Quote</em>", "<strong>Heading</strong>"]]
]) {
  staticContext.body = body;
  for (const html of [renderToStaticMarkup(createElement(react.exports.RecordBody, { body })), vm.runInContext("markdownBody(body)", staticContext)]) {
    for (const snippet of expected) assert.ok(html.includes(snippet), `${JSON.stringify(body)} renders ${snippet}`);
    assert.ok(!html.includes('href="javascript:'));
    assert.ok(!html.includes("<img src=x"));
  }
}
staticContext.window = {};
staticContext.body = "**Fallback** <script>";
assert.equal(vm.runInContext("markdownBody(body)", staticContext).includes("**Fallback** &lt;script&gt;"), true, "Missing optional helper preserves escaped readable text");
for (const text of ["[".repeat(32000), "*".repeat(32000), "\\*".repeat(16000), "**word** ".repeat(4000), "x".repeat(100000)]) {
  assert.doesNotThrow(() => noteInline.tokenizeNoteInline(text));
}
console.log("Note formatting tests passed: block/inline toggles, selection, safe links, nested styles, code literals, media/serialization preservation and React/static parity.");
