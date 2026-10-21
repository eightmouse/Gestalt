import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { createRequire } from "node:module";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";

const staticSource = readFileSync(new URL("../static-app.js", import.meta.url), "utf8");
const staticAst = ts.createSourceFile("static-app.js", staticSource, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
const policyNames = ["normalizeEntryAccessMode", "readEntryAccessMode", "saveEntryAccessMode", "shouldPlayEntryAccess"];
function staticFunction(name) {
  const node = staticAst.statements.find((node) => ts.isFunctionDeclaration(node) && node.name?.text === name);
  assert.ok(node, `${name} exists in static shell`);
  return node.getText(staticAst);
}
function harness(source) {
  const values = new Map();
  const timers = new Map();
  let timerId = 0;
  const window = {
    localStorage: { getItem: (key) => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) },
    matchMedia: () => ({ matches: false }),
    setTimeout: (fn) => { timers.set(++timerId, fn); return timerId; },
    clearTimeout: (id) => timers.delete(id)
  };
  const context = vm.createContext({ window, exports: {}, timers });
  vm.runInContext(source, context);
  return { context, window, values, timers };
}
const reactPolicySource = ts.transpileModule(readFileSync(new URL("../lib/entry-access.ts", import.meta.url), "utf8"), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText;
const policies = [harness(reactPolicySource), harness(policyNames.map(staticFunction).join("\n"))];
for (const { context, window, values } of policies) {
  for (const mode of ["first", "always", "off"]) {
    for (const played of [false, true]) {
      for (const reduced of [false, true]) {
        context.args = { mode, played, reduced };
        assert.equal(vm.runInContext("shouldPlayEntryAccess(args.mode, args.played, args.reduced)", context), !reduced && (mode === "always" || (mode === "first" && !played)));
      }
    }
    context.mode = mode;
    vm.runInContext("saveEntryAccessMode(mode)", context);
    assert.equal(vm.runInContext("readEntryAccessMode()", context), mode, "Saved mode survives a fresh read");
  }
  values.set("gestalt.entry-animation", "unexpected");
  assert.equal(vm.runInContext("readEntryAccessMode()", context), "first");
  Object.defineProperty(window, "localStorage", { get() { throw new Error("Storage blocked"); } });
  assert.equal(vm.runInContext("readEntryAccessMode()", context), "first");
  assert.doesNotThrow(() => vm.runInContext('saveEntryAccessMode("off")', context));
}

const reactSource = readFileSync(new URL("../components/archive-os.tsx", import.meta.url), "utf8");
const reactAst = ts.createSourceFile("archive-os.tsx", reactSource, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const declarations = [];
function collect(node) {
  if (ts.isVariableDeclaration(node) && ["startRecordAccess", "stopRecordAccess", "changeEntryAccessMode"].includes(node.name.getText(reactAst))) {
    declarations.push(`const ${node.getText(reactAst)};`);
  }
  ts.forEachChild(node, collect);
}
collect(reactAst);
assert.equal(declarations.length, 3);
const reactLifecycle = harness(reactPolicySource);
Object.assign(reactLifecycle.context, {
  recordAccessTimerRef: { current: null }, recordAccessPlayedRef: { current: false }, entryAccessModeRef: { current: "first" },
  pending: false, complete: false,
  setRecordAccessPending: (value) => { reactLifecycle.context.pending = value; },
  setRecordAccessComplete: (value) => { reactLifecycle.context.complete = value; },
  setEntryAccessMode: () => {}
});
vm.runInContext(ts.transpileModule(`${declarations.join("\n")}\nexports.start = startRecordAccess; exports.stop = stopRecordAccess; exports.change = changeEntryAccessMode;`, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText, reactLifecycle.context);
const api = reactLifecycle.context.exports;
api.start();
assert.equal(reactLifecycle.context.pending, true);
api.stop();
assert.equal(reactLifecycle.timers.size, 0, "Closing/minimizing cancels pending work");
api.start();
assert.equal(reactLifecycle.context.pending, false, "First-only is once per page, even after closing early");
api.change("always");
api.start();
assert.equal(reactLifecycle.context.pending, true);
api.change("off");
assert.equal(reactLifecycle.context.pending, false);
assert.equal(reactLifecycle.context.complete, true, "Changing modes settles the entry without replay");
assert.equal(reactLifecycle.timers.size, 0);
api.start();
assert.equal(reactLifecycle.context.pending, false);

const staticLifecycle = harness(policyNames.map(staticFunction).join("\n"));
Object.assign(staticLifecycle.context, {
  state: { accessPending: true, accessComplete: false, entryAccessMode: "first", selectedId: "unchanged", activeContent: "notes" },
  recordAccessTimers: [], document: { querySelector: () => ({ classList: { remove() {}, add() {} } }) }
});
for (const name of ["stopRecordAccessSequence", "startRecordAccessSequence", "settleRecordAccessSequence", "changeEntryAccessMode"]) vm.runInContext(staticFunction(name), staticLifecycle.context);
vm.runInContext('startRecordAccessSequence(); changeEntryAccessMode("off")', staticLifecycle.context);
assert.equal(staticLifecycle.timers.size, 0);
assert.equal(staticLifecycle.context.state.accessPending, false);
assert.equal(staticLifecycle.context.state.accessComplete, true);
assert.equal(staticLifecycle.context.state.selectedId, "unchanged");
assert.equal(staticLifecycle.context.state.activeContent, "notes");
assert.match(staticSource, /state\.accessPending = shouldPlayEntryAccess\(state\.entryAccessMode/);
assert.match(staticSource, /if \(event\.matches\) settleRecordAccessSequence\(\)/);
assert.match(reactSource, /motionQuery\.removeEventListener\("change", onMotionChange\)/);

const panelSource = readFileSync(new URL("../components/archive/search-panel.tsx", import.meta.url), "utf8");
const panelAst = ts.createSourceFile("search-panel.tsx", panelSource, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const panel = panelAst.statements.find((node) => ts.isFunctionDeclaration(node) && node.name?.text === "SearchPanel");
const panelContext = vm.createContext({ exports: {}, require: createRequire(import.meta.url), cipherizeText: (text) => text });
vm.runInContext(ts.transpileModule(panel.getText(panelAst), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText, panelContext);
Object.assign(staticLifecycle.context, { searchResults: () => [], cipherizeText: (text) => text });
vm.runInContext(staticFunction("escapeHtml"), staticLifecycle.context);
vm.runInContext(staticFunction("searchPanel"), staticLifecycle.context);
for (const mode of ["first", "always", "off"]) {
  staticLifecycle.context.state.searchOpen = true;
  staticLifecycle.context.state.searchQuery = "";
  staticLifecycle.context.state.entryAccessMode = mode;
  const htmls = [
    renderToStaticMarkup(panelContext.exports.SearchPanel({ panelRef: { current: null }, query: "", results: [], entryAccessMode: mode, onOpenResult() {}, onQueryChange() {}, onEntryAccessModeChange() {} })),
    vm.runInContext("searchPanel()", staticLifecycle.context)
  ];
  for (const html of htmls) {
    const radios = [...html.matchAll(/<input\b[^>]*type="radio"[^>]*>/g)].map((match) => match[0]);
    assert.equal(radios.length, 3, "Both renderers expose the same three native radio options");
    const checked = radios.filter((input) => /\bchecked(?:[ =]|\/?>)/.test(input));
    assert.equal(checked.length, 1);
    assert.ok(checked[0].includes(`value="${mode}"`));
  }
}
console.log("Entry access tests passed: mode policy parity, persistence, blocked storage, first/subsequent opens, cancellation and stable navigation.");
