import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import cipher from "../public/cipher-decode.js";
import { updateStaticCacheTokens } from "./static-cache.mjs";

const sample = "Cafe\u0301 / 夕暮れ 14 👩‍💻 & GO!";
const signal = cipher.plan(sample);
assert.deepEqual(signal, cipher.plan(sample), "Server and browsers render the same initial signal");
assert.notEqual(signal.initial, signal.burst);
assert.match(signal.initial, /^(?:[2-9A-Z#/+|:\[\]]{5} )*[2-9A-Z#/+|:\[\]]{1,5}$/);
assert.notEqual(signal.initial.length, sample.length, "Signal spacing is independent of the authored text");
assert.ok(cipher.plan("a".repeat(60)).steps <= 18, "Long titles cannot extend the sweep beyond its budget");
assert.equal(cipher.plan("a".repeat(61)), null, "Oversized strings remain plain");
assert.equal(cipher.plan("..."), null);

const read = (file) => readFileSync(new URL(`../${file}`, import.meta.url), "utf8");
const shell = read("index.html");
assert.ok(shell.includes("public/cipher-decode.js") && shell.indexOf("public/cipher-decode.js") < shell.indexOf('src="static-app.js'));
assert.match(updateStaticCacheTokens(shell, "fixture"), /public\/cipher-decode\.js\?v=fixture/);
for (const file of ["scripts/prepare-pages.mjs", "lib/publish-paths.mjs"]) assert.ok(read(file).includes('"public/cipher-decode.js"'));
for (const file of ["static-app.js", "components/archive/headline-text.tsx", "app/globals.css"]) assert.doesNotMatch(read(file), /cipher-cell|cipher-index/);
console.log("Cipher checks passed: independent signal, bounded line sweep, asset order and publish paths.");
