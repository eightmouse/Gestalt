import { appendFile, copyFile, lstat, mkdir, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { createSteamSnapshotLoader } from "../public/steam-display.mjs";
import { fetchSteamSnapshot, safeSteamFailure, writeSteamSnapshot } from "./steam-snapshot.mjs";

class SteamPreparationError extends Error {}

const publicFiles = [
  "index.html", "static-app.js", "sw.js", "app/globals.css",
  "public/favicon.ico", "public/note-inline.js", "public/image-framing.js", "public/x-terminal.js", "public/x-embed.html", "public/x-embed.js", "public/steam-display.mjs", "public/roadmap.mjs", "public/data/records.js"
];
const mediaExtensions = new Set([".png", ".jpg", ".jpeg", ".webp", ".avif", ".gif", ".svg", ".ico", ".mp4", ".webm", ".mov", ".mp3", ".wav", ".ogg", ".m4a", ".pdf", ".woff", ".woff2", ".ttf", ".otf"]);

async function deployedSnapshot(baseUrl, fetchImpl) {
  const base = new URL(baseUrl);
  if (base.protocol !== "https:" || base.username || base.password || base.search || base.hash) {
    throw new Error("Pages requires a credential-free HTTPS base URL.");
  }
  if (!base.pathname.endsWith("/")) base.pathname += "/";
  let missing = false;
  const load = createSteamSnapshotLoader(async (url, options) => {
    const response = await fetchImpl(url, options);
    missing = response.status === 404;
    return response;
  });
  const snapshot = await load(new URL("public/data/steam-current.json", base).href);
  if (!snapshot && !missing) throw new Error("Deployed Steam data could not be verified; deployment stopped to preserve it.");
  return snapshot;
}

async function copyPublicFile(root, destination, relative) {
  // Check every component: a directory symlink could otherwise bypass the file allowlist.
  let source = root;
  for (const part of relative.split("/")) {
    source = path.join(source, part);
    const info = await lstat(source);
    if (info.isSymbolicLink() || (!info.isFile() && !info.isDirectory()) || info.nlink > 1 && info.isFile()) {
      throw new Error("Pages assets must be regular files without links.");
    }
  }
  if (!(await lstat(source)).isFile()) throw new Error("A required Pages file is missing.");
  const target = path.join(destination, relative);
  await mkdir(path.dirname(target), { recursive: true });
  await copyFile(source, target);
}

async function copyPublicMedia(root, destination, relative) {
  const info = await lstat(path.join(root, relative)).catch((error) => {
    if (error.code === "ENOENT") return null;
    throw error;
  });
  // Empty asset directories are not retained by Git checkouts.
  if (!info) return;
  if (!info.isDirectory() || info.isSymbolicLink()) throw new Error("Pages media must use regular directories.");
  for (const entry of await readdir(path.join(root, relative), { withFileTypes: true })) {
    const child = `${relative}/${entry.name}`;
    if (entry.name.startsWith(".") || entry.isSymbolicLink()) throw new Error("Hidden files and links cannot enter the Pages artifact.");
    if (entry.isDirectory()) await copyPublicMedia(root, destination, child);
    else {
      if (!entry.isFile() || !mediaExtensions.has(path.extname(entry.name).toLowerCase())) throw new Error("Unsupported file in public Pages media.");
      await copyPublicFile(root, destination, child);
    }
  }
}

export async function preparePages({ root, destination, baseUrl, refreshSteam = false, scheduled = false, apiKey, steamId, fetchImpl = fetch, now = new Date() }) {
  root = path.resolve(root);
  destination = path.resolve(destination);
  const projectFromOutput = path.relative(destination, root);
  if (projectFromOutput !== ".." && !projectFromOutput.startsWith(`..${path.sep}`)) {
    throw new Error("Pages output cannot replace or contain the project.");
  }
  const previous = await deployedSnapshot(baseUrl, fetchImpl);
  let snapshot = previous;
  let refreshFailed = false;
  let refreshFailure;
  if (refreshSteam) {
    try {
      snapshot = (await fetchSteamSnapshot({ apiKey, steamId, previous, fetchImpl, now })).snapshot;
    } catch (error) {
      refreshFailed = true;
      refreshFailure = safeSteamFailure(error);
      if (scheduled || !previous) {
        throw new SteamPreparationError(`Steam refresh failed; no deployment was requested. ${refreshFailure}`);
      }
      // Content publishing may proceed with the verified last good public snapshot.
    }
  }
  const changed = JSON.stringify(snapshot) !== JSON.stringify(previous);
  if (scheduled && (!refreshSteam || !changed)) return { deploy: false, changed: false, refreshFailed };

  // Fresh output only: never recursively delete or publish the workspace itself.
  await mkdir(destination);
  for (const relative of publicFiles) await copyPublicFile(root, destination, relative);
  for (const relative of ["public/images", "public/media", "public/audio"]) await copyPublicMedia(root, destination, relative);
  if (snapshot) await writeSteamSnapshot(path.join(destination, "public/data/steam-current.json"), snapshot);
  await writeFile(path.join(destination, ".nojekyll"), "");
  return { deploy: true, changed, refreshFailed, ...(refreshFailure ? { refreshFailure } : {}) };
}

async function main() {
  const result = await preparePages({
    root: process.cwd(), destination: ".pages-site", baseUrl: process.env.PAGES_BASE_URL,
    refreshSteam: process.env.STEAM_REFRESH_ENABLED === "true", scheduled: process.env.GITHUB_EVENT_NAME === "schedule",
    apiKey: process.env.STEAM_API_KEY, steamId: process.env.STEAM_ID
  });
  if (process.env.GITHUB_OUTPUT) await appendFile(process.env.GITHUB_OUTPUT, `deploy=${result.deploy}\n`);
  console.log(result.deploy ? "Public Pages artifact prepared." : "Steam display unchanged; no deployment needed.");
  if (result.refreshFailed) console.warn(`::warning::Steam refresh unavailable; retained the verified public fallback. ${result.refreshFailure}`);
  else console.log(process.env.STEAM_REFRESH_ENABLED === "true" ? "Steam refresh succeeded; public snapshot verified." : "Steam refresh disabled; no Steam API request was made.");
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  main().catch((error) => {
    console.error(error instanceof SteamPreparationError ? error.message : "Pages preparation failed. No deployment was requested; check public assets, Pages URL and Steam configuration.");
    process.exitCode = 1;
  });
}
