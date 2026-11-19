import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import vm from "node:vm";
import ts from "typescript";
import archiveSearch from "../public/archive-search.js";
import noteInline from "../public/note-inline.js";

function declaration(file, name) {
  const source = readFileSync(new URL(`../${file}`, import.meta.url), "utf8");
  const ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, file.endsWith(".ts") ? ts.ScriptKind.TS : ts.ScriptKind.JS);
  return ast.statements.find((node) => ts.isFunctionDeclaration(node) && node.name?.text === name).getText(ast).replace(/^export\s+/, "");
}
const firstId = "n-" + "a".repeat(32), secondId = "n-" + "b".repeat(32);
const note = (title, id) => `:::note ${title}${id ? ` {#${id}}` : ""}\nUnindexed prose.\n:::`;
const records = [
  { id: "game", section: "games", title: "A game", type: "Play Log", status: "Playing", updated: "2026-10-23", summary: "A unique world", body: note("21 / 10 / 2026 - A distant place", firstId), priority: 0 },
  { id: "log", section: "logs", title: "A field log", type: "Field Note", status: "Filed", updated: "2026-10-22", body: note("22 / 10 / 2026 - A distant place", secondId) + "\n" + note("A quiet evening"), priority: 1 },
  { id: "setup", section: "setup", title: "Desktop", type: "Setup", status: "Filed", updated: "2026-10-23", body: note("Hidden hardware", firstId) + "\n" + note("By the window", secondId), priority: 0 },
  { id: "plain", section: "logs", title: "Plain log", type: "Field Note", status: "Filed", updated: "2026-10-22", body: "One standalone body.", priority: 1 },
  { id: "duplicate", section: "games", title: "Ambiguous entry", type: "Play Log", status: "Playing", updated: "2026-10-23", body: note("First duplicate", firstId) + "\n" + note("Second duplicate", firstId), priority: 0 }
];
const original = JSON.stringify(records);
let parsed = 0;
const noteEntries = (body) => { parsed++; return noteInline.parseNotes(body); };
const setupNarrativeNotes = (record) => noteEntries(record.body).filter(({ title }) => title !== "Hidden hardware");
const react = vm.createContext({ records, noteEntries, setupNarrativeNotes, archiveSearch });
vm.runInContext(ts.transpileModule(declaration("components/archive/search-utils.ts", "getSearchResults"), { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText, react);
const pages = vm.createContext({ records: [...records], noteEntries, setupNarrativeNotes, window: { GestaltArchiveSearch: archiveSearch }, state: { searchQuery: "" }, currentGameRecord: () => records[0], latestLogRecord: () => records[1] });
vm.runInContext(declaration("static-app.js", "searchResults"), pages);
const keys = (items) => JSON.stringify(items.map((item) => [item.kind, item.id || item.record.id]));
for (const query of ["", "   ", "a", " g ", "s", "settings", "behaviour", "startup", "game", "distant", "quiet", "by the window", "hidden hardware", "current note", "duplicate", "unindexed prose", "no such entry"]) {
  pages.state.searchQuery = query;
  const a = react.getSearchResults(records, query, records[0], records[1]);
  const b = pages.searchResults();
  assert.equal(keys(a), keys(b), "React and Pages search remain in sync");
  if (!query.trim()) {
    assert.equal(parsed, 0, "Opening the palette uses the command list without indexing the archive");
    assert.equal(a.length, 5);
    assert.deepEqual(Array.from(a, (item) => item.id).slice(2), ["cmd-roadmap", "cmd-connections", "cmd-os-behaviour"], "Connections is a normal command directly below Roadmap and above Settings");
    assert.ok(a.every((item) => item.kind === "command"), "No unsolicited record cards in the default palette");
    assert.ok(a.some((item) => item.action === "behaviour" && item.title === "Settings"), "Settings is reachable without typing");
  } else if (query === "a") {
    assert.equal(a.length, 5);
    assert.ok(a.every((item) => item.kind !== "command" && /^a/i.test(item.title ?? item.record.title)), "One letter only matches the start of record and note titles, not shortcut text");
    assert.ok(a.some((item) => item.kind === "note"));
  } else if ([" g ", "s"].includes(query)) {
    assert.equal(a.length, 0, "One-letter searches ignore non-prefix title matches and metadata");
  } else if (["settings", "startup"].includes(query)) {
    assert.ok(a.some((item) => item.action === "behaviour"), "The normal Settings command and its description remain searchable");
  } else if (query === "quiet") {
    assert.equal(a[0].record.id, "log", "A legacy note without an ID is still discoverable through its parent");
  } else if (query === "distant") {
    assert.deepEqual(a.map(({ kind, record, noteId }) => [kind, record.id, noteId]), [["note", "log", secondId], ["note", "game", firstId]]);
    assert.equal(a[0].title, "A distant place");
    assert.equal(a[0].detail, "A field log \u00b7 22 / 10 / 2026");
  } else if (query === "by the window") {
    assert.equal(a[0].noteId, secondId, "Setup narrative notes are searchable");
    assert.equal(a[0].detail, "Desktop", "Undated notes don't claim to have a writing date");
  } else if (["hidden hardware", "current note", "duplicate", "unindexed prose"].includes(query)) {
    assert.equal(a.length, 0, "Don't index invisible notes, synthetic headings, ambiguous IDs, or note prose");
  }
}
assert.equal(parsed, records.length * 2, "Each reader indexes once per unchanged record collection");
assert.equal(JSON.stringify(records), original);
assert.ok(react.getSearchResults(records, "connections").some((item) => item.action === "connections"), "Connections remains searchable");
assert.equal(react.getSearchResults(records, "unique world")[0].record.id, "game", "Existing record summary matches are retained");
const saved = records.map((record) => record.id === "game" ? { ...record, body: note("A renamed note", firstId) } : record);
assert.equal(react.getSearchResults(saved, "a renamed note")[0].noteId, firstId, "An immutable save refreshes the index without changing the note identity");

Object.assign(pages, {
  escapeHtml: (value) => value.replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;").replaceAll(">", "&gt;"),
  renderCipherLetters: String, recordStateKey: () => "filed"
});
Object.assign(pages.state, { searchOpen: true, searchQuery: "distant" });
vm.runInContext(declaration("static-app.js", "searchPanel"), pages);
assert.match(pages.searchPanel(), new RegExp(`data-open-record="log" data-open-note-id="${secondId}"[^>]*>\\s*<span><strong>A distant place</strong><small>A field log . 22 / 10 / 2026</small></span>\\s*<i>NOTE</i>`));
assert.ok(pages.searchPanel().includes(`data-search-result="note:log:${secondId}"`), "The selected note can receive focus even after rebuilding the result list");
pages.state.searchQuery = "a";
assert.doesNotMatch(pages.searchPanel(), /palette-settings-button|<i>CMD<\/i>/, "No shortcut rows are rendered underneath Settings for a single-letter query");
pages.state.searchQuery = "";
assert.equal(pages.searchPanel().match(/class="palette-settings-button"/g)?.length, 1, "Clearing the input restores exactly one Settings button");

function findNode(file, predicate) {
  const source = readFileSync(new URL(`../${file}`, import.meta.url), "utf8");
  const ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, file.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.JS);
  function visit(node) {
    return predicate(node) ? node : ts.forEachChild(node, visit);
  }
  return { node: visit(ast), ast };
}
const handoff = findNode("components/archive-os.tsx", (node) => ts.isVariableDeclaration(node) && node.name.getText() === "updateSearchFromNavigation");
const staticHandoff = findNode("static-app.js", (node) => ts.isIfStatement(node) && node.expression.getText().includes("target.dataset.mobileNavSearchInput"));
assert.ok(handoff.node && staticHandoff.node);
const source = ts.transpileModule(`const update = ${handoff.node.initializer.getText(handoff.ast)};`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
for (const query of ["", "  ", "settings", "A field log"]) {
  const expectedOpen = query.trim().length > 0;
  const local = { query: "", searchOpen: false, navOpen: true };
  vm.runInNewContext(`${source}\nupdate(query);`, {
    query, setSearchQuery: (value) => { local.query = value; },
    setSearchOpen: (value) => { local.searchOpen = value; },
    setNavOpen: (value) => { local.navOpen = value; }
  });
  const state = { searchQuery: "", searchOpen: false, navOpen: true };
  vm.runInNewContext(staticHandoff.node.getText(staticHandoff.ast), { target: { dataset: { mobileNavSearchInput: "" }, value: query }, state, render() {} });
  assert.deepEqual(local, { query, searchOpen: expectedOpen, navOpen: !expectedOpen });
  assert.deepEqual(state, { searchQuery: query, searchOpen: expectedOpen, navOpen: !expectedOpen }, "Search results must not remain behind the mobile menu");
}

// Exercise palette-only DOM updates: dashboard/seasonal nodes must never be replaced.
let activePanel = null, generated = 0, focused = null, navUpdates = 0;
const searchState = { searchOpen: false, searchQuery: "" };
function panelFixture() {
  const input = { value: searchState.searchQuery, focus() { focused = this; document.activeElement = this; } };
  const suggestions = { childNodes: [++generated], replaceChildren(...children) { this.childNodes = children; } };
  const panel = {
    querySelector(selector) { return selector === "[data-search-input]" ? input : suggestions; },
    contains(node) { return node === input; }, remove() { activePanel = null; }
  };
  return panel;
}
const toggle = { active: false, getClientRects() { return [{}]; }, closest() { return null; }, focus() { focused = this; document.activeElement = this; } };
toggle.classList = { toggle(_, value) { toggle.active = value; } };
const header = { querySelector() { return activePanel; }, append(panel) { activePanel = panel; } };
let ambientPaused = false;
const shell = { toggleAttribute(name, value) { assert.equal(name, "data-search-open"); ambientPaused = value; } };
const document = {
  activeElement: toggle,
  querySelector(selector) {
    if (selector === ".archive-shell") return shell;
    assert.equal(selector, ".workspace-header", "Palette updates never traverse/rebuild the dashboard"); return header;
  },
  querySelectorAll() { return [toggle]; },
  createElement(tag) {
    assert.equal(tag, "template");
    return { set innerHTML(value) { assert.equal(value, "palette markup"); this.content = { querySelector: () => panelFixture() }; } };
  }
};
const paletteContext = vm.createContext({ document, state: searchState, searchPanel: () => "palette markup", syncDesktopNavigation() { navUpdates++; }, render() { assert.fail("Palette changes must not render the archive"); } });
vm.runInContext(declaration("static-app.js", "syncSearchPanel"), paletteContext);
searchState.searchOpen = true;
paletteContext.syncSearchPanel();
assert.equal(ambientPaused, true, "Palette opening suspends ambient work without replacing the dashboard");
const retainedPanel = activePanel, retainedInput = activePanel.querySelector("[data-search-input]");
assert.equal(focused, retainedInput); assert.equal(toggle.active, true);
searchState.searchQuery = "game";
paletteContext.syncSearchPanel();
assert.equal(activePanel, retainedPanel); assert.equal(focused, retainedInput);
assert.equal(retainedInput.value, "game");
assert.deepEqual(activePanel.querySelector(".search-suggestions").childNodes, [2]);
searchState.searchOpen = false;
paletteContext.syncSearchPanel();
assert.equal(activePanel, null); assert.equal(focused, toggle); assert.equal(toggle.active, false);
assert.equal(ambientPaused, false, "Closing resumes the existing animation phases");
assert.equal(navUpdates, 3, "The existing navigation controller observes palette state without losing its DOM");

const inputHandler = findNode("static-app.js", (node) => ts.isExpressionStatement(node) && ts.isCallExpression(node.expression) && node.expression.expression.getText() === "document.addEventListener" && node.expression.arguments[0]?.text === "input");
class SearchInput { dataset = { searchInput: "" }; value = "quiet"; }
Object.assign(paletteContext, { HTMLInputElement: SearchInput });
vm.runInContext(`const inputHandler = ${inputHandler.node.expression.arguments[1].getText(inputHandler.ast)}; inputHandler({ target: new HTMLInputElement() });`, paletteContext);
assert.equal(searchState.searchQuery, "quiet");
const require = createRequire(import.meta.url);
const css = createRequire(require.resolve("next/package.json"))("postcss").parse(readFileSync(new URL("../app/globals.css", import.meta.url), "utf8"));
const declarationValue = (selector, property) => css.nodes.find((node) => node.selector === selector)?.nodes.find((node) => node.prop === property)?.value;
assert.equal(declarationValue(".workspace > .workspace-header:has(> .command-panel)", "z-index"), "auto", "The open palette escapes the header's lower stacking context");
assert.equal(declarationValue(".workspace.has-record > .workspace-header:has(> .command-panel)", "opacity"), "1", "Parent opacity must not trap or dim the palette");
assert.equal(declarationValue(".workspace.has-record > .workspace-header:has(> .command-panel) > :not(.command-panel)", "opacity"), "0.44", "Background title and clock retain their existing focus dimming");
assert.ok(Number(declarationValue(".workspace-header > .command-panel", "z-index")) > Number(declarationValue(".record-window", "z-index")), "Only the palette sits above record controls");
let mobileLayer = false;
css.walkRules(".command-panel", (rule) => {
  if (rule.parent.type !== "atrule") return;
  const value = (property) => rule.nodes.find((node) => node.prop === property)?.value;
  if (value("position") === "relative" && value("inset") === "auto") mobileLayer = true;
});
assert.ok(mobileLayer, "The in-flow mobile palette needs a positioned layer with no inherited inset offset");
console.log("Palette checks passed: command/search parity, mobile handoff, in-place updates, retained input focus and unchanged records.");
