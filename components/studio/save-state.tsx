export type SaveState = "new" | "unsaved" | "saved" | "saving";

export function StudioSaveState({ state }: { state: SaveState }) {
  return <span className="studio-save-state" data-save-state={state} role="status">
    {state === "new" ? "New draft" : state === "unsaved" ? "Unsaved changes" : state === "saving" ? "Saving locally..." : "Saved locally"}
  </span>;
}
