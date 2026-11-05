import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import vm from "node:vm";
import ts from "typescript";
import { createElement, useEffect, useRef, useState } from "react";
import { renderToStaticMarkup } from "react-dom/server";

const require = createRequire(import.meta.url);
const postcss = createRequire(require.resolve("next/package.json"))("postcss");
const read = (file) => readFileSync(new URL(`../${file}`, import.meta.url), "utf8");
function functions(file, names) {
  const kind = file.endsWith("tsx") ? ts.ScriptKind.TSX : file.endsWith(".ts") ? ts.ScriptKind.TS : ts.ScriptKind.JS;
  const ast = ts.createSourceFile(file, read(file), ts.ScriptTarget.Latest, true, kind);
  return names.map((name) => {
    const node = ast.statements.find((node) => ts.isFunctionDeclaration(node) && node.name?.text === name);
    assert.ok(node, `${file}: ${name} exists`);
    return node.getText(ast);
  }).join("\n");
}
function compile(source, globals = {}) {
  const context = vm.createContext({ exports: {}, require, ...globals });
  vm.runInContext(ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX }
  }).outputText, context);
  return context;
}
const names = ["timelineSources", "groupTimelineItems", "timelineItemTitle"];
const policy = compile(functions("components/archive/timeline-utils.ts", names)).exports;
const staticContext = compile(functions("static-app.js", [...names, "renderTimelineResults", "timelineWindow", "changeTimelineSource", "readableDate", "recordStateKey", "escapeHtml"]));
const plain = (value) => JSON.parse(JSON.stringify(value));
const record = { id: "fixture", section: "logs", title: "Fixture", status: "Filed" };
const items = [
  { id: "a", kind: "note", content: "notes", date: "2026-10-22", title: "22 / 10 / 2026 - Fresh note", detail: "Fixture / Note 1", record },
  { id: "b", kind: "record", content: "overview", date: "2026-10-22", title: "Game updated", detail: "Play Log / Playing", record: { ...record, id: "game", section: "games", status: "Playing" } },
  { id: "c", kind: "record", content: "overview", date: "2026-10-20", title: "Older record updated", detail: "Field Note / Filed", record }
];
const before = JSON.stringify(items);
for (const source of ["all", "logs", "games", "projects", "invalid"]) {
  assert.deepEqual(plain(staticContext.groupTimelineItems(items, source)), plain(policy.groupTimelineItems(items, source)));
}
assert.deepEqual(plain(policy.groupTimelineItems(items)).map((group) => [group.date, group.items.map((item) => item.id)]), [["2026-10-22", ["a", "b"]], ["2026-10-20", ["c"]]]);
assert.deepEqual(plain(policy.timelineSources(items)), [{ id: "games", label: "Games", count: 1 }, { id: "logs", label: "Logs", count: 2 }]);
assert.deepEqual(plain(staticContext.timelineSources(items)), plain(policy.timelineSources(items)));
for (const title of ["22/10/2026 - A note", "22 / 10 / 2026: A note", "22/10/2026", "An undated title", "22/10/2026 | A note"]) {
  assert.equal(staticContext.timelineItemTitle({ ...items[0], title }), policy.timelineItemTitle({ ...items[0], title }));
}
assert.equal(policy.timelineItemTitle(items[0]), "Fresh note");
assert.equal(policy.timelineItemTitle(items[1]), "Game updated");
assert.equal(JSON.stringify(items), before, "Presentation does not reorder or edit archive content");

