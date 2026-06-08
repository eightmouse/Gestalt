import type { RecordEntry } from "@/lib/types";
import { metaText, noteEntries, setupHardwareFallback } from "@/components/archive/record-utils";

export type SetupGroupId = "systems" | "tools" | "peripherals" | "notes";

export const setupGroupRegistry: Array<{ id: SetupGroupId; title: string; path: string; detail: string }> = [
  { id: "systems", title: "SYSTEMS", path: "/setup/systems", detail: "Operating systems, machines, rigs" },
  { id: "tools", title: "TOOLS", path: "/setup/tools", detail: "Apps, utilities, workflows" },
  { id: "peripherals", title: "PERIPHERALS", path: "/setup/peripherals", detail: "Input, display, audio, devices" },
  { id: "notes", title: "NOTES", path: "/setup/notes", detail: "Loose setup notes and pending files" }
];

export function setupGroupFor(record: RecordEntry): SetupGroupId {
  const haystack = [record.title, record.type, record.summary, metaText(record.meta.hardware)].join(" ").toLowerCase();

  if (/\b(keyboard|mouse|monitor|display|headset|speaker|audio|mic|microphone|controller|tablet|dock|peripheral|device)\b/.test(haystack)) {
    return "peripherals";
  }

  if (/\b(tool|tools|software|app|apps|utility|utilities|editor|launcher|workflow|script|stack)\b/.test(haystack)) {
    return "tools";
  }

  if (/\b(windows|linux|arch|os|pc|laptop|desktop|machine|rig|system|hardware)\b/.test(haystack)) {
    return "systems";
  }

  return "notes";
}

export function setupProfile(record: RecordEntry): { category: string; command: string; specs: Array<{ label: string; value: string }> } {
  const group = setupGroupFor(record);
  const category = setupGroupRegistry.find((item) => item.id === group)?.title ?? "NOTES";
  const specs = setupSpecRows(record);

  return {
    category,
    command: `cat ${setupGroupRegistry.find((item) => item.id === group)?.path ?? "/setup/notes"}/${record.id}.log`,
    specs
  };
}

export function setupPathFor(record: RecordEntry): string {
  const group = setupGroupFor(record);
  const path = setupGroupRegistry.find((item) => item.id === group)?.path ?? "/setup/notes";

  return `${path}/${record.id}`;
}

export function setupNarrativeNotes(record: RecordEntry): Array<{ title: string; body: string }> {
  return noteEntries(record.body).filter((note) => !setupNoteIsSpecOnly(note.body));
}

function setupNoteIsSpecOnly(body: string): boolean {
  const lines = body
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !line.startsWith("!") && !line.startsWith("#"));

  if (!lines.length) {
    return true;
  }

  return lines.every((line) => /^([^:]{2,32}):\s*(.+)$/.test(line));
}

function setupSpecRows(record: RecordEntry): Array<{ label: string; value: string }> {
  const source = setupHardwareSource(record);
  const privateLabel = /\b(serial|token|secret|password|passwd|key|path|host|hostname|user|username|email|address|phone|ip)\b/i;

  return source
    .split(/\r?\n/)
    .map((line) => line.trim())
    .map((line) => {
      const match = line.match(/^([^:]{2,32}):\s*(.+)$/);

      if (!match) {
        return null;
      }

      const label = match[1].trim();
      const value = match[2].trim();

      if (!label || !value || privateLabel.test(label)) {
        return null;
      }

      return { label, value };
    })
    .filter((row): row is { label: string; value: string } => Boolean(row))
    .slice(0, 8);
}

export function setupHardwareSource(record: RecordEntry): string {
  return metaText(record.meta.hardware) || setupHardwareFallback(record.body);
}
