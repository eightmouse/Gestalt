import noteInline from "@/public/note-inline.js";

export type NoteFormat = "heading1" | "heading" | "subheading" | "list" | "quote" | "bold" | "italic" | "code";

export function formatNoteSelection(body: string, start: number, end: number, format: NoteFormat) {
  if (format === "bold" || format === "italic" || format === "code") return formatInlineSelection(body, start, end, format);
  const prefixes = { heading1: "# ", heading: "## ", subheading: "### ", list: "- ", quote: "> " };
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
    const oldPrefix = remove ? prefix : format === "heading1" || format === "heading" || format === "subheading"
      ? line.match(/^#{1,3} /)?.[0] || ""
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

function inlineSelectionProblem(body: string, start: number, end: number): string | undefined {
  const intersects = (from: number, to: number) => start === end ? start >= from && start < to : start < to && end > from;
  const message = "Images, note boundaries and link destinations cannot be formatted as text.";
  for (let index = 0; index < body.length; index += 1) {
    if ((index === 0 || body[index - 1] === "\n") && body.startsWith(":::", index)) {
      const next = body.indexOf("\n", index);
      const to = next === -1 ? body.length : next;
      if (intersects(index, to)) return message;
      index = to;
      continue;
    }
    const image = body[index] === "!" && body[index + 1] === "[";
    if (!image && body[index] !== "[") continue;
    const labelEnd = body.indexOf("](", index + 1);
    if (labelEnd === -1) break;
    const nextLine = body.indexOf("\n", index);
    if (nextLine !== -1 && nextLine < labelEnd) { index = nextLine; continue; }
    let to = labelEnd + 2;
    let nesting = 1;
    while (to < body.length && body[to] !== "\n" && nesting > 0) {
      if (body[to] === "(") nesting += 1;
      if (body[to] === ")") nesting -= 1;
      to += 1;
    }
    if (intersects(image ? index : labelEnd + 2, to)) return message;
    index = to - 1;
  }
}

function formatInlineSelection(body: string, start: number, end: number, format: "bold" | "italic" | "code") {
  start = Math.max(0, Math.min(body.length, start));
  end = Math.max(start, Math.min(body.length, end));
  const error = inlineSelectionProblem(body, start, end);
  if (error) return { body, start, end, error };
  const selection = body.slice(start, end);
  const runLength = Math.max(0, ...Array.from(selection.matchAll(/`+/g), (match) => match[0].length));
  let marker = format === "bold" ? "**" : format === "italic" ? "*" : "`".repeat(runLength + 1);
  const beforeRun = body.slice(0, start).match(format === "code" ? /`+$/ : /\*+$/)?.[0].length || 0;
  const afterRun = body.slice(end).match(format === "code" ? /^`+/ : /^\*+/)?.[0].length || 0;
  const includesStyle = (length: number) => format === "italic" ? length === 1 || length === 3 : format === "bold" ? length === 2 || length === 3 : length === marker.length;
  if (format === "code") {
    const ownRun = selection.match(/^`+/)?.[0];
    if (beforeRun === afterRun && beforeRun > 0 && beforeRun <= 8) marker = "`".repeat(beforeRun);
    else if (ownRun && ownRun.length <= 8 && selection.endsWith(ownRun) && selection.length > ownRun.length * 2) marker = ownRun;
  }
  if (marker.length > 8) return { body, start, end, error: "This code selection contains too many consecutive backticks." };
  const adjacent = includesStyle(beforeRun) && includesStyle(afterRun);
  const from = adjacent ? start - marker.length : start;
  const to = adjacent ? end + marker.length : end;
  const selected = body.slice(from, to) || (format === "code" ? "code" : "text");
  const lines = selected.split(/(\r?\n)/);
  const contentLines = lines.filter((line, index) => index % 2 === 0 && line.trim());
  const remove = contentLines.length > 0 && contentLines.every((line) => {
    const first = line.match(format === "code" ? /^`+/ : /^\*+/)?.[0].length || 0;
    const last = line.match(format === "code" ? /`+$/ : /\*+$/)?.[0].length || 0;
    return includesStyle(first) && includesStyle(last) && line.length > marker.length * 2;
  });
  const replacement = lines.map((line, index) => index % 2 || !line.trim() ? line : remove
    ? line.slice(marker.length, -marker.length)
    : `${marker}${line}${marker}`).join("");
  return {
    body: body.slice(0, from) + replacement + body.slice(to),
    start: from + (remove ? 0 : marker.length),
    end: from + replacement.length - (remove ? 0 : marker.length)
  };
}

export function insertNoteLink(body: string, start: number, end: number, destination: string) {
  start = Math.max(0, Math.min(body.length, start));
  end = Math.max(start, Math.min(body.length, end));
  const href = noteInline.safeNoteHref(destination.trim());
  const error = inlineSelectionProblem(body, start, end);
  const label = body.slice(start, end) || "link text";
  if (!href || error || /[\r\n\[\]\\]/.test(label)) {
    return { body, start, end, error: error || (!href ? "Enter a valid HTTP or HTTPS link without embedded credentials." : "A link label must be a single line without brackets or backslashes.") };
  }
  const markdown = `[${label}](${href})`;
  return { body: body.slice(0, start) + markdown + body.slice(end), start: start + 1, end: start + 1 + label.length };
}
