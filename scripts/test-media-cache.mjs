import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const source = readFileSync(new URL("../sw.js", import.meta.url), "utf8");

function harness(scope = "https://archive.example/Gestalt/") {
  const handlers = new Map();
  const entries = new Map();
  const requests = [];
  const deletedCaches = [];
  let now = 1_000_000;
  let network = async () => new Response("fresh");
  let storageUnavailable = false;
  let writesUnavailable = false;
  const cache = {
    async match(request) { return entries.get(request.url)?.clone(); },
    async put(request, response) {
      if (writesUnavailable) throw new Error("Storage full");
      entries.set(request.url, response.clone());
    },
    async delete(request) { return entries.delete(request.url); }
  };
  const context = vm.createContext({
    URL, Request, Response, Map,
    Date: class extends Date { static now() { return now; } },
    caches: {
      async open(name) {
        assert.equal(name, "gestalt-media-v3");
        if (storageUnavailable) throw new Error("Storage unavailable");
        return cache;
      },
      async keys() { return ["gestalt-media-v2", "gestalt-media-v3", "unrelated-cache"]; },
      async delete(name) { deletedCaches.push(name); }
    },
    async fetch(request) {
      requests.push(request);
      return network(request);
    },
    self: {
      registration: { scope },
      location: { origin: new URL(scope).origin },
      clients: { async claim() {} },
      async skipWaiting() {},
      addEventListener(name, handler) { handlers.set(name, handler); }
    }
  });
  vm.runInContext(source, context, { filename: "sw.js" });

  function dispatch(url, options) {
    const tasks = [];
    let response;
    handlers.get("fetch")({
      request: new Request(new URL(url, scope), options),
      respondWith(promise) { response = Promise.resolve(promise); },
      waitUntil(promise) { tasks.push(promise); }
    });
    return { response, async settled() { await response; await Promise.all(tasks); } };
  }

  return {
    context, handlers, entries, requests, deletedCaches, dispatch,
    advance(ms) { now += ms; },
    network(fn) { network = fn; },
    breakStorage() { storageUnavailable = true; },
    breakWrites() { writesUnavailable = true; }
  };
}

const image = "https://archive.example/Gestalt/public/media/record.webp";
const h = harness();
assert.equal(h.requests.length, 0, "No eager media downloads");

for (const [url, options] of [
  ["https://other.example/Gestalt/public/media/record.webp"],
  ["/another-site/public/media/record.webp"],
  ["./public/media-private/record.webp"],
  ["./api/studio/entry"],
  [image, { method: "POST" }],
  [image, { cache: "no-store" }],
  [image, { headers: { Range: "bytes=0-9" } }],
  [image, { headers: { Authorization: "fixture-only" } }]
]) {
  assert.equal(h.dispatch(url, options).response, undefined, `Do not intercept ${url}`);
}

h.entries.set(image, new Response("old"));
let completeRefresh;
h.network(() => new Promise((resolve) => { completeRefresh = resolve; }));
const first = h.dispatch(image);
assert.equal(await (await first.response).text(), "old", "Cached image is immediate while offline/slow");
const concurrent = h.dispatch(image);
assert.equal(await (await concurrent.response).text(), "old");
assert.equal(h.requests.length, 1, "Concurrent refreshes are deduplicated");
assert.equal(h.requests[0].cache, "no-cache", "HTTP validators are used for refreshes");
completeRefresh(new Response("replacement"));
await Promise.all([first.settled(), concurrent.settled()]);
assert.equal(await h.entries.get(image).clone().text(), "replacement");
const repeat = h.dispatch(image);
assert.equal(await (await repeat.response).text(), "replacement");
await repeat.settled();
assert.equal(h.requests.length, 1, "Repeated DOM renders do not continuously revalidate");

h.advance(5 * 60 * 1000);
h.network(async () => { throw new Error("Offline"); });
const offline = h.dispatch(image);
assert.equal(await (await offline.response).text(), "replacement");
await offline.settled();
await h.dispatch(image).settled();
assert.equal(h.requests.length, 2, "Offline failures have a short retry cooldown");
h.advance(30 * 1000);
h.network(async () => new Response("Server error", { status: 503 }));
await h.dispatch(image).settled();
assert.equal(await h.entries.get(image).clone().text(), "replacement", "Errors do not overwrite a good image");

h.network(async () => new Response("versioned image"));
const versioned = h.dispatch(`${image}?v=changed`);
assert.equal(await (await versioned.response).text(), "versioned image", "Explicit media versions have separate keys");
await versioned.settled();

h.network(async () => new Response("explicit refresh"));
assert.equal(await (await h.dispatch(image, { cache: "reload" }).response).text(), "explicit refresh", "Explicit reload waits for fresh media");
h.network(async () => { throw new Error("Offline"); });
assert.equal(await (await h.dispatch(image, { cache: "no-cache" }).response).text(), "explicit refresh", "Explicit reload still has an offline fallback");

const misses = harness();
let completeMiss;
misses.network(() => new Promise((resolve) => { completeMiss = resolve; }));
const missA = misses.dispatch(image);
const missB = misses.dispatch(image);
await new Promise((resolve) => setImmediate(resolve));
assert.equal(misses.requests.length, 1);
completeMiss(new Response("shared download"));
assert.deepEqual(await Promise.all([missA.response, missB.response].map(async (p) => (await p).text())), ["shared download", "shared download"]);

for (const cacheControl of ["no-store", "private, max-age=60"]) {
  const restricted = harness();
  restricted.network(async () => new Response("uncached", { headers: { "Cache-Control": cacheControl } }));
  assert.equal(await (await restricted.dispatch(image).response).text(), "uncached");
  assert.equal(restricted.entries.size, 0);
}

const partial = harness();
partial.network(async () => new Response("partial", { status: 206 }));
await partial.dispatch(image).response;
assert.equal(partial.entries.size, 0, "Partial responses are never cached as complete files");

const noStorage = harness();
noStorage.breakStorage();
assert.equal(await (await noStorage.dispatch(image).response).text(), "fresh");
noStorage.network(async () => { throw new Error("Offline"); });
assert.equal((await noStorage.dispatch(image).response).status, 504);
const fullStorage = harness();
fullStorage.breakWrites();
assert.equal(await (await fullStorage.dispatch(image).response).text(), "fresh");
const offlineMiss = harness();
offlineMiss.network(async () => { throw new Error("Offline"); });
assert.equal((await offlineMiss.dispatch(image).response).status, 504);

const root = harness("https://archive.example/");
assert.equal(await (await root.dispatch("/public/images/background.webp").response).text(), "fresh");
let activation;
h.handlers.get("activate")({ waitUntil(promise) { activation = promise; } });
await activation;
assert.deepEqual(h.deletedCaches, ["gestalt-media-v2"], "Activation preserves current images and unrelated caches");
h.advance(5 * 60 * 1000);
h.network(async () => new Response("fresh"));
for (let index = 0; index < 260; index += 1) {
  await h.dispatch(`${image}?fixture=${index}`).response;
}
assert.equal(vm.runInContext("mediaRefreshAfter.size <= 256 && mediaRefreshes.size === 0", h.context), true, "Refresh bookkeeping is bounded");

console.log("Media cache tests passed: refresh, throttling, concurrency, versions, scope, offline and storage failures.");
