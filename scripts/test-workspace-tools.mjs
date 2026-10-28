import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import vm from "node:vm";
import ts from "typescript";
import { renderToStaticMarkup } from "react-dom/server";
import tools from "../public/workspace-tools.js";

const read = (file) => readFileSync(new URL(`../${file}`, import.meta.url), "utf8");
const query = 'Gestalt & games / 日本語? #1 <script>';
for (const engine of tools.engines) {
  const url = new URL(tools.searchUrl(engine.id, query));
  assert.equal(url.origin, new URL(engine.url).origin);
  assert.equal(url.searchParams.get(engine.parameter), query);
  assert.equal([...url.searchParams].length, 1);
}
for (const query of ["", "  ", null, {}, "a".repeat(1001)]) assert.equal(tools.searchUrl("google", query), null);
assert.equal(new URL(tools.searchUrl("javascript:evil", "test")).origin, "https://duckduckgo.com");
const document = { hidden: false, querySelector: () => null };
const event = { key: "s", target: { closest: () => null } };
assert.equal(tools.shouldOpenSearch(event, { ready: true, busy: false }, document), true);
assert.equal(tools.shouldOpenSearch({ ...event, key: "S" }, { ready: true, busy: false }, document), true);
for (const flag of ["defaultPrevented", "repeat", "isComposing", "ctrlKey", "metaKey", "altKey", "shiftKey"]) assert.equal(tools.shouldOpenSearch({ ...event, [flag]: true }, { ready: true }, document), false);
for (const state of [{ ready: false }, { ready: true, busy: true }]) assert.equal(tools.shouldOpenSearch(event, state, document), false);
assert.equal(tools.shouldOpenSearch(event, { ready: true }, { ...document, hidden: true }), false);
assert.equal(tools.shouldOpenSearch(event, { ready: true }, { ...document, querySelector: () => ({}) }), false, "Dialogs and the open Terminal block the shortcut");
assert.equal(tools.shouldOpenSearch({ ...event, target: { closest: () => ({}) } }, { ready: true }, document), false, "Inputs, editable text, selects, buttons and links are protected");
const connections = tools.renderConnections();
assert.match(connections, /https:\/\/x\.com\/Eitomausu/);
assert.match(connections, /rel="noopener noreferrer"/);
assert.match(connections, /referrerpolicy="no-referrer"/);
assert.match(connections, /href="https:\/\/www\.reddit\.com\/user\/youhen\/" target="_blank" rel="noopener noreferrer" referrerpolicy="no-referrer"><b>Reddit<\/b><span>u\/youhen<\/span>/);
assert.ok(!connections.includes("Not connected") && !connections.includes("iframe"), "Both supplied public profiles are active links, not embeds");
assert.match(connections, /class="connections-acquire" aria-hidden="true"/, "Decorative acquisition sequence is excluded from the accessibility tree");
assert.match(connections, /class="connections-identity"/, "Identity resolves independently of the always-available close control");
const css = read("app/globals.css");
assert.ok(!css.includes("connections-retrieve"), "The previous plain wipe is replaced, not layered underneath");
for (const name of ["connections-outline", "connections-register-scan", "connections-acquire", "connections-signal", "connections-channel"]) {
  assert.ok(css.includes(`@keyframes ${name}`));
  assert.ok(!new RegExp(`animation:[^;]*${name}[^;]*infinite`).test(css), "Connections has no looping animation");
}
assert.match(css, /@media \(prefers-reduced-motion: reduce\)\s*\{\s*\.connections-sheet::before, \.connections-sheet::after, \.connections-acquire \{ display: none; animation: none; \}/);
assert.match(css, /\.connections-sheet \.connection-register:focus-within > \*/, "Keyboard access never waits for hidden links");
for (const name of ["web-search-surface", "web-search-frame", "web-search-query-line", "web-search-field"]) {
  assert.ok(css.includes(`@keyframes ${name}`));
  assert.ok(!new RegExp(`animation:[^;]*${name}[^;]*infinite`).test(css), "Search has no looping animation");
}
assert.match(css, /\.web-search-dialog\[data-search-ready\].*animation: none;/, "Interaction settles the reveal without waiting");
assert.match(css, /@media \(prefers-reduced-motion: reduce\)\s*\{\s*\.web-search-form, \.web-search-heading, \.web-search-row > \* \{ animation: none; \}/);
assert.match(css, /@keyframes web-search-surface \{ 0%, 30% \{ opacity: 0; clip-path: inset\(50% 0\); \}/, "The actual surface stays absent while the frame begins forming");
assert.ok(!css.includes("web-search-arrive"), "The old simultaneous whole-window fade is removed");

class Element {
  listeners = new Map(); children = []; open = false; isConnected = true; value = "";
  attributes = new Map();
  constructor(tag) { this.tag = tag; }
  setAttribute(name, value) { this.attributes.set(name, value); } removeAttribute(name) { this.attributes.delete(name); } closest() { return null; } getClientRects() { return [{}]; }
  focus() { this.focused = true; }
  set innerHTML(html) {
    this.html = html;
    if (html.includes("connections-sheet")) { this.parts = { a: new Element("a"), "[data-web-close]": new Element("button") }; return; }
    this.parts = { select: new Element("select"), input: new Element("input"), form: new Element("form"), ".web-search-error": { hidden: true } };
    this.parts.select.value = html.match(/value="([^"]+)" selected/)[1];
  }
  querySelector(selector) { return this.parts?.[selector] ?? null; }
  append(node) { node.parent = this; this.children.push(node); }
  remove() { this.parent.children = this.parent.children.filter((item) => item !== this); this.isConnected = false; }
  addEventListener(name, handler) { this.listeners.set(name, handler); }
  showModal() { this.open = true; } close() { this.open = false; }
}
const body = new Element("body"), trigger = new Element("button"), shell = new Element("main");
const storage = new Map(), destinations = []; let writes = 0, closed = 0, sameTabNavigations = 0;
const doc = { body, activeElement: trigger, createElement: (tag) => new Element(tag), querySelector: (selector) => selector === ".archive-shell" ? shell : null, querySelectorAll: () => [trigger] };
const host = { document: doc, open: (...args) => destinations.push(args), location: { assign() { sameTabNavigations++; } }, localStorage: { getItem: (key) => storage.get(key), setItem(key, value) { writes++; storage.set(key, value); } } };
const controller = tools.createController(host);
const events = (target) => ({ target, currentTarget: target, preventDefault() {}, stopPropagation() {} });
controller.open({ remember: false, onClose: () => closed++ });
const dialog = body.children[0];
assert.equal(dialog.parent, body); assert.equal(dialog.open, true); assert.equal(dialog.parts.input.focused, true);
assert.ok(!/<button\b|<svg\b|data-web-close/.test(dialog.html), "Search has no redundant close or submit buttons");
assert.equal((dialog.html.match(/<input\b/g) ?? []).length, 1, "One search input allows native implicit form submission with Enter");
assert.match(dialog.html, /class="web-search-access" aria-hidden="true"/, "Frame construction is separate from the real form surface");
controller.open(); assert.equal(body.children.length, 1, "Only one web search exists");
dialog.parts.select.value = "google"; dialog.parts.select.listeners.get("change")();
assert.equal(writes, 0, "No preference writes without local-memory consent");
assert.equal(destinations.length, 0, "Opening, typing and engine selection never send requests");
dialog.listeners.get("input")();
assert.equal(dialog.attributes.get("data-search-ready"), "", "Typing finishes the decorative reveal immediately");
assert.equal(destinations.length, 0, "Finishing a reveal does not submit the query");
dialog.parts.form.listeners.get("submit")(events(dialog)); assert.equal(destinations.length, 0);
dialog.parts.input.value = query;
dialog.parts.form.listeners.get("submit")(events(dialog));
assert.equal(new URL(destinations[0][0]).searchParams.get("q"), query);
assert.deepEqual(destinations[0].slice(1), ["_blank", "noopener,noreferrer"], "Results open separately without opener or referrer access");
assert.equal(sameTabNavigations, 0, "Gestalt is never replaced by search results");
assert.equal(body.children.length, 1, "Gestalt's search and query remain available when returning from the new tab");
assert.equal(destinations.length, 1, "Form submission navigates once without requiring a submit button");
dialog.listeners.get("cancel")(events(dialog));
assert.equal(closed, 1); assert.equal(body.children.length, 0); assert.equal(trigger.focused, true);
controller.open({ remember: true, onClose: () => closed++ });
const remembered = body.children[0];
assert.equal(remembered.attributes.has("data-search-ready"), false, "Each new search gets a fresh opening sequence");
remembered.listeners.get("pointerdown")();
assert.equal(remembered.attributes.get("data-search-ready"), "", "Pointer interaction also settles the reveal");
remembered.parts.select.value = "yandex"; remembered.parts.select.listeners.get("change")();
assert.equal(writes, 1); assert.equal(storage.get("gestalt.web-search-engine"), "yandex");
remembered.listeners.get("click")(events(remembered));
assert.equal(closed, 2); assert.equal(body.children.length, 0);
controller.open({ remember: true }); assert.equal(body.children[0].parts.select.value, "yandex");
const keyboardDialog = body.children[0];
keyboardDialog.listeners.get("keydown")({ ...events(keyboardDialog), key: "Tab" });
assert.equal(keyboardDialog.attributes.get("data-search-ready"), "", "Keyboard navigation cannot land in an invisible opening form");
controller.destroy(); assert.equal(body.children.length, 0); assert.equal(closed, 2);
host.open = () => { throw new Error("Navigation refused"); };
host.localStorage = { getItem() { throw new Error("Storage blocked"); }, setItem() { throw new Error("Storage blocked"); } };
controller.open({ remember: true, onClose: () => closed++ });
const failedNavigation = body.children[0];
failedNavigation.parts.input.value = "Keep this query";
failedNavigation.parts.form.listeners.get("submit")(events(failedNavigation));
assert.equal(failedNavigation.parts[".web-search-error"].hidden, false);
assert.equal(failedNavigation.parts.input.value, "Keep this query");
failedNavigation.listeners.get("keydown")({ ...events(failedNavigation), key: "Escape", isComposing: true });
assert.equal(body.children.length, 1, "IME cancellation must not dismiss the search");
failedNavigation.listeners.get("keydown")({ ...events(failedNavigation), key: "Escape" });
assert.equal(body.children.length, 0, "Escape closes a populated search instead of merely clearing its input");
assert.equal(closed, 3);
let socialStorageReads = 0;
host.localStorage.getItem = () => { socialStorageReads++; return null; };
controller.open({ mode: "connections", remember: true, onClose: () => closed++ });
const contactSheet = body.children[0];
assert.equal(contactSheet.className, "connections-dialog");
assert.equal(contactSheet.listeners.has("input"), false, "The search reveal never changes Connections behavior");
assert.equal(contactSheet.parts["[data-web-close]"].focused, true, "Initial focus stays on the visible close control during acquisition");
assert.equal(contactSheet.querySelector("form"), null, "Connections is not a reused web-search form");
assert.equal(socialStorageReads, 0, "Opening public links does not inspect search preferences");
contactSheet.listeners.get("click")(events(contactSheet));
assert.equal(body.children.length, 0); assert.equal(closed, 4);
assert.ok(!/fetch\(|setInterval|setTimeout|requestAnimationFrame|eval\(/.test(read("public/workspace-tools.js")));

const require = createRequire(import.meta.url);
const source = read("components/archive/search-panel.tsx");
const ast = ts.createSourceFile("panel.tsx", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const declarations = ast.statements.filter(ts.isFunctionDeclaration).map((node) => node.getText(ast)).join("\n");
const context = vm.createContext({ exports: {}, require, cipherizeText: (text) => text });
vm.runInContext(ts.transpileModule(declarations, { compilerOptions: { jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText, context);
const html = renderToStaticMarkup(context.exports.SearchPanel({ results: [{ kind: "command", id: "cmd-connections", title: "Connections", detail: "External channels and social profiles", action: "connections" }], query: "", panelRef: { current: null } }));
assert.ok(!html.includes("Web search") && !html.includes("palette-utilities") && !html.includes("@Eitomausu"), "The palette contains only the command, not web search or social content");
assert.ok(html.includes("Connections") && html.includes('aria-haspopup="dialog"'));
for (const text of ["Connections", "@Eitomausu", "Reddit", "u/youhen"]) assert.ok(connections.includes(text));
for (const file of ["index.html", "scripts/prepare-pages.mjs", "lib/publish-paths.mjs", "scripts/static-cache.mjs"]) assert.ok(read(file).includes("workspace-tools"));
assert.ok(read("components/archive-os.tsx").includes("workspaceTools.shouldOpenSearch"));
assert.ok(read("static-app.js").includes("GestaltWorkspaceTools?.shouldOpenSearch"));
console.log("Workspace tools passed: encoded allowlisted redirects, no unsolicited requests, editing/modal shortcut guards, consent-only engine persistence, focus/dismissal, no duplicate dialogs, public profile links and reader/Pages packaging.");
