import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import memory from "../public/memory-state.js";
import { updateStaticCacheTokens } from "./static-cache.mjs";

const read = (file) => readFileSync(new URL(`../${file}`, import.meta.url), "utf8");
function fixture() {
  const listeners = new Map(), timers = new Map(), motionListeners = new Set();
  let intersection, mutation, resize, writes = 0, covered = false, now = 0, nextTimer = 0, rectReads = 0, scrollWrites = 0;
  class Element {
    children = []; dataset = {}; text = ""; top = 0; clientHeight = 240; clientWidth = 320; blockHeight = 40; isConnected = true; handlers = new Map();
    set textContent(value) { writes++; this.text = value; this.children = []; }
    get textContent() { return this.text + this.children.map((child) => child.textContent).join(""); }
    get scrollTop() { return this.top; }
    set scrollTop(value) { scrollWrites++; this.top = Math.max(0, Math.min(value, this.scrollHeight - this.clientHeight)); }
    get scrollHeight() { return this.children.reduce((height, row) => height + row.blockHeight, 0); }
    append(...children) { writes++; for (const child of children) { child.parent = this; this.children.push(child); } }
    remove() { writes++; this.parent.children = this.parent.children.filter((child) => child !== this); }
    setAttribute() {}
    getBoundingClientRect() {
      rectReads++;
      const top = this.parent ? this.parent.children.slice(0, this.parent.children.indexOf(this)).reduce((height, row) => height + row.blockHeight, 0) - this.parent.scrollTop : 0;
      return { top, bottom: top + (this.parent ? this.blockHeight : this.clientHeight) };
    }
    addEventListener(name, fn) { this.handlers.set(name, fn); }
    removeEventListener(name) { this.handlers.delete(name); }
  }
  const list = new Element();
  const node = { isConnected: true, closest: () => ({ matches: () => covered }), querySelector: () => list };
  const document = { hidden: false, createElement: () => new Element(),
    addEventListener(name, fn) { listeners.set(name, fn); }, removeEventListener(name) { listeners.delete(name); } };
  const motion = { matches: false, addEventListener(name, fn) { motionListeners.add(fn); }, removeEventListener(name, fn) { motionListeners.delete(fn); } };
  const host = { document, matchMedia: () => motion,
    setTimeout(fn, delay) { timers.set(++nextTimer, { fn, at: now + delay }); return nextTimer; },
    clearTimeout(id) { timers.delete(id); },
    IntersectionObserver: class { constructor(fn) { intersection = fn; } observe() {} disconnect() { intersection = null; } },
    MutationObserver: class { constructor(fn) { mutation = fn; } observe() {} disconnect() { mutation = null; } },
    ResizeObserver: class { constructor(fn) { resize = fn; } observe() {} disconnect() { resize = null; } }
  };
  return { host, list, node, document, listeners, timers, motionListeners, get writes() { return writes; },
    get rectReads() { return rectReads; }, get scrollWrites() { return scrollWrites; },
    text: () => list.children.map((row) => row.children[1].textContent).join("\n"),
    advance(ms) {
      const until = now + ms; let steps = 0;
      while (true) {
        assert.ok(timers.size <= 1, "Only one writing/idle deadline exists per mounted surface");
        const next = [...timers].sort((a, b) => a[1].at - b[1].at)[0];
        if (!next || next[1].at > until) break;
        assert.ok(++steps < 10000, "Writing bursts cannot spin synchronously");
        now = next[1].at; timers.delete(next[0]); next[1].fn();
      }
      now = until;
    },
    resize(height, width = list.clientWidth) { list.clientHeight = height; list.clientWidth = width; resize?.(); },
    reduce(value) { motion.matches = value; for (const fn of motionListeners) fn(); },
    cover(value) { covered = value; mutation?.(); }, intersect(value) { intersection([{ isIntersecting: value }]); },
    visibility(value) { document.hidden = value; listeners.get("visibilitychange")?.(); } };
}
const a = fixture(), b = fixture();
memory.record("workspace.ready", {}, a.host); memory.record("workspace.ready", {}, a.host);
assert.equal(memory.entries(a.host).length, 1, "Ready is document-scoped and Strict Mode-safe");
assert.equal(memory.entries(b.host).length, 0, "No session crosses document/visitor boundaries");
const secret = "do-not-record-draft-query-or-credentials";
memory.record("section.enter", { section: "games", query: secret, title: secret }, a.host);
memory.record("record.open", { section: secret }, a.host);
memory.record(secret, { section: "games" }, a.host);
memory.record("note.expand", { index: secret }, a.host);
memory.record("note.expand", { index: -1 }, a.host);
memory.record("terminal.open", { source: secret }, a.host);
memory.record("content.select", { view: "notes", body: secret }, a.host);
memory.record("record.open", new Proxy({}, { get() { throw new Error(secret); } }), a.host);
assert.equal(memory.entries(a.host).length, 3);
assert.ok(!JSON.stringify(memory.entries(a.host)).includes(secret), "Only approved enum/numeric fields enter history");
assert.ok(Object.isFrozen(memory.entries(a.host)[0]));
const copy = memory.entries(a.host); copy.length = 0;
assert.equal(memory.entries(a.host).length, 3);
for (let i = 0; i < 100; i++) memory.record("note.expand", { index: i + 1 }, a.host);
assert.equal(memory.entries(a.host).length, memory.limit);
assert.equal(memory.entries(a.host)[0].detail, "index=69");
assert.equal(memory.entries(a.host).at(-1).detail, "index=100");
for (const entry of memory.entries(a.host)) assert.match(entry.time, /^\d{2}:\d{2}:\d{2}$/);
const dispose = memory.watchTrace(a.node, a.host);
assert.equal(a.list.children.length, 6, "Mounting shows a clipped recent snapshot, not a replay of 32 actions");
assert.match(a.text(), /record\.notes\.at\(99\)/);
assert.ok(!a.list.children.some((row) => "writing" in row.dataset));
memory.record("record.close", {}, a.host);
assert.ok(a.list.children.some((row) => "writing" in row.dataset), "A real visible action starts a small writing burst");
assert.ok(!a.text().includes("record.dissolve();"), "Code is written progressively, not displayed behind a decorative effect");
a.advance(5000);
assert.match(a.text(), /await record\.dissolve\(\);\nworkspace.focus\(\);/);
a.cover(true); const coveredWrites = a.writes;
memory.record("note.expand", { index: 2 }, a.host); a.advance(30000);
assert.equal(a.writes, coveredWrites, "Covered surfaces cancel work, including idle passages");
assert.equal(a.timers.size, 0);
a.cover(false);
assert.match(a.text(), /record\.notes\.at\(1\)/, "Returning catches up without a long replay");
memory.record("record.minimize", {}, a.host); a.advance(5000);
assert.match(a.text(), /record\.suspend\(\)/);
a.visibility(true);
const before = a.writes;
for (let i = 0; i < 40; i++) memory.record("record.restore", {}, a.host);
assert.equal(a.writes, before, "Hidden tabs collect a bounded buffer without DOM work");
a.visibility(false);
assert.ok(a.list.children.length <= 60);
assert.ok(!a.list.children.some((row) => "writing" in row.dataset), "Resuming does not replay hidden actions");
a.intersect(false); const offscreen = a.writes;
memory.record("terminal.open", { source: "keyboard" }, a.host);
assert.equal(a.writes, offscreen, "Offscreen traces do not paint");
a.intersect(true); assert.ok(a.writes > offscreen);
const eventsBeforeIdle = memory.entries(a.host).length;
a.advance(180000);
assert.ok(a.list.children.length <= 6, "Fully clipped lines are discarded, not retained as scrollback");
assert.ok(Number(a.list.children[0].dataset.line) > 10, "Visible lines retain their advancing numbers after pruning");
assert.match(a.text(), /\/\/ (between signals|a quiet surface|fragments at rest|waiting at the edge)/);
assert.equal(memory.entries(a.host).length, eventsBeforeIdle, "Decorative passages are never recorded as real activity");
a.reduce(true); const reducedWrites = a.writes;
a.advance(60000); assert.equal(a.timers.size, 0); assert.equal(a.writes, reducedWrites);
memory.record("record.close", {}, a.host);
assert.match(a.text(), /await record\.dissolve\(\);\nworkspace.focus\(\);/);
assert.equal(a.timers.size, 0, "Reduced motion shows complete action code with no idle writer");
a.resize(80);
assert.equal(a.list.children.length, 2, "Resizing also drops fully clipped lines without another writing loop");
assert.equal(a.list.children.at(-1).children[0].textContent, a.list.children.at(-1).dataset.line.padStart(3, "0"));
a.reduce(false); assert.equal(a.timers.size, 1);
dispose(); const stopped = a.writes;
memory.record("terminal.close", {}, a.host);
a.advance(60000);
assert.equal(a.writes, stopped, "Unmounting releases the subscription");
assert.equal(a.listeners.size, 0);
assert.equal(a.timers.size, 0); assert.equal(a.motionListeners.size, 0); assert.equal(a.list.handlers.size, 0);
const remount = memory.watchTrace(a.node, a.host);
assert.equal(a.listeners.size, 1); assert.ok(a.list.children.length <= 12, "Strict Mode remount replaces the snapshot, not duplicate history"); remount();

