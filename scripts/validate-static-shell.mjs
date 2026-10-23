import { existsSync, readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { updateStaticCacheTokens } from "./static-cache.mjs";

const root = process.cwd();
const source = readFileSync(path.join(root, "static-app.js"), "utf8");
const serviceWorker = readFileSync(path.join(root, "sw.js"), "utf8");
const indexHtml = readFileSync(path.join(root, "index.html"), "utf8");
const recordsData = readFileSync(path.join(root, "public", "data", "records.js"), "utf8");
const publishScript = readFileSync(path.join(root, "scripts", "publish-site.mjs"), "utf8");
const errors = [];

const cacheTokenCases = [
  ['src="public/desktop-navigation.js?v=1.54.0"', 'src="public/desktop-navigation.js?v=12345"'],
  ['href="app/desktop-navigation.css?v=1.54.0"', 'href="app/desktop-navigation.css?v=12345"'],
  ['src="public/seasonal.js?v=1.53.0"', 'src="public/seasonal.js?v=12345"'],
  ['src="public/image-framing.js?v=1.46.0"', 'src="public/image-framing.js?v=12345"'],
  ['href="app/globals.css?v=1.36.24"', 'href="app/globals.css?v=12345"'],
  ['src="public/data/records.js?v=1700000000"', 'src="public/data/records.js?v=12345"'],
  ['src="public/note-inline.js?v=1.40.0"', 'src="public/note-inline.js?v=12345"'],
  ["src='static-app.js'", "src='static-app.js?v=12345'"],
  ['src="static-app.js?mode=preview&v=1.36.24#entry"', 'src="static-app.js?mode=preview&v=12345#entry"'],
  ['src="public/images/archive-banner.png?v=1.36.24"', 'src="public/images/archive-banner.png?v=1.36.24"']
];

for (const [input, expected] of cacheTokenCases) {
  if (updateStaticCacheTokens(input, 12345) !== expected || updateStaticCacheTokens(expected, 12345) !== expected) {
    errors.push(`Cache-token replacement regression: ${input}`);
  }
}

function extractFunction(name) {
  const marker = `function ${name}(`;
  const start = source.indexOf(marker);

  if (start === -1) {
    errors.push(`Missing function ${name}().`);
    return "";
  }

  const bodyStart = source.indexOf("{", start);
  let depth = 0;

  for (let index = bodyStart; index < source.length; index += 1) {
    const char = source[index];

    if (char === "{") {
      depth += 1;
    } else if (char === "}") {
      depth -= 1;

      if (depth === 0) {
        return source.slice(start, index + 1);
      }
    }
  }

  errors.push(`Could not parse function ${name}().`);
  return "";
}

const sidebar = extractFunction("sidebar");
const archiveNavigationMenu = extractFunction("archiveNavigationMenu");
const recordsScriptIndex = indexHtml.indexOf("public/data/records.js");
const appScriptIndex = indexHtml.indexOf("static-app.js");
const inlineScriptIndex = indexHtml.indexOf("public/note-inline.js");
const framingScriptIndex = indexHtml.indexOf("public/image-framing.js");
const xScriptIndex = indexHtml.indexOf("public/x-terminal.js");
const seasonalScriptIndex = indexHtml.indexOf("public/seasonal.js");
if (seasonalScriptIndex === -1 || seasonalScriptIndex > appScriptIndex) errors.push("The seasonal policy must load before the static runtime.");
const seasonalSyntax = spawnSync(process.execPath, ["--check", path.join(root, "public/seasonal.js")], { encoding: "utf8" });
if (seasonalSyntax.status !== 0) errors.push("The seasonal helper is missing or has invalid syntax.");
const seasonalCheck = spawnSync(process.execPath, [path.join(root, "scripts/test-seasonal.mjs")], { encoding: "utf8" });
if (seasonalCheck.status !== 0) errors.push(`Seasonal regression failed: ${(seasonalCheck.stderr || seasonalCheck.stdout || "").trim()}`);
const desktopNavigationSyntax = spawnSync(process.execPath, ["--check", path.join(root, "public/desktop-navigation.js")], { encoding: "utf8" });
if (desktopNavigationSyntax.status !== 0) errors.push("Desktop navigation helper is missing or has invalid syntax.");
const desktopNavigationCheck = spawnSync(process.execPath, [path.join(root, "scripts/test-desktop-navigation.mjs")], { encoding: "utf8" });
if (desktopNavigationCheck.status !== 0) errors.push(`Desktop navigation regression failed: ${(desktopNavigationCheck.stderr || desktopNavigationCheck.stdout || "").trim()}`);
const paletteCheck = spawnSync(process.execPath, [path.join(root, "scripts/test-search-palette.mjs")], { encoding: "utf8" });
if (paletteCheck.status !== 0) errors.push(`Palette regression failed: ${(paletteCheck.stderr || paletteCheck.stdout || "").trim()}`);
const sectionPreviewCheck = spawnSync(process.execPath, [path.join(root, "scripts/test-section-previews.mjs")], { encoding: "utf8" });
if (sectionPreviewCheck.status !== 0) errors.push(`Section preview regression failed: ${(sectionPreviewCheck.stderr || sectionPreviewCheck.stdout || "").trim()}`);
if (xScriptIndex !== -1 && xScriptIndex > appScriptIndex) errors.push("When enabled, X Terminal helper must load before the static runtime.");
for (const file of ["public/x-terminal.js", "public/x-embed.js"]) {
  const result = spawnSync(process.execPath, ["--check", path.join(root, file)], { encoding: "utf8" });
  if (result.status !== 0) errors.push(`${file} is missing or has invalid syntax.`);
}
const xCheck = spawnSync(process.execPath, [path.join(root, "scripts/test-x-terminal.mjs")], { encoding: "utf8" });
if (xCheck.status !== 0) errors.push(`X Terminal regression failed: ${(xCheck.stderr || xCheck.stdout || "").trim()}`);
const desktopCheck = spawnSync(process.execPath, [path.join(root, "scripts/test-desktop-sizing.mjs")], { encoding: "utf8" });
if (desktopCheck.status !== 0) errors.push(`Desktop sizing regression failed: ${(desktopCheck.stderr || desktopCheck.stdout || "").trim()}`);
const timelineCheck = spawnSync(process.execPath, [path.join(root, "scripts/test-timeline.mjs")], { encoding: "utf8" });
if (timelineCheck.status !== 0) errors.push(`Timeline regression failed: ${(timelineCheck.stderr || timelineCheck.stdout || "").trim()}`);
const roadmapCheck = spawnSync(process.execPath, [path.join(root, "scripts/test-roadmap.mjs")], { encoding: "utf8" });
if (roadmapCheck.status !== 0) errors.push(`Public roadmap regression failed: ${(roadmapCheck.stderr || roadmapCheck.stdout || "").trim()}`);
const inlineEditingCheck = spawnSync(process.execPath, [path.join(root, "scripts/test-inline-editing.mjs")], { encoding: "utf8" });
if (inlineEditingCheck.status !== 0) errors.push(`Inline editing regression failed: ${(inlineEditingCheck.stderr || inlineEditingCheck.stdout || "").trim()}`);
const publishingCheck = spawnSync(process.execPath, [path.join(root, "scripts/test-publishing-ui.mjs")], { encoding: "utf8" });
if (publishingCheck.status !== 0) errors.push(`Publishing UI regression failed: ${(publishingCheck.stderr || publishingCheck.stdout || "").trim()}`);
if (framingScriptIndex === -1 || framingScriptIndex > appScriptIndex || !existsSync(path.join(root, "public/image-framing.js"))) {
  errors.push("The image framing helper must load before the static runtime.");
}

if (inlineScriptIndex === -1 || inlineScriptIndex > appScriptIndex || !existsSync(path.join(root, "public/note-inline.js"))) {
  errors.push("The shared note-inline helper must exist and load before the static runtime.");
}

if (sidebar && !/const groups = sections\s*\.map\s*\(/m.test(sidebar)) {
  errors.push("Desktop static sidebar must render every archive section.");
}

if (sidebar && /const groups = sections\s*\.filter\s*\(\s*\(section\)\s*=>\s*section\.id\s*===\s*["']archive["']\s*\)/m.test(sidebar)) {
  errors.push("Desktop static sidebar is filtered to Archive only.");
}

if (archiveNavigationMenu && !/const archiveGroups = sections\s*\.filter\s*\(\s*\(section\)\s*=>\s*section\.id\s*===\s*["']archive["']\s*\)/m.test(archiveNavigationMenu)) {
  errors.push("Mobile archive menu should keep Archive isolated in archiveGroups.");
}

if (archiveNavigationMenu && !archiveNavigationMenu.includes("archive-nav-search--mobile")) {
  errors.push("Mobile archive menu search form is missing.");
}

if (/window\.__GESTALT_RECORDS\s*\|\|\s*\[/m.test(source)) {
  errors.push("Static runtime must not embed stale fallback records.");
}

if (!/recordsLoaded/.test(source) || !/archive-shell--unavailable/.test(source)) {
  errors.push("Static runtime must render an explicit unavailable-records state.");
}

if (/warmLocalMediaCache|localMediaSourcesForWarmup|GESTALT_PREFETCH_MEDIA/.test(source)) {
  errors.push("Static runtime must not eagerly prefetch archive media.");
}

if (/GESTALT_PREFETCH_MEDIA|async function prefetchMedia/.test(serviceWorker)) {
  errors.push("Service worker must cache media only after it is requested.");
}

if (recordsScriptIndex === -1) {
  errors.push("index.html must load public/data/records.js.");
}

if (appScriptIndex === -1) {
  errors.push("index.html must load static-app.js.");
}

if (recordsScriptIndex !== -1 && appScriptIndex !== -1 && recordsScriptIndex > appScriptIndex) {
  errors.push("public/data/records.js must load before static-app.js.");
}

if (!recordsData.startsWith("window.__GESTALT_RECORDS = [")) {
  errors.push("public/data/records.js must export window.__GESTALT_RECORDS.");
}

if (/run\("git",\s*\["add",\s*"-A"\]\)/.test(publishScript)) {
  errors.push("Archive publishing must not stage the entire worktree.");
}

if (!publishScript.includes("const paths = publishPaths.filter(") || !publishScript.includes('run("git", ["add", "-A", "--", ...paths])')) {
  errors.push("Archive publishing must stage only its explicit content and media paths.");
}

if (!publishScript.includes("function ensureNoUnexpectedStagedFiles()")) {
  errors.push("Archive publishing must block unrelated files that are already staged.");
}

if (/(?:\]\(|full=|["'])\/(?:media|images)\//.test(recordsData)) {
  errors.push("Static records must convert root-relative media/image references for GitHub Pages.");
}

function collectStaticAssetReferences(source) {
  return [
    ...new Set(
      [...source.matchAll(/public\/(?:media|images)\/[^\s"'\\)\]<>]+/g)]
        .map((match) => match[0].replace(/[.,;:]+$/, ""))
    )
  ];
}

for (const file of collectStaticAssetReferences(`${indexHtml}\n${recordsData}`)) {
  if (!existsSync(path.join(root, file))) {
    errors.push(`Static asset reference is missing: ${file}`);
  }
}

const swCheck = spawnSync(process.execPath, ["--check", path.join(root, "sw.js")], { encoding: "utf8" });
const inlineCheck = spawnSync(process.execPath, ["--check", path.join(root, "public/note-inline.js")], { encoding: "utf8" });
const framingCheck = spawnSync(process.execPath, ["--check", path.join(root, "public/image-framing.js")], { encoding: "utf8" });
if (framingCheck.status !== 0) errors.push("Image framing helper has invalid JavaScript syntax.");
if (inlineCheck.status !== 0) {
  errors.push(`Note inline helper syntax check failed: ${(inlineCheck.stderr || inlineCheck.stdout || "").trim()}`);
}

if (swCheck.status !== 0) {
  errors.push(`sw.js syntax check failed: ${(swCheck.stderr || swCheck.stdout || "").trim()}`);
}

const mediaCheck = spawnSync(process.execPath, [path.join(root, "scripts", "test-media-cache.mjs")], { encoding: "utf8" });

if (mediaCheck.status !== 0) {
  errors.push(`Media cache regression check failed: ${(mediaCheck.stderr || mediaCheck.stdout || "").trim()}`);
}

const steamDisplayCheck = spawnSync(process.execPath, [path.join(root, "scripts", "test-steam-display.mjs")], { encoding: "utf8" });

if (steamDisplayCheck.status !== 0) {
  errors.push(`Steam display regression check failed: ${(steamDisplayCheck.stderr || steamDisplayCheck.stdout || "").trim()}`);
}

const summaryCheck = spawnSync(process.execPath, [path.join(root, "scripts", "test-record-summary.mjs")], { encoding: "utf8" });

if (summaryCheck.status !== 0) {
  errors.push(`Record summary regression check failed: ${(summaryCheck.stderr || summaryCheck.stdout || "").trim()}`);
}

const logOrderCheck = spawnSync(process.execPath, [path.join(root, "scripts", "test-log-order.mjs")], { encoding: "utf8" });
if (logOrderCheck.status !== 0) {
  errors.push(`Log ordering regression check failed: ${(logOrderCheck.stderr || logOrderCheck.stdout || "").trim()}`);
}

const entryAccessCheck = spawnSync(process.execPath, [path.join(root, "scripts", "test-entry-access.mjs")], { encoding: "utf8" });
if (entryAccessCheck.status !== 0) {
  errors.push(`Entry animation regression check failed: ${(entryAccessCheck.stderr || entryAccessCheck.stdout || "").trim()}`);
}

const noteFormattingCheck = spawnSync(process.execPath, [path.join(root, "scripts", "test-note-formatting.mjs")], { encoding: "utf8" });
if (noteFormattingCheck.status !== 0) {
  errors.push(`Note formatting regression check failed: ${(noteFormattingCheck.stderr || noteFormattingCheck.stdout || "").trim()}`);
}

const bootCheck = spawnSync(process.execPath, [path.join(root, "scripts", "test-boot.mjs")], { encoding: "utf8" });
if (bootCheck.status !== 0) {
  errors.push(`Boot regression check failed: ${(bootCheck.stderr || bootCheck.stdout || "").trim()}`);
}

const archiveCheck = spawnSync(process.execPath, [path.join(root, "scripts", "test-field-archive.mjs")], { encoding: "utf8" });
if (archiveCheck.status !== 0) {
  errors.push(`Field Archive regression check failed: ${(archiveCheck.stderr || archiveCheck.stdout || "").trim()}`);
}

const contextualCheck = spawnSync(process.execPath, [path.join(root, "scripts", "test-contextual-content.mjs")], { encoding: "utf8" });
if (contextualCheck.status !== 0) {
  errors.push(`Contextual content regression check failed: ${(contextualCheck.stderr || contextualCheck.stdout || "").trim()}`);
}

const imageViewerCheck = spawnSync(process.execPath, [path.join(root, "scripts", "test-image-lightbox.mjs")], { encoding: "utf8" });
if (imageViewerCheck.status !== 0) {
  errors.push(`Image viewer regression check failed: ${(imageViewerCheck.stderr || imageViewerCheck.stdout || "").trim()}`);
}

const gameStateCheck = spawnSync(process.execPath, [path.join(root, "scripts", "test-game-state.mjs")], { encoding: "utf8" });
if (gameStateCheck.status !== 0) {
  errors.push(`Game state regression check failed: ${(gameStateCheck.stderr || gameStateCheck.stdout || "").trim()}`);
}

const pagesSyntaxCheck = spawnSync(process.execPath, ["--check", path.join(root, "scripts", "prepare-pages.mjs")], { encoding: "utf8" });
if (pagesSyntaxCheck.status !== 0 || !existsSync(path.join(root, ".github", "workflows", "pages.yml"))) {
  errors.push("Pages preparation script/workflow is missing or has invalid JavaScript syntax.");
}

if (errors.length > 0) {
  console.error("Static shell validation failed:");
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

console.log("Static shell validation passed.");
