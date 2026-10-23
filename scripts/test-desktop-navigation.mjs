import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import navigation from "../public/desktop-navigation.js";

const read = (file) => readFileSync(new URL(`../${file}`, import.meta.url), "utf8");
assert.equal(navigation.normalizeMode("auto"), "auto");
for (const value of [undefined, null, "dock", "fixed", "__proto__"]) assert.equal(navigation.normalizeMode(value), "fixed");
const values = new Map();
const storage = { getItem: (key) => values.get(key), setItem: (key, value) => values.set(key, value) };
navigation.saveMode("auto", storage);
assert.equal(navigation.readMode(storage), "auto");
assert.equal(values.size, 1);
const blockedStorage = { getItem() { throw Error("blocked"); }, setItem() { throw Error("blocked"); } };
assert.equal(navigation.readMode(blockedStorage), "fixed");
assert.doesNotThrow(() => navigation.saveMode("auto", blockedStorage));
const browser = vm.createContext({});
vm.runInContext(read("public/desktop-navigation.js"), browser);
assert.equal(browser.GestaltDesktopNavigation.normalizeMode("auto"), "auto");

class Node {
  attrs = new Map(); listeners = new Map(); children = new Map(); inert = false; dispatched = [];
  setAttribute(key, value) { this.attrs.set(key, value); }
  removeAttribute(key) { this.attrs.delete(key); }
  toggleAttribute(key, value) { if (value) this.attrs.set(key, ""); else this.attrs.delete(key); }
  hasAttribute(key) { return this.attrs.has(key); }
  querySelector(selector) { return this.children.get(selector) || null; }
  contains(node) { return node === this || [...this.children.values()].includes(node); }
  focus() { this.doc.activeElement = this; }
  closest(selector) { return this.selectors?.includes(selector) ? this : null; }
  addEventListener(name, fn) { if (!this.listeners.has(name)) this.listeners.set(name, new Set()); this.listeners.get(name).add(fn); }
  removeEventListener(name, fn) { this.listeners.get(name)?.delete(fn); }
  emit(name, args = {}) { for (const fn of this.listeners.get(name) || []) fn({ target: this, preventDefault() {}, stopPropagation() {}, ...args }); }
  dispatchEvent(event) { this.dispatched.push(event.type); this.emit(event.type); }
}
function fixture({ reduced = false, desktop = true } = {}) {
  const doc = new Node(); doc.hidden = false; doc.activeElement = null;
  const media = new Node(); media.matches = desktop;
  const motion = new Node(); motion.matches = reduced;
  let now = 0, id = 0;
  const timers = new Map();
  const host = { document: doc, Event, matchMedia: (q) => q.includes("reduced-motion") ? motion : media,
    setTimeout(fn, delay) { const key = ++id; timers.set(key, { at: now + delay, fn }); return key; },
    clearTimeout(key) { timers.delete(key); } };
  function tick(ms) {
    const end = now + ms;
    while (true) {
      const next = [...timers].filter(([, t]) => t.at <= end).sort((a, b) => a[1].at - b[1].at)[0];
      if (!next) break;
      now = next[1].at; timers.delete(next[0]); next[1].fn();
    }
    now = end;
  }
  function surface() {
    const shell = new Node(), sidebar = new Node(), edge = new Node(), backdrop = new Node(), brand = new Node();
    for (const node of [shell, sidebar, edge, backdrop, brand]) node.doc = doc;
    edge.selectors = ["[data-desktop-nav-toggle]"];
    backdrop.selectors = ["[data-desktop-nav-dismiss]"];
    brand.selectors = [".nav-trigger, .brand"];
    shell.children = new Map([[":scope > .sidebar", sidebar], ["[data-desktop-nav-toggle]", edge]]);
    sidebar.children.set(".brand", brand);
    return { shell, sidebar, edge, backdrop, brand };
  }
  const nodes = surface();
  const controller = navigation.createController(host);
  const settings = { mode: "auto", ready: true, busy: false };
  const attach = (patch = {}, target = nodes.shell) => { Object.assign(settings, patch); controller.attach(target, settings); };
  const click = (node, detail = 1, target = nodes.shell) => target.emit("click", { target: node, detail });
  return { doc, media, motion, timers, tick, controller, attach, click, nodes, surface };
}

