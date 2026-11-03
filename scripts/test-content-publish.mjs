import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sandbox = mkdtempSync(path.join(realpathSync(os.tmpdir()), "gestalt-publish-test-"));
const fixture = path.join(sandbox, "owner");
const origin = path.join(sandbox, "origin.git");
mkdirSync(fixture);
function run(cwd, command, args) {
  const result = spawnSync(command, args, { cwd, encoding: "utf8", windowsHide: true, maxBuffer: 16 * 1024 * 1024 });
  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
  return result.stdout.trim();
}
const git = (...args) => run(fixture, "git", args);
const write = (file, text) => { mkdirSync(path.dirname(path.join(fixture, file)), { recursive: true }); writeFileSync(path.join(fixture, file), text); };
const read = (file) => readFileSync(path.join(fixture, file), "utf8");
const exportLocal = () => run(fixture, process.execPath, ["scripts/export-static-records.mjs"]);
const publish = (...args) => spawnSync(process.execPath, [path.join(root, "scripts/publish-content.mjs"), ...args], { cwd: fixture, encoding: "utf8", windowsHide: true, maxBuffer: 16 * 1024 * 1024 });
const checked = (...args) => { const result = publish(...args); assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`); return result.stdout; };
const rejected = (pattern, ...args) => { const result = publish(...args); assert.notEqual(result.status, 0); assert.match(result.stderr, pattern); assert.equal(existsSync(path.join(fixture, ".git/gestalt-content-publish.lock")), false); return result; };
const source = '---\ntitle: "Publish fixture"\nsection: "logs"\ntype: "Field Note"\nstatus: "Filed"\nupdated: "2026-11-02"\nsummary: "Fixture"\nprogress: 0\npriority: 1\n---\n\nOriginal content.\n';
try {
  git("init", "--initial-branch=main");
  git("config", "user.name", "Publish fixture");
  git("config", "user.email", "fixture@example.invalid");
  git("config", "core.autocrlf", "false");
  for (const file of ["scripts/publish-site.mjs", "scripts/static-cache.mjs", "scripts/export-static-records.mjs", "scripts/validate-content.mjs", "scripts/validate-notebook.mjs", "lib/publish-paths.mjs", "public/image-framing.js", "public/roadmap.mjs", "public/data/roadmap.json"]) {
    mkdirSync(path.dirname(path.join(fixture, file)), { recursive: true });
    copyFileSync(path.join(root, file), path.join(fixture, file));
  }
  write("scripts/validate-static-shell.mjs", 'import { appendFileSync } from "node:fs";\nif (process.env.GESTALT_FIXTURE_EDIT) appendFileSync(process.env.GESTALT_FIXTURE_EDIT, "\\nConcurrent saved edit.\\n");\nconsole.log("Reviewed fixture shell validation");\n');
  write("static-app.js", "// reviewed runtime\n");
  write("sw.js", "// reviewed worker\n");
  write("app/globals.css", "/* reviewed CSS */\n");
  write("index.html", '<script src="public/data/records.js?v=baseline"></script><script src="static-app.js?v=baseline"></script>\n');
  write(".gitignore", "node_modules/\n.env.local\nignored.jpg\n");
  write("content/records/fixture.mdx", source);
  write("content/records/removed.mdx", source.replace("Publish fixture", "Removed fixture"));
  write("public/media/records/removed.jpg", "old media");
  exportLocal();
  git("add", "."); git("commit", "-m", "Reviewed fixture baseline");
  git("init", "--bare", "--initial-branch=main", origin);
  git("remote", "add", "origin", origin); git("push", "origin", "main");
  const baseline = git("rev-parse", "HEAD");
  const baselineExporter = read("scripts/export-static-records.mjs");
  write("content/records/fixture.mdx", source.replace("Original content.", "Saved owner edit."));
  rmSync(path.join(fixture, "content/records/removed.mdx"));
  rmSync(path.join(fixture, "public/media/records/removed.jpg"));
  write("content/records/new note.mdx", source.replace("Publish fixture", "New fixture"));
  write("public/media/records/new photo.jpg", "new media");
  exportLocal();
  const currentData = read("public/data/records.js");
  write("app/globals.css", "/* unfinished, deliberately staged */\n");
  git("add", "app/globals.css");
  const stagedCss = git("rev-parse", ":app/globals.css");
  write("index.html", read("index.html") + "<!-- unfinished shell code -->\n");
  const ownerIndex = read("index.html");
  write("scripts/export-static-records.mjs", 'throw new Error("Unreviewed exporter MUST NOT run");\n');
  write(".env.local", "PRIVATE_FIXTURE=not-for-the-artifact\n");
  write("node_modules/sentinel.txt", "Installed packages must survive snapshot cleanup.\n");
  write("scratch.txt", "Unrelated scratch file\n");
  checked("--dry-run");
  assert.match(read("node_modules/sentinel.txt"), /must survive/);
  assert.equal(git("rev-parse", "HEAD"), baseline);
  assert.equal(read("index.html"), ownerIndex);
  assert.equal(read("public/data/records.js"), currentData);
  const output = checked("--message", "Publish fixture content only");
  assert.match(output, /Published main to GitHub/);
  const published = git("rev-parse", "HEAD");
  assert.notEqual(published, baseline);
  assert.equal(git("rev-parse", "origin/main"), published);
  assert.equal(git("--git-dir", origin, "rev-parse", "main"), published);
  assert.equal(git("show", "HEAD:app/globals.css"), "/* reviewed CSS */");
  assert.equal(git("rev-parse", ":app/globals.css"), stagedCss, "Unrelated staged work remains staged and byte-identical");
  assert.equal(git("show", "HEAD:scripts/export-static-records.mjs"), baselineExporter.trim());
  assert.ok(!git("show", "HEAD:index.html").includes("unfinished shell code"));
  assert.equal(read("index.html"), ownerIndex, "An edited local shell is never overwritten by baseline cache updates");
  assert.equal(read("app/globals.css"), "/* unfinished, deliberately staged */\n");
  assert.match(read("scripts/export-static-records.mjs"), /MUST NOT run/);
  const files = git("diff-tree", "--no-commit-id", "--name-only", "-r", "HEAD").split("\n");
  assert.ok(files.includes("content/records/removed.mdx") && files.includes("public/media/records/removed.jpg"));
  assert.ok(files.every((file) => file.startsWith("content/records/") || file.startsWith("public/media/records/") || ["index.html", "public/data/records.js"].includes(file)));
  assert.ok(!git("ls-tree", "-r", "--name-only", "HEAD").includes(".env.local"));
  assert.ok(!git("diff", "--name-only", "HEAD", "--", "content/records", "public/media/records", "public/data/records.js"));
  checked();
  assert.equal(git("rev-parse", "HEAD"), published, "Retry/no-op creates no extra commit");
  write(".gitignore", "node_modules/\n.env.local\n");
  write("public/media/records/ignored.jpg", "Saved image permitted only by local ignore rules");
  rejected(/missing from the prepared index.*ignore rules/);
  assert.equal(git("rev-parse", "HEAD"), published);
  rmSync(path.join(fixture, "public/media/records/ignored.jpg"));
  const abandoned = mkdtempSync(path.join(realpathSync(os.tmpdir()), "gestalt-content-"));
  const dead = spawnSync(process.execPath, ["-e", ""], { windowsHide: true });
  writeFileSync(path.join(abandoned, "sentinel"), "Abandoned snapshot");
  write(".git/gestalt-content-publish.lock", JSON.stringify({ pid: dead.pid, token: "expired", temporary: abandoned }));
  checked("--dry-run");
  assert.equal(existsSync(abandoned), false, "A confirmed dead publisher's snapshot is cleaned on retry");

  write("content/records/fixture.mdx", source + "\n![Missing](/media/records/missing.jpg)\n");
  rejected(/validation|missing/i);
  assert.equal(git("rev-parse", "HEAD"), published);
  write("content/records/fixture.mdx", source.replace("Original content.", "Saved owner edit."));
  write("public/data/records.js", currentData.replace('"title": "Publish fixture"', '"title": "A newer incompatible export"'));
  rejected(/exporter and local archive disagree/);
  write("public/data/records.js", currentData);

  write("content/records/fixture.mdx", source.replace("Original content.", "Pending concurrency fixture."));
  write("scripts/export-static-records.mjs", baselineExporter); exportLocal();
  process.env.GESTALT_FIXTURE_EDIT = path.join(fixture, "content/records/fixture.mdx");
  try { rejected(/Saved content changed during publishing/); }
  finally { delete process.env.GESTALT_FIXTURE_EDIT; }
  assert.match(read("content/records/fixture.mdx"), /Concurrent saved edit/);
  assert.equal(git("rev-parse", "HEAD"), published);

  write(".git/gestalt-content-publish.lock", JSON.stringify({ pid: process.pid, token: "another-publisher" }));
  const locked = publish(); assert.notEqual(locked.status, 0); assert.match(locked.stderr, /Another content publish/);
  assert.ok(existsSync(path.join(fixture, ".git/gestalt-content-publish.lock")), "A rejected publisher never removes someone else's lock");
  rmSync(path.join(fixture, ".git/gestalt-content-publish.lock"));

  // Reject push after validation, then retry without losing or duplicating content.
  write("content/records/fixture.mdx", source.replace("Original content.", "Second edit, retained through a failed push."));
  write("scripts/export-static-records.mjs", baselineExporter); exportLocal();
  const hook = path.join(origin, "hooks/pre-receive");
  writeFileSync(hook, "#!/bin/sh\nexit 1\n", { mode: 0o755 });
  rejected(/rejected|declined/);
  assert.equal(git("rev-parse", "HEAD"), published);
  assert.match(read("content/records/fixture.mdx"), /Second edit/);
  rmSync(hook);
  checked();
  const retried = git("rev-parse", "HEAD");
  assert.notEqual(retried, published);
  assert.equal(git("rev-list", "--count", `${published}..HEAD`), "1");

  // A successful push followed by a source index lock must resume without another commit.
  write("content/records/fixture.mdx", source.replace("Original content.", "Published before an interrupted local finalization."));
  exportLocal();
  const sourceIndexLock = path.join(fixture, ".git/index.lock");
  const postReceive = path.join(origin, "hooks/post-receive");
  writeFileSync(postReceive, `#!/bin/sh\ntouch '${sourceIndexLock.replaceAll("\\", "/")}'\n`, { mode: 0o755 });
  rejected(/index\.lock|EEXIST/);
  const received = git("--git-dir", origin, "rev-parse", "main");
  assert.notEqual(received, retried, "Remote received the validated content before finalization was interrupted");
  assert.equal(git("rev-parse", "HEAD"), retried, "Source HEAD is not advanced before its index can be reconciled");
  assert.ok(existsSync(path.join(fixture, ".git/gestalt-content-publish-state.json")));
  rmSync(postReceive); rmSync(sourceIndexLock);
  assert.match(checked(), /Recovered the published batch/);
  assert.equal(git("rev-parse", "HEAD"), received);
  assert.equal(git("--git-dir", origin, "rev-parse", "main"), received);
  assert.ok(!git("diff", "--cached", "--name-only", "--", "content/records", "public/data/records.js"), "Recovery must not leave staged reversals of published notes");
  assert.equal(git("rev-parse", ":app/globals.css"), stagedCss);
  assert.equal(existsSync(path.join(fixture, ".git/gestalt-content-publish-state.json")), false);

  // The second half of finalization is resumable too: index installed, ref still old.
  write("content/records/fixture.mdx", source.replace("Original content.", "Recover after installing the future index."));
  exportLocal();
  const refLock = path.join(fixture, ".git/refs/heads/main.lock");
  writeFileSync(postReceive, `#!/bin/sh\ntouch '${refLock.replaceAll("\\", "/")}'\n`, { mode: 0o755 });
  rejected(/main\.lock|cannot lock ref/);
  const refInterrupted = git("--git-dir", origin, "rev-parse", "main");
  assert.notEqual(refInterrupted, received);
  assert.equal(git("rev-parse", "HEAD"), received);
  rmSync(postReceive); rmSync(refLock);
  assert.match(checked(), /Recovered the published batch/);
  assert.equal(git("rev-parse", "HEAD"), refInterrupted);
  assert.ok(!git("diff", "--cached", "--name-only", "--", "content/records", "public/data/records.js"));
  assert.equal(git("rev-parse", ":app/globals.css"), stagedCss);

  write("content/records/fixture.mdx", source.replace("Original content.", "Recover a failed generated-file replacement."));
  exportLocal();
  const beforeReplacement = read("public/data/records.js");
  const injectWriteFailure = path.join(sandbox, "generated-write-failure.mjs");
  writeFileSync(injectWriteFailure, 'import fs from "node:fs"; import { syncBuiltinESMExports } from "node:module";\nconst write = fs.writeFileSync, rename = fs.renameSync;\nfs.writeFileSync = (file, bytes, ...args) => { if (file === process.env.GESTALT_FIXTURE_GENERATED) { write(file, "partial"); throw new Error("Injected unsafe direct write"); } return write(file, bytes, ...args); };\nfs.renameSync = (from, to) => { if (to === process.env.GESTALT_FIXTURE_GENERATED) throw new Error("Injected generated rename failure"); return rename(from, to); };\nsyncBuiltinESMExports();\n');
  const previousNodeOptions = process.env.NODE_OPTIONS;
  process.env.NODE_OPTIONS = `${previousNodeOptions || ""} --import=${pathToFileURL(injectWriteFailure).href}`.trim();
  process.env.GESTALT_FIXTURE_GENERATED = path.join(fixture, "public/data/records.js");
  try { rejected(/Injected generated rename failure/); }
  finally {
    if (previousNodeOptions === undefined) delete process.env.NODE_OPTIONS; else process.env.NODE_OPTIONS = previousNodeOptions;
    delete process.env.GESTALT_FIXTURE_GENERATED;
  }
  assert.equal(read("public/data/records.js"), beforeReplacement, "Failed replacement cannot truncate the valid local archive");
  assert.ok(existsSync(path.join(fixture, ".git/gestalt-content-publish-state.json")));
  const beforeWriteRecovery = git("rev-parse", "HEAD");
  assert.match(checked(), /Recovered the published batch/);
  assert.equal(git("rev-parse", "HEAD"), beforeWriteRecovery, "Generated-file recovery does not create another commit");
  assert.equal(read("public/data/records.js"), beforeReplacement);
  assert.equal(existsSync(path.join(fixture, ".git/gestalt-content-publish-state.json")), false);

  const notebookBefore = JSON.parse(read("public/data/roadmap.json"));
  const notebookEdit = structuredClone(notebookBefore);
  notebookEdit.groups[0].items[0] = { title: "Notebook-only publish fixture", detail: "Fixture work", completed: true };
  write("public/data/roadmap.json", JSON.stringify(notebookEdit, null, 2) + "\n");
  const beforeNotebook = git("rev-parse", "HEAD");
  checked("--message", "Publish notebook fixture");
  assert.notEqual(git("rev-parse", "HEAD"), beforeNotebook);
  assert.deepEqual(JSON.parse(git("show", "HEAD:public/data/roadmap.json")), notebookEdit);
  assert.equal(git("rev-parse", ":app/globals.css"), stagedCss, "Notebook publication preserves separately staged code");
  assert.ok(!git("diff", "--cached", "--name-only", "--", "public/data/roadmap.json"), "Notebook is not left pending after publication");
  write("public/data/roadmap.json", '{"groups":[]}');
  rejected(/Notebook validation failed/);
  write("public/data/roadmap.json", JSON.stringify(notebookEdit, null, 2) + "\n");
  rmSync(path.join(fixture, "public/data/roadmap.json"));
  rejected(/Notebook validation failed/);
  write("public/data/roadmap.json", JSON.stringify(notebookEdit, null, 2) + "\n");

  git("commit", "-m", "Unpublished reviewed code fixture");
  rejected(/same reviewed commit/);
  console.log("Isolated publishing passed: committed exporter, staged code isolation, complete media inclusion, validation/schema/concurrent-edit blocks, safe cleanup, locks, failed-push and interrupted-finalization recovery, and branch guards.");
} finally {
  assert.equal(path.dirname(sandbox), realpathSync(os.tmpdir()));
  assert.ok(path.basename(sandbox).startsWith("gestalt-publish-test-"));
  rmSync(sandbox, { recursive: true, force: true });
}
