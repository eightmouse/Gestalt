type GameStateRecord = {
  section?: string;
  status: string;
  meta?: Record<string, unknown>;
  gamePlacement?: unknown;
  gameActivity?: unknown;
};

export function gameLogPlacement(record: GameStateRecord): "session" | "past" {
  const fields = record.meta ?? record;
  if (fields.gamePlacement === "session" || fields.gamePlacement === "past") return fields.gamePlacement;
  return ["active", "in progress", "on hold", "paused", "planning", "playing"].includes(record.status.toLowerCase()) ? "session" : "past";
}

export function gameActivityValue(record: GameStateRecord): "active" | "inactive" | "" {
  const value = (record.meta ?? record).gameActivity;
  return value === "active" || value === "inactive" ? value : "";
}

export function gameActivityLabel(record: GameStateRecord): string {
  const activity = gameActivityValue(record);
  return record.section === "games" && gameLogPlacement(record) === "session" && activity
    ? activity === "active" ? "Active" : "Inactive"
    : record.status;
}