{
  const f = fixture(); const { shell, sidebar, edge, backdrop, brand } = f.nodes;
  f.attach({ ready: false }); f.tick(20000);
  assert.equal(f.timers.size, 0, "No hiding during boot or consent");
  f.attach({ ready: true }); f.tick(4500);
  f.attach(); f.tick(999);
  assert.ok(!shell.hasAttribute("data-nav-wide"), "Ordinary updates must not shorten or restart the introduction");
  f.tick(1); assert.ok(shell.hasAttribute("data-nav-shifting"));
  f.tick(150); assert.ok(shell.hasAttribute("data-nav-wide"));
  assert.equal(sidebar.inert, true);
  f.tick(270); assert.ok(!shell.hasAttribute("data-nav-shifting"));
  assert.equal(f.timers.size, 0, "No running timer after the one-time transition");
  edge.emit("pointerenter"); assert.ok(shell.hasAttribute("data-nav-open"));
  assert.equal(sidebar.inert, false);
  sidebar.emit("pointerenter"); sidebar.emit("pointerleave"); f.tick(500);
  assert.ok(!shell.hasAttribute("data-nav-open"));
  f.click(edge, 0); assert.equal(f.doc.activeElement, brand, "Keyboard reveal enters the navigation");
  f.doc.activeElement = null;
  f.attach({ palette: true });
  assert.ok(!shell.hasAttribute("data-nav-blocked"), "The palette must not hide the edge handle");
  assert.ok(shell.hasAttribute("data-nav-open"), "The drawer remains usable alongside the palette");
  f.click(backdrop); assert.ok(!shell.hasAttribute("data-nav-open"));
  assert.equal(f.doc.activeElement, edge);
  f.click(edge, 0);
  shell.emit("keydown", { key: "Escape" });
  assert.equal(f.doc.activeElement, edge);
  assert.equal(sidebar.inert, true);
  assert.ok(shell.hasAttribute("data-nav-wide"), "Hover, close and Escape never undo the wide layout");
  assert.equal(shell.dispatched.filter((type) => type === "gestalt:navigation-layout").length, 1, "Overlay cycles never trigger another layout notification");
  f.attach({ busy: true }); f.click(edge);
  assert.ok(!shell.hasAttribute("data-nav-open"), "Entries/editors block the drawer");
  f.attach({ busy: false, palette: false });
  const replacement = f.surface(); f.attach({}, replacement.shell);
  assert.ok(replacement.shell.hasAttribute("data-nav-wide"), "Static root rebuilds retain the settled layout");
  assert.equal([...shell.listeners.values()].reduce((n, set) => n + set.size, 0), 0, "Old static surfaces release listeners");
  f.attach({ mode: "fixed" }, replacement.shell);
  assert.ok(!replacement.shell.hasAttribute("data-nav-wide"));
  assert.equal(replacement.sidebar.inert, false);
  f.controller.destroy();
  assert.equal(f.timers.size, 0);
  assert.equal([...f.doc.listeners.values()].reduce((n, set) => n + set.size, 0), 0);
}
for (const action of ["hover", "focus", "hidden", "busy", "dialog", "palette"]) {
  const f = fixture(); const { shell, sidebar, brand } = f.nodes;
  f.attach(); f.tick(5499);
  if (action === "hover") sidebar.emit("pointerenter");
  if (action === "focus") { f.doc.activeElement = brand; shell.emit("focusin"); }
  if (action === "hidden") { f.doc.hidden = true; f.doc.emit("visibilitychange"); }
  if (action === "busy") f.attach({ busy: true });
  if (action === "palette") f.attach({ palette: true });
  if (action === "dialog") f.doc.children.set("dialog[open]", new Node());
  f.tick(10000);
  assert.ok(!shell.hasAttribute("data-nav-wide"), `${action} must prevent the initial layout change`);
  f.controller.destroy();
}
{
  const f = fixture({ reduced: true }); f.attach(); f.tick(5500);
  assert.ok(f.nodes.shell.hasAttribute("data-nav-wide"));
  assert.ok(!f.nodes.shell.hasAttribute("data-nav-shifting"));
  f.media.matches = false; f.media.emit("change");
  assert.ok(!f.nodes.shell.hasAttribute("data-nav-wide"), "Mobile/compact media returns to the original shell");
  assert.equal(f.nodes.sidebar.inert, false);
  f.media.matches = true; f.media.emit("change");
  assert.ok(f.nodes.shell.hasAttribute("data-nav-wide"));
  f.controller.destroy();
}
{
  const f = fixture(); f.attach(); f.tick(5500);
  f.attach({ mode: "fixed" }); f.tick(1000);
  assert.ok(!f.nodes.shell.hasAttribute("data-nav-wide"), "A preference change cancels the shutter safely");
  f.controller.destroy();
}

