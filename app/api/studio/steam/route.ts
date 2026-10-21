import { NextResponse, type NextRequest } from "next/server";
import { isLocalStudioRequest } from "@/lib/studio";
import { createSteamSnapshotLoader } from "@/public/steam-display.mjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const publicSnapshotUrl = "https://eightmouse.github.io/Gestalt/public/data/steam-current.json";

export async function POST(request: NextRequest) {
  if (!isLocalStudioRequest(request)) {
    return NextResponse.json({ error: "Steam preview is local-development only." }, { status: 404 });
  }

  // Fixed public URL only: no credential access, caller-supplied proxy target or source writes.
  const load = createSteamSnapshotLoader((url, options) => fetch(url, {
    ...options,
    signal: AbortSignal.any(options?.signal ? [options.signal, request.signal] : [request.signal])
  }));
  const snapshot = await load(publicSnapshotUrl);
  return NextResponse.json(snapshot, { headers: { "Cache-Control": "no-store" } });
}
