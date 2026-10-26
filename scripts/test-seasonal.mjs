import assert from "node:assert/strict";
import { readFileSync, statSync } from "node:fs";
import { createRequire } from "node:module";
import { spawnSync } from "node:child_process";
import vm from "node:vm";
import ts from "typescript";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import seasonal from "../public/seasonal.js";

const require = createRequire(import.meta.url);
const read = (file) => readFileSync(new URL(`../${file}`, import.meta.url), "utf8");
for (let month = 0; month < 12; month++) {
  const expected = ({ 0: "january", 9: "october", 11: "december" })[month] || null;
  for (const day of [1, 15, new Date(2026, month + 1, 0).getDate()]) {
    const date = new Date(2026, month, day, 23, 59, 59);
    assert.equal(seasonal.seasonFor(date)?.id || null, expected);
    assert.equal(seasonal.seasonFor(date, "off"), null);
  }
}
assert.equal(seasonal.seasonFor(null), null);
assert.equal(seasonal.seasonFor(new Date(NaN)), null);
assert.equal(seasonal.normalizeMode("unexpected"), "auto");
const values = new Map();
const storage = { getItem: (key) => values.get(key), setItem: (key, value) => values.set(key, value) };
seasonal.saveMode("off", storage);
assert.equal(seasonal.readMode(storage), "off");
seasonal.saveMode("auto", storage);
assert.equal(seasonal.readMode(storage), "auto");
assert.equal(values.size, 1, "Only this non-sensitive preference is stored");
const blocked = { getItem() { throw new Error("blocked"); }, setItem() { throw new Error("blocked"); } };
assert.equal(seasonal.readMode(blocked), "auto");
assert.doesNotThrow(() => seasonal.saveMode("off", blocked));
for (const [zone, expected] of [["America/Los_Angeles", "october"], ["Asia/Shanghai", null]]) {
  const result = spawnSync(process.execPath, ["--input-type=module", "-e", "import seasonal from './public/seasonal.js'; console.log(seasonal.seasonFor(new Date('2026-11-01T00:30:00Z'))?.id || 'none');"], { env: { ...process.env, TZ: zone }, encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout.trim(), expected || "none", "Use the visitor's calendar, not the server's month");
}
const helperContext = vm.createContext({});
vm.runInContext(read("public/seasonal.js"), helperContext);
assert.equal(typeof helperContext.GestaltSeasonal.seasonFor, "function", "Classic script exposes the same policy without Node");

const staticSource = read("static-app.js");
const ast = ts.createSourceFile("static-app.js", staticSource, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
const names = ["seasonalAccentMarkup", "syncSeasonalAccent", "syncSeasonalMotion", "changeSeasonalMode", "escapeHtml"];
let now = new Date(2026, 9, 22);
class Clock extends Date { constructor(...args) { super(...(args.length ? args : [now.getTime()])); } }
let writes = 0;
const target = { dataset: { season: "october" }, toggleAttribute(name, enabled) { this[name] = enabled; }, set outerHTML(value) { writes++; this.markup = value; this.dataset.season = value.match(/data-season="([^"]*)"/)[1]; } };
const context = vm.createContext({ Date: Clock, window: { GestaltSeasonal: { ...seasonal, saveMode: (mode) => seasonal.saveMode(mode, storage) } }, state: { seasonalMode: "auto", localMemory: "granted" }, document: { hidden: false, querySelector: () => target }, render() { throw new Error("Seasonal preferences must not rebuild the reader"); } });
vm.runInContext(names.map((name) => ast.statements.find((node) => ts.isFunctionDeclaration(node) && node.name?.text === name).getText(ast)).join("\n"), context);
context.syncSeasonalAccent();
assert.equal(writes, 0, "The existing clock tick must not replace unchanged decorations");
context.document.hidden = true;
context.syncSeasonalMotion();
assert.equal(target["data-paused"], true);
assert.match(context.seasonalAccentMarkup(), /data-paused/);
context.document.hidden = false;
context.syncSeasonalMotion();
assert.equal(target["data-paused"], false);
assert.equal(writes, 0, "Visibility changes only pause motion, not rebuild the reader");
context.changeSeasonalMode("off");
assert.match(target.markup, / hidden/);
assert.equal(seasonal.readMode(storage), "off");
context.changeSeasonalMode("auto");
assert.match(target.markup, /october\.svg/);
now = new Date(2026, 10, 1);
context.syncSeasonalAccent();
assert.match(target.markup, / hidden/);
assert.ok(!target.markup.includes("<img"), "Off-season renders no image request");
now = new Date(2026, 11, 1);
context.syncSeasonalAccent();
assert.match(target.markup, /data-season="december"/);
assert.match(target.markup, / hidden/, "December's redesigned dressing is still roadmap work");
assert.ok(!target.markup.includes("<img"));
const mountedTarget = context.document.querySelector;
context.document.querySelector = () => null;
assert.doesNotThrow(() => context.syncSeasonalMotion());
assert.doesNotThrow(() => context.changeSeasonalMode("off"), "Preferences also work away from the dashboard");
assert.equal(context.state.seasonalMode, "off");
context.document.querySelector = mountedTarget;
context.state.seasonalMode = "auto";
context.window.GestaltSeasonal = undefined;
assert.doesNotThrow(() => context.changeSeasonalMode("off"));
assert.match(context.seasonalAccentMarkup(), / hidden/, "A missing optional helper must not break navigation");

const reactContext = vm.createContext({ exports: {}, require: (id) => id === "@/public/seasonal.js" ? seasonal : require(id) });
vm.runInContext(ts.transpileModule(read("components/archive/seasonal-accent.tsx"), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText, reactContext);
context.window.GestaltSeasonal = seasonal;
const assets = new Set();
for (const month of [0, 9, 11]) {
  const date = new Date(2026, month, 15);
  const detail = seasonal.seasonFor(date);
  const react = renderToStaticMarkup(createElement(reactContext.exports.SeasonalAccent, { now: date, mode: "auto" }));
  const html = context.seasonalAccentMarkup(date);
  assert.ok(react.includes(detail.id) && html.includes(detail.id));
  assert.match(react, /aria-hidden="true"/);
  const imageCount = detail.decorations.reduce((total, item) => total + 1 + Number(Boolean(item.glowImage)), 0);
  assert.equal((react.match(/<img\b/g) || []).length, imageCount);
  assert.equal((html.match(/<img\b/g) || []).length, imageCount);
  for (const decoration of detail.decorations) {
    assert.ok(react.includes(`data-placement="${decoration.placement}"`) && html.includes(`data-placement="${decoration.placement}"`), "Reader placements agree");
    for (const file of [decoration.image, decoration.glowImage].filter(Boolean)) {
      assert.ok(react.includes(`src="${file.replace(/^public\//, "/")}"`), "React uses Next's public root");
      assert.ok(html.includes(`src="${file}"`), "Static assets retain the Pages project subpath");
      assets.add(file);
      const asset = read(file);
      assert.ok(statSync(new URL(`../${file}`, import.meta.url)).size < 4096, "Artwork stays small");
      assert.match(asset, /viewBox="0 0 \d+ \d+"/);
      assert.ok(!/<script|foreignObject|\bon\w+=|(?:href|src)=["'](?:https?:|data:|javascript:)/i.test(asset), "Local passive SVG only");
    }
  }
  if (!detail.decorations.length) assert.match(react, /hidden=""/);
}
assert.equal(assets.size, 4, "Four placements reuse small local artwork and a face-only glow overlay");
assert.ok([...assets].reduce((total, file) => total + statSync(new URL(`../${file}`, import.meta.url)).size, 0) < 6144, "The complete artwork set stays below 6 KB");
assert.deepEqual(seasonal.seasonFor(new Date(2026, 9, 23)).decorations.map((item) => item.placement), ["projects-web", "game-pumpkin", "memory-hanging", "log-web"]);
assert.ok(!renderToStaticMarkup(createElement(reactContext.exports.SeasonalAccent, { now, mode: "off" })).includes("<img"));
const index = read("index.html");
assert.ok(index.indexOf("public/seasonal.js") < index.indexOf("static-app.js"));
for (const file of ["scripts/prepare-pages.mjs", "scripts/publish-site.mjs"]) assert.ok((read(file) + read("lib/publish-paths.mjs")).includes('"public/seasonal.js"'));
for (const file of ["public/seasonal.js", "components/archive/seasonal-accent.tsx"]) assert.ok(!/fetch\(|setInterval|setTimeout|requestAnimationFrame/.test(read(file)), "No network service or extra animation loop");
const css = read("app/globals.css");
const seasonalStart = css.indexOf(".seasonal-accent {");
const seasonalCss = css.slice(seasonalStart, css.indexOf(".workspace-header h1", seasonalStart));
assert.ok(!/transition\s*:|filter\s*:/.test(seasonalCss), "No animated filters or unnecessary transitions");
assert.equal((seasonalCss.match(/@keyframes /g) || []).length, 2, "Only the requested swing and ember animate");
assert.match(seasonalCss, /transform-origin: 68\.75% 1\.63%/, "The ornament swings from its pin");
assert.match(seasonalCss, /rotate\(-4deg\)/);
assert.match(seasonalCss, /rotate\(4deg\)/);
assert.match(seasonalCss, /data-placement="game-pumpkin"[^}]+grid-column: 1; grid-row: 2/, "Pumpkin follows the current game card");
assert.match(seasonalCss, /data-placement="game-pumpkin"\] img[^}]+inset-block-start: auto; inset-block-end: 0/, "Pumpkin sits inside the bottom-right corner");
assert.ok(!seasonalCss.includes("overflow-clip-margin"), "No paint outset is needed for an inside decoration");
assert.ok(!read("public/images/seasonal/halloween-hanging.svg").includes("M35 53"), "No extra pumpkin charm remains");
assert.match(seasonalCss, /data-paused/);
assert.match(seasonalCss, /animation-play-state: paused/);
assert.match(seasonalCss, /prefers-reduced-motion: reduce/);
assert.match(seasonalCss, /animation: none; transform: none/);
assert.match(seasonalCss, /animation: none; opacity: 0\.25/);
assert.match(read("components/archive/seasonal-accent.tsx"), /return \(\) => document\.removeEventListener\("visibilitychange", updateVisibility\)/, "React releases the visibility listener");
assert.match(seasonalCss, /grid-template-columns: inherit/);
assert.match(seasonalCss, /grid-template-rows: inherit/);
assert.match(seasonalCss, /pointer-events: none/);
assert.ok(read("components/archive/dashboard.tsx").includes("<SeasonalAccent"));
assert.ok(!read("components/archive-os.tsx").includes("<SeasonalAccent"), "No standalone header emblem remains");
const dashboardNode = ast.statements.find((node) => ts.isFunctionDeclaration(node) && node.name?.text === "dashboard");
const renderNode = ast.statements.find((node) => ts.isFunctionDeclaration(node) && node.name?.text === "render");
assert.ok(dashboardNode.getText(ast).includes("${seasonalAccentMarkup()}"));
assert.ok(!renderNode.getText(ast).includes("${seasonalAccentMarkup()}"));
assert.match(css, /max-width: 1200px\), \(max-height: 850px\) \{ \.seasonal-accent \{ display: none/);
console.log("Seasonal checks passed: month boundaries, storage fallback, placement parity, in-place preferences, lightweight motion with visibility/reduced-motion guards, and packaging.");
