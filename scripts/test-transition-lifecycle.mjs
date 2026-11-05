import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";

const read = (file) => readFileSync(new URL(`../${file}`, import.meta.url), "utf8");
const source = read("static-app.js");
const ast = ts.createSourceFile("static-app.js", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
const functions = ["syncRecordWindow", "syncRecordWindowChrome", "closeRecord", "completeBoot"].map((name) => {
  const node = ast.statements.find((item) => ts.isFunctionDeclaration(item) && item.name?.text === name);
  assert.ok(node, `${name} exists`);
  return node.getText(ast);
}).join("\n");
const nodes = new Map();
const classes = () => ({ values: new Set(), toggle(name, on) { if (on) this.values.add(name); else this.values.delete(name); }, remove(...names) { for (const name of names) this.values.delete(name); } });
const node = (selector) => {
  const value = { classList: classes(), remove() { nodes.delete(selector); }, style: { removeProperty(name) { value.removedStyle = name; } }, removeAttribute(name) { value.removedAttribute = name; },
    insertAdjacentHTML(where, html) { value.inserted = { where, html }; } };
  nodes.set(selector, value);
  return value;
};
const shell = node(".archive-shell"), workspace = node(".workspace"), dashboard = node(".dashboard-grid");
const background = node(".grain-layer");
dashboard.scrollTop = 146;
let renders = 0, focusSyncs = 0, navigationSyncs = 0, stopped = 0, completion;
const context = vm.createContext({
  window: {}, syncMemoryTrace() {},
  state: { bootDismissed: true, panelOpen: true, localMemory: "prompt", entryAccessMode: "first", windowSteady: true },
  minimizedRecordWindow: { id: "old" }, recordRenderPending: false,
  root: { querySelector: (selector) => nodes.get(selector) || null },
  syncSearchPanel() {}, syncRoadmapDialog() {}, selectedRecord: () => ({ id: "new" }),
  recordBackdrop: () => "backdrop", recordWindow: (record) => record.id,
  workspaceWindowTray: () => "tray", syncDesktopNavigation: () => navigationSyncs++, syncRecordFocus: () => focusSyncs++,
  render: () => renders++, localMemoryPrompt: () => "consent", stopRecordAccessSequence: () => stopped++,
  recordMotionController: { busy: false, close: ({ onComplete }) => { completion = onComplete; } }, bootCleanup: () => {},
});
vm.runInContext(functions, context);
node(".record-window"); node("[data-record-backdrop]");
assert.equal(vm.runInContext("syncRecordWindow()", context), true);
assert.equal(workspace.inserted.html, "backdropnew");
assert.equal(nodes.get(".grain-layer"), background);
assert.equal(nodes.get(".dashboard-grid"), dashboard);
assert.equal(dashboard.scrollTop, 146, "Window updates preserve section scroll and actual dashboard nodes");
assert.equal(context.minimizedRecordWindow, null);
assert.equal(context.state.windowSteady, false, "The transient tab-change flag cannot suppress a later opening");
assert.equal(focusSyncs, 1);
assert.equal(navigationSyncs, 1);
assert.ok(dashboard.classList.values.has("is-muted"));
assert.equal(renders, 0);

const nested = node(".archive-folder-window, .archive-nav-panel, .timeline-window");
assert.equal(vm.runInContext("syncRecordWindow()", context), false, "Nested navigation keeps its existing full-render fallback");
nested.remove();
node(".record-window"); node("[data-record-backdrop]");
vm.runInContext("closeRecord()", context);
assert.ok(nodes.has(".record-window"), "Closing remains content-first until shared motion completes");
completion();
assert.equal(context.state.panelOpen, false);
assert.equal(stopped, 1);
assert.equal(renders, 0, "Ordinary close never repaints the page through a root replacement");
assert.ok(!nodes.has(".record-window") && !nodes.has("[data-record-backdrop]"));
assert.ok(!dashboard.classList.values.has("is-muted"));
context.state.panelOpen = true;
context.recordRenderPending = true;
vm.runInContext("closeRecord()", context); completion();
assert.equal(renders, 1, "A real data refresh deferred during exit still runs");

shell.inert = true;
shell.classList.values.add("is-booting");
shell.classList.values.add("is-quick-boot");
node(".boot-screen");
vm.runInContext("completeBoot()", context);
assert.equal(renders, 1, "Boot handoff does not rebuild the already-revealed workspace");
assert.equal(shell.inert, false);
assert.equal(shell.removedAttribute, "aria-busy");
assert.equal(shell.removedStyle, "--boot-elapsed");
assert.equal(shell.classList.values.size, 0);
assert.equal(shell.inserted.html, "consent", "Consent still appears only after boot");
assert.equal(context.bootCleanup, null);
assert.ok(!nodes.has(".boot-screen"));
node(".local-memory-consent");
context.state.localMemory = "session";
vm.runInContext("completeBoot()", context);
assert.ok(!nodes.has(".local-memory-consent"));
assert.equal(nodes.get(".dashboard-grid"), dashboard);

const css = read("app/globals.css");
assert.match(css, /\.grain-layer,\s*\.scanline-layer\s*\{[^}]*transform: translateZ\(0\)/, "Only the static texture overlays get cached layers");
assert.match(css, /\.record-window::after\s*\{[^}]*transform: translateZ\(0\)/, "The open window's static scanline overlay is cached too, not its whole descendant tree");
const react = read("components/archive/record-window.tsx");
assert.ok(!react.includes("motion.article") && !react.includes('from "framer-motion"'), "React and Pages use the same CSS entry fade, not two competing opacity animations");
assert.equal((react.match(/<article\s+ref=/g) || []).length, 2, "Standard and Setup dialogs retain their real roots");
assert.match(source, /if \(!syncRecordWindow\(\)\) render\(\);\s*startRecordAccessSequence\(\)/);
let contentBranch;
function findContentBranch(node) {
  if (ts.isIfStatement(node) && node.expression.getText(ast) === "contentKey") contentBranch = node.thenStatement;
  ts.forEachChild(node, findContentBranch);
}
findContentBranch(ast);
assert.ok(contentBranch?.getText(ast).includes("if (!syncRecordWindow()) render();"), "Content-tab changes use the same retained-workspace path");
assert.ok(!read("index.html").includes("performance-probe"), "The opt-in probe is never part of the public reader");
assert.ok(!read("scripts/prepare-pages.mjs").includes("performance-preview"));
const readerAst = ts.createSourceFile("archive-os.tsx", read("components/archive-os.tsx"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
for (const name of ["closeRecord", "minimizeRecord"]) {
  let action;
  function findAction(node) {
    if (ts.isVariableDeclaration(node) && node.name.getText(readerAst) === name) action = node.initializer;
    ts.forEachChild(node, findAction);
  }
  findAction(readerAst); assert.ok(action);
  const script = ts.transpileModule(`(${action.getText(readerAst)})();`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
  for (const surface of [null, { hidden: true }, { hidden: false }]) {
    let started = 0;
    const motion = { close({ node }) { assert.equal(node, surface); started++; }, minimize({ node }) { assert.equal(node, surface); started++; } };
    vm.runInNewContext(script, { inlineBusy: false, panelOpen: true, shellRef: { current: { querySelector: () => surface } }, recordMotionRef: { current: motion }, entryAccessModeRef: { current: "first" } });
    assert.equal(started, surface && !surface.hidden ? 1 : 0, `${name} ignores missing/hidden DOM even before React commits its closed state`);
  }
}
console.log("Transition lifecycle passed: retained workspace/scroll, single fade, delayed close, deferred refresh, focus sync and consent-safe boot handoff.");
