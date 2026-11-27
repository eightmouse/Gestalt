import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import vm from "node:vm";
import ts from "typescript";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ambient from "../public/ambient-motion.js";
import memoryState from "../public/memory-state.js";
import { updateStaticCacheTokens } from "./static-cache.mjs";

const read = (file) => readFileSync(new URL(`../${file}`, import.meta.url), "utf8");
function fixture(observer = true) {
  const events = () => {
    const handlers = new Map();
    return {
      handlers,
      addEventListener(name, handler) { if (!handlers.has(name)) handlers.set(name, new Set()); handlers.get(name).add(handler); },
      removeEventListener(name, handler) { handlers.get(name)?.delete(handler); },
      emit(name, value) { for (const handler of handlers.get(name) || []) handler(value); }
    };
  };
  const attributes = new Map(), properties = new Map(), frames = new Map();
  let writes = 0, reads = 0, nextFrame = 0, intersection;
  const blocked = new Set();
  const doc = { ...events(), hidden: false, documentElement: { toggleAttribute(name, value) { attributes.set(name, value); } } };
  const motion = { ...events(), matches: false };
  const node = { isConnected: true, style: { setProperty(name, value) { writes++; properties.set(name, value); } },
    closest: () => ({ matches: (selector) => [...blocked].some((state) => selector.split(", ").includes(state)) }),
    getBoundingClientRect() { reads++; return { left: 100, top: 100, width: 100, height: 100 }; },
    toggleAttribute(name, value) { attributes.set(name, value); }, removeAttribute(name) { attributes.delete(name); }
  };
  const host = { ...events(), document: doc, innerWidth: 1000, innerHeight: 1000, matchMedia: () => motion,
    requestAnimationFrame(callback) { frames.set(++nextFrame, callback); return nextFrame; }, cancelAnimationFrame(id) { frames.delete(id); },
    ...(observer ? { IntersectionObserver: class {
      constructor(callback) { intersection = callback; }
      observe(target) { assert.equal(target, node); }
      disconnect() { intersection = null; }
    } } : {})
  };
  return { host, doc, motion, node, frames, attributes, properties, events,
    get writes() { return writes; }, get reads() { return reads; },
    block(value, state = ".has-record") { if (value) blocked.add(state); else blocked.delete(state); },
    move(x = 650, y = 650) { host.emit("pointermove", { clientX: x, clientY: y }); },
    intersect(value) { intersection([{ isIntersecting: value }]); },
    flush() { const callbacks = [...frames.values()]; frames.clear(); for (const callback of callbacks) callback(); }
  };
}
const f = fixture();
ambient.initialize(f.doc);
ambient.initialize(f.doc);
assert.equal(f.doc.handlers.get("visibilitychange").size, 1, "The workspace guard works without mounting the optional legacy visual");
f.doc.hidden = true; f.doc.emit("visibilitychange");
assert.equal(f.attributes.get("data-archive-hidden"), true);
f.doc.hidden = false; f.doc.emit("visibilitychange");
const dispose = ambient.watchMemory(f.node, f.host);
ambient.initialize(f.doc);
assert.equal(f.doc.handlers.get("visibilitychange").size, 2, "One page-lifetime visibility observer plus the disposable pointer observer");
for (let i = 0; i < 100; i++) f.move(200 + i, 300 + i);
assert.equal(f.frames.size, 1, "Input bursts queue only one frame, not a running loop");
assert.equal(f.reads, 0, "Input handlers do not force layout");
f.flush();
assert.equal(f.writes, 8);
assert.equal(f.reads, 1);
f.move(299, 399); f.flush();
assert.equal(f.writes, 8, "Same quantized position does not rewrite eight CSS variables");
f.host.emit("resize"); f.move(); f.flush();
assert.equal(f.reads, 2, "Bounds refresh only after invalidation");
assert.equal(f.properties.get("--memory-core-x"), "4.00px", "Existing movement amplitudes stay intact");
assert.equal(f.properties.get("--memory-orbit-y"), "-5.00px");
f.move(900, 900); f.block(true); f.flush();
const before = f.writes;
assert.equal(before, 16, "A window opened between input and frame prevents a late background write");
f.move(); assert.equal(f.frames.size, 0);
f.block(false); f.motion.matches = true; f.move(); assert.equal(f.frames.size, 0, "Reduced motion and coarse pointers schedule no work");
f.motion.matches = false; f.move(); f.motion.emit("change"); assert.equal(f.frames.size, 0, "A preference change cancels pending input");
f.doc.hidden = true; f.doc.emit("visibilitychange"); f.move();
assert.equal(f.attributes.get("data-archive-hidden"), true);
assert.equal(f.frames.size, 0);
f.doc.hidden = false; f.doc.emit("visibilitychange");
assert.equal(f.attributes.get("data-archive-hidden"), false);
f.intersect(false); f.move(); assert.equal(f.frames.size, 0);
assert.equal(f.attributes.get("data-memory-offscreen"), true);
f.intersect(true); f.move(); assert.equal(f.frames.size, 1);
dispose();
assert.equal(f.frames.size, 0);
for (const name of ["pointermove", "resize"]) assert.equal(f.host.handlers.get(name).size, 0);
for (const name of ["scroll", "gestalt:navigation-layout"]) assert.equal(f.doc.handlers.get(name).size, 0);
assert.equal(f.motion.handlers.get("change").size, 0);
assert.equal(f.doc.handlers.get("visibilitychange").size, 1);
const remount = ambient.watchMemory(f.node, f.host);
assert.equal(f.doc.handlers.get("visibilitychange").size, 2, "Remount does not accumulate document observers");
remount();
const fallback = fixture(false);
const cleanupFallback = ambient.watchMemory(fallback.node, fallback.host);
fallback.move(); fallback.flush(); assert.equal(fallback.writes, 8, "No IntersectionObserver still preserves pointer behavior");
cleanupFallback();
const consent = fixture();
const cleanupConsent = ambient.watchMemory(consent.node, consent.host);
consent.block(true, "[data-nav-blocked]");
consent.move();
assert.equal(consent.frames.size, 0, "Consent-covered legacy visuals do not queue pointer work");
assert.equal(consent.reads, 0);
consent.block(false, "[data-nav-blocked]");
consent.move(); consent.flush(); assert.equal(consent.writes, 8);
cleanupConsent();

