// Only validated public data is loaded; internal development notes are never read.
export function validateRoadmap(value) {
  const object = (v, keys) => v && typeof v === "object" && !Array.isArray(v) && Object.keys(v).every((key) => keys.includes(key));
  const text = (v, max, empty = false) => typeof v === "string" && v.length <= max && (empty || v.trim().length > 0) && !/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(v);
  if (!object(value, ["title", "intro", "updated", "groups"]) || !text(value.title, 100) || !text(value.intro, 600, true) ||
      !/^\d{2} \/ \d{2} \/ \d{4}$/.test(value.updated) || !Array.isArray(value.groups) || value.groups.length !== 3) throw new Error("Invalid notebook data.");
  for (const [index, group] of value.groups.entries()) {
    if (!object(group, ["id", "title", "items"]) || group.id !== ["working", "ideas", "done"][index] ||
        !text(group.title, 80) || !Array.isArray(group.items) || group.items.length > (group.id === "done" ? 300 : 40)) throw new Error("Invalid notebook chapter.");
    for (const item of group.items) {
      if (!object(item, ["title", "detail", "version", "completed", "releasedOn"]) || !text(item.title, 160) || !text(item.detail, 2000, true) ||
          (item.completed !== undefined && typeof item.completed !== "boolean") ||
          (item.version !== undefined && (group.id !== "done" || !/^v\d+\.\d+\.\d+$/.test(item.version))) ||
          (item.releasedOn !== undefined && (group.id !== "done" || !item.version || !validReleaseDate(item.releasedOn)))) throw new Error("Invalid notebook item.");
    }
  }
  const dates = new Map();
  for (const item of value.groups[2].items) {
    if (dates.has(item.version) && dates.get(item.version) !== item.releasedOn) throw new Error("A release must have one consistent date.");
    dates.set(item.version, item.releasedOn);
  }
  if (JSON.stringify(value).length > 180000) throw new Error("Notebook is too large.");
  return value;
}

export function validReleaseDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T12:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function releaseDateLabel(value) {
  return validReleaseDate(value) ? value.split("-").reverse().join(" / ") : "";
}

export function fileNotebookRelease(data, filing) {
  validateRoadmap(data);
  const version = typeof filing?.version === "string" ? filing.version.trim().replace(/^v?/, "v") : "";
  if (!/^v(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(version) || version.length > 32) throw new Error("Enter a release version such as v1.70.0.");
  if (!validReleaseDate(filing?.date)) throw new Error("Choose a valid release date.");
  if (data.groups[2].items.some((item) => item.version === version)) throw new Error("That version is already filed. Choose a new release version.");
  if (!Array.isArray(filing.items) || !filing.items.length || filing.items.length > 80 || new Set(filing.items).size !== filing.items.length) throw new Error("Choose at least one completed item, without duplicates.");
  const selected = new Set(filing.items);
  const filed = [];
  const groups = data.groups.map((group) => group.id === "done" ? group : { ...group, items: group.items.filter((item, index) => {
    if (!selected.has(`${group.id}:${index}`)) return true;
    if (!item.completed) throw new Error("Only completed work can be filed.");
    filed.push({ title: item.title, detail: item.detail, version, releasedOn: filing.date });
    return false;
  }) });
  if (filed.length !== selected.size) throw new Error("The selected work changed. Reopen release filing and select it again.");
  groups[2] = { ...groups[2], items: [...filed, ...groups[2].items] };
  return validateRoadmap({ ...data, groups });
}

export async function loadRoadmap(url = new URL("./data/roadmap.json", import.meta.url), fetchImpl = fetch) {
  const response = await fetchImpl(url, { cache: "no-cache" });
  if (!response.ok) throw new Error("Notebook unavailable.");
  return validateRoadmap(await response.json());
}

// Filed history follows the curated newest-first order, grouped by real release.
export function buildRoadmapHistory(data) {
  const releases = new Map();
  for (const item of data.groups.find((group) => group.id === "done")?.items || []) {
    const version = item.version || "Unversioned";
    if (!releases.has(version)) releases.set(version, { version, title: item.title, releasedOn: item.releasedOn, items: [] });
    releases.get(version).items.push(item);
  }
  return [...releases.values()];
}
