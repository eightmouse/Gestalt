import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import vm from "node:vm";
import appearance from "../public/appearance.js";
import behaviour from "../public/os-behaviour.js";
import { updateStaticCacheTokens } from "./static-cache.mjs";

const read = (file) => readFileSync(new URL(`../${file}`, import.meta.url), "utf8");
const require = createRequire(import.meta.url);
const postcss = createRequire(require.resolve("next/package.json"))("postcss");
function fixture() {
  const attributes = new Map(), stored = new Map(), listeners = new Map();
  let writes = 0;
  const doc = { hidden: false, documentElement: {
    getAttribute: (key) => attributes.get(key) ?? null,
    hasAttribute: (key) => attributes.has(key),
    setAttribute: (key, value) => attributes.set(key, value)
  }, addEventListener: (key, callback) => { assert.ok(!listeners.has(key), "One page-lifetime resume listener"); listeners.set(key, callback); } };
  return { document: doc, attributes, stored, listeners, get writes() { return writes; }, localStorage: {
    getItem: (key) => stored.get(key), setItem(key, value) { writes++; stored.set(key, value); }
  } };
}
for (const bad of [null, undefined, "light", {}, "<script>"]) assert.equal(appearance.normalizeMode(bad), "night");
for (const [hour, minute, expected] of [[0, 0, "night"], [6, 59, "night"], [7, 0, "day"], [18, 59, "day"], [19, 0, "night"], [23, 59, "night"]]) {
  assert.equal(appearance.resolveMode("auto", new Date(2026, 10, 2, hour, minute)), expected);
  assert.equal(appearance.resolveMode("day", new Date(2026, 10, 2, hour)), "day");
}
const f = fixture();
f.stored.set("gestalt.appearance", "day");
assert.equal(appearance.initialize(f), "night", "Remembered appearance cannot bypass permission");
assert.equal(f.writes, 0);
appearance.setMode("day", false, f);
assert.equal(f.attributes.get("data-appearance"), "day");
appearance.initialize(f);
assert.equal(appearance.getMode(f.document), "day", "Hydration must retain this visit's choice");
assert.equal(f.writes, 0);
appearance.setMode("day", true, f);
assert.equal(f.writes, 0, "Even remember=true cannot bypass the actual permission marker");
f.stored.set("gestalt.local-memory", "granted");
appearance.setMode("auto", true, f);
assert.equal(f.stored.get("gestalt.appearance"), "auto");
assert.equal(f.writes, 1);
appearance.sync(f.document, new Date(2026, 10, 2, 7));
assert.equal(f.attributes.get("data-appearance"), "day");
appearance.sync(f.document, new Date(2026, 10, 2, 19));
assert.equal(f.attributes.get("data-appearance"), "night");
assert.equal(appearance.getMode(f.document), "auto");
assert.equal(f.writes, 1, "Clock updates do not write preferences");
f.document.hidden = true;
f.listeners.get("visibilitychange")();
f.document.hidden = false;
f.listeners.get("visibilitychange")();
const blocked = fixture();
blocked.localStorage = { getItem() { throw new Error("Blocked"); }, setItem() { throw new Error("Blocked"); } };
assert.equal(appearance.initialize(blocked), "night");
assert.equal(appearance.setMode("day", true, blocked), "day");
assert.equal(blocked.attributes.get("data-appearance"), "day");
const switching = fixture();
appearance.initialize(switching);
for (const mode of ["day", "night", "day", "night"]) {
  assert.equal(appearance.setMode(mode, false, switching), mode);
  assert.equal(switching.attributes.get("data-appearance"), mode, "Returning to Night removes the Day selector match");
  assert.equal(appearance.getMode(switching.document), mode);
}
assert.equal(switching.writes, 0, "Session theme switching writes no remembered preferences");
assert.equal(switching.listeners.size, 1, "Switching themes cannot stack resume listeners");

