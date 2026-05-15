import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { getRecords } from "@/lib/content";

const outputPath = path.join(process.cwd(), "public", "data", "records.js");

export async function writeStaticRecords(): Promise<void> {
  const records = getRecords().map((record) => {
    const meta = record.meta;

    return {
      id: record.id,
      title: record.title,
      section: record.section,
      type: record.type,
      status: record.status,
      started: record.started,
      updated: record.updated,
      summary: record.summary,
      banner: toStaticPath(record.banner),
      headerImage: toStaticPath(typeof meta.headerImage === "string" ? meta.headerImage : ""),
      progress: record.progress,
      priority: record.priority,
      dashboardActive: meta.dashboardActive === true,
      steamAppId: meta.steamAppId,
      playtime: meta.playtime,
      lastPlayed: meta.lastPlayed,
      achievementCount: meta.achievementCount,
      hardware: decodeTextBlock(meta.hardware),
      technicalStack: decodeTextBlock(meta.technicalStack),
      recommendation: decodeTextBlock(meta.recommendation),
      tags: record.tags,
      milestones: record.milestones,
      body: toStaticBody(record.body)
    };
  });

  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `window.__GESTALT_RECORDS = ${JSON.stringify(records, null, 2)};\n`, "utf8");
}

function toStaticPath(value: string | undefined): string {
  if (!value) {
    return "";
  }

  return value.replace(/^\/media\//, "public/media/").replace(/^\/images\//, "public/images/");
}

function toStaticBody(value: string): string {
  return value
    .replaceAll("](/media/", "](public/media/")
    .replaceAll("](/images/", "](public/images/");
}

function decodeTextBlock(value: unknown): string {
  if (Array.isArray(value)) {
    return value.map((item) => String(item)).join("\n");
  }

  return typeof value === "string" ? value.replace(/\\+n/g, "\n") : "";
}
