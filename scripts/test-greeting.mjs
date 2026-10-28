import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";

const read = (file) => readFileSync(new URL(`../${file}`, import.meta.url), "utf8");
const shellSource = read("static-app.js"), reactSource = read("components/archive-os.tsx");
const shell = ts.createSourceFile("static-app.js", shellSource, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
const react = ts.createSourceFile("archive-os.tsx", reactSource, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
function declaration(ast, name) {
  const node = ast.statements.find((node) => ts.isFunctionDeclaration(node) && node.name?.text === name);
  assert.ok(node, name);
  return node.getText(ast);
}
const state = { activeSection: "system", bootDismissed: true };
const classes = new Set(["headline-decode-text", "is-resolving"]), properties = new Map();
let label = "Good morning.", writes = 0, markup = "";
const heading = {
  classList: { remove: (name) => classes.delete(name) },
  style: { setProperty: (name, value) => properties.set(name, value) },
  getAttribute: () => label, setAttribute: (_, value) => { label = value; },
  set innerHTML(value) { writes++; markup = value; }
};
let queries = 0;
const document = { hidden: false, querySelector(selector) { queries++; assert.equal(selector, ".workspace-header h1"); return heading; } };
const context = vm.createContext({ state, document, renderHeadlineLetters: (text) => text, exports: {} });
const reactPolicy = ts.transpileModule(declaration(react, "getGreeting"), { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
vm.runInContext(`${declaration(shell, "greeting")}\n${declaration(shell, "syncDashboardGreeting")}\n${reactPolicy}`, context);
for (const [hour, minute, second, expected] of [
  [0, 0, 0, "Good morning."], [6, 0, 0, "Good morning."], [11, 59, 59, "Good morning."],
  [12, 0, 0, "Good afternoon."], [17, 59, 59, "Good afternoon."], [18, 0, 0, "Good evening."], [23, 59, 59, "Good evening."]
]) {
  const date = new Date(2026, 9, 28, hour, minute, second);
  assert.equal(context.greeting(date), expected);
  assert.equal(context.getGreeting(date), expected, "Both readers use the visitor's local hour");
}
assert.equal(context.getGreeting(null), "Opening archive.");
context.syncDashboardGreeting(new Date(2026, 9, 28, 11, 59));
assert.equal(writes, 0, "Normal clock ticks do not replace the heading or restart its animation");
context.syncDashboardGreeting(new Date(2026, 9, 28, 12));
assert.equal(label, "Good afternoon."); assert.equal(writes, 1);
assert.equal(properties.get("--headline-chars"), String(label.length));
assert.ok(!classes.has("is-resolving") && !markup.includes("is-delayed"));
context.syncDashboardGreeting(new Date(2026, 9, 28, 12, 1)); assert.equal(writes, 1);
state.activeSection = "games";
const beforeQueries = queries;
context.syncDashboardGreeting(new Date(2026, 9, 28, 18));
assert.equal(queries, beforeQueries, "Other section headings are never touched");
state.activeSection = "system"; state.bootDismissed = false;
context.syncDashboardGreeting(new Date(2026, 9, 28, 18)); assert.equal(writes, 1, "Boot effect remains intact");
state.bootDismissed = true; document.hidden = true;
context.syncDashboardGreeting(new Date(2026, 9, 28, 18)); assert.equal(writes, 1);
document.hidden = false;
context.syncDashboardGreeting(new Date(2026, 9, 28, 18)); assert.equal(label, "Good evening.");
context.syncDashboardGreeting(new Date(2026, 9, 29, 0)); assert.equal(label, "Good morning.");
assert.ok(!/\brender\(|setInterval|setTimeout|requestAnimationFrame/.test(declaration(shell, "syncDashboardGreeting")), "No workspace rebuild or extra loop");

let clockEffect, animationHandler, visibilityHandler;
function walk(ast, visitor) { function visit(node) { visitor(node); ts.forEachChild(node, visit); } visit(ast); }
walk(react, (node) => {
  if (ts.isCallExpression(node) && node.expression.getText(react) === "useEffect" && node.arguments[0]?.getText(react).includes("window.setInterval(updateClock, 30_000)")) clockEffect = node.arguments[0];
  if (ts.isJsxAttribute(node) && node.name.getText(react) === "onAnimationEnd" && node.initializer?.getText(react).includes("headline-letter-readable")) animationHandler = node.initializer.expression;
});
walk(shell, (node) => {
  if (ts.isCallExpression(node) && node.expression.getText(shell) === 'document.addEventListener' && node.arguments[0]?.text === "visibilitychange") visibilityHandler = node.arguments[1];
});
assert.ok(clockEffect && animationHandler && visibilityHandler);
let updates = 0, intervals = 0, cleared = 0, listener;
const clockContext = vm.createContext({ exports: {}, document: {
  hidden: false,
  addEventListener: (name, fn) => { assert.equal(name, "visibilitychange"); listener = fn; },
  removeEventListener: (name, fn) => { assert.equal(name, "visibilitychange"); assert.equal(fn, listener); listener = null; }
}, window: {
  setInterval: (fn, delay) => { assert.equal(delay, 30_000); intervals++; return 7; },
  clearInterval: (id) => { assert.equal(id, 7); cleared++; }
}, setNow: () => updates++ });
vm.runInContext(`exports.cleanup = (${clockEffect.getText(react)})();`, clockContext);
assert.equal(updates, 1); assert.equal(intervals, 1);
clockContext.document.hidden = true; listener(); assert.equal(updates, 1);
clockContext.document.hidden = false; listener(); assert.equal(updates, 2, "React refreshes immediately on tab resume");
clockContext.exports.cleanup(); assert.equal(cleared, 1); assert.equal(listener, null);

let seasonalCalls = 0, timeCalls = 0;
const resumeContext = vm.createContext({ exports: {}, document: { hidden: true }, syncSeasonalMotion: () => seasonalCalls++, syncTime: () => timeCalls++ });
vm.runInContext(`exports.resume = ${visibilityHandler.getText(shell)};`, resumeContext);
resumeContext.exports.resume(); assert.equal(timeCalls, 0);
resumeContext.document.hidden = false; resumeContext.exports.resume(); assert.equal(timeCalls, 1); assert.equal(seasonalCalls, 2);

let settled = 0;
class Element { constructor(index) { this.parentElement = { style: { getPropertyValue: () => String(index) } }; } }
const endContext = vm.createContext({ exports: {}, headline: "Good morning.", HTMLElement: Element, setHeadlineAnimating: (value) => { assert.equal(value, false); settled++; } });
vm.runInContext(ts.transpileModule(`exports.end = ${animationHandler.getText(react)};`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText, endContext);
endContext.exports.end({ animationName: "cursor-blink", target: new Element(12) });
endContext.exports.end({ animationName: "headline-letter-readable", target: new Element(0) });
assert.equal(settled, 0, "Do not truncate the title effect at its first character or cursor");
endContext.exports.end({ animationName: "headline-letter-readable", target: new Element(12) });
assert.equal(settled, 1, "Settle the resolving state after the final readable character");
console.log("Greeting checks passed: local boundaries, midnight, idle/tab resume, no repeated heading writes, section/boot guards, one existing timer, React cleanup and final-character settling.");
