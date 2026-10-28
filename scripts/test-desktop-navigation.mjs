import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import navigation from "../public/desktop-navigation.js";
import recordMotion from "../public/record-motion.js";

const read = (file) => readFileSync(new URL(`../${file}`, import.meta.url), "utf8");
assert.equal(navigation.normalizeMode("auto"), "terminal", "Existing Auto-hide preferences migrate");
assert.equal(navigation.normalizeMode("terminal"), "terminal");
for (const value of [undefined, null, "dock", "fixed", "__proto__"]) assert.equal(navigation.normalizeMode(value), "fixed");
const values = new Map();
const storage = { getItem: (key) => values.get(key), setItem: (key, value) => values.set(key, value) };
navigation.saveMode("terminal", storage);
assert.equal(navigation.readMode(storage), "terminal");
assert.equal(values.size, 1);
const blockedStorage = { getItem() { throw Error("blocked"); }, setItem() { throw Error("blocked"); } };
assert.equal(navigation.readMode(blockedStorage), "fixed", "Legacy stays the default");
assert.doesNotThrow(() => navigation.saveMode("terminal", blockedStorage));
const browser = vm.createContext({});
vm.runInContext(read("public/desktop-navigation.js"), browser);
assert.equal(browser.GestaltDesktopNavigation.normalizeMode("auto"), "terminal");

const entries = [
  { section: "projects", date: "2026-10-20" }, { section: "projects", date: "2026-10-21" },
  { section: "games", date: "2026-10-22" }, { section: "logs", date: "2026-10-23", archived: false },
  { section: "logs", date: "2026-10-01", archived: true }, { section: "setup", date: "2026-02-31" },
  { section: "games", date: '<img src=x onerror="x">' }, { section: "unknown", date: "2099-01-01" },
  { section: "archive", date: "2026-09-15" }, { section: "system", date: "2099-01-01" }
];
const original = JSON.stringify(entries), rows = navigation.directoryRows(entries);
assert.equal(rows.length, 6);
assert.equal(rows[0].name, "01_dashboard");
assert.equal(rows[0].date, "2026-10-23");
assert.equal(navigation.directoryRows([{ section: "system", date: "2099-01-01" }])[0].date, "", "The system seed is not authored activity");
assert.equal(rows[1].date, "2026-10-21");
assert.equal(rows[3].date, "2026-10-23");
assert.equal(rows[4].date, "", "Invalid/missing dates stay empty");
assert.equal(rows[5].date, "2026-10-01", "Archive uses actual writing dates, not an invented archiving time");
assert.equal(navigation.directoryRows([{ section: "logs", date: "2026-10-01", archived: true }])[3].date, "");
assert.equal(JSON.stringify(entries), original);
assert.deepEqual(JSON.parse(JSON.stringify(browser.GestaltDesktopNavigation.directoryRows(entries))), rows);

