import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import xTerminal from "../public/x-terminal.js";

class Node {
  constructor(name) { this.nodeName = name.toUpperCase(); this.childNodes = []; this.attrs = new Map(); this.dataset = {}; this.listeners = new Map(); this.style = {}; this.contentWindow = {}; }
  get attributes() { return [...this.attrs].map(([name, value]) => ({ name, value })); }
  setAttribute(name, value) { this.attrs.set(name, value); }
  getAttribute(name) { return this.attrs.get(name); }
  hasAttribute(name) { return this.attrs.has(name); }
  removeAttribute(name) { this.attrs.delete(name); }
  append(node) { node.remove(); node.parentNode = this; this.childNodes.push(node); }
  insertBefore(node, before) { node.remove(); node.parentNode = this; this.childNodes.splice(this.childNodes.indexOf(before), 0, node); }
  remove() { if (this.parentNode) { this.onDetach?.(); this.parentNode.childNodes.splice(this.parentNode.childNodes.indexOf(this), 1); this.parentNode = null; } }
  replaceChildren() { for (const node of [...this.childNodes]) node.remove(); }
  addEventListener(name, fn) { this.listeners.set(name, fn); }
  removeEventListener(name) { this.listeners.delete(name); }
  focus() { this.focused = true; }
  querySelector(selector) {
    const found = this.childNodes.find((node) => selector === "[data-x-terminal]" && node.hasAttribute("data-x-terminal"));
    return found || this.childNodes.map((node) => node.querySelector(selector)).find(Boolean) || null;
  }
}

function fixture(reduced = false, embedUrl = "public/x-embed.html") {
  let time = 0, nextId = 0;
  const timers = new Map(), listeners = new Map();
  const win = {
    location: { origin: "https://example.test" }, crypto: { randomUUID: () => `test-${++nextId}` }, performance: { now: () => time },
    matchMedia: () => ({ matches: reduced }),
    addEventListener: (name, fn) => listeners.set(name, fn), removeEventListener: (name) => listeners.delete(name),
    setTimeout(fn, delay) { const id = ++nextId; timers.set(id, { at: time + delay, fn }); return id; },
    clearTimeout: (id) => timers.delete(id)
  };
  const doc = { baseURI: "https://example.test/Gestalt/", defaultView: win, createElement: (tag) => new Node(tag) };
  const root = new Node("div"), ui = new Node("div"), nodes = new Map();
  root.ownerDocument = doc;
  root.querySelector = () => ui;
  ui.querySelector = (selector) => {
    if (!nodes.has(selector)) nodes.set(selector, new Node("div"));
    return nodes.get(selector);
  };
  const phases = [];
  const controller = xTerminal.mount(root, { embedUrl, onPhase: (phase) => phases.push(phase) });
  const click = (action) => root.listeners.get("click")({ target: { closest: () => ({ dataset: { xAction: action } }) }, preventDefault() {}, stopPropagation() {} });
  const frame = () => nodes.get("[data-x-viewport]")?.childNodes[0];
  const send = (phase, extras = {}) => listeners.get("message")?.({ origin: new URL(frame()?.src).origin, source: frame()?.contentWindow, data: { type: "gestalt-x-terminal", phase, session: new URL(frame()?.src).hash.slice("#session=".length) }, ...extras });
  function tick(ms) {
    const target = time + ms;
    while (true) {
      const next = [...timers].filter(([, value]) => value.at <= target).sort((a, b) => a[1].at - b[1].at)[0];
      if (!next) break;
      time = next[1].at; timers.delete(next[0]); next[1].fn();
    }
    time = target;
  }
  return { root, ui, nodes, phases, controller, click, frame, send, tick, timers, listeners };
}