const burst = fixture();
memory.record("workspace.ready", {}, burst.host);
const stopBurst = memory.watchTrace(burst.node, burst.host);
for (let index = 1; index <= 100; index++) memory.record("note.expand", { index }, burst.host);
let latestBurstSeen = false;
for (let second = 0; second < 30; second++) {
  burst.advance(1000);
  latestBurstSeen ||= /record\.notes\.at\(99\)/.test(burst.text());
}
assert.ok(latestBurstSeen, "Rapid actions reach the latest note promptly, even if later idle writing prunes that line");
assert.ok(burst.list.children.length <= 60);
burst.visibility(true); const hiddenBurst = burst.writes;
burst.advance(60000); assert.equal(burst.writes, hiddenBurst); assert.equal(burst.timers.size, 0);
burst.visibility(false); burst.advance(2000);
burst.intersect(false); const outside = burst.writes;
burst.advance(60000); assert.equal(burst.writes, outside); assert.equal(burst.timers.size, 0);
burst.intersect(true); stopBurst();
const unavailable = fixture(); unavailable.host.IntersectionObserver = undefined; unavailable.host.MutationObserver = undefined;
const stopFallback = memory.watchTrace(unavailable.node, unavailable.host);
unavailable.advance(5000); assert.ok(unavailable.list.children.length);
unavailable.node.isConnected = false; const detached = unavailable.writes;
unavailable.advance(60000); assert.equal(unavailable.writes, detached); assert.equal(unavailable.timers.size, 0); stopFallback();

