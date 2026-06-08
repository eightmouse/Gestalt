import type { NextRequest } from "next/server";

export const studioSections = ["projects", "games", "logs", "setup", "archive"] as const;

export type StudioSection = (typeof studioSections)[number];

export function isLocalStudioRequest(request: NextRequest): boolean {
  if (process.env.NODE_ENV !== "development") {
    return false;
  }

  const hostHeader = request.headers.get("host")?.toLowerCase() ?? "";
  const host = hostHeader.split(":")[0];

  if (!isLocalHost(host, hostHeader)) {
    return false;
  }

  return isLocalHeaderUrl(request.headers.get("origin")) && isLocalHeaderUrl(request.headers.get("referer"));
}

function isLocalHost(host: string, hostHeader: string): boolean {
  return host === "localhost" || host === "127.0.0.1" || host === "::1" || hostHeader.startsWith("[::1]");
}

function isLocalHeaderUrl(value: string | null): boolean {
  if (!value) {
    return true;
  }

  try {
    const url = new URL(value);
    return url.hostname === "localhost" || url.hostname === "127.0.0.1" || url.hostname === "::1" || url.hostname === "[::1]";
  } catch {
    return false;
  }
}

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export function sanitizeFilename(value: string): string {
  const parts = value.split(".");
  const extension = parts.length > 1 ? `.${parts.pop()?.toLowerCase().replace(/[^a-z0-9]/g, "")}` : "";
  const base = slugify(parts.join(".") || "media");
  return `${base || "media"}${extension}`;
}

export function escapeFrontmatter(value: string): string {
  return String(value).replaceAll("\\", "\\\\").replaceAll('"', '\\"');
}

export function isStudioSection(value: unknown): value is StudioSection {
  return typeof value === "string" && studioSections.includes(value as StudioSection);
}
