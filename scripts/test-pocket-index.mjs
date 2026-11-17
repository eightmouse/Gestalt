import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import pocket from "../public/pocket-index.js";

const storage = () => {
  const values = new Map();
  return { getItem: (key) => values.get(key), setItem: (key, value) => values.set(key, value) };
};
const signal = (matches) => {
  const listeners = new Map();
  return { matches, listeners, addEventListener: (key, value) => listeners.set(key, value), removeEventListener: (key) => listeners.delete(key) };
};
const width = signal(true), motion = signal(false), boot = signal(false);
const timers = new Map(), attributes = new Set();
let completed = 0, cancelled = 0, id = 0;
const host = {
  matchMedia: (query) => query.includes("reduced-motion") ? motion : width,
  localStorage: storage(), sessionStorage: storage(),
  setTimeout: (callback) => { timers.set(++id, callback); return id; },
  clearTimeout: (key) => timers.delete(key)
};
boot.parentElement = { hidden: false };
const meter = { animate: () => ({ cancel: () => cancelled++ }) };
const shell = {
  querySelector: (selector) => selector === ".pocket-boot-screen" ? boot : meter,
  setAttribute: (key) => attributes.add(key), removeAttribute: (key) => attributes.delete(key)
};
const start = (mode = "once", remember = true) => pocket.runBoot(shell, () => completed++, { mode, remember }, host);
const finish = () => boot.listeners.get("animationend")({ target: boot, animationName: "pocket-boot-wipe" });

assert.equal(pocket.saveBootMode("always", host), false, "No preference is stored without local memory");
assert.equal(pocket.readBootMode(host), "once");
host.localStorage.setItem("gestalt.local-memory", "granted");
assert.equal(pocket.saveBootMode("always", host), true);
assert.equal(pocket.readBootMode(host), "always");
start();
assert.equal(completed, 0);
assert.ok(attributes.has("data-pocket-booting"));
finish();
assert.equal(completed, 1);
assert.ok(boot.parentElement.hidden);
assert.equal(timers.size + motion.listeners.size + width.listeners.size + attributes.size, 0);
assert.equal(cancelled, 1);
start();
assert.equal(completed, 2, "Play once skips the same tab's next document");
start("always");
assert.equal(completed, 2);
width.matches = false;
width.listeners.get("change")();
assert.equal(completed, 3, "Resizing off the handheld boot releases the surface");
width.matches = true;
motion.matches = true;
start("always");
assert.equal(completed, 4, "Reduced motion skips even Always");
assert.equal(timers.size, 0);

function entryFixture() {
  let time = 0, sequence = 0;
  const tasks = new Map();
  const media = (matches) => ({
    matches, handlers: new Set(),
    addEventListener(_, callback) { this.handlers.add(callback); },
    removeEventListener(_, callback) { this.handlers.delete(callback); },
    set(matches) { this.matches = matches; for (const callback of [...this.handlers]) callback(); }
  });
  const touchWidth = media(true), reduced = media(false);
  const document = { createElement() {
    const attrs = new Map();
    return {
      ownerDocument: document, isConnected: true, children: [], attrs,
      append(...elements) { for (const element of elements) { element.parentElement = this; this.children.push(element); } },
      remove() { this.parentElement.children = this.parentElement.children.filter((node) => node !== this); },
      setAttribute(key, value) { attrs.set(key, value); },
      hasAttribute(key) { return attrs.has(key); },
      removeAttribute(key) { attrs.delete(key); }
    };
  } };
  const entry = document.createElement("article"), heading = document.createElement("h2"), title = document.createElement("span");
  title.textContent = "A field note";
  title.className = "record-title-text";
  heading.append(title);
  entry.append(heading);
  entry.querySelector = () => title;
  const browser = {
    matchMedia: (query) => query.includes("reduced-motion") ? reduced : touchWidth,
    performance: { now: () => time },
    setTimeout(callback, ms) { tasks.set(++sequence, { callback, at: time + ms }); return sequence; },
    clearTimeout: (id) => tasks.delete(id)
  };
  const advance = (to) => {
    while (true) {
      const next = [...tasks].sort((a, b) => a[1].at - b[1].at)[0];
      if (!next || next[1].at > to) break;
      tasks.delete(next[0]);
      time = next[1].at;
      next[1].callback();
    }
    time = to;
  };
  return { entry, heading, browser, advance, touchWidth, reduced, tasks };
}
for (const interrupt of [null, "close", "resize", "reduced-motion"]) {
  const { entry, heading, browser, advance, touchWidth, reduced, tasks } = entryFixture();
  const stop = pocket.playEntryAccess(entry, browser);
  assert.equal(entry.children[1].children[0].textContent, "ACCESSING");
  assert.equal(entry.children[1].attrs.get("aria-hidden"), "true");
  assert.ok(entry.hasAttribute("data-pocket-access") && !heading.hasAttribute("data-pocket-resolving"));
  assert.equal(pocket.playEntryAccess(entry, browser), undefined, "No duplicate readout over a live sequence");
  advance(200);
  assert.ok(heading.hasAttribute("data-pocket-resolving"), "The title resolves as the first readout hands off");
  if (interrupt === "close") stop();
  else if (interrupt === "resize") touchWidth.set(false);
  else if (interrupt === "reduced-motion") reduced.set(true);
  else advance(680);
  assert.equal(entry.children.length, 1);
  assert.ok(!entry.hasAttribute("data-pocket-access") && !heading.hasAttribute("data-pocket-resolving"));
  assert.equal(tasks.size + touchWidth.handlers.size + reduced.handlers.size, 0, "Settle and abort leave no work attached to the entry");
}
const reducedEntry = entryFixture();
reducedEntry.reduced.set(true);
assert.equal(pocket.playEntryAccess(reducedEntry.entry, reducedEntry.browser), undefined);
assert.equal(reducedEntry.tasks.size, 0, "Reduced motion starts no entry work");