const numbering = fixture(); numbering.reduce(true);
const stopNumbering = memory.watchTrace(numbering.node, numbering.host);
for (let i = 0; i < 600; i++) memory.record("record.close", {}, numbering.host);
assert.equal(numbering.list.children.at(-1).children[0].textContent, "1200", "Numbers keep advancing beyond 999 even though earlier lines have been discarded");
assert.ok(numbering.list.children.length <= 6); stopNumbering();

const quiet = fixture();
memory.record("workspace.ready", {}, quiet.host);
const stopQuiet = memory.watchTrace(quiet.node, quiet.host);
memory.record("record.close", {}, quiet.host);
quiet.advance(5000);
assert.equal(quiet.list.children.length, 5);
assert.equal(quiet.rectReads, 0, "A stream that fits must not measure row rectangles during character bursts");
assert.equal(quiet.scrollWrites, 0, "A stream that fits needs no scroll writes");
quiet.resize(80);
assert.equal(quiet.list.children.length, 2, "Changing the viewport still follows and prunes immediately");
const settledReads = quiet.rectReads, settledScroll = quiet.scrollWrites;
quiet.resize(80);
assert.equal(quiet.rectReads, settledReads, "Unchanged size does not remeasure retained rows");
assert.equal(quiet.scrollWrites, settledScroll, "Unchanged size does not rewrite scroll position");
memory.record("record.open", { section: "games" }, quiet.host);
const growingRow = quiet.list.children.at(-1);
growingRow.blockHeight = 120;
const beforeWrap = quiet.scrollWrites;
quiet.advance(300);
assert.ok(quiet.scrollWrites > beforeWrap, "A wrapping line changes scroll height and is followed without waiting for ResizeObserver");
const overflowReads = quiet.rectReads;
quiet.resize(80);
assert.equal(quiet.rectReads, overflowReads, "An overflowing stream also skips unchanged geometry");
quiet.resize(80, 240);
assert.ok(quiet.rectReads > overflowReads, "Width changes invalidate retained row geometry even at the same scroll height");
stopQuiet();

