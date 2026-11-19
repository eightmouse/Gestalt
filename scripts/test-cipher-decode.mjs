import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import cipher from "../public/cipher-decode.js";
import { updateStaticCacheTokens } from "./static-cache.mjs";

const sample = "Cafe\u0301 / 夕暮れ 14 👩‍💻 & GO!";
const cells = cipher.plan(sample);
assert.equal(cells.map(({ text }) => text).join(""), sample, "Punctuation, spacing and authored text survive unchanged");
assert.ok(cells.some(({ text, glyphs }) => text === "e\u0301" && glyphs), "Accent marks stay attached to their letters");
assert.ok(cells.some(({ text, glyphs }) => text === "👩‍💻" && !glyphs), "Emoji are not replaced");
assert.deepEqual(cells, cipher.plan(sample), "Server and browsers render the same initial signal");
const animated = cells.filter(({ glyphs }) => glyphs);
assert.ok(animated.every(({ text, glyphs }) => glyphs.length === 3 && !glyphs.includes(text.toUpperCase())));
assert.deepEqual(animated.filter(({ last }) => last).map(({ text }) => text), ["O"]);
assert.ok(cipher.plan("a".repeat(60)).at(-1).step <= 23, "Long titles cannot extend the stagger beyond its budget");
assert.deepEqual(cipher.plan("a".repeat(61)), [{ text: "a".repeat(61) }], "Oversized strings remain plain");
assert.deepEqual(cipher.plan("..."), [{ text: "..." }]);

const read = (file) => readFileSync(new URL(`../${file}`, import.meta.url), "utf8");
const shell = read("index.html");
assert.ok(shell.includes("public/cipher-decode.js") && shell.indexOf("public/cipher-decode.js") < shell.indexOf('src="static-app.js'));
assert.match(updateStaticCacheTokens(shell, "fixture"), /public\/cipher-decode\.js\?v=fixture/);
for (const file of ["scripts/prepare-pages.mjs", "lib/publish-paths.mjs"]) assert.ok(read(file).includes('"public/cipher-decode.js"'));
console.log("Cipher checks passed: Unicode, stable slots, finite timing, asset order and publish paths.");
