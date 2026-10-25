import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import vm from "node:vm";
import ts from "typescript";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { publicRoadmap } from "../public/roadmap.mjs";

const require = createRequire(import.meta.url);
const read = (file) => readFileSync(new URL(`../${file}`, import.meta.url), "utf8");
function functions(names) {
  const ast = ts.createSourceFile("static-app.js", read("static-app.js"), ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
  return names.map((name) => {
    const node = ast.statements.find((node) => ts.isFunctionDeclaration(node) && node.name?.text === name);
    assert.ok(node, `Missing ${name}`);
    return node.getText(ast);
  }).join("\n");
}
assert.deepEqual(publicRoadmap.groups.map((group) => group.id), ["working", "ideas", "done"]);
assert.ok(publicRoadmap.groups.every((group) => group.items.length > 0 && group.items.length <= 12));
assert.ok(publicRoadmap.groups.find((group) => group.id === "done").items.length >= 6, "Start with real earlier milestones");
const publicText = JSON.stringify(publicRoadmap);
assert.ok(!/(?:[A-Z]:[\\/]+Users[\\/]|STEAM_API_KEY|STEAM_ID|\.env|github_pat_|ghp_|-----BEGIN|https?:\/\/)/i.test(publicText), "Curated public copy contains no local/config/credential references or remote links");
assert.ok(!/\bimport\b|\bfetch\(/.test(read("public/roadmap.mjs")), "Public copy does not read internal documents or external services");

class Element {
  dataset = {};
  listeners = new Map();
  attributes = new Map();
  children = [];
  open = false;
  shows = 0;
  writes = 0;
  isConnected = true;
  constructor(tag) { this.tag = tag; }
  set innerHTML(value) { this.html = value; this.writes++; }
  get innerHTML() { return this.html; }
  setAttribute(key, value) { this.attributes.set(key, value); }
  append(node) { node.parent = this; this.children.push(node); }
  remove() { this.parent.children = this.parent.children.filter((node) => node !== this); this.isConnected = false; }
  querySelector() { return this.body ??= new Element("div"); }
  addEventListener(name, callback) { this.listeners.set(name, callback); }
  showModal() { this.open = true; this.shows++; }
  close() { this.open = false; }
  focus() { this.focused = true; }
  getClientRects() { return [{}]; }
}
const body = new Element("body");
const trigger = new Element("button");
const document = { body, activeElement: trigger, createElement: (tag) => new Element(tag), getElementById: (id) => body.children.find((node) => node.id === id), querySelectorAll: () => [trigger] };
let requested = 0;
let resolveModule;
let rejectModule;
const context = vm.createContext({ document, HTMLElement: Element, state: {}, roadmapData: null, roadmapLoadPromise: null, roadmapFailed: false, roadmapTrigger: null,
  stopRecordAccessSequence() {}, render() { context.syncRoadmapDialog(); },
  loadFixture() { requested++; return new Promise((resolve, reject) => { resolveModule = resolve; rejectModule = reject; }); }
});
vm.runInContext(functions(["loadPublicRoadmap", "refreshPublicRoadmap", "openRoadmap", "closeRoadmap", "renderRoadmapContent", "syncRoadmapDialog", "escapeHtml"])
  .replace(/import\("\.\/public\/roadmap\.mjs\?v=[^"]+"\)/, "loadFixture()"), context);
context.syncRoadmapDialog();
assert.equal(requested, 0, "Landing/closed state loads no roadmap module");
context.openRoadmap();
const first = body.children[0];
assert.equal(first.tag, "dialog");
assert.equal(first.parent, body, "The note is outside transformed/contained reader surfaces");
assert.equal(first.shows, 1);
assert.equal(requested, 1);
assert.ok(first.querySelector().innerHTML.includes("Retrieving work note"));
const sameLoad = context.refreshPublicRoadmap();
assert.equal(requested, 1, "Concurrent opens/retries share one module request");
context.closeRoadmap();
assert.equal(body.children.length, 0);
resolveModule({ publicRoadmap });
await sameLoad;
assert.equal(body.children.length, 0, "Late completion cannot reopen a dismissed note");
context.openRoadmap();
await Promise.resolve();
const ready = body.children[0];
assert.equal(requested, 1, "Reopening uses the module already loaded for this page");
assert.ok(ready.querySelector().innerHTML.includes("On the desk"));
const filedTitle = publicRoadmap.groups.find((group) => group.id === "done").items[0].title;
assert.ok(ready.querySelector().innerHTML.includes(`<s>${filedTitle}</s>`), "Filed milestones retain their completion mark as the curated roadmap changes");
const writes = ready.querySelector().writes;
context.syncRoadmapDialog();
assert.equal(ready.shows, 1);
assert.equal(ready.querySelector().writes, writes, "Unrelated shell renders preserve the open note and its scroll/content");
let stopped = 0;
ready.listeners.get("keydown")({ stopPropagation() { stopped++; } });
assert.equal(stopped, 1, "Modal keys cannot toggle the command palette behind it");
ready.listeners.get("click")({ target: ready, stopPropagation() { stopped++; } });
assert.equal(body.children.length, 0);
assert.equal(stopped, 2, "Outside click is consumed rather than passed to background controls");
assert.equal(trigger.focused, true);

context.roadmapData = null;
context.openRoadmap();
const failedLoad = context.refreshPublicRoadmap();
rejectModule(new Error("Sensitive provider-looking error must not be displayed"));
await failedLoad;
assert.ok(body.children[0].querySelector().innerHTML.includes("Work note unavailable"));
assert.ok(!body.children[0].querySelector().innerHTML.includes("Sensitive"));
const retry = context.refreshPublicRoadmap();
resolveModule({ publicRoadmap });
await retry;
assert.ok(body.children[0].querySelector().innerHTML.includes("On the desk"));
let cancelled = 0;
body.children[0].listeners.get("cancel")({ preventDefault() { cancelled++; } });
assert.equal(cancelled, 1);
assert.equal(body.children.length, 0, "Escape/cancel dismisses the modal");

const menu = new Element("button");
document.activeElement = body;
document.querySelectorAll = (selector) => {
  assert.equal(selector, "[data-search-toggle], .archive-menu-toggle", "Use the real handheld menu selector for focus recovery");
  return [{ getClientRects: () => [] }, menu];
};
context.openRoadmap();
context.closeRoadmap();
assert.equal(menu.focused, true, "Closing after palette removal returns focus to the visible handheld menu");
document.activeElement = trigger;

let stateData = publicRoadmap;
let stateIndex = 0;
const effects = [];
const reactDialog = new Element("dialog");
const react = vm.createContext({ exports: {}, document, HTMLElement: Element, require(name) {
  if (name === "react") return { useRef: () => ({ current: reactDialog }), useState: () => [[stateData, false, 0][stateIndex++], () => {}], useEffect: (callback) => effects.push(callback) };
  if (name === "react-dom") return { createPortal: (element, target) => { assert.equal(target, body); return element; } };
  return require(name);
} });
vm.runInContext(ts.transpileModule(read("components/archive/roadmap-window.tsx"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX }
}).outputText, react);
const malicious = { ...publicRoadmap, title: '<script>alert("x")</script>', groups: [{ id: 'ideas" onclick="bad()', title: "<img>", items: [{ title: "<iframe>", detail: "<script>", version: '<img src="x">' }] }] };
for (const data of [publicRoadmap, malicious]) {
  stateData = data;
  stateIndex = 0;
  const outputs = [context.renderRoadmapContent(data), renderToStaticMarkup(createElement(react.exports.RoadmapWindow, { onClose() {} }))];
  for (const html of outputs) {
    assert.equal((html.match(/class="roadmap-group"/g) || []).length, data.groups.length);
    assert.ok(!html.includes("<script>") && !html.includes("<iframe>") && !html.includes('<img src="x">'));
    assert.ok(!html.includes('data-roadmap-state="ideas" onclick="bad()"'));
    if (data === publicRoadmap) assert.equal((html.match(/<s>/g) || []).length, publicRoadmap.groups.find((group) => group.id === "done").items.length);
  }
}
const cleanupFocus = effects[0]();
assert.equal(reactDialog.open, true);
cleanupFocus();
assert.equal(reactDialog.open, false);
assert.equal(trigger.focused, true);
const source = read("static-app.js");
assert.match(source, /result\.action === "roadmap"\s*\? "data-open-roadmap"/);
assert.match(source, /state\.panelOpen \|\| state\.timelineOpen \|\| state\.roadmapOpen/);
assert.match(read("components/archive-os.tsx"), /panelOpen \|\| timelineOpen \|\| roadmapOpen/);
assert.ok(!read("index.html").includes('src="public/roadmap.mjs'), "Static roadmap data is not a landing-page script");
assert.ok(read("scripts/publish-site.mjs").includes('"public/roadmap.mjs"'));
assert.ok(read("scripts/prepare-pages.mjs").includes('"public/roadmap.mjs"'));
assert.ok(read("components/archive/roadmap-window.tsx").includes('[data-search-toggle], .archive-menu-toggle'));
assert.match(read("app/globals.css"), /html:has\(body > \.roadmap-dialog\[open\]\),\s*body:has\(> \.roadmap-dialog\[open\]\)\s*\{ overflow: hidden; \}/);
console.log("Public roadmap checks passed: curated data, safe renderer parity, lazy load/cache, modal lifecycle, close-before-load, retry and publish boundaries.");