const test = fixture();
assert.deepEqual(test.phases, ["idle"]);
assert.equal(test.nodes.get("[data-x-status]").textContent, "", "Idle access view has no redundant Memory State caption");
assert.ok(!test.ui.innerHTML.includes("data-x-label"), "No extra heading occupies the feed area");
assert.ok(!test.ui.innerHTML.includes('data-x-action="close"'), "Feed has no redundant close control");
assert.match(readFileSync(new URL("../app/globals.css", import.meta.url), "utf8"), /\.x-terminal \[data-x-action="close"\]\s*\{\s*display: none !important;/, "Hot-updated styles hide the retired control in retained older panels");
assert.equal(test.frame(), undefined, "No iframe or third-party request before explicit access");
test.click("access");
assert.equal(test.nodes.get("[data-x-status]").textContent, "", "Loading does not add an external-content caption");
const first = test.frame();
assert.ok(first.src.startsWith("https://example.test/Gestalt/public/x-embed.html#session="));
assert.equal(first.getAttribute("sandbox"), "allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox");
assert.equal(first.referrerPolicy, "no-referrer");
test.click("access");
assert.equal(test.frame(), first, "Repeated clicks never create duplicate frames");
test.send("ready", { source: {} });
test.send("ready", { origin: "https://untrusted.invalid" });
test.send("ready", { data: { type: "gestalt-x-terminal", session: "wrong", phase: "ready" } });
test.tick(100);
assert.equal(test.root.dataset.xState, "accessing", "Untrusted messages cannot reveal the frame");
test.send("ready"); test.tick(549);
assert.equal(test.root.dataset.xState, "accessing"); test.tick(1);
assert.equal(test.root.dataset.xState, "ready", "Reveal needs both real readiness and the short minimum transition");
test.controller.destroy();
assert.equal(test.frame(), undefined);
assert.equal(test.timers.size, 0);
assert.equal(test.listeners.size, 0);
const retry = fixture();
retry.click("access"); retry.tick(14000);
assert.equal(retry.root.dataset.xState, "unavailable", "Blocked requests end in a bounded fallback");
assert.equal(retry.nodes.get("[data-x-status]").textContent, "X terminal unavailable.", "Failure announcement stays concise");
assert.equal(retry.frame(), undefined);
retry.click("access");
assert.ok(retry.frame(), "Unavailable feed can be retried");
retry.controller.destroy(); retry.tick(20000);
assert.equal(retry.frame(), undefined, "Leaving the dashboard releases the provider frame");
assert.equal(retry.listeners.size, 0);
assert.equal(retry.timers.size, 0);
const reduced = fixture(true);
reduced.click("access"); reduced.send("ready"); reduced.tick(0);
assert.equal(reduced.root.dataset.xState, "ready");
reduced.controller.destroy();
assert.throws(() => fixture(false, "https://untrusted.invalid/x-embed.html"), /Invalid X terminal/);
const published = fixture(false, "https://eightmouse.github.io/Gestalt/public/x-embed.html");
published.click("access");
assert.ok(published.frame().src.startsWith("https://eightmouse.github.io/Gestalt/public/x-embed.html#"));
published.send("ready"); published.tick(650);
assert.equal(published.root.dataset.xState, "ready");
published.controller.destroy();
const localReader = readFileSync(new URL("../components/archive/x-terminal.tsx", import.meta.url), "utf8");
assert.match(localReader, /process\.env\.NODE_ENV === "development"\s*\? "https:\/\/eightmouse\.github\.io\/Gestalt\/public\/x-embed\.html"/, "Local editor never hosts third-party scripts on its own origin");
assert.ok(!readFileSync(new URL("../index.html", import.meta.url), "utf8").includes("platform.twitter.com"), "The public shell never preloads the provider script");

// Preserve a connected iframe and all of its ancestors during a static render.
function tree() {
  const root = new Node("root");
  let node = root;
  for (const tag of ["main", "section", "div", "article", "div", "div"]) {
    node.append(new Node("h2"));
    const child = new Node(tag); node.append(child); node = child;
  }
  node.setAttribute("data-x-terminal", "");
  return { root, retained: node };
}
const current = tree(), fresh = tree();
const iframe = new Node("iframe");
current.retained.append(iframe);
let detached = 0;
for (let node = iframe; node; node = node.parentNode) node.onDetach = () => detached++;
current.root.ownerDocument = { createElement: () => ({ content: fresh.root, set innerHTML(value) {} }) };
fresh.root.childNodes[1].setAttribute("class", "archive-shell has-record");
assert.equal(xTerminal.preserveRender(current.root, "fixture"), true);
assert.equal(detached, 0, "Opening/closing other windows never detaches the X browsing context");
assert.equal(current.root.querySelector("[data-x-terminal]"), current.retained);
assert.equal(current.root.childNodes[1].getAttribute("class"), "archive-shell has-record");

const bootstrap = readFileSync(new URL("../public/x-embed.js", import.meta.url), "utf8");
const requests = [], messages = [];
const child = { location: { hash: "#session=test-1" }, innerHeight: 120, innerWidth: 240, addEventListener() {}, parent: { postMessage: (data) => messages.push(data) } };
const widget = { style: {} };
child.twttr = { widgets: { createTimeline: async (source, target, options) => {
  assert.equal(source.screenName, "Eitomausu"); assert.equal(options.dnt, true); return widget;
} } };
const doc = { createElement: () => ({}), querySelector: () => ({}), head: { append: (script) => requests.push(script) } };
vm.runInNewContext(bootstrap, { window: child, document: doc, URLSearchParams });
assert.equal(requests.length, 1);
assert.equal(requests[0].src, "https://platform.twitter.com/widgets.js");
await requests[0].onload();
assert.equal(messages.at(-1).phase, "ready");
assert.equal(widget.style.height, "120px", "Inner widget fits the actual available frame height");
const direct = { location: { hash: "#session=test-1" } }; direct.parent = direct;
vm.runInNewContext(bootstrap, { window: direct, document: doc, URLSearchParams });
assert.equal(requests.length, 1, "Visiting the isolated helper directly never loads X");
console.log("X Terminal passed: explicit access, sandbox isolation, message validation, readiness, timeout/retry/cancel, reduced motion, teardown and connected static-frame preservation.");
