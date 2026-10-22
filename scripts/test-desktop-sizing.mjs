import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const css = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");
const start = css.indexOf("/* Size tiers follow CSS viewport space");
const end = css.indexOf("@media (min-width: 761px) and (max-height: 850px)", start);
assert.ok(start > 0 && end > start, "Desktop size policy has a bounded block before compact/mobile rules");
const policy = css.slice(css.indexOf("*/", start) + 2, end);
assert.match(policy, /min-width: 2200px\) and \(min-height: 1100px/);
assert.match(policy, /min-width: 3300px\) and \(min-height: 1700px/);
assert.match(policy, /--desktop-size: 1\.333333/);
assert.match(policy, /min-width: 2500px\) and \(min-height: 1100px/);
assert.match(policy, /--desktop-size: 1\.25;/, "Intermediate zoom-sized viewports use their own bounded tier");
assert.match(policy, /--desktop-size: 2;/);
assert.ok(!/\bzoom\s*:|font-size:[^;]*(?:vw|vh)|devicePixelRatio\s*[=:(]/.test(policy), "No blanket zoom, continuous viewport font sizing or physical-pixel logic");
assert.ok(!policy.includes(".studio-"), "No Studio styling in the reader size policy");
for (const selector of policy.matchAll(/(?:^|\})\s*([^{}]+)\{/g)) {
  const value = selector[1].trim();
  if (value.startsWith("@media")) continue;
  assert.ok(value.startsWith(".archive-shell"), `Size rule must start at the reader shell: ${value}`);
}
assert.match(policy, /--dashboard-max-inline: calc\(1180px \* var\(--desktop-size\)\)/);
assert.match(policy, /--section-split-max-inline: var\(--dashboard-max-inline\)/);
assert.match(policy, /grid-template-rows: minmax\(0, 1fr\) minmax\(0, 0\.9fr\) minmax\(0, 0\.92fr\)/);
assert.ok(!/nth-child/.test(policy), "Large tiers do not silently change the number of visible records");
assert.match(policy, /\.record-title-text\.is-long-title.*font-size: calc\(38px \* var\(--desktop-size\)\)/);
assert.match(policy, /\.weather-action \{ inline-size: calc\(32px \* var\(--desktop-size\)\); block-size: calc\(32px \* var\(--desktop-size\)\)/);
assert.match(policy, /\.command-panel \{\s*inline-size: min\(calc\(500px \* var\(--desktop-size\)\)/);
assert.match(policy, /\.record-window\.is-setup-record \{\s*inline-size: min\(calc\(860px \* var\(--desktop-size\)\)/);
assert.match(policy, /\.setup-inspection-photo \{ max-inline-size: calc\(920px \* var\(--desktop-size\)\)/);
const maximize = policy.indexOf(".record-window.is-maximized {");
assert.ok(maximize > policy.indexOf(".record-window.is-setup-record {"), "Maximize must win over normal Setup window sizing");
assert.match(policy.slice(maximize), /inline-size: auto;/);
assert.match(policy, /\.record-window\.is-setup-record\.is-maximized \{ transform: translateZ\(0\); \}/);
assert.match(policy, /\.archive-folder-titlebar button, \.archive-folder-pathbar button\).*inline-size: calc\(28px \* var\(--desktop-size\)\); block-size: calc\(28px \* var\(--desktop-size\)\)/);
assert.match(policy, /\.archive-folder-window \.archive-file \{ min-block-size: calc\(80px \* var\(--desktop-size\)\)/);
assert.match(policy, /\.record-window \.window-bar \{ block-size: calc\(48px \* var\(--desktop-size\)\)/, "Titlebar itself must grow with its grid row");
assert.match(policy, /\.setup-bay \{ inline-size: min\(100%, var\(--dashboard-max-inline\)\)/, "Setup must not retain its baseline inline-size cap");
assert.match(policy, /\.archive-folder-page \{ inline-size: min\(100%, calc\(1320px \* var\(--desktop-size\)\)\)/, "Archive root grows, not only the focused folder");
for (const [group, width] of [["tools", 96], ["peripherals", 154]]) {
  assert.ok(policy.includes(`.setup-group--${group} .setup-tile-grid { grid-auto-columns: calc(${width}px * var(--desktop-size))`), `${group} tracks grow with their tiles`);
}
assert.match(policy, /\.note-entry--indexed > summary \{ min-block-size: calc\(52px \* var\(--desktop-size\)\); grid-template-columns: calc\(34px \* var\(--desktop-size\)\)/);
assert.match(policy, /\.note-entry--indexed > summary > i::before \{ font-size: calc\(10px \* var\(--desktop-size\)\)/);
assert.match(policy, /\.note-entry-body > \.record-body \{ padding: 0; \}/, "Tier body padding must not add a nested reading inset");
assert.match(policy, /\.note-media \{ inline-size: min\(100%, calc\(760px \* var\(--desktop-size\)\)\)/);
assert.match(policy, /\.archive-shell > \.boot-screen > span \{ font-size: calc\(64px \* var\(--desktop-size\)\)/);
assert.match(policy, /\.boot-meter \{ block-size: calc\(12px \* var\(--desktop-size\)\); padding: calc\(2px \* var\(--desktop-size\)\)/);
assert.match(policy, /\.setup-bay \.setup-tile--peripherals \.setup-tile-icon \{ inline-size: 100%; block-size: calc\(78px \* var\(--desktop-size\)\)/, "Peripheral photo width must override the generic square icon");
assert.match(policy, /\.record-heading:not\(\.has-heading-banner\) \{ margin-block-end: calc\(26px \* var\(--desktop-size\)\); padding-block-end: calc\(18px \* var\(--desktop-size\)\)/);
assert.match(css, /\.note-media--banner \.note-media-button img \{\s*position: absolute;\s*inset: 0;\s*max-block-size: none;/, "Loaded banner images must fit their frame at baseline as well as large sizes");
assert.match(css, /\.banner-frame img \{\s*position: absolute;\s*inset: 0;/);
assert.match(policy, /\.note-media--banner \.note-media-button \{ min-block-size: 0;/, "The large-tier default media minimum must not stretch cropped banners");
console.log("Desktop sizing contracts passed: discrete viewport tiers, shared proportions, scoped reader rules, fixed control aspect ratios and long-title sizing.");
