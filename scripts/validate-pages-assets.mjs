import { lstat, readFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import seasonal from "../public/seasonal.js";

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
  // Inspect only quoted link attributes in the project-owned static head.
  const attribute = (tag, name) => tag.match(new RegExp(`\\b${name}\\s*=\\s*(["'])(.*?)\\1`, "i"))?.[2];
  const links = [...html.matchAll(/<link\b[^>]*>/gi)].map(([tag]) => ({ rel: attribute(tag, "rel"), as: attribute(tag, "as"), href: attribute(tag, "href") }));
  let stylesheet;
  for (const link of links.filter((link) => link.rel === "stylesheet")) {
    const entry = await asset(link.href);
    if (entry.url.pathname.endsWith("/app/globals.css")) stylesheet = entry;
  }
  if (!stylesheet) throw new Error("The public archive stylesheet is missing from the static head.");
  const css = await readFile(stylesheet.file, "utf8");
  if (!css.includes("var(--archive-image)")) throw new Error("The archive stylesheet no longer consumes the background variable.");
  const background = html.match(/--archive-image:\s*url\(\s*(["'])(.*?)\1\s*\)/)?.[2];
  if (!background) throw new Error("The static background override is missing.");
  await asset(background, stylesheet.url);
  const preloads = links.filter((link) => link.rel === "preload" && link.as === "image");
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
