import type { RecordEntry, RecordSection } from "@/lib/types";
import type { SteamRecordSeed } from "@/public/steam-display.mjs";
import type { SetupGroupId } from "@/components/archive/setup-utils";

export type InlineSection = "logs" | "games" | "projects" | "setup";

export function supportsInlineEditing(section: RecordSection): section is InlineSection {
  return section === "logs" || section === "games" || section === "projects" || section === "setup";
}

export function newInlineRecord(section: InlineSection, seed?: SteamRecordSeed, now = new Date(), setupGroup: SetupGroupId = "systems"): RecordEntry {
  const date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const setup = section === "setup" ? {
    systems: { title: "New System", type: "System Profile" },
    tools: { title: "New Shortcut", type: "Tool Shortcut" },
    peripherals: { title: "New Peripheral", type: "Peripheral" },
    notes: { title: "New Setup Note", type: "Setup Note" }
  }[setupGroup] : null;
  // Window identity only: this record never enters the archive collection or a save payload.
  return {
    id: `__new:${section}${setup ? `:${setupGroup}` : seed ? `:${seed.steamAppId}` : ""}`,
    title: setup?.title ?? (seed?.title || (section === "logs" ? "New Note" : section === "games" ? "New Game" : "New Project")),
    section, type: setup?.type ?? (section === "logs" ? "Field Note" : section === "games" ? "Play Log" : "Project Log"),
    status: "Draft", started: date, updated: date, summary: "", body: "", priority: 50, progress: 0, milestones: [],
    banner: seed?.banner || "", meta: setup ? { setupGroup } : seed ? { steamAppId: seed.steamAppId } : {}
  };
}
