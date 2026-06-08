import { mkdir, readdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse, type NextRequest } from "next/server";
import {
  escapeFrontmatter,
  isLocalStudioRequest,
  isStudioSection,
  slugify
} from "@/lib/studio";
import { writeStaticRecords } from "@/lib/static-export";

type EntryPayload = {
  originalId?: string;
  id?: string;
  title?: string;
  section?: string;
  type?: string;
  status?: string;
  started?: string;
  updated?: string;
  summary?: string;
  banner?: string;
  headerImage?: string;
  samples?: string[] | string;
  attachments?: string[] | string;
  progress?: number | string;
  priority?: number | string;
  milestones?: string;
  hardware?: string;
  technicalStack?: string;
  recommendation?: string;
  dashboardActive?: boolean | string;
  steamAppId?: number | string;
  playtime?: string;
  lastPlayed?: string;
  achievementCount?: string;
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
  const body = cleanBody(payload.body);

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

  const originalId = slugify(clean(payload.originalId));
  const id = slugify(clean(payload.id) || originalId || title);

  if (!id) {
    return NextResponse.json({ error: "Could not derive a safe entry id." }, { status: 400 });
  }

  const started = clean(payload.started);

  if (started && !/^\d{4}-\d{2}-\d{2}$/.test(started)) {
    return NextResponse.json({ error: "Started date must use YYYY-MM-DD." }, { status: 400 });
  }

  const progress = clampNumber(payload.progress, 0, 100, 0);
  const priority = clampNumber(payload.priority, -999, 9999, 50);
  const samples = normalizeMediaList(payload.samples);
  const attachments = normalizeMediaList(payload.attachments);
  const dashboardActive = section === "games" && toBoolean(payload.dashboardActive);
  const steamAppId = parseOptionalInteger(payload.steamAppId);
  const filePath = path.join(recordsDirectory, `${id}.mdx`);

  if (dashboardActive) {
    await unsetOtherActiveGames(id);
  }

  const lines = [
    "---",
    `title: "${escapeFrontmatter(title)}"`,
    `section: "${section}"`,
    `type: "${escapeFrontmatter(clean(payload.type) || defaultType(section))}"`,
    `status: "${escapeFrontmatter(clean(payload.status) || defaultStatus(section))}"`,
    ...(started ? [`started: "${started}"`] : []),
    `updated: "${updated}"`,
    `summary: "${escapeFrontmatter(clean(payload.summary) || "No summary recorded.")}"`,
    ...(clean(payload.banner) ? [`banner: "${escapeFrontmatter(clean(payload.banner))}"`] : []),
    ...(clean(payload.headerImage) ? [`headerImage: "${escapeFrontmatter(clean(payload.headerImage))}"`] : []),
    ...(samples.length ? [`samples: [${samples.map((item) => `"${escapeFrontmatter(item)}"`).join(", ")}]`] : []),
    ...(attachments.length ? [`attachments: [${attachments.map((item) => `"${escapeFrontmatter(item)}"`).join(", ")}]`] : []),
    `progress: ${progress}`,
    `priority: ${priority}`,
    ...(dashboardActive ? ["dashboardActive: true"] : []),
    ...(steamAppId ? [`steamAppId: ${steamAppId}`] : []),
    ...(clean(payload.playtime) ? [`playtime: "${escapeFrontmatter(clean(payload.playtime))}"`] : []),
    ...(clean(payload.lastPlayed) ? [`lastPlayed: "${escapeFrontmatter(clean(payload.lastPlayed))}"`] : []),
    ...(clean(payload.achievementCount) ? [`achievementCount: "${escapeFrontmatter(clean(payload.achievementCount))}"`] : []),
    ...(clean(payload.hardware) ? [`hardware: "${encodeFrontmatterTextBlock(clean(payload.hardware))}"`] : []),
    ...(clean(payload.technicalStack) ? [`technicalStack: "${encodeFrontmatterTextBlock(clean(payload.technicalStack))}"`] : []),
    ...(clean(payload.recommendation) ? [`recommendation: "${encodeFrontmatterTextBlock(clean(payload.recommendation))}"`] : []),
    `milestones: "${escapeFrontmatter(clean(payload.milestones))}"`,
    "---",
    body,
    ""
  ];

  await mkdir(recordsDirectory, { recursive: true });
  await writeFile(filePath, lines.join("\n"), "utf8");

  if (originalId && originalId !== id) {
    await removeRecordFile(originalId);
  }

  await writeStaticRecords();

  return NextResponse.json({
    id,
    path: path.relative(process.cwd(), filePath).replaceAll("\\", "/")
  });
}

export async function DELETE(request: NextRequest) {
  if (!isLocalStudioRequest(request)) {
    return NextResponse.json({ error: "Studio writes are local-development only." }, { status: 404 });
  }

  const payload = (await request.json()) as Pick<EntryPayload, "id" | "originalId">;
  const id = slugify(clean(payload.id) || clean(payload.originalId));

  if (!id) {
    return NextResponse.json({ error: "Record id is required." }, { status: 400 });
  }

  await removeRecordFile(id);
  await writeStaticRecords();

  return NextResponse.json({ id });
}

function clean(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function cleanBody(value: unknown): string {
  return typeof value === "string"
    ? value
        .replace(/[ \t]+$/gm, "")
        .trim()
    : "";
}

function encodeFrontmatterTextBlock(value: string): string {
  return escapeFrontmatter(value).replace(/\r?\n/g, "\\n");
}

function normalizeMediaList(value: unknown): string[] {
  const list = Array.isArray(value)
    ? value.map((item) => String(item))
    : clean(value).split(/\r?\n|,/);

  return [...new Set(
    list
      .map((item) => item.trim())
      .filter((item) => item.startsWith("/media/") || item.startsWith("/images/") || item.startsWith("public/media/") || item.startsWith("public/images/"))
  )];
}

function clampNumber(value: unknown, min: number, max: number, fallback: number): number {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return fallback;
  }

  return Math.max(min, Math.min(max, Math.round(number)));
}

function toBoolean(value: unknown): boolean {
  return value === true || value === "true" || value === "on" || value === "1";
}

function parseOptionalInteger(value: unknown): number | null {
  const raw = typeof value === "number" ? String(value) : clean(value);

  if (!/^\d+$/.test(raw)) {
    return null;
  }

  const parsed = Number(raw);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}

async function unsetOtherActiveGames(activeId: string): Promise<void> {
  await mkdir(recordsDirectory, { recursive: true });
  const filenames = await readdir(recordsDirectory);

  await Promise.all(
    filenames
      .filter((filename) => filename.endsWith(".mdx") && filename !== `${activeId}.mdx`)
      .map(async (filename) => {
        const filePath = path.join(recordsDirectory, filename);
        const source = await readFile(filePath, "utf8");

        if (!/section:\s*["']?games["']?/.test(source) || !/dashboardActive:\s*true/.test(source)) {
          return;
        }

        const next = source.replace(/\r?\ndashboardActive:\s*true\s*(?=\r?\n)/, "\n");

        if (next !== source) {
          await writeFile(filePath, next, "utf8");
        }
      })
  );
}

async function removeRecordFile(id: string): Promise<void> {
  const filePath = path.join(recordsDirectory, `${id}.mdx`);

  try {
    await unlink(filePath);
  } catch (error) {
    if (typeof error === "object" && error && "code" in error && error.code === "ENOENT") {
      return;
    }

    throw error;
  }
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
