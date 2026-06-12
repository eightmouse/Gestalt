import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const recordsDir = path.join(root, "content", "records");
const outputPath = path.join(root, "public", "data", "records.js");

function parseScalar(rawValue) {
  const value = rawValue.trim();

  if (value.startsWith("[") && value.endsWith("]")) {
    return value
      .slice(1, -1)
      .split(",")
      .map((item) => item.trim().replace(/^["']|["']$/g, ""))
      .filter(Boolean);
  }

  if (value === "true") return true;
  if (value === "false") return false;

  if (/^-?\d+(\.\d+)?$/.test(value)) {
    return Number(value);
  }

  return value.replace(/^["']|["']$/g, "");
}

function parseFrontmatter(source) {
  const endIndex = source.indexOf("\n---", 3);
  const data = {};
  const body = source.slice(endIndex + 4).trim();

  for (const line of source.slice(3, endIndex).trim().split(/\r?\n/)) {
    const separatorIndex = line.indexOf(":");

    if (separatorIndex === -1) continue;

    data[line.slice(0, separatorIndex).trim()] = parseScalar(line.slice(separatorIndex + 1));
  }

  return { data, body };
}

function parseMilestones(value) {
  if (typeof value !== "string") return [];

  return value
    .split(";")
    .map((entry) => {
      const [label, progress, status] = entry.split("|").map((part) => part.trim());
      return { label, progress: Math.max(0, Math.min(100, Number(progress) || 0)), status: status || "Observed" };
    })
    .filter((entry) => entry.label);
}

function toStaticPath(value) {
  return String(value || "")
    .replace(/^\/media\//, "public/media/")
    .replace(/^\/images\//, "public/images/");
}

function toStaticPathList(value) {
  const list = Array.isArray(value)
    ? value
    : typeof value === "string"
      ? value.split(/\r?\n|,/)
      : [];

  return list
    .map((item) => toStaticPath(String(item).trim()))
    .filter(Boolean);
}

function toStaticBody(value) {
  return value
    .replaceAll("](/media/", "](public/media/")
    .replaceAll("](/images/", "](public/images/");
}

function decodeTextBlock(value) {
  return typeof value === "string" ? value.replace(/\\+n/g, "\n") : "";
}

const filenames = (await readdir(recordsDir)).filter((filename) => filename.endsWith(".mdx"));
const records = [];

for (const filename of filenames) {
  const id = filename.replace(/\.mdx$/, "");
  const source = await readFile(path.join(recordsDir, filename), "utf8");
  const { data, body } = parseFrontmatter(source);

  records.push({
    id,
    title: data.title || id,
    section: data.section || "archive",
    type: data.type || "Record",
    status: data.status || "Observed",
    started: data.started || "",
    updated: data.updated || "2026-05-15",
    summary: data.summary || "No summary recorded.",
    banner: toStaticPath(data.banner),
    dashboardImage: toStaticPath(data.dashboardImage),
    headerImage: toStaticPath(data.headerImage),
    iconImage: toStaticPath(data.iconImage),
    externalUrl: typeof data.externalUrl === "string" ? data.externalUrl : "",
    setupGroup: typeof data.setupGroup === "string"
      ? data.setupGroup
      : typeof data.setupKind === "string"
        ? data.setupKind
        : typeof data.category === "string"
          ? data.category
          : "",
    samples: toStaticPathList(data.samples),
    attachments: toStaticPathList(data.attachments),
    progress: Number(data.progress) || 0,
    priority: Number(data.priority) || 99,
    dashboardActive: data.dashboardActive === true,
    steamAppId: data.steamAppId,
    playtime: data.playtime,
    lastPlayed: data.lastPlayed,
    achievementCount: data.achievementCount,
    hardware: decodeTextBlock(data.hardware),
    technicalStack: decodeTextBlock(data.technicalStack),
    recommendation: decodeTextBlock(data.recommendation),
    milestones: parseMilestones(data.milestones),
    body: toStaticBody(body)
  });
}

records.sort((a, b) => a.priority - b.priority || b.updated.localeCompare(a.updated));

await mkdir(path.dirname(outputPath), { recursive: true });
await writeFile(outputPath, `window.__GESTALT_RECORDS = ${JSON.stringify(records, null, 2)};\n`, "utf8");
console.log(`Exported ${records.length} records to ${path.relative(root, outputPath)}`);