const pilot = fixture();
pilot.doc.defaultView = pilot.host;
pilot.motion.matches = true;
Object.assign(pilot.node, pilot.events());
const target = { closest: () => pilot.node };
pilot.node.contains = (element) => element === target;
pilot.node.setAttribute = (name) => pilot.attributes.set(name, true);
Object.assign(pilot.node, { offsetLeft: 10, offsetTop: 15, offsetWidth: 100, offsetHeight: 100,
  offsetParent: { getBoundingClientRect: () => ({ left: 94, top: 94 }), clientLeft: 1, clientTop: 1, scrollLeft: 5, scrollTop: 10, clientWidth: 120, clientHeight: 120 } });
const trace = (pointerType = "mouse", clientX = 199, clientY = 101) => pilot.doc.emit("pointermove", { pointerType, target, clientX, clientY });
ambient.initialize(pilot.doc);
ambient.initialize(pilot.doc);
assert.equal(pilot.doc.handlers.get("pointermove").size, 1, "Both render paths get one delegated pilot listener");
trace("touch"); assert.equal(pilot.frames.size, 0);
for (let index = 0; index < 20; index++) trace();
assert.equal(pilot.frames.size, 1);
assert.equal(pilot.reads, 0);
pilot.flush();
assert.ok(pilot.attributes.get("data-plate-hover"));
assert.equal(pilot.reads, 0, "Pose uses the untouched grid seat, never the shifted article rectangle");
assert.equal(pilot.properties.get("--plate-hover-x"), "2px");
assert.equal(pilot.properties.get("--plate-hover-y"), "1px");
pilot.node.emit("pointerleave", { relatedTarget: target, clientX: 199, clientY: 101 });
assert.ok(pilot.attributes.get("data-plate-hover"), "A transformed edge cannot drop hover inside the original seat");
pilot.node.emit("pointerleave"); assert.ok(!pilot.attributes.has("data-plate-hover"));
assert.equal(pilot.node.handlers.get("pointerleave").size, 0, "A seated plate releases its local listener");
pilot.doc.emit("pointermove", { pointerType: "mouse", target: { closest: () => null } });
assert.equal(pilot.frames.size, 0, "Moving outside a pilot plate schedules no work");
trace(); pilot.block(true); pilot.flush(); assert.equal(pilot.writes, 2, "An opened window prevents the pending plate update");
pilot.block(false);
pilot.node.offsetLeft = 5;
pilot.node.offsetParent.clientWidth = 100;
trace("mouse", 194); pilot.flush();
assert.equal(pilot.properties.get("--plate-hover-x"), "0px", "A full-width plate never pushes past the right clipping edge");
pilot.node.emit("pointerleave");
Object.assign(pilot.node, { offsetLeft: 30, offsetTop: 35, offsetWidth: 80, offsetHeight: 80 });
Object.assign(pilot.node.offsetParent, { clientWidth: 105, clientHeight: 105 });
trace("mouse", 199, 121); pilot.flush();
assert.equal(pilot.properties.get("--plate-hover-x"), "-2px", "A right-aligned plate moves inward");
assert.equal(pilot.properties.get("--plate-hover-y"), "-1px", "A bottom-aligned plate moves inward");
pilot.motion.matches = false; pilot.motion.emit("change");
trace(); assert.equal(pilot.frames.size, 0, "Disabled media query schedules no hover work");

