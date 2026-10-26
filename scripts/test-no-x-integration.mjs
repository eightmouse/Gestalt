import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

const read = (file) => readFileSync(new URL(`../${file}`, import.meta.url), "utf8");
for (const file of ["public/x-terminal.js", "public/x-terminal.d.ts", "public/x-embed.html", "public/x-embed.js", "components/archive/x-terminal.tsx"]) {
  assert.equal(existsSync(new URL(`../${file}`, import.meta.url)), false, `Retired integration must not ship: ${file}`);
}
for (const file of ["index.html", "static-app.js", "app/globals.css", "scripts/prepare-pages.mjs", "scripts/publish-site.mjs", "scripts/static-cache.mjs"]) {
  assert.doesNotMatch(read(file), /GestaltXTerminal|x-terminal|x-embed|platform\.twitter\.com/, `${file} must not retain the retired feed`);
}
assert.match(read("static-app.js"), /function syncSearchPanel\(/, "Palette updates remain independent of dashboard rendering");
assert.match(read("components/archive/dashboard.tsx"), /<MemoryLoop\s*\/>/, "Memory State remains mounted in React");
console.log("Retired X integration is absent; Memory State and targeted palette updates remain.");
