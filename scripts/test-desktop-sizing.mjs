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
assert.match(css, /--record-window-inline: 1120px;/, "Normal reading windows gain width, not height or type scaling");
assert.match(policy, /--record-window-inline: calc\(1120px \* var\(--desktop-size\)\)/, "Wide entries retain the same proportions at larger desktop tiers");
assert.match(css, /inline-size: min\(var\(--record-window-inline\), calc\(100vw - var\(--sidebar-width\) - var\(--record-window-margin\)\)\)/, "Smaller viewports still cap the entry within the available workspace");
assert.match(policy, /--section-split-max-inline: var\(--dashboard-max-inline\)/);
assert.match(policy, /grid-template-rows: minmax\(0, 1fr\) minmax\(0, 0\.9fr\) minmax\(0, 0\.92fr\)/);
assert.ok(!/nth-child/.test(policy), "Large tiers do not silently change the number of visible records");
assert.match(policy, /\.record-title-text\.is-long-title.*font-size: calc\(38px \* var\(--desktop-size\)\)/);
assert.match(policy, /\.weather-action \{ inline-size: var\(--weather-instrument\); block-size: var\(--weather-instrument\); \}/, "The refresh button shares one height with the thermograph window");
assert.match(css, /--weather-instrument: calc\(34px \* var\(--desktop-size, 1\)\);/);
assert.match(policy, /\.command-panel \{\s*inline-size: min\(calc\(420px \* var\(--desktop-size\)\)/);
assert.match(policy, /\.record-window\.is-setup-record \{\s*inline-size: min\(calc\(860px \* var\(--desktop-size\)\)/);
assert.match(policy, /\.setup-inspection-photo \{ max-inline-size: calc\(920px \* var\(--desktop-size\)\)/);
const maximize = policy.indexOf(".record-window.is-maximized {");
assert.ok(maximize > policy.indexOf(".record-window.is-setup-record {"), "Maximize must win over normal Setup window sizing");
assert.match(policy.slice(maximize), /inline-size: auto;/);
assert.match(policy, /\.record-window\.is-setup-record\.is-maximized \{ transform: translateZ\(0\); \}/);
assert.match(policy, /\.archive-folder-titlebar button, \.archive-folder-pathbar button\).*inline-size: calc\(28px \* var\(--desktop-size\)\); block-size: calc\(28px \* var\(--desktop-size\)\)/);
assert.match(policy, /\.archive-folder-window \.archive-file \{ min-block-size: calc\(80px \* var\(--desktop-size\)\)/);
assert.match(policy, /\.record-window:not\(\.is-setup-record\) \{\s*--record-titlebar-size: calc\(42px \* var\(--desktop-size\)\);[^}]*grid-template-rows: var\(--record-titlebar-size\) minmax\(0, 1fr\)/, "Slim entry row must still grow with the desktop tier");
assert.match(policy, /\.record-window:not\(\.is-setup-record\) \.window-bar \{ block-size: var\(--record-titlebar-size\)/, "Titlebar and grid must consume the same scaled height");
assert.match(policy, /\.window-edit-action \{ inline-size: calc\(26px \* var\(--desktop-size\)\); block-size: calc\(26px \* var\(--desktop-size\)\)/, "Large-desktop gears use the same control size multiplier as close");
assert.match(policy, /\.setup-bay \{ inline-size: min\(100%, var\(--dashboard-max-inline\)\)/, "Setup must not retain its baseline inline-size cap");
assert.match(css, /--archive-content-max-inline: calc\(1320px \* var\(--desktop-size, 1\)\)/, "Archive root width follows the desktop tier");
assert.match(css, /\.archive-folder-page \{[^}]*inline-size: min\(100%, var\(--archive-content-max-inline\)\);\s*max-inline-size: var\(--archive-content-max-inline\)/, "Archive root uses the same rail as the tray");
for (const [group, width] of [["tools", 96], ["peripherals", 154]]) {
  assert.ok(policy.includes(`.setup-group--${group} .setup-tile-grid { grid-auto-columns: calc(${width}px * var(--desktop-size))`), `${group} tracks grow with their tiles`);
}
assert.match(policy, /\.note-entry--indexed > summary \{ min-block-size: calc\(52px \* var\(--desktop-size\)\); grid-template-columns: calc\(34px \* var\(--desktop-size\)\)/);
assert.match(policy, /\.note-entry--indexed > summary > i::before \{ font-size: calc\(10px \* var\(--desktop-size\)\)/);
assert.match(policy, /\.note-entry-body > \.record-body \{ padding: 0; \}/, "Tier body padding must not add a nested reading inset");
assert.match(policy, /\.note-media \{ inline-size: min\(100%, calc\(760px \* var\(--desktop-size\)\)\)/);
assert.match(policy, /\.archive-shell > \.boot-screen \.boot-loader > span \{ font-size: calc\(64px \* var\(--desktop-size\)\)/);
assert.ok(!policy.includes(".boot-meter"), "The retired boot meter has no size rule left behind");
assert.match(policy, /\.setup-bay \.setup-tile--peripherals \.setup-tile-icon \{ inline-size: 100%; block-size: calc\(78px \* var\(--desktop-size\)\)/, "Peripheral photo width must override the generic square icon");
assert.match(policy, /\.record-heading:not\(\.has-heading-banner\) \{ margin-block-end: calc\(26px \* var\(--desktop-size\)\); padding-block-end: calc\(18px \* var\(--desktop-size\)\)/);
assert.match(css, /\.note-media--banner \.note-media-button img \{\s*position: absolute;\s*inset: 0;\s*max-block-size: none;/, "Loaded banner images must fit their frame at baseline as well as large sizes");
assert.match(css, /\.banner-frame img \{\s*position: absolute;\s*inset: 0;/);
assert.match(policy, /\.note-media--banner \.note-media-button \{ min-block-size: 0;/, "The large-tier default media minimum must not stretch cropped banners");
assert.match(policy, /\.window-bar \{[^}]*font-size: calc\(16px \* var\(--desktop-size\)\)/, "Window-bar labels keep baseline proportions instead of shrinking relatively");
assert.match(policy, /\.record-aside li button \{ font-size: calc\(16px \* var\(--desktop-size\)\)/);
assert.match(policy, /:is\(\.record-meta dt, \.record-aside h3\) \{ font-size: calc\(13px \* var\(--desktop-size\)\)/);
assert.match(policy, /\.section-signal \{ transform: scale\(var\(--desktop-size\)\); transform-origin: center;/, "Navigation glyphs scale inside their allocated track");
assert.match(policy, /\.section-page-header h2 \{ font-size: calc\(34px \* var\(--desktop-size\)\)/, "Setup/Archive manifests keep the 34px desktop heading ratio");
assert.match(policy, /\.section-page-header \{ grid-template-columns: calc\(34px \* var\(--desktop-size\)\)/);
assert.match(policy, /\.setup-tile strong \{ font-size: calc\(16px \* var\(--desktop-size\)\)/);
assert.match(policy, /\.workspace:has\(\.archive-folder-page\) \{\s*--workspace-pad-bottom: calc\(32px \* var\(--desktop-size\)\);\s*--footer-reserve: calc\(48px \* var\(--desktop-size\)\)/, "Archive keeps its own baseline footer clearance at larger tiers");
const frameStart = css.indexOf("/* Shared workspace frame");
const sharedFrame = css.slice(frameStart, css.indexOf("@media (min-width: 761px) and (max-height: 850px)", frameStart));
assert.match(sharedFrame, /@media \(min-width: 761px\)/, "The shared frame is desktop only; handheld keeps its own flow");
assert.match(sharedFrame, /\.workspace-header \.subtle \{ min-block-size: 1lh; \}/, "Sections without a subtitle keep the same header height as the Dashboard");
assert.match(sharedFrame, /\.section-page--selector:is\(\.section-page--games, \.section-page--projects\) \{ flex: 1 1 0%; grid-template-rows: auto minmax\(0, 1fr\); \}/, "Projects and Games reach the footer like the Dashboard");
assert.match(sharedFrame, /\.section-page--selector \.record-selector \{ align-self: stretch; \}/, "The selector frame fills its row instead of stopping at its content");
const shelves = css.slice(css.indexOf("/* Tall desktop bays: both shelves share"), css.indexOf(".game-shelf-track:has([data-shelf-prev]"));
assert.ok(shelves.includes("@media (min-width: 761px) and (min-height: 851px)"), "Only tall desktop bays resize the disks; short ones keep their fixed shelf");
assert.ok(shelves.includes("grid-template-rows: minmax(0, 1fr) minmax(0, 1fr);"), "Session and Past Logs share the cabinet height equally");
assert.match(shelves, /--cabinet-cover: min\(calc\(178px \* var\(--selector-scale\)\), max\(calc\(110px \* var\(--selector-scale\)\), calc\(\(100cqh/, "Disks grow with their shelf, between a readable floor and the existing ceiling");
assert.ok(!shelves.includes("grid-auto-flow: row"), "Shelves stay single side-scrolling rows");
for (const source of ["../components/archive/section-page.tsx", "../static-app.js"]) assert.ok(!readFileSync(new URL(source, import.meta.url), "utf8").includes("--rack-columns"));
// Masthead: one header per section on desktop.
const masthead = css.slice(css.indexOf("/* Masthead: one header per section"));
assert.ok(masthead.includes(".archive-shell > .workspace > .section-page > .section-page-header { display: none; }"), "The in-container section plates are retired on desktop");
assert.ok(masthead.includes(".archive-shell > .workspace > .workspace-header.masthead::before { display: none; }"), "The ticking rule is retired");
assert.match(masthead, /\.masthead-digit > i \{[^}]*transform: translateY\(calc\(var\(--digit, 0\) \* -1em\)\); transition: transform 620ms/, "The section number rolls like a counter");
assert.match(masthead, /prefers-reduced-motion: reduce\) \{\s*\.masthead-digit > i \{ transition: none; \}/, "Reduced Motion sets the number without rolling");
assert.ok(masthead.includes("block-size: calc(104px * var(--masthead-size));"), "Every section's masthead has the same height, so the frame never shifts");
for (const [file, needles] of [["components/archive-os.tsx", ["MastheadCounter", "data-masthead-readout", "data-masthead-actions", "sectionRegistryLabels[activeSection]"]], ["static-app.js", ["mastheadCounter()", "data-masthead-readout", "data-masthead-actions", "sectionRegistryLabels[section.id]"]]]) {
  const source = readFileSync(new URL(`../${file}`, import.meta.url), "utf8");
  for (const needle of needles) assert.ok(source.includes(needle), `${file} renders ${needle}`);
  assert.ok(!source.includes('className="route-label"') && !source.includes('<p class="route-label">'), `${file} no longer repeats the section code above the title`);
}
const mastheadPlate = masthead.slice(masthead.indexOf(".archive-shell > .workspace > .workspace-header.masthead {"), masthead.indexOf("}", masthead.indexOf(".archive-shell > .workspace > .workspace-header.masthead {")));
assert.ok(mastheadPlate.includes("background: none;") && mastheadPlate.includes("box-shadow: none;") && mastheadPlate.includes("border: 0;"), "The masthead is lighter than the content: no plate, no box");
assert.ok(masthead.includes(".workspace-header.masthead h1:not(.is-resolving) .headline-cursor { visibility: hidden; }"), "The cursor shows only while a title resolves");
assert.ok(masthead.includes('grid-template-areas: "index title time actions";'), "Time comes first, then one continuous row of controls");
assert.match(masthead, /:is\(\.time-block > button, \.icon-button, \.local-review-button, \.archive-create-record:not\(\.game-shelf-search\)\) \{\s*flex: none;\s*inline-size: var\(--masthead-button\);\s*block-size: var\(--masthead-button\);/, "Every control is the same square button");
const navCss = readFileSync(new URL("../app/desktop-navigation.css", import.meta.url), "utf8");
assert.match(navCss, /\.archive-shell:not\(\[data-nav-wide\]\) \{\s*--dashboard-max-inline: min\(calc\(1480px \* var\(--desktop-size, 1\)\), calc\(100vw - var\(--sidebar-width\) - var\(--window-rail-pad\) \* 2\)\);/, "Legacy Mode fills the room beside the sidebar, so there is no empty strip on the right");
assert.match(navCss, /\.archive-shell:not\(\[data-nav-wide\]\) > \.workspace > \.workspace-header \{ max-inline-size: var\(--dashboard-max-inline\); \}/, "The masthead ends where the bay does");
// Setup is the machine: a boot menu of machines, the picked one's readout beside it, then the dock,
// devices and notes. Desktop only; handheld keeps the four groups.
{
  const react = readFileSync(new URL("../components/archive/section-page.tsx", import.meta.url), "utf8");
  const shell = readFileSync(new URL("../static-app.js", import.meta.url), "utf8");
  for (const [name, source] of [["React", react], ["static", shell]]) {
    for (const part of ["setup-boot-entry", "setup-machine-host", "setup-machine-palette", "setup-machine-open", "machineReadout(setupProfile(record).specs"]) assert.ok(source.includes(part), name + " Setup draws " + part);
  }
  assert.ok(shell.includes("if (target.dataset.setupMachine !== undefined) {") && shell.includes("setupMachineId: undefined"), "Picking a boot entry swaps the readout in the static reader");
  assert.ok(react.includes("const [machineId, setMachineId] = useState<string>();"), "React keeps the picked machine in state");
  assert.match(css, /\.setup-boot,\s*\.setup-machine \{ display: none; \}/, "The boot menu and readout are desktop only");
  assert.match(css, /grid-template-areas:\s*"systems systems systems machine/,"The machine readout sits beside the boot menu");
}
console.log("Desktop sizing contracts passed: discrete viewport tiers, shared proportions, scoped reader rules, fixed control aspect ratios and long-title sizing, one shared section frame and one masthead.");
