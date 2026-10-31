import { NextResponse, type NextRequest } from "next/server";
import { isLocalStudioRequest } from "@/lib/studio";
import { beginStudioOperation, setStaticExportRequired } from "@/lib/studio-operation";
import { runStudioProcess } from "@/lib/studio-process";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

  const release = beginStudioOperation("publish");
  if (!release) return NextResponse.json({ error: "Studio is already writing or publishing. Try again when it finishes." }, { status: 409 });

  try {
    const result = await runStudioProcess(
      process.execPath,
      ["scripts/publish-site.mjs", "--message", "Update archive"],
      180_000
    );
    const output = [result.stdout, result.stderr].filter(Boolean).join("\n").trim();

    const summary = summarizeFailedPublish(output);
    if (summary.staticExported) setStaticExportRequired(false);
    if (result.error) {
      return NextResponse.json(
        {
          error: result.error,
          output,
          summary
        },
        { status: 500 }
      );
    }

    if (result.code !== 0) {
      const siteUpdatePending = output.includes("Publish blocked: public site code has uncommitted changes");
      return NextResponse.json(
        {
          error: siteUpdatePending
            ? "Publishing is waiting for a reviewed site-code commit. Your note is saved locally; no push was attempted."
            : `Publish failed with exit code ${result.code ?? "unknown"}.`,
          ...(siteUpdatePending ? { code: "SITE_UPDATE_PENDING" } : {}),
          output,
          summary
        },
        { status: siteUpdatePending ? 409 : 500 }
      );
    }

    return NextResponse.json({
      message: /Published .+ to GitHub\./.test(output) ? "Published to GitHub." : "No saved changes or local commits needed publishing.",
      published: /Published .+ to GitHub\./.test(output),
      output,
      summary: await summarizeSuccessfulPublish(output)
    });
  } finally {
    release();
  }
}

async function summarizeSuccessfulPublish(output: string): Promise<PublishSummary> {
  const commit = matchFirst(output, /\[main\s+([a-f0-9]+)]/i) || matchFirst(output, /commit\s+([a-f0-9]{7,40})/i);
  const changedFiles = Number(matchFirst(output, /(\d+)\s+files?\s+changed/i) ?? "0");
  const cacheToken = matchFirst(output, /Updated index\.html cache token:\s*(\d+)/);
  const branch = await capture("git", ["rev-parse", "--abbrev-ref", "HEAD"]) || "main";
  const changed = commit ? (await capture("git", ["show", "--name-only", "--format=", "--no-renames", commit])).split(/\r?\n/).filter(Boolean) : [];

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

async function capture(command: string, args: string[]): Promise<string> {
  const result = await runStudioProcess(command, args);

  return result.code === 0 && !result.error ? result.stdout.trim() : "";
}

function matchFirst(value: string, pattern: RegExp): string | undefined {
  return value.match(pattern)?.[1];
}
