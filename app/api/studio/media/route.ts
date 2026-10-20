import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse, type NextRequest } from "next/server";
import { isLocalStudioRequest, sanitizeFilename, slugify } from "@/lib/studio";
import { verifiedMediaExtension } from "@/lib/studio-media";
import { beginStudioOperation } from "@/lib/studio-operation";

const maxBytes = 12 * 1024 * 1024;
const allowedTypes = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "video/mp4",
  "video/webm"
]);

export async function POST(request: NextRequest) {
  if (!isLocalStudioRequest(request)) {
    return NextResponse.json({ error: "Studio uploads are local-development only." }, { status: 404 });
  }

  const formData = await request.formData();
  const file = formData.get("file");
  const rawRecordId = String(formData.get("recordId") || "draft");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file uploaded." }, { status: 400 });
  }

  if (!allowedTypes.has(file.type)) {
    return NextResponse.json({ error: "Only png, jpg, webp, gif, mp4, and webm files are allowed." }, { status: 400 });
  }

  if (file.size > maxBytes) {
    return NextResponse.json({ error: "File is larger than 12 MB." }, { status: 400 });
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const extension = verifiedMediaExtension(file.type, bytes);

  if (!extension) {
    return NextResponse.json({ error: "File content does not match its media type." }, { status: 400 });
  }

  const release = beginStudioOperation("upload");
  if (!release) return NextResponse.json({ error: "Studio is already writing or publishing. Try again when it finishes." }, { status: 409 });

  try {
    const recordId = slugify(rawRecordId) || "draft";
    const safeName = sanitizeFilename(file.name).replace(/\.[^.]*$/, "");
    const filename = `${Date.now()}-${safeName}.${extension}`;
    const publicDir = path.join(process.cwd(), "public", "media", "records", recordId);
    const filePath = path.join(publicDir, filename);

    await mkdir(publicDir, { recursive: true });
    await writeFile(filePath, bytes);

    const publicPath = `/media/records/${recordId}/${filename}`;

    return NextResponse.json({
      path: publicPath,
      markdown: file.type.startsWith("image/")
        ? `![](${publicPath})`
        : `<video src="${publicPath}" controls></video>`
    });
  } finally {
    release();
  }
}
