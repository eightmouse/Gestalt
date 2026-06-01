import { readFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const source = readFileSync(path.join(root, "static-app.js"), "utf8");
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

if (errors.length > 0) {
  console.error("Static shell validation failed:");
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

console.log("Static shell validation passed.");