const curves = [0, 0.23, 0.57, 0.999].map((sample) => pocket.meterFrames(() => sample));
assert.equal(new Set(curves.map((curve) => JSON.stringify(curve))).size, curves.length);
for (const curve of curves) {
  assert.equal(curve[0].transform, "scaleX(0)");
  assert.equal(curve.at(-1).transform, "scaleX(1)");
  const fills = curve.map((point) => Number(point.transform.slice(7, -1)));
  for (let i = 1; i < curve.length; i++) assert.ok(curve[i].offset > curve[i - 1].offset && fills[i] > fills[i - 1]);
}
assert.deepEqual(pocket.directory.map(([id]) => id), ["projects", "games", "logs", "setup", "archive"]);
const records = Array.from({ length: 13 }, (_, i) => `record-${i + 1}`);
const first = pocket.recordPage(records);
assert.deepEqual(first, { records: records.slice(0, 4), page: 0, pages: 4 });
assert.deepEqual(Array.from({ length: first.pages }, (_, page) => pocket.recordPage(records, page).records).flat(), records);
assert.deepEqual(pocket.recordPage(records, 99), { records: ["record-13"], page: 3, pages: 4 });
assert.equal(pocket.recordPage(records, -1).page, 0);
assert.equal(pocket.recordPage(records, 1.5).page, 0);
assert.deepEqual(pocket.recordPage([]), { records: [], page: 0, pages: 1 });
const dispatch = (id, day, section, recordId = id, content = "notes") => ({ id, date: `2026-11-${day}`, record: { id: recordId, section }, content });
const today = Date.parse("2026-11-17T12:00:00Z");
const firstNote = dispatch("note-1", 17, "games", "game", "notes");
const secondNote = dispatch("note-2", 11, "games", "game", "notes");
assert.deepEqual(pocket.recentDispatches("featured", [
  dispatch("future", 18, "projects"), dispatch("featured-note", 17, "logs", "featured"),
  dispatch("hardware", 17, "setup"), dispatch("metadata", 17, "projects", "metadata", "overview"),
  firstNote, firstNote, secondNote, dispatch("third-note", 11, "logs")
], today), [firstNote, secondNote], "At most two recent real notes, no future items, featured duplicates or non-note project updates");
assert.deepEqual(pocket.recentDispatches(undefined, [dispatch("stale", 10, "logs")], today), [], "Quiet weeks do not get archive filler");
assert.match(pocket.bootMarkup, /<dt>Server<\/dt><dd>Online<\/dd>/);
assert.doesNotMatch(readFileSync(new URL("../public/pocket-index.js", import.meta.url), "utf8"), /fetch\(|navigator\.|setInterval\(/);
const read = (file) => readFileSync(new URL(`../${file}`, import.meta.url), "utf8");
assert.match(read("index.html"), /name="viewport"[^>]+viewport-fit=cover/);
assert.match(read("app/page.tsx"), /viewportFit:\s*"cover"/);
const css = read("app/pocket-index.css");
for (const side of ["top", "right", "bottom", "left"]) assert.ok(css.includes(`env(safe-area-inset-${side}, 0px)`));
assert.match(css, /\.pocket-header \{[^}]*padding: calc\(9px \+ var\(--pocket-safe-top\)\)/);
assert.match(css, /\.archive-shell:has\(> \.pocket-header\) > \.workspace \{[^}]*calc\(24px \+ var\(--pocket-safe-bottom\)\)/);
assert.match(read("static-app.js"), /<button class="pocket-brand" type="button" aria-label="Gestalt home" data-home>/);
assert.match(read("components/archive/pocket-index.tsx"), /<button className="pocket-brand" type="button" aria-label="Gestalt home" onClick=\{onHome\}>/);
assert.match(read("components/archive-os.tsx"), /<PocketHeader[^>]+onHome=\{openHome\}/);
assert.match(css, /\.record-window \.record-link-button \{[^}]*inline-size: 44px;[^}]*block-size: 44px;[^}]*border: 0;/);
assert.doesNotMatch(css, /\[data-os-group="entry"\]/, "The shared Entry Animation preferences remain visible on handheld");
console.log("Pocket Index preferences, boot lifecycle, progress curves and record paging passed.");
