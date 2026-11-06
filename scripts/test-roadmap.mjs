import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import vm from "node:vm";
import ts from "typescript";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { validateRoadmap, loadRoadmap, buildRoadmapHistory, releaseDateLabel } from "../public/roadmap.mjs";

const require = createRequire(import.meta.url);
const read = (file) => readFileSync(new URL(`../${file}`, import.meta.url), "utf8");
const publicRoadmap = validateRoadmap(JSON.parse(read("public/data/roadmap.json")));
function functions(names) {
  const ast = ts.createSourceFile("static-app.js", read("static-app.js"), ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
  return names.map((name) => {
    const node = ast.statements.find((node) => ts.isFunctionDeclaration(node) && node.name?.text === name);
    assert.ok(node, `Missing ${name}`);
    return node.getText(ast);
  }).join("\n");
}
assert.deepEqual(publicRoadmap.groups.map((group) => group.id), ["working", "ideas", "done"]);
assert.ok(publicRoadmap.groups.every((group) => Array.isArray(group.items)), "Working chapters may be empty after completed work is filed");
assert.ok(publicRoadmap.groups.filter((group) => group.id !== "done").every((group) => group.items.length <= 12), "Current work stays bounded; filed history can grow");
assert.ok(publicRoadmap.groups.find((group) => group.id === "done").items.length >= 6, "Start with real earlier milestones");
const publicText = JSON.stringify(publicRoadmap);
assert.ok(!/(?:[A-Z]:[\\/]+Users[\\/]|STEAM_API_KEY|STEAM_ID|\.env|github_pat_|ghp_|-----BEGIN|https?:\/\/)/i.test(publicText), "Curated public copy contains no local/config/credential references or remote links");
await loadRoadmap("/data/roadmap.json", async (url, options) => { assert.equal(url, "/data/roadmap.json"); assert.equal(options.cache, "no-cache"); return Response.json(publicRoadmap); });
assert.ok(!/https?:|docs\//.test(read("public/roadmap.mjs")), "Loader only reads the curated same-site JSON, never internal documents or external services");
const sourceBefore = JSON.stringify(publicRoadmap);
const history = buildRoadmapHistory(publicRoadmap);
assert.equal(history.length, new Set(publicRoadmap.groups.find((group) => group.id === "done").items.map((item) => item.version || "Unversioned")).size);
assert.equal(new Set(history.map((release) => release.version)).size, history.length);
assert.deepEqual(history.flatMap((release) => release.items), publicRoadmap.groups.find((group) => group.id === "done").items, "Every filed item stays in its release/order, exactly once");
const groupedFixture = buildRoadmapHistory({ ...publicRoadmap, groups: [{ id: "done", title: "Filed", items: [
  { title: "First", detail: "A", version: "v2.0.0" }, { title: "Second", detail: "B", version: "v1.0.0" }, { title: "Third", detail: "C", version: "v2.0.0" }
] }] });
assert.deepEqual(groupedFixture.map((release) => release.items.map((item) => item.title)), [["First", "Third"], ["Second"]], "One release is not split across arbitrary pages");
assert.equal(JSON.stringify(publicRoadmap), sourceBefore, "Building history does not modify public copy");
assert.deepEqual(buildRoadmapHistory({ ...publicRoadmap, groups: [] }), []);
assert.deepEqual(buildRoadmapHistory({ ...publicRoadmap, groups: [{ id: "working", title: "Empty", items: [] }] }), []);
const unversioned = buildRoadmapHistory({ ...publicRoadmap, groups: [{ id: "done", title: "Filed", items: [{ title: "No date", detail: "No invented version" }] }] });
assert.equal(unversioned[0].version, "Unversioned");
const extendedHistory = {
  ...publicRoadmap,
  groups: publicRoadmap.groups.map((group) => group.id === "done" ? {
    ...group,
    items: Array.from({ length: 30 }, (_, index) => ({
      title: `Milestone ${index + 1}`, detail: "Completed work", version: `v2.${14 - Math.floor(index / 2)}.0`, releasedOn: `2026-11-${String(15 - Math.floor(index / 2)).padStart(2, "0")}`
    }))
  } : group)
};
const extendedReleases = buildRoadmapHistory(extendedHistory);
assert.equal(extendedReleases.length, 15, "History retains releases beyond the former twelve-item cap");
assert.ok(extendedReleases.every((release) => release.items.length === 2));
assert.deepEqual(extendedReleases.flatMap((release) => release.items), extendedHistory.groups.find((group) => group.id === "done").items);

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
  getAttribute(key) { return this.attributes.get(key) ?? null; }
  closest(selector) { return this.ownerSelector === selector || (selector === "[inert], [hidden]" && this.inert) ? this : null; }
  append(node) { node.parent = this; this.children.push(node); }
  remove() { this.parent.children = this.parent.children.filter((node) => node !== this); this.isConnected = false; }
  querySelector(selector) { this.lastSelector = selector; return this.body ??= new Element("div"); }
  addEventListener(name, callback) { this.listeners.set(name, callback); }
  showModal() { this.open = true; this.shows++; }
  close() { this.open = false; }
  focus() { this.focused = true; }
  getClientRects() { return this.hidden ? [] : [{}]; }
}
const body = new Element("body");
const trigger = new Element("button");
const document = { baseURI: "https://fixture.invalid/Gestalt/", body, activeElement: trigger, createElement: (tag) => new Element(tag), getElementById: (id) => body.children.find((node) => node.id === id), querySelectorAll: () => [trigger] };
let requested = 0;
let resolveModule;
let rejectModule;
let shellRenders = 0;
const deadlines = new Map(); let deadlineId = 0;
const setDeadline = (callback, delay) => { assert.equal(delay, 12000); deadlines.set(++deadlineId, callback); return deadlineId; };
const clearDeadline = (id) => deadlines.delete(id);
const context = vm.createContext({ URL, document, HTMLElement: Element, Element, state: {}, roadmapData: null, roadmapLoadPromise: null, roadmapFailed: false, roadmapTrigger: null, roadmapChapterId: "working", roadmapReleaseIndex: null, buildRoadmapHistory: null,
  setTimeout: setDeadline, clearTimeout: clearDeadline,
  readableDate: releaseDateLabel,
  recordMotionController: { busy: false },
  stopRecordAccessSequence() {}, render() { shellRenders++; context.syncRoadmapDialog(); },
  syncRoadmapWindow() { context.syncRoadmapDialog(); return true; }, syncRecordWindowChrome() {},
  loadFixture() { requested++; return new Promise((resolve, reject) => { resolveModule = resolve; rejectModule = reject; }); }
});
vm.runInContext(functions(["loadPublicRoadmap", "refreshPublicRoadmap", "openRoadmap", "closeRoadmap", "renderRoadmapContent", "navigateRoadmap", "syncRoadmapDialog", "escapeHtml"])
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
resolveModule({ loadRoadmap: async () => publicRoadmap, buildRoadmapHistory });
await sameLoad;
assert.equal(body.children.length, 0, "Late completion cannot reopen a dismissed note");
context.openRoadmap();
await Promise.resolve();
const ready = body.children[0];
assert.equal(requested, 1, "Reopening uses the module already loaded for this page");
assert.ok(ready.querySelector().innerHTML.includes("On the desk"));
const filedTitle = publicRoadmap.groups.find((group) => group.id === "done").items[0].title;
assert.ok(!ready.querySelector().innerHTML.includes(`<s>${filedTitle}</s>`), "Current work does not mount hidden history");
assert.ok(!ready.querySelector().innerHTML.includes("Older update"), "Current work has no misleading history arrows");
const windowBar = new Element("header"); windowBar.ownerSelector = ".roadmap-note";
ready.listeners.get("focusin")({ target: windowBar });
assert.ok(!ready.attributes.has("data-notebook-settled"), "Initial close/header focus must not skip opening");
const readingControl = new Element("button"); readingControl.ownerSelector = ".roadmap-body";
ready.listeners.get("focusin")({ target: readingControl });
assert.ok(ready.attributes.has("data-notebook-settled"), "Focusing the reader settles immediately");
ready.listeners.get("focusin")({ target: windowBar });
assert.ok(ready.attributes.has("data-notebook-settled"), "Leaving the reader cannot clear settled state");
ready.listeners.get("pointerdown")({ target: windowBar });
assert.ok(ready.attributes.has("data-notebook-settled"), "Clicking the bar settles once rather than reattaching construction");
ready.attributes.delete("data-notebook-settled");
ready.listeners.get("animationend")({ animationName: "unrelated-animation" });
assert.ok(!ready.attributes.has("data-notebook-settled"));
ready.listeners.get("animationend")({ animationName: "notebook-register-edges" });
assert.ok(ready.attributes.has("data-notebook-settled"), "Static natural completion retires opening styles once");
const rendersBeforeTurn = shellRenders;
context.navigateRoadmap("done");
assert.match(ready.querySelector().innerHTML, /notebook-release-index/);
assert.ok(!ready.querySelector().innerHTML.includes("Older update"), "The index is not a paginated chapter list");
context.navigateRoadmap("done", 0);
assert.ok(ready.querySelector().innerHTML.includes(`<s>${filedTitle}</s>`), "Filed milestones retain their completion mark");
assert.equal(context.roadmapChapterId, "done");
assert.equal(context.roadmapReleaseIndex, 0);
assert.equal(shellRenders, rendersBeforeTurn, "History navigation updates the notebook only, not the dashboard");
assert.equal(ready.shows, 1, "Turning a page does not reopen the modal");
assert.ok(ready.attributes.has("data-notebook-ready"), "Opening is attached to the stable dialog, not remounted leaves");
assert.ok(ready.attributes.has("data-notebook-settled"), "History navigation cannot replay opening");
const leafWrites = ready.querySelector().writes;
for (const index of [0, -1, 99, NaN, 1.5, "1"]) context.navigateRoadmap("done", index);
context.navigateRoadmap("working", 0);
context.navigateRoadmap('bad"] [onclick="bad');
assert.equal(ready.querySelector().writes, leafWrites, "Same-page and invalid requests do not rebuild a leaf");
context.navigateRoadmap("done", history.length - 1);
assert.match(ready.querySelector().innerHTML, /Older update[^>]+disabled/);
context.navigateRoadmap("done");
assert.equal(ready.lastSelector, `[data-notebook-release="${history.length - 1}"]`, "Returning to the index focuses the update that was just read");
context.navigateRoadmap("ideas");
assert.ok(!ready.querySelector().innerHTML.includes("Older update"));
assert.equal(context.roadmapReleaseIndex, null, "Chapter changes leave release history");
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
assert.equal(context.roadmapChapterId, "working", "Each new visit starts with current work");
assert.equal(context.roadmapReleaseIndex, null);
const failedLoad = context.refreshPublicRoadmap();
rejectModule(new Error("Sensitive provider-looking error must not be displayed"));
await failedLoad;
assert.ok(body.children[0].querySelector().innerHTML.includes("Work note unavailable"));
assert.ok(!body.children[0].querySelector().innerHTML.includes("Sensitive"));
const retry = context.refreshPublicRoadmap();
resolveModule({ loadRoadmap: async () => publicRoadmap, buildRoadmapHistory });
await retry;
assert.ok(body.children[0].querySelector().innerHTML.includes("On the desk"));
let cancelled = 0;
body.children[0].listeners.get("cancel")({ preventDefault() { cancelled++; } });
assert.equal(cancelled, 1);
assert.equal(body.children.length, 0, "Escape/cancel dismisses the modal");

const menu = new Element("button");
const hiddenSearch = new Element("button");
hiddenSearch.hidden = true;
document.activeElement = trigger;
document.querySelectorAll = (selector) => {
  assert.equal(selector, "[data-search-toggle], .archive-menu-toggle", "Use the real handheld menu selector for focus recovery");
  return [hiddenSearch, menu];
};
context.openRoadmap();
trigger.inert = true;
context.closeRoadmap();
assert.equal(menu.focused, true, "Closing skips an inert trigger and a hidden search control after a viewport change");
trigger.inert = false;
document.activeElement = trigger;

context.roadmapData = null;
context.openRoadmap();
const stalled = context.refreshPublicRoadmap();
assert.equal(deadlines.size, 1);
[...deadlines.values()][0]();
await stalled;
assert.match(body.children[0].querySelector().innerHTML, /Work note unavailable/);
let lateFetch = false;
resolveModule({ loadRoadmap: async () => { lateFetch = true; return publicRoadmap; }, buildRoadmapHistory });
await Promise.resolve(); await Promise.resolve();
assert.equal(lateFetch, false, "An expired module request cannot start another fetch or overwrite a retry");
const afterTimeout = context.refreshPublicRoadmap();
resolveModule({ loadRoadmap: async () => publicRoadmap, buildRoadmapHistory });
await afterTimeout;
assert.ok(body.children[0].querySelector().innerHTML.includes("On the desk"));
context.closeRoadmap();
assert.equal(deadlines.size, 0, "Settled retrievals leave no timeout running");
assert.equal(shellRenders, 0, "Normal opening, closing, retries and chapter changes never rebuild the shell");

let stateData = publicRoadmap;
let stateIndex = 0;
let stateLocation = { chapterId: "working", releaseIndex: null };
let refIndex = 0;
const effects = [];
const reactDialog = new Element("dialog");
const react = vm.createContext({ exports: {}, window: { setTimeout: setDeadline, clearTimeout: clearDeadline }, process: { env: { NODE_ENV: "production" } }, document, HTMLElement: Element, Element, require(name) {
  if (name === "next/dynamic") return () => () => null;
  if (name === "@/public/roadmap.mjs") return { buildRoadmapHistory, releaseDateLabel };
  if (name === "react") return { useRef: () => ({ current: refIndex++ === 0 ? reactDialog : null }), useState: () => [[stateData, false, 0, buildRoadmapHistory(stateData), stateLocation, null][stateIndex++], () => {}], useEffect: (callback) => effects.push(callback) };
  if (name === "react-dom") return { createPortal: (element, target) => { assert.equal(target, body); return element; } };
  return require(name);
} });
vm.runInContext(ts.transpileModule(read("components/archive/roadmap-window.tsx"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX }
}).outputText, react);
const malicious = { ...publicRoadmap, title: '<script>alert("x")</script>', groups: [{ id: 'ideas" onclick="bad()', title: "<img>", items: [{ title: "<iframe>", detail: "<script>", version: '<img src="x">' }] }, { id: "done", title: "Filed", items: [{ title: "<iframe>", detail: "<script>", version: '<img src="x">' }] }] };
for (const data of [publicRoadmap, extendedHistory, malicious]) {
  stateData = data;
  const releases = buildRoadmapHistory(data);
  const views = [...data.groups.map((group) => ({ chapterId: group.id, releaseIndex: null })), ...releases.map((_, index) => ({ chapterId: "done", releaseIndex: index }))];
  for (const view of views) {
    stateIndex = 0;
    refIndex = 0;
    stateLocation = view;
    const chapter = data.groups.find((group) => group.id === view.chapterId);
    const release = view.chapterId === "done" && view.releaseIndex !== null ? releases[view.releaseIndex] : null;
    const indexOpen = view.chapterId === "done" && !release;
    const outputs = [context.renderRoadmapContent(data, view.chapterId, view.releaseIndex), renderToStaticMarkup(createElement(react.exports.RoadmapWindow, { onClose() {} }))];
    for (const html of outputs) {
      assert.equal((html.match(/class="roadmap-group"/g) || []).length, indexOpen ? 0 : 1);
      assert.equal((html.match(/class="roadmap-mark"/g) || []).length, indexOpen ? 0 : (release?.items || chapter.items).length);
      assert.ok(!html.includes("<script>") && !html.includes("<iframe>") && !html.includes('<img src="x">'));
      assert.ok(!html.includes('data-roadmap-state="ideas" onclick="bad()"'));
      assert.equal((html.match(/<s>/g) || []).length, indexOpen ? 0 : release?.items.length ?? chapter.items.filter((item) => item.completed).length);
      assert.equal(html.includes('aria-label="Newer update"'), Boolean(release));
      assert.equal(html.includes('aria-label="Older update"'), Boolean(release));
      assert.equal(html.includes('aria-label="Back to update index"'), Boolean(release));
      assert.equal(html.includes('aria-label="Filed updates"'), indexOpen);
      if (indexOpen) assert.equal((html.match(/data-notebook-release="\d+"/g) || []).length, releases.length, "Every release remains reachable from both renderers");
      if (release?.releasedOn) assert.ok(html.includes(releaseDateLabel(release.releasedOn)), "Both readers display an explicitly authored release date");
    }
  }
}
const cleanupFocus = effects[1]();
assert.equal(reactDialog.open, true);
cleanupFocus();
assert.equal(reactDialog.open, false);
assert.equal(trigger.focused, true);
stateIndex = 0; refIndex = 0;
const reactHandlers = react.exports.RoadmapWindow({ onClose() {} }).props;
reactHandlers.onFocusCapture({ target: windowBar });
assert.ok(!reactDialog.attributes.has("data-notebook-settled"));
reactHandlers.onFocusCapture({ target: readingControl });
reactHandlers.onFocusCapture({ target: windowBar });
assert.ok(reactDialog.attributes.has("data-notebook-settled"), "React focus changes also retain settled state");
reactDialog.attributes.delete("data-notebook-settled");
reactHandlers.onAnimationEnd({ animationName: "unrelated-animation" });
assert.ok(!reactDialog.attributes.has("data-notebook-settled"));
reactHandlers.onAnimationEnd({ animationName: "notebook-register-edges" });
assert.ok(reactDialog.attributes.has("data-notebook-settled"), "Natural completion releases the finite opening styles");
reactDialog.attributes.delete("data-notebook-settled");
reactHandlers.onPointerDownCapture({ target: windowBar });
assert.ok(reactDialog.attributes.has("data-notebook-settled"), "React header interaction does not rearm the animation");
const source = read("static-app.js");
assert.match(source, /result\.action === "roadmap"\s*\? "data-open-roadmap"/);
assert.match(source, /state\.panelOpen \|\| state\.timelineOpen \|\| state\.roadmapOpen/);
assert.match(read("components/archive-os.tsx"), /panelOpen \|\| timelineOpen \|\| roadmapOpen/);
assert.ok(!read("index.html").includes('src="public/roadmap.mjs'), "Static roadmap data is not a landing-page script");
assert.ok(read("lib/publish-paths.mjs").includes('"public/roadmap.mjs"'));
assert.ok(read("scripts/prepare-pages.mjs").includes('"public/roadmap.mjs"'));
assert.ok(read("components/archive/roadmap-window.tsx").includes('[data-search-toggle], .archive-menu-toggle'));
assert.match(read("app/globals.css"), /html:has\(body > \.roadmap-dialog\[open\]\),\s*body:has\(> \.roadmap-dialog\[open\]\)\s*\{ overflow: hidden; \}/);
for (const name of ["prev", "next", "index"]) {
  const icon = read(`public/images/ui/notebook-${name}.svg`);
  assert.match(icon, /lucide-(?:arrow-|list)/);
  assert.ok(!/script|foreignObject|\bon\w+=|https?:\/\/(?!www\.w3\.org)/.test(icon));
}
const css = read("app/globals.css");
assert.match(css, /\.roadmap-group h3 s \{[^}]*text-decoration-color: currentColor; text-decoration-thickness: 2px;/, "Completion lines stay visible in both theme text colors");
assert.match(read("app/studio/notebook.css"), /\[data-completed\] \.notebook-title-input \{[^}]*text-decoration-color: currentColor; text-decoration-thickness: 2px;/, "Editing retains the same completion line");
assert.match(read("components/archive/roadmap-window.tsx"), /className="window-control-group">\s*\{process\.env/, "Notebook editing shares the right-hand window-control group");
assert.match(read("components/archive/roadmap-window.tsx"), /className="window-title-group"><span>\/\/ FIELD NOTEBOOK<\/span><\/div>/, "The title remains separate from editing controls");
const scopedCss = css.slice(css.indexOf(".roadmap-dialog {"), css.indexOf("\n.window-bar {", css.indexOf(".roadmap-dialog {")));
assert.ok(scopedCss.includes("minmax(0, 1fr)"));
assert.ok(!/infinite|filter:|will-change:/.test(scopedCss), "Opening leaves no perpetual animation/filter/layer workload");
assert.ok(!scopedCss.includes("notebook-unseal") && !scopedCss.includes("clip-path") && !scopedCss.includes("focus-within"), "No opaque body wipe or transient focus-based animation toggle remains");
assert.match(scopedCss, /data-notebook-ready\]:not\(\[data-notebook-settled\]\)/);
assert.match(scopedCss, /animation: notebook-ink-arrive 420ms/);
assert.ok(scopedCss.includes("@keyframes notebook-register-edges") && scopedCss.includes("@keyframes notebook-register-spine"));
assert.match(scopedCss, /prefers-reduced-motion: reduce/);
assert.ok(!/setInterval|requestAnimationFrame/.test(read("components/archive/roadmap-window.tsx")), "No motion loop");
assert.match(read("components/archive/roadmap-window.tsx"), /window\.setTimeout\([^\n]*12000\)/, "Only a finite retrieval deadline is added");
assert.match(read("components/archive/roadmap-window.tsx"), /window\.clearTimeout\(deadline\)/);
assert.ok(!source.includes("buildRoadmapPages") && !source.includes("turnRoadmapPage"), "The superseded mixed chapter/page path is removed");
console.log("Public notebook checks passed: independent chapters/release index, grouped history, safe renderer parity, cached modal lifecycle, focus restoration, finite reduced-motion-aware opening and publish boundaries.");
