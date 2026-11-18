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
    assert.equal([...timers.values()][0].delay, mode === "quick" ? 2300 : 11400, "Rebuilds keep the chosen startup deadline");
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
    stop = start(() => completed++, 12000);
    assert.equal([...timers.values()][0].delay, 0, "A delayed render adds no extra wait");
    stop();
  }
  }
}

const reactSource = read("components/archive-os.tsx");
const css = read("app/globals.css");
const require = createRequire(import.meta.url);
const behaviour = require("../public/os-behaviour.js");
const postcss = createRequire(require.resolve("next/package.json"))("postcss");
const sheet = postcss.parse(css);
const declarations = (rule) => Object.fromEntries(rule.nodes.filter((node) => node.type === "decl").map((node) => [node.prop, node.value]));
const bootDefaults = declarations(sheet.nodes.find((node) => node.selector === ".boot-screen"));
const signalDetails = new Set();
for (const sample of [...Array.from({ length: 257 }, (_, index) => index / 257), -1, 1, 2, NaN, Infinity]) {
  const attributes = new Map(), styles = new Map();
  let draws = 0, writes = 0;
  const doc = { documentElement: { getAttribute: (key) => attributes.get(key), setAttribute: (key, value) => attributes.set(key, value), style: { setProperty(key, value) { writes++; styles.set(key, value); } } } };
  behaviour.initializeBootPresentation(doc, () => { draws++; return sample; });
  const before = [...styles];
  behaviour.initializeBootPresentation(doc, () => { throw new Error("No per-render randomness"); });
  assert.equal(draws, 1);
  assert.equal(writes, 2, "Only the Gestalt loader has randomized signal timing");
  assert.deepEqual([...styles], before);
  const ms = (name) => { assert.match(styles.get(name), /^-?\d+ms$/); return parseInt(styles.get(name)); };
  const start = ms("--boot-signal-start"), duration = ms("--boot-signal-span");
  assert.ok(start >= 90 && start <= 390 && duration >= 760 && duration <= 1160);
  assert.ok(start + duration < 1800, "GESTALT settles before loader handoff");
  signalDetails.add(JSON.stringify([...styles]));
}
assert.ok(signalDetails.size > 250, "Variation is finer than four repeated scripted timings");
const curves = new Set();
for (const [index, profile] of behaviour.bootProfiles.entries()) {
  let draws = 0;
  const attributes = new Map();
  const doc = { documentElement: { getAttribute: (key) => attributes.get(key), setAttribute: (key, value) => attributes.set(key, value) } };
  assert.equal(behaviour.initializeBootPresentation(doc, () => { draws++; return (index + 0.1) / behaviour.bootProfiles.length; }), profile);
  assert.equal(behaviour.initializeBootPresentation(doc, () => { throw new Error("Must not reshuffle"); }), profile);
  assert.equal(draws, 1, "One profile per document, not per render/section/palette");
  const override = sheet.nodes.find((node) => node.selector === `:root[data-boot-profile="${profile}"] .boot-screen`);
  const values = { ...bootDefaults, ...(override ? declarations(override) : {}) };
  const meter = sheet.nodes.find((node) => node.type === "atrule" && node.name === "keyframes" && node.params === values["--boot-meter-sequence"]);
  assert.ok(meter, `Missing progress curve ${profile}`);
  const points = meter.nodes.flatMap((node) => {
    const scale = Number(declarations(node).transform.match(/^scaleX\(([\d.]+)\)$/)?.[1]);
    return node.selector.split(",").map((percentage) => [Number(percentage.trim().replace("%", "")), scale]);
  });
  assert.deepEqual(points[0], [0, 0]);
  assert.deepEqual(points.at(-1), [100, 1]);
  for (let step = 1; step < points.length; step++) {
    assert.ok(points[step][0] > points[step - 1][0]);
    assert.ok(points[step][1] > points[step - 1][1] && points[step][1] <= 1, "Progress keeps moving without hard stops, reversal or overflow");
  }
  curves.add(JSON.stringify(points));
  const speeds = points.slice(1).map((point, index) => (point[1] - points[index][1]) / (point[0] - points[index][0]));
  assert.ok(Math.max(...speeds) > Math.min(...speeds) * 4, "Progress still hesitates and catches, rather than moving at a fixed rate");
  const end = parseInt(values["--boot-meter-duration"]) + parseInt(values["--boot-meter-delay"]);
  assert.ok(end >= 1800 && end <= 2220, "Every bar finishes before the existing loader handoff");
  const textEnd = parseInt(values["--boot-status-delay"]) + 18 * parseInt(values["--boot-status-step"]) + 450;
  assert.ok(textEnd < 1800, "Status remains readable before the loader exits");
}
assert.equal(curves.size, 4, "Four distinct rhythms, not the same curve renamed");
for (const name of ["boot-signal-lock", "boot-signal-register"]) {
  const frames = sheet.nodes.find((node) => node.name === "keyframes" && node.params === name);
  assert.ok(frames);
  frames.walkDecls((d) => { assert.equal(d.prop, "opacity"); assert.ok(Number(d.value) >= 0.7 && Number(d.value) <= 1); });
}
assert.ok(!css.includes("boot-flicker") && !css.includes("steps(22, end)"), "The repeated word blink and fixed stepping are replaced");
const head = read("index.html").slice(0, read("index.html").indexOf("<body>"));
assert.ok(head.includes('src="public/os-behaviour.js'));
assert.equal((read("index.html").match(/src="public\/os-behaviour\.js/g) || []).length, 1);
assert.ok(read("app/layout.tsx").includes('<script src="/os-behaviour.js" />'));
const attributes = new Map(); let draws = 0;
const math = Object.create(Math); math.random = () => { draws++; return 0.6; };
const presentation = vm.createContext({ Math: math, document: { documentElement: { getAttribute: (key) => attributes.get(key), setAttribute: (key, value) => attributes.set(key, value) } }, localStorage: { getItem() { throw new Error("Presentation must not read visitor storage"); } } });
vm.runInContext(read("public/os-behaviour.js"), presentation);
vm.runInContext(read("public/os-behaviour.js"), presentation);
assert.equal(draws, 1, "Head/bootstrap and bundle reuse cannot choose a new rhythm");
assert.equal(attributes.get("data-boot-profile"), "stream");
assert.match(reactSource, /showBoot \? " is-booting" : ""/);
assert.match(reactSource, /inert=\{showBoot\} aria-busy=\{showBoot\}/);
assert.match(reactSource, /localMemory === "prompt" && bootComplete/);
assert.match(staticSource, /state\.bootDismissed \? "" : " is-booting"/);
assert.match(staticSource, /state\.localMemory !== "prompt" \|\| !state\.bootDismissed/);
assert.match(staticSource, /--boot-elapsed: -\$\{Math\.max\(0, performance\.now\(\) - bootStartedAt\)\}ms/);
assert.match(staticSource, /if \(!state\.bootDismissed && !bootCleanup\)/);
assert.match(css, /\.archive-shell\.is-booting \{ --boot-handoff-delay: 3960ms; --boot-meter-extension: 210ms; --boot-ui-extension: 720ms; \}/);
assert.match(css, /\.archive-shell\.is-quick-boot \{ --boot-handoff-delay: 0ms; --boot-meter-extension: 0ms; \}/);
assert.match(css, /boot-exit 830ms ease-in-out calc\(8280ms \+ var\(--boot-elapsed, 0ms\)\)/);
assert.match(css, /boot-loader-exit 420ms ease-in-out calc\(2220ms \+ var\(--boot-meter-extension\) \+ var\(--boot-elapsed, 0ms\)\)/);
assert.match(css, /boot-session 2670ms ease-in-out calc\(2288ms \+ var\(--boot-handoff-delay\) \+ var\(--boot-elapsed, 0ms\)\)/);
assert.match(css, /\.archive-shell\.is-quick-boot > \.boot-screen \{\s*animation-name: quick-boot-exit;\s*animation-duration: 2800ms;/);
assert.match(css, /\.archive-shell\.is-quick-boot :is\(\.boot-session, \.boot-process-log\) \{ display: none; \}/);
assert.match(reactSource, /const done = \(\) => setBootComplete\(true\)/);
assert.match(reactSource, /scheduleBootCompletion\(done, 0, startupMode\)/);
assert.match(staticSource, /performance.now\(\) - bootStartedAt, state.startupMode/);
assert.match(css, /\.boot-session \{\s*position: absolute;\s*grid-area: auto;\s*align-self: start;\s*inset-block-start: 38%;/, "Profile is anchored to the viewport, not the loader's centered grid cell");
const sessionFrames = css.match(/@keyframes boot-session \{([\s\S]*?)\n\}/)?.[1];
assert.ok(sessionFrames);
const hold = sessionFrames.match(/([\d.]+)%, ([\d.]+)% \{ opacity: 1; \}/);
assert.ok(hold);
const fadeOutEnd = sessionFrames.match(/([\d.]+)%, 100% \{ opacity: 0; visibility: hidden; \}/);
assert.ok(fadeOutEnd);
const visibleMs = Number(fadeOutEnd[1]) * 2670 / 100;
const consoleStart = 2710, consoleDuration = 3530, lineStart = 2800, lineWrite = 1;
assert.equal(behaviour.bootProcesses.length, 24, "Full startup renders a tall process log");
assert.ok(consoleStart + consoleDuration < 3960 + 2288, "Console clears before the profile appears");
assert.ok(lineStart + behaviour.bootProcesses[0].at + lineWrite > 2220 + 210 + 420, "The first completed line follows the loader");
assert.ok(lineStart + behaviour.bootProcesses.at(-1).at + lineWrite + 400 < consoleStart + consoleDuration, "The complete log holds before the cut");
assert.ok(behaviour.bootProcesses.slice(1).filter((row, index) => row.at - behaviour.bootProcesses[index].at >= 300).length >= 2, "Startup has distinct phases rather than a fixed cadence");
assert.match(css, /boot-process-window 3530ms linear calc\(2710ms/);
assert.match(css, /@keyframes boot-process-window \{ from, to \{ visibility: visible; \} \}/, "The console cuts out without fading");
assert.match(css, /boot-process-line 1ms linear calc\(2800ms \+ var\(--boot-line-time\)[^;]*forwards/, "Each console line stays visible once written");
assert.ok(visibleMs >= 2200 && visibleMs <= 2450, "The operator phase leaves room for the module handoff");
assert.ok((Number(hold[2]) - Number(hold[1])) * 2670 / 100 >= 1300, "The profile still has a readable hold before the workspace");
assert.match(css, /\.boot-session-mark \{[^}]*border-radius: 0;/, "The portrait frame is square");
for (const [delay, duration] of [[3660, 1200], [3740, 1200], [3880, 1200], [4110, 970]]) {
  assert.ok(css.includes(`boot-surface ${duration}ms ease-in-out calc(${delay}ms + var(--boot-handoff-delay) + var(--boot-ui-extension) + var(--boot-elapsed, 0ms)) both`));
  assert.ok(3960 + 720 + delay + duration <= 11900, "All surfaces settle before controls are released");
}
const modules = Object.values(behaviour.bootModules);
assert.deepEqual(modules.map(({ order }) => order), [0, 1, 2, 3, 4, 5]);
assert.equal(new Set(modules.map(({ label }) => label)).size, 6, "Every plate has a distinct startup cue");
assert.match(css, /--boot-module-at: calc\(9110ms \+ var\(--boot-module-order\) \* 210ms/);
assert.match(css, /boot-module-seat 820ms/);
for (const name of ["seat", "heading", "content"]) {
  const frames = css.match(new RegExp(`@keyframes boot-module-${name} \\{([\\s\\S]*?)\\n\\}`))?.[1];
  assert.ok(frames);
  assert.doesNotMatch(frames, /clip-path|transform|height/, "Visible plates and their contents retain full bounds during startup");
}
assert.match(css, /--boot-readout-delay: 55ms;\s*--boot-readout-duration: 1020ms;/);
assert.match(css, /--boot-ready-at: calc\(var\(--boot-module-at\) \+ var\(--boot-readout-delay\) \+ var\(--boot-readout-duration\)\)/, "Module content cannot overlap its readout");
assert.match(css, /boot-module-heading 320ms ease-out var\(--boot-ready-at\) both/);
assert.match(css, /boot-module-content 520ms [^;]+ calc\(var\(--boot-ready-at\) \+ 80ms\) both/);
assert.match(css, /@keyframes boot-module-content \{\s*from \{ opacity: 0; \}/);
assert.ok(9110 + modules.at(-1).order * 210 + 55 + 1020 + 80 + 520 <= 11900, "The last plate settles before releasing inert");
assert.match(read("components/archive/dashboard.tsx"), /osBehaviour\.bootModules\[title\]/);
assert.match(staticSource, /window\.GestaltOsBehaviour\?\.bootModules\?\.\[title\]/);
const reactScreen = read("components/archive/boot-screen.tsx");
for (const source of [reactScreen, staticSource]) {
  for (const className of ["boot-loader", "boot-session", "boot-session-label", "boot-session-mark", "boot-session-user", "boot-session-detail"]) {
    assert.ok(source.includes(`"${className}"`), `Both readers render ${className}`);
  }
  assert.ok(source.includes("// SESSION READY"));
  assert.ok(source.includes("Opening the archive"));
}
assert.match(reactScreen, /src="\/images\/eightmouse-avatar.png" width="120" height="120" alt=""/);
assert.match(staticSource, /src="public\/images\/eightmouse-avatar.png" width="120" height="120" alt=""/);
const avatar = readFileSync(new URL("../public/images/eightmouse-avatar.png", import.meta.url));
assert.equal(avatar.subarray(0, 8).toString("hex"), "89504e470d0a1a0a", "The local avatar is a PNG, not a downloaded error page");
assert.equal(avatar.readUInt32BE(16), 256);
assert.equal(avatar.readUInt32BE(20), 256);
assert.ok(avatar.length < 128 * 1024, "The profile image stays small");
assert.match(read("index.html"), /rel="preload" as="image" href="public\/images\/eightmouse-avatar.png"/);
assert.match(read("app/layout.tsx"), /rel="preload" as="image" href="\/images\/eightmouse-avatar.png"/);
assert.match(read("app/layout.tsx"), /rel="preload" as="image" href="\/images\/archive-backdrop\.webp"/);
assert.match(css, /--archive-image: url\("\/images\/archive-backdrop\.webp"\)/, "The launcher preload matches its rendered backdrop");
assert.doesNotMatch(reactSource, /public\/images\/archive-(?:banner\.png|backdrop\.webp)/, "The React reader must not request the static shell's backdrop URL");
for (const file of ["app/layout.tsx", "app/globals.css", "components/archive/dashboard.tsx", "index.html", "static-app.js"]) {
  assert.doesNotMatch(read(file), /archive-banner\.png/, "The original artwork is not requested by either reader");
}
const backdrop = readFileSync(new URL("../public/images/archive-backdrop.webp", import.meta.url));
const backdropOriginal = readFileSync(new URL("../public/images/archive-banner.png", import.meta.url));
assert.equal(backdrop.toString("ascii", 0, 4) + backdrop.toString("ascii", 8, 12), "RIFFWEBP");
assert.ok(backdrop.length < backdropOriginal.length / 8, "The display copy stays much smaller than the preserved PNG");
assert.ok(read("lib/publish-paths.mjs").includes('"public/images/archive-backdrop.webp"'), "The backdrop belongs to the reviewed public runtime");
assert.ok(read("lib/publish-paths.mjs").includes('"public/images/eightmouse-avatar.png"'), "Content-only publishing cannot omit a changed profile asset");
assert.match(reactSource, /if \(!bootComplete \|\| localMemory === "prompt"/);
assert.match(staticSource, /if \(!state.bootDismissed \|\| state.localMemory === "prompt"\) return;/);
assert.match(css, /@media \(prefers-reduced-motion: reduce\)[\s\S]*\.boot-screen \{\s*display: none;/);
const cipherModule = vm.createContext({ exports: {} });
vm.runInContext(ts.transpileModule(read("components/archive/cipher.ts"), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, cipherModule);
const headlineModule = vm.createContext({ exports: {}, require: (id) => id === "@/components/archive/cipher" ? cipherModule.exports : require(id) });
vm.runInContext(ts.transpileModule(read("components/archive/headline-text.tsx"), { compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS } }).outputText, headlineModule);
const rendered = vm.createContext({ exports: {}, require: (id) => id === "@/components/archive/headline-text" ? headlineModule.exports : id === "@/public/os-behaviour.js" ? behaviour : require(id) });
vm.runInContext(ts.transpileModule(reactScreen, { compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, rendered);
const reactMarkup = renderToStaticMarkup(rendered.exports.BootScreen({ startupMode: "full" }));
assert.doesNotMatch(renderToStaticMarkup(rendered.exports.BootScreen({ startupMode: "quick" })), /boot-process-log/);
assert.match(staticSource, /state.startupMode === "full" \? `<ol class="boot-process-log">\$\{\(window.GestaltOsBehaviour\?\.bootProcesses/);
assert.deepEqual([...reactMarkup.matchAll(/--boot-line-time:(\d+)ms"><span class="boot-process-stamp">([\d.]+)<\/span><span class="boot-process-state">\[ OK \]<\/span>([^<]+)/g)].map(([, at, stamp, label]) => ({ at: Number(at), stamp, label })), behaviour.bootProcesses);
const sessionMarkup = (markup) => markup.slice(markup.indexOf('<div class="boot-session">'), markup.indexOf("</div>", markup.indexOf('<div class="boot-session">')) + 6).replace(/\s+</g, "<").replaceAll('src="public/images/eightmouse-avatar.png"', 'src="/images/eightmouse-avatar.png"').replaceAll("/>", ">");
assert.equal(sessionMarkup(reactMarkup), sessionMarkup(staticSource), "Both readers render the same welcome with their own public asset paths");
assert.ok(reactMarkup.includes('<span class="boot-session-user">Eightmouse</span>'), "The operator name has no cipher layer");
assert.doesNotMatch(css, /boot-user-(?:cipher|readable|jitter|duration)|data-boot-interference/);
assert.ok(css.includes("var(--boot-signal-span, var(--boot-signal-duration))") && css.includes("var(--boot-signal-start, 90ms)"), "GESTALT consumes bounded per-visit timing with CSS fallbacks");
assert.ok(!css.includes("var(--headline-index) * 8ms"), "No evenly staggered welcome wave");
assert.match(declarations(sheet.nodes.find((node) => node.selector === ".boot-meter b")).animation, /cubic-bezier\(0\.3, 0\.04, 0\.25, 1\)/, "Progress uses eased acceleration instead of rigid linear catches");

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
  let restoredFocus = false;
  const control = { getClientRects: () => [{}], closest: () => null, focus() { restoredFocus = true; } };
  const context = vm.createContext({
    bootComplete: false, localMemory: "granted", inlineRecordId: null, panelOpen: false, searchOpen: false,
    shellRef: { current: { querySelectorAll: () => [control] } },
    state: { bootDismissed: false, localMemory: "granted", searchOpen: false, searchQuery: "" },
    HTMLInputElement: class {}, HTMLTextAreaElement: class {}, HTMLElement: class { closest() { return null; } },
    render() {}, syncSearchPanel() {},
    setSearchOpen(update) { context.state.searchOpen = typeof update === "function" ? update(context.state.searchOpen) : update; },
    setSearchQuery(value) { context.state.searchQuery = value; }
  });
  const code = react ? ts.transpileModule(`const handler = ${source};`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText : `const handler = ${source};`;
  vm.runInContext(code, context);
  const handler = vm.runInContext("handler", context);
  const press = (args = {}) => {
    context.searchOpen = context.state.searchOpen;
    handler({ key: "~", target: null, preventDefault() {}, stopPropagation() {}, ...args });
  };
  press();
  assert.equal(context.state.searchOpen, false, "Boot ignores palette shortcuts");
  context.bootComplete = context.state.bootDismissed = true;
  context.localMemory = context.state.localMemory = "prompt";
  press();
  assert.equal(context.state.searchOpen, false, "Consent ignores palette shortcuts");
  context.localMemory = context.state.localMemory = "session";
  press();
  assert.equal(context.state.searchOpen, true, "The palette works after the handoff and consent");
  const paletteInput = new context.HTMLInputElement(); paletteInput.id = "archive-search";
  press({ target: paletteInput });
  assert.equal(context.state.searchOpen, false, "The focused palette search field permits its own toggle-close shortcut");
  if (react) assert.ok(restoredFocus, "The local reader restores focus to its visible search/menu control");
  for (const key of ["~", "`", "Escape"]) {
    context.searchOpen = context.state.searchOpen = true;
    context.state.searchQuery = "query";
    press({ key, target: paletteInput });
    assert.equal(context.state.searchOpen, false, `${key} closes the focused palette in both readers`);
    assert.equal(context.state.searchQuery, "");
  }
  for (const args of [{ repeat: true }, { isComposing: true }]) {
    context.state.searchOpen = true;
    press({ key: "Escape", target: paletteInput, ...args });
    assert.equal(context.state.searchOpen, true, "Composition cancellation and held Escape cannot dismiss the palette");
  }
  context.state.searchOpen = false;
  const editable = new context.HTMLElement(); editable.isContentEditable = true;
  const select = new context.HTMLElement(); select.closest = () => ({});
  for (const target of [new context.HTMLInputElement(), new context.HTMLTextAreaElement(), editable, select]) {
    press({ target });
    assert.equal(context.state.searchOpen, false, "Typing in another field/editor does not open the palette");
  }
  for (const args of [{ repeat: true }, { isComposing: true }, { ctrlKey: true }, { altKey: true }, { metaKey: true }]) {
    press(args);
    assert.equal(context.state.searchOpen, false, "Held keys, composition and browser shortcuts are untouched");
  }
  if (react) {
    let restoredEntry = false;
    context.panelOpen = true;
    context.state.searchOpen = true;
    context.shellRef.current.querySelector = (selector) => {
      assert.equal(selector, ".record-window:not([hidden]):not([inert])");
      return { focus() { restoredEntry = true; } };
    };
    press({ key: "Escape", target: paletteInput });
    assert.ok(restoredEntry, "After dismissing the palette, the next Escape can reach the active entry");
    context.inlineRecordId = "editing-note"; context.panelOpen = true;
    press();
    assert.equal(context.state.searchOpen, false, "Inline editing blocks the global palette shortcut even outside its text fields");
  }
}
const steamInit = ast.statements.find((node) => ts.isFunctionDeclaration(node) && node.name?.text === "initializeSteamDisplay").getText(ast);
assert.match(steamInit, /if \(steamDisplayStarted\) return;/);
assert.ok(!steamInit.includes("!state.bootDismissed"), "The existing one-shot Steam read can prepare during boot");
console.log("Boot passed: stable loader rhythms, ordered process log, plain operator profile, readable non-overlapping module cues, and quick/reduced startup.");
