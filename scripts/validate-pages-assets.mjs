import { lstat, readFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import seasonal from "../public/seasonal.js";
import { validateRoadmap } from "../public/roadmap.mjs";

export async function validatePagesAssets(destination) {
  const root = path.resolve(destination);
  const base = new URL("https://gestalt.invalid/Gestalt/");
  const checked = new Set();
  async function asset(reference, relativeTo = base) {
    const url = new URL(reference, relativeTo);
    if (url.origin !== base.origin || !url.pathname.startsWith(base.pathname) || url.username || url.password) {
      throw new Error("A shared Pages asset leaves the project URL scope.");
    }
    const relative = decodeURIComponent(url.pathname.slice(base.pathname.length));
    const file = path.resolve(root, relative);
    const within = path.relative(root, file);
    if (!within || within.startsWith("..") || path.isAbsolute(within)) throw new Error("Invalid shared Pages asset path.");
    const info = await lstat(file).catch(() => null);
    if (!info?.isFile() || info.size === 0) throw new Error(`Missing prepared Pages asset: ${relative}`);
    checked.add(relative);
    return { url, file };
  }

  const html = await readFile(path.join(root, "index.html"), "utf8");
  const notebook = await asset("public/data/roadmap.json");
  validateRoadmap(JSON.parse(await readFile(notebook.file, "utf8")));
  // Inspect only quoted link attributes in the project-owned static head.
  const attribute = (tag, name) => tag.match(new RegExp(`\\b${name}\\s*=\\s*(["'])(.*?)\\1`, "i"))?.[2];
  const links = [...html.matchAll(/<link\b[^>]*>/gi)].map((match) => ({ at: match.index, rel: attribute(match[0], "rel"), as: attribute(match[0], "as"), href: attribute(match[0], "href") }));
  const headEnd = html.indexOf("</head>");
  let stylesheet;
  let appearanceStylesheet;
  let memoryStylesheet;
  for (const link of links.filter((link) => link.rel === "stylesheet")) {
    const entry = await asset(link.href);
    if (entry.url.pathname.endsWith("/app/globals.css")) stylesheet = entry;
    if (entry.url.pathname.endsWith("/app/appearance.css") && link.at < headEnd) appearanceStylesheet = entry;
    if (entry.url.pathname.endsWith("/app/memory-state.css") && link.at < headEnd) memoryStylesheet = entry;
  }
  if (!stylesheet) throw new Error("The public archive stylesheet is missing from the static head.");
  if (!appearanceStylesheet) throw new Error("The Day stylesheet must be linked in the static head.");
  if (!memoryStylesheet) throw new Error("The Memory State stylesheet must be linked in the static head.");
  let appearanceBootstrap;
  for (const match of html.slice(0, headEnd).matchAll(/<script\b[^>]*>/gi)) {
    const source = attribute(match[0], "src");
    if (!source) continue;
    const entry = await asset(source);
    if (entry.url.pathname.endsWith("/public/appearance.js")) appearanceBootstrap = match.index;
  }
  const firstStyle = links.find((link) => link.rel === "stylesheet")?.at;
  if (appearanceBootstrap === undefined || firstStyle === undefined || appearanceBootstrap > firstStyle) {
    throw new Error("The appearance bootstrap must run before the stylesheets in the static head.");
  }
  let ambientAt, memoryAt, runtimeAt;
  for (const match of html.matchAll(/<script\b[^>]*>/gi)) {
    const source = attribute(match[0], "src");
    if (!source) continue;
    const entry = await asset(source);
    if (entry.url.pathname.endsWith("/public/ambient-motion.js")) ambientAt = match.index;
    if (entry.url.pathname.endsWith("/public/memory-state.js")) memoryAt = match.index;
    if (entry.url.pathname.endsWith("/static-app.js")) runtimeAt = match.index;
  }
  if (ambientAt === undefined || runtimeAt === undefined || ambientAt > runtimeAt) {
    throw new Error("The ambient helper must load before the static reader.");
  }
  if (memoryAt === undefined || memoryAt > runtimeAt) throw new Error("The Memory State helper must load before the static reader.");
  const css = await readFile(stylesheet.file, "utf8");
  if (!css.includes("var(--archive-image)")) throw new Error("The archive stylesheet no longer consumes the background variable.");
  const background = html.match(/--archive-image:\s*url\(\s*(["'])(.*?)\1\s*\)/)?.[2];
  if (!background) throw new Error("The static background override is missing.");
  const { url: backgroundUrl } = await asset(background, stylesheet.url);
  const preloads = links.filter((link) => link.rel === "preload" && link.as === "image");
  if (!preloads.some((link) => new URL(link.href, base).href === backgroundUrl.href)) {
    throw new Error("The backdrop preload must resolve to the image used by the archive stylesheet.");
  }
  if (!preloads.some((link) => link.href === "public/images/eightmouse-avatar.png")) throw new Error("The local welcome portrait preload is missing.");
  for (const link of preloads) await asset(link.href);
  for (const icon of ["prev", "next", "index"]) await asset(`public/images/ui/notebook-${icon}.svg`);
  for (let month = 0; month < 12; month++) {
    for (const decoration of seasonal.seasonFor(new Date(2026, month, 15))?.decorations || []) {
      await asset(decoration.image);
      if (decoration.glowImage) await asset(decoration.glowImage);
    }
  }
  return [...checked].sort();
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  validatePagesAssets(process.argv[2] || ".pages-site").then((files) => {
    console.log(`Prepared Pages assets passed: ${files.length} shared files resolve under /Gestalt/, without network requests.`);
  }).catch((error) => { console.error(error.message); process.exitCode = 1; });
}
