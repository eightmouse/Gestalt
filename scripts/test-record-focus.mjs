import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import motion from "../public/record-motion.js";

const doc = { body: {}, activeElement: null, querySelectorAll: () => [fallback] };
function control({ hidden = false, disabled = false, inert = false } = {}) {
  return { tabIndex: 0, disabled, isConnected: true, getClientRects: () => hidden ? [] : [{}], closest: () => inert ? {} : null,
    focus() { doc.activeElement = this; } };
}
const fallback = control();
const trigger = control();
let controls = [control(), control(), control()];
const listeners = new Map();
const node = { querySelectorAll: () => controls, contains: (element) => element === node || controls.includes(element),
  addEventListener: (name, handler) => listeners.set(name, handler), removeEventListener: (name) => listeners.delete(name), focus() { doc.activeElement = node; } };
doc.activeElement = trigger;
const cleanup = motion.focusWithin(node, { document: doc });
assert.equal(doc.activeElement, node, "Opening announces/focuses the window, without scrolling to a control");
function tab(shiftKey = false, key = "Tab", defaultPrevented = false) {
  let prevented = false;
  listeners.get("keydown")({ key, shiftKey, defaultPrevented, preventDefault() { prevented = true; } });
  return prevented;
}
assert.equal(tab(), true);
assert.equal(doc.activeElement, controls[0]);
assert.equal(tab(true), true);
assert.equal(doc.activeElement, controls.at(-1));
assert.equal(tab(), true);
assert.equal(doc.activeElement, controls[0]);
doc.activeElement = controls[1];
assert.equal(tab(), false, "Ordinary in-window tab order stays native");
assert.equal(tab(false, "Escape"), false, "Existing Escape/shortcut handlers remain responsible");
doc.activeElement = controls.at(-1);
assert.equal(tab(false, "Tab", true), false, "Nested controls can consume their own keyboard interaction");
controls.push(control({ hidden: true }), control({ disabled: true }), control({ inert: true }));
assert.equal(tab(), true, "Noninteractive/hidden controls cannot become focus targets");
assert.equal(doc.activeElement, controls[0]);
cleanup();
assert.equal(doc.activeElement, trigger);
assert.equal(listeners.size, 0);
doc.activeElement = trigger;
const minimize = motion.focusWithin(node, { document: doc });
fallback.focus(); minimize();
assert.equal(doc.activeElement, fallback, "Minimize's restore control or a nested window retains its own focus");
doc.activeElement = trigger;
const removedTrigger = motion.focusWithin(node, { document: doc });
trigger.isConnected = false; doc.activeElement = doc.body; removedTrigger();
assert.equal(doc.activeElement, fallback, "Static source replacement recovers to a visible workspace control");
controls = [];
const empty = motion.focusWithin(node, { document: doc });
assert.equal(tab(), true);
assert.equal(doc.activeElement, node);
empty();

