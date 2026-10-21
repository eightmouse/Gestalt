import { access, mkdir, readdir, readFile, rename, unlink, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { NextResponse, type NextRequest } from "next/server";
import {
  escapeFrontmatter,
  isLocalStudioRequest,
  isStudioSection,
  slugify
} from "@/lib/studio";
import { writeStaticRecords } from "@/lib/static-export";
import { beginStudioOperation, setStaticExportRequired } from "@/lib/studio-operation";
import { parseFrontmatter } from "@/lib/content";
import { gameActivityValue, gameLogPlacement } from "@/lib/game-state";
import imageFraming from "@/public/image-framing.js";

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
  bannerFit?: string;
  bannerZoom?: number | string;
  bannerX?: number | string;
  bannerY?: number | string;
  headerImage?: string;
  iconImage?: string;
  externalUrl?: string;
  setupGroup?: string;
  samples?: string[] | string;
  attachments?: string[] | string;
  progress?: number | string;
  priority?: number | string;
  milestones?: string;
  hardware?: string;
  technicalStack?: string;
  recommendation?: string;
  gamePlacement?: string;
  gameActivity?: string;
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

  const release = beginStudioOperation("save");
  if (!release) return NextResponse.json({ error: "Studio is already writing or publishing. Try again when it finishes." }, { status: 409 });
  try {
    return await saveEntry(request);
  } catch (error) {
    console.error("Studio record write failed:", error);
    return NextResponse.json({ error: "Could not finish saving the record. Keep your draft and retry." }, { status: 500 });
  } finally {
    release();
  }
}

