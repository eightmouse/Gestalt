import { createHash, randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import { copyFileSync, existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, renameSync, rmdirSync, rmSync, symlinkSync, unlinkSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";

const root = realpathSync(process.cwd());
const payload = ["content/records", "public/media/records", "public/data/roadmap.json"];
const generated = ["public/data/records.js", "index.html"];
const dryRun = process.argv.includes("--dry-run");
const messageIndex = process.argv.findIndex((arg) => arg === "--message" || arg === "-m");
const message = messageIndex >= 0 ? process.argv[messageIndex + 1] : "Update archive content";
const token = randomUUID();
let temporary, lock, statePath, initialStagedContent;

function execute(cwd, command, args, print = false, options = {}) {
  const result = spawnSync(command, args, { cwd, encoding: "utf8", windowsHide: true, maxBuffer: 32 * 1024 * 1024, ...options });
  if (print) {
    if (result.stdout) process.stdout.write(result.stdout);
    if (result.stderr) process.stderr.write(result.stderr);
  }
  if (result.error || result.status !== 0) throw new Error(result.stderr?.trim() || result.error?.message || `${command} failed with exit code ${result.status}.`);
  return result.stdout.trim();
}
const git = (...args) => execute(root, "git", args);
const split = (value) => value.split("\0").filter(Boolean);
const fingerprint = (value) => createHash("sha256").update(value).digest("hex");
const isPayload = (file) => file === "public/data/roadmap.json" || payload.slice(0, 2).some((scope) => file.startsWith(`${scope}/`));

function exportedRecords(source) {
  const match = source.match(/^window\.__GESTALT_RECORDS\s*=\s*([\s\S]*);\s*$/);
  if (!match) throw new Error("Refresh the local archive before publishing.");
  return JSON.stringify(JSON.parse(match[1]));
}

function safeFile(file) {
  const parts = file.split("/");
  if (parts.some((part) => !part || part === "." || part === ".." || part.includes("\\")) || path.isAbsolute(file)) throw new Error("Invalid content path.");
  let current = root;
  for (const part of parts) {
    current = path.join(current, part);
    if (!existsSync(current)) return null;
    if (lstatSync(current).isSymbolicLink()) throw new Error(`Content links cannot be published: ${file}`);
  }
  if (!lstatSync(current).isFile()) throw new Error(`Expected a regular content file: ${file}`);
  return current;
}

function sourceFiles() {
  return [...new Set(split(git("ls-files", "--cached", "--others", "--exclude-standard", "-z", "--", ...payload)))].sort();
}

function snapshot() {
  return new Map(sourceFiles().map((file) => {
    if (!isPayload(file)) throw new Error("Content scope escaped its allowlist.");
    const absolute = safeFile(file);
    return [file, absolute ? fingerprint(readFileSync(absolute)) : null];
  }));
}

function assertUnchanged(original, base, branch) {
  if (git("rev-parse", "HEAD") !== base || git("symbolic-ref", "--short", "HEAD") !== branch) throw new Error("The checkout changed during publishing. Nothing else was staged; retry from the current branch.");
  if (JSON.stringify([...snapshot()]) !== JSON.stringify([...original])) throw new Error("Saved content changed during publishing. Your edits are safe; review and retry the new batch.");
  if (git("diff", "--cached", "--raw", "-z", "--", ...payload, ...generated) !== initialStagedContent) throw new Error("Content staging changed during publishing. Review and retry; your index has not been reset.");
}

function acquireLock() {
  lock = path.resolve(root, git("rev-parse", "--git-path", "gestalt-content-publish.lock"));
  statePath = path.resolve(root, git("rev-parse", "--git-path", "gestalt-content-publish-state.json"));
  if (existsSync(lock)) {
    let owner;
    try { owner = JSON.parse(readFileSync(lock, "utf8")); } catch { throw new Error("Publish lock is unreadable; inspect it before retrying."); }
    if (!Number.isInteger(owner.pid) || owner.pid <= 0) throw new Error("Publish lock has no valid owner; inspect it before retrying.");
    try { process.kill(owner.pid, 0); throw new Error("Another content publish is running. Try again when it finishes."); }
    catch (error) { if (error.code !== "ESRCH") throw error; }
    if (owner.temporary) cleanTemporary(owner.temporary);
    unlinkSync(lock);
  }
  temporary = mkdtempSync(path.join(realpathSync(os.tmpdir()), "gestalt-content-"));
  writeFileSync(lock, JSON.stringify({ pid: process.pid, token, temporary }), { flag: "wx" });
}

function replaceFile(target, bytes) {
  const pending = `${target}.${token}.tmp`;
  try {
    writeFileSync(pending, bytes, { flag: "wx" });
    renameSync(pending, target);
  } finally { if (existsSync(pending)) unlinkSync(pending); }
}
const saveState = (state) => replaceFile(statePath, JSON.stringify(state));

function indexFingerprint(indexFile) {
  return fingerprint(execute(root, "git", ["ls-files", "--stage", "-z"], false, indexFile ? { env: { ...process.env, GIT_INDEX_FILE: indexFile } } : {}));
}

function finalizePublication(state) {
  const { base, branch, commit } = state;
  if (![base, commit].includes(git("rev-parse", "HEAD")) || git("symbolic-ref", "--short", "HEAD") !== branch) throw new Error("Published content needs local recovery on its original branch. No checkout was reset.");
  const currentIndex = indexFingerprint();
  if (![state.beforeIndex, state.afterIndex].includes(currentIndex)) throw new Error("GitHub has the content, but local staging changed. Review the index before completing publish recovery.");
  const index = path.resolve(root, git("rev-parse", "--git-path", "index"));
  const prepared = path.join(temporary, "source-index");
  const indexLock = `${index}.lock`;
  copyFileSync(index, prepared);
  execute(root, "git", ["reset", "--quiet", commit, "--", ...payload, "public/data/records.js", ...(state.indexWasStaged ? [] : ["index.html"])], false, { env: { ...process.env, GIT_INDEX_FILE: prepared } });
  state.afterIndex = indexFingerprint(prepared);
  saveState(state);
  let ownsIndexLock = false;
  try {
    writeFileSync(indexLock, readFileSync(prepared), { flag: "wx" });
    ownsIndexLock = true;
    if (indexFingerprint() !== currentIndex) throw new Error("Staging changed during publish recovery; no index was replaced.");
    // Install the prepared index first: interruption cannot stage reversals of published notes.
    renameSync(indexLock, index);
    ownsIndexLock = false;
    if (git("rev-parse", "HEAD") !== commit) git("update-ref", `refs/heads/${branch}`, commit, base);
  } finally { if (ownsIndexLock) unlinkSync(indexLock); }
  for (const file of generated) {
    const target = path.join(root, file);
    const current = existsSync(target) ? fingerprint(readFileSync(target)) : null;
    if (current !== state.generated[file] || (file === "index.html" && (state.indexWasStaged || state.indexWasModified))) continue;
    const blob = spawnSync("git", ["show", `${commit}:${file}`], { cwd: root, windowsHide: true, maxBuffer: 32 * 1024 * 1024 });
    if (blob.status !== 0) throw new Error("Published generated files need local recovery; retry publishing.");
    replaceFile(target, blob.stdout);
  }
  unlinkSync(statePath);
}

function recoverPublication(branch, base, remoteBase) {
  if (!existsSync(statePath)) return false;
  if (dryRun) throw new Error("A previous publish needs local recovery. Retry Publish Changes first; dry-run will not alter Git state.");
  const state = JSON.parse(readFileSync(statePath, "utf8"));
  if (state.branch !== branch || !/^[a-f0-9]{40,64}$/.test(state.commit) || !/^[a-f0-9]{40,64}$/.test(state.base) || git("rev-parse", `${state.commit}^`) !== state.base) throw new Error("Publish recovery metadata needs review.");
  const changed = split(git("diff-tree", "--no-commit-id", "--name-only", "-r", "-z", state.commit));
  if (changed.some((file) => !isPayload(file) && !generated.includes(file))) throw new Error("Publish recovery commit contains unexpected files.");
  if (remoteBase === state.base && base === state.base) {
    unlinkSync(statePath); // The previous push never reached origin; prepare a fresh batch.
    return false;
  }
  if (remoteBase !== state.commit) throw new Error("Origin moved after an interrupted publish. Review and sync before retrying; local content is intact.");
  finalizePublication(state);
  console.log(`commit ${state.commit}`);
  console.log(`${changed.length} files changed`);
  console.log("Recovered exported static archive.");
  console.log("Recovered the published batch. Any newer local saves remain pending.");
  console.log(`Published ${branch} to GitHub.`);
  return true;
}

function cleanTemporary(directory = temporary) {
  if (!directory || !existsSync(directory)) return;
  const parent = realpathSync(os.tmpdir());
  if (path.dirname(directory) !== parent || !path.basename(directory).startsWith("gestalt-content-") || lstatSync(directory).isSymbolicLink()) throw new Error("Refusing unexpected temporary cleanup path.");
  // Remove the dependency junction itself, never traverse the owner's packages.
  const modules = path.join(directory, "site", "node_modules");
  if (existsSync(modules)) {
    if (!lstatSync(modules).isSymbolicLink()) throw new Error("Refusing to remove an unexpected dependency directory.");
    if (process.platform === "win32") rmdirSync(modules); else unlinkSync(modules);
  }
  rmSync(directory, { recursive: true, force: true });
}

function publishContent(branch, base, remoteBase) {
  if (base !== remoteBase) throw new Error("Content publishing needs the checkout and origin branch at the same reviewed commit. Sync or publish the reviewed code separately first; saved notes are unchanged.");
  if (git("ls-files", "--unmerged")) throw new Error("Resolve the existing Git conflicts before publishing content.");
  console.log(`Using committed site ${base.slice(0, 8)}; local code edits will not be included.`);
  if (dryRun) console.log("Dry run: using the last fetched origin; no fetch, commit or push.");
  const original = snapshot();
  initialStagedContent = git("diff", "--cached", "--raw", "-z", "--", ...payload, ...generated);
  const initialGenerated = new Map(generated.map((file) => [file, existsSync(path.join(root, file)) ? fingerprint(readFileSync(path.join(root, file))) : null]));
  const indexWasModified = Boolean(git("diff", "--name-only", "HEAD", "--", "index.html"));
  const indexWasStaged = Boolean(git("diff", "--cached", "--name-only", "--", "index.html"));
  const site = path.join(temporary, "site");
  execute(temporary, "git", ["clone", "--quiet", "--shared", "--no-checkout", "--no-tags", "--", root, site]);
  const tempGit = (...args) => execute(site, "git", args);
  tempGit("checkout", "--quiet", "--detach", base);
  if (original.has("public/data/roadmap.json") && !existsSync(path.join(site, "scripts/validate-notebook.mjs"))) throw new Error("Notebook publishing needs its first reviewed code release. Saved notes and notebook edits are unchanged.");
  tempGit("config", "core.hooksPath", path.join(temporary, "no-hooks"));
  const author = git("var", "GIT_AUTHOR_IDENT").match(/^(.*) <([^>]*)> \d+ [+-]\d+$/);
  if (!author) throw new Error("Configure your Git author before publishing.");
  tempGit("config", "user.name", author[1]);
  tempGit("config", "user.email", author[2]);
  const committedFiles = split(tempGit("ls-files", "-z", "--", ...payload));
  for (const file of committedFiles) {
    if (lstatSync(path.join(site, file)).isSymbolicLink()) throw new Error("The reviewed content snapshot contains a link; review it before publishing.");
    if (original.get(file)) continue;
    const target = path.resolve(site, file);
    if (!target.startsWith(`${site}${path.sep}`) || !isPayload(file)) throw new Error("Invalid snapshot removal path.");
    unlinkSync(target);
  }
  for (const [file, hash] of original) {
    if (hash === null) continue;
    const bytes = readFileSync(safeFile(file));
    if (fingerprint(bytes) !== hash) throw new Error("Content changed while preparing the batch. Retry after saving.");
    const target = path.join(site, file);
    mkdirSync(path.dirname(target), { recursive: true });
    writeFileSync(target, bytes);
  }
  const modules = path.join(root, "node_modules");
  if (existsSync(modules)) symlinkSync(modules, path.join(site, "node_modules"), process.platform === "win32" ? "junction" : "dir");
  // Use the reviewed export/validation code, not scripts from the working tree.
  execute(site, process.execPath, ["scripts/publish-site.mjs", "--dry-run", "--skip-steam-sync", "--skip-typecheck"], true);
  if (exportedRecords(readFileSync(path.join(site, "public/data/records.js"), "utf8")) !== exportedRecords(readFileSync(path.join(root, "public/data/records.js"), "utf8"))) {
    throw new Error("The reviewed exporter and local archive disagree. Refresh the archive; if this persists, review the content/schema code before publishing.");
  }
  assertUnchanged(original, base, branch);
  const paths = [...payload, ...generated].filter((scope) => split(tempGit("ls-files", "--cached", "--others", "--exclude-standard", "-z", "--", scope)).length);
  tempGit("add", "-A", "--", ...paths);
  const stagedPayload = new Set(split(tempGit("ls-files", "-z", "--", ...payload)));
  for (const [file, hash] of original) {
    if ((hash !== null) !== stagedPayload.has(file)) throw new Error(`Saved content is missing from the prepared index, possibly due to committed ignore rules: ${file}`);
  }
  const changed = split(tempGit("diff", "--cached", "--name-only", "-z"));
  if (changed.some((file) => !isPayload(file) && !generated.includes(file))) throw new Error("Prepared commit contains unexpected files.");
  if (!changed.length) {
    console.log("No saved changes needed publishing.");
  } else if (dryRun) {
    console.log(`Isolated checks passed for ${changed.length} files. No commit or push was made.`);
  } else {
    tempGit("commit", "--quiet", "-m", message);
    const commit = tempGit("rev-parse", "HEAD");
    git("fetch", "--no-tags", site, commit);
    assertUnchanged(original, base, branch);
    const state = { base, branch, commit, beforeIndex: indexFingerprint(), indexWasStaged, indexWasModified, generated: Object.fromEntries(initialGenerated) };
    saveState(state);
    execute(root, "git", ["push", "origin", `${commit}:refs/heads/${branch}`], true);
    try { assertUnchanged(original, base, branch); }
    catch { throw new Error(`GitHub received commit ${commit}, but local content or staging changed. Sync the branch before publishing again; local files were not reset.`); }
    finalizePublication(state);
    console.log(`commit ${commit}`);
    console.log(`${changed.length} files changed`);
    console.log(`Published ${branch} to GitHub.`);
  }
}

try {
  console.log("Gestalt isolated content publish");
  if (!message || message.startsWith("-")) throw new Error("Provide a commit message after --message.");
  acquireLock();
  const branch = git("symbolic-ref", "--short", "HEAD");
  const base = git("rev-parse", "HEAD");
  if (!dryRun) git("fetch", "--no-tags", "origin", `refs/heads/${branch}:refs/remotes/origin/${branch}`);
  const remoteBase = git("rev-parse", `refs/remotes/origin/${branch}`);
  if (!recoverPublication(branch, base, remoteBase)) publishContent(branch, base, remoteBase);
} catch (error) {
  console.error(`Content publish stopped: ${error.message}`);
  console.error("Saved records and working site code remain on this PC.");
  process.exitCode = 1;
} finally {
  try { cleanTemporary(); } catch (error) { console.error(`Temporary cleanup: ${error.message}`); process.exitCode = 1; }
  if (lock && existsSync(lock)) {
    try { if (JSON.parse(readFileSync(lock, "utf8")).token === token) unlinkSync(lock); } catch {}
  }
}
