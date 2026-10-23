import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";

const read = (file) => readFileSync(new URL(`../${file}`, import.meta.url), "utf8");
function declaration(file, name) {
  const source = read(file);
  const ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, file.endsWith(".ts") ? ts.ScriptKind.TS : ts.ScriptKind.JS);
  const node = ast.statements.find((node) => ts.isFunctionDeclaration(node) && node.name?.text === name);
  assert.ok(node, `${name} exists in ${file}`);
  return node.getText(ast).replace(/^export\s+/, "");
}
const names = ["latestSectionNote", "noteEntries", "splitUpdateIndex", "noteTitleDate", "activityTraceTitle", "excerptFromBody", "cleanExcerptLine", "compareLogWritingOrder", "logArchiveDate"];
const react = vm.createContext({});
const pages = vm.createContext({});
vm.runInContext(ts.transpileModule(names.map((name) => declaration(["compareLogWritingOrder", "logArchiveDate"].includes(name) ? "lib/log-archive.ts" : "components/archive/record-utils.ts", name)).join("\n"), { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText, react);
vm.runInContext(names.map((name) => declaration("static-app.js", name)).join("\n"), pages);
const record = (id, date, body, samples = []) => ({ id, title: id, section: "projects", updated: date, body, meta: { samples } });
const records = [
  record("newer-metadata", "2026-10-23", ":::note 20 / 10 / 2026 - Older note\nOld body.\n:::"),
  record("latest-writing", "2026-05-01", ":::note 22 / 10 / 2026 - New writing\n**Progress** on [the project](https://example.com).\n:::"),
  { ...record("not-a-project", "2026-10-23", "Ignore me"), section: "games" }
];
const original = JSON.stringify(records);
for (const context of [react, pages]) {
  const latest = context.latestSectionNote(records, "projects");
  assert.equal(latest.record.id, "latest-writing", "Use written-note dates, not just metadata edits");
  assert.equal(latest.title, "New writing");
  assert.equal(latest.excerpt, "Progress on the project.");
  assert.equal(latest.date, "2026-10-22");
  assert.equal(context.latestSectionNote([], "projects"), null);
  assert.equal(context.latestSectionNote([record("empty", "2026-10-23", "")], "projects"), null);
  const fallback = context.latestSectionNote([record("undated", "2026-10-21", "A plain project note.")], "projects");
  assert.equal(fallback.date, "2026-10-21");
  assert.equal(fallback.excerpt, "A plain project note.");
  for (const source of ["/media/sample.webp", "public/media/sample.webp", "./public/images/sample.jpg"]) {
    assert.equal(context.latestSectionNote([record("image", "2026-10-23", "Body", [source])], "projects").image, source);
  }
  for (const source of ["https://example.com/a.jpg", "javascript:alert(1)", "/media/movie.gif", "/media/movie.mp4", "/media/../secret.png", "/media/a.svg", '/media/a" onerror="x.png']) {
    assert.equal(context.latestSectionNote([record("image", "2026-10-23", "Body", [source])], "projects").image, "", "No remote, active or animated preview media");
  }
  const games = [
    { ...record("older-session", "2026-10-23", ":::note 20 / 10 / 2026 - Older session\nOld session text.\n:::"), section: "games", playtime: "999h" },
    { ...record("latest-session", "2026-05-01", ":::note 22 / 06 / 2017 - A retrospective\nAn old story.\n:::\n:::note 22 / 10 / 2026 - In the ruins\n![Session shot | banner | full=/media/full.png](/media/session.webp)\nA session worth writing about.\n:::"), section: "games" }
  ];
  const session = context.latestSectionNote(games, "games");
  assert.equal(session.record.id, "latest-session", "Steam stats or metadata edits must not choose the written session");
  assert.equal(session.title, "In the ruins");
  assert.equal(session.noteQuery, "22 / 10 / 2026 - In the ruins", "Open the selected session even when a historical note sits first");
  assert.equal(session.image, "/media/session.webp", "Use the session's display image, not the original full= image or game cover");
  assert.equal(session.excerpt, "A session worth writing about.");
  const text = "A little more space to read a field note. ".repeat(35);
  const logs = [
    { ...record("old-edited", "2026-10-23", text), section: "logs", writtenAt: "2026-10-20T12:00:00.000Z", writtenOrder: 1 },
    { ...record("new-writing", "2026-10-21", text), section: "logs", writtenAt: "2026-10-21T15:00:00.000Z", writtenOrder: 2 }
  ];
  const reading = context.latestSectionNote(logs, "logs");
  assert.equal(reading.record.id, "new-writing", "Editing an older log must not change writing order");
  assert.equal(reading.date, "2026-10-21");
  assert.ok(reading.excerpt.length > 180 && reading.excerpt.length <= 720, "Reading desk gets a fuller bounded excerpt");
  assert.equal(reading.image, "", "Logs stay text-focused");
  logs[0].writtenAt = logs[1].writtenAt;
  logs[0].writtenOrder = 3;
  assert.equal(context.latestSectionNote(logs, "logs").record.id, "old-edited", "Preserve the existing same-time writing-order tie break");
  for (const section of ["games", "logs"]) assert.equal(context.latestSectionNote([], section), null);
}
assert.equal(JSON.stringify(records), original, "Preview selection must not mutate authored records");
assert.equal(JSON.stringify(react.latestSectionNote(records, "projects")), JSON.stringify(pages.latestSectionNote(records, "projects")));
const exported = vm.createContext({ window: {} });
vm.runInContext(read("public/data/records.js"), exported);
const publicRecords = exported.window.__GESTALT_RECORDS;
assert.ok(publicRecords.some((record) => record.section === "projects" && !record.meta), "Exercise the actual flattened Pages data contract");
const realUpdate = pages.latestSectionNote(publicRecords, "projects");
assert.ok(realUpdate?.record.section === "projects" && realUpdate.excerpt);
const flat = records.map(({ meta, ...record }) => ({ ...record, ...meta }));
for (const section of ["projects", "games", "logs"]) {
  assert.equal(pages.latestSectionNote(flat, section)?.record.id, react.latestSectionNote(records, section)?.record.id);
  assert.equal(pages.latestSectionNote(flat, section)?.excerpt, react.latestSectionNote(records, section)?.excerpt);
  assert.ok(pages.latestSectionNote(publicRecords, section)?.excerpt, `Real flattened ${section} records render`);
}
const render = vm.createContext({ latestSectionNote: pages.latestSectionNote, readableDate: (value) => value, escapeHtml: (value) => String(value).replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;").replaceAll(">", "&gt;") });
vm.runInContext(declaration("static-app.js", "renderSectionNotePreview"), render);
const html = render.renderSectionNotePreview([record('<unsafe"id>', "2026-10-23", '<script>alert("x")</script>')], "projects");
assert.ok(!html.includes("<script>"));
assert.ok(html.includes('data-open-content="notes"') && html.includes('data-open-record="&lt;unsafe&quot;id&gt;"'));
const focused = vm.createContext({ records, state: {}, window: { matchMedia: () => ({ matches: false }) }, stopRecordAccessSequence() {}, shouldPlayEntryAccess: () => false, render() {}, startRecordAccessSequence() {} });
vm.runInContext(declaration("static-app.js", "openRecord"), focused);
focused.openRecord(records[0].id, "notes", "22 / 10 / 2026 - A session");
assert.equal(focused.state.noteSearchQuery, "22 / 10 / 2026 - A session");
focused.openRecord(records[1].id);
assert.equal(focused.state.noteSearchQuery, "", "Normal record opening clears a previous session focus");
assert.ok(read("components/archive/record-window.tsx").includes("setNoteSearchQuery(initialNoteQuery)"));
const css = read("app/desktop-navigation.css");
assert.match(css, /\.section-note-preview\s*\{ display: none; \}/, "Legacy/mobile keep their existing layout");
assert.match(css, /min-width: 1600px/);
assert.match(css, /min-height: 850px/);
assert.match(css, /grid-template-columns: minmax\(0, 1fr\) calc\(284px/, "Keep original lane widths beside the preview");
assert.match(css, /section-page--logs \.section-note-layout[^}]+900px/, "Logs preserve their list width beside a wider reading desk");
assert.match(css, /--section-index-max-inline: var\(--dashboard-max-inline\)/, "Wide sections override the high-resolution legacy width cap through a token");
assert.match(read("app/globals.css"), /max-inline-size: var\(--section-index-max-inline, calc\(900px/, "High-resolution Logs must not squeeze the reading desk");
console.log("Section previews passed: written sessions, log chronology, bounded excerpts, safe still media, flattened Pages data, React parity, escaped output and isolated wide layout.");