async function saveEntry(request: NextRequest) {
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
  const steamAppId = parseOptionalInteger(payload.steamAppId);
  const externalUrl = cleanExternalUrl(payload.externalUrl);
  const filePath = path.join(recordsDirectory, `${id}.mdx`);

  // Writing chronology belongs to the saved source, never the editable payload.
  const existing = originalId ? await readOriginalRecord(originalId) : undefined;
  if (originalId && !existing) {
    return NextResponse.json({ error: "The original record no longer exists. Refresh before saving this draft." }, { status: 409 });
  }
  const bannerFrame = imageFraming.imageFrameFields({
    bannerFit: payload.bannerFit ?? existing?.bannerFit,
    bannerZoom: payload.bannerZoom ?? existing?.bannerZoom,
    bannerX: payload.bannerX ?? existing?.bannerX,
    bannerY: payload.bannerY ?? existing?.bannerY
  });
  const writtenAt = section === "logs"
    ? clean(existing?.writtenAt) || (existing ? clean(existing.started) || clean(existing.updated) : new Date().toISOString())
    : clean(existing?.writtenAt);
  const writtenOrder = typeof existing?.writtenOrder === "number" ? existing.writtenOrder : 0;
  if (section === "games" && (
    (payload.gamePlacement !== undefined && payload.gamePlacement !== "" && payload.gamePlacement !== "session" && payload.gamePlacement !== "past") ||
    (payload.gameActivity !== undefined && payload.gameActivity !== "" && payload.gameActivity !== "active" && payload.gameActivity !== "inactive")
  )) {
    return NextResponse.json({ error: "Invalid game placement or activity." }, { status: 400 });
  }
  const previousGame = { status: clean(existing?.status) || clean(payload.status) || defaultStatus(section), meta: existing };
  const gamePlacement = section === "games"
    ? payload.gamePlacement || gameLogPlacement(previousGame)
    : "";
  const gameActivity = section === "games"
    ? payload.gameActivity === undefined ? gameActivityValue(previousGame) : payload.gameActivity
    : "";

  if (id !== originalId && await recordExists(filePath)) {
    return NextResponse.json(
      { error: `A record named "${title}" already exists. Open it to edit, or choose a different title.` },
      { status: 409 }
    );
  }

  if (section === "games" && steamAppId) {
    const filenames = await readdir(recordsDirectory).catch((error: NodeJS.ErrnoException) => {
      if (error.code === "ENOENT") return [];
      throw error;
    });
    for (const filename of filenames) {
      if (!filename.endsWith(".mdx") || filename === `${originalId}.mdx`) continue;
      const { data } = parseFrontmatter(await readFile(path.join(recordsDirectory, filename), "utf8"));
      if (data.section === "games" && Number(data.steamAppId) === steamAppId) {
        return NextResponse.json({ error: "This Steam game already has a record. Open the existing game to edit it." }, { status: 409 });
      }
    }
  }

  const lines = [
    "---",
    `title: "${escapeFrontmatter(title)}"`,
    `section: "${section}"`,
    `type: "${escapeFrontmatter(clean(payload.type) || defaultType(section))}"`,
    `status: "${escapeFrontmatter(clean(payload.status) || defaultStatus(section))}"`,
    ...(started ? [`started: "${started}"`] : []),
    `updated: "${updated}"`,
    ...(writtenAt ? [`writtenAt: "${escapeFrontmatter(writtenAt)}"`] : []),
    ...(writtenOrder ? [`writtenOrder: ${writtenOrder}`] : []),
    `summary: "${escapeFrontmatter(clean(payload.summary) || "No summary recorded.")}"`,
    ...(clean(payload.banner) ? [`banner: "${escapeFrontmatter(clean(payload.banner))}"`] : []),
    ...Object.entries(bannerFrame).map(([key, value]) => `${key}: ${typeof value === "string" ? `"${value}"` : value}`),
    ...(clean(payload.headerImage) ? [`headerImage: "${escapeFrontmatter(clean(payload.headerImage))}"`] : []),
    ...(clean(payload.iconImage) ? [`iconImage: "${escapeFrontmatter(clean(payload.iconImage))}"`] : []),
    ...(externalUrl ? [`externalUrl: "${escapeFrontmatter(externalUrl)}"`] : []),
    ...(section === "setup" && clean(payload.setupGroup) ? [`setupGroup: "${escapeFrontmatter(normalizeSetupGroup(clean(payload.setupGroup)))}"`] : []),
    ...(samples.length ? [`samples: [${samples.map((item) => `"${escapeFrontmatter(item)}"`).join(", ")}]`] : []),
    ...(attachments.length ? [`attachments: [${attachments.map((item) => `"${escapeFrontmatter(item)}"`).join(", ")}]`] : []),
    `progress: ${progress}`,
    `priority: ${priority}`,
    ...(gamePlacement ? [`gamePlacement: "${gamePlacement}"`] : []),
    ...(gameActivity ? [`gameActivity: "${gameActivity}"`] : []),
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
  const temporaryPath = `${filePath}.${randomUUID()}.tmp`;
  try {
    await writeFile(temporaryPath, lines.join("\n"), { encoding: "utf8", flag: "wx" });
    await rename(temporaryPath, filePath);
  } finally {
    await unlink(temporaryPath).catch(() => {});
  }
  setStaticExportRequired(true);

  if (originalId && originalId !== id) {
    await removeRecordFile(originalId);
  }

  const exportResult = await refreshSavedRecords();

  return NextResponse.json({
    id,
    path: path.relative(process.cwd(), filePath).replaceAll("\\", "/"),
    saved: true,
    writtenAt,
    writtenOrder,
    ...exportResult
  });
}

export async function DELETE(request: NextRequest) {
  if (!isLocalStudioRequest(request)) {
    return NextResponse.json({ error: "Studio writes are local-development only." }, { status: 404 });
  }

  const release = beginStudioOperation("delete");
  if (!release) return NextResponse.json({ error: "Studio is already writing or publishing. Try again when it finishes." }, { status: 409 });
  try {
    return await deleteEntry(request);
  } catch (error) {
    console.error("Studio record deletion failed:", error);
    return NextResponse.json({ error: "Could not finish deleting the record. Refresh the local change list before retrying." }, { status: 500 });
  } finally {
    release();
  }
}

async function deleteEntry(request: NextRequest) {
  const payload = (await request.json()) as Pick<EntryPayload, "id" | "originalId">;
  const id = slugify(clean(payload.id) || clean(payload.originalId));

  if (!id) {
    return NextResponse.json({ error: "Record id is required." }, { status: 400 });
  }

  await removeRecordFile(id);
  setStaticExportRequired(true);
  const exportResult = await refreshSavedRecords();

  return NextResponse.json({ id, deleted: true, ...exportResult });
}

async function readOriginalRecord(id: string) {
  try {
    const source = await readFile(path.join(recordsDirectory, `${id}.mdx`), "utf8");
    return parseFrontmatter(source).data;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return undefined;
    throw error;
  }
}

async function refreshSavedRecords() {
  try {
    await writeStaticRecords();
    return { staticExported: true };
  } catch {
    return { staticExported: false, warning: "The local record change is saved, but the static archive could not refresh. Use Refresh archive to retry without saving the record again." };
  }
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

function cleanExternalUrl(value: unknown): string {
  const url = clean(value);

  if (!url) {
    return "";
  }

  if (/^https?:\/\/[^\s]+$/i.test(url)) {
    return url;
  }

  return "";
}

function clampNumber(value: unknown, min: number, max: number, fallback: number): number {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return fallback;
  }

  return Math.max(min, Math.min(max, Math.round(number)));
}

function parseOptionalInteger(value: unknown): number | null {
  const raw = typeof value === "number" ? String(value) : clean(value);

  if (!/^\d+$/.test(raw)) {
    return null;
  }

  const parsed = Number(raw);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}

function normalizeSetupGroup(value: string): string {
  return ["systems", "tools", "peripherals", "notes"].includes(value) ? value : "systems";
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

async function recordExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch (error) {
    if (typeof error === "object" && error && "code" in error && error.code === "ENOENT") {
      return false;
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
