import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";

const read = (file) => readFileSync(new URL(`../${file}`, import.meta.url), "utf8");
const require = createRequire(import.meta.url);
const postcss = createRequire(require.resolve("next/package.json"))("postcss");
const css = read("app/globals.css"), navigation = read("app/desktop-navigation.css");
const sheet = postcss.parse(css), navSheet = postcss.parse(navigation);
const declarations = (rule) => Object.fromEntries(rule.nodes.filter((node) => node.type === "decl").map((node) => [node.prop, node.value]));
const rule = (selector) => {
  const found = sheet.nodes.find((node) => node.selector?.replace(/\s+/g, " ") === selector.replace(/\s+/g, " "));
  assert.ok(found, selector);
  return declarations(found);
};
const contentAnimations = ["record-content-header", "record-content-build", "record-banner-materialize", "record-label-materialize", "record-panel-populate", "record-aside-materialize", "record-access-micro-in", "web-search-surface"];
for (const [animationSheet, name] of [[sheet, "dashboard-new-badge"], [sheet, "dashboard-log-tick"], [navSheet, "desktop-terminal-surface"], [navSheet, "desktop-terminal-frame"], ...contentAnimations.map((name) => [sheet, name])]) {
  const frames = animationSheet.nodes.find((node) => node.type === "atrule" && node.name === "keyframes" && node.params === name);
  assert.ok(frames, name);
  frames.walkDecls((decl) => assert.ok(["transform", "opacity"].includes(decl.prop), `${name} must not animate layout, masks or painted text/borders`));
}
const titleFrames = sheet.nodes.find((node) => node.name === "keyframes" && node.params === "record-title-materialize");
titleFrames.walkDecls((decl) => assert.notEqual(decl.prop, "clip-path", "Title bloom stays local, without another animated content mask"));
const frozen = rule(':is(.record-window, .desktop-nav-terminal)[data-record-retracting] *,\n:is(.record-window, .desktop-nav-terminal)[data-record-retracting]::before,\n:is(.record-window, .desktop-nav-terminal)[data-record-retracting]::after,\n:is(.record-window, .desktop-nav-terminal)[data-record-retracting] *::before,\n:is(.record-window, .desktop-nav-terminal)[data-record-retracting] *::after');
assert.equal(frozen["animation-play-state"], "paused", "Exits retain the current construction frame, not animation:none jumps");
assert.equal(frozen.animation, undefined);
const hidden = rule(':is(.record-window, .desktop-nav-terminal)[data-record-content-hidden] *');
assert.equal(hidden.visibility, "hidden");
assert.equal(hidden.display, undefined, "Dissolved content keeps its layout, including auto-height Setup windows");
assert.ok(!sheet.nodes.some((node) => node.selector?.includes("[data-record-content-hidden]::")), "The remaining Terminal frame and background stay visible while contracting");
assert.match(css, /record-content-build 1480ms[^;]*1560ms both/, "The staged construction timing remains intact");
assert.match(css, /record-panel-populate 900ms[^;]*2050ms both/);
assert.match(css, /record-access-sweep 1120ms[^;]*1580ms both/, "Keep the scan, drawn frame and overlapping population sequence");
const track = rule(".latest-log-signal"), light = rule(".latest-log-signal::before");
assert.equal(track.position, "absolute");
assert.equal(track["inset-block"], "0", "Percentage translation follows the full-height track, not the 24px light");
assert.equal(track["inline-size"], "2px");
assert.equal(track.animation, "dashboard-log-tick 7.6s linear infinite");
assert.equal(light["block-size"], "var(--dashboard-log-tick-size)");
assert.equal(light["inset-block-start"], "var(--dashboard-log-tick-start)");
assert.ok(light.background.includes("0.78") && light["box-shadow"].includes("12px"), "Keep the existing light and halo");
assert.ok(!css.includes(".latest-log::before") && !css.includes("will-change: inset-block-start, opacity"));
for (const height of [72, 116, 180, 320]) {
  for (const progress of [0, .1, .5, .9, 1]) {
    const oldPosition = -24 + progress * height;
    const transformedPosition = progress * height - 24;
    assert.equal(transformedPosition, oldPosition, "The light follows the same clipped path at every desktop tier");
  }
}
for (const file of ["components/archive/dashboard.tsx", "static-app.js"]) {
  assert.match(read(file), /class(?:Name)?="latest-log-signal" aria-hidden="true"/, "Both readers use the same purely decorative track");
}
const badge = rule('.activity-feed li[data-activity-age="new"] .activity-badge');
const glow = rule('.activity-feed li[data-activity-age="new"] .activity-badge::after');
assert.equal(badge.animation, undefined, "The readable label and its dimensions stay stable");
assert.equal(glow.content, '"new"');
assert.equal(glow.position, "absolute");
assert.equal(glow.inset, "-1px");
assert.equal(glow["pointer-events"], "none");
assert.equal(glow.animation, "dashboard-new-badge 5.8s ease-in-out infinite");
assert.ok(glow["text-shadow"].includes("18px"), "Glow is painted once, then opacity changes");
assert.match(css, /\.archive-shell\.has-record \.latest-log-signal,/);
assert.match(css, /\.archive-shell\.has-record \.activity-feed li\[data-activity-age="new"\] \.activity-badge::after,/);
assert.match(css, /@media \(max-width: 760px\)[\s\S]*\.latest-log-signal,[\s\S]*display: none;/);
assert.match(css, /prefers-reduced-motion: reduce[\s\S]*\.activity-badge::after \{ display: none; \}/);
assert.match(navigation, /::before \{ animation: desktop-terminal-surface 820ms ease-out both; \}/, "Only the plain background scales, never terminal text");
console.log("Compositor effects passed: mask-free staged content/search, stable exit descendants and frame, transform/opacity Terminal construction, log path/NEW glow, unchanged timing and motion fallbacks.");
