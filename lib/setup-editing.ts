const privateSpecLabel = /\b(serial|token|secret|password|passwd|key|path|host|hostname|user|username|email|address|phone|ip)\b/i;
const markdownPrefix = /^\s*(?:[#<>!*\[\]-]|::)/;

function editableRows(lines: string[]) {
  let fence = "";
  return lines.flatMap((line, index) => {
    const marker = /^\s*(```+|~~~+)/.exec(line)?.[1];
    if (marker && (!fence || marker[0] === fence[0] && marker.length >= fence.length)) {
      fence = fence ? "" : marker;
      return [];
    }
    if (fence || markdownPrefix.test(line)) return [];
    const match = /^([^:]{0,32}):[ \t]?(.*)$/.exec(line);
    if (!match || privateSpecLabel.test(match[1])) return [];
    return [{ index, label: match[1], value: match[2] }];
  });
}

export function setupSpecDraft(hardware: string, body: string) {
  const bodyLines = body.split(/\r?\n/);
  const legacyRows = hardware.trim() ? [] : editableRows(bodyLines);
  if (legacyRows.length) return { field: "body" as const, lines: bodyLines, rows: legacyRows };
  const lines = hardware ? hardware.split(/\r?\n/) : [];
  return { field: "hardware" as const, lines, rows: editableRows(lines) };
}

export function setupSpecLine(label: string, value: string) {
  if (label.length > 32 || label.includes(":") || /[\r\n]/.test(label + value) || markdownPrefix.test(label) || privateSpecLabel.test(label)) return null;
  return `${label}: ${value}`;
}

export function validSetupShortcut(value: string) {
  if (!value.trim()) return true;
  try {
    const url = new URL(value.trim());
    return /^https?:\/\/[^\s]+$/i.test(value.trim()) && !url.username && !url.password;
  } catch { return false; }
}
