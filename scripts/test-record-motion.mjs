import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import motion from "../public/record-motion.js";

class Events {
  listeners = new Map();
  addEventListener(name, fn) { this.listeners.set(name, fn); }
  removeEventListener(name, fn) { if (this.listeners.get(name) === fn) this.listeners.delete(name); }
}
const doc = Object.assign(new Events(), { hidden: false });
const media = Object.assign(new Events(), { matches: false });
const animations = [];
let mediaPauses = 0;
const node = {
  hidden: false, inert: false, attributes: new Set(),
  getBoundingClientRect: () => ({ left: 100, top: 100, width: 900, height: 700 }),
  setAttribute(name) { this.attributes.add(name); }, removeAttribute(name) { this.attributes.delete(name); },
  querySelectorAll: () => [{ pause() { mediaPauses++; } }],
  animate(frames, options) {
    let resolve, reject;
    const finished = new Promise((yes, no) => { resolve = yes; reject = no; });
    const animation = { frames, options, finished, resolve, reject, cancel() { this.cancelled = true; reject(new Error("Cancelled")); } };
    animations.push(animation);
    return animation;
  }
};
const host = { document: doc, matchMedia: () => media, innerWidth: 1920, innerHeight: 1080, getComputedStyle: () => ({ transform: "matrix(1, 0, 0, 1, 0, -20)", opacity: "1" }) };
const target = { getBoundingClientRect: () => ({ left: 1700, top: 1000, width: 150, height: 40 }) };
const controller = motion.createController(host);
let completed = 0;
const start = (options = {}) => { node.hidden = false; controller.minimize({ node, target, onComplete: () => completed++, ...options }); };
start();
assert.equal(controller.busy, true);
assert.equal(node.hidden, false, "The actual window remains visible until its retraction finishes");
assert.equal(node.inert, true);
assert.equal(animations[0].options.duration, 330);
assert.ok(animations[0].frames[1].transform.includes("translate(1225px, 570px)"));
assert.ok(animations[0].frames[0].transform.includes("matrix(1, 0, 0, 1, 0, -20)"), "Existing Setup/window positioning is preserved");
let consumed = 0;
doc.listeners.get("click")({ preventDefault() { consumed++; }, stopImmediatePropagation() { consumed++; } });
assert.equal(consumed, 2, "Clicks cannot reach records behind the moving window");
start(); assert.equal(animations.length, 1, "Repeated minimizing cannot queue transitions");
animations[0].resolve(); await Promise.resolve();
assert.equal(completed, 1); assert.equal(node.hidden, true); assert.equal(node.inert, false);
assert.equal(mediaPauses, 1, "Hidden media stops playing without discarding its DOM or position");
assert.equal(controller.busy, false); assert.equal(doc.listeners.size, 0); assert.equal(media.listeners.size, 0);
assert.equal(node.attributes.size, 0, "Transient compositor hint is removed");
start(); controller.cancel(); await Promise.resolve();
assert.equal(completed, 1, "Navigation/unmount cancellation does not hide a different record later");
assert.equal(node.hidden, false); assert.equal(doc.listeners.size, 0);
start(); doc.hidden = true; doc.listeners.get("visibilitychange")(); await Promise.resolve();
assert.equal(completed, 2); assert.equal(controller.busy, false);
doc.hidden = false;
start(); media.matches = true; media.listeners.get("change")(); await Promise.resolve();
assert.equal(completed, 3); assert.equal(media.listeners.size, 0);
const before = animations.length;
start(); assert.equal(completed, 4); assert.equal(animations.length, before, "Reduced motion finishes immediately");
media.matches = false;
start({ enabled: false }); assert.equal(completed, 5); assert.equal(animations.length, before, "Off preference also bypasses exit motion");
start(); animations.at(-1).reject(new Error("Interrupted")); await Promise.resolve();
assert.equal(completed, 6); assert.equal(controller.busy, false, "Animation cancellation cannot leave the archive blocked");
node.animate = () => { throw new Error("Unavailable compositor"); };
start(); assert.equal(completed, 7); assert.equal(doc.listeners.size, 0);
node.animate = undefined;
start(); assert.equal(completed, 8, "Unsupported animation APIs retain functional minimizing");
const read = (file) => readFileSync(new URL(`../${file}`, import.meta.url), "utf8");
const react = read("components/archive-os.tsx"), shell = read("static-app.js"), css = read("app/globals.css");
assert.ok(react.includes("(panelOpen || panelMinimized) && selectedRecord"), "React retains the same keyed record/editor while minimized");
assert.ok(react.includes("onMinimize={minimizeRecord}") && react.includes("onClick={minimizeRecord}"));
assert.ok(shell.includes("retained.insertAdjacentHTML") && shell.includes("append(retained)"), "Static restore reuses the actual note DOM across renders");
assert.ok(css.includes(".record-window[hidden] { display: none !important; }"));
for (const file of ["index.html", "scripts/prepare-pages.mjs", "scripts/static-cache.mjs", "lib/publish-paths.mjs"]) assert.ok(read(file).includes("record-motion"));
assert.ok(read("index.html").indexOf("public/record-motion.js") < read("index.html").indexOf("static-app.js"), "Motion helper loads before the reader");
assert.ok(!/setTimeout|setInterval|requestAnimationFrame|fetch\(/.test(read("public/record-motion.js")), "No polling, timers or networking in window motion");
console.log("Record motion passed: one-shot retraction, original transform, click-through guard, completion/cancellation, hidden-tab/reduced-motion/off fallbacks and retained-window integration.");