const dates = compile(functions("components/archive/record-utils.ts", ["formatReadableDate"])).exports;
const react = compile(`${functions("components/archive/timeline-window.tsx", ["TimelineWindow", "timelineStateKey"])}\nexports.Window = TimelineWindow;`, {
  ...policy, ...dates, useEffect, useRef, useState
});
const keyboard = compile(`${functions("components/archive/timeline-window.tsx", ["TimelineWindow", "timelineStateKey"])}\nexports.Window = TimelineWindow;`, {
  ...policy, ...dates, useEffect() {}, useRef: () => ({ current: null }), useState: (value) => [value, () => {}]
});
let closed = 0;
const windowElement = keyboard.exports.Window({ items, onClose() { closed++; }, onOpenRecord() {} });
for (const change of [{ key: "Enter" }, { defaultPrevented: true }, { repeat: true }, { ctrlKey: true }, { altKey: true }, { metaKey: true }, { nativeEvent: { isComposing: true } }]) {
  windowElement.props.onKeyDown({ key: "Escape", nativeEvent: {}, preventDefault() { assert.fail("Unrelated or consumed keys stay native"); }, stopPropagation() {}, ...change });
}
assert.equal(closed, 0);
let prevented = false, stopped = false;
windowElement.props.onKeyDown({ key: "Escape", nativeEvent: {}, preventDefault() { prevented = true; }, stopPropagation() { stopped = true; } });
assert.equal(closed, 1, "Escape closes the React timeline just as it does on Pages");
assert.ok(prevented && stopped, "Closing cannot also trigger a background shortcut");
assert.match(functions("static-app.js", ["syncRecordFocus"]), /\.timeline-window/, "Pages reuses the same bounded focus helper");
for (const values of [[], items, [{ ...items[0], title: '<img src=x onerror="bad()">', detail: "Private-looking <script> text", record: { ...record, id: 'quote" onclick="bad()' } }]]) {
  staticContext.getTimelineItems = () => values;
  staticContext.state = { timelineOpen: true, timelineSource: "all" };
  const htmls = [
    renderToStaticMarkup(createElement(react.exports.Window, { items: values, onClose() {}, onOpenRecord() {} })),
    staticContext.timelineWindow()
  ];
  for (const html of htmls) {
    assert.equal((html.match(/class="timeline-registration" aria-hidden="true"/g) || []).length, 1, "Both readers have one decorative time register");
    assert.match(html, /role="dialog" aria-modal="true" tabindex="-1"/, "Both timelines announce and focus the active window");
    assert.equal((html.match(/class="timeline-day"/g) || []).length, new Set(values.map((item) => item.date)).size);
    assert.ok(html.includes(`Showing ${values.length} of ${values.length} recent signals`));
    assert.ok(html.includes('aria-controls="timeline-results"'));
    assert.ok(!html.includes('<img src=x') && !html.includes('<script>'));
    assert.ok(!html.includes('id="quote" onclick="bad()"'));
    if (!values.length) assert.ok(html.includes("No signals in this view."));
    if (values === items) {
      assert.ok(html.indexOf("Fresh note") < html.indexOf("Game updated"));
      assert.ok(html.indexOf("Game updated") < html.indexOf("Older record updated"));
      assert.ok(!html.includes("22 / 10 / 2026 - Fresh note"), "Group date is not repeated in a note title");
    }
  }
}
staticContext.getTimelineItems = () => items;
staticContext.state = { timelineOpen: true, timelineSource: "all" };
class Node {
  innerHTML = "unchanged";
  scrollTop = 120;
  closest() { return this; }
}
const results = new Node();
staticContext.HTMLElement = Node;
staticContext.root = { querySelector: () => results };
staticContext.changeTimelineSource("games");
assert.equal(staticContext.state.timelineSource, "games");
assert.equal(results.scrollTop, 0);
assert.ok(results.innerHTML.includes("Game updated") && !results.innerHTML.includes("Fresh note"));
assert.ok(results.innerHTML.includes("Showing 1 of 3 recent signals"));
const filtered = results.innerHTML;
staticContext.changeTimelineSource("invalid");
assert.equal(results.innerHTML, filtered, "Invalid values cannot change the view");
staticContext.state.timelineOpen = false;
staticContext.changeTimelineSource("all");
assert.equal(results.innerHTML, filtered, "Closed windows do no filter work");
assert.ok(!functions("static-app.js", ["changeTimelineSource"]).includes("render();"), "Filtering does not rebuild or reopen the public shell");
assert.match(functions("static-app.js", ["openTimeline"]), /state\.timelineSource = "all"/);
assert.ok(!read("app/globals.css").includes(".timeline-metrics"), "Retired counter-card styles are removed");
assert.ok(!read("components/archive/timeline-window.tsx").includes("motion.article"), "CSS owns the same single entrance in both readers");
const sheet = postcss.parse(read("app/globals.css"));
for (const name of ["timeline-arrive", "timeline-register-line", "timeline-register-spine", "timeline-register-ticks", "timeline-ink-arrive"]) {
  const frames = sheet.nodes.find((node) => node.name === "keyframes" && node.params === name);
  assert.ok(frames, `${name} exists`);
  frames.walkDecls((decl) => assert.ok(["opacity", "transform"].includes(decl.prop), `${name} does not animate masks, filters or layout`));
}
const animated = [];
sheet.walkDecls("animation", (decl) => { if (decl.value.startsWith("timeline-")) animated.push(decl); });
assert.equal(animated.length, 7);
for (const decl of animated) {
  assert.ok(!decl.value.includes("infinite"), "The opening stops by itself");
  assert.ok(!/timeline-(day|list)|timeline-results/.test(decl.parent.selector), "Filtered contents do not own entrance animations");
  assert.ok(decl.value.endsWith("backwards"), "Finished entrances retain no forward animation layer");
}
const registration = sheet.nodes.find((node) => node.selector === ".timeline-registration");
assert.ok(registration.nodes.some((node) => node.prop === "pointer-events" && node.value === "none"));
const reduced = sheet.nodes.find((node) => node.name === "media" && node.params === "(prefers-reduced-motion: reduce)" && node.nodes.some((child) => child.selector === ".timeline-registration"));
assert.ok(reduced, "Reduced motion removes the register and all staged entrance animations");
assert.ok(reduced.nodes.some((node) => node.selector?.includes(".timeline-window > .timeline-body") && node.nodes.some((decl) => decl.prop === "animation" && decl.value === "none")));
console.log("Timeline checks passed: shared finite entrance, motion fallback, grouping/filter parity, stable chronology, escaping, empty states and non-replaying static updates.");
