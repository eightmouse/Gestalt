import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import noteInline from "../public/note-inline.js";
import pocket from "../public/pocket-index.js";

const read = (file) => readFileSync(new URL(`../${file}`, import.meta.url), "utf8");
function declarations(file, names) {
  const ast = ts.createSourceFile(file, read(file), ts.ScriptTarget.Latest, true);
  return names.map((name) => {
    const node = ast.statements.find((item) => ts.isFunctionDeclaration(item) && item.name?.text === name);
    assert.ok(node, `${file} implements ${name}`);
    return node.getText(ast).replace(/^export\s+/, "");
  }).join("\n");
}
const notes = ["fieldPaperExcerpt", "noteEntries", "splitUpdateIndex", "excerptFromBody", "cleanExcerptLine", "cleanSummaryText"];
const dates = ["partitionFieldLogs", "compareLogWritingOrder", "logArchiveDate", "isLogArchivedByAge"];
const react = vm.createContext({ noteInline, LOG_ARCHIVE_AFTER_DAYS: 7, LOG_DESK_KEEP: 3, millisecondsPerDay: 86400000 });
const pages = vm.createContext({ pocket, state: {}, logArchiveAfterDays: 7, logDeskKeep: 3, window: { GestaltNoteInline: noteInline }, readableDate: (value) => value, pocketIcon: () => "",
  escapeHtml: (value) => String(value).replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;").replaceAll(">", "&gt;") });
vm.runInContext(ts.transpileModule(`${declarations("components/archive/record-utils.ts", notes)}\n${declarations("lib/log-archive.ts", dates)}`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText, react);
vm.runInContext(declarations("static-app.js", [...notes, ...dates, "renderFieldPaperFace", "renderFieldPaperDeck", "renderFieldPapers"]), pages);

const log = (id, date, body = "Some words.") => Object.freeze({ id, section: "logs", title: id, writtenAt: `${date}T10:00:00.000Z`, writtenOrder: 1, updated: "2026-11-20", priority: 1, body });
const old = log("filed", "2026-11-13");
const records = Object.freeze([log("second", "2026-11-19"), old, log("first", "2026-11-20", ":::note First\n**Thoughts** from [today](https://example.invalid).\n![Remote](https://example.invalid/a.jpg)\n:::\n:::note Later\nNot the opening.\n:::"), log("third", "2026-11-18"), log("fourth", "2026-11-17"), log("fifth", "2026-11-16")]);
for (const context of [react, pages]) {
  const current = context.partitionFieldLogs(records, new Date("2026-11-20T12:00:00Z")).desk;
  assert.deepEqual(Array.from(current, ({ id }) => id), ["first", "second", "third", "fourth", "fifth"], "Edits do not bring a sheet forward or delay filing");
  assert.equal(context.fieldPaperExcerpt(current[0]), "Thoughts from today.");
  assert.equal(context.fieldPaperExcerpt(log("long", "2026-11-20", "Opening text. ".repeat(200))).length, 1800);
  assert.equal(context.fieldPaperExcerpt(log("two", "2026-11-20", "First paragraph.\n\nSecond paragraph.")), "First paragraph.\n\nSecond paragraph.");
  assert.equal(context.fieldPaperExcerpt({ ...old, body: "", summary: "No summary recorded." }), "");
  assert.equal(context.fieldPaperExcerpt({ ...old, body: "", summary: "**A caption.**" }), "A caption.");
  assert.equal(pocket.fieldPaperStack([]).record, undefined);
  assert.equal(pocket.fieldPaperStack(current.slice(0, 1)).edges.length, 0);
  assert.deepEqual(Array.from(pocket.fieldPaperStack(current.slice(0, 3)).edges, ({ id }) => id), ["second", "third"]);
  assert.equal(pocket.fieldPaperStack(current, "gone").record.id, "first");
  const last = pocket.fieldPaperStack(current, "fifth");
  assert.deepEqual(Array.from(last.edges, ({ id }) => id), ["third", "fourth"]);
  assert.equal(last.previous, "fourth");
  assert.equal(last.next, undefined);
}

assert.match(pages.renderFieldPapers([]), /No recent field notes/);
const unsafe = log('<paper"', "2026-11-20", 'Some <script>"text"</script>.');
const one = pages.renderFieldPapers([unsafe]);
assert.match(one, /data-open-record="&lt;paper&quot;" data-open-content="notes"/);
assert.doesNotMatch(one, /<script>|<img |field-paper-peek|field-paper-pager/);
const many = pages.renderFieldPapers(records.filter((record) => record !== old).sort(pages.compareLogWritingOrder));
assert.equal((many.match(/data-field-peek=/g) || []).length, 2);
assert.equal((many.match(/class="field-paper-face"/g) || []).length, 3, "Two rear sheets also print the full face");
assert.equal((many.match(/class="field-paper-excerpt"/g) || []).length, 3, "Each visible sheet prints its own excerpt");
assert.match(many, /data-field-position>1 \/ 5</);
assert.match(many, /data-field-step="previous"[^>]*aria-disabled="true"/);
assert.match(read("components/archive/section-page.tsx"), /<FieldPapers[^>]+onOpenRecord=\{\(record\) => onOpenRecord\(record, "notes"\)\}/);
assert.match(read("components/archive/section-page.tsx"), /field-paper-tools.*Add field note/);
assert.match(read("app/globals.css"), /\.field-paper-front\s*\{[^}]*aspect-ratio: 210 \/ 297/);
assert.match(read("components/archive/record-window.tsx"), /!paper \? <RecordAccessSurface \/> : null/);
assert.match(read("static-app.js"), /logs \? "" : recordAccessSurfaceMarkup\(\)/);
assert.doesNotMatch(read("app/desktop-navigation.css"), /section-note-preview|section-note-layout/);
// Field Desk: the same instrument plate as the other sections, with real counts only.
for (const file of ["components/archive/section-page.tsx", "static-app.js"]) {
  const source = read(file);
  assert.ok(source.includes("logs: \"Field Desk\""), `${file} names the Logs plate Field Desk`);
  assert.ok(/label: "DESK"/.test(source) && /label: "FILED"/.test(source) && /label: "LAST"/.test(source), `${file} reads desk, filed and newest date`);
}
const deskCss = read("app/globals.css");
assert.ok(deskCss.includes(".section-page:is(.section-page--games, .section-page--projects, .section-page--logs) .section-page-header {"), "Logs shares the instrument header plate");
const nightStart = deskCss.indexOf("/* At Night the paper is lit by the lamp");
const nightPaper = deskCss.slice(nightStart, deskCss.indexOf(".section-page--logs { grid-template-rows: minmax(0, 1fr); }", nightStart));
assert.ok(nightPaper.includes(":root:not([data-appearance=\"day\"]) .section-page--logs .field-paper-desk {") && !nightPaper.includes("is-field-paper-reader"), "Only the desk paper dims at Night; the reader keeps full-brightness paper");
assert.match(deskCss, /\.section-page--logs \{ grid-template-rows: minmax\(0, 1fr\); \}\s*\.section-page--logs > \.section-page-header \{ display: none; \}/, "Handheld keeps its own Logs layout");
console.log("Field papers passed: writing order and filing, shallow stacks, bounded plain-text excerpts, reader links, controls, escaped Pages output, no old preview panes, and the Field Desk plate.");
