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
const require = createRequire(import.meta.url);
const behaviour = require("../public/os-behaviour.js");
const postcss = createRequire(require.resolve("next/package.json"))("postcss");
const sheet = postcss.parse(css);
const declarations = (rule) => Object.fromEntries(rule.nodes.filter((node) => node.type === "decl").map((node) => [node.prop, node.value]));
const bootDefaults = declarations(sheet.nodes.find((node) => node.selector === ".boot-screen"));
const welcomeLetters = [".boot-session-user .headline-char:nth-child(-n + 3)", ".boot-session-user .headline-char:nth-child(n + 4):nth-child(-n + 6)", ".boot-session-user .headline-char:nth-child(n + 7)"].map((selector) => declarations(sheet.nodes.find((node) => node.selector === selector)));
assert.equal(new Set(welcomeLetters.map((values) => values["--boot-user-duration"])).size, 3, "Each interrupted letter has its own brief duration");
for (const [mask, nth] of [[0, "3n + 1"], [1, "3n + 2"], [2, "3n"]]) assert.ok(css.includes(`:root[data-boot-interference="${mask}"] .boot-session-user .headline-char:nth-child(${nth})`), "Each visit pattern selects just three of nine letters");
const signalDetails = new Set();
const welcomeMasks = new Set();
for (const sample of [...Array.from({ length: 257 }, (_, index) => index / 257), -1, 1, 2, NaN, Infinity]) {
  const attributes = new Map(), styles = new Map();
  let draws = 0, writes = 0;
  const doc = { documentElement: { getAttribute: (key) => attributes.get(key), setAttribute: (key, value) => attributes.set(key, value), style: { setProperty(key, value) { writes++; styles.set(key, value); } } } };
  const profile = behaviour.initializeBootPresentation(doc, () => { draws++; return sample; });
  const before = [...styles];
  behaviour.initializeBootPresentation(doc, () => { throw new Error("No per-render randomness"); });
  assert.equal(draws, 1);
  assert.equal(writes, 6, "Six bounded pre-paint values, never an ongoing updater");
  assert.deepEqual([...styles], before);
  const ms = (name) => { assert.match(styles.get(name), /^-?\d+ms$/); return parseInt(styles.get(name)); };
  const start = ms("--boot-signal-start"), duration = ms("--boot-signal-span");
  assert.ok(start >= 90 && start <= 390 && duration >= 760 && duration <= 1160);
  assert.ok(start + duration < 1800, "GESTALT settles before loader handoff");
  const jitter = ms("--boot-user-jitter");
  assert.ok(jitter >= -40 && jitter <= 40);
  const override = sheet.nodes.find((node) => node.selector === `:root[data-boot-profile="${profile}"] .boot-screen`);
  const userStart = parseInt(({ ...bootDefaults, ...(override ? declarations(override) : {}) })["--boot-user-delay"]) + jitter;
  assert.ok(userStart >= 3000);
  for (const [index, range] of [[0, [30, 180]], [1, [0, 90]], [2, [100, 240]]]) {
    const offset = ms(`--boot-user-offset-${"abc"[index]}`);
    assert.ok(offset >= range[0] && offset <= range[1]);
    assert.ok(userStart + offset + parseInt(welcomeLetters[index]["--boot-user-duration"]) < 3744, "Every randomized letter settles before welcome fade");
  }
  signalDetails.add(JSON.stringify([...styles]));
  welcomeMasks.add(attributes.get("data-boot-interference"));
}
assert.ok(signalDetails.size > 250, "Variation is finer than four repeated scripted timings");
assert.deepEqual([...welcomeMasks].sort(), ["0", "1", "2"]);
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
  const userStart = parseInt(values["--boot-user-delay"]);
  assert.ok(userStart >= 3000, "The name is readable before its signal disturbance");
  for (const letter of welcomeLetters) assert.ok(userStart + Number(letter["--boot-user-offset"].match(/, (\d+)ms\)/)[1]) + parseInt(letter["--boot-user-duration"]) < 3744, "Fallback timing settles before welcome fade");
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
assert.ok(read("lib/publish-paths.mjs").includes('"public/images/eightmouse-avatar.png"'), "Content-only publishing cannot omit a changed profile asset");
assert.match(reactSource, /if \(!bootComplete \|\| localMemory === "prompt"/);
assert.match(staticSource, /if \(!state.bootDismissed \|\| state.localMemory === "prompt"\) return;/);
assert.match(css, /@media \(prefers-reduced-motion: reduce\)[\s\S]*\.boot-screen \{\s*display: none;/);
const cipherModule = vm.createContext({ exports: {} });
vm.runInContext(ts.transpileModule(read("components/archive/cipher.ts"), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, cipherModule);
const headlineModule = vm.createContext({ exports: {}, require: (id) => id === "@/components/archive/cipher" ? cipherModule.exports : require(id) });
vm.runInContext(ts.transpileModule(read("components/archive/headline-text.tsx"), { compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS } }).outputText, headlineModule);
const rendered = vm.createContext({ exports: {}, require: (id) => id === "@/components/archive/headline-text" ? headlineModule.exports : require(id) });
vm.runInContext(ts.transpileModule(reactScreen, { compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, rendered);
const reactMarkup = renderToStaticMarkup(rendered.exports.BootScreen());
const staticLetters = vm.createContext({ cipherizeText: cipherModule.exports.cipherizeText });
for (const name of ["escapeHtml", "renderHeadlineLetters"]) {
  vm.runInContext(ast.statements.find((node) => ts.isFunctionDeclaration(node) && node.name?.text === name).getText(ast), staticLetters);
}
const staticUserMarkup = staticSource.replace('${renderHeadlineLetters("Eightmouse")}', vm.runInContext('renderHeadlineLetters("Eightmouse")', staticLetters));
const sessionMarkup = (markup) => markup.slice(markup.indexOf('<div class="boot-session">'), markup.indexOf("</div>", markup.indexOf('<div class="boot-session">')) + 6).replace(/\s+</g, "<").replaceAll('src="public/images/eightmouse-avatar.png"', 'src="/images/eightmouse-avatar.png"').replaceAll("/>", ">").replace(/<span aria-hidden="true" class="headline-char" style="--headline-index:(\d+)">/g, '<span class="headline-char" style="--headline-index: $1" aria-hidden="true">');
assert.equal(sessionMarkup(reactMarkup), sessionMarkup(staticUserMarkup), "Both readers render the same welcome and cipher letters with their own public asset paths");
assert.ok(reactMarkup.includes('class="boot-session-user" aria-label="Eightmouse"'));
const userFrames = ["boot-user-readable", "boot-user-cipher"].map((name) => {
  const frames = sheet.nodes.find((node) => node.name === "keyframes" && node.params === name);
  assert.ok(frames);
  frames.walkDecls((decl) => assert.ok(["opacity", "transform"].includes(decl.prop), "Name disturbance uses only opacity and transform"));
  return frames.nodes.flatMap((node) => node.selector.split(",").map((percent) => [parseInt(percent), Number(declarations(node).opacity)])).sort((a, b) => a[0] - b[0]);
});
for (let percent = 0; percent <= 100; percent++) {
  const [readable, cipher] = userFrames.map((points) => points.filter(([at]) => at <= percent).at(-1)[1]);
  assert.equal(readable + cipher, 1, "Readable and cipher layers never overlap or leave a blank letter");
  if (percent === 0 || percent === 100) assert.equal(readable, 1, "Welcome begins and ends readable");
}
assert.match(css, /\.boot-session-user :is\(\.headline-char-readable, \.headline-char-cipher\) \{[^}]*animation-duration: var\(--boot-user-duration\);[^}]*animation-fill-mode: both;/);
assert.match(css, /\.boot-session-user \.headline-char \{ --boot-user-readable-sequence: none; --boot-user-cipher-sequence: none; \}/, "Unaffected letters stay still");
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
    context.inlineRecordId = "editing-note"; context.panelOpen = true;
    press();
    assert.equal(context.state.searchOpen, false, "Inline editing blocks the global palette shortcut even outside its text fields");
  }
}
const steamInit = ast.statements.find((node) => ts.isFunctionDeclaration(node) && node.name?.text === "initializeSteamDisplay").getText(ast);
assert.match(steamInit, /if \(steamDisplayStarted\) return;/);
assert.ok(!steamInit.includes("!state.bootDismissed"), "The existing one-shot Steam read can prepare during boot");
console.log("Boot passed: stable visit rhythms, bounded signal/letter variation, monotonic progress, complementary cipher layers, unchanged handoff, cancellation, reduced motion and keyboard guards.");
