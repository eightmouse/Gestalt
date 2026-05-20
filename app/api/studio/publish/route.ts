import { spawnSync } from "node:child_process";
import { NextResponse, type NextRequest } from "next/server";
import { isLocalStudioRequest } from "@/lib/studio";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

let publishRunning = false;

type PublishSummary = {
  branch: string;
  cacheToken?: string;
  changedFiles: number;
  commit?: string;
  mediaAdded: number;
  recordsChanged: string[];
  staticExported: boolean;
};

export async function POST(request: NextRequest) {
  if (!isLocalStudioRequest(request)) {
    return NextResponse.json({ error: "Studio publishing is local-development only." }, { status: 404 });
  }

  if (publishRunning) {
    return NextResponse.json({ error: "A publish is already running." }, { status: 409 });
  }

  publishRunning = true;

  try {
    const result = spawnSync(
      process.execPath,
      ["scripts/publish-site.mjs", "--message", "Update archive", "--skip-typecheck"],
      {
        cwd: process.cwd(),
        encoding: "utf8",
        maxBuffer: 10 * 1024 * 1024,
        timeout: 180000
      }
    );
    const output = [result.stdout, result.stderr].filter(Boolean).join("\n").trim();

    if (result.error) {
      return NextResponse.json(
        {
          error: result.error.message,
          output
        },
        { status: 500 }
      );
    }

    if (result.status !== 0) {
      return NextResponse.json(
        {
          error: `Publish failed with exit code ${result.status ?? "unknown"}.`,
          output,
          summary: summarizeFailedPublish(output)
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: "Published to GitHub.",
      output,
      summary: summarizeSuccessfulPublish(output)
    });
  } finally {
    publishRunning = false;
  }
}

function summarizeSuccessfulPublish(output: string): PublishSummary {
  const commit = matchFirst(output, /\[main\s+([a-f0-9]+)]/i) || matchFirst(output, /commit\s+([a-f0-9]{7,40})/i);
  const changedFiles = Number(matchFirst(output, /(\d+)\s+files?\s+changed/i) ?? "0");
  const cacheToken = matchFirst(output, /Updated index\.html cache token:\s*(\d+)/);
  const branch = capture("git", ["rev-parse", "--abbrev-ref", "HEAD"]) || "main";
  const changed = commit ? capture("git", ["show", "--name-only", "--format=", "--no-renames", commit]).split(/\r?\n/).filter(Boolean) : [];

  return {
    branch,
    cacheToken,
    changedFiles,
    commit,
    mediaAdded: changed.filter((file) => file.startsWith("public/media/records/")).length,
    recordsChanged: changed
      .filter((file) => file.startsWith("content/records/") && file.endsWith(".mdx"))
      .map((file) => file.replace(/^content\/records\//, "").replace(/\.mdx$/, "")),
    staticExported: /Exported \d+ records to public\\data\\records\.js|Exported \d+ records to public\/data\/records\.js/.test(output)
  };
}

function summarizeFailedPublish(output: string): Partial<PublishSummary> {
  return {
    cacheToken: matchFirst(output, /Updated index\.html cache token:\s*(\d+)/),
    staticExported: /Exported \d+ records to public\\data\\records\.js|Exported \d+ records to public\/data\/records\.js/.test(output)
  };
}

function capture(command: string, args: string[]): string {
  const result = spawnSync(command, args, {
    cwd: process.cwd(),
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"]
  });

  return result.status === 0 ? result.stdout.trim() : "";
}

function matchFirst(value: string, pattern: RegExp): string | undefined {
  return value.match(pattern)?.[1];
}
