import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import vm from "node:vm";
import ts from "typescript";

const require = createRequire(import.meta.url);
const read = (file) => readFileSync(new URL(`../${file}`, import.meta.url), "utf8");
const source = read("static-app.js");
const ast = ts.createSourceFile("static-app.js", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
const helper = ast.statements.find((node) => ts.isFunctionDeclaration(node) && node.name?.text === "syncImageLightbox");
assert.ok(helper);
class Element {
  children = [];
  dataset = {};
  attributes = new Map();
  listeners = new Map();
  open = false;
  shows = 0;
  closes = 0;
  constructor(tag) { this.tag = tag; }
  append(child) { child.parent = this; this.children.push(child); }
  remove() { this.parent.children = this.parent.children.filter((child) => child !== this); }
  setAttribute(name, value) { this.attributes.set(name, value); }
  getAttribute(name) { return this.attributes.get(name) ?? null; }
  set src(value) { this.setAttribute("src", value); }
  get src() { return this.getAttribute("src"); }
  addEventListener(name, callback) { this.listeners.set(name, callback); }
  showModal() { this.open = true; this.shows++; }
  close() { this.open = false; this.closes++; }
  find(predicate) { return this.children.find(predicate) || this.children.map((child) => child.find(predicate)).find(Boolean); }
  querySelector(tag) { return this.find((child) => child.tag === tag); }
}
const body = new Element("body");
const state = { expandedImage: null, activeContent: "samples", panelOpen: true };
const context = vm.createContext({ state, document: {
  body, createElement: (tag) => new Element(tag), getElementById: (id) => body.find((child) => child.id === id)
} });
vm.runInContext(helper.getText(ast), context);
const sync = () => vm.runInContext("syncImageLightbox()", context);
sync();
assert.equal(body.children.length, 0);
state.expandedImage = { src: "/media/full.png", alt: 'Image <test> "caption"' };
sync();
const dialog = body.children[0];
assert.equal(dialog.tag, "dialog");
assert.equal(dialog.parent, body, "Static viewer is outside every archive/record container");
assert.equal(dialog.open, true);
assert.equal(dialog.querySelector("img").src, "/media/full.png");
assert.equal(dialog.querySelector("img").alt, state.expandedImage.alt, "Metadata uses DOM properties, not interpolated HTML");
sync();
assert.equal(body.children.length, 1);
assert.equal(dialog.shows, 1, "Unrelated renders do not reopen the modal");
state.expandedImage = { src: "/media/other.png", alt: "Other" };
sync();
assert.equal(dialog.querySelector("img").src, "/media/other.png");
let stopped = 0;
let prevented = 0;
const event = { stopPropagation: () => stopped++, preventDefault: () => prevented++ };
dialog.listeners.get("keydown")(event);
dialog.listeners.get("cancel")(event);
assert.equal(stopped, 2);
assert.equal(prevented, 1);
assert.equal(body.children.length, 0);
assert.equal(dialog.closes, 1);
assert.equal(state.expandedImage, null);
assert.equal(state.activeContent, "samples");
assert.equal(state.panelOpen, true);
for (const [start, end] of [["if (target.dataset.expandImage)", "if (target.dataset.updateHistoryToggle"], ["if (state.expandedImage)", "if (state.timelineOpen)"]]) {
  const branch = source.slice(source.indexOf(start), source.indexOf(end, source.indexOf(start)));
  assert.ok(branch.includes("syncImageLightbox()"));
  assert.ok(!branch.includes("render()"), "Image interactions must not rebuild the terminal");
}

const effects = [];
const reactDialog = new Element("dialog");
let portalCalls = 0;
let closed = 0;
let focusRestored = 0;
const trigger = new Element("button");
trigger.isConnected = true;
trigger.focus = () => focusRestored++;
const react = vm.createContext({ exports: {}, HTMLElement: Element, document: { body, activeElement: trigger }, require: (name) => {
  if (name === "react") return { useRef: () => ({ current: reactDialog }), useEffect: (callback) => effects.push(callback) };
  if (name === "react-dom") return { createPortal: (element, target) => { portalCalls++; return { element, target }; } };
  return require(name);
} });
vm.runInContext(ts.transpileModule(read("components/archive/image-lightbox.tsx"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX }
}).outputText, react);
const portal = react.exports.ImageLightbox({ image: { src: "/media/full.png", alt: "Sample" }, label: "Close expanded sample", onClose: () => closed++ });
assert.equal(portal.target, body, "React viewer portals outside the contained record");
const cleanup = effects[0]();
assert.equal(reactDialog.open, true);
portal.element.props.onCancel(event);
assert.equal(closed, 1);
cleanup();
assert.equal(reactDialog.open, false);
assert.equal(focusRestored, 1, "React restores focus to the originating image control");
delete react.document;
assert.equal(react.exports.ImageLightbox({ image: { src: "x", alt: "x" }, label: "Close", onClose() {} }), null);
assert.equal(portalCalls, 1, "SSR never attempts a DOM portal");
for (const file of ["components/archive/record-content.tsx", "components/archive/record-window.tsx"]) {
  const owner = read(file);
  assert.ok(owner.includes("<ImageLightbox image={expandedImage}"));
  assert.ok(!owner.includes('className="note-image-lightbox"'), "No nested legacy image overlay remains");
}
console.log("Image viewer tests passed: top-level modal, SSR safety, cleanup, keyboard dismissal and no static terminal rebuild.");