const read = (file) => readFileSync(new URL(`../${file}`, import.meta.url), "utf8");
const source = read("static-app.js");
const ast = ts.createSourceFile("static-app.js", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
const sync = ast.statements.find((item) => ts.isFunctionDeclaration(item) && item.name?.text === "syncRecordFocus");
let current = {}, mounts = 0, releases = 0;
const context = vm.createContext({ recordFocusNode: null, recordFocusCleanup: null, document: { querySelector: () => current }, window: { GestaltRecordMotion: { focusWithin() { mounts++; return () => releases++; } } } });
vm.runInContext(sync.getText(ast), context);
context.syncRecordFocus(); context.syncRecordFocus();
assert.equal(mounts, 1, "No focus reset for retained record nodes");
current = null; context.syncRecordFocus();
assert.equal(releases, 1);
assert.equal((source.match(/<article role="dialog" aria-modal="true" tabindex="-1" class="record-window/g) || []).length, 2);
assert.equal((read("components/archive/record-window.tsx").match(/role="dialog"/g) || []).length, 2, "Standard and Setup record roots both carry dialog semantics");

const keydown = ast.statements.find((item) => ts.isExpressionStatement(item) && item.expression.expression?.getText(ast) === 'document.addEventListener' && item.expression.arguments[0]?.text === "keydown").expression.arguments[1];
const actions = [];
const state = { bootDismissed: true, localMemory: "session", panelOpen: true, searchOpen: true, expandedImage: { src: "fixture" }, updateHistoryOpen: true, noteSearchQuery: "filter" };
const keyboard = vm.runInNewContext(keydown.getText(ast), {
  state, HTMLInputElement: class {}, HTMLTextAreaElement: class {}, HTMLElement: class {},
  document: { querySelector: () => null },
  syncSearchPanel: () => actions.push("palette"), syncImageLightbox: () => actions.push("image"),
  setUpdateHistory(value) { state.updateHistoryOpen = value; actions.push("history"); },
  closeTimeline: () => actions.push("timeline"), closeRecord: () => actions.push("record")
});
const ignoredEscapes = [{ key: "Enter" }, { defaultPrevented: true }, { repeat: true }, { isComposing: true }, { ctrlKey: true }, { altKey: true }, { metaKey: true }];
const press = (handler, override = {}) => {
  let prevented = false, stopped = false;
  handler({ key: "Escape", target: null, nativeEvent: {}, preventDefault() { prevented = true; }, stopPropagation() { stopped = true; }, ...override });
  return { prevented, stopped };
};
for (const overrides of ignoredEscapes) assert.equal(press(keyboard, overrides).prevented, false);
for (let index = 0; index < 4; index++) press(keyboard);
assert.deepEqual(actions, ["palette", "image", "history"], "Nested UI and the note filter close before the entry");
assert.equal(state.noteSearchQuery, "");
assert.equal(press(keyboard, { shiftKey: true }).prevented, false);
assert.deepEqual(press(keyboard), { prevented: true, stopped: true });
assert.equal(actions.at(-1), "record");
state.panelOpen = false; state.timelineOpen = true;
assert.deepEqual(press(keyboard), { prevented: true, stopped: true });
assert.equal(actions.at(-1), "timeline");

const reactSource = read("components/archive/record-window.tsx");
const reactAst = ts.createSourceFile("record-window.tsx", reactSource, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const findFunction = (name) => reactAst.statements.find((item) => ts.isFunctionDeclaration(item) && item.name?.text === name);
for (const name of ["ArchiveRecordWindow", "SetupRecordWindow"]) {
  let attribute;
  ts.forEachChild(findFunction(name), function visit(item) {
    if (ts.isJsxAttribute(item) && item.name.getText(reactAst) === "onKeyDown") attribute = item;
    ts.forEachChild(item, visit);
  });
  assert.ok(attribute, `${name} handles Escape on its own dialog`);
  const calls = [];
  const route = vm.createContext({ minimized: false, escapeBlocked: false, editor: null, editorBusy: false, expandedImage: null,
    updateHistoryOpen: false, noteSearchQuery: "", updateHistoryRef: { current: null },
    setUpdateHistoryOpen: () => calls.push("history"), setNoteSearchQuery: () => calls.push("filter"), onClose: () => calls.push("record") });
  const script = `${findFunction("handleRecordEscape").getText(reactAst)}\nconst handler = ${attribute.initializer.expression.getText(reactAst)}; handler;`;
  const handler = vm.runInContext(ts.transpileModule(script, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText, route);
  for (const { isComposing, ...overrides } of [...ignoredEscapes, { shiftKey: true }]) assert.equal(press(handler, { ...overrides, nativeEvent: { isComposing } }).prevented, false);
  for (const guard of ["minimized", "escapeBlocked", ...(name === "ArchiveRecordWindow" ? ["editor", "editorBusy"] : ["expandedImage"])]) {
    route[guard] = true;
    assert.equal(press(handler).prevented, false, `${name} leaves Escape to ${guard}`);
    route[guard] = false;
  }
  assert.deepEqual(calls, []);
  if (name === "ArchiveRecordWindow") {
    route.updateHistoryOpen = true; route.noteSearchQuery = "filter";
    press(handler); route.updateHistoryOpen = false;
    press(handler); route.noteSearchQuery = "";
    assert.deepEqual(calls, ["history", "filter"]);
  }
  assert.deepEqual(press(handler), { prevented: true, stopped: true });
  assert.equal(calls.at(-1), "record");
}
console.log("Record keyboard checks passed: focus bounds, cleanup/restore, Escape close and nested/editor guards in both readers.");
