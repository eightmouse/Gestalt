import type { RecordEntry, RecordSection } from "@/lib/types";
import type { SteamRecordSeed } from "@/public/steam-display.mjs";

export type InlineSection = "logs" | "games" | "projects";

export function supportsInlineEditing(section: RecordSection): section is InlineSection {
  return section === "logs" || section === "games" || section === "projects";
}

export function newInlineRecord(section: InlineSection, seed?: SteamRecordSeed, now = new Date()): RecordEntry {
  const date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  // Window identity only: this record never enters the archive collection or a save payload.
  return {
    id: `__new:${section}${seed ? `:${seed.steamAppId}` : ""}`,
    title: seed?.title || (section === "logs" ? "New Note" : section === "games" ? "New Game" : "New Project"),
    section, type: section === "logs" ? "Field Note" : section === "games" ? "Play Log" : "Project Log",
    status: "Draft", started: date, updated: date, summary: "", body: "", priority: 50, progress: 0, milestones: [],
    banner: seed?.banner || "", meta: seed ? { steamAppId: seed.steamAppId } : {}
  };
}
