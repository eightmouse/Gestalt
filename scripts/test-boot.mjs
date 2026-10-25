import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { createRequire } from "node:module";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";

const read = (file) => readFileSync(new URL(`../${file}`, import.meta.url), "utf8");
const staticSource = read("static-app.js");
const ast = ts.createSourceFile("static-app.js", staticSource, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
const staticBoot = ast.statements.find((node) => ts.isFunctionDeclaration(node) && node.name?.text === "scheduleBootCompletion");
assert.ok(staticBoot);
const reactBoot = ts.transpileModule(read("lib/boot.ts"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }
}).outputText;

for (const source of [reactBoot, staticBoot.getText(ast)]) {
  for (const mode of ["full", "quick"]) {
  for (const reduced of [false, true]) {
    const timers = new Map();
    const listeners = new Set();
    let nextId = 0;
    let completed = 0;
    const motion = {
      matches: reduced,
      addEventListener: (_, listener) => listeners.add(listener),
      removeEventListener: (_, listener) => listeners.delete(listener)
    };
    const context = vm.createContext({ exports: {}, window: {
      matchMedia: () => motion,
      setTimeout: (callback, delay) => { timers.set(++nextId, { callback, delay }); return nextId; },
      clearTimeout: (id) => timers.delete(id)
    } });
    vm.runInContext(source, context);
    const start = vm.runInContext("scheduleBootCompletion", context);
    let stop = start(() => completed++, 500, mode);
    if (reduced) {
      assert.equal(completed, 1, "Reduced motion settles immediately");
      assert.equal(timers.size, 0);
      assert.equal(listeners.size, 0);
      stop();
      continue;
    }
    assert.equal(completed, 0, "No early consent/completion");
    assert.equal([...timers.values()][0].delay, mode === "quick" ? 2300 : 4700, "Rebuilds keep the chosen startup deadline");
    [...timers.values()][0].callback();
    assert.equal(completed, 1);
    assert.equal(timers.size, 0);
    assert.equal(listeners.size, 0);
    stop = start(() => completed++);
    const cancelled = [...timers.values()][0].callback;
    stop();
    assert.equal(timers.size, 0, "Unmount cancels pending completion");
    assert.equal(listeners.size, 0);
    cancelled();
    assert.equal(completed, 1, "A cancelled callback cannot complete or replay the handoff");
    stop = start(() => completed++);
    motion.matches = true;
    for (const listener of [...listeners]) listener();
    assert.equal(completed, 2, "Changing motion preference settles a running boot");
    assert.equal(timers.size, 0);
    assert.equal(listeners.size, 0);
    stop();
    motion.matches = false;
    stop = start(() => completed++, 7500);
    assert.equal([...timers.values()][0].delay, 0, "A delayed render adds no extra wait");
    stop();
  }
  }
}

