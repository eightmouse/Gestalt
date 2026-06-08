import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const recordsDir = path.join(root, "content", "records");
const validSections = new Set(["system", "projects", "games", "logs", "setup", "archive"]);
const required = ["title", "section", "type", "status", "updated", "summary", "progress", "priority"];
const seen = new Set();
const errors = [];

function parseScalar(rawValue) {
  const value = rawValue.trim();

  if (value.startsWith("[") && value.endsWith("]")) {
    return value
      .slice(1, -1)
      .split(",")
      .map((item) => item.trim().replace(/^["']|["']$/g, ""))
      .filter(Boolean);
  }

  if (/^-?\d+(\.\d+)?$/.test(value)) {
    return Number(value);
  }

  if (value === "true") {
    return true;
  }

  if (value === "false") {
    return false;
  }

  return value.replace(/^["']|["']$/g, "");
}

function parseFrontmatter(source) {
  if (!source.startsWith("---")) {
    return null;
  }

  const endIndex = source.indexOf("\n---", 3);

  if (endIndex === -1) {
    return null;
  }

  const data = {};
  const body = source.slice(endIndex + 4).trim();

  for (const line of source.slice(3, endIndex).trim().split(/\r?\n/)) {
    const separatorIndex = line.indexOf(":");

    if (separatorIndex === -1) {
      continue;
    }

    data[line.slice(0, separatorIndex).trim()] = parseScalar(line.slice(separatorIndex + 1));
  }

  return { data, body };
}

function fail(file, message) {
  errors.push(`${file}: ${message}`);
}

for (const filename of readdirSync(recordsDir).filter((file) => file.endsWith(".mdx")).sort()) {
  const id = filename.replace(/\.mdx$/, "");
  const source = readFileSync(path.join(recordsDir, filename), "utf8");
  const parsed = parseFrontmatter(source);

  if (seen.has(id)) {
    fail(filename, `duplicate id "${id}"`);
  }

  seen.add(id);

  if (!parsed) {
    fail(filename, "missing frontmatter block");
    continue;
  }

  for (const key of required) {
    if (parsed.data[key] === undefined || parsed.data[key] === "") {
      fail(filename, `missing required field "${key}"`);
    }
  }

  if (!validSections.has(parsed.data.section)) {
    fail(filename, `invalid section "${parsed.data.section}"`);
  }

  if (typeof parsed.data.updated === "string" && !/^\d{4}-\d{2}-\d{2}$/.test(parsed.data.updated)) {
    fail(filename, "updated must use YYYY-MM-DD");
  }

  if (parsed.data.started && typeof parsed.data.started === "string" && !/^\d{4}-\d{2}-\d{2}$/.test(parsed.data.started)) {
    fail(filename, "started must use YYYY-MM-DD");
  }

  if (typeof parsed.data.progress !== "number" || parsed.data.progress < 0 || parsed.data.progress > 100) {
    fail(filename, "progress must be a number from 0 to 100");
  }

  if (typeof parsed.data.priority !== "number") {
    fail(filename, "priority must be a number");
  }

  if (!parsed.body) {
    fail(filename, "body cannot be empty");
  }
}

if (errors.length > 0) {
  console.error("Content validation failed:");
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

console.log(`Content validation passed for ${seen.size} records.`);