// The static reader must retain its watcher across ordinary shell renders.
const source = read("static-app.js");
const ast = ts.createSourceFile("static-app.js", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
const sync = ast.statements.find((node) => ts.isFunctionDeclaration(node) && node.name?.text === "syncMemoryMotion");
let current = {}, mounted = 0, released = 0;
const context = vm.createContext({ memoryNode: null, memoryCleanup: null, document: { querySelector: () => current }, window: { GestaltAmbientMotion: { watchMemory() { mounted++; return () => released++; } } } });
vm.runInContext(sync.getText(ast), context);
context.syncMemoryMotion(); context.syncMemoryMotion();
assert.equal(mounted, 1);
current = {}; context.syncMemoryMotion(); assert.equal(released, 1);
assert.ok(read("components/archive/memory-state.tsx").includes("useEffect(() => ambientMotion.watchMemory(memoryRef.current), [])"));
assert.ok(read("components/archive-os.tsx").includes("useEffect(() => { ambientMotion.initialize(); }, [])"), "Workspace visibility guards initialize even when Code Surface is selected instead of Legacy Visual");
for (const file of ["scripts/prepare-pages.mjs", "lib/publish-paths.mjs"]) assert.ok(read(file).includes('"public/ambient-motion.js"'));
const helperAt = read("index.html").indexOf('src="public/ambient-motion.js');
assert.ok(helperAt >= 0 && helperAt < read("index.html").indexOf('src="static-app.js'));
assert.ok(updateStaticCacheTokens('<script src="public/ambient-motion.js?v=old"></script>', "fresh").includes("v=fresh"));
const require = createRequire(import.meta.url);
const postcss = createRequire(require.resolve("next/package.json"))("postcss");
const css = postcss.parse(read("app/globals.css"));
for (const state of ["data-archive-hidden", "data-memory-offscreen"]) {
  let pauses = false;
  css.walkRules((rule) => { if (rule.selector.includes(state)) rule.walkDecls("animation-play-state", (decl) => { if (decl.value === "paused") pauses = true; }); });
  assert.ok(pauses, `${state} pauses decorative CSS without resetting animations`);
}
css.walkRules((rule) => {
  if (!rule.selector.includes("data-search-open")) return;
  rule.walkDecls("animation-play-state", (decl) => {
    assert.notEqual(decl.value, "paused", "The palette leaves decorative CSS running");
  });
});
const reactSource = read("components/archive/memory-state.tsx");
const reactAst = ts.createSourceFile("dashboard.tsx", reactSource, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const memory = reactAst.statements.find((node) => ts.isFunctionDeclaration(node) && node.name?.text === "MemoryLoop");
const component = vm.createContext({ require, exports: {}, useRef: () => ({ current: null }), useEffect() {} });
vm.runInContext(ts.transpileModule(`${memory.getText(reactAst)}\nexports.MemoryLoop = MemoryLoop;`, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 } }).outputText, component);
const staticMemory = ast.statements.find((node) => ts.isFunctionDeclaration(node) && node.name?.text === "memoryLoop");
vm.runInContext(staticMemory.getText(ast), context);
const htmls = [renderToStaticMarkup(createElement(component.exports.MemoryLoop)), context.memoryLoop()];
for (const html of htmls) {
  assert.match(html, /aria-hidden="true"/);
  assert.equal((html.match(/class="memory-field"/g) || []).length, 1);
  assert.deepEqual([...html.matchAll(/<span class="([^"]+)"/g)].map((match) => match[1]), ["memory-core", "memory-orbit", "memory-gate", "memory-shard", "memory-nodes"]);
}
const placement = css.nodes.find((node) => node.selector?.includes(".memory-field > :where(span)"));
assert.ok(placement, "Zero-specificity span matching lets each later class own its inset");
const mobileField = css.nodes.find((node) => node.name === "media" && node.params === "(max-width: 760px)" && node.nodes.some((child) => child.selector === ".memory-field"));
assert.ok(mobileField?.nodes[0].nodes.some((node) => node.prop === "inline-size" && node.value === "min(82%, 210px)"), "Square field fits the existing 250px mobile panel without clipping");
assert.ok(!css.nodes.some((node) => node.selector?.split(",").some((selector) => selector.trim() === ".memory-loop span")), "The old shared inset cannot override per-layer bounds");
for (const name of ["memory-core", "memory-orbit", "memory-gate", "memory-shard", "memory-nodes"]) {
  const layer = css.nodes.find((node) => node.selector === `.${name}`);
  assert.ok(css.nodes.indexOf(layer) > css.nodes.indexOf(placement));
  assert.ok(layer.nodes.some((node) => node.prop === "inset" && node.value !== "0"), `${name} has its own bounded geometry`);
}
for (const retired of ["memory-rain", "memory-axis", "memory-shell-a", "memory-shell-b", "memory-scan", "memory-fall"]) {
  assert.ok(!css.nodes.some((node) => node.selector === `.${retired}` || node.name === "keyframes" && node.params === retired), `${retired} is removed, not left running invisibly`);
}
const motionFrames = css.nodes.filter((node) => node.name === "keyframes" && node.params.startsWith("memory-"));
assert.equal(motionFrames.length, 6, "Five fragments plus the existing ambient drift, without new loops");
for (const frames of motionFrames) frames.walkDecls((decl) => assert.ok(["transform", "opacity"].includes(decl.prop), `${frames.params} keeps geometry and static masks out of keyframes`));
const traceCss = postcss.parse(read("app/memory-state.css"));
assert.ok(!traceCss.nodes.some((node) => node.name === "keyframes"));
assert.ok(!/infinite|backdrop-filter|will-change/.test(traceCss.toString()), "The code writer still has no CSS loops or backdrop filters");
const traceFilters = [];
traceCss.walkDecls("filter", (decl) => traceFilters.push([decl.parent.selector, decl.value, decl.parent.parent.params]));
assert.deepEqual(traceFilters, [[".memory-trace-raster", 'url("#gestalt-trace-lens")', "(min-width: 761px) and (prefers-reduced-motion: no-preference)"]], "The lens is separate from the scrolling list and respects reduced motion");
const traceRoot = traceCss.nodes.find((node) => node.selector === ".memory-trace");
assert.ok(traceRoot.nodes.some((node) => node.prop === "grid-template-rows" && node.value === "minmax(0, 1fr)"), "The code stream uses the panel height without an extra heading row");
assert.ok(traceRoot.nodes.some((node) => node.prop === "box-shadow" && node.value.startsWith("var(--trace-bezel),")), "The night stream spills light beyond its inset outline");
assert.ok(traceRoot.nodes.some((node) => node.prop === "background" && node.value.includes("radial-gradient(ellipse at 50% 44%, var(--trace-screen-glow), transparent 78%)")), "A faint phosphor haze lifts the centre of the tube, not a flat tint");
assert.ok(traceRoot.nodes.some((node) => node.prop === "--trace-screen" && node.value === "#050b0a"), "The tube glass is near black, so only the written text gives light");
assert.ok(traceRoot.nodes.some((node) => node.prop === "background" && node.value.includes("repeating-linear-gradient(180deg, transparent 0 2px, var(--trace-scanline) 2px 3px)")), "The CRT scanlines sit behind the code");
const traceGlass = traceCss.nodes.find((node) => node.selector === ".memory-trace::after");
assert.ok(traceGlass && traceGlass.nodes.some((node) => node.prop === "background" && node.value === "var(--screen-glare)") && traceGlass.nodes.some((node) => node.prop === "pointer-events" && node.value === "none"), "The shared glare sits in front of the code without catching the pointer");
assert.ok(!traceRoot.nodes.some((node) => node.prop === "padding"), "No second inset pushes the viewport edge down");
assert.ok(!traceRoot.nodes.some((node) => node.prop === "border-radius"), "The monitor frame stays sharp");
const codeGlow = (selector) => traceCss.nodes.find((node) => node.selector === selector).nodes.find((node) => node.prop === "text-shadow").value;
assert.equal(codeGlow(".memory-trace-lines code"), "0 0 1px var(--trace-phosphor), 0 0 6px var(--trace-glow), 0 0 16px var(--trace-bloom)", "The letters emit: a crisp core, a soft glow and a wide bloom, without blurring the text layer");
assert.match(codeGlow(".memory-trace-lines [data-writing] code"), /0 0 10px var\(--trace-glow\)/, "The live line emits a brighter halo");
assert.ok(traceRoot.nodes.some((node) => node.prop === "--trace-bezel" && node.value.includes("inset 0 0 0 1px var(--trace-rim)") && !node.value.includes("inset 0 2px")), "All four edges share one thin bezel");
const dayTrace = traceCss.nodes.find((node) => node.selector === ':root[data-appearance="day"] .memory-trace');
assert.equal(dayTrace.nodes.find((node) => node.prop === "box-shadow").value, "var(--trace-bezel)", "Day shows only the inset bezel");
const traceComponent = reactAst.statements.find((node) => ts.isFunctionDeclaration(node) && node.name?.text === "SessionTrace");
const traceContext = vm.createContext({ require, exports: {}, memoryState, useRef: () => ({ current: null }), useEffect() {} });
vm.runInContext(ts.transpileModule(`${traceComponent.getText(reactAst)}\nexports.SessionTrace = SessionTrace;`, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 } }).outputText, traceContext);
const traceHtml = renderToStaticMarkup(createElement(traceContext.exports.SessionTrace));
assert.equal(traceHtml, `<div class="memory-trace">${memoryState.renderShell()}</div>`, "React and Pages use the same code-stream shell");
for (const label of ["Workspace code stream", 'aria-live="off"']) assert.ok(traceHtml.includes(label));
assert.doesNotMatch(traceHtml, /workspace\.gs|memory-trace-header/);
assert.ok(!traceHtml.includes("PSEUDOCODE") && !traceHtml.includes("tabindex"));
assert.ok(traceCss.nodes.find((node) => node.selector === ".memory-trace-lines").nodes.some((node) => node.prop === "overflow" && node.value === "hidden"), "The stream has no manual scrollback or scrollbar");
const pixels = (...colours) => Uint8ClampedArray.from(colours.flatMap(([r, g, b, a = 255]) => [r, g, b, a]));
assert.equal(ambient.screenLightColour(pixels()), null, "An empty sample casts no light");
assert.equal(ambient.screenLightColour(pixels([255, 0, 0, 0])), null, "Transparent pixels cast no light");
const warm = ambient.screenLightColour(pixels([200, 120, 60], [10, 10, 10], [10, 10, 10], [10, 10, 10])).split(" ").map(Number);
assert.ok(warm[0] > warm[1] && warm[1] > warm[2], "Bright pixels set the colour; dark ones barely count");
assert.ok(Math.max(...warm) >= 200 && Math.max(...warm) <= 212, "Colour is lifted to a light-like level; CSS decides the intensity");
assert.ok(warm[2] >= 0.2 * 188, "A fifth of a neutral keeps vivid artwork plausible");
const ambientSource = read("public/ambient-motion.js");
assert.ok(ambientSource.includes('doc.createElement("canvas")') && /function read\(source\) \{\s*\/\/ A fresh canvas/.test(ambientSource), "Each sample uses a fresh canvas, so a tainted read cannot poison the CORS fallback");
assert.ok(ambientSource.includes('{ mode: "cors", credentials: "omit" }'), "Cross-origin artwork is read through CORS without cookies");
console.log("Screen light passed: weighted, lifted cover colour with empty/transparent guards and an isolated CORS fallback.");
console.log("Ambient lifecycle passed: bounded five-layer reader parity, per-layer sizing, retired loops removed, coalesced input, pause guards, cleanup/remount and packaging.");