const reactSource = read("components/archive-os.tsx");
const css = read("app/globals.css");
assert.match(reactSource, /showBoot \? " is-booting" : ""/);
assert.match(reactSource, /inert=\{showBoot\} aria-busy=\{showBoot\}/);
assert.match(reactSource, /localMemory === "prompt" && bootComplete/);
assert.match(staticSource, /state\.bootDismissed \? "" : " is-booting"/);
assert.match(staticSource, /state\.localMemory !== "prompt" \|\| !state\.bootDismissed/);
assert.match(staticSource, /--boot-elapsed: -\$\{Math\.max\(0, performance\.now\(\) - bootStartedAt\)\}ms/);
assert.match(staticSource, /if \(!state\.bootDismissed && !bootCleanup\)/);
assert.match(css, /boot-exit 5200ms ease-in-out var\(--boot-elapsed, 0ms\)/);
assert.match(css, /boot-loader-exit 420ms ease-in-out calc\(2220ms \+ var\(--boot-elapsed, 0ms\)\)/);
assert.match(css, /boot-session 5200ms ease-in-out var\(--boot-elapsed, 0ms\)/);
assert.match(css, /\.archive-shell\.is-quick-boot > \.boot-screen \{\s*animation-name: quick-boot-exit;\s*animation-duration: 2800ms;/);
assert.match(css, /\.archive-shell\.is-quick-boot \.boot-session \{ display: none; \}/);
assert.match(reactSource, /scheduleBootCompletion\(\(\) => setBootComplete\(true\), 0, startupMode\)/);
assert.match(staticSource, /performance.now\(\) - bootStartedAt, state.startupMode/);
assert.match(css, /\.boot-session \{\s*position: absolute;\s*grid-area: auto;\s*align-self: start;\s*inset-block-start: 38%;/, "Profile is anchored to the viewport, not the loader's centered grid cell");
const sessionFrames = css.match(/@keyframes boot-session \{([\s\S]*?)\n\}/)?.[1];
assert.ok(sessionFrames);
const hold = sessionFrames.match(/([\d.]+)%, ([\d.]+)% \{ opacity: 1; \}/);
assert.ok(hold);
const fadeInStart = sessionFrames.match(/0%, ([\d.]+)% \{ opacity: 0; \}/);
const fadeOutEnd = sessionFrames.match(/([\d.]+)%, 100% \{ opacity: 0; visibility: hidden; \}/);
assert.ok(fadeInStart && fadeOutEnd);
const visibleMs = (Number(fadeOutEnd[1]) - Number(fadeInStart[1])) * 5200 / 100;
assert.ok(visibleMs >= 2000 && visibleMs <= 2500, "The whole profile phase, including both fades, lasts 2-2.5 seconds");
assert.ok((Number(hold[2]) - Number(hold[1])) * 5200 / 100 >= 800, "The profile still has a readable pause between fades");
assert.match(css, /\.boot-session-mark \{[^}]*border-radius: 0;/, "The portrait frame is square");
for (const [delay, duration] of [[3660, 1200], [3740, 1200], [3880, 1200], [4110, 970]]) {
  assert.ok(css.includes(`boot-surface ${duration}ms ease-in-out calc(${delay}ms + var(--boot-elapsed, 0ms)) both`));
  assert.ok(delay + duration <= 5200, "All surfaces settle before controls are released");
}
const reactScreen = read("components/archive/boot-screen.tsx");
for (const source of [reactScreen, staticSource]) {
  for (const className of ["boot-loader", "boot-session", "boot-session-label", "boot-session-mark", "boot-session-user", "boot-session-detail"]) {
    assert.ok(source.includes(`"${className}"`), `Both readers render ${className}`);
  }
  assert.ok(source.includes("// SESSION READY"));
  assert.ok(source.includes("Opening the archive"));
}
assert.match(reactScreen, /src="\/images\/eightmouse-avatar.png" width="112" height="112" alt=""/);
assert.match(staticSource, /src="public\/images\/eightmouse-avatar.png" width="112" height="112" alt=""/);
const avatar = readFileSync(new URL("../public/images/eightmouse-avatar.png", import.meta.url));
assert.equal(avatar.subarray(0, 8).toString("hex"), "89504e470d0a1a0a", "The local avatar is a PNG, not a downloaded error page");
assert.equal(avatar.readUInt32BE(16), 256);
assert.equal(avatar.readUInt32BE(20), 256);
assert.ok(avatar.length < 128 * 1024, "The profile image stays small");
assert.match(read("index.html"), /rel="preload" as="image" href="public\/images\/eightmouse-avatar.png"/);
assert.match(read("app/layout.tsx"), /rel="preload" as="image" href="\/images\/eightmouse-avatar.png"/);
assert.ok(read("scripts/publish-site.mjs").includes('"public/images/eightmouse-avatar.png"'), "Content-only publishing cannot omit a changed profile asset");
assert.match(reactSource, /if \(!bootComplete \|\| localMemory === "prompt"/);
assert.match(staticSource, /if \(!state.bootDismissed \|\| state.localMemory === "prompt"\) return;/);
assert.match(css, /@media \(prefers-reduced-motion: reduce\)[\s\S]*\.boot-screen \{\s*display: none;/);
const require = createRequire(import.meta.url);
const rendered = vm.createContext({ exports: {}, require: (id) => id === "@/components/archive/headline-text" ? { renderHeadlineLetters: () => null } : require(id) });
vm.runInContext(ts.transpileModule(reactScreen, { compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, rendered);
const reactMarkup = renderToStaticMarkup(rendered.exports.BootScreen());
const sessionMarkup = (markup) => markup.slice(markup.indexOf('<div class="boot-session">'), markup.indexOf("</div>", markup.indexOf('<div class="boot-session">')) + 6).replace(/\s+</g, "<").replaceAll('src="public/images/eightmouse-avatar.png"', 'src="/images/eightmouse-avatar.png"').replaceAll("/>", ">");
assert.equal(sessionMarkup(reactMarkup), sessionMarkup(staticSource), "Both readers render the same session handoff with their own public asset paths");

// Document shortcuts must not bypass the inert boot surface or the consent dialog.
const reactAst = ts.createSourceFile("components/archive-os.tsx", reactSource, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
let reactShortcut;
ts.forEachChild(reactAst, function visit(node) {
  if (ts.isVariableDeclaration(node) && node.name.getText(reactAst) === "togglePalette") reactShortcut = node.initializer.getText(reactAst);
  ts.forEachChild(node, visit);
});
const staticShortcut = ast.statements.find((node) => ts.isExpressionStatement(node) && node.expression.expression?.getText(ast) === 'document.addEventListener' && node.expression.arguments[0]?.text === "keydown").expression.arguments[1].getText(ast);
for (const [source, react] of [[reactShortcut, true], [staticShortcut, false]]) {
  assert.ok(source);
  const context = vm.createContext({ bootComplete: false, localMemory: "granted", inlineRecordId: null, panelOpen: false, state: { bootDismissed: false, localMemory: "granted", searchOpen: false }, HTMLInputElement: class {}, HTMLTextAreaElement: class {}, HTMLElement: class {}, render() {}, setSearchOpen(update) { context.state.searchOpen = update(context.state.searchOpen); } });
  const code = react ? ts.transpileModule(`const handler = ${source};`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText : `const handler = ${source};`;
  vm.runInContext(code, context);
  const handler = vm.runInContext("handler", context);
  const press = () => handler({ key: "~", target: null, preventDefault() {} });
  press();
  assert.equal(context.state.searchOpen, false, "Boot ignores palette shortcuts");
  context.bootComplete = context.state.bootDismissed = true;
  context.localMemory = context.state.localMemory = "prompt";
  press();
  assert.equal(context.state.searchOpen, false, "Consent ignores palette shortcuts");
  context.localMemory = context.state.localMemory = "session";
  press();
  assert.equal(context.state.searchOpen, true, "The palette works after the handoff and consent");
}
const steamInit = ast.statements.find((node) => ts.isFunctionDeclaration(node) && node.name?.text === "initializeSteamDisplay").getText(ast);
assert.match(steamInit, /if \(steamDisplayStarted\) return;/);
assert.ok(!steamInit.includes("!state.bootDismissed"), "The existing one-shot Steam read can prepare during boot");
console.log("Boot/session timing, cancellation, reduced motion, keyboard and React/static handoff checks passed.");
