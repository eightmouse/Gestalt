import { NextResponse, type NextRequest } from "next/server";
import { getRecords } from "@/lib/content";
import { isLocalStudioRequest } from "@/lib/studio";
import { staticExportNeedsRefresh } from "@/lib/static-export";
import { runStudioProcess } from "@/lib/studio-process";
import { publicRuntimePaths } from "@/lib/publish-paths.mjs";

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

  const status = await runStudioProcess("git", ["status", "--porcelain=v1", "--untracked-files=all", "--", ...publishPaths]);

  if (status.error || status.code !== 0) {
    return NextResponse.json({ error: "Could not read the local archive change list." }, { status: 500 });
  }
  const codeStatus = await runStudioProcess("git", ["status", "--porcelain=v1", "--untracked-files=all", "--", ...publicRuntimePaths]);
  if (codeStatus.error || codeStatus.code !== 0) return NextResponse.json({ error: "Could not check pending site updates." }, { status: 500 });
  const siteCodeFiles = codeStatus.stdout.split(/\r?\n/).filter(Boolean).map((entry) => entry.slice(3).replaceAll("\\", "/"));

  const branch = await runStudioProcess("git", ["rev-parse", "--abbrev-ref", "HEAD"]);
  const ahead = branch.code === 0 && !branch.error
    ? await runStudioProcess("git", ["rev-list", "--count", `origin/${branch.stdout.trim()}..HEAD`]) : null;
  const unpushedCommits = ahead?.code === 0 && !ahead.error ? Number(ahead.stdout.trim()) || 0 : 0;

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
    siteCodeFiles,
    changedFiles: changedPaths.length,
    mediaFiles: changedPaths.filter((path) => path.startsWith("public/media/records/")).length,
    staticDataChanged: changedPaths.includes("public/data/records.js"),
    staticExportRequired: await staticExportNeedsRefresh(),
    unpushedCommits
  });
}
