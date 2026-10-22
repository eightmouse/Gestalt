import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import vm from "node:vm";
import ts from "typescript";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

const require = createRequire(import.meta.url);
const read = (name) => readFileSync(new URL(`../${name}`, import.meta.url), "utf8");
const compile = (name) => ts.transpileModule(read(name), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText;
const api = vm.createContext({ exports: {}, Error });
vm.runInContext(compile("lib/studio-client-api.ts"), api);
function store(fetch, mode = "development") {
  const context = vm.createContext({ exports: {}, Error, AbortSignal, process: { env: { NODE_ENV: mode } }, fetch,
    require: (name) => name === "@/lib/studio-client-api" ? api.exports : require(name) });
  vm.runInContext(compile("components/studio/publishing-store.ts"), context);
  return context.exports.useStudioPublishing;
}
const pending = (count = 1, extra = {}) => ({ records: Array.from({ length: count }, (_, index) => ({ id: `fixture-${index}`, title: `Pending fixture ${index}`, section: "logs", change: "new" })), changedFiles: count + 1, mediaFiles: 0, staticDataChanged: true, staticExportRequired: false, unpushedCommits: 0, ...extra });

const reads = [];
const ordered = store((url, options) => { assert.equal(url, "/api/studio/changes"); assert.equal(options.method, "POST"); return new Promise((resolve) => reads.push(resolve)); });
const first = ordered.getState().refreshPendingChanges();
assert.equal(ordered.getState().refreshPendingChanges(), first, "Simultaneous header/Studio reads share one request");
const fresh = ordered.getState().refreshPendingChanges(true);
assert.equal(reads.length, 2);
reads[1](Response.json(pending(2))); await fresh;
reads[0](Response.json(pending(1))); await first;
assert.equal(ordered.getState().pendingChanges.records.length, 2, "Older change reads cannot undo a completed save refresh");
assert.equal(ordered.getState().checking, false);

const calls = [];
let pushed = false, failure = false, stale = false, readFailure = false;
const shared = store(async (url, options) => {
  calls.push(url); assert.equal(options.method, "POST");
  if (url === "/api/studio/changes") return readFailure ? Response.json({ error: "Review unavailable" }, { status: 500 }) : Response.json(pending(pushed ? 0 : 2, { changedFiles: pushed ? 0 : 3, staticExportRequired: stale }));
  if (url === "/api/studio/export") { stale = false; return Response.json({ message: "Archive refreshed" }); }
  assert.equal(url, "/api/studio/publish", "Publishing never calls entry/media writes or arbitrary URLs");
  if (failure) return Response.json({ error: "Publish failed with exit code 1", output: "Publish blocked: public site code has uncommitted changes" }, { status: 500 });
  pushed = true; return Response.json({ published: true, message: "Pushed. Deployment follows separately.", summary: { commit: "abcdef123" } });
});
await shared.getState().refreshPendingChanges();
shared.getState().setReviewOpen(true);
const publishing = shared.getState().publishChanges();
assert.equal(shared.getState().publishing, true);
assert.equal(await shared.getState().publishChanges(), false, "Double publishing is excluded in the shared controller");
assert.equal(await publishing, true);
assert.equal(calls.filter((url) => url === "/api/studio/publish").length, 1);
assert.equal(shared.getState().pendingChanges.records.length, 0);
assert.equal(shared.getState().publishState.phase, "success");
assert.equal(shared.getState().reviewOpen, true);
assert.equal(shared.getState().publishing, false);
pushed = false; failure = true;
assert.equal(await shared.getState().publishChanges(), false);
assert.equal(shared.getState().pendingChanges.records.length, 2);
assert.match(shared.getState().publishState.detail, /code commit first/);
assert.match(shared.getState().publishState.output, /uncommitted changes/);
stale = true; failure = false;
const attempts = calls.filter((url) => url === "/api/studio/publish").length;
assert.equal(await shared.getState().publishChanges(), false);
assert.equal(calls.filter((url) => url === "/api/studio/publish").length, attempts, "An outdated export must be repaired before publishing");
assert.equal(await shared.getState().refreshArchive(), true);
assert.equal(shared.getState().archiveRefreshRequired, false);
readFailure = true;
assert.equal(await shared.getState().publishChanges(), false);
assert.equal(calls.filter((url) => url === "/api/studio/publish").length, attempts, "Failed review never publishes a stale pending list");
assert.equal(shared.getState().publishing, false);
readFailure = false;
assert.equal(await shared.getState().publishChanges(), true, "Failures can be retried without losing the shared state");

const offline = store(async () => { throw new Error("Disconnected fixture"); });
assert.equal(await offline.getState().publishChanges(), false);
assert.equal(offline.getState().publishing, false);
assert.match(offline.getState().pendingChangesError, /Disconnected/);
const production = store(() => { throw new Error("Production must not fetch Studio routes"); }, "production");
await production.getState().refreshPendingChanges();
assert.equal(await production.getState().publishChanges(), false);
assert.equal(await production.getState().refreshArchive(), false);
assert.equal(production.getState().pendingChanges, null);

const panel = vm.createContext({ exports: {}, require });
vm.runInContext(compile("components/studio/change-review-panel.tsx"), panel);
const props = { changes: pending(), error: "", notification: null, saving: false, refreshRequired: false, onClose() {}, onPublish() {}, onRefresh() {}, onRetry() {}, onReview() {} };
const html = (extra = {}) => renderToStaticMarkup(createElement(panel.exports.PublishNotificationPanel, { ...props, ...extra }));
assert.match(html(), /Unsaved drafts are not included/);
assert.match(html(), /Pages deployment/);
for (const extra of [{ saving: true }, { checking: true }, { error: "read failed" }, { refreshRequired: true }]) assert.match(html(extra), /disabled=""[^>]*>[^<]*(?:Working\.\.\.|Publish all pending changes)/);
assert.ok(html({ changes: pending(1, { records: [{ id: "test", title: '<img src=x onerror="bad()">', change: "edited" }] }) }).includes("&lt;img"));
assert.ok(!html({ notification: { phase: "error", title: "Failure", detail: "<script>bad()</script>", output: "<iframe>" } }).includes("<iframe>"));
const host = read("components/studio/local-change-review.tsx");
assert.ok(host.includes("createPortal(") && host.includes("document.body"));
assert.ok(host.includes("dialog.showModal()") && host.includes("event.target === event.currentTarget"));
assert.ok(!host.includes("setInterval") && !read("components/studio/publishing-store.ts").includes("setInterval"));
assert.ok(!read("index.html").includes("studio") && !read("static-app.js").includes("/api/studio/publish"));
assert.match(read("components/archive-os.tsx"), /process\.env\.NODE_ENV === "development" \? <LocalChangeReview/);
console.log("Publishing UI checks passed: shared/deduplicated reads, stale-result protection, exclusive publish, failures/retries, export recovery, escaped review UI and production isolation.");
