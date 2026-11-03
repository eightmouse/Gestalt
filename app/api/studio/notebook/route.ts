import { NextResponse, type NextRequest } from "next/server";
import { isLocalStudioRequest } from "@/lib/studio";
import { beginStudioOperation } from "@/lib/studio-operation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  if (process.env.NODE_ENV !== "development" || !isLocalStudioRequest(request)) return NextResponse.json({ error: "Notebook editing is local-development only." }, { status: 404 });
  // Keep local filesystem authoring out of production dependency tracing.
  const { NotebookConflict, NotebookInputError, readNotebook, saveNotebook } = await import("@/lib/notebook-store.mjs");
  let release: (() => void) | null = null;
  try {
    // Bound the stream itself, not just the caller-supplied Content-Length.
    const reader = request.body?.getReader();
    if (!reader) return NextResponse.json({ error: "Missing notebook request." }, { status: 400 });
    const chunks: Uint8Array[] = [];
    let size = 0;
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 256000) { await reader.cancel(); return NextResponse.json({ error: "Notebook is too large." }, { status: 413 }); }
      chunks.push(value);
    }
    let payload;
    try { payload = JSON.parse(Buffer.concat(chunks).toString("utf8")); }
    catch { return NextResponse.json({ error: "Invalid notebook request." }, { status: 400 }); }
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) return NextResponse.json({ error: "Invalid notebook request." }, { status: 400 });
    if (payload.action === "read") return NextResponse.json(await readNotebook(process.cwd()), { headers: { "Cache-Control": "no-store" } });
    if (payload.action !== "save" && payload.action !== "file") return NextResponse.json({ error: "Invalid notebook action." }, { status: 400 });
    if (payload.action === "file" && (!payload.filing || typeof payload.filing !== "object")) return NextResponse.json({ error: "Choose completed work and release details." }, { status: 400 });
    release = beginStudioOperation("save");
    if (!release) return NextResponse.json({ error: "Studio is writing or publishing. Try again when it finishes." }, { status: 409 });
    return NextResponse.json(await saveNotebook(process.cwd(), payload.data, payload.revision, new Date(), payload.action === "file" ? payload.filing : undefined), { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const expected = error instanceof NotebookConflict || error instanceof NotebookInputError;
    return NextResponse.json({ error: expected ? error.message : "Could not save the notebook. Your draft is kept." }, { status: error instanceof NotebookConflict ? 409 : expected ? 400 : 500 });
  } finally { release?.(); }
}
