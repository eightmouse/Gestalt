import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";

const root = process.cwd();
const source = readFileSync(path.join(root, "static-app.js"), "utf8");
const indexHtml = readFileSync(path.join(root, "index.html"), "utf8");
const recordsData = readFileSync(path.join(root, "public", "data", "records.js"), "utf8");
const errors = [];

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

if (/(?:\]\(|full=|["'])\/(?:media|images)\//.test(recordsData)) {
  errors.push("Static records must convert root-relative media/image references for GitHub Pages.");
}

const swCheck = spawnSync(process.execPath, ["--check", path.join(root, "sw.js")], { encoding: "utf8" });

if (swCheck.status !== 0) {
  errors.push(`sw.js syntax check failed: ${(swCheck.stderr || swCheck.stdout || "").trim()}`);
}

if (errors.length > 0) {
  console.error("Static shell validation failed:");
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

console.log("Static shell validation passed.");
