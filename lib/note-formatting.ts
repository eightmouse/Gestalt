export type NoteFormat = "heading" | "subheading" | "list" | "quote";

export function formatNoteSelection(body: string, start: number, end: number, format: NoteFormat) {
  const prefixes: Record<NoteFormat, string> = { heading: "## ", subheading: "### ", list: "- ", quote: "> " };
  const prefix = prefixes[format];
  const selectionStart = Math.max(0, Math.min(body.length, start));
  const selectionEnd = Math.max(selectionStart, Math.min(body.length, end));
  const blockStart = selectionStart === 0 ? 0 : body.lastIndexOf("\n", selectionStart - 1) + 1;
  const nextBreak = body.indexOf("\n", Math.max(selectionStart, selectionEnd - 1));
  const blockEnd = nextBreak === -1 ? body.length : nextBreak;
  const lines = body.slice(blockStart, blockEnd).split("\n");
  const editable = (line: string) => !/^\s*(?:!\[.*\]\(.*\)|:::.*|---|## Update Index)\s*$/.test(line)
    && (Boolean(line.trim()) || (selectionStart === selectionEnd && lines.length === 1));
  const eligible = lines.filter(editable);
  const remove = eligible.length > 0 && eligible.every((line) => line.startsWith(prefix));
  const edits: Array<{ at: number; removed: number; added: number }> = [];
  let offset = blockStart;
  const result = lines.map((line) => {
    const at = offset;
    offset += line.length + 1;
    if (!editable(line)) return line;
    const oldPrefix = remove ? prefix : format === "heading" || format === "subheading"
      ? line.match(/^#{2,3} /)?.[0] || ""
      : line.startsWith(prefix) ? prefix : "";
    const newPrefix = remove ? "" : prefix;
    edits.push({ at, removed: oldPrefix.length, added: newPrefix.length });
    return newPrefix + line.slice(oldPrefix.length);
  }).join("\n");

  // Map the existing selection through prefix edits; media and unrelated lines stay untouched.
  const mapPosition = (position: number) => {
    let delta = 0;
    for (const edit of edits) {
      if (position < edit.at) break;
      if (position < edit.at + edit.removed) return edit.at + delta + edit.added;
      delta += edit.added - edit.removed;
    }
    return position + delta;
  };

  return {
    body: body.slice(0, blockStart) + result + body.slice(blockEnd),
    start: mapPosition(selectionStart),
    end: mapPosition(selectionEnd)
  };
}
