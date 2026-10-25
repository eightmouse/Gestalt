import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import behaviour from "../public/os-behaviour.js";

const read = (file) => readFileSync(new URL(`../${file}`, import.meta.url), "utf8");
const values = { entry: "first", startup: "full", seasonal: "auto", navigation: "fixed" };
const stored = new Map();
let writes = 0;
const storage = { getItem: (key) => stored.get(key), setItem(key, value) { writes++; stored.set(key, value); } };
assert.equal(behaviour.readStartupMode(storage), "full");
assert.equal(behaviour.saveStartupMode("quick", storage), false);
assert.equal(writes, 0, "No preference write without local-memory permission");
stored.set("gestalt.local-memory", "granted");
assert.equal(behaviour.saveStartupMode("quick", storage), true);
assert.equal(behaviour.readStartupMode(storage), "quick");
stored.set("gestalt.startup", '<script>');
assert.equal(behaviour.readStartupMode(storage), "full");
const blocked = { getItem() { throw new Error("Blocked"); }, setItem() { throw new Error("Blocked"); } };
assert.equal(behaviour.readStartupMode(blocked), "full");
assert.equal(behaviour.saveStartupMode("quick", blocked), false);
assert.equal(behaviour.normalizeStartupMode({}), "full");

for (const entry of ["first", "always", "off"]) {
  const html = behaviour.renderContent({ ...values, entry }, true);
  const radios = [...html.matchAll(/<input\b[^>]+>/g)].map((item) => item[0]);
  const group = radios.filter((input) => input.includes('data-os-preference="entry"'));
  assert.equal(group.length, 3);
  assert.equal(group.filter((input) => /\bchecked\b/.test(input)).length, 1);
  assert.ok(group.find((input) => /\bchecked\b/.test(input)).includes(`value="${entry}"`));
}
assert.ok(!behaviour.renderContent({ entry: '"><script>bad</script>', startup: "evil", seasonal: "evil", navigation: "evil" }, true).includes("<script>"));
const once = behaviour.renderContent(values, false);
assert.ok(once.includes("// SETTINGS") && once.includes('aria-label="Close Settings"'));
assert.ok(!once.includes("OS BEHAVIOUR"));
assert.equal((once.match(/ disabled/g) || []).length, 2, "Only the next-startup options need remembered storage");
assert.ok(once.includes("Local memory required."));

class Element {
  children = []; listeners = new Map(); isConnected = true; open = false; writes = 0; focused = false;
  constructor(tag) { this.tag = tag; this.dataset = {}; }
  setAttribute() {}
  set innerHTML(html) {
    this.html = html; this.writes++;
    this.inputs = [...html.matchAll(/<input\b[^>]+>/g)].map(([input]) => ({
      dataset: { osPreference: input.match(/data-os-preference="([^"]+)"/)[1] }, value: input.match(/value="([^"]+)"/)[1], checked: /\bchecked\b/.test(input), disabled: /\bdisabled\b/.test(input)
    }));
  }
  get innerHTML() { return this.html; }
  querySelectorAll() { return this.inputs; }
  querySelector(selector) { return (this.parts ??= {})[selector] ??= { textContent: "" }; }
  append(node) { node.parent = this; this.children.push(node); }
  remove() { this.parent.children = this.parent.children.filter((node) => node !== this); this.isConnected = false; }
  addEventListener(name, handler) { this.listeners.set(name, handler); }
  showModal() { this.open = true; }
  close() { this.open = false; }
  focus() { this.focused = true; }
  closest() { return null; }
  getClientRects() { return [{}]; }
}
const body = new Element("body"), trigger = new Element("button"), fallback = new Element("button");
const document = { body, activeElement: trigger, createElement: (tag) => new Element(tag), querySelectorAll: () => [fallback] };
const controller = behaviour.createController({ document });
let closes = 0, changes = 0, stopped = 0, rejectChange = false;
let selected = { ...values };
const handlers = { onClose() { closes++; }, onChange(key, value) {
  changes++;
  if (rejectChange) return false;
  selected = { ...selected, [key]: value };
  controller.update(selected, true);
} };
controller.open(selected, handlers, true);
const dialog = body.children[0];
assert.equal(dialog.tag, "dialog");
assert.equal(dialog.parent, body, "Preferences live outside contained/transformed reader surfaces");
assert.equal(dialog.open, true);
controller.open(selected, handlers, true);
assert.equal(body.children.length, 1);
assert.equal(dialog.writes, 1, "Updating preferences retains the same window, focus and scroll");
const click = (target) => ({ target, stopPropagation() { stopped++; }, preventDefault() {} });
const quick = dialog.inputs.find((input) => input.value === "quick");
quick.checked = true;
dialog.listeners.get("change")(click(quick));
assert.equal(selected.startup, "quick");
assert.equal(changes, 1);
assert.equal(dialog.writes, 1);
rejectChange = true;
const full = dialog.inputs.find((input) => input.value === "full");
full.checked = true;
dialog.listeners.get("change")(click(full));
assert.equal(full.checked, false, "A failed startup write reverts the selection");
assert.equal(dialog.querySelector("[data-os-memory]").textContent, "STORAGE UNAVAILABLE");
controller.update(values, false);
assert.ok(dialog.inputs.filter((input) => input.dataset.osPreference === "startup").every((input) => input.disabled));
dialog.listeners.get("keydown")(click(dialog));
dialog.listeners.get("click")(click(dialog));
assert.ok(stopped >= 4, "Keys, changes and outside clicks do not reach background controls");
assert.equal(closes, 1);
assert.equal(dialog.open, false);
assert.equal(body.children.length, 0);
assert.equal(trigger.focused, true);
document.activeElement = body;
controller.open(values, handlers, true);
body.children[0].listeners.get("cancel")(click(body.children[0]));
assert.equal(fallback.focused, true, "Palette removal uses the visible search/menu control for focus recovery");
assert.equal(closes, 2);
controller.open(values, handlers, true);
controller.destroy();
assert.equal(closes, 2, "Unmount cleanup does not invoke the application close action again");
assert.equal(body.children.length, 0);

const helper = read("public/os-behaviour.js");
assert.ok(!/fetch\(|setTimeout|setInterval|requestAnimationFrame|eval\(/.test(helper), "No service, polling or background loop");
const index = read("index.html");
assert.ok(index.indexOf("public/os-behaviour.js") < index.indexOf("static-app.js"));
assert.ok(index.includes("public/os-behaviour.js"));
for (const file of ["scripts/prepare-pages.mjs", "scripts/publish-site.mjs"]) assert.ok(read(file).includes('"public/os-behaviour.js"'));
assert.ok(read("components/archive/os-behaviour-window.tsx").includes("behaviour.createController()"));
assert.ok(read("static-app.js").includes("api.createController()"));
const renderPass = read("static-app.js").slice(read("static-app.js").indexOf("  syncXTerminal();\n"));
assert.ok(renderPass.indexOf("syncOsBehaviourDialog();") < renderPass.indexOf("syncDesktopNavigation();"), "Navigation observes the settled native-dialog state before scheduling a hint");
assert.ok(!read("components/archive/search-panel.tsx").includes("<fieldset"));
for (const file of ["components/archive/search-panel.tsx", "static-app.js"]) {
  assert.ok(read(file).includes('className="palette-settings-button"') || read(file).includes('class="palette-settings-button"'));
  assert.ok(read(file).includes('aria-haspopup="dialog"'));
}
assert.match(read("app/globals.css"), /\.command-panel \{\s*inline-size: min\(420px/);
console.log("OS Behaviour: safe storage, shared controls, stable native dialog, dismissal/focus, startup choices and packaging passed.");
