import { spawnSync } from "node:child_process";
import { NextResponse, type NextRequest } from "next/server";
import { getRecords } from "@/lib/content";
import { isLocalStudioRequest } from "@/lib/studio";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const publishPaths = [
  "content/records",
  "public/data/records.js",
  "public/favicon.ico",
  "public/favicon.svg",
  "public/media/records",
  "index.html"
];

export async function POST(request: NextRequest) {
  if (!isLocalStudioRequest(request)) {
    return NextResponse.json({ error: "Studio change review is local-development only." }, { status: 404 });
  }

  const status = spawnSync("git", ["status", "--porcelain=v1", "--untracked-files=all", "--", ...publishPaths], {
    cwd: process.cwd(),
    encoding: "utf8",
    windowsHide: true
  });

  if (status.error || status.status !== 0) {
    return NextResponse.json({ error: "Could not read the local archive change list." }, { status: 500 });
  }

  const recordMap = new Map(getRecords().map((record) => [record.id, record]));
  const changedEntries = status.stdout
    .split(/\r?\n/)
    .filter(Boolean)
    .map((entry) => ({ code: entry.slice(0, 2), path: entry.slice(3).replaceAll("\\", "/") }));
  const changedRecords = changedEntries
    .filter(({ path }) => path.startsWith("content/records/") && path.endsWith(".mdx"))
    .map(({ code, path }) => {
      const id = path.slice("content/records/".length, -".mdx".length);
      const record = recordMap.get(id);
      const change = code.includes("D") ? "deleted" : code.includes("A") || code === "??" ? "new" : "edited";

      return {
        id,
        title: record?.title ?? id.replaceAll("-", " "),
        section: record?.section,
        change
      };
    })
    .sort((left, right) => left.title.localeCompare(right.title));

  const changedPaths = changedEntries
    .map(({ path }) => path)
    .filter((path) => path.startsWith("content/records/") || path === "public/data/records.js" || path.startsWith("public/media/records/"));

  return NextResponse.json({
    records: changedRecords,
    changedFiles: changedPaths.length,
    mediaFiles: changedPaths.filter((path) => path.startsWith("public/media/records/")).length,
    staticDataChanged: changedPaths.includes("public/data/records.js")
  });
}
