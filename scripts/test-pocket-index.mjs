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
assert.match(pocket.bootMarkup, /<dt>Server<\/dt><dd>Online<\/dd>/);
assert.doesNotMatch(readFileSync(new URL("../public/pocket-index.js", import.meta.url), "utf8"), /fetch\(|navigator\.|setInterval\(/);
const read = (file) => readFileSync(new URL(`../${file}`, import.meta.url), "utf8");
assert.match(read("index.html"), /name="viewport"[^>]+viewport-fit=cover/);
assert.match(read("app/page.tsx"), /viewportFit:\s*"cover"/);
const css = read("app/pocket-index.css");
for (const side of ["top", "right", "bottom", "left"]) assert.ok(css.includes(`env(safe-area-inset-${side}, 0px)`));
assert.match(css, /\.pocket-header \{[^}]*padding: calc\(9px \+ var\(--pocket-safe-top\)\)/);
assert.match(css, /\.archive-shell:has\(> \.pocket-header\) > \.workspace \{[^}]*calc\(24px \+ var\(--pocket-safe-bottom\)\)/);
console.log("Pocket Index preferences, boot lifecycle, progress curves and record paging passed.");