class Node {
  attrs = new Map(); listeners = new Map(); children = new Map(); inert = false; dispatched = []; isConnected = true; tabIndex = 0;
  setAttribute(key, value) { this.attrs.set(key, value); }
  removeAttribute(key) { this.attrs.delete(key); }
  toggleAttribute(key, value) { if (value) this.attrs.set(key, ""); else this.attrs.delete(key); }
  hasAttribute(key) { return this.attrs.has(key); }
  querySelector(selector) { return this.children.get(selector) || null; }
  querySelectorAll(selector) { return selector === "video, audio" ? [] : this.buttons || []; }
  contains(node) { return node === this || [...this.children.values()].includes(node); }
  focus() { this.doc.activeElement = this; }
  closest(selector) { return this.selectors?.includes(selector) ? this : null; }
  addEventListener(name, fn) { if (!this.listeners.has(name)) this.listeners.set(name, new Set()); this.listeners.get(name).add(fn); }
  removeEventListener(name, fn) { this.listeners.get(name)?.delete(fn); }
  emit(name, args = {}) { for (const fn of this.listeners.get(name) || []) fn({ target: this, preventDefault() {}, stopPropagation() {}, ...args }); }
  dispatchEvent(event) { this.dispatched.push(event.type); this.emit(event.type); }
}
function fixture(saved = new Map(), withMotion = false) {
  const doc = new Node(); doc.hidden = false;
  const media = new Node(); media.matches = true;
  const reduced = new Node(); reduced.matches = false;
  const animations = [];
  let now = 0, timerId = 0;
  const timers = new Map();
  const host = { document: doc, Event, matchMedia: (query) => query.includes("prefers-reduced-motion") ? reduced : media,
    innerWidth: 1920, innerHeight: 1080, getComputedStyle: () => ({ transform: "matrix(1, 0, 0, 1, -450, -300)", opacity: "1" }), localStorage: {
    getItem: (key) => saved.get(key), setItem: (key, value) => saved.set(key, value)
  }, setTimeout(fn, delay) { const id = ++timerId; timers.set(id, { fn, due: now + delay }); return id; }, clearTimeout(id) { timers.delete(id); } };
  const advance = (ms) => {
    now += ms;
    for (const [id, timer] of [...timers]) if (timer.due <= now) { timers.delete(id); timer.fn(); }
  };
  function surface() {
    const names = ["shell", "sidebar", "terminal", "workspace", "backdrop", "row", "close", "minimize", "maximize", "restore", "hint", "hintAction", "search", "notices", "noticeButton", "noticeClose"];
    const nodes = Object.fromEntries(names.map((name) => [name, new Node()]));
    for (const node of Object.values(nodes)) node.doc = doc;
    const { shell, sidebar, terminal, workspace, backdrop, row, close, minimize, maximize, restore, hint, hintAction, search } = nodes;
    backdrop.selectors = close.selectors = ["[data-desktop-nav-dismiss]"];
    row.selectors = ["[data-directory-section]"];
    minimize.selectors = ["[data-desktop-terminal-minimize]"];
    maximize.selectors = ["[data-desktop-terminal-maximize]"];
    restore.selectors = ["[data-desktop-terminal-restore]"];
    hintAction.selectors = ["[data-system-notices-open]"];
    hint.children.set("button", hintAction);
    shell.children = new Map([[":scope > .sidebar", sidebar], [".desktop-nav-terminal", terminal], [":scope > .workspace", workspace], [".desktop-terminal-hint", hint], [".desktop-terminal-restore", restore]]);
    shell.children.set(".system-notices-panel", nodes.notices);
    shell.children.set("[data-system-notices-toggle]", nodes.noticeButton);
    nodes.noticeButton.selectors = ["[data-system-notices-toggle]", ".system-notices-panel, [data-system-notices-toggle]"];
    nodes.noticeClose.selectors = ["[data-system-notices-close]", ".system-notices-panel, [data-system-notices-toggle]"];
    nodes.notices.selectors = [".system-notices-panel, [data-system-notices-toggle]"];
    terminal.children = new Map([['[aria-current="page"]', row], ["[data-directory-section]", row], ["[data-desktop-terminal-maximize]", maximize], ["close", close], ["minimize", minimize]]);
    terminal.buttons = [minimize, maximize, close, row];
    terminal.getBoundingClientRect = () => ({ left: 510, top: 240, width: 900, height: 600 });
    restore.getBoundingClientRect = () => ({ left: 1780, top: 988, width: 44, height: 44 });
    terminal.animate = (frames, options) => {
      let resolve, reject;
      const finished = new Promise((yes, no) => { resolve = yes; reject = no; });
      const animation = { frames, options, finished, resolve, cancel() { reject(new Error("Cancelled")); } };
      animations.push(animation); return animation;
    };
    workspace.children.set('[aria-label="Search records"]', search);
    workspace.children.set("restore", restore);
    return nodes;
  }
  const nodes = surface(), controller = navigation.createController(host, withMotion ? recordMotion : undefined);
  doc.activeElement = nodes.search;
  const settings = { mode: "terminal", ready: true, busy: false, remember: false };
  const attach = (patch = {}, target = nodes.shell) => { Object.assign(settings, patch); controller.attach(target, settings); };
  const click = (node, target = nodes.shell) => target.emit("click", { target: node });
  const key = (value = "t", args = {}) => doc.emit("keydown", { key: value, ...args });
  return { doc, media, reduced, animations, saved, key, controller, attach, click, nodes, surface, advance, timers };
}
{
  const f = fixture(new Map(), true); f.attach(); f.key();
  assert.ok(!f.nodes.terminal.hasAttribute("data-terminal-restoring"), "Fresh opens construct the terminal");
  f.key("Tab");
  assert.ok(f.nodes.terminal.hasAttribute("data-terminal-ready"), "Keyboard navigation immediately settles construction");
  f.click(f.nodes.minimize);
  assert.equal(f.animations.length, 1);
  assert.ok(f.nodes.shell.hasAttribute("data-nav-retracting"), "Reserve the actual terminal restore slot while contracting");
  assert.ok(f.nodes.shell.hasAttribute("data-nav-open"), "Keep modal isolation until the real terminal finishes moving");
  assert.equal(f.nodes.workspace.inert, true);
  f.click(f.nodes.minimize); assert.equal(f.animations.length, 1);
  f.animations[0].resolve(); await Promise.resolve();
  assert.ok(f.nodes.shell.hasAttribute("data-nav-minimized"));
  assert.equal(f.nodes.terminal.hidden, true);
  assert.equal(f.nodes.workspace.inert, false);
  assert.equal(f.doc.activeElement, f.nodes.restore);
  assert.ok(!f.nodes.shell.hasAttribute("data-nav-retracting"));
  f.click(f.nodes.restore);
  assert.equal(f.nodes.terminal.hidden, false);
  assert.ok(f.nodes.terminal.hasAttribute("data-terminal-restoring"), "Restore skips frame reconstruction");
  f.click(f.nodes.close); f.key();
  assert.ok(!f.nodes.terminal.hasAttribute("data-terminal-restoring"));
  f.nodes.shell.emit("pointerdown", { target: f.nodes.row });
  assert.ok(f.nodes.terminal.hasAttribute("data-terminal-ready"), "Pointer interaction also settles construction");
  f.reduced.matches = true; f.click(f.nodes.minimize);
  assert.equal(f.animations.length, 1, "Reduced motion minimizes without animation");
  assert.equal(f.nodes.workspace.inert, false);
  f.controller.destroy();
}
for (const interrupt of ["hidden", "mode", "reattach", "destroy"]) {
  const f = fixture(new Map(), true); f.attach(); f.key(); f.click(f.nodes.minimize);
  if (interrupt === "hidden") { f.doc.hidden = true; f.doc.emit("visibilitychange"); }
  if (interrupt === "mode") f.attach({ mode: "fixed" });
  if (interrupt === "reattach") f.attach({}, f.surface().shell);
  if (interrupt === "destroy") f.controller.destroy();
  f.animations[0].resolve(); await Promise.resolve();
  assert.ok(!f.nodes.shell.hasAttribute("data-nav-retracting"), `${interrupt} clears motion state`);
  assert.equal(f.nodes.workspace.inert, false, `${interrupt} cannot strand modal isolation`);
  assert.ok(!f.nodes.shell.hasAttribute("data-nav-minimized"), "An interrupted old terminal cannot complete later");
  f.controller.destroy();
}
{
  const f = fixture(); const { shell, sidebar, terminal, workspace, backdrop, row, close, minimize, restore, maximize, search } = f.nodes;
  f.attach({ ready: false });
  assert.ok(shell.hasAttribute("data-nav-wide"), "Starts wide behind boot without reflow");
  assert.ok(!shell.hasAttribute("data-terminal-hint"), "Hint waits for boot and consent");
  f.key(); assert.ok(!shell.hasAttribute("data-nav-open"));
  f.advance(10000); assert.equal(f.timers.size, 0, "No notification timer runs during boot or consent");
  f.attach({ ready: true }); assert.ok(!shell.hasAttribute("data-terminal-hint"));
  f.advance(1199); assert.ok(!shell.hasAttribute("data-terminal-hint"));
  f.attach(); assert.equal(f.timers.size, 1, "Renders do not duplicate or restart the delay");
  f.advance(1); assert.ok(shell.hasAttribute("data-terminal-hint"));
  f.key(); assert.ok(shell.hasAttribute("data-nav-open")); assert.equal(f.doc.activeElement, row);
  assert.equal(terminal.inert, false); assert.equal(sidebar.inert, true); assert.equal(workspace.inert, true);
  assert.ok(!shell.hasAttribute("data-terminal-hint"));
  assert.equal(f.saved.size, 0, "Continue once must not persist the hint acknowledgement");
  let shortcutStopped = false;
  f.key("~", { stopPropagation() { shortcutStopped = true; } }); assert.ok(shortcutStopped);
  f.key("Tab"); assert.equal(f.doc.activeElement, minimize);
  f.key("Tab", { shiftKey: true }); assert.equal(f.doc.activeElement, row);
  f.click(maximize); assert.ok(shell.hasAttribute("data-nav-maximized"));
  assert.equal(maximize.attrs.get("aria-label"), "Restore terminal size");
  f.click(maximize); assert.ok(!shell.hasAttribute("data-nav-maximized"));
  f.click(minimize);
  assert.ok(shell.hasAttribute("data-nav-minimized")); assert.ok(!shell.hasAttribute("data-nav-open"));
  assert.equal(workspace.inert, false); assert.equal(terminal.inert, true);
  assert.equal(terminal.attrs.get("aria-hidden"), "true"); assert.ok(!terminal.hasAttribute("aria-modal"));
  assert.equal(restore.inert, false, "Only the minimized icon remains interactive");
  assert.equal(f.doc.activeElement, workspace);
  f.click(restore); assert.ok(shell.hasAttribute("data-nav-open"));
  f.click(close); assert.ok(!shell.hasAttribute("data-nav-open")); assert.ok(!shell.hasAttribute("data-nav-minimized"));
  assert.equal(terminal.inert, true); assert.equal(restore.inert, true); assert.equal(f.doc.activeElement, workspace);
  f.key("T"); assert.ok(shell.hasAttribute("data-nav-open"));
  f.key("Escape"); assert.ok(!shell.hasAttribute("data-nav-open"));
  f.key(); f.click(backdrop); assert.equal(f.doc.activeElement, workspace);
  f.key(); f.click(row); assert.ok(shell.hasAttribute("data-nav-minimized"), "Selection leaves a restorable terminal icon");
  const replacement = f.surface(); f.attach({}, replacement.shell);
  assert.ok(replacement.shell.hasAttribute("data-nav-wide")); assert.ok(replacement.shell.hasAttribute("data-nav-minimized"));
  assert.equal(f.doc.activeElement, replacement.workspace, "Static root replacement restores keyboard focus");
  assert.equal(workspace.inert, false);
  assert.equal([...shell.listeners.values()].reduce((n, set) => n + set.size, 0), 0);
  f.attach({ mode: "fixed" }, replacement.shell);
  assert.ok(!replacement.shell.hasAttribute("data-nav-wide")); assert.equal(replacement.sidebar.inert, false);
  f.controller.destroy();
  assert.equal([...f.doc.listeners.values()].reduce((n, set) => n + set.size, 0), 0);
}
for (const args of [
  { target: { closest: () => ({}) } }, { ctrlKey: true }, { altKey: true }, { metaKey: true }, { repeat: true }, { isComposing: true }
]) {
  const f = fixture(); f.attach(); let consumed = false;
  f.key("t", { ...args, preventDefault() { consumed = true; } });
  assert.ok(!f.nodes.shell.hasAttribute("data-nav-open"));
  assert.equal(consumed, false, "Typing, IME, repeat and browser shortcuts remain untouched");
  f.controller.destroy();
}
for (const action of ["hidden", "busy", "dialog", "palette"]) {
  const f = fixture(); f.attach(); f.key();
  if (action === "hidden") { f.doc.hidden = true; f.doc.emit("visibilitychange"); }
  if (action === "busy") f.attach({ busy: true });
  if (action === "palette") f.attach({ palette: true });
  if (action === "dialog") { f.doc.children.set("dialog[open]", new Node()); f.attach(); }
  f.key(); assert.ok(!f.nodes.shell.hasAttribute("data-nav-open"), action + " blocks opening");
  assert.equal(f.nodes.workspace.inert, false); f.controller.destroy();
}
{
  const f = fixture(); f.attach(); f.key();
  f.media.matches = false; f.media.emit("change");
  assert.ok(!f.nodes.shell.hasAttribute("data-nav-wide")); assert.equal(f.nodes.sidebar.inert, false);
  assert.equal(f.nodes.terminal.inert, true); assert.equal(f.nodes.workspace.inert, false);
  f.media.matches = true; f.media.emit("change");
  assert.ok(f.nodes.shell.hasAttribute("data-nav-wide")); assert.ok(!f.nodes.shell.hasAttribute("data-nav-open"));
  f.controller.destroy();
}
{
  const f = fixture(); f.nodes.workspace.inert = true; f.attach(); f.key(); f.click(f.nodes.close);
  assert.equal(f.nodes.workspace.inert, true); f.controller.destroy(); assert.equal(f.nodes.workspace.inert, true);
}
{
  const f = fixture(); f.attach({ remember: true }); f.advance(1200); f.click(f.nodes.hintAction);
  assert.ok(f.nodes.shell.hasAttribute("data-notices-open"), "Clicking the landing notification opens System Notices");
  assert.equal(f.doc.activeElement, f.nodes.notices);
  f.click(f.nodes.noticeClose);
  assert.ok(!f.nodes.shell.hasAttribute("data-terminal-hint")); assert.equal(f.saved.get("gestalt.shortcut-notices"), "seen-with-web-search", "Acknowledgement persists only with consent");
  f.attach({}, f.surface().shell); f.advance(5000);
  assert.equal(f.timers.size, 0, "Root replacement cannot replay a dismissed notification during this visit");
  const returning = fixture(new Map([["gestalt.terminal-hint", "seen"]])); returning.attach({ remember: true });
  assert.ok(!returning.nodes.shell.hasAttribute("data-terminal-hint")); returning.advance(3000);
  assert.ok(returning.nodes.shell.hasAttribute("data-terminal-hint"), "A new visit ignores the obsolete permanent dismissal flag");
  f.controller.destroy(); returning.controller.destroy();
}
for (const reason of ["busy", "palette", "hidden", "mobile"]) {
  const f = fixture(); f.attach(); f.advance(800);
  if (reason === "busy") f.attach({ busy: true });
  if (reason === "palette") f.attach({ palette: true });
  if (reason === "hidden") { f.doc.hidden = true; f.doc.emit("visibilitychange"); }
  if (reason === "mobile") { f.media.matches = false; f.media.emit("change"); }
  if (reason === "fixed") f.attach({ mode: "fixed" });
  f.advance(5000); assert.equal(f.timers.size, 0);
  assert.ok(!f.nodes.shell.hasAttribute("data-terminal-hint"), `${reason} cancels the pending notification`);
  f.doc.hidden = false; f.media.matches = true;
  f.attach({ busy: false, palette: false, mode: "terminal" });
  f.advance(1199); assert.ok(!f.nodes.shell.hasAttribute("data-terminal-hint"));
  f.advance(1); assert.ok(f.nodes.shell.hasAttribute("data-terminal-hint"));
  f.controller.destroy(); assert.equal(f.timers.size, 0);
}
{
  const f = fixture(); f.attach(); assert.equal(f.timers.size, 1);
  f.controller.destroy(); assert.equal(f.timers.size, 0);
  f.advance(5000); assert.ok(!f.nodes.shell.hasAttribute("data-terminal-hint"), "No delayed work survives unmount");
}
{
  const f = fixture({ get() { throw Error("blocked"); }, set() { throw Error("blocked"); } });
  assert.doesNotThrow(() => { f.attach({ remember: true }); f.key(); f.click(f.nodes.close); });
  assert.ok(!f.nodes.shell.hasAttribute("data-terminal-hint"), "Blocked storage keeps dismissal for the visit");
  f.controller.destroy();
}
{
  const f = fixture(); f.attach(); const body = new Node(); body.tabIndex = -1; body.doc = f.doc;
  f.doc.activeElement = body; f.key(); f.click(f.nodes.close);
  assert.equal(f.doc.activeElement, f.nodes.workspace, "Body focus returns to the workspace, without falsely highlighting the palette");
  f.controller.destroy();
}
{
  const f = fixture(); f.attach(); f.key(); f.click(f.nodes.minimize);
  f.doc.activeElement = f.nodes.restore; f.click(f.nodes.restore); f.click(f.nodes.close);
  assert.equal(f.doc.activeElement, f.nodes.workspace, "Do not restore focus to a now-hidden minimized icon");
  f.controller.destroy();
}
const index = read("index.html");
{
  const f = fixture(); f.attach(); f.advance(1200);
  assert.ok(f.nodes.shell.hasAttribute("data-terminal-hint"));
  assert.equal(f.timers.size, 1, "A single dismissal deadline replaces the arrival deadline");
  f.advance(4999); assert.ok(f.nodes.shell.hasAttribute("data-terminal-hint"));
  f.attach(); f.advance(1);
  assert.ok(!f.nodes.shell.hasAttribute("data-terminal-hint"), "An untouched notification leaves after five seconds, not on every render");
  assert.equal(f.timers.size, 0);
  f.attach(); f.advance(20000);
  assert.ok(!f.nodes.shell.hasAttribute("data-terminal-hint"), "Expired hints do not replay within the visit");
  f.click(f.nodes.noticeButton);
  assert.ok(f.nodes.shell.hasAttribute("data-notices-open"), "The permanent shortcut reference remains available");
  f.controller.destroy();
}
for (const [enter, leave] of [["mouseenter", "mouseleave"], ["focusin", "focusout"]]) {
  const f = fixture(); f.attach(); f.advance(1200);
  f.nodes.hint.emit(enter); f.advance(10000);
  assert.ok(f.nodes.shell.hasAttribute("data-terminal-hint"), "Reading or focusing the notification pauses auto-dismissal");
  assert.equal(f.timers.size, 0);
  f.nodes.hint.emit(leave); f.advance(4999);
  assert.ok(f.nodes.shell.hasAttribute("data-terminal-hint"));
  f.advance(1); assert.ok(!f.nodes.shell.hasAttribute("data-terminal-hint"));
  f.controller.destroy();
  assert.equal([...f.nodes.hint.listeners.values()].reduce((n, set) => n + set.size, 0), 0, "Hint interaction handlers are cleaned up");
}
{
  const f = fixture(); f.attach({ remember: true }); f.advance(3000);
  const returning = fixture(f.saved); returning.attach({ remember: true }); returning.advance(5000);
  assert.ok(!returning.nodes.shell.hasAttribute("data-terminal-hint"), "Introduced shortcuts are not repeated on later visits with permission");
  assert.equal(returning.timers.size, 0);
  const noConsent = fixture(f.saved); noConsent.attach(); noConsent.advance(3000);
  assert.ok(noConsent.nodes.shell.hasAttribute("data-terminal-hint"), "Stored history is ignored without memory permission");
  f.controller.destroy(); returning.controller.destroy(); noConsent.controller.destroy();
}
{
  const f = fixture(); f.attach({ mode: "fixed" }); f.advance(3000);
  assert.ok(f.nodes.shell.hasAttribute("data-terminal-hint"), "Legacy visitors can discover the palette too");
  f.click(f.nodes.noticeButton);
  assert.ok(f.nodes.shell.hasAttribute("data-notices-open"));
  assert.equal(f.doc.activeElement, f.nodes.notices);
  assert.equal(f.nodes.noticeButton.attrs.get("aria-expanded"), "true");
  assert.equal(f.nodes.notices.inert, false);
  assert.equal(f.nodes.workspace.inert, false, "The small reference panel is not a full-screen modal");
  let consumed = false;
  f.doc.emit("click", { target: f.nodes.row, preventDefault() { consumed = true; } });
  assert.ok(consumed, "Outside dismissal consumes the underlying click");
  assert.ok(!f.nodes.shell.hasAttribute("data-notices-open"));
  assert.equal(f.doc.activeElement, f.nodes.noticeButton);
  f.click(f.nodes.noticeButton); f.key("Escape");
  assert.ok(!f.nodes.shell.hasAttribute("data-notices-open"));
  f.click(f.nodes.noticeButton); f.attach({ busy: true });
  assert.ok(!f.nodes.shell.hasAttribute("data-notices-open"));
  assert.equal(f.nodes.noticeButton.inert, true);
  f.attach({ busy: false }); f.click(f.nodes.noticeButton);
  f.media.matches = false; f.media.emit("change");
  assert.ok(!f.nodes.shell.hasAttribute("data-notices-open"));
  f.controller.destroy();
}
{
  const f = fixture(); f.attach(); f.click(f.nodes.noticeButton); f.key("t");
  assert.ok(f.nodes.shell.hasAttribute("data-nav-open"));
  assert.ok(!f.nodes.shell.hasAttribute("data-notices-open"));
  f.controller.destroy();
}
{
  const previous = fixture(new Map([["gestalt.shortcut-notices", "seen"]]));
  previous.attach({ remember: true }); previous.advance(1200);
  assert.ok(previous.nodes.shell.hasAttribute("data-terminal-hint"), "Earlier visitors are introduced to the new S shortcut once");
  previous.click(previous.nodes.noticeButton); previous.key("s");
  assert.ok(!previous.nodes.shell.hasAttribute("data-notices-open"), "S leaves the reference tray before web search opens");
  assert.ok(!previous.nodes.shell.hasAttribute("data-nav-open"), "S must not activate the Terminal shortcut");
  previous.controller.destroy();
}
{
  const f = fixture(); f.attach({ ready: false });
  assert.ok(!f.nodes.shell.hasAttribute("data-notices-visible"), "The tray still waits until startup is complete");
  f.attach({ ready: true, palette: true });
  assert.ok(f.nodes.shell.hasAttribute("data-notices-visible"), "Palette opening must not remove the icon or shift minimized controls");
  assert.equal(f.nodes.noticeButton.disabled, true, "Visibility does not bypass overlay interaction guards");
  f.attach({ palette: false }); f.key("t");
  assert.ok(f.nodes.shell.hasAttribute("data-notices-visible"), "Terminal opening keeps the icon visible behind its modal backdrop");
  assert.equal(f.nodes.noticeButton.disabled, true);
  f.key("Escape");
  assert.equal(f.nodes.noticeButton.disabled, false);
  f.media.matches = false; f.media.emit("change");
  assert.ok(!f.nodes.shell.hasAttribute("data-notices-visible"), "Desktop tray remains absent on mobile");
  f.controller.destroy();
}
assert.ok(index.indexOf("public/desktop-navigation.js") < index.indexOf("static-app.js"));
for (const file of ["scripts/prepare-pages.mjs", "scripts/publish-site.mjs"]) {
  assert.ok((read(file) + read("lib/publish-paths.mjs")).includes('"public/desktop-navigation.js"')); assert.ok((read(file) + read("lib/publish-paths.mjs")).includes('"app/desktop-navigation.css"'));
}
assert.ok(read("app/layout.tsx").includes('"./desktop-navigation.css"'));
assert.ok(read("components/archive/desktop-navigation.tsx").includes("controller.current?.destroy()"));
const source = read("public/desktop-navigation.js"), css = read("app/desktop-navigation.css");
assert.ok(read("components/archive/desktop-navigation.tsx").includes("navigation.createController(window, recordMotion)"), "React explicitly supplies the same motion helper as Pages");
for (const name of ["desktop-terminal-frame", "desktop-terminal-surface", "desktop-terminal-populate"]) {
  assert.ok(css.includes(`@keyframes ${name}`));
  assert.ok(!new RegExp(`animation:[^;]*${name}[^;]*infinite`).test(css), "Terminal construction is finite");
}
assert.match(css, /@keyframes desktop-terminal-surface\s*\{\s*0%, 28% \{ opacity: 0; clip-path: inset\(50% 0\); \}/, "The real terminal surface waits for its frame");
assert.match(css, /desktop-nav-terminal\[hidden\] \{ display: none !important; \}/, "Minimize hides the real terminal before releasing its filled animation");
assert.ok(css.includes(":not([data-terminal-restoring]):not([data-terminal-ready])"), "Restore and interaction bypass construction");
assert.match(css, /@media \(prefers-reduced-motion: reduce\)[\s\S]*desktop-nav-terminal[\s\S]*animation: none !important/);
assert.ok(!/fetch\(|setInterval|requestAnimationFrame/.test(source));
assert.ok(!/pointerenter|pointerleave/.test(source), "A real window needs no hover machinery");
assert.equal((source.match(/host\.setTimeout\(/g) || []).length, 1, "One cancellable timer handles introduction and dismissal without polling");
for (const file of ["static-app.js", "components/archive/desktop-navigation.tsx"]) {
  assert.ok(read(file).includes("data-system-notices-open"), "Both readers expose the clickable notification");
  assert.ok(read(file).includes("Press <kbd>S</kbd> to search the web") && read(file).includes("<dt><kbd>S</kbd></dt><dd>Web search</dd>"), "The existing introduction and notice reference teach S in both readers");
  assert.ok(!read(file).includes("data-desktop-terminal-hint-dismiss"), "No redundant close button remains on the landing notification");
}
assert.match(css, /desktop-terminal-hint\s*\{[^}]+inset-inline-end:/, "Hint sits at the right edge, not the middle");
for (const selector of ["workspace-window-tray", "system-notices-panel", "desktop-terminal-hint"]) {
  assert.match(css, new RegExp(`${selector}\\s*\\{[^}]+inset-inline-end: var\\(--window-tray-inline\\)`), "Tray and both notification surfaces share one right edge");
}
for (const selector of ["system-notices-panel", "desktop-terminal-hint"]) {
  assert.match(css, new RegExp(`${selector}\\s*\\{[^}]+inset-block-end: calc\\(var\\(--window-tray-bottom\\) \\+ var\\(--window-tray-control\\) \\+ var\\(--window-tray-popup-gap\\)\\)`), "Both notifications clear the button using the same scaled gap");
}
assert.ok(!/reclaim|shifting|5500/.test(source), "No obsolete handoff code");
assert.ok(!/backdrop-filter|\bfilter:|transition:.*(?:width|grid)/.test(css));
assert.match(css, /prefers-reduced-motion/);
assert.match(css, /max-width: 1180px/);
assert.match(css, /data-nav-wide\] > \.workspace[^}]+--sidebar-width: 0px/);
assert.match(css, /workspace > \.section-page\s*\{[^}]+max-inline-size: var\(--dashboard-max-inline\)/);
assert.ok(!css.includes("workspace:has(> .section-page)"));
assert.match(css, /section-split-grid\s*\{[^}]+1180px/);
assert.match(css, /section-page--logs \.section-record-grid\s*\{[^}]+900px/);
assert.match(css, /archive-manager\s*\{[^}]+240px/);
assert.match(css, /workspace > \.workspace-footer\s*\{[^}]+max-inline-size: var\(--dashboard-max-inline\)/);
assert.ok(!css.includes("desktop-nav-shutter"));
assert.match(css, /\.workspace-window-tray\s*\{ display: contents; \}/, "Legacy/mobile retain original restore positioning");
assert.match(css, /workspace-window-tray\s*\{[^}]+display: flex;/, "Minimized controls share one row instead of overlapping fixed coordinates");
assert.match(css, /desktop-terminal-bar\s*\{[^}]+38px/, "Keep the terminal titlebar compact");
assert.match(css, /desktop-nav-terminal\s*\{[^}]+block-size: min\(calc\(600px/, "The normal terminal has room below its directory, with a viewport height cap");
assert.ok(!css.includes("data-nav-minimized] > .desktop-nav-terminal"), "No minimized window floats over the page");
for (const file of ["static-app.js", "components/archive/desktop-navigation.tsx"]) {
  const render = read(file);
  assert.ok(render.includes("directoryRows(records.map((record) => ({ section: record.section, date: activityDate(record), archived: isLogArchivedByAge(record) }))"));
  assert.ok(render.includes('aria-label="Directory sections"'));
  assert.ok(render.includes("Eightmouse@Gestalt"));
  assert.ok(!render.includes("desktop-nav-edge") && !render.includes("data-desktop-nav-toggle"), "No side handle remains");
  assert.ok(render.includes("desktop-terminal-cursor"));
  assert.ok(render.includes(file === "static-app.js" ? "row.date ? readableDate(row.date)" : "row.date ? formatReadableDate(row.date)"));
}
const staticSource = read("static-app.js");
function staticFunction(name) {
  const start = staticSource.indexOf(`function ${name}(`);
  assert.ok(start >= 0);
  return staticSource.slice(start, staticSource.indexOf("\n}\n", start) + 2);
}
const renderContext = vm.createContext({ window: { GestaltDesktopNavigation: navigation }, records: entries,
  activityDate: (record) => record.date, isLogArchivedByAge: (record) => record.archived, state: { activeSection: "games" } });
vm.runInContext(`${staticFunction("readableDate")}\n${staticFunction("desktopDirectory")}\nvar markup = desktopDirectory();`, renderContext);
assert.equal((renderContext.markup.match(/data-directory-section/g) || []).length, 6);
assert.ok(renderContext.markup.includes('datetime="2026-10-22">22 / 10 / 2026'));
assert.ok(renderContext.markup.includes('data-open-section="games" aria-current="page"'));
assert.ok(renderContext.markup.includes('<time>--</time>'));
assert.ok(!renderContext.markup.includes("onerror"));
vm.runInContext(`${staticFunction("workspaceWindowTray")}\nvar tray = workspaceWindowTray();`, renderContext);
assert.match(renderContext.tray, /data-window-action="open" hidden>Restore active record/, "The real restore control stays hidden until minimized");
renderContext.state.panelMinimized = true;
vm.runInContext("tray = workspaceWindowTray();", renderContext);
assert.ok(renderContext.tray.indexOf("Restore terminal") < renderContext.tray.indexOf("Restore active record"), "Terminal restore is on the left");
assert.match(renderContext.tray, /data-window-action="open">Restore active record/);
renderContext.state.panelOpen = true;
vm.runInContext("tray = workspaceWindowTray();", renderContext);
assert.match(renderContext.tray, /data-window-action="open" hidden>Restore active record/);
const reactTray = read("components/archive-os.tsx").split('className="workspace-window-tray"')[1]?.split("</div>")[0];
assert.ok(reactTray?.indexOf("<DesktopTerminalRestore") < reactTray?.indexOf("Restore active record"), "Both readers use the same minimized-control order");
assert.ok(read("static-app.js").includes("syncDesktopNavigation();"));
assert.ok(read("static-app.js").includes('!clickTarget.closest("[data-directory-section]")'), "The palette outside-click guard must not swallow directory navigation");
assert.ok(read("components/archive-os.tsx").includes("useDesktopNavigation(shellRef"));
console.log("Desktop navigation passed: T shortcut, input guards, consent-aware hint, window controls, Legacy default, real dates, static reattach, mobile fallback and packaging.");
