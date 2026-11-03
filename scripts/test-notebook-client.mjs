import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import vm from "node:vm";
import ts from "typescript";
import { fileNotebookRelease, validateRoadmap } from "../public/roadmap.mjs";

const require = createRequire(import.meta.url);
const sample = JSON.parse(readFileSync(new URL("../public/data/roadmap.json", import.meta.url), "utf8"));
sample.groups[0].items = [{ title: "Client fixture", detail: "Fixture work", completed: false }];
const source = readFileSync(new URL("../components/studio/notebook-editor.tsx", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText;
let state = [], refs = [], effects = [], cursor, refCursor, effectCursor, changed, editor, tree, publishing = false, refreshes = 0, writes = 0, fail = false;
let disk = { data: structuredClone(sample), revision: "initial" };
const storage = new Map(), listeners = new Map();
const store = { get publishing() { return publishing; }, refreshPendingChanges: async () => { refreshes++; } };
const onChange = (value) => { editor = value; };
const context = vm.createContext({ exports: {}, AbortSignal, JSON, console, sessionStorage: { setItem: (k, v) => storage.set(k, v), getItem: (k) => storage.get(k), removeItem: (k) => storage.delete(k) },
  window: { addEventListener: (key, handler) => listeners.set(key, handler), removeEventListener: (key) => listeners.delete(key), confirm: () => true },
  document: { querySelectorAll: () => [] },
  fetch: async (url, options) => {
    assert.equal(url, "/api/studio/notebook"); assert.equal(options.method, "POST"); assert.ok(options.signal instanceof AbortSignal);
    const payload = JSON.parse(options.body);
    if (payload.action === "read") return Response.json(disk);
    assert.ok(["save", "file"].includes(payload.action)); writes++;
    if (fail) return Response.json({ error: "Fixture save failed; draft kept." }, { status: 500 });
    if (payload.revision !== disk.revision) return Response.json({ error: "Notebook changed elsewhere." }, { status: 409 });
    disk = { data: payload.action === "file" ? fileNotebookRelease(payload.data, payload.filing) : payload.data, revision: `saved-${writes}` };
    return Response.json(disk);
  },
  require(name) {
    if (name.endsWith(".css")) return {};
    if (name === "@/public/roadmap.mjs") return { validateRoadmap, fileNotebookRelease };
    if (name === "@/components/studio/publishing-store") return { useStudioPublishing: (selector) => selector(store) };
    if (name === "react") return {
      useState(initial) { const i = cursor++; state[i] ??= { value: typeof initial === "function" ? initial() : initial }; return [state[i].value, (next) => { const value = typeof next === "function" ? next(state[i].value) : next; if (value !== state[i].value) { state[i].value = value; changed = true; } }]; },
      useRef(initial) { return refs[refCursor++] ??= { current: initial }; },
      useEffect(callback, dependencies) { const i = effectCursor++; const old = effects[i]; if (!old || dependencies.some((v, j) => v !== old.dependencies[j])) effects[i] = { callback, dependencies, cleanup: old?.cleanup, pending: true }; }
    };
    return require(name);
  }
});
vm.runInContext(compiled, context);
function render() {
  do {
    changed = false; cursor = refCursor = effectCursor = 0;
    tree = context.exports.NotebookEditorControls({ data: sample, onChange });
    for (const effect of effects) if (effect.pending) { effect.pending = false; effect.cleanup?.(); effect.cleanup = effect.callback(); }
  } while (changed);
}
async function settle() { for (let i = 0; i < 20; i++) { await Promise.resolve(); render(); } }
function find(node, predicate) { if (!node || typeof node !== "object") return null; if (predicate(node)) return node; for (const child of [node.props?.children].flat(Infinity)) { const found = find(child, predicate); if (found) return found; } return null; }
const button = (name) => find(tree, (node) => node.type === "button" && (node.props["aria-label"] === name || name === "save" && node.props.className === "notebook-save"));
const unmount = () => { effects.forEach((effect) => effect.cleanup?.()); state = []; refs = []; effects = []; };

render(); await settle();
assert.equal(editor.busy, false); assert.equal(writes, 0);
button("Edit notebook").props.onClick(); render();
editor.change("working", 0, { title: "Draft one" }); render();
editor.change("working", 0, { title: "Draft one two" }); render();
assert.equal(editor.data.groups[0].items[0].title, "Draft one two", "Repeated typing retains the current draft");
assert.equal(writes, 0, "Typing never writes source or publishes");
assert.match(editor.message, /Unsaved/); assert.ok(listeners.has("beforeunload"));
unmount(); render(); await settle();
assert.equal(editor.editing, true); assert.equal(editor.data.groups[0].items[0].title, "Draft one two", "Closing/reopening restores the draft");
fail = true; await button("save").props.onClick(); await settle();
assert.match(editor.message, /Fixture save failed/); assert.equal(editor.error, true); assert.ok(storage.size);
fail = false; await button("save").props.onClick(); await settle();
assert.equal(editor.error, false); assert.match(editor.message, /Saved locally/); assert.equal(storage.size, 0); assert.equal(refreshes, 1);
assert.ok(!listeners.has("beforeunload"));
const completion = !editor.data.groups[0].items[0].completed;
editor.change("working", 0, { completed: completion }); render();
assert.equal(editor.data.groups[0].items[0].completed, completion);
assert.deepEqual(editor.data.groups[2], sample.groups[2], "Completion never moves work to release history");
disk = { ...disk, revision: "another-tab" };
await button("save").props.onClick(); await settle();
assert.match(editor.message, /changed elsewhere/); assert.equal(editor.data.groups[0].items[0].completed, completion); assert.ok(storage.size);
publishing = true; render(); assert.equal(button("save").props.disabled, true);
const before = JSON.stringify(editor.data); editor.add("ideas"); render(); assert.equal(JSON.stringify(editor.data), before, "Publishing disables draft mutation");
publishing = false; render();
await button("Reload saved notebook").props.onClick(); await settle();
assert.equal(editor.error, false); assert.equal(storage.size, 0);
editor.change("working", 0, { completed: true }); render();
const historyBeforeFiling = JSON.stringify(editor.data.groups[2]);
button("File release").props.onClick(); render();
assert.equal(editor.filingOpen, true);
const lockedDraft = JSON.stringify(editor.data); editor.remove("working", 0); render();
assert.equal(JSON.stringify(editor.data), lockedDraft, "Selected item indexes cannot drift during filing");
find(editor.filingPanel, (node) => node.type === "input" && node.props.placeholder).props.onChange({ target: { value: "v9.8.7" } }); render();
find(editor.filingPanel, (node) => node.type === "input" && node.props.type === "date").props.onChange({ target: { value: "2026-11-03" } }); render();
fail = true; editor.filingPanel.props.onSubmit({ preventDefault() {} }); await settle();
assert.equal(editor.error, true); assert.equal(editor.filingOpen, true); assert.equal(JSON.stringify(editor.data.groups[2]), historyBeforeFiling);
fail = false; editor.filingPanel.props.onSubmit({ preventDefault() {} }); await settle();
assert.equal(editor.error, false); assert.equal(editor.filingOpen, false);
assert.equal(editor.data.groups[2].items[0].version, "v9.8.7");
assert.equal(editor.data.groups[2].items[0].releasedOn, "2026-11-03");
assert.deepEqual(editor.data.groups[2].items.slice(1), JSON.parse(historyBeforeFiling).items);
unmount();
assert.equal(listeners.size, 0, "Unmount releases page listeners");
console.log("Notebook client checks passed: buffered typing, close/reopen recovery, explicit saves, failed save/retry, stale-tab conflicts, publish exclusion and listener cleanup.");
