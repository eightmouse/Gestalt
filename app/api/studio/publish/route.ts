import { spawnSync } from "node:child_process";
import { NextResponse, type NextRequest } from "next/server";
import { isLocalStudioRequest } from "@/lib/studio";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

let publishRunning = false;

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
          output
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: "Published to GitHub.",
      output
    });
  } finally {
    publishRunning = false;
  }
}
