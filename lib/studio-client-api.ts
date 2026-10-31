import type { RecordSection } from "@/lib/types";

export type PublishSummary = {
  branch?: string; cacheToken?: string; changedFiles?: number; commit?: string;
  mediaAdded?: number; recordsChanged?: string[]; staticExported?: boolean;
};
export type PublishState = {
  phase: "running" | "success" | "error";
  title: string; detail: string; summary?: PublishSummary; output?: string;
};
export type StudioPendingRecord = { id: string; title: string; section?: RecordSection; change: "new" | "edited" | "deleted" };
export type StudioPendingChanges = {
  records: StudioPendingRecord[]; changedFiles: number; mediaFiles: number;
  staticDataChanged: boolean; staticExportRequired: boolean; unpushedCommits: number;
  siteCodeFiles?: string[];
};
export type StudioResponse = Partial<StudioPendingChanges> & {
  error?: string; code?: string; id?: string; message?: string; output?: string; path?: string;
  summary?: PublishSummary; staticExported?: boolean; published?: boolean;
  warning?: string; writtenAt?: string; writtenOrder?: number;
};

export class StudioRequestError extends Error {
  constructor(message: string, public output?: string) { super(message); this.name = "StudioRequestError"; }
}

export async function readStudioResponse(response: Response): Promise<StudioResponse> {
  const text = await response.text();
  if (!text) return {};
  try {
    const data = JSON.parse(text);
    return data && typeof data === "object" && !Array.isArray(data) ? data : { error: "Unexpected Studio response." };
  } catch { return { error: text.slice(0, 220), output: text }; }
}
