import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { copyFile, mkdir, mkdtemp, readFile, readdir, rm, unlink, writeFile } from "node:fs/promises";
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
  studio: "lib/studio.ts", "game-state": "lib/game-state.ts", "studio-operation": "lib/studio-operation.ts", "studio-process": "lib/studio-process.ts",
  "static-export": "lib/static-export.ts", "studio-media": "lib/studio-media.ts", content: "lib/content.ts",
  entry: "app/api/studio/entry/route.ts", media: "app/api/studio/media/route.ts", export: "app/api/studio/export/route.ts",
  changes: "app/api/studio/changes/route.ts", publish: "app/api/studio/publish/route.ts", steam: "app/api/studio/steam/route.ts"
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
      .replace(/from "@\/lib\/([^"/]+)"/g, (_, dependency) => `from "${pathToFileURL(path.join(modules, dependency.endsWith(".mjs") ? dependency : `${dependency}.mjs`)).href}"`)
      .replace(/from "@\/public\/steam-display\.mjs"/g, `from "${pathToFileURL(path.join(root, "public/steam-display.mjs")).href}"`)
      .replace(/from "@\/public\/image-framing\.js"/g, `from "${pathToFileURL(path.join(root, "public/image-framing.js")).href}"`)
      .replace(/from "next\/server"/g, `from "${nextServer}"`);
    await writeFile(path.join(modules, `${name}.mjs`), compiled);
  }
  await copyFile(path.join(root, "lib/publish-paths.mjs"), path.join(modules, "publish-paths.mjs"));
  const exporter = path.join(fixture, "scripts/export-static-records.mjs");
  await copyFile(path.join(root, "public/image-framing.js"), path.join(fixture, "public/image-framing.js"));
  const realExporter = await readFile(path.join(root, "scripts/export-static-records.mjs"), "utf8");
  await writeFile(exporter, "process.exit(7);\n");
  process.chdir(fixture);
  process.env.NODE_ENV = "development";
  const load = (name) => import(pathToFileURL(path.join(modules, `${name}.mjs`)).href);
  const entry = await load("entry"), refresh = await load("export"), changes = await load("changes"), publish = await load("publish"), media = await load("media"), steam = await load("steam");
  const { beginStudioOperation } = await load("studio-operation");
  const { runStudioProcess } = await load("studio-process");

  for (const route of [entry, refresh, changes, publish, media, steam]) assert.equal((await route.POST(request({}, "https://untrusted.invalid"))).status, 404);
  for (const route of [entry, refresh, changes, publish, media, steam]) {
    assert.equal((await route.POST(request({}, "http://127.0.0.1:8174"))).status, 404, "Another loopback port is not the Studio origin");
    assert.equal((await route.POST(request({}, "http://localhost:3000"))).status, 404, "A different loopback host is not the Studio origin");
  }
  const realFetch = globalThis.fetch;
  let publicReads = 0;
  const publicSteam = { schemaVersion: 1, updatedAt: "2026-10-21T10:00:00.000Z", game: { appId: 2, title: "Public game", playtimeMinutes: 120, lastPlayedAt: "2026-10-21T09:00:00.000Z", achievements: null } };
  try {
    globalThis.fetch = async (url, options) => {
      publicReads += 1;
      assert.equal(url, "https://eightmouse.github.io/Gestalt/public/data/steam-current.json");
      assert.equal(options.redirect, "error");
      assert.ok(options.signal instanceof AbortSignal);
      assert.equal(options.headers, undefined);
      return Response.json({ ...publicSteam, privateField: "must not appear" });
    };
    const preview = await steam.POST(request({ url: "https://untrusted.invalid/target", key: "ignored" }));
    assert.equal(preview.status, 200);
    assert.equal(preview.headers.get("cache-control"), "no-store");
    assert.deepEqual(await preview.json(), publicSteam);
    process.env.NODE_ENV = "production";
    assert.equal((await steam.POST(request())).status, 404);
    process.env.NODE_ENV = "development";
    assert.equal((await steam.POST(request({}, "https://untrusted.invalid"))).status, 404);
    assert.equal(publicReads, 1, "Forbidden requests cannot initiate an upstream request");
    globalThis.fetch = async () => new Response("missing", { status: 404 });
    assert.equal(await (await steam.POST(request())).json(), null, "Missing hosted data permits the local fallback");
    globalThis.fetch = async () => { throw new Error("private upstream detail"); };
    assert.equal(await (await steam.POST(request())).json(), null, "Upstream errors are not disclosed");
    console.log("Steam preview: local-only access, fixed public URL, allowlisted response and offline fallback passed.");
  } finally {
    globalThis.fetch = realFetch;
    process.env.NODE_ENV = "development";
  }
  const partial = await entry.POST(request(record));
  assert.equal(partial.status, 200);
  const partialData = await partial.json();
  assert.equal(partialData.staticExported, false);
  assert.match(partialData.writtenAt, /^\d{4}-\d{2}-\d{2}T/);
  const recordPath = path.join(fixture, "content/records/workflow-note.mdx");
  assert.match(await readFile(recordPath, "utf8"), /Fixture content/);
  assert.equal((await entry.POST(request(record))).status, 409, "A partial export must not permit a duplicate new record");
  await writeFile(exporter, realExporter);
  const before = await readFile(recordPath, "utf8");
  assert.equal((await refresh.POST(request())).status, 200);
  assert.equal(await readFile(recordPath, "utf8"), before, "Export retry must not rewrite the saved record");
  assert.match(await readFile(path.join(fixture, "public/data/records.js"), "utf8"), /workflow-note/);
  assert.equal((await readdir(path.join(fixture, "public/data"))).some((name) => name.endsWith(".tmp")), false);

  const edited = await entry.POST(request({ ...record, originalId: record.id, updated: "2027-01-01", writtenAt: "2099-01-01" }));
  assert.equal((await edited.json()).writtenAt, partialData.writtenAt, "Editing cannot replace the first-save timestamp, even with a forged payload");
  await writeFile(path.join(fixture, "content/records/legacy-note.mdx"), '---\ntitle: "Legacy note"\nsection: "logs"\nupdated: "2026-05-01"\nwrittenOrder: 7\npriority: 50\n---\nLegacy body\n');
  const legacyEdit = await entry.POST(request({ ...record, id: "legacy-note", originalId: "legacy-note", updated: "2027-01-01" }));
  const legacyData = await legacyEdit.json();
  assert.equal(legacyData.writtenAt, "2026-05-01", "Legacy records freeze their original date, not the new edit date");
  assert.equal(legacyData.writtenOrder, 7, "Saving preserves the explicit historical tie-breaker");
  assert.equal((await entry.POST(request({ ...record, originalId: "missing-original" }))).status, 409, "Missing originals must not be silently recreated");

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
  assert.ok((await readFile(path.join(fixture, "content/records/renamed-note.mdx"), "utf8")).includes(`writtenAt: "${partialData.writtenAt}"`), "Renames preserve writing order");
  assert.equal(existsSync(recordPath), false);
  await writeFile(exporter, "process.exit(7);\n");
  const deleted = await entry.DELETE(request({ id: renamed.id }, undefined, "DELETE"));
  assert.equal((await deleted.json()).staticExported, false);
  assert.equal(existsSync(path.join(fixture, "content/records/renamed-note.mdx")), false);
  await writeFile(exporter, realExporter);
  assert.equal((await refresh.POST(request())).status, 200);
  assert.equal((await entry.POST(request(record))).status, 200);
  console.log("Save/export: partial success, duplicate protection, refresh retry, rename, deletion, and lock release passed.");

  const game = { ...record, id: "workflow-game", title: "Workflow game", section: "games", status: "Completed", progress: 100, body: ":::note Original session\nKeep this note.\n:::" };
  assert.equal((await entry.POST(request(game))).status, 200);
  const gamePath = path.join(fixture, "content/records/workflow-game.mdx");
  const initialGame = await readFile(gamePath, "utf8");
  assert.match(initialGame, /gamePlacement: "past"/);
  await writeFile(gamePath, initialGame.replace(/\ngamePlacement: "past"/, ""));
  assert.equal((await entry.POST(request({ ...game, originalId: game.id, status: "Playing" }))).status, 200);
  assert.match(await readFile(gamePath, "utf8"), /gamePlacement: "past"/, "A legacy save freezes the original placement before status edits");
  const returningGame = { ...game, originalId: game.id, gamePlacement: "session", gameActivity: "inactive" };
  assert.equal((await entry.POST(request(returningGame))).status, 200);
  const returnSource = await readFile(gamePath, "utf8");
  assert.match(returnSource, /gamePlacement: "session"/);
  assert.match(returnSource, /gameActivity: "inactive"/);
  assert.match(returnSource, /status: "Completed"/);
  assert.match(returnSource, /progress: 100/);
  assert.ok(returnSource.includes(game.body), "DLC returns retain notes");
  const exportedGames = { window: {} };
  const { runInNewContext } = await import("node:vm");
  runInNewContext(await readFile(path.join(fixture, "public/data/records.js"), "utf8"), exportedGames);
  const exportedGame = exportedGames.window.__GESTALT_RECORDS.find((item) => item.id === game.id);
  assert.equal(exportedGame.gamePlacement, "session");
  assert.equal(exportedGame.gameActivity, "inactive");
  assert.equal(exportedGame.status, "Completed");
  assert.equal((await entry.POST(request({ ...game, originalId: game.id }))).status, 200);
  assert.match(await readFile(gamePath, "utf8"), /gameActivity: "inactive"/, "Older clients preserve activity when omitted");
  assert.match(await readFile(gamePath, "utf8"), /gamePlacement: "session"/, "Notes/status edits do not relocate an explicit placement");
  for (const placement of ["past", "session"]) {
    assert.equal((await entry.POST(request({ ...returningGame, gamePlacement: placement }))).status, 200);
    const movedGame = await readFile(gamePath, "utf8");
    assert.match(movedGame, new RegExp(`gamePlacement: "${placement}"`));
    assert.match(movedGame, /status: "Completed"/);
    assert.match(movedGame, /progress: 100/);
    assert.ok(movedGame.includes(game.body));
  }
  const beforeInvalidGame = await readFile(gamePath, "utf8");
  assert.equal((await entry.POST(request({ ...returningGame, gamePlacement: "elsewhere" }))).status, 400);
  assert.equal((await entry.POST(request({ ...returningGame, gameActivity: "streaming" }))).status, 400);
  assert.equal(await readFile(gamePath, "utf8"), beforeInvalidGame);
  assert.equal((await entry.POST(request({ ...returningGame, gameActivity: "" }))).status, 200);
  assert.ok(!(await readFile(gamePath, "utf8")).includes("gameActivity:"), "Activity can be explicitly reset to record status");
  assert.equal((await entry.POST(request({ ...returningGame, dashboardActive: true }))).status, 200);
  assert.ok(!(await readFile(gamePath, "utf8")).includes("dashboardActive:"), "Old clients cannot restore retired pins");
  const secondGame = { ...game, id: "second-game", title: "Second game", dashboardActive: true, gamePlacement: "session", steamAppId: "39210", banner: "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/39210/library_600x900.jpg" };
  assert.equal((await entry.POST(request(secondGame))).status, 200);
  const unpinnedGame = await readFile(gamePath, "utf8");
  assert.ok(!unpinnedGame.includes("dashboardActive:"), "Pinning another game replaces the previous pin");
  assert.ok(unpinnedGame.includes(game.body), "Replacing a pin retains the other game's notes");
  assert.match(unpinnedGame, /gamePlacement: "session"/);
  assert.match(unpinnedGame, /gameActivity: "inactive"/);
  const secondPath = path.join(fixture, "content/records/second-game.mdx");
  assert.ok(!(await readFile(secondPath, "utf8")).includes("dashboardActive:"));
  assert.equal((await entry.POST(request({ ...secondGame, originalId: secondGame.id, dashboardActive: false }))).status, 200);
  assert.ok(!(await readFile(secondPath, "utf8")).includes("dashboardActive:"), "Unpinning saves automatic mode without another pinned game");
  const pinExport = { window: {} };
  runInNewContext(await readFile(path.join(fixture, "public/data/records.js"), "utf8"), pinExport);
  assert.equal(pinExport.window.__GESTALT_RECORDS.some((item) => item.section === "games" && item.dashboardActive), false);
  const seededExport = pinExport.window.__GESTALT_RECORDS.find((item) => item.id === secondGame.id);
  assert.equal(Number(seededExport.steamAppId), 39210);
  assert.equal(seededExport.banner, secondGame.banner, "The official Steam thumbnail survives save/export unchanged");
  const framedGame = { ...secondGame, originalId: secondGame.id, bannerFit: "cover", bannerZoom: 115, bannerX: 42, bannerY: 65 };
  assert.equal((await entry.POST(request(framedGame))).status, 200);
  const framedExport = { window: {} };
  runInNewContext(await readFile(path.join(fixture, "public/data/records.js"), "utf8"), framedExport);
  const framed = framedExport.window.__GESTALT_RECORDS.find((item) => item.id === secondGame.id);
  for (const key of ["bannerFit", "bannerZoom", "bannerX", "bannerY"]) assert.equal(framed[key], framedGame[key], "Framing persists through save/export");
  assert.equal((await entry.POST(request({ ...secondGame, originalId: secondGame.id }))).status, 200);
  assert.match(await readFile(secondPath, "utf8"), /bannerZoom: 115/, "Older clients preserve saved framing when fields are omitted");
  assert.equal((await entry.POST(request({ ...secondGame, originalId: secondGame.id, bannerFit: "", bannerZoom: 100, bannerX: 50, bannerY: 50 }))).status, 200);
  assert.ok(!(await readFile(secondPath, "utf8")).includes("bannerZoom:"), "Reset removes explicit framing without changing the image");
  const headerGame = { ...framedGame, headerImage: "/images/header.png", headerZoom: 130, headerX: 35, headerY: 70 };
  assert.equal((await entry.POST(request(headerGame))).status, 200);
  const headerExport = { window: {} };
  runInNewContext(await readFile(path.join(fixture, "public/data/records.js"), "utf8"), headerExport);
  const headerRecord = headerExport.window.__GESTALT_RECORDS.find((item) => item.id === secondGame.id);
  for (const key of ["headerZoom", "headerX", "headerY", "bannerFit", "bannerZoom", "bannerX", "bannerY"]) assert.equal(headerRecord[key], headerGame[key], "Header and overview survive export independently");
  assert.equal(headerRecord.headerImage, "public/images/header.png");
  assert.equal((await entry.POST(request({ ...secondGame, originalId: secondGame.id, headerImage: headerGame.headerImage }))).status, 200);
  assert.match(await readFile(secondPath, "utf8"), /headerZoom: 130/, "Older clients preserve saved header framing");
  assert.equal((await entry.POST(request({ ...headerGame, headerZoom: 100, headerX: 50, headerY: 50 }))).status, 200);
  const resetHeader = await readFile(secondPath, "utf8");
  assert.ok(!resetHeader.includes("headerZoom:"), "Header reset removes explicit crop metadata");
  assert.match(resetHeader, /bannerZoom: 115/, "Header reset retains overview framing");
  const framedProject = { ...record, id: "framed-project", section: "projects", title: "Framed project", headerImage: "/images/project-header.png", headerZoom: 145, headerX: 60, headerY: 25, banner: "/images/project-overview.png", bannerFit: "cover", bannerZoom: 120, bannerX: 40, bannerY: 55, samples: ["/media/sample.png"], technicalStack: "TypeScript\nNext.js", milestones: "Core|80|Active" };
  assert.equal((await entry.POST(request(framedProject))).status, 200);
  assert.equal((await entry.POST(request({ ...framedProject, originalId: framedProject.id, title: "Updated project" }))).status, 200);
  const projectSource = await readFile(path.join(fixture, "content/records/framed-project.mdx"), "utf8");
  for (const fragment of ["headerZoom: 145", "bannerZoom: 120", 'samples: ["/media/sample.png"]', 'milestones: "Core|80|Active"', 'technicalStack: "TypeScript']) assert.ok(projectSource.includes(fragment), "Artwork changes retain project content");
  assert.equal((await entry.DELETE(request({ id: framedProject.id }, undefined, "DELETE"))).status, 200);
  assert.equal((await entry.POST(request({ ...secondGame, originalId: secondGame.id, steamAppId: "39210" }))).status, 200);
  const beforeDuplicate = await readFile(secondPath, "utf8");
  const duplicate = await entry.POST(request({ ...game, id: "another-title", title: "Different title", steamAppId: "39210" }));
  assert.equal(duplicate.status, 409, "Different titles cannot create duplicate Steam game records");
  assert.equal(await readFile(secondPath, "utf8"), beforeDuplicate, "Duplicate rejection leaves the existing record untouched");
  assert.equal((await entry.POST(request({ ...secondGame, originalId: secondGame.id, steamAppId: "39210" }))).status, 200, "The existing Steam game can still be edited");
  assert.equal((await entry.DELETE(request({ id: secondGame.id }, undefined, "DELETE"))).status, 200);
  assert.equal((await entry.DELETE(request({ id: game.id }, undefined, "DELETE"))).status, 200);
  console.log("Games: placement/activity, DLC round-trip, retired pins, Steam duplicate protection, static export and older-client preservation passed.");

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
  await mkdir(path.join(fixture, "lib"));
  await copyFile(path.join(root, "lib/publish-paths.mjs"), path.join(fixture, "lib/publish-paths.mjs"));
  for (const name of ["validate-content.mjs", "validate-static-shell.mjs"]) await writeFile(path.join(fixture, "scripts", name), "process.exit(0);\n");
  await mkdir(path.join(fixture, "public/media/records"), { recursive: true });
  await writeFile(path.join(fixture, "public/media/records/fixture.txt"), "fixture\n");
  await writeFile(path.join(fixture, "public/favicon.ico"), "fixture\n");
  await writeFile(path.join(fixture, "index.html"), '<link href="app/globals.css?v=1.36.25"><script src="public/data/records.js?v=1.36.25"></script><script src="static-app.js?v=1.36.25"></script>');
  for (const name of ["static-app.js", "sw.js"]) await writeFile(path.join(fixture, name), "// fixture\n");
  await git("add", ".");
  await git("commit", "-m", "Fixture baseline");
  const origin = path.join(sandbox, "origin.git");
  await git("init", "--bare", "--initial-branch=main", origin);
  await git("remote", "add", "origin", origin);
  await git("push", "origin", "main");
  const head = await git("rev-parse", "HEAD");
  await writeFile(path.join(fixture, "public/note-inline.js"), "// new, uncommitted reader helper\n");
  const blockedReview = await (await changes.POST(request())).json();
  assert.ok(blockedReview.siteCodeFiles.includes("public/note-inline.js"), "The bell identifies code pending before the publisher is started");
  const unsafeContentPublish = await runStudioProcess(process.execPath, [fakePublisher, "--skip-steam-sync", "--skip-typecheck"]);
  assert.notEqual(unsafeContentPublish.code, 0);
  assert.ok(unsafeContentPublish.stderr.includes("public site code has uncommitted changes"));
  assert.equal(await git("rev-parse", "HEAD"), head, "Content publishing must not commit HTML ahead of its required runtime");
  await unlink(path.join(fixture, "public/note-inline.js"));
  assert.deepEqual((await (await changes.POST(request())).json()).siteCodeFiles, [], "A clean code baseline unblocks normal note publishing");
  await unlink(path.join(fixture, "public/favicon.ico"));
  await writeFile(path.join(fixture, "scratch.txt"), "Unrelated local file, not archive content.\n");
  await writeFile(recordPath, before.replace("Fixture content.", "Edited fixture content."));
  await git("remote", "set-url", "origin", path.join(sandbox, "unavailable.git"));
  const failed = await runStudioProcess(process.execPath, [fakePublisher, "--skip-steam-sync", "--skip-typecheck"]);
  assert.notEqual(failed.code, 0);
  const committed = await git("rev-parse", "HEAD");
  assert.notEqual(committed, head);
  assert.equal((await git("show", "--name-status", "--format=", "HEAD")).includes("D\tpublic/favicon.ico"), true, "Tracked icon deletions must still be staged when optional favicon.svg never existed");
  assert.equal(failed.stderr.includes("pathspec"), false, "An absent optional icon must not abort staging");
  assert.equal(await git("status", "--porcelain"), "?? scratch.txt", "Publishing must not sweep unrelated workspace files into the commit");
  await unlink(path.join(fixture, "scratch.txt"));
  await git("remote", "set-url", "origin", origin);
  const retried = await runStudioProcess(process.execPath, [fakePublisher, "--skip-steam-sync", "--skip-typecheck"]);
  assert.equal(retried.code, 0, retried.stderr);
  assert.equal(await git("rev-parse", "HEAD"), committed, "Retry must not create an unnecessary second commit");
  assert.equal(await git("rev-parse", "origin/main"), committed);
  console.log("Git recovery: absent optional icons, tracked icon deletions, and retry against a temporary bare remote without another commit passed.");
} finally {
  process.chdir(previousCwd);
  if (previousMode === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV = previousMode;
  const expectedRoot = path.resolve(os.tmpdir()) + path.sep;
  assert.ok(path.resolve(sandbox).startsWith(expectedRoot) && path.basename(sandbox).startsWith("gestalt-workflow-"));
  await rm(sandbox, { recursive: true, force: true });
}
