import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { createRequire } from "node:module";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";
import cipherDecode from "../public/cipher-decode.js";

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
    assert.equal([...timers.values()][0].delay, mode === "quick" ? 1100 : 2500, "Rebuilds keep the chosen startup deadline");
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
const statusDuration = parseInt(declarations(sheet.nodes.find((node) => node.selector === ".boot-status.headline-decode-text"))["--cipher-duration"]);
for (const [index, profile] of behaviour.bootProfiles.entries()) {
  let draws = 0;
  const attributes = new Map();
  const doc = { documentElement: { getAttribute: (key) => attributes.get(key), setAttribute: (key, value) => attributes.set(key, value) } };
  assert.equal(behaviour.initializeBootPresentation(doc, () => { draws++; return (index + 0.1) / behaviour.bootProfiles.length; }), profile);
  assert.equal(behaviour.initializeBootPresentation(doc, () => { throw new Error("Must not reshuffle"); }), profile);
  assert.equal(draws, 1, "One profile per document, not per render/section/palette");
  const override = sheet.nodes.find((node) => node.selector === `:root[data-boot-profile="${profile}"] .boot-screen`);
  const values = { ...bootDefaults, ...(override ? declarations(override) : {}) };
  assert.ok(!Object.keys(values).some((key) => key.startsWith("--boot-meter")), "No scripted progress bar remains");
  assert.ok(240 + parseInt(values["--boot-status-delay"]) + statusDuration < 1280, `${profile}: the status resolves before the loader cuts`);
  assert.ok(240 + parseInt(values["--boot-word-delay"]) + parseInt(values["--boot-word-duration"]) < 1280, `${profile}: GESTALT is typed before the cut`);
}
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
// Power-on timeline: tube 0-440ms, readiness 520-1040ms, cut 1280ms, session 1300ms, handoff 2200ms (quick 760ms).
assert.match(css, /\.archive-shell\.is-booting \{ --boot-on: 240ms; --boot-workspace-at: 2200ms; \}/);
assert.match(css, /\.archive-shell\.is-quick-boot \{ --boot-workspace-at: 760ms; \}/);
assert.match(css, /\.boot-tube \{[^}]*animation: boot-tube-on 440ms linear var\(--boot-elapsed, 0ms\) both;/, "The tube warms up first, on the boot clock");
assert.match(css, /boot-shutter 200ms [^;]*calc\(var\(--boot-workspace-at, 2200ms\) \+ var\(--boot-elapsed, 0ms\)\) both/, "The screen leaves by shuttering into a line");
assert.match(css, /\.archive-shell:not\(\.is-quick-boot\) \.boot-loader \{\s*animation: boot-cut 1ms linear calc\(1280ms \+ var\(--boot-elapsed, 0ms\)\) forwards;/, "The loader cuts, it never dissolves");
assert.match(css, /\.archive-shell\.is-quick-boot :is\(\.boot-session, \.boot-readiness\) \{ display: none; \}/, "Quick start skips the readiness and session");
for (const name of ["boot-exit", "quick-boot-exit", "boot-loader-exit", "boot-artwork", "boot-load", "boot-module-seat", "boot-module-readout"]) {
  assert.ok(!css.includes(`@keyframes ${name} {`), `${name} is retired`);
}
assert.ok(!css.includes("boot-process-log") && !css.includes("dashboard-boot-readout") && !css.includes(".boot-meter"), "No scripted console, readouts or meter");
assert.match(reactSource, /const done = \(\) => setBootComplete\(true\)/);
assert.match(reactSource, /scheduleBootCompletion\(done, 0, startupMode\)/);
assert.match(staticSource, /performance.now\(\) - bootStartedAt, state.startupMode/);
assert.match(css, /\.boot-session \{\s*position: absolute;\s*grid-area: auto;\s*align-self: start;\s*inset-block-start: 38%;/, "Profile is anchored to the viewport, not the loader's centered grid cell");
assert.match(css, /\.boot-session \{[^}]*animation: boot-line-in 200ms linear calc\(1300ms \+ var\(--boot-elapsed, 0ms\)\) both;/, "The operator session arrives right after the cut and holds until the handoff");
assert.ok(2200 - 1500 >= 700, "The session holds long enough to read");
assert.match(css, /\.boot-session-mark \{[^}]*border-radius: 0;/, "The portrait frame is square");
assert.match(css, /\.boot-readiness li \{[^}]*animation: boot-line-in 160ms linear calc\(520ms \+ var\(--boot-line, 0\) \* 120ms \+ var\(--boot-elapsed, 0ms\)\) both;/, "Readiness lines land on one beat");
assert.ok(520 + 3 * 120 + 160 + 240 <= 1280, "Every readiness line, including the last session, holds before the cut");
const modules = Object.values(behaviour.bootModules);
assert.deepEqual(modules.map(({ order }) => order), [0, 1, 2, 3, 4, 5]);
assert.match(css, /boot-plate-unfold 240ms [^;]*calc\(var\(--boot-workspace-at\) \+ 60ms \+ var\(--boot-row\) \* 80ms \+ var\(--boot-elapsed, 0ms\)\) both/, "Plates unfold row by row on one rhythm");
assert.match(css, /\[data-boot-module="game"\], \[data-boot-module="log"\], \[data-boot-module="memory"\]\) \{ --boot-row: 1; \}/);
assert.match(css, /\[data-boot-module="activity"\] \{ --boot-row: 2; \}/);
assert.match(css, /boot-screen-flare 420ms ease-out calc\(var\(--boot-workspace-at\) \+ 360ms/, "The screens power on last");
assert.ok(2200 + 360 + 420 <= 3000 && 760 + 360 + 420 <= 1600 && 2200 + 560 <= 3000, "The last flare settles before controls are released");
assert.ok(2200 + 60 + 2 * 80 + 240 <= 3000, "The last plate settles before releasing inert");
for (const name of ["boot-tube-on", "boot-shutter", "boot-plate-unfold"]) {
  const frames = sheet.nodes.find((node) => node.name === "keyframes" && node.params === name);
  assert.ok(frames, name);
  frames.walkDecls((decl) => assert.ok(["transform", "opacity", "visibility"].includes(decl.prop), `${name} animates only transform and opacity`));
}
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
assert.match(read("app/layout.tsx"), /data-backdrop-night="\/images\/archive-backdrop\.webp" data-backdrop-day="\/images\/archive-backdrop-day\.webp"/);
assert.match(css, /--archive-image: url\("\/images\/archive-backdrop\.webp"\)/, "The launcher preload matches its rendered backdrop");
assert.match(css, /--archive-day-image: url\("\/images\/archive-backdrop-day\.webp"\)/, "Day has its own launcher backdrop");
assert.doesNotMatch(reactSource, /public\/images\/archive-(?:banner\.png|backdrop\.webp)/, "The React reader must not request the static shell's backdrop URL");
for (const file of ["app/layout.tsx", "app/globals.css", "components/archive/dashboard.tsx", "index.html", "static-app.js"]) {
  assert.doesNotMatch(read(file), /archive-banner\.png/, "The original artwork is not requested by either reader");
}
const backdrop = readFileSync(new URL("../public/images/archive-backdrop.webp", import.meta.url));
const backdropOriginal = readFileSync(new URL("../public/images/archive-banner.png", import.meta.url));
assert.equal(backdrop.toString("ascii", 0, 4) + backdrop.toString("ascii", 8, 12), "RIFFWEBP");
assert.ok(backdrop.length < backdropOriginal.length / 8, "The display copy stays much smaller than the preserved PNG");
assert.ok(read("lib/publish-paths.mjs").includes('"public/images/archive-backdrop.webp"'), "The backdrop belongs to the reviewed public runtime");
const dayBackdrop = readFileSync(new URL("../public/images/archive-backdrop-day.webp", import.meta.url));
assert.equal(dayBackdrop.toString("ascii", 0, 4) + dayBackdrop.toString("ascii", 8, 12), "RIFFWEBP");
assert.ok(!dayBackdrop.equals(backdrop) && dayBackdrop.length < 300 * 1024, "The alternate backdrop stays distinct and sized for startup");
assert.ok(read("lib/publish-paths.mjs").includes('"public/images/archive-backdrop-day.webp"'));
assert.ok(read("lib/publish-paths.mjs").includes('"public/images/eightmouse-avatar.png"'), "Content-only publishing cannot omit a changed profile asset");
assert.match(reactSource, /if \(!bootComplete \|\| localMemory === "prompt"/);
assert.match(staticSource, /if \(!state.bootDismissed \|\| state.localMemory === "prompt"\) return;/);
assert.match(css, /@media \(prefers-reduced-motion: reduce\)[\s\S]*\.boot-screen,\s*\.boot-thread \{\s*display: none;/, "Reduced Motion skips the whole power-on, including the thread");
// Signature touches: the thread becomes the header rule, the last visit is remembered locally, and
// Memory State's first lines are the boot itself.
assert.match(css, /\.boot-thread \{[^}]*animation: boot-thread 560ms [^;]*calc\(var\(--boot-workspace-at\) \+ var\(--boot-elapsed, 0ms\)\) both;/);
assert.match(css, /80% \{ opacity: 1; transform: translate\(var\(--thread-x, 0px\), var\(--thread-y, 0px\)\) scaleX\(var\(--thread-scale, 1\)\); \}/, "The thread lands on the measured header rule");
assert.equal(behaviour.lastSessionLabel(undefined), null, "No local memory, no last-session line");
assert.equal(behaviour.lastSessionLabel(null), "First session");
const sessionNow = new Date(2026, 10, 27, 18, 0);
assert.equal(behaviour.lastSessionLabel(new Date(2026, 10, 27, 9, 0).toISOString(), sessionNow), "Earlier today");
assert.equal(behaviour.lastSessionLabel(new Date(2026, 10, 26, 23, 0).toISOString(), sessionNow), "Yesterday");
assert.equal(behaviour.lastSessionLabel(new Date(2026, 10, 24, 12, 0).toISOString(), sessionNow), "3 days ago");
assert.equal(behaviour.lastSessionLabel(new Date(2026, 8, 1, 12, 0).toISOString(), sessionNow), "01 / 09 / 2026");
assert.equal(behaviour.lastSessionLabel("not a date", sessionNow), "First session");
const sessionStore = new Map([["gestalt.local-memory", "session"]]);
const sessionStorage = { getItem: (key) => sessionStore.get(key) ?? null, setItem: (key, value) => sessionStore.set(key, value) };
assert.equal(behaviour.readLastSession(sessionStorage), undefined, "Without granted local memory nothing is read");
assert.equal(behaviour.saveLastSession(sessionNow, sessionStorage), false, "Without granted local memory nothing is written");
sessionStore.set("gestalt.local-memory", "granted");
assert.equal(behaviour.readLastSession(sessionStorage), null);
assert.equal(behaviour.saveLastSession(sessionNow, sessionStorage), true);
assert.equal(behaviour.readLastSession(sessionStorage), sessionNow.toISOString(), "One local timestamp, nothing else");
assert.deepEqual(behaviour.bootReadiness({ lastSession: "Yesterday" }).at(-1), { key: "session", label: "LAST SESSION", value: "Yesterday" });
assert.equal(behaviour.bootReadiness({ lastSession: null }).length, 3);
const headlineModule = vm.createContext({ exports: {}, require: (id) => id === "@/public/cipher-decode.js" ? cipherDecode : require(id) });
vm.runInContext(ts.transpileModule(read("components/archive/headline-text.tsx"), { compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS } }).outputText, headlineModule);
const rendered = vm.createContext({ exports: {}, require: (id) => id === "@/components/archive/headline-text" ? headlineModule.exports : id === "@/public/os-behaviour.js" ? behaviour : require(id) });
vm.runInContext(ts.transpileModule(reactScreen, { compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, rendered);
const reactMarkup = renderToStaticMarkup(rendered.exports.BootScreen({ startupMode: "full" }));
assert.doesNotMatch(renderToStaticMarkup(rendered.exports.BootScreen({ startupMode: "quick" })), /boot-readiness/);
assert.match(staticSource, /state\.startupMode === "full" \? `<ol class="boot-readiness">\$\{bootReadinessLines\(\)\}<\/ol>` : ""/);
assert.deepEqual([...reactMarkup.matchAll(/<li data-boot-line="(\w+)"><span>([A-Z]+)<\/span><b>([^<]+)<\/b><\/li>/g)].map(([, key, label, value]) => [key, label, value]), [["records", "RECORDS", "00 read"], ["appearance", "APPEARANCE", "Night"], ["steam", "STEAM", "Reading"]], "The full welcome reports real state, not a script");
assert.deepEqual(behaviour.bootReadiness({ records: 63, appearance: "day", steam: "ready" }).map(({ value }) => value), ["63 read", "Day", "Snapshot read"]);
assert.equal(behaviour.bootReadiness({ steam: "offline" }).at(-1).value, "Offline, using records", "A missing snapshot is reported, never hidden");
assert.match(staticSource, /const readiness = document\.querySelector\("\.boot-readiness"\);\s*if \(readiness\) readiness\.innerHTML = bootReadinessLines\(\);/, "The Steam line updates in place when the snapshot lands during boot");
assert.match(reactSource, /steam: steamReady \? \(steamSnapshot \? "ready" : "offline"\) : "reading"/);
for (const source of [reactScreen, staticSource]) assert.ok(source.includes("boot-tube"), "Both readers render the tube");
const sessionMarkup = (markup) => markup.slice(markup.indexOf('<div class="boot-session">'), markup.indexOf("</div>", markup.indexOf('<div class="boot-session">')) + 6).replace(/\s+</g, "<").replaceAll('src="public/images/eightmouse-avatar.png"', 'src="/images/eightmouse-avatar.png"').replaceAll("/>", ">");
assert.equal(sessionMarkup(reactMarkup), sessionMarkup(staticSource), "Both readers render the same welcome with their own public asset paths");
assert.ok(reactMarkup.includes('<span class="boot-session-user">Eightmouse</span>'), "The operator name has no cipher layer");
assert.doesNotMatch(css, /boot-user-(?:cipher|readable|jitter|duration)|data-boot-interference/);
assert.ok(css.includes("var(--boot-signal-span, var(--boot-signal-duration))") && css.includes("var(--boot-signal-start, 90ms)"), "GESTALT consumes bounded per-visit timing with CSS fallbacks");
assert.ok(!css.includes("var(--headline-index) * 8ms"), "No evenly staggered welcome wave");

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
console.log("Boot passed: tube warm-up, stable wordmark rhythms, real readiness lines, plain operator profile, shutter handoff, row-by-row plates, screen flare, and quick/reduced startup.");
