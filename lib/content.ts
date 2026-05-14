import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import type { Milestone, RecordEntry, RecordSection } from "@/lib/types";

type Frontmatter = Record<string, string | number | boolean | string[]>;

const contentDirectory = path.join(process.cwd(), "content", "records");
const validSections = new Set<RecordSection>([
  "system",
  "projects",
  "games",
  "logs",
  "setup",
  "archive"
]);

function parseScalar(rawValue: string): string | number | boolean | string[] {
  const value = rawValue.trim();

  if (value.startsWith("[") && value.endsWith("]")) {
    return value
      .slice(1, -1)
      .split(",")
      .map((item) => item.trim().replace(/^["']|["']$/g, ""))
      .filter(Boolean);
  }

  if (value === "true") {
    return true;
  }

  if (value === "false") {
    return false;
  }

  if (/^-?\d+(\.\d+)?$/.test(value)) {
    return Number(value);
  }

  return value.replace(/^["']|["']$/g, "");
}

function parseFrontmatter(source: string): { data: Frontmatter; body: string } {
  if (!source.startsWith("---")) {
    return { data: {}, body: source.trim() };
  }

  const endIndex = source.indexOf("\n---", 3);

  if (endIndex === -1) {
    return { data: {}, body: source.trim() };
  }

  const frontmatter = source.slice(3, endIndex).trim();
  const body = source.slice(endIndex + 4).trim();
  const data: Frontmatter = {};

  for (const line of frontmatter.split(/\r?\n/)) {
    const separatorIndex = line.indexOf(":");

    if (separatorIndex === -1) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    const value = line.slice(separatorIndex + 1);
    data[key] = parseScalar(value);
  }

  return { data, body };
}

function toString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function toNumber(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function toStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function parseSection(value: unknown): RecordSection {
  const section = toString(value, "archive");
  return validSections.has(section as RecordSection) ? (section as RecordSection) : "archive";
}

function parseMilestones(value: unknown): Milestone[] {
  if (typeof value !== "string") {
    return [];
  }

  return value
    .split(";")
    .map((entry) => {
      const [label, progress, status] = entry.split("|").map((part) => part.trim());

      return {
        label,
        progress: Math.max(0, Math.min(100, Number(progress) || 0)),
        status: status || "Observed"
      };
    })
    .filter((entry) => entry.label);
}

export function getRecords(): RecordEntry[] {
  const filenames = readdirSync(contentDirectory).filter((filename) => filename.endsWith(".mdx"));

  return filenames
    .map((filename) => {
      const id = filename.replace(/\.mdx$/, "");
      const source = readFileSync(path.join(contentDirectory, filename), "utf8");
      const { data, body } = parseFrontmatter(source);

      return {
        id,
        title: toString(data.title, id),
        section: parseSection(data.section),
        type: toString(data.type, "Record"),
        status: toString(data.status, "Observed"),
        started: toString(data.started),
        updated: toString(data.updated, "2026-05-13"),
        mood: toString(data.mood),
        summary: toString(data.summary, "No summary recorded."),
        banner: toString(data.banner),
        progress: Math.max(0, Math.min(100, toNumber(data.progress, 0))),
        priority: toNumber(data.priority, 99),
        tags: toStringArray(data.tags),
        meta: data,
        milestones: parseMilestones(data.milestones),
        body
      } satisfies RecordEntry;
    })
    .sort((a, b) => a.priority - b.priority || b.updated.localeCompare(a.updated));
}
