import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse, type NextRequest } from "next/server";
import {
  escapeFrontmatter,
  isLocalStudioRequest,
  isStudioSection,
  normalizeTags,
  slugify
} from "@/lib/studio";

type EntryPayload = {
  id?: string;
  title?: string;
  section?: string;
  type?: string;
  status?: string;
  started?: string;
  updated?: string;
  mood?: string;
  summary?: string;
  banner?: string;
  progress?: number | string;
  priority?: number | string;
  tags?: string[] | string;
  milestones?: string;
  playtime?: string;
  body?: string;
};

const recordsDirectory = path.join(process.cwd(), "content", "records");

export async function POST(request: NextRequest) {
  if (!isLocalStudioRequest(request)) {
    return NextResponse.json({ error: "Studio writes are local-development only." }, { status: 404 });
  }

  const payload = (await request.json()) as EntryPayload;
  const title = clean(payload.title);
  const section = payload.section;
  const updated = clean(payload.updated);
  const body = clean(payload.body);

  if (!title) {
    return NextResponse.json({ error: "Title is required." }, { status: 400 });
  }

  if (!isStudioSection(section)) {
    return NextResponse.json({ error: "Invalid section." }, { status: 400 });
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(updated)) {
    return NextResponse.json({ error: "Updated date must use YYYY-MM-DD." }, { status: 400 });
  }

  if (!body) {
    return NextResponse.json({ error: "Body cannot be empty." }, { status: 400 });
  }

  const id = slugify(clean(payload.id) || title);

  if (!id) {
    return NextResponse.json({ error: "Could not derive a safe entry id." }, { status: 400 });
  }

  const started = clean(payload.started);

  if (started && !/^\d{4}-\d{2}-\d{2}$/.test(started)) {
    return NextResponse.json({ error: "Started date must use YYYY-MM-DD." }, { status: 400 });
  }

  const progress = clampNumber(payload.progress, 0, 100, 0);
  const priority = clampNumber(payload.priority, -999, 9999, 50);
  const tags = normalizeTags(payload.tags);
  const filePath = path.join(recordsDirectory, `${id}.mdx`);

  const lines = [
    "---",
    `title: "${escapeFrontmatter(title)}"`,
    `section: "${section}"`,
    `type: "${escapeFrontmatter(clean(payload.type) || defaultType(section))}"`,
    `status: "${escapeFrontmatter(clean(payload.status) || defaultStatus(section))}"`,
    ...(started ? [`started: "${started}"`] : []),
    `updated: "${updated}"`,
    `mood: "${escapeFrontmatter(clean(payload.mood) || "unfiled")}"`,
    `summary: "${escapeFrontmatter(clean(payload.summary) || "No summary recorded.")}"`,
    ...(clean(payload.banner) ? [`banner: "${escapeFrontmatter(clean(payload.banner))}"`] : []),
    `progress: ${progress}`,
    `priority: ${priority}`,
    `tags: [${tags.join(", ")}]`,
    ...(clean(payload.playtime) ? [`playtime: "${escapeFrontmatter(clean(payload.playtime))}"`] : []),
    `milestones: "${escapeFrontmatter(clean(payload.milestones))}"`,
    "---",
    body,
    ""
  ];

  await mkdir(recordsDirectory, { recursive: true });
  await writeFile(filePath, lines.join("\n"), "utf8");

  return NextResponse.json({
    id,
    path: path.relative(process.cwd(), filePath).replaceAll("\\", "/")
  });
}

function clean(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function clampNumber(value: unknown, min: number, max: number, fallback: number): number {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return fallback;
  }

  return Math.max(min, Math.min(max, Math.round(number)));
}

function defaultType(section: string): string {
  return {
    projects: "Project",
    games: "Play Log",
    logs: "Field Note",
    setup: "Setup",
    archive: "Archive"
  }[section] ?? "Record";
}

function defaultStatus(section: string): string {
  return {
    projects: "Planning",
    games: "Playing",
    logs: "Observed",
    setup: "Active",
    archive: "Archived"
  }[section] ?? "Observed";
}
