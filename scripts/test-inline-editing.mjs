import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import vm from "node:vm";
import ts from "typescript";
import { renderToStaticMarkup } from "react-dom/server";

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
  let storage = JSON.stringify({ "record:other-record": other });
  const context = vm.createContext({ exports: {}, require, console, Error, process: { env: { NODE_ENV: "development" } },
    useState(initial) { const index = stateIndex++; if (!(index in states)) states[index] = typeof initial === "function" ? initial() : initial; return [states[index], (next) => { states[index] = typeof next === "function" ? next(states[index]) : next; }]; },
    useRef(initial) { const index = refIndex++; if (!(index in refs)) refs[index] = { current: initial }; return refs[index]; },
    memo: (component) => component, useMemo: (callback) => callback(), useCallback: (callback) => callback, useEffect() {}, useLayoutEffect() {},
    window: { localStorage: { getItem: () => storage, setItem: (_key, value) => { storage = value; }, removeItem: () => { storage = null; } } },
    imageFraming: require("../public/image-framing.js"),
    gameLogPlacement: (form) => form.gamePlacement || form.meta?.gamePlacement || "session", gameActivityValue: (form) => form.gameActivity || form.meta?.gameActivity || "", compareSectionRecords: () => 0,
    supportsInlineEditing, InlineRecordLayout() {}, StudioSaveState() {}, PublishNotificationPanel() {}, Bell: "svg", Type: "svg", ChevronDown: require("lucide-react").ChevronDown,
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
  if (!inline) return { calls, changes, states,
    heading: () => find(render(), (node) => node.type === context.EditableHeading),
    content: () => find(render(), (node) => node.type === context.StudioContent),
    saveState: () => find(render(), (node) => node.type === context.StudioSaveState).props.state,
    save: () => find(render(), (node) => node.type === "button" && node.props.children === "Save Record").props.onClick() };
  if (manual) return { calls, changes, states, layout, storedDrafts: () => JSON.parse(storage || "{}"), suggest: context.suggestedLogTitle, isDirty: context.studioHasUnsavedChanges };
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
assert.equal(saved.layout.props.saveState, "saved");

const failed = await fixture({ fail: true });
assert.equal(failed.changes.length, 0, "Failed writes cannot replace the reader's saved content");
assert.match(failed.layout.props.message, /Fixture save refused/);
assert.equal(failed.layout.props.saveState, "unsaved", "Failed writes never move the saved baseline");
assert.ok(failed.states.some((value) => value?.["record:inline-fixture"]?.body.includes("Updated body")), "Failure keeps the edited body in the same draft model");
const pendingExport = await fixture({ exported: false });
assert.equal(pendingExport.changes.length, 1, "A saved source with failed export is still reconciled");
assert.equal(pendingExport.layout.props.exportRequired, true);
assert.match(pendingExport.layout.props.message, /Refresh the archive/);
assert.equal(pendingExport.layout.props.saveState, "saved", "A successful source write is saved locally even if export needs a retry");
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

for (const section of ["logs", "games", "projects"]) {
  const editor = await fixture({ section, manual: true });
  assert.equal(editor.layout().props.saveState, "saved", "Opening an unchanged saved record is clean");
  editor.layout().props.onUpdate("title", "An unsaved rename");
  assert.equal(editor.layout().props.saveState, "unsaved");
  editor.layout().props.onUpdate("title", record.title);
  assert.equal(editor.layout().props.saveState, "saved", "Reverting an edit restores the clean state without a request");
  editor.layout().props.content.props.onBodyCommit(":::note First note\nChanged text and ![capture](/media/fixture.png).\n:::");
  assert.equal(editor.layout().props.saveState, "unsaved");
  await editor.layout().props.onSave();
  assert.equal(editor.layout().props.saveState, "saved");
  editor.layout().props.onUpdate("headerImage", "/media/new-header.png");
  assert.equal(editor.layout().props.saveState, "unsaved", "Media assignments are edits too");
  assert.match(editor.layout().props.message, /Unsaved changes since the last local save/);
  editor.layout().props.onUpdate("headerImage", "");
  assert.equal(editor.layout().props.saveState, "saved");
  editor.layout().props.content.props.onDraftChange(true);
  assert.equal(editor.layout().props.saveState, "unsaved", "Buffered field typing is visible before blur commits its value");
  editor.layout().props.content.props.onDraftChange(false);
  assert.equal(editor.layout().props.saveState, "saved", "Cancelling a buffered edit is not a persisted modification");
  const fresh = await fixture({ section, create: true, manual: true });
  assert.equal(fresh.layout().props.saveState, "new");
}
const legacyDirty = await fixture({ inline: false, manual: true });
assert.equal(legacyDirty.saveState(), "saved");
legacyDirty.heading().props.onDraftChange(true);
assert.equal(legacyDirty.saveState(), "unsaved", "The full Studio header reports buffered title edits");
legacyDirty.heading().props.onDraftChange(false);
assert.equal(legacyDirty.saveState(), "saved");
const compare = (await fixture({ manual: true })).isDirty;
const baseline = { title: "Saved title", originalId: "fixture", id: "fixture", body: "Saved note", headerImage: "", banner: "", bannerZoom: 100 };
assert.equal(compare({ ...baseline }, baseline), false);
assert.equal(compare({ ...baseline }, null), true);
assert.equal(compare({ ...baseline, writtenAt: "later", writtenOrder: 99, steamDraftAppId: "42" }, baseline), false, "Server-owned ordering/draft seed bookkeeping is not an authored edit");
assert.equal(compare({ ...baseline, body: "Restored unsaved note" }, baseline), true, "Restored drafts are compared with saved content, never adopted as the baseline");
const { headerImage: omittedHeader, ...olderDraft } = { ...baseline, headerImage: "/media/saved-header.png" };
assert.equal(compare(olderDraft, { ...baseline, headerImage: "/media/saved-header.png" }), true, "An older draft omitting a saved editable field cannot appear clean");
console.log("Save-state checks passed: edit/revert, notes/media, buffered edits, local-only success, failures/export retry and old/new editor parity.");

function bufferedFixture(name, props, dependencies = []) {
  let index = 0, refIndex = 0;
  const values = [], refs = [], effects = [];
  const scope = vm.createContext({ exports: {}, require,
    useState(initial) { const key = index++; if (!(key in values)) values[key] = typeof initial === "function" ? initial() : initial; return [values[key], (value) => { values[key] = value; }]; },
    useRef(initial) { const key = refIndex++; return refs[key] ??= { current: initial }; },
    useLayoutEffect(callback) { callback(); }, useEffect(callback) { effects.push(callback); } });
  const declarations = [name, ...dependencies].map((id) => ast.statements.find((node) => ts.isFunctionDeclaration(node) && node.name?.text === id).getText(ast)).join("\n");
  vm.runInContext(ts.transpileModule(declarations, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText, scope);
  return { render() { index = 0; refIndex = 0; return scope[name](props); }, effects };
}
const pendingFlags = [], committedText = [], retainedText = [];
const buffered = bufferedFixture("BufferedBodyEditor", { label: "Recommendation", value: "Saved recommendation", onCommit: (value) => committedText.push(value), onRetainDraft: (value) => retainedText.push(value), onDraftChange: (value) => pendingFlags.push(value) });
buffered.render().props.children[1].props.onChange({ target: { value: "Typing without blur" } });
assert.equal(pendingFlags.at(-1), true);
assert.equal(committedText.length, 0, "Buffered text still commits on blur, not every keystroke");
buffered.render().props.children[1].props.onChange({ target: { value: "Saved recommendation" } });
assert.equal(pendingFlags.at(-1), false);
buffered.render().props.children[1].props.onChange({ target: { value: "An actual recommendation edit" } });
buffered.render().props.children[1].props.onBlur();
assert.equal(committedText.at(-1), "An actual recommendation edit");
assert.equal(pendingFlags.at(-1), false);
buffered.effects[1]()();
assert.equal(pendingFlags.at(-1), false, "Unmounting a buffered field clears its transient flag");
assert.equal(retainedText.length, 0, "Blurred/committed buffers do not recreate a cached draft on cleanup");
buffered.render().props.children[1].props.onChange({ target: { value: "Keep this when closing without blur" } });
buffered.effects[1]()();
assert.equal(retainedText.at(-1), "Keep this when closing without blur");
assert.equal(committedText.length, 1, "Closing retains a local draft, not another form commit or file write");

const retainedGame = await fixture({ section: "games", manual: true });
retainedGame.layout().props.content.props.onRetainDraft("recommendation", "Unblurred recommendation");
const retainedDraft = retainedGame.storedDrafts()[`record:${record.id}`];
assert.equal(retainedDraft.form.recommendation, "Unblurred recommendation");
assert.equal(retainedDraft.form.originalId, record.id);
assert.equal(retainedDraft.body, record.body);
assert.ok(retainedGame.storedDrafts()["record:other-record"], "Retaining a buffer preserves unrelated drafts");
assert.equal(retainedGame.calls.length, 0, "Draft retention never invokes save/export/publish APIs");
assert.equal(retainedGame.layout().props.record.meta.recommendation, "", "Closing retention does not rewrite the saved reader");

const progressProps = { value: "Core|70|In Progress;Polish|40|Pending", onChange: (value) => { progressProps.value = value; } };
const milestones = bufferedFixture("MilestoneEditor", progressProps, ["parseMilestoneDraft", "serializeMilestones", "emptyMilestoneDraft"]);
const progressRows = () => milestones.render().props.children[1];
const firstKey = progressRows()[0].key;
for (const character of " structure") {
  const input = progressRows()[0].props.children[0];
  input.props.onChange({ target: { value: input.props.value + character } });
  milestones.render();
  milestones.effects.at(-1)();
  assert.equal(progressRows()[0].key, firstKey, "Renaming a progress row cannot change its React identity");
}
assert.equal(progressRows()[0].props.children[0].props.value, "Core structure", "Parent value echoes must not strip spaces while typing");
assert.match(progressProps.value, /^Core structure\|70\|In Progress;/);
assert.equal(progressRows()[1].props.children[0].props.value, "Polish");
progressRows()[0].props.children[2].props.onChange({ target: { value: "Active" } });
assert.match(progressProps.value, /Core structure\|70\|Active/);
milestones.render().props.children[0].props.children[1].props.onClick();
assert.equal(progressRows().length, 3);
progressRows()[0].props.children[3].props.onClick();
assert.equal(progressRows()[0].props.children[0].props.value, "Polish");
assert.equal(progressRows()[0].props.children[1].props.value, 40);
progressProps.value = "External update|25|Planning";
milestones.render();
milestones.effects.at(-1)();
assert.equal(progressRows()[0].props.children[0].props.value, "External update", "Real external updates still replace the editing rows");
console.log("Progress-row checks passed: stable keys, typing/space preservation, unchanged serialization, add/remove and external updates.");

const titleFlags = [], titleCommits = [];
const editable = bufferedFixture("EditableText", { label: "Title", value: "Saved title", onChange: (value) => titleCommits.push(value), onDraftChange: (value) => titleFlags.push(value) });
editable.render().props.onClick();
editable.render().props.onChange({ target: { value: "A cancelled edit" } });
assert.equal(titleFlags.at(-1), true);
editable.render().props.onKeyDown({ key: "Escape", preventDefault() {}, stopPropagation() {} });
assert.equal(titleFlags.at(-1), false);
assert.equal(titleCommits.length, 0, "Escape must not commit a buffered title");
editable.render().props.onClick();
editable.render().props.onChange({ target: { value: "A committed edit" } });
editable.render().props.onBlur();
assert.equal(titleCommits.at(-1), "A committed edit");
assert.equal(titleFlags.at(-1), false);

const saveStateModule = vm.createContext({ exports: {}, require });
vm.runInContext(ts.transpileModule(read("components/studio/save-state.tsx"), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText, saveStateModule);
for (const [state, label] of [["new", "New draft"], ["unsaved", "Unsaved changes"], ["saved", "Saved locally"], ["saving", "Saving locally..."]]) {
  const html = renderToStaticMarkup(saveStateModule.exports.StudioSaveState({ state }));
  assert.ok(html.includes(label) && html.includes('role="status"'));
  assert.ok(!html.toLowerCase().includes("published"), "The indicator never claims a Git push or hosted deployment");
}
assert.match(read("app/studio/studio.css"), /\.inline-record-actions > \.studio-save-state\s*\{ grid-column: 1 \/ -1;/);
assert.match(read("components/studio/inline-record-layout.tsx"), /title="Background behind the entry title; separate from overview artwork and samples"/);
console.log("Buffered controls and status markup passed: typing, revert, cancel, blur, cleanup, local-save wording and compact action rows.");

const untitled = await fixture({ create: true, manual: true });
const commitNote = (body) => untitled.layout().props.content.props.onBodyCommit(body);
assert.equal(untitled.layout().props.titleAction, null, "Generated New Note headings are not suggestions");
commitNote(":::note 27 / 10 / 2026 - A quieter morning\nWritten content with ![capture](/media/fixture.png).\n:::");
assert.equal(untitled.layout().props.record.title, "", "A heading offers a title, never silently assigns it");
assert.equal(untitled.calls.length, 0, "Writing or suggesting a title never saves or publishes");
let titleAction = untitled.layout().props.titleAction;
assert.equal(titleAction.props.children[1].props.children[1].props.children, "A quieter morning", "A date prefix is not repeated in the record title");
let titleFocused = false;
titleAction.props.onClick({ currentTarget: { closest: () => ({ querySelector: () => ({ focus: () => { titleFocused = true; } }) }) } });
assert.equal(titleFocused, true, "Accepting a suggestion moves focus to the title, not the document body");
assert.equal(untitled.layout().props.record.title, "A quieter morning");
assert.equal(untitled.layout().props.titleAction, null);
commitNote(":::note A changed heading\nUpdated note body.\n:::");
assert.equal(untitled.layout().props.record.title, "A quieter morning", "Accepted titles remain independent of later note edits");
await untitled.layout().props.onSave();
const titledWrite = untitled.calls.find((call) => call.url === "/api/studio/entry").payload;
assert.equal(titledWrite.title, "A quieter morning");
assert.equal(titledWrite.body, ":::note A changed heading\nUpdated note body.\n:::");
commitNote(":::note Another heading\nAnother edit.\n:::");
untitled.layout().props.onUpdate("title", "");
assert.equal(untitled.layout().props.titleAction, null, "Saved logs are never automatically retitled, even if their title is cleared");

const manualTitle = await fixture({ create: true, manual: true });
manualTitle.layout().props.content.props.onBodyCommit(":::note A possible title\nBody.\n:::");
titleAction = manualTitle.layout().props.titleAction;
manualTitle.layout().props.onUpdate("title", "My explicit title");
assert.equal(manualTitle.layout().props.titleAction, null);
titleAction.props.onClick();
assert.equal(manualTitle.layout().props.record.title, "My explicit title", "An old suggestion callback cannot overwrite a newer manual title");
assert.ok(manualTitle.states.some((value) => value?.["new:logs"]?.form.title === "My explicit title"), "Title acceptance/manual edits use the existing recoverable draft cache");

const draft = { section: "logs", originalId: "", title: "", body: ":::note A heading\nBody.\n:::" };
for (const section of ["games", "projects", "setup", "archive"]) assert.equal(untitled.suggest({ ...draft, section }), null);
assert.equal(untitled.suggest({ ...draft, originalId: "saved-log" }), null);
assert.equal(untitled.suggest({ ...draft, title: "Written by me" }), null);
for (const heading of ["New Note", "27 / 10 / 2026 - New Note", "27 / 10 / 2026", "Untitled note", "Current note", ""]) {
  assert.equal(untitled.suggest({ ...draft, body: `:::note ${heading}\nBody.\n:::` }), null);
}
assert.equal(untitled.suggest({ ...draft, body: "# An arbitrary body heading\nBody text." }), null, "No guessing from prose or unrelated body text");
assert.equal(untitled.suggest({ ...draft, body: `${draft.body}\n\n:::note Second heading\nBody.\n:::` }), null, "Multi-note logs have no ambiguous suggestion");
assert.equal(untitled.suggest({ ...draft, body: ":::note 27 / 10 / 2026 - A  spaced   title\r\nBody.\r\n:::\r\n\r\n## Update Index\r\n- Old activity" }), "A spaced title");

const fullStudio = await fixture({ create: true, inline: false, manual: true });
assert.equal(fullStudio.heading().props.form.title, "", "New Logs also have an empty title in the legacy editor");
await fullStudio.save();
assert.equal(fullStudio.calls.length, 0, "Legacy new Logs also require a deliberate title before any write");
fullStudio.content().props.onBodyCommit(":::note 27 / 10 / 2026 - The same shortcut\nFixture body.\n:::");
fullStudio.heading().props.titleAction.props.onClick({ currentTarget: { closest: () => null } });
assert.equal(fullStudio.heading().props.form.title, "The same shortcut", "Both local editing views share the same explicit action");
console.log("Log title suggestions: explicit acceptance, date/placeholder handling, single-note scope, draft retention, stale callbacks, saved/manual title protection and editor parity passed.");

const gameControls = await fixture({ section: "games", manual: true });
const controls = () => gameControls.layout().props.controls.type(gameControls.layout().props.controls.props);
const descendants = (node) => !node || typeof node !== "object" ? [] : [node, ...[node.props?.children].flat(Infinity).flatMap(descendants)];
const selects = () => descendants(controls()).filter((node) => node.type === "select");
const html = renderToStaticMarkup(gameControls.layout().props.controls);
assert.equal((html.match(/class="studio-select-control"/g) || []).length, 2);
assert.equal((html.match(/<select /g) || []).length, 2, "Native selects retain keyboard, type-ahead and touch picker behavior");
assert.equal((html.match(/aria-hidden="true"/g) || []).length, 2, "Decorative chevrons do not change the control's accessible name");
selects().find((node) => node.props["aria-label"] === "Session activity").props.onChange({ target: { value: "active" } });
assert.equal(gameControls.layout().props.record.meta.gameActivity, "active");
selects().find((node) => node.props["aria-label"] === "Log placement").props.onChange({ target: { value: "past" } });
assert.equal(selects().length, 1, "Changing placement still conditionally hides session activity");
assert.equal(gameControls.layout().props.record.meta.gamePlacement, "past");
await gameControls.layout().props.onSave();
const placementWrite = gameControls.calls.find((call) => call.url === "/api/studio/entry").payload;
assert.equal(placementWrite.gamePlacement, "past");
assert.equal(placementWrite.gameActivity, "active");
assert.equal(placementWrite.steamAppId, "123");
assert.match(source, /Setup folder\s*<span className="studio-select-control">\s*<select/);
const editorCss = read("app/studio/studio.css");
assert.match(editorCss, /\.studio-select-control > select:not\(\[multiple\]\)\s*\{/);
assert.match(editorCss, /appearance: none; -webkit-appearance: none/);
assert.match(editorCss, /\.studio-select-control\s*\{[^}]*align-self: start; block-size: fit-content/);
assert.match(editorCss, /\.studio-select-control > svg\s*\{[^}]*pointer-events: none/);
assert.match(read("app/globals.css"), /\.timeline-source select\s*\{[^}]*color-scheme: dark/);
console.log("Editor selectors: shared native styling, labelled controls, decorative arrows, unchanged placement/activity behavior and save payload passed.");

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