const data = new Map(); let storageWrites = 0;
const storage = { getItem: (key) => data.get(key), setItem(key, value) { storageWrites++; data.set(key, value); } };
assert.equal(memory.saveMode("legacy", storage), false); assert.equal(storageWrites, 0);
data.set("gestalt.local-memory", "granted");
assert.equal(memory.saveMode("legacy", storage), true); assert.equal(memory.readMode(storage), "legacy");
assert.deepEqual([...data.keys()].sort(), ["gestalt.local-memory", "gestalt.memory-state"]);
const blocked = { getItem() { throw new Error("blocked"); }, setItem() { throw new Error("blocked"); } };
assert.equal(memory.readMode(blocked), "trace"); assert.equal(memory.saveMode("legacy", blocked), false);
const context = vm.createContext({}); vm.runInContext(read("public/memory-state.js"), context);
context.GestaltMemoryState.record("record.open", { section: "games" }, b.host);
assert.equal(context.GestaltMemoryState.entries(b.host)[0].detail, "section=games");
assert.equal(memory.entries(b.host).length, 0, "UMD and CommonJS stores are independent in the test VM");
const source = read("public/memory-state.js");
assert.ok(!/\b(fetch|XMLHttpRequest|sendBeacon|setInterval|requestAnimationFrame|eval|Function)\b/.test(source), "No telemetry, polling, frame loop or code execution");
assert.equal((source.match(/host\.setTimeout\(/g) || []).length, 1, "One controlled scheduler, not independent timers per character or line");
assert.ok(!/addEventListener\(["']scroll/.test(source), "The stream has no interactive scrollback listener");
assert.ok(!memory.renderShell().includes("PSEUDOCODE") && !memory.renderShell().includes("tabindex"));
assert.match(memory.renderShell(), /^<ol class="memory-trace-lines"[^>]*><\/ol>$/);
assert.doesNotMatch(read("components/archive/memory-state.tsx"), /workspace\.gs|memory-trace-header/);
assert.ok(!/addEventListener\(["'](?:input|keydown|click|pointermove)/.test(source), "No capture of raw input or browsing text");
for (const file of ["scripts/prepare-pages.mjs", "lib/publish-paths.mjs"]) {
  for (const asset of ["public/memory-state.js", "app/memory-state.css"]) assert.ok(read(file).includes(`"${asset}"`));
}
for (const asset of ["public/memory-state.js", "app/memory-state.css"]) {
  assert.ok(read("index.html").includes(asset));
  assert.ok(updateStaticCacheTokens(`<script src="${asset}"></script>`, "fresh").includes("v=fresh"));
}
assert.ok(read("index.html").indexOf('src="public/memory-state.js') < read("index.html").indexOf('src="static-app.js'));
assert.ok(read("components/archive/memory-state.tsx").includes('mode === "legacy" ? <MemoryLoop /> : <SessionTrace />'), "Legacy is preserved but not mounted invisibly behind trace");
console.log("Memory State passed: private actions, one-way code stream, clipped-line pruning with continuing numbers, bounded bursts/idle passages, single cancellable deadline, visibility/cover/reduced-motion/unmount guards, legacy preservation and packaging.");
