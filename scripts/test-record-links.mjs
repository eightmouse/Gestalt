import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import links from "../public/record-links.js";
import noteInline from "../public/note-inline.js";

const archive = "https://fixture.github.io/Gestalt/";
assert.equal(links.shareUrl(`${archive}index.html?tracking=private#old`, "a-record"), `${archive}#record=a-record`);
assert.equal(links.shareUrl("file:///desktop/index.html", "a-record"), null, "A local filesystem path is never copied");
assert.equal(links.shareUrl("https://login:secret@fixture.test/", "a-record"), null);
assert.equal(links.shareUrl(archive, "__new:editor-only"), null);
for (const hash of ["", "#other=a-record", "#record=../a-record", "#record=%3Cscript%3E", "#record=a&extra=1", "#record=" + "x".repeat(81)]) {
  assert.equal(links.recordId(hash), null, hash);
}
assert.equal(links.recordId("#record=a-record"), "a-record");
const games = ["persona-5-royal", "maple-story", "monster-hunter-world"];
const gameLabels = games.map((id) => links.traceId(id, "games"));
assert.equal(new Set(gameLabels).size, games.length, "Game labels distinguish records with the same sort priority");
gameLabels.forEach((label) => assert.match(label, /^#GAM-[0-9A-Z]{7}$/));
assert.equal(links.traceId(games[1], "games"), gameLabels[1], "Record labels do not depend on list position");
const noteId = "n-" + "a".repeat(32);
const newerId = "n-" + "b".repeat(32);
const exactLink = `${archive}#record=a-record&note=${noteId}`;
assert.equal(links.shareUrl(`${archive}?preview=private#record=a-record`, "a-record", noteId), exactLink);
assert.deepEqual(links.target(new URL(exactLink).hash), { recordId: "a-record", noteId });
assert.equal(links.target("#record=a-record&note=0"), null, "A shifting ordinal cannot become a note ID");
assert.equal(links.target("#record=a-record&note=main&note=main"), null);

const legacy = ":::previous-note One title\r\nA body.\r\n:::\r\n";
const migrated = noteInline.addNoteIds(legacy, () => noteId);
assert.equal(migrated.replace(` {#${noteId}}`, ""), legacy, "Backfill preserves exact author text and line endings");
assert.equal(noteInline.addNoteIds(migrated, () => assert.fail("Existing IDs must not be replaced")), migrated);
const moved = `:::note One title {#${newerId}}\nNewer note with the same title.\n:::\n${migrated.replace("One title", "Edited title").replace("A body.", "Edited body.")}`;
assert.equal(noteInline.noteIndexById(noteInline.parseNotes(moved), noteId), 1, "A newer sibling and a title/body edit do not affect the linked note");
assert.equal(noteInline.noteIndexById(noteInline.parseNotes(migrated + migrated), noteId), -1, "A duplicate ID must not open the wrong note");
assert.equal(noteInline.parseNotes("A standalone body.")[0].id, "main");

function browser(href) {
  const calls = [];
  const context = { location: new URL(href), history: { state: { unrelated: true } }, calls };
  for (const method of ["pushState", "replaceState"]) {
    context.history[method] = (state, _unused, url) => {
      calls.push(method);
      context.history.state = state;
      context.location = new URL(url);
    };
  }
  context.history.back = () => calls.push("back");
  return context;
}

const inArchive = browser(archive + "?theme=day#reference");
links.open(inArchive, "first-record");
assert.equal(inArchive.location.href, archive + "?theme=day#record=first-record");
assert.equal(inArchive.history.state.unrelated, true);
links.open(inArchive, "first-record");
links.open(inArchive, "second-record");
links.close(inArchive);
assert.deepEqual(inArchive.calls, ["pushState", "replaceState", "back"], "Switching active records must not build up a modal stack");

const inbound = browser(archive + "#record=shared-record");
links.open(inbound, "shared-record");
links.open(inbound, "another-record");
links.close(inbound);
assert.deepEqual(inbound.calls, ["replaceState", "replaceState"], "Closing a shared link never sends the visitor off-site");
assert.equal(inbound.location.href, archive);
assert.equal(inbound.history.state.unrelated, true);

const noteInbound = browser(exactLink);
links.open(noteInbound, "a-record", noteId);
assert.deepEqual(noteInbound.calls, [], "Reading a note URL preserves its exact target");
links.close(noteInbound);
assert.equal(noteInbound.location.href, archive);

const bad = browser(archive + "#record=%3Csvg%3E");
links.close(bad);
assert.equal(bad.location.href, archive);
const unrelated = browser(archive + "#footnote");
links.close(unrelated);
assert.deepEqual(unrelated.calls, []);

function copyControl(href, clipboard) {
  let selected = false;
  const status = { textContent: "" };
  const input = { hidden: true, focus() {}, select() { selected = true; } };
  const feedback = { querySelector: (selector) => selector === "input" ? input : status };
  const button = { ownerDocument: { defaultView: { location: { href }, navigator: { clipboard }, clearTimeout() {}, setTimeout() {} } }, closest: () => ({ querySelector: () => feedback }) };
  return { button, input, status, selected: () => selected };
}

let copied;
const success = copyControl(archive + "?private=extra", { writeText: (url) => { copied = url; } });
await links.copyFromControl(success.button, "first-record");
assert.equal(copied, archive + "#record=first-record");
assert.match(success.status.textContent, /copied/);
assert.equal(success.input.hidden, true);
const fallback = copyControl(archive, undefined);
await links.copyFromControl(fallback.button, "a-record", noteId);
assert.equal(fallback.input.value, exactLink);
assert.ok(fallback.selected() && !fallback.input.hidden, "A clipboard refusal leaves a selectable HTTPS link");

const index = readFileSync(new URL("../index.html", import.meta.url), "utf8");
assert.ok(index.indexOf("public/record-links.js") > 0 && index.indexOf("public/record-links.js") < index.indexOf("static-app.js"));
console.log("Record links passed: project subpath, ID and URL validation, safe history, and denied-clipboard recovery.");
