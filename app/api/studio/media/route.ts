import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse, type NextRequest } from "next/server";
import { isLocalStudioRequest, sanitizeFilename, slugify } from "@/lib/studio";

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

  const recordId = slugify(rawRecordId) || "draft";
  const filename = `${Date.now()}-${sanitizeFilename(file.name)}`;
  const publicDir = path.join(process.cwd(), "public", "media", "records", recordId);
  const filePath = path.join(publicDir, filename);
  const bytes = Buffer.from(await file.arrayBuffer());

  await mkdir(publicDir, { recursive: true });
  await writeFile(filePath, bytes);

  const publicPath = `/media/records/${recordId}/${filename}`;

  return NextResponse.json({
    path: publicPath,
    markdown: file.type.startsWith("image/")
      ? `![](${publicPath})`
      : `<video src="${publicPath}" controls></video>`
  });
}
