import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import vm from "node:vm";
import ts from "typescript";

const require = createRequire(import.meta.url);
const read = (name) => readFileSync(new URL(`../${name}`, import.meta.url), "utf8");
const source = read("components/studio-client.tsx");
const ast = ts.createSourceFile("studio-client.tsx", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const withoutImports = ast.statements.filter((node) => !ts.isImportDeclaration(node)).map((node) => node.getText(ast)).join("\n");
const compiled = ts.transpileModule(withoutImports, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText;
const record = { id: "inline-fixture", title: "Original title", section: "logs", type: "Field Note", status: "Filed", started: "2026-10-22", updated: "2026-10-22", writtenAt: "2026-10-22", writtenOrder: 8, body: ":::note First note\nOriginal body\n:::", summary: "", meta: {}, progress: 0, priority: 1, milestones: [] };
const helpers = vm.createContext({ exports: {} });
vm.runInContext(ts.transpileModule(read("lib/inline-editing.ts"), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText, helpers);
const { supportsInlineEditing, newInlineRecord } = helpers.exports;
const api = vm.createContext({ exports: {}, Error });
vm.runInContext(ts.transpileModule(read("lib/studio-client-api.ts"), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText, api);
assert.equal(supportsInlineEditing("setup"), false);
assert.equal(supportsInlineEditing("archive"), false);
for (const section of ["logs", "games", "projects"]) {
  const draft = newInlineRecord(section, undefined, new Date("2026-10-22T12:00:00"));
  assert.equal(draft.section, section);
  assert.equal(draft.body, "");
  assert.ok(draft.id.startsWith("__new:"), "Unsaved window identities cannot be confused with a saved record");
}

async function fixture({ fail = false, exported = true, inline = true, section = "logs", create = false, seed, manual = false } = {}) {
  let stateIndex = 0, refIndex = 0;
  const states = [], refs = [], calls = [], changes = [];
  const other = { body: "Unrelated draft", form: { ...record, id: "other-record", originalId: "other-record", body: "Unrelated draft" }, updatedAt: 10 };
  const storage = JSON.stringify({ "record:other-record": other });
  const context = vm.createContext({ exports: {}, require, console, Error, process: { env: { NODE_ENV: "development" } },
    useState(initial) { const index = stateIndex++; if (!(index in states)) states[index] = typeof initial === "function" ? initial() : initial; return [states[index], (next) => { states[index] = typeof next === "function" ? next(states[index]) : next; }]; },
    useRef(initial) { const index = refIndex++; if (!(index in refs)) refs[index] = { current: initial }; return refs[index]; },
    memo: (component) => component, useMemo: (callback) => callback(), useCallback: (callback) => callback, useEffect() {}, useLayoutEffect() {},
    window: { localStorage: { getItem: () => storage } },
    imageFraming: require("../public/image-framing.js"),
    gameLogPlacement: (form) => form.gamePlacement || form.meta?.gamePlacement || "session", gameActivityValue: (form) => form.gameActivity || form.meta?.gameActivity || "", compareSectionRecords: () => 0,
    supportsInlineEditing, InlineRecordLayout() {}, PublishNotificationPanel() {}, Bell: "svg",
    readStudioResponse: api.exports.readStudioResponse, StudioRequestError: api.exports.StudioRequestError,
    fetch: async (url, options) => {
      calls.push({ url, payload: JSON.parse(options.body || "{}") });
      if (url === "/api/studio/entry") {
        if (fail) return Response.json({ error: "Fixture save refused" }, { status: 503 });
        const payload = calls.at(-1).payload;
        const id = payload.id || payload.title.toLowerCase().replace(/\W+/g, "-");
        return Response.json({ id, path: `content/records/${id}.mdx`, staticExported: exported, writtenAt: record.writtenAt, writtenOrder: record.writtenOrder });
      }
      assert.equal(url, "/api/studio/changes", "Saving never invokes publishing or any other endpoint");
      return Response.json({ records: [], changedFiles: 0, staticExportRequired: !exported });
    }
  });
  const publisher = vm.createContext({ exports: {}, require: (name) => name === "@/lib/studio-client-api" ? api.exports : require(name),
    process: { env: { NODE_ENV: "development" } }, fetch: context.fetch, AbortSignal });
  vm.runInContext(ts.transpileModule(read("components/studio/publishing-store.ts"), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText, publisher);
  context.useStudioPublishing = Object.assign(() => publisher.exports.useStudioPublishing.getState(), { getState: () => publisher.exports.useStudioPublishing.getState() });
  vm.runInContext(compiled, context);
  const sourceRecord = { ...record, section, meta: section === "games" ? { gamePlacement: "session", gameActivity: "inactive", steamAppId: "123", achievementCount: "25 / 50" } : section === "projects" ? { technicalStack: "TypeScript\nNext.js", samples: ["/media/fixture.png"] } : {} };
  const props = { records: [sourceRecord], initialRecordId: create ? undefined : record.id, initialSection: create ? section : undefined, initialSteamGame: seed, inline, embedded: true, initialContent: "notes", onRecordsChange: (...args) => changes.push(args) };
  const render = () => { stateIndex = 0; refIndex = 0; return context.exports.StudioClient(props); };
  const find = (node, predicate) => !node || typeof node !== "object" ? null : predicate(node) ? node : [node.props?.children].flat(Infinity).map((child) => find(child, predicate)).find(Boolean);
  const layout = () => find(render(), (node) => node.type === context.InlineRecordLayout);
  if (!inline) return { calls, changes, states, save: () => find(render(), (node) => node.type === "button" && node.props.children === "Save Record").props.onClick() };
  if (manual) return { calls, changes, states, layout };
  assert.equal(layout().props.activeContent, "notes", "Entry content is retained when editing starts");
  layout().props.onUpdate("title", "Edited in place");
  layout().props.content.props.onBodyCommit(":::note First note\nUpdated body with **formatting** and a ~ character.\n:::");
  await layout().props.onSave();
  return { calls, changes, states, layout: layout() };
}

const saved = await fixture();
const writes = saved.calls.filter((call) => call.url === "/api/studio/entry");
assert.equal(writes.length, 1, "Inline Save Record writes only the open record, not unrelated cached drafts");
assert.equal(writes[0].payload.originalId, record.id);
assert.equal(writes[0].payload.title, "Edited in place");
assert.match(writes[0].payload.body, /Updated body with \*\*formatting\*\* and a ~ character/);
assert.equal(saved.changes.length, 1);
assert.equal(saved.changes[0][0][0].title, "Edited in place", "Saved data is sent back to the actual reader");
assert.equal(saved.changes[0][0][0].writtenOrder, record.writtenOrder);
assert.ok(saved.states.some((value) => value?.["record:other-record"] && !value["record:inline-fixture"]), "Unrelated drafts survive a successful inline save");
assert.match(saved.layout.props.message, /saved.*locally/i);

const failed = await fixture({ fail: true });
assert.equal(failed.changes.length, 0, "Failed writes cannot replace the reader's saved content");
assert.match(failed.layout.props.message, /Fixture save refused/);
assert.ok(failed.states.some((value) => value?.["record:inline-fixture"]?.body.includes("Updated body")), "Failure keeps the edited body in the same draft model");
const pendingExport = await fixture({ exported: false });
assert.equal(pendingExport.changes.length, 1, "A saved source with failed export is still reconciled");
assert.equal(pendingExport.layout.props.exportRequired, true);
assert.match(pendingExport.layout.props.message, /Refresh the archive/);
const legacy = await fixture({ inline: false });
await legacy.save();
assert.equal(legacy.calls.filter((call) => call.url === "/api/studio/entry").length, 2, "The existing full-Studio batch-save behavior is unchanged");

for (const section of ["logs", "games", "projects"]) {
  const editor = await fixture({ section, manual: true });
  const tabs = editor.layout().props.contents.map((item) => item.key);
  assert.deepEqual(Array.from(tabs), section === "games" ? ["overview", "notes", "recommendation"] : section === "projects" ? ["technical", "overview", "notes", "samples"] : ["overview", "notes", "attachments"]);
  assert.equal(Boolean(editor.layout().props.controls), section === "games", "Game placement controls belong only to Games");
  editor.layout().props.onUpdate("title", `Updated ${section}`);
  await editor.layout().props.onSave();
  const savedRecord = editor.changes[0][0][0];
  assert.equal(savedRecord.section, section);
  if (section === "games") {
    assert.equal(savedRecord.meta.steamAppId, "123");
    assert.equal(savedRecord.meta.gamePlacement, "session");
    assert.equal(savedRecord.meta.gameActivity, "inactive");
    assert.equal(savedRecord.meta.achievementCount, "25 / 50");
  }
  if (section === "projects") { assert.match(savedRecord.meta.technicalStack, /TypeScript/); assert.equal(savedRecord.meta.samples[0], "/media/fixture.png"); }

  const fresh = await fixture({ section, create: true, manual: true });
  assert.equal(fresh.calls.length, 0, "Opening a new entry performs no write");
  assert.equal(fresh.layout().props.record.title, "", "New Note/Game/Project is a placeholder, not saved content");
  assert.ok(!fresh.layout().props.record.body.includes("Write the first note here."));
  await fresh.layout().props.onSave();
  assert.equal(fresh.calls.length, 0, "An empty placeholder title must not create a public record");
  fresh.layout().props.onUpdate("title", `New ${section} fixture`);
  fresh.layout().props.content.props.onBodyCommit(":::note First session\nActual written content.\n:::");
  await fresh.layout().props.onSave();
  assert.equal(fresh.layout().props.isNew, false);
  assert.equal(fresh.calls.filter((call) => call.url === "/api/studio/entry")[0].payload.originalId, "");
  const id = fresh.changes[0][1];
  await fresh.layout().props.onSave();
  assert.equal(fresh.calls.filter((call) => call.url === "/api/studio/entry")[1].payload.originalId, id, "Second save updates the created entry, not a duplicate");
  assert.equal(fresh.changes.at(-1)[0].filter((item) => item.id === id).length, 1);
}
const steam = await fixture({ section: "games", create: true, manual: true, seed: { title: "Seed game", steamAppId: "42", banner: "/media/cover.jpg" } });
assert.equal(steam.layout().props.record.title, "Seed game");
assert.equal(steam.layout().props.record.meta.steamAppId, "42");
assert.equal(steam.calls.length, 0, "The deliberate Steam offer is still an unsaved draft");

const reader = read("components/archive/record-window.tsx");
assert.match(reader, /editor \? "record-layout is-editing-record" : "record-layout"/);
assert.match(reader, /\{editor \?\? <>/);
const archive = read("components/archive-os.tsx");
assert.match(archive, /process\.env\.NODE_ENV === "development" && editingInline/);
assert.match(archive, /if \(inlineDraftWindow\?\.id === selectedId\) return;/);
assert.match(archive, /key=\{recordWindowKey\}/, "The unsaved window keeps its identity through the first save");
assert.match(archive, /\(inlineRecordId && panelOpen\)/);
assert.match(archive, /\(isInputTarget && !isPaletteInput\)/);
assert.match(archive, /target\.id === "archive-search"/, "Only the palette's own input is exempt from the typing guard");
assert.ok(!read("static-app.js").includes("api/studio/entry"), "The published static reader remains read-only");
console.log("Inline editing checks passed: current-record save, reader reconciliation, draft/failure/export recovery, original writing order, legacy batch behavior and public boundary.");
