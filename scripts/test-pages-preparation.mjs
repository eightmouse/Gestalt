import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { link, mkdir, mkdtemp, readFile, readdir, rm, rmdir, unlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { preparePages } from "./prepare-pages.mjs";

const temporary = await mkdtemp(path.join(os.tmpdir(), "gestalt-pages-test-"));
const root = path.join(temporary, "project");
const now = new Date("2026-10-21T10:00:00.000Z");
const previous = {
  schemaVersion: 1, updatedAt: now.toISOString(),
  game: { appId: 2, title: "Game", playtimeMinutes: 120, lastPlayedAt: "2026-10-21T09:00:00.000Z", achievements: { unlocked: 1, total: 2, percent: 50 } }
};
const files = ["index.html", "static-app.js", "sw.js", "app/globals.css", "public/favicon.ico", "public/note-inline.js", "public/steam-display.mjs", "public/data/records.js", "public/images/banner.png", "public/media/records/note/image.webp"];
let sequence = 0;
const output = () => path.join(temporary, `site-${sequence++}`);
const config = (extra = {}) => ({ root, destination: output(), baseUrl: "https://fixture.github.io/Gestalt", now, ...extra });
const secretKey = "fixture-secret-not-a-real-key";
const secretId = "00000000000000000";
function mockFetch({ deployed = previous, publicFailure = false, steamFailure = false, minutes = 120 } = {}) {
  const calls = [];
  const fetchImpl = async (input, options) => {
    const url = new URL(input);
    calls.push(url);
    assert.equal(options.redirect, "error");
    if (url.origin === "https://fixture.github.io") {
      assert.equal(url.pathname, "/Gestalt/public/data/steam-current.json", "Project subpath is preserved");
      assert.equal(url.searchParams.has("key"), false);
      assert.equal(options.headers, undefined, "No credentials are attached to public snapshot requests");
      if (publicFailure) throw new Error("Offline");
      return deployed ? Response.json({ ...deployed, privateField: secretId }) : new Response("missing", { status: 404 });
    }
    assert.equal(url.origin, "https://api.steampowered.com");
    if (steamFailure) throw new Error(`Private upstream detail ${secretKey}`);
    if (url.pathname.includes("GetOwnedGames")) return Response.json({ response: { games: [{ appid: 2, name: "Game", playtime_forever: minutes, rtime_last_played: Date.parse(previous.game.lastPlayedAt) / 1000 }] } });
    return Response.json({ playerstats: { success: true, achievements: [{ achieved: 1 }, { achieved: 0 }] } });
  };
  return { calls, fetchImpl };
}

try {
  for (const relative of [...files, ".env.local", "content/records/private.mdx", "app/api/studio/entry/route.ts", "public/data/private.json", "public/note-inline.d.ts"]) {
    const target = path.join(root, relative);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, relative.startsWith("public/data/private") || relative.startsWith(".env") ? secretKey : `fixture:${relative}`);
  }
  await mkdir(path.join(root, "public/audio"));
  const sourceBefore = await readFile(path.join(root, "public/data/records.js"), "utf8");
  const content = config({ fetchImpl: mockFetch().fetchImpl });
  assert.deepEqual(await preparePages(content), { deploy: true, changed: false, refreshFailed: false });
  for (const relative of files) assert.equal(await readFile(path.join(content.destination, relative), "utf8"), `fixture:${relative}`);
  const artifactSnapshot = await readFile(path.join(content.destination, "public/data/steam-current.json"), "utf8");
  assert.deepEqual(JSON.parse(artifactSnapshot), previous, "The last deployed snapshot survives normal content pushes");
  assert.ok(!artifactSnapshot.includes(secretKey) && !artifactSnapshot.includes(secretId), "Private snapshot fields are discarded");
  for (const relative of [".env.local", "content", "app/api", "public/data/private.json", "public/note-inline.d.ts"]) assert.ok(!existsSync(path.join(content.destination, relative)), `Excluded from deployment: ${relative}`);
  assert.deepEqual((await readdir(content.destination)).sort(), [".nojekyll", "app", "index.html", "public", "static-app.js", "sw.js"]);
  await assert.rejects(preparePages(content), "An existing output is never recursively replaced");
  await assert.rejects(preparePages(config({ destination: root, fetchImpl: mockFetch().fetchImpl })));
  await assert.rejects(preparePages(config({ destination: temporary, fetchImpl: mockFetch().fetchImpl })));

  const initial = config({ fetchImpl: mockFetch({ deployed: null }).fetchImpl });
  assert.equal((await preparePages(initial)).deploy, true);
  assert.equal(existsSync(path.join(initial.destination, "public/data/steam-current.json")), false, "First deployment works without Steam configuration");
  const credentials = { refreshSteam: true, apiKey: secretKey, steamId: secretId };
  const unchanged = config({ ...credentials, scheduled: true, fetchImpl: mockFetch().fetchImpl });
  assert.equal((await preparePages(unchanged)).deploy, false);
  assert.equal(existsSync(unchanged.destination), false, "An unchanged hourly check does not stage or deploy the entire archive");
  const changed = config({ ...credentials, scheduled: true, fetchImpl: mockFetch({ minutes: 180 }).fetchImpl });
  assert.equal((await preparePages(changed)).changed, true);
  assert.equal(JSON.parse(await readFile(path.join(changed.destination, "public/data/steam-current.json"), "utf8")).game.playtimeMinutes, 180);
  const failed = config({ ...credentials, scheduled: true, fetchImpl: mockFetch({ steamFailure: true }).fetchImpl });
  await assert.rejects(preparePages(failed), (error) => !error.message.includes(secretKey));
  assert.equal(existsSync(failed.destination), false, "A failed scheduled request cannot replace a good site");
  const fallback = config({ ...credentials, fetchImpl: mockFetch({ steamFailure: true }).fetchImpl });
  const fallbackResult = await preparePages(fallback);
  assert.equal(fallbackResult.refreshFailed, true);
  assert.ok(fallbackResult.refreshFailure.includes("Steam request failed"));
  assert.ok(!fallbackResult.refreshFailure.includes(secretKey) && !fallbackResult.refreshFailure.includes(secretId));
  assert.deepEqual(JSON.parse(await readFile(path.join(fallback.destination, "public/data/steam-current.json"), "utf8")), previous);
  for (const extra of [{ fetchImpl: mockFetch({ deployed: null, steamFailure: true }).fetchImpl }, { apiKey: "", fetchImpl: mockFetch({ deployed: null }).fetchImpl }]) {
    const firstFailure = config({ ...credentials, ...extra });
    await assert.rejects(preparePages(firstFailure), (error) => error.message.includes("no deployment was requested") && !error.message.includes(secretKey) && !error.message.includes(secretId));
    assert.equal(existsSync(firstFailure.destination), false, "The first failed Steam sync must not masquerade as a green deployment");
  }
  for (const fetchImpl of [mockFetch({ publicFailure: true }).fetchImpl, async () => Response.json({ schemaVersion: 999 }), async () => new Response("<html>fallback</html>")]) {
    const unsafe = config({ fetchImpl });
    await assert.rejects(preparePages(unsafe));
    assert.equal(existsSync(unsafe.destination), false, "Unavailable/unverified public state fails closed");
  }
  const disabledApi = mockFetch();
  assert.equal((await preparePages(config({ fetchImpl: disabledApi.fetchImpl }))).deploy, true);
  assert.equal(disabledApi.calls.length, 1, "Disabled refresh never calls Steam or needs secrets");
  await assert.rejects(preparePages(config({ baseUrl: "http://fixture.github.io", fetchImpl: mockFetch().fetchImpl })));
  await assert.rejects(preparePages(config({ baseUrl: "https://user:password@fixture.github.io", fetchImpl: mockFetch().fetchImpl })));
  await writeFile(path.join(root, "public/images/.env"), secretKey);
  await assert.rejects(preparePages(config({ fetchImpl: mockFetch().fetchImpl })), "Hidden media files must block packaging, not leak into the artifact");
  assert.equal(await readFile(path.join(root, "public/data/records.js"), "utf8"), sourceBefore);
  assert.equal(existsSync(path.join(root, "public/data/steam-current.json")), false, "Snapshot updates never write to the source checkout");
  await unlink(path.join(root, "public/images/.env"));
  await rmdir(path.join(root, "public/audio"));
  assert.equal((await preparePages(config({ fetchImpl: mockFetch().fetchImpl }))).deploy, true, "Missing untracked empty asset directories are allowed");
  await link(path.join(root, ".env.local"), path.join(root, "public/images/linked.png"));
  await assert.rejects(preparePages(config({ fetchImpl: mockFetch().fetchImpl })), "Hard links cannot smuggle private files into a media directory");
  await unlink(path.join(root, "public/images/linked.png"));

  const workflow = await readFile(new URL("../.github/workflows/pages.yml", import.meta.url), "utf8");
  assert.ok(workflow.includes("vars.GESTALT_PAGES_ENABLED == 'true'"));
  assert.ok(workflow.includes("github.event_name != 'schedule' || vars.STEAM_REFRESH_ENABLED == 'true'"));
  assert.ok(workflow.includes("persist-credentials: false") && workflow.includes("cancel-in-progress: false"));
  assert.ok(!/contents: write|pull_request|npm install|pnpm install|git push|git commit/.test(workflow));
  assert.equal((workflow.match(/uses: actions\/[\w-]+@[0-9a-f]{40}/g) || []).length, 4, "All official actions are pinned to exact verified revisions");
  const reviewedActions = {
    checkout: "3d3c42e5aac5ba805825da76410c181273ba90b1",
    "configure-pages": "45bfe0192ca1faeb007ade9deae92b16b8254a0d",
    "upload-pages-artifact": "fc324d3547104276b827a68afc52ff2a11cc49c9",
    "deploy-pages": "368f82528645a54fb793d4d04e342629a3f51346"
  };
  for (const [name, revision] of Object.entries(reviewedActions)) {
    assert.ok(workflow.includes(`uses: actions/${name}@${revision}`), "Keep the reviewed Node 24-compatible action revisions, including the composite uploader");
  }
  assert.ok(!/ACTIONS_ALLOW_USE_UNSECURE_NODE_VERSION|FORCE_JAVASCRIPT_ACTIONS_TO_NODE24/.test(workflow), "Do not hide deprecated action metadata with runtime overrides");
  assert.ok(workflow.includes("path: .pages-site"));
  assert.ok(workflow.includes("needs: prepare") && workflow.includes("needs.prepare.outputs.deploy == 'true'"));
  console.log("Pages preparation passed: public-only artifact, unchanged skip, safe fallback, failure preservation, no source writes, gated deployment and pinned actions.");
} finally {
  assert.equal(path.dirname(path.resolve(temporary)), path.resolve(os.tmpdir()));
  assert.ok(path.basename(temporary).startsWith("gestalt-pages-test-"));
  await rm(temporary, { recursive: true, force: true });
}
