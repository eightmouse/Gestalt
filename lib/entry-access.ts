export type EntryAccessMode = "first" | "always" | "off";

export function normalizeEntryAccessMode(value: unknown): EntryAccessMode {
  return value === "always" || value === "off" ? value : "first";
}

export function readEntryAccessMode(): EntryAccessMode {
  try {
    return normalizeEntryAccessMode(window.localStorage.getItem("gestalt.entry-animation"));
  } catch {
    return "first";
  }
}

export function saveEntryAccessMode(mode: EntryAccessMode): void {
  try {
    window.localStorage.setItem("gestalt.entry-animation", normalizeEntryAccessMode(mode));
  } catch {
    // The chosen mode still works for this visit when storage is unavailable.
  }
}

export function shouldPlayEntryAccess(mode: EntryAccessMode, played: boolean, reducedMotion: boolean): boolean {
  return !reducedMotion && (mode === "always" || (mode === "first" && !played));
}