const index = read("index.html");
assert.ok(index.indexOf("public/desktop-navigation.js") < index.indexOf("static-app.js"));
for (const file of ["scripts/prepare-pages.mjs", "scripts/publish-site.mjs"]) {
  assert.ok(read(file).includes('"public/desktop-navigation.js"'));
  assert.ok(read(file).includes('"app/desktop-navigation.css"'));
}
assert.ok(read("app/layout.tsx").includes('"./desktop-navigation.css"'));
assert.ok(read("components/archive/desktop-navigation.tsx").includes("controller.current?.destroy()"));
const source = read("public/desktop-navigation.js");
assert.ok(!/fetch\(|setInterval|requestAnimationFrame/.test(source), "No network, polling or animation frame loop");
const css = read("app/desktop-navigation.css");
assert.ok(!/backdrop-filter|\bfilter:|transition:.*(?:width|grid)/.test(css), "No live blur or per-frame layout interpolation");
assert.match(css, /prefers-reduced-motion/);
assert.match(css, /max-width: 1180px/);
assert.match(css, /data-nav-wide\] > \.workspace[^}]+--sidebar-width: 0px/, "Wide-mode records must not reserve the hidden sidebar's width");
assert.match(css, /workspace > \.section-page\s*\{[^}]+max-inline-size: var\(--dashboard-max-inline\)/, "All sections share the dashboard's outer frame");
assert.ok(!css.includes("workspace:has(> .section-page)"), "Section navigation must not change the header's workspace padding");
assert.match(css, /section-split-grid\s*\{[^}]+1180px/, "Projects and Games retain comfortable matching lane widths");
assert.match(css, /section-page--logs \.section-record-grid\s*\{[^}]+900px/, "Log rows retain their original reading width alongside the reading desk");
assert.match(css, /archive-manager\s*\{[^}]+240px/, "Archive's details column stays bounded while files gain room");
assert.match(css, /workspace > \.workspace-footer\s*\{[^}]+max-inline-size: var\(--dashboard-max-inline\)/, "The footer terminal mark follows the shared wide frame");
assert.match(css, /transition: transform 560ms/, "Drawer pacing is independent of layout handoff timing");
assert.ok(!source.includes("pinned") && !css.includes("desktop-nav-pin"), "No redundant keep-open mode remains");
assert.match(css, /desktop-nav-interference/);
assert.ok(read("static-app.js").includes("syncDesktopNavigation();"));
assert.ok(read("components/archive-os.tsx").includes("useDesktopNavigation(shellRef"));
console.log("Desktop navigation passed: opt-in policy, shorter guarded handoff, stable overlays, palette access, Escape, static reattach, shared section frame, mobile fallback, cleanup and packaging.");