const early = fixture(); early.stored.set("gestalt.local-memory", "granted"); early.stored.set("gestalt.appearance", "day");
vm.runInNewContext(read("public/appearance.js"), early);
assert.equal(early.attributes.get("data-appearance"), "day", "Parser-time head script applies the choice before boot/body rendering");
const index = read("index.html");
assert.ok(index.indexOf("public/appearance.js") < index.indexOf("app/globals.css"));
assert.ok(index.indexOf("public/appearance.js") < index.indexOf("<body>"));
assert.ok(read("app/layout.tsx").includes('<script src="/appearance.js" />'));
assert.ok(read("app/layout.tsx").includes("suppressHydrationWarning"));
assert.ok(read("components/archive-os.tsx").includes("appearance.sync(document, date)"));
assert.ok(read("static-app.js").includes("GestaltAppearance?.sync(document)"));
assert.ok(!/fetch\(|setInterval|requestAnimationFrame|navigator\.|matchMedia|eval\(/.test(read("public/appearance.js")), "Appearance has no network request, system-theme subscription or polling clock");
const boundary = fixture();
let time = new Date(2026, 10, 2, 6, 59, 59).getTime(), sequence = 0;
const timers = new Map();
boundary.Date = class extends Date { constructor() { super(time); } };
boundary.setTimeout = (callback, delay) => { const id = ++sequence; timers.set(id, { callback, delay }); return id; };
boundary.clearTimeout = (id) => timers.delete(id);
appearance.initialize(boundary);
assert.equal(timers.size, 0, "Night has no boundary timer");
appearance.setMode("auto", false, boundary);
assert.equal(timers.size, 1);
assert.equal([...timers.values()][0].delay, 1000, "Wake at the actual next boundary, not every 30 seconds");
time = new Date(2026, 10, 2, 7).getTime();
const morning = [...timers.values()][0]; timers.clear(); morning.callback();
assert.equal(boundary.attributes.get("data-appearance"), "day");
assert.equal(timers.size, 1);
assert.equal([...timers.values()][0].delay, 12 * 60 * 60 * 1000);
appearance.initialize(boundary);
assert.equal(timers.size, 1, "A second reader/helper initialization cannot stack timers");
boundary.document.hidden = true; boundary.listeners.get("visibilitychange")();
assert.equal(timers.size, 0, "Hidden pages stop scheduled work");
time = new Date(2026, 10, 2, 19).getTime();
boundary.document.hidden = false; boundary.listeners.get("visibilitychange")();
assert.equal(boundary.attributes.get("data-appearance"), "night");
assert.equal(timers.size, 1);
appearance.setMode("day", false, boundary);
assert.equal(timers.size, 0, "A manual appearance cancels Auto's timer");
for (const file of ["app/appearance.css", "public/appearance.js"]) {
  assert.ok(read("scripts/prepare-pages.mjs").includes(`"${file}"`));
  assert.ok(read("lib/publish-paths.mjs").includes(`"${file}"`));
  const attribute = file.endsWith(".css") ? "href" : "src";
  assert.equal(updateStaticCacheTokens(`${attribute}="${file}?v=old"`, 123), `${attribute}="${file}?v=123"`);
}
const settings = behaviour.renderContent({ appearance: "day" }, false);
assert.match(settings, /APPEARANCE/);
assert.match(settings, /data-os-preference="appearance" value="day" checked/);
assert.equal((settings.match(/data-os-preference="appearance"/g) || []).length, 3);
assert.ok(!settings.match(/data-os-preference="appearance"[^>]*disabled/));

const day = postcss.parse(read("app/appearance.css"));
const geometry = new Set(["width", "height", "inline-size", "block-size", "padding", "margin", "display", "position", "inset", "transform", "font-size", "font-weight", "animation", "transition"]);
const variables = new Map();
const shadowRoles = new Map();
const dayRules = new Map();
day.walkRules((rule) => {
  assert.ok(postcss.list.comma(rule.selector).every((selector) => selector.startsWith(':root[data-appearance="day"]')), "Every Day selector, not just the first in a list, must stay scoped");
  rule.walkDecls((d) => { assert.ok(!geometry.has(d.prop), `Appearance must not change layout: ${d.prop}`); });
  if (rule.selector === ':root[data-appearance="day"]') rule.walkDecls((d) => variables.set(d.prop, d.value));
  rule.walkDecls("box-shadow", (d) => shadowRoles.set(rule.selector, d.value));
  dayRules.set(rule.selector, Object.fromEntries(rule.nodes.filter((node) => node.type === "decl").map((node) => [node.prop, node.value])));
});
for (const level of ["panel", "popover", "window"]) {
  assert.ok(variables.has(`--elevation-${level}`), "Day uses a shared depth hierarchy");
  assert.match(variables.get(`--elevation-${level}`), /-\d+px rgba/, "Negative spread keeps shadows from flooding neighbouring surfaces");
}
for (const [selector, level] of [[".dashboard-panel", "panel"], [".studio-section-copy", "panel"], [".search-panel", "popover"], [".studio-notification-panel", "popover"], [".record-window", "window"], [".timeline-window", "window"], [".archive-folder-window", "window"], [".studio-record-copy", "window"]]) {
  assert.ok([...shadowRoles].some(([rule, value]) => rule.includes(selector) && value === `var(--elevation-${level})`), `${selector} must not inherit a broad Night shadow`);
}
assert.equal(shadowRoles.get(':root[data-appearance="day"] .workspace::before'), "none", "The scenery is not buried under the old inset vignette");
const scenery = day.nodes.find((node) => node.selector === ':root[data-appearance="day"] body::before');
assert.equal(scenery.nodes.find((d) => d.prop === "opacity").value, "0.18");
assert.equal(scenery.nodes.find((d) => d.prop === "filter").value, "grayscale(1) contrast(0.98) brightness(1.12)");
assert.ok(!/invert\(|backdrop-filter|!important/.test(read("app/appearance.css")), "No media inversion, heavier blur or global overrides");
for (const file of ["app/globals.css", "app/desktop-navigation.css", "app/studio/studio.css"]) {
  postcss.parse(read(file)).walkDecls((d) => {
    for (const match of d.value.matchAll(/var\((--(?:tone-[\w-]+|surface-[\w-]+|subtle-text|danger-text|control-scheme)), ([^()]*)\)/g)) {
      assert.ok(variables.has(match[1]), `Missing Day role ${match[1]}`);
      assert.ok(match[2] && !match[2].includes("var("), "Night retains an explicit literal fallback");
    }
  });
}
const rgb = (hex) => hex.slice(1).match(/../g).map((v) => parseInt(v, 16));
function luminance(value) {
  const [r, g, b] = (typeof value === "string" ? rgb(value) : value).map((v) => v / 255).map((v) => v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
for (const foreground of ["--text", "--text-strong", "--muted", "--muted-2"]) {
  const light = luminance(variables.get("--surface-sheet")), dark = luminance(variables.get(foreground));
  assert.ok((light + 0.05) / (dark + 0.05) >= 4.5, `${foreground} must remain readable on a solid reading surface`);
}
const over = (foreground, alpha, background) => foreground.map((value, index) => value * alpha + background[index] * (1 - alpha));
const contrast = (text, surface) => {
  const a = luminance(text), b = luminance(surface);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
};
const dayPrefix = ':root[data-appearance="day"]';
assert.equal(variables.get("--record-focus-scrim"), "rgba(49, 60, 52, 0.34)");
const panelEdges = [...dayRules].find(([selector]) => selector.includes(".dashboard-panel,") && selector.includes(".setup-group"))?.[1];
assert.equal(panelEdges?.["border-block-start-color"], "var(--surface-edge-light)");
assert.equal(panelEdges?.["border-block-end-color"], "var(--surface-edge-low)");
for (const selector of [".note-entry-date", ".note-media figcaption", ".record-meta dt", ".system-status dt"]) {
  assert.ok([...dayRules].some(([rule, values]) => rule.includes(selector) && values.color === "var(--muted)"), `${selector} has a readable metadata treatment`);
}
const banner = dayRules.get(`${dayPrefix} .record-heading.has-heading-banner::before`).background;
assert.ok(banner.includes("rgba(208, 212, 204, 0.72) 62%"));
assert.ok(banner.includes("rgba(208, 212, 204, 0.96)"));
assert.ok(!banner.includes("repeating-linear-gradient"), "No scanline over header words in Day");
for (const pixel of [0, 64, 128, 192, 255]) {
  const scenery = over([pixel, pixel, pixel], 0.18, rgb(variables.get("--bg")));
  const panel = over(rgb(variables.get("--surface-sheet")), 0.46, scenery);
  const image = over([pixel, pixel, pixel], 0.52, rgb(variables.get("--bg")));
  const header = over(rgb(variables.get("--surface-sheet")), 0.12, over(rgb(variables.get("--surface-sheet")), 0.72, image));
  for (const foreground of ["--text", "--text-strong", "--muted", "--muted-2"]) {
    assert.ok(contrast(variables.get(foreground), panel) >= 4.5, `${foreground}: modeled translucent panel contrast`);
    assert.ok(contrast(variables.get(foreground), header) >= 4.5, `${foreground}: modeled light/dark artwork header contrast`);
  }
}
const archiveSheet = postcss.parse(read("app/globals.css"));
const entryRules = [];
archiveSheet.walkRules((rule) => { if (rule.nodes.some((node) => node.prop === "--record-titlebar-size")) entryRules.push(rule); });
assert.equal(entryRules.length, 3, "Entry titlebar has one default plus scaled-desktop and touch overrides");
for (const rule of entryRules) {
  assert.ok(rule.selector.includes("record-window"));
  const value = rule.nodes.find((node) => node.prop === "--record-titlebar-size").value;
  if (rule.parent.type === "root") assert.equal(value, "42px");
  else if (rule.parent.params.includes("max-width: 760px")) assert.equal(value, "44px");
  else { assert.ok(rule.parent.params.includes("min-width: 2200px")); assert.equal(value, "calc(42px * var(--desktop-size))"); }
}
assert.equal(archiveSheet.nodes.find((node) => node.selector === ".record-window").nodes.find((node) => node.prop === "grid-template-rows").value, "var(--record-titlebar-size) minmax(0, 1fr)");
assert.equal(archiveSheet.nodes.find((node) => node.selector === ".record-window:not(.is-setup-record) > .window-bar").nodes.find((node) => node.prop === "block-size").value, "var(--record-titlebar-size)");
assert.equal(archiveSheet.nodes.find((node) => node.selector === ".update-history-backdrop").nodes.find((node) => node.prop === "inset").value, "var(--record-titlebar-size, 48px) 0 0");
assert.equal(archiveSheet.nodes.find((node) => node.selector === ".window-bar").nodes.find((node) => node.prop === "block-size").value, "48px", "Other dialogs keep their existing bar height");
assert.equal(archiveSheet.nodes.find((node) => node.selector === ".timeline-window").nodes.find((node) => node.prop === "grid-template-rows").value, "48px auto minmax(0, 1fr)");
assert.equal(archiveSheet.nodes.find((node) => node.selector === ".setup-console-prompt").nodes.find((node) => node.prop === "min-block-size").value, "34px");
const controlSize = (rule) => parseInt(rule.nodes.find((node) => node.prop === "block-size").value);
const desktopControl = controlSize(archiveSheet.nodes.find((node) => node.selector === ".window-actions button"));
const editControl = controlSize(archiveSheet.nodes.find((node) => node.selector === ".window-edit-action"));
assert.equal(editControl, desktopControl, "Desktop edit gears match the existing close/minimize/maximize control size");
const mobileControls = [];
archiveSheet.walkRules(".window-actions button", (rule) => { if (rule.parent.type === "atrule" && rule.parent.params.includes("max-width: 760px")) mobileControls.push(controlSize(rule)); });
assert.equal(mobileControls.length, 1);
const mobileEditControls = [];
archiveSheet.walkRules(".window-edit-action", (rule) => { if (rule.parent.type === "atrule" && rule.parent.params.includes("max-width: 760px")) mobileEditControls.push(controlSize(rule)); });
assert.deepEqual(mobileEditControls, mobileControls, "Mobile edit gears retain the same touch target as the window controls");
assert.ok(42 >= Math.max(desktopControl, editControl) + 8 && 44 >= Math.max(...mobileControls, editControl) + 8, "Actual edit/control sizes retain vertical clearance on desktop and mobile");
archiveSheet.walkRules(".archive-shell > .workspace > .record-window:not(.is-setup-record) .window-bar", (rule) => assert.equal(rule.nodes.find((node) => node.prop === "block-size").value, "var(--record-titlebar-size)", "Scaled bar and grid consume the same height"));
const focusScene = archiveSheet.nodes.find((node) => node.selector?.startsWith(".workspace.has-record > .workspace-header"));
assert.deepEqual(postcss.list.comma(focusScene.selector), [".workspace.has-record > .workspace-header", ".workspace.has-record > .dashboard-grid", ".workspace.has-record > .section-page", ".workspace.has-record > .workspace-footer"]);
assert.deepEqual(Object.fromEntries(focusScene.nodes.map((node) => [node.prop, node.value])), { opacity: "0.44" }, "Header and content share one paint-only focus treatment, without filtering the record window");
for (const file of ["components/archive-os.tsx", "static-app.js"]) {
  const source = read(file);
  assert.ok(source.includes('"workspace has-record" : "workspace"'), "Both readers apply focus state to the same workspace");
  assert.ok(source.includes("panelOpen ||") || source.includes("state.panelOpen ||"));
}
const z = (selector) => Number(archiveSheet.nodes.find((node) => node.selector === selector).nodes.find((node) => node.prop === "z-index").value);
assert.ok(z(".workspace-header") < z(".record-backdrop") && z(".record-backdrop") < z(".record-window"), "Header remains behind the click shield and record, not above their controls");
const windowEdge = archiveSheet.nodes.find((node) => node.selector?.startsWith(".window-actions button:is(:hover, :focus-visible)"));
assert.equal(windowEdge.nodes.find((node) => node.prop === "box-shadow").value, "inset 0 1px 0 var(--control-top-light), inset 0 -1px 0 var(--control-edge-signal, rgba(200, 189, 159, 0.42))");
assert.match(variables.get("--control-edge-signal"), /^rgba\(107, 89, 60, 0\.62\)$/);
const decls = (rule) => Object.fromEntries(rule.nodes.filter((node) => node.type === "decl").map((node) => [node.prop, node.value]));
const material = archiveSheet.nodes.find((node) => node.selector === ".window-bar, .desktop-terminal-bar, .setup-console-prompt, .archive-folder-titlebar");
assert.deepEqual(decls(material), { background: "var(--window-bar-fill)", "box-shadow": "var(--window-bar-contact)", "border-block-end-color": "var(--window-bar-edge)" }, "One paint-only finish covers the four actual title-bar variants");
const press = archiveSheet.nodes.find((node) => node.selector?.startsWith(".window-actions button:not(:disabled):active"));
assert.ok(press.selector.includes(".window-edit-action:not(:disabled):active") && press.selector.includes(".archive-folder-titlebar button:not(:disabled):active"));
assert.deepEqual(decls(press), { "background-color": "var(--control-press-fill)", "border-color": "var(--line-strong)", "box-shadow": "var(--control-press-shadow)" }, "Press feedback cannot resize controls, move icons, change labels or override focus outlines");
assert.ok(archiveSheet.nodes.some((node) => node.selector === '.window-actions button[data-window-action="close"]:hover' && decls(node).color === "var(--danger-text, #e3b9a7)"));
assert.equal(decls(archiveSheet.nodes.find((node) => node.selector === ".window-actions button:focus-visible")).outline, "1px solid var(--accent)");
const night = new Map(Object.entries(decls(archiveSheet.nodes.find((node) => node.selector === ":root"))));
assert.equal(night.get("--window-outline"), "rgba(226, 220, 196, 0.5)", "Night keeps its continuous frame with a softer stroke");
assert.equal(variables.get("--window-outline"), "rgba(37, 44, 41, 0.42)", "Accepted Day frame stays unchanged");
const readableNight = archiveSheet.nodes.find((node) => node.selector?.startsWith(':root:not([data-appearance="day"]) :is('));
assert.deepEqual(decls(readableNight), { color: "var(--reading-muted)" }, "Night legibility tuning changes no geometry, background, focus or animation");
for (const label of [".note-entry-date", ".note-media figcaption", ".record-meta dt", ".record-aside li:not(.is-active)", ".current-game span", ".activity-feed > li > span", ".section-record i", ".archive-file small"]) assert.ok(readableNight.selector.includes(label), `Night reading role covers ${label}`);
assert.equal(night.get("--muted"), "#827f74", "Decorative muted palette stays intact");
assert.equal(night.get("--muted-2"), "#5f5e57");
assert.ok(!variables.has("--reading-muted"), "The Night-only role cannot override the accepted Day text treatments");
for (const pixel of [0, 64, 128, 192, 255]) {
  const filtered = Math.min(255, Math.max(0, ((pixel - 127.5) * 0.96 + 127.5) * 0.88));
  const scenery = over([filtered, filtered, filtered], 0.52, rgb(night.get("--bg")));
  const workspace = over([5, 6, 5], 0.52 * 0.16, scenery);
  const panel = over([217, 213, 193], 0.038, over([217, 213, 193], 0.014, over([255, 255, 255], 0.028, over([8, 9, 8], 0.5, workspace))));
  const column = over([255, 255, 255], 0.028, over([217, 213, 193], 0.032, over([8, 9, 8], 0.46, workspace)));
  const reading = over([8, 9, 8], 0.985, scenery);
  for (const surface of [panel, column, reading]) {
    for (const role of ["--text", "--text-strong", "--reading-muted"]) assert.ok(contrast(night.get(role), surface) >= 4.5, `${role} retains modeled Night contrast over dark/bright scenery`);
  }
}
assert.ok(read("app/studio/studio.css").includes(':root:not([data-appearance="day"]) .studio-inspector :is('), "Night inspector labels share the reading role without affecting Day");
for (const [name, tokens] of [["Night", night], ["Day", variables]]) {
  for (const role of ["--window-outline", "--window-bar-fill", "--window-bar-muted", "--window-bar-edge", "--window-bar-contact", "--record-focus-scrim", "--terminal-focus-scrim", "--control-top-light", "--control-press-fill", "--control-press-shadow"]) assert.ok(tokens.has(role), `${name} defines ${role}`);
  assert.ok(postcss.list.comma(tokens.get("--window-bar-contact")).every((shadow) => shadow.startsWith("inset ")), "Title-bar shading stays inside its box, with no outward overhang");
  const fill = tokens.get("--window-bar-fill");
  const stops = [...fill.matchAll(/rgba\((\d+), (\d+), (\d+), ([\d.]+)\)/g)].map((match) => over(match.slice(1, 4).map(Number), Number(match[4]), rgb(fill.match(/#[0-9a-f]{6}$/)[0])));
  assert.equal(stops.length, 2);
  for (const surface of stops) {
    for (const foreground of ["--text", "--text-strong", "--window-bar-muted"]) {
      const a = luminance(tokens.get(foreground)), b = luminance(surface);
      assert.ok((Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05) >= 4.5, `${name} ${foreground} remains readable at both title-bar gradient stops`);
    }
    assert.ok(contrast(tokens.get("--muted"), surface) >= 3, `${name} secondary control icons retain non-text contrast`);
    if (name === "Night") assert.ok(contrast(surface, [8, 9, 8]) >= 1.1, "Graphite bar stays distinct from the dark reading plane at both stops");
    const tint = tokens.get("--control-press-fill").match(/^rgba\((\d+), (\d+), (\d+), ([\d.]+)\)$/);
    const inset = over(tint.slice(1, 4).map(Number), Number(tint[4]), surface);
    const a = luminance(tokens.get("--text")), b = luminance(inset);
    assert.ok((Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05) >= 4.5, `${name} control icon keeps contrast when pressed`);
  }
}
assert.equal(decls(archiveSheet.nodes.find((node) => node.selector === ".record-backdrop")).background, "var(--record-focus-scrim)");
assert.equal(night.get("--record-focus-scrim"), "rgba(2, 4, 3, 0.16)");
assert.equal(night.get("--terminal-focus-scrim"), "rgba(2, 4, 3, 0.44)");
assert.equal(variables.get("--terminal-focus-scrim"), "rgba(49, 60, 52, 0.24)");
const desktop = postcss.parse(read("app/desktop-navigation.css"));
const desktopRoles = new Map();
desktop.walkRules((rule) => desktopRoles.set(rule.selector, decls(rule)));
for (const selector of [".record-window", ".timeline-window", ".os-behaviour-frame", ".roadmap-note", ".archive-folder-window"]) {
  assert.equal(decls(archiveSheet.nodes.find((node) => node.selector === selector)).border, "1px solid var(--window-outline)", `${selector} owns one shared continuous border without a width change`);
}
assert.equal(decls(archiveSheet.nodes.find((node) => node.selector === ".is-setup-record"))["border-color"], "var(--window-outline)", "Setup no longer weakens the enclosing frame");
assert.equal(decls(archiveSheet.nodes.find((node) => node.selector === ".record-window.is-access-pending"))["border-color"], "transparent", "Frame construction still starts transparent");
assert.equal(decls(archiveSheet.nodes.find((node) => node.name === "keyframes" && node.params === "record-window-edge-flow").nodes.find((node) => node.selector === "to"))["border-color"], "var(--window-outline)", "Record construction settles into the same steady frame");
assert.equal(desktopRoles.get(".desktop-nav-terminal::before").border, "0", "No duplicate border hidden behind the title bar");
assert.equal(desktopRoles.get(".desktop-nav-terminal::after").opacity, "1", "Foreground stroke remains visible after construction");
assert.equal(desktopRoles.get(".desktop-nav-terminal::after")["border-color"], "var(--window-outline)");
assert.equal(desktopRoles.get(".desktop-nav-terminal::after")["z-index"], "2");
assert.equal(desktopRoles.get(".desktop-nav-terminal::before, .desktop-nav-terminal::after").inset, "0", "Stroke shares the window's exact footprint");
assert.equal(desktopRoles.get(".desktop-nav-terminal::before, .desktop-nav-terminal::after")["pointer-events"], "none", "Frame cannot obstruct window controls");
assert.equal(desktopRoles.get(".archive-shell[data-nav-wide] > .desktop-nav-terminal").border, "0", "Terminal outer geometry is unchanged");
const frameEnd = decls(desktop.nodes.find((node) => node.name === "keyframes" && node.params === "desktop-terminal-frame").nodes.find((node) => node.selector === "100%"));
assert.equal(frameEnd.opacity, "1");
assert.equal(frameEnd["border-color"], undefined, "Construction inherits the same steady outline instead of repainting border colors");
assert.equal(desktopRoles.get(".desktop-terminal-bar small").color, "var(--window-bar-muted)", "Terminal version remains legible on raised graphite fill");
assert.equal(desktopRoles.get(".desktop-terminal-bar")["border-block-end"], "1px solid var(--window-bar-edge)");
assert.equal(decls(archiveSheet.nodes.find((node) => node.selector === ".setup-console-prompt")).color, "var(--window-bar-muted)");
assert.equal(decls(archiveSheet.nodes.find((node) => node.selector === ".setup-prompt-command i")).color, "var(--window-bar-muted)");
assert.equal(desktopRoles.get(".archive-shell[data-nav-wide] > .desktop-nav-backdrop").background, "var(--terminal-focus-scrim)");
assert.ok(!/backdrop-filter|\bfilter:/.test(read("app/desktop-navigation.css")), "Terminal separation adds no blur/filter work");
const reduced = archiveSheet.nodes.find((node) => node.name === "media" && node.params === "(prefers-reduced-motion: reduce)" && node.toString().includes("transition-duration: 0.001ms"));
assert.ok(reduced, "Existing reduced-motion transition guard still covers the edge response");
assert.ok([...shadowRoles].some(([selector, value]) => selector.includes(".active-projects-panel .record-list button::after") && selector.includes(".latest-log-signal::before") && value === "none"), "Day travelling traces do not inherit luminous halos");
console.log("Appearance passed: theme/storage/clock guards, Day/Night reading/control contrast, continuous single frames, inset-only bar shading, preserved geometry/construction/focus, reduced motion and Pages/cache inclusion.");
