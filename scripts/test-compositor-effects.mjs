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
function assertLinearPasses(points, trips, axis) {
  const positions = points.filter((point) => point.transform);
  for (const [from, to] of trips) {
    const travel = positions.filter((point) => point.at >= from && point.at <= to);
    assert.deepEqual(travel.map(({ at, opacity, transform }) => [at, Number(opacity), transform]), [
      [from, 0, `translate${axis}(0)`], [to, 0, `translate${axis}(100%)`]
    ], "Only the endpoints set position, keeping the scan speed constant through each pass");
    assert.ok(points.some((point) => point.at >= to - (to - from) * .15 && point.at < to && Number(point.opacity) > .5), "The scan stays readable near the far edge");
  }
  for (const [index, point] of positions.entries()) {
    const next = positions[(index + 1) % positions.length];
    if (point.transform.endsWith("(100%)") && next.transform.endsWith("(0)")) {
      assert.equal(Number(point.opacity), 0);
      assert.equal(Number(next.opacity), 0, "Each return is invisible, including across the loop boundary");
    }
  }
}
const contentAnimations = ["record-content-header", "record-content-build", "record-banner-materialize", "record-label-materialize", "record-panel-populate", "record-aside-materialize", "record-access-micro-in", "web-search-surface"];
for (const [animationSheet, name] of [...["dashboard-project-line", "dashboard-cover-signal", "dashboard-new-badge", "dashboard-log-tick", "weather-temp-glitch", "seasonal-swing", "seasonal-ember"].map((name) => [sheet, name]), [navSheet, "desktop-terminal-surface"], [navSheet, "desktop-terminal-frame"], ...contentAnimations.map((name) => [sheet, name])]) {
  const frames = animationSheet.nodes.find((node) => node.type === "atrule" && node.name === "keyframes" && node.params === name);
  assert.ok(frames, name);
  frames.walkDecls((decl) => assert.ok(["transform", "opacity"].includes(decl.prop), `${name} must not animate layout, masks or painted text/borders`));
}
const titleFrames = sheet.nodes.find((node) => node.name === "keyframes" && node.params === "record-title-materialize");
titleFrames.walkDecls((decl) => assert.notEqual(decl.prop, "clip-path", "Title bloom stays local, without another animated content mask"));
const plate = rule(".dashboard-panel");
assert.equal(plate["border-block-start-color"], "var(--dashboard-plate-rim)");
assert.match(plate["box-shadow"], /-4px var\(--dashboard-plate-contact\), inset/);
const plateMotion = sheet.nodes.find((node) => node.name === "media" && node.params.includes("(pointer: fine)") && node.nodes.some((rule) => rule.selector === ".dashboard-grid > .dashboard-panel"));
assert.ok(plateMotion.params.includes("(prefers-reduced-motion: no-preference)"));
const seated = declarations(plateMotion.nodes.find((rule) => rule.selector === ".dashboard-grid > .dashboard-panel"));
const hovered = declarations(plateMotion.nodes.find((rule) => rule.selector.endsWith(".dashboard-panel[data-plate-hover]")));
assert.equal(seated.transform, "translate(var(--plate-shift-x, 0px), var(--plate-shift-y, 0px))", "The entire plate slides without perspective, rotation or scaling the text");
assert.match(seated.transition, /^transform 420ms /, "The neutral pose retains an eased return");
assert.equal(hovered.transform, undefined, "Changing pose only changes the transform's inputs");
assert.equal(hovered["transition-duration"], "220ms");
for (const selector of [".active-projects-panel", ".activity-panel", ".memory-panel", ".weather-panel", ".latest-log-panel"]) {
  const face = rule(selector);
  assert.ok(face["--dashboard-plate-grain"], `${selector} defines its own face texture`);
  for (const prop of ["background", "border-color", "box-shadow", "filter", "transform"]) assert.equal(face[prop], undefined, `${selector} retains the shared frame`);
}
assert.equal(rule(".game-cover::after")["box-shadow"], "var(--screen-recess)", "The artwork keeps its inset bezel");
assert.match(css, /--screen-recess: inset /, "The shared recess is an inset edge");
for (const glass of [".game-cover::after", ".game-drive-screen::after", ".project-screen-glass::after"]) {
  assert.equal(rule(glass).background, "var(--screen-glare), var(--lcd-mask), var(--screen-vignette)", `${glass} shares the one glass: same glare angle, pixel mask and falloff`);
}
assert.match(rule(".game-cover")["box-shadow"], /^0 0 0 1px rgb\(var\(--lcd-light\) \/ \.2\), 0 0 9px -2px rgb\(var\(--lcd-light\) \/ \.38\)$/, "The cover keeps a tight bloom; its light lands on the plates instead of the air");
assert.doesNotMatch(rule(".game-cover::before").background, /rgb\((?:1[0-9]{2}) 2[0-3][0-9] [12][0-9]{2}/, "The glass never tints the artwork teal");
assert.match(css, /@property --memory-light-gain \{\s*syntax: "<number>";/, "Memory State's brightness can ease between idle and writing");
assert.match(css, /:root:not\(\[data-appearance="day"\]\) \.dashboard-grid > \.dashboard-panel \{[\s\S]*?at var\(--memory-light-x, -9999px\) var\(--memory-light-y, -9999px\)[\s\S]*?at var\(--cover-light-x, -9999px\) var\(--cover-light-y, -9999px\)[\s\S]*?var\(--dashboard-plate-grain\);/, "Night plates receive light from both screens, under their existing finish");
assert.match(css, /prefers-reduced-motion: no-preference\) \{\s*:root:not\(\[data-appearance="day"\]\) \.dashboard-grid:has\(\.memory-trace-lines \[data-writing\]\) \{\s*--memory-light-gain: 1;/, "Memory State brightens only while a line is written, and never under Reduced Motion");
assert.doesNotMatch(read("app/memory-state.css"), /--trace-(?:spill|bounce)|64px 6px/, "Memory State no longer paints a halo into the empty air");
assert.match(read("app/appearance.css"), /\[data-appearance="day"\] \.game-cover \{\s*box-shadow: none;/, "Day keeps the LCD film without exterior light");
assert.match(rule(".weather-primary").background, /repeating-linear-gradient.*right bottom/, "Gauge marks stay on the divider");
assert.equal(rule(".latest-log > span")["justify-self"], "start", "The date stamp hugs the printed date");
const project = rule(".active-projects-panel .record-list button::after");
assert.equal(project["inset-inline"], "31px 0", "The track scales with the divider and leaves the row index clear");
assert.equal(project["inset-block-end"], "0");
assert.equal(project["block-size"], "3px");
assert.match(project.background, /2px 3px no-repeat,[\s\S]*40px 1px no-repeat/, "A short tail and a fixed register head replace the stretching wave");
assert.equal(project["box-shadow"], undefined);
assert.equal(project.animation, "dashboard-project-line var(--project-line-duration, 54s) linear infinite");
assert.equal(project["animation-delay"], "var(--project-line-delay, 0s)");
const projectResponse = ".active-projects-panel .record-list button:is(:hover, :focus-visible)";
assert.deepEqual(rule(`:root ${projectResponse} i`), { color: "var(--text)" }, "Hover and focus emphasize the percentage without adding a light treatment");
assert.deepEqual(rule(`${projectResponse}::after`), { visibility: "hidden", "animation-play-state": "paused" }, "The idle light stays off the row during interaction");
const passes = [[4, 11.5], [35, 44], [72, 79]];
assertLinearPasses(pointsFor("dashboard-project-line"), passes, "X");
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
assert.ok(!/\[data-(nav|search)-open\]/.test(ambientPause.selector), "Neither Terminal nor the command palette freezes Dashboard animations");
assert.ok(!navSheet.nodes.some((node) => node.selector?.includes("[data-nav-open]") && declarations(node)["animation-play-state"] === "paused"), "The Terminal stylesheet leaves legacy Memory State and seasonal ambient effects running");
assert.ok(plateMotion.nodes.some((node) => node.selector?.includes("[data-nav-open]") && node.selector.endsWith("[data-plate-hover]")), "The interactive plate response stays guarded while the workspace is inert");
assert.ok(sheet.nodes.some((node) => node.name === "media" && node.params === "(max-width: 760px)" && node.nodes.some((child) => child.selector?.includes(".active-projects-panel .record-list button::after") && declarations(child).animation === "none")), "Mobile still has no travelling project light");
const frozen = rule(':is(.record-window, .desktop-nav-terminal)[data-record-retracting] *,\n:is(.record-window, .desktop-nav-terminal)[data-record-retracting]::before,\n:is(.record-window, .desktop-nav-terminal)[data-record-retracting]::after,\n:is(.record-window, .desktop-nav-terminal)[data-record-retracting] *::before,\n:is(.record-window, .desktop-nav-terminal)[data-record-retracting] *::after');
assert.equal(frozen["animation-play-state"], "paused", "Exits retain the current construction frame, not animation:none jumps");
assert.equal(frozen.animation, undefined);
const hidden = rule(':is(.record-window, .desktop-nav-terminal)[data-record-content-hidden] *');
assert.equal(hidden.visibility, "hidden");
assert.equal(hidden.display, undefined, "Dissolved content keeps its layout, including auto-height Setup windows");
assert.ok(!sheet.nodes.some((node) => node.selector?.includes("[data-record-content-hidden]::")), "The remaining Terminal frame and background stay visible while contracting");
// Record access runs on one beat: frame 0-360ms, plate 120-880ms, shutter 880-1040ms, record 900-1420ms.
assert.match(css, /record-access-shutter 160ms [^;]*880ms both/, "The access plate leaves by closing into a line");
assert.match(css, /record-access-sweep 240ms [^;]*640ms both/, "The sweep leads straight into the shutter");
assert.match(css, /record-content-build 240ms [^;]*940ms both/, "The record unfolds behind the closing plate");
assert.match(css, /record-panel-populate 240ms [^;]*1100ms both/);
assert.ok(!css.includes("record-access-surface-flow") && !css.includes("record-access-identity-flow"), "The plate never dissolves over the record");
const accessBlock = css.slice(css.indexOf("/* Record access: one timeline"), css.indexOf(".record-window.is-access-complete {"));
const delays = [...accessBlock.matchAll(/(\d+)ms both;/g)].map((match) => Number(match[1]));
assert.ok(delays.length > 20 && delays.every((delay) => delay % 20 === 0 && delay <= 1220), "Every start sits on the 20ms grid and the sequence is over by 1.22s");
const unfold = sheet.nodes.find((node) => node.name === "keyframes" && node.params === "record-panel-populate");
assert.ok(unfold.toString().includes("scaleY(0.02)") && !unfold.toString().includes("translateY"), "Panels unfold from a centre line instead of drifting up");
const track = rule(".latest-log-signal"), light = rule(".latest-log-signal::before");
assert.equal(track.position, "absolute");
assert.equal(track.inset, "0", "Percentage translation follows the whole rail and excerpt, not the marker");
assert.equal(light["inline-size"], "2px");
assert.equal(track.animation, "dashboard-log-tick 48s linear -2.1s infinite");
assert.equal(light["block-size"], "var(--dashboard-log-tick-size)");
assert.equal(light["inset-block-start"], "calc(-1 * var(--dashboard-log-tick-size))", "Leading edge meets the rail at both ends");
assert.match(light.background, /2px 2px no-repeat,[\s\S]*1px calc\(100% - 2px\) no-repeat/, "A short reader head tracks the exact rail width");
assert.equal(light["box-shadow"], undefined);
const readerBand = rule(".latest-log-signal::after");
assert.equal(readerBand["inset-block-start"], light["inset-block-start"]);
assert.equal(readerBand.animation, undefined, "The excerpt emphasis shares the existing scan, without a second loop");
assert.equal(rule(".latest-log p")["-webkit-line-clamp"], "3", "The same readable excerpt is always on screen");
assert.ok(!css.includes(".latest-log::before") && !css.includes("will-change: inset-block-start, opacity"));
const logTrips = [[7, 14], [39, 47], [76, 82.5]];
assertLinearPasses(pointsFor("dashboard-log-tick"), logTrips, "Y");
assert.equal(new Set(logTrips.map(([a, b]) => b - a)).size, 3);
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
assert.equal(cover.animation, "dashboard-cover-signal 10s ease-in-out -0.8s infinite");
assert.equal(cover.filter, undefined, "Paint the glow with a soft gradient instead of a blur filter");
assert.equal(cover["mix-blend-mode"], undefined);
assert.equal(cover.inset, "0");
assert.match(css, /--lcd-mask: repeating-linear-gradient\(90deg, rgb\(0 0 0 \/ \.1\) 0 1px, transparent 1px 3px\);/, "The LCD pixel mask stays faint: visible up close, never a busy texture");
assert.equal(rule(".game-cover::after").animation, undefined, "The LCD coating is stationary");
assert.equal(rule(".game-cover img").animation, undefined, "The photograph and title do not breathe with the decorative glow");
assert.ok(coverPoints.every((point) => !point.transform), "Only the glow changes brightness, without moving across the art");
const dips = coverPoints.filter((point) => Number(point.opacity) < .5);
assert.equal(dips.length, 1, "One brief flicker per loop, only in the glow layer");
const dipIndex = coverPoints.indexOf(dips[0]);
const flickerSeconds = (coverPoints[dipIndex + 1].at - coverPoints[dipIndex - 1].at) * 10 / 100;
assert.ok(flickerSeconds > .12 && flickerSeconds < .4, "A short dip recovers quickly without strobing");
assert.match(css, /prefers-reduced-motion: reduce[\s\S]*\.game-cover::before \{ animation: none; \}/, "Reduced motion keeps the screen lit and steady");
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
// The Night light layers use the background shorthand; the plate colour must be restated after it,
// or the plates turn into clear glass and the backdrop shows through every screen's room.
const nightStart = css.indexOf(':root:not([data-appearance="day"]) .dashboard-grid > .dashboard-panel {');
const nightPlate = css.slice(nightStart, css.indexOf("@media (min-width: 761px) and (prefers-reduced-motion: no-preference)", nightStart));
assert.ok(nightPlate.indexOf("background-color: color-mix(") > nightPlate.indexOf("var(--dashboard-plate-grain);"), "Night plates stay solid after the light layers");
// Screen bloom: Night desktop only, a blurred copy of the same picture added as light.
const bloom = css.slice(css.indexOf("/* Screen bloom:"), css.indexOf("/* Games drive: the current game"));
assert.ok(bloom.includes(".screen-bloom { display: none; }"), "Day, handheld and any other surface never show the bloom copy");
assert.ok(bloom.includes("mix-blend-mode: screen;") && bloom.includes("filter: blur(var(--bloom-blur, 14px)) brightness(1.55) saturate(1.4);"), "The bloom only adds light");
assert.ok(bloom.includes("pointer-events: none;"), "The bloom never catches the pointer");
for (const file of ["components/archive/dashboard.tsx", "components/archive/section-page.tsx", "static-app.js"]) {
  assert.match(read(file), /screen-bloom[^>]*aria-hidden="true"/, `${file} hides the bloom copy from assistive tech`);
}
// The window's own border takes over from the drawn access rules as soon as they finish (360ms),
// so the frame never vanishes with the shutter (880ms) and reappears later.
assert.match(css, /\.record-window\.is-access-pending \{[^}]*record-window-edge-flow 120ms linear 360ms both;/, "The frame hands off from the drawn rules to the real border without a gap");
// Shared plate material: one recipe in three levels, desktop only.
const material = css.slice(css.indexOf("/* Shared plate material."));
for (const token of ["--plate-face", "--plate-finish", "--plate-grain", "--plate-edge", "--plate-rim", "--plate-contact", "--well-face", "--well-shadow", "--card-lift"]) {
  assert.ok(material.split(":root[data-appearance=\"day\"] {")[0].includes(`${token}:`) && material.split(":root[data-appearance=\"day\"] {")[1].includes(`${token}:`), `${token} has a Night and a Day value`);
}
assert.ok(material.includes("@media (min-width: 761px) {"), "Handheld keeps its own pocket design");
for (const selector of [".workspace > .section-page > .section-page-header", ".workspace > .section-page > .record-selector", ".workspace .setup-group", ".workspace .archive-manager"]) {
  assert.ok(material.includes(selector), `${selector} uses the plate`);
}
assert.ok(!/--plate-face: rgba\(var\(--tone-surface, 8, 9, 8\)/.test(material), "Night plates are solid, never see-through");
