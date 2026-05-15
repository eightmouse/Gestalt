import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

const validSections = new Set(["projects", "games", "logs", "setup", "archive"]);
const args = parseArgs(process.argv.slice(2));

if (!args.title || !args.section) {
  usage();
  process.exit(1);
}

if (!validSections.has(args.section)) {
  console.error(`Invalid section "${args.section}". Use one of: ${Array.from(validSections).join(", ")}`);
  process.exit(1);
}

const root = process.cwd();
const recordsDir = path.join(root, "content", "records");
const today = args.date || new Date().toISOString().slice(0, 10);
const slug = args.slug || slugify(args.title);
const filePath = path.join(recordsDir, `${slug}.mdx`);

if (existsSync(filePath)) {
  console.error(`Entry already exists: ${path.relative(root, filePath)}`);
  process.exit(1);
}

mkdirSync(recordsDir, { recursive: true });

const type = args.type || defaultType(args.section);
const status = args.status || defaultStatus(args.section);
const summary = args.summary || "Short summary goes here.";
const progress = Number.isFinite(Number(args.progress)) ? Number(args.progress) : 0;
const priority = Number.isFinite(Number(args.priority)) ? Number(args.priority) : 50;
const tags = args.tags ? args.tags.split(",").map((tag) => tag.trim()).filter(Boolean) : [args.section];

const body = `---
title: "${escapeYaml(args.title)}"
section: "${args.section}"
type: "${escapeYaml(type)}"
status: "${escapeYaml(status)}"
started: "${today}"
updated: "${today}"
summary: "${escapeYaml(summary)}"
progress: ${Math.max(0, Math.min(100, progress))}
priority: ${priority}
tags: [${tags.join(", ")}]
milestones: ""
---
## Notes
- [ ] Add the first real note.
- [ ] Attach a banner or media path only if it is safe to publish.

## Context
Write the useful details here.
`;

writeFileSync(filePath, body, "utf8");
console.log(`Created ${path.relative(root, filePath)}`);

function parseArgs(values) {
  const parsed = {};

  for (let index = 0; index < values.length; index += 1) {
    const value = values[index];

    if (!value.startsWith("--")) {
      continue;
    }

    const key = value.slice(2);
    const next = values[index + 1];

    if (!next || next.startsWith("--")) {
      parsed[key] = "true";
    } else {
      parsed[key] = next;
      index += 1;
    }
  }

  return parsed;
}

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function escapeYaml(value) {
  return String(value).replaceAll("\\", "\\\\").replaceAll('"', '\\"');
}

function defaultType(section) {
  return {
    projects: "Project",
    games: "Game",
    logs: "Field Note",
    setup: "Setup",
    archive: "Archive"
  }[section];
}

function defaultStatus(section) {
  return {
    projects: "Planning",
    games: "Playing",
    logs: "Observed",
    setup: "Active",
    archive: "Archived"
  }[section];
}

function usage() {
  console.log(`Usage:
node scripts/new-entry.mjs --section logs --title "My New Entry"

Options:
  --section   projects | games | logs | setup | archive
  --title     Entry title
  --slug      Optional custom filename slug
  --type      Optional type label
  --status    Optional status label
  --date      Optional YYYY-MM-DD date
  --summary   Optional short summary
  --progress  Optional 0-100 number
  --priority  Optional sort number
  --tags      Optional comma-separated tags`);
}
