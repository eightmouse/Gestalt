import { NextResponse, type NextRequest } from "next/server";
import { isLocalStudioRequest } from "@/lib/studio";
import { beginStudioOperation } from "@/lib/studio-operation";
import { writeStaticRecords } from "@/lib/static-export";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  if (!isLocalStudioRequest(request)) {
    return NextResponse.json({ error: "Studio refresh is local-development only." }, { status: 404 });
  }
  const release = beginStudioOperation("export");
  if (!release) return NextResponse.json({ error: "Studio is already writing or publishing. Try again when it finishes." }, { status: 409 });
  try {
    await writeStaticRecords();
    return NextResponse.json({ message: "Static archive refreshed from saved records.", staticExported: true });
  } catch {
    return NextResponse.json({ error: "Archive refresh failed. Your saved records are still on disk; retry before publishing.", staticExported: false }, { status: 500 });
  } finally {
    release();
  }
}
