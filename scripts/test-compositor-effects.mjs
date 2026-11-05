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
const pointsFor = (name) => {
  const frames = sheet.nodes.find((node) => node.name === "keyframes" && node.params === name);
  assert.ok(frames, name);
  return frames.nodes.filter((node) => node.type === "rule").flatMap((node) => {
    const values = declarations(node);
    return node.selector.split(",").map((offset) => ({ at: parseFloat(offset), ...values }));
  }).sort((a, b) => a.at - b.at);
};
const contentAnimations = ["record-content-header", "record-content-build", "record-banner-materialize", "record-label-materialize", "record-panel-populate", "record-aside-materialize", "record-access-micro-in", "web-search-surface"];
for (const [animationSheet, name] of [...["dashboard-project-line", "dashboard-cover-signal", "dashboard-new-badge", "dashboard-log-tick", "weather-temp-glitch", "seasonal-swing", "seasonal-ember"].map((name) => [sheet, name]), [navSheet, "desktop-terminal-surface"], [navSheet, "desktop-terminal-frame"], ...contentAnimations.map((name) => [sheet, name])]) {
  const frames = animationSheet.nodes.find((node) => node.type === "atrule" && node.name === "keyframes" && node.params === name);
  assert.ok(frames, name);
  frames.walkDecls((decl) => assert.ok(["transform", "opacity"].includes(decl.prop), `${name} must not animate layout, masks or painted text/borders`));
}
const titleFrames = sheet.nodes.find((node) => node.name === "keyframes" && node.params === "record-title-materialize");
titleFrames.walkDecls((decl) => assert.notEqual(decl.prop, "clip-path", "Title bloom stays local, without another animated content mask"));
const project = rule(".active-projects-panel .record-list button::after");
assert.equal(project["inset-inline-start"], "31px");
assert.equal(project["inset-block-end"], "0");
assert.equal(project["block-size"], "1px");
assert.equal(project["inline-size"], "clamp(104px, 32%, 218px)");
assert.ok(project.background.includes("0.76") && project["box-shadow"].includes("4px"), "The existing light shape and bloom are unchanged");
assert.equal(project.animation, "dashboard-project-line var(--project-line-duration, 54s) linear infinite");
assert.equal(project["animation-delay"], "var(--project-line-delay, 0s)");
const anchors = pointsFor("dashboard-project-line");
const positioned = anchors.filter((anchor) => anchor.transform).map((anchor) => ({
  at: anchor.at, opacity: Number(anchor.opacity),
  x: Number(anchor.transform.match(/translateX\((-?[\d.]+)%\)/)[1]),
  scale: Number(anchor.transform.match(/scaleX\(([\d.]+)\)/)[1])
}));
for (const [index, anchor] of positioned.entries()) {
  const next = positioned[(index + 1) % positioned.length];
  if (next.x < anchor.x) assert.ok(anchor.opacity === 0 && next.opacity === 0, "Returns to the left happen only while fully dark, including the loop boundary");
}
assert.equal(positioned.filter((anchor) => anchor.x === 245 && anchor.scale === 0.92 && anchor.opacity === 0.56).length, 3, "Each pass retains the same peak path, shape and brightness");
const passes = [[4, 11.5], [35, 44], [72, 79]];
const periods = [54], phases = [0];
for (let child = 2; child <= 5; child++) {
  const row = rule(`.active-projects-panel .record-list button:nth-child(${child})`);
  periods.push(parseFloat(row["--project-line-duration"]));
  phases.push(parseFloat(row["--project-line-delay"]));
}
assert.equal(new Set(periods).size, 5);
assert.equal(new Set(phases).size, 5, "Row phases are staggered without a JavaScript scheduler");
for (const period of periods) {
  const travel = passes.map(([from, to]) => period * (to - from) / 100);
  const rests = passes.map(([, to], index) => period * ((passes[(index + 1) % passes.length][0] + (index === passes.length - 1 ? 100 : 0)) - to) / 100);
  assert.equal(new Set(travel).size, 3, "Three different passes avoid repeating one identical trip");
  assert.equal(new Set(rests).size, 3, "Each pass has a different quiet rest");
  for (const seconds of travel) assert.ok(seconds >= 3 && seconds <= 6, "Sweeps stay close to the original deliberate speed");
  for (const seconds of rests) assert.ok(seconds >= 10 && seconds <= 18, "Rests remain quiet without making the light disappear for minutes");
}
assert.match(css, /\.archive-shell\.has-record \.active-projects-panel \.record-list button::after,/);
assert.ok(sheet.nodes.some((node) => node.selector?.includes("[data-nav-blocked]") && node.selector.includes(".dashboard-grid *::after") && declarations(node)["animation-play-state"] === "paused"), "Consent and blocked states pause every ambient signal, not only the Project light");
const ambientPause = sheet.nodes.find((node) => node.selector?.includes("[data-nav-blocked]") && node.selector.includes(".dashboard-grid *::after"));
assert.ok(ambientPause.nodes.some((node) => node.prop === "animation-play-state" && node.important), "Explicit ambient pause wins against more-specific animation shorthands such as NEW overlays");
assert.ok(sheet.nodes.some((node) => node.name === "media" && node.params === "(max-width: 760px)" && node.nodes.some((child) => child.selector?.includes(".active-projects-panel .record-list button::after") && declarations(child).animation === "none")), "Mobile still has no travelling project light");
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
assert.equal(track.animation, "dashboard-log-tick 48s linear -2.1s infinite");
assert.equal(light["block-size"], "var(--dashboard-log-tick-size)");
assert.equal(light["inset-block-start"], "var(--dashboard-log-tick-start)");
assert.ok(light.background.includes("0.78") && light["box-shadow"].includes("12px"), "Keep the existing light and halo");
assert.ok(!css.includes(".latest-log::before") && !css.includes("will-change: inset-block-start, opacity"));
const logPoints = pointsFor("dashboard-log-tick");
const logTrips = [[7, 14], [39, 47], [76, 82.5]];
for (const [from, to] of logTrips) {
  const move = logPoints.filter((point) => point.transform && point.at >= from && point.at <= to);
  assert.equal(move.length, 2, "The log light has no intermediate transform stop to change its speed mid-pass");
  assert.deepEqual(move.map((point) => point.transform), ["translateY(0)", "translateY(100%)"]);
  assert.ok(move.every((point) => Number(point.opacity) === 0), "Each trip starts and ends dark, inside the same clipped track");
}
const logPositions = logPoints.filter((point) => point.transform);
for (const [index, point] of logPositions.entries()) {
  const next = logPositions[(index + 1) % logPositions.length];
  if (point.transform === "translateY(100%)" && next.transform === "translateY(0)") assert.ok(Number(point.opacity) === 0 && Number(next.opacity) === 0);
}
assert.equal(new Set(logTrips.map(([a, b]) => b - a)).size, 3);
assert.equal(Math.max(...logPoints.map((point) => Number(point.opacity))), 0.62, "The log light's peak brightness is unchanged");
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
assert.equal(glow.animation, "dashboard-new-badge var(--new-badge-duration, 23.8s) ease-in-out infinite");
assert.equal(glow["animation-delay"], "var(--new-badge-delay, -2.6s)");
assert.ok(glow["text-shadow"].includes("18px"), "Glow is painted once, then opacity changes");
const badgePeriods = [23.8], badgePhases = [-2.6];
for (let child = 2; child <= 6; child++) {
  const row = rule(`.activity-feed li[data-activity-age="new"]:nth-child(${child})`);
  badgePeriods.push(parseFloat(row["--new-badge-duration"]));
  badgePhases.push(parseFloat(row["--new-badge-delay"]));
}
assert.equal(new Set(badgePeriods).size, 6);
assert.equal(new Set(badgePhases).size, 6, "NEW overlays do not pulse together down the list");
assert.deepEqual(pointsFor("dashboard-new-badge").filter((point) => Number(point.opacity) > 0).map((point) => Number(point.opacity)), [1, 0.35, 0.7], "A clear acknowledgement, small echo and softer later glow keep distinct strengths");
const cover = rule(".game-cover::before"), coverPoints = pointsFor("dashboard-cover-signal");
assert.equal(cover.animation, "dashboard-cover-signal 29s ease-in-out -3.9s infinite");
assert.equal(cover.filter, "blur(5px)", "No new or animated cover filter");
assert.equal(cover.inset, "7px");
assert.equal(rule(".game-cover img").animation, undefined, "The photograph and title do not breathe with the decorative glow");
assert.equal(Math.max(...coverPoints.map((point) => Number(point.opacity))), 0.78);
assert.equal(Math.min(...coverPoints.map((point) => Number(point.opacity))), 0.42);
assert.equal(Math.max(...coverPoints.map((point) => Number(point.transform.match(/scale\(([\d.]+)\)/)[1]))), 1.03);
assert.deepEqual(coverPoints.filter((point) => Number(point.opacity) > 0.5).map((point) => Number(point.opacity)), [0.78, 0.66]);
const weather = rule(".weather-temp::after"), weatherPoints = pointsFor("weather-temp-glitch");
assert.equal(weather.animation, "weather-temp-glitch 37s steps(2, end) -1.8s infinite");
assert.equal(weather.content, "attr(data-temp)");
assert.equal(rule(".weather-temp").animation, undefined, "Weather interference is confined to the existing decorative copy");
assert.equal(Math.max(...weatherPoints.map((point) => Number(point.opacity))), 0.55);
assert.ok(weatherPoints.every((point) => Math.abs(Number(point.transform.match(/translateX\((-?[\d.]+)(?:px)?\)/)[1])) <= 2));
assert.ok(weatherPoints.some((point) => point.at === 41.85 && Number(point.opacity) === 0));
assert.match(css, /\.archive-shell\.has-record \.latest-log-signal,/);
assert.match(css, /\.archive-shell\.has-record \.activity-feed li\[data-activity-age="new"\] \.activity-badge::after,/);
assert.match(css, /@media \(max-width: 760px\)[\s\S]*\.latest-log-signal,[\s\S]*display: none;/);
assert.match(css, /prefers-reduced-motion: reduce[\s\S]*\.activity-badge::after \{ display: none; \}/);
assert.match(navigation, /::before \{ animation: desktop-terminal-surface 820ms ease-out both; \}/, "Only the plain background scales, never terminal text");
console.log("Compositor effects passed: distinct ambient rhythms, constant-speed downward log passes, stable cover/text/geometry, staggered NEW overlays, rare bounded weather interference, dark resets and pause/mobile guards, mask-free content and stable exits.");
