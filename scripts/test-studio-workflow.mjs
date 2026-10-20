import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { copyFile, mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";
import { promisify } from "node:util";
import ts from "typescript";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sandbox = await mkdtemp(path.join(os.tmpdir(), "gestalt-workflow-"));
const fixture = path.join(sandbox, "project");
const modules = path.join(sandbox, "modules");
const previousCwd = process.cwd();
const previousMode = process.env.NODE_ENV;
const exec = promisify(execFile);
const nextServer = pathToFileURL(createRequire(import.meta.url).resolve("next/server.js")).href;
const moduleFiles = {
  studio: "lib/studio.ts", "studio-operation": "lib/studio-operation.ts", "studio-process": "lib/studio-process.ts",
  "static-export": "lib/static-export.ts", "studio-media": "lib/studio-media.ts", content: "lib/content.ts",
  entry: "app/api/studio/entry/route.ts", media: "app/api/studio/media/route.ts", export: "app/api/studio/export/route.ts",
  changes: "app/api/studio/changes/route.ts", publish: "app/api/studio/publish/route.ts"
};
const git = async (...args) => (await exec("git", args, { cwd: fixture, windowsHide: true })).stdout.trim();
const request = (body = {}, origin = "http://127.0.0.1:3000", method = "POST") => new NextRequest("http://127.0.0.1:3000/api/studio/entry", {
  method, headers: { host: "127.0.0.1:3000", origin, "content-type": "application/json" }, body: JSON.stringify(body)
});
const record = { id: "workflow-note", title: "Workflow note", section: "logs", updated: "2026-10-20", summary: "Test record", body: ":::note 20 / 10 / 2026 - First note\nFixture content.\n:::" };
const { NextRequest } = await import(nextServer);

try {
  await Promise.all([mkdir(modules, { recursive: true }), mkdir(path.join(fixture, "content/records"), { recursive: true }), mkdir(path.join(fixture, "public/data"), { recursive: true }), mkdir(path.join(fixture, "scripts"), { recursive: true })]);
  for (const [name, sourceFile] of Object.entries(moduleFiles)) {
    const source = await readFile(path.join(root, sourceFile), "utf8");
    const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText
      .replace(/from "@\/lib\/([^"/]+)"/g, (_, dependency) => `from "${pathToFileURL(path.join(modules, `${dependency}.mjs`)).href}"`)
      .replace(/from "next\/server"/g, `from "${nextServer}"`);
    await writeFile(path.join(modules, `${name}.mjs`), compiled);
  }
  const exporter = path.join(fixture, "scripts/export-static-records.mjs");
  const realExporter = await readFile(path.join(root, "scripts/export-static-records.mjs"), "utf8");
  await writeFile(exporter, "process.exit(7);\n");
  process.chdir(fixture);
  process.env.NODE_ENV = "development";
  const load = (name) => import(pathToFileURL(path.join(modules, `${name}.mjs`)).href);
  const entry = await load("entry"), refresh = await load("export"), changes = await load("changes"), publish = await load("publish"), media = await load("media");
  const { beginStudioOperation } = await load("studio-operation");
  const { runStudioProcess } = await load("studio-process");

  for (const route of [entry, refresh, changes, publish, media]) assert.equal((await route.POST(request({}, "https://untrusted.invalid"))).status, 404);
  const partial = await entry.POST(request(record));
  assert.equal(partial.status, 200);
  assert.equal((await partial.json()).staticExported, false);
  const recordPath = path.join(fixture, "content/records/workflow-note.mdx");
  assert.match(await readFile(recordPath, "utf8"), /Fixture content/);
  assert.equal((await entry.POST(request(record))).status, 409, "A partial export must not permit a duplicate new record");
  await writeFile(exporter, realExporter);
  const before = await readFile(recordPath, "utf8");
  assert.equal((await refresh.POST(request())).status, 200);
  assert.equal(await readFile(recordPath, "utf8"), before, "Export retry must not rewrite the saved record");
  assert.match(await readFile(path.join(fixture, "public/data/records.js"), "utf8"), /workflow-note/);
  assert.equal((await readdir(path.join(fixture, "public/data"))).some((name) => name.endsWith(".tmp")), false);

  const release = beginStudioOperation("publish");
  assert.equal((await entry.POST(request({ ...record, originalId: record.id }))).status, 409);
  assert.equal((await entry.DELETE(request({ id: record.id }, undefined, "DELETE"))).status, 409);
  assert.equal((await refresh.POST(request())).status, 409);
  assert.equal((await publish.POST(request())).status, 409);
  const upload = new FormData();
  upload.set("recordId", "fixture-media");
  upload.set("file", new Blob([new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10])], { type: "image/png" }), "test.png");
  assert.equal((await media.POST(new NextRequest("http://127.0.0.1:3000/api/studio/media", {
    method: "POST", headers: { host: "127.0.0.1:3000", origin: "http://127.0.0.1:3000" }, body: upload
  }))).status, 409);
  release();
  const renamed = { ...record, originalId: record.id, id: "renamed-note" };
  assert.equal((await entry.POST(request(renamed))).status, 200);
  assert.equal(existsSync(recordPath), false);
  await writeFile(exporter, "process.exit(7);\n");
  const deleted = await entry.DELETE(request({ id: renamed.id }, undefined, "DELETE"));
  assert.equal((await deleted.json()).staticExported, false);
  assert.equal(existsSync(path.join(fixture, "content/records/renamed-note.mdx")), false);
  await writeFile(exporter, realExporter);
  assert.equal((await refresh.POST(request())).status, 200);
  assert.equal((await entry.POST(request(record))).status, 200);
  console.log("Save/export: partial success, duplicate protection, refresh retry, rename, deletion, and lock release passed.");

  await git("init", "--initial-branch=main");
  await git("config", "user.name", "Gestalt Workflow Test");
  await git("config", "user.email", "workflow@example.invalid");
  await git("config", "commit.gpgsign", "false");
  await git("config", "core.hooksPath", path.join(sandbox, "empty-hooks"));
  const fakePublisher = path.join(fixture, "scripts/publish-site.mjs");
  await writeFile(fakePublisher, "import fs from 'node:fs'; fs.writeFileSync('publish-started', 'yes'); const deadline=Date.now()+5000; const timer=setInterval(()=>{if(fs.existsSync('publish-finish')||Date.now()>deadline){clearInterval(timer); console.log('Published main to GitHub.');}},20);\n");
  let finished = false;
  const publishing = publish.POST(request()).then((response) => { finished = true; return response; });
  for (let attempts = 0; !existsSync(path.join(fixture, "publish-started")) && attempts < 100; attempts++) await new Promise((resolve) => setTimeout(resolve, 20));
  assert.equal(existsSync(path.join(fixture, "publish-started")), true);
  assert.equal((await entry.POST(request({ ...record, originalId: record.id }))).status, 409);
  assert.equal((await changes.POST(request())).status, 200);
  assert.equal(finished, false, "Change review must respond while the publisher is running");
  await writeFile(path.join(fixture, "publish-finish"), "yes");
  assert.equal((await publishing).status, 200);
  await writeFile(fakePublisher, "process.exit(2);\n");
  assert.equal((await publish.POST(request())).status, 500);
  assert.equal((await refresh.POST(request())).status, 200, "Publish failure must release the shared lock");
  console.log("Async publishing: concurrent change review, write exclusion, and failure recovery passed.");

  const worker = path.join(fixture, "worker.mjs");
  await writeFile(worker, "import {spawn} from 'node:child_process'; import fs from 'node:fs'; const child=spawn(process.execPath,['-e','setInterval(()=>{},1000)'],{stdio:'ignore'}); fs.writeFileSync('worker-child',String(child.pid)); setInterval(()=>{},1000);\n");
  const timed = await runStudioProcess(process.execPath, [worker], 1200);
  assert.match(timed.error, /timed out/);
  const childPid = Number(await readFile(path.join(fixture, "worker-child"), "utf8"));
  assert.throws(() => process.kill(childPid, 0), "Timeout must stop the worker's descendant too");
  console.log("Process timeout: publisher-style child tree was stopped.");

  for (const name of ["publish-site.mjs", "static-cache.mjs"]) await copyFile(path.join(root, "scripts", name), path.join(fixture, "scripts", name));
  for (const name of ["validate-content.mjs", "validate-static-shell.mjs"]) await writeFile(path.join(fixture, "scripts", name), "process.exit(0);\n");
  await mkdir(path.join(fixture, "public/media/records"), { recursive: true });
  await writeFile(path.join(fixture, "public/media/records/fixture.txt"), "fixture\n");
  for (const name of ["favicon.svg", "favicon.ico"]) await writeFile(path.join(fixture, "public", name), "fixture\n");
  await writeFile(path.join(fixture, "index.html"), '<link href="app/globals.css?v=1.36.25"><script src="public/data/records.js?v=1.36.25"></script><script src="static-app.js?v=1.36.25"></script>');
  for (const name of ["static-app.js", "sw.js"]) await writeFile(path.join(fixture, name), "// fixture\n");
  await git("add", ".");
  await git("commit", "-m", "Fixture baseline");
  const origin = path.join(sandbox, "origin.git");
  await git("init", "--bare", "--initial-branch=main", origin);
  await git("remote", "add", "origin", origin);
  await git("push", "origin", "main");
  const head = await git("rev-parse", "HEAD");
  await writeFile(recordPath, before.replace("Fixture content.", "Edited fixture content."));
  await git("remote", "set-url", "origin", path.join(sandbox, "unavailable.git"));
  const failed = await runStudioProcess(process.execPath, [fakePublisher, "--skip-steam-sync", "--skip-typecheck"]);
  assert.notEqual(failed.code, 0);
  const committed = await git("rev-parse", "HEAD");
  assert.notEqual(committed, head);
  assert.equal(await git("status", "--porcelain"), "");
  await git("remote", "set-url", "origin", origin);
  const retried = await runStudioProcess(process.execPath, [fakePublisher, "--skip-steam-sync", "--skip-typecheck"]);
  assert.equal(retried.code, 0, retried.stderr);
  assert.equal(await git("rev-parse", "HEAD"), committed, "Retry must not create an unnecessary second commit");
  assert.equal(await git("rev-parse", "origin/main"), committed);
  console.log("Git recovery: a failed fetch/push was retried against a temporary local bare remote without another commit.");
} finally {
  process.chdir(previousCwd);
  if (previousMode === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV = previousMode;
  const expectedRoot = path.resolve(os.tmpdir()) + path.sep;
  assert.ok(path.resolve(sandbox).startsWith(expectedRoot) && path.basename(sandbox).startsWith("gestalt-workflow-"));
  await rm(sandbox, { recursive: true, force: true });
}
