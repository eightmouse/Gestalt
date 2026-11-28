import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import pocket from "../public/pocket-index.js";

const storage = () => {
  const values = new Map();
  return { getItem: (key) => values.get(key), setItem: (key, value) => values.set(key, value) };
};
const signal = (matches) => {
  const listeners = new Map();
  return { matches, listeners, addEventListener: (key, value) => listeners.set(key, value), removeEventListener: (key) => listeners.delete(key) };
};
const width = signal(true), motion = signal(false), boot = signal(false);
const timers = new Map(), attributes = new Set();
let completed = 0, cancelled = 0, id = 0;
const host = {
  matchMedia: (query) => query.includes("reduced-motion") ? motion : width,
  localStorage: storage(), sessionStorage: storage(),
  setTimeout: (callback) => { timers.set(++id, callback); return id; },
  clearTimeout: (key) => timers.delete(key)
};
boot.parentElement = { hidden: false };
const meter = { animate: () => ({ cancel: () => cancelled++ }) };
const shell = {
  querySelector: (selector) => selector === ".pocket-boot-screen" ? boot : meter,
  setAttribute: (key) => attributes.add(key), removeAttribute: (key) => attributes.delete(key)
};
const start = (mode = "once", remember = true) => pocket.runBoot(shell, () => completed++, { mode, remember }, host);
const finish = () => boot.listeners.get("animationend")({ target: boot, animationName: "pocket-boot-wipe" });

assert.equal(pocket.saveBootMode("always", host), false, "No preference is stored without local memory");
assert.equal(pocket.readBootMode(host), "once");
host.localStorage.setItem("gestalt.local-memory", "granted");
assert.equal(pocket.saveBootMode("always", host), true);
assert.equal(pocket.readBootMode(host), "always");
start();
assert.equal(completed, 0);
assert.ok(attributes.has("data-pocket-booting"));
finish();
assert.equal(completed, 1);
assert.ok(boot.parentElement.hidden);
assert.equal(timers.size + motion.listeners.size + width.listeners.size + attributes.size, 0);
assert.equal(cancelled, 1);
start();
assert.equal(completed, 2, "Play once skips the same tab's next document");
start("always");
assert.equal(completed, 2);
width.matches = false;
width.listeners.get("change")();
assert.equal(completed, 3, "Resizing off the handheld boot releases the surface");
width.matches = true;
motion.matches = true;
start("always");
assert.equal(completed, 4, "Reduced motion skips even Always");
assert.equal(timers.size, 0);

const curves = [0, 0.23, 0.57, 0.999].map((sample) => pocket.meterFrames(() => sample));
assert.equal(new Set(curves.map((curve) => JSON.stringify(curve))).size, curves.length);
for (const curve of curves) {
  assert.equal(curve[0].transform, "scaleX(0)");
  assert.equal(curve.at(-1).transform, "scaleX(1)");
  const fills = curve.map((point) => Number(point.transform.slice(7, -1)));
  for (let i = 1; i < curve.length; i++) assert.ok(curve[i].offset > curve[i - 1].offset && fills[i] > fills[i - 1]);
}
assert.deepEqual(pocket.directory.map(([id]) => id), ["projects", "games", "logs", "setup", "archive"]);
const records = Array.from({ length: 13 }, (_, i) => `record-${i + 1}`);
const first = pocket.recordPage(records);
assert.deepEqual(first, { records: records.slice(0, 4), page: 0, pages: 4 });
assert.deepEqual(Array.from({ length: first.pages }, (_, page) => pocket.recordPage(records, page).records).flat(), records);
assert.deepEqual(pocket.recordPage(records, 99), { records: ["record-13"], page: 3, pages: 4 });
assert.equal(pocket.recordPage(records, -1).page, 0);
assert.equal(pocket.recordPage(records, 1.5).page, 0);
assert.deepEqual(pocket.recordPage([]), { records: [], page: 0, pages: 1 });
assert.deepEqual(pocket.recordPage(records, 1, false), { records: records.slice(6, 12), page: 1, pages: 3 });
assert.deepEqual(Array.from({ length: 3 }, (_, page) => pocket.recordPage(records, page, false).records).flat(), records);
const shelf = [{ title: "Kingdom Hearts" }, { title: "Pokémon" }, { title: "Kingdom Hearts II" }];
assert.equal(pocket.filterShelfGames(shelf, "   "), shelf);
assert.deepEqual(pocket.filterShelfGames(shelf, "HEARTS"), [shelf[0], shelf[2]]);
assert.deepEqual(pocket.filterShelfGames(shelf, " pokemon "), [shelf[1]]);
assert.deepEqual(pocket.filterShelfGames(shelf, "not found"), []);
assert.equal(pocket.gameShelfIndex([0, 3]), 1, "Open a populated shelf first");
assert.equal(pocket.gameShelfIndex([0, 3], 0), 0, "Respect a direct tap even when its shelf is empty");
assert.equal(pocket.gameShelfIndex([2, 3], undefined, 1), 1, "Search stays on the chosen shelf if it has a match");
assert.equal(pocket.gameShelfIndex([2, 0], undefined, 1), 0, "Search reveals matches on the other shelf");
const workbenchProjects = [
  { id: "shell", progress: 70, summary: "A brief", milestones: [{ label: "Ready", status: "Done", progress: 100 }] },
  { id: "editor", progress: 112, milestones: [{ label: "Review", status: "Planning", progress: 0 }, { label: "Draft", status: "In Progress", progress: 50 }] },
  { id: "reader", progress: -1, milestones: [{ label: "Layout", status: "In Progress", progress: 70 }, { label: "  Assets ", status: "Blocked", progress: 0 }] }
];
assert.equal(pocket.projectWorkbench([]), null);
const ready = { label: "Ready", state: "ready", value: "Done" };
assert.deepEqual(pocket.projectWorkbench(workbenchProjects, "removed"), { record: workbenchProjects[0], index: 0, progress: 70, brief: "A brief", stops: [ready], more: 0, nextStop: ready });
assert.equal(pocket.projectWorkbench(workbenchProjects, "editor").progress, 100);
assert.deepEqual(pocket.projectWorkbench(workbenchProjects, "editor").stops, [{ label: "Review", state: "queued", value: "Planning" }, { label: "Draft", state: "working", value: "50%" }]);
assert.equal(pocket.projectWorkbench(workbenchProjects, "reader").progress, 0);
assert.deepEqual(pocket.projectWorkbench(workbenchProjects, "reader").stops.at(-1), { label: "Assets", state: "blocked", value: "Blocked" });
assert.deepEqual(pocket.projectWorkbench([{ id: "only", progress: 0 }]).stops, []);
const crowded = { ...workbenchProjects[2], milestones: [...workbenchProjects[1].milestones, ...workbenchProjects[1].milestones, ...workbenchProjects[2].milestones] };
assert.equal(pocket.projectWorkbench([crowded]).more, 2, "The fixed reader reserves space for at most four stops");
assert.equal(pocket.projectWorkbench([crowded]).stops.at(-1).state, "blocked", "A blocker remains visible beyond the first four steps");
assert.equal(pocket.projectWorkbench([crowded]).nextStop.state, "blocked", "The compact readout prioritizes a blocker over the rest");
assert.equal(pocket.projectWorkbench(workbenchProjects, "editor").nextStop.label, "Draft", "A running milestone comes before queued work");
const testingProject = { id: "prism", progress: 67, milestones: [{ label: "Client testing", status: "In Progress", progress: 0 }] };
assert.deepEqual(pocket.projectWorkbench([testingProject]).stops, [{ label: "Client testing", state: "working", value: "In Progress" }], "Qualitative milestones do not need invented percentages");
const bench = pocket.projectBench({ started: "2026-04-05" }, [
  { id: "n-new", title: "27 / 11 / 2026 - Field Papers (v1.85)", body: "### Heading\n![shot](/media/a.png)\nLogs became **Field Papers**: see [the desk](https://example.com).\n\nSecond paragraph." },
  { id: "n-old", title: "1 / 5 / 2026 - Older", body: "Old." }
], { screen: " /media/shot.png ", stack: ["JavaScript", " ", "CSS"] });
assert.deepEqual(bench, { started: "05 / 04 / 2026", noteCount: 2, latest: { id: "n-new", date: "27 / 11 / 2026", title: "Field Papers (v1.85)", excerpt: "Logs became Field Papers: see the desk." }, earlier: 1, earlierNotes: [], screen: "/media/shot.png", stack: ["JavaScript", "CSS"], moreStack: 0 }, "The bench reads the newest note as plain text, without headings, images or markup");
assert.deepEqual(pocket.projectBench({}, [{ id: "main", title: "Current note", body: "Loose body" }]), { started: "", noteCount: 0, latest: null, earlier: 0, earlierNotes: [], screen: "", stack: [], moreStack: 0 }, "An undated body is not presented as a filed note, and empty fields stay empty");
assert.ok(pocket.projectBench({}, [{ id: "n-a", title: "Untimed", body: "x ".repeat(200) }]).latest.excerpt.length <= 181, "Long notes are clipped to a short excerpt");
assert.equal(pocket.projectBench({}, [{ id: "n-a", title: "Untimed", body: "" }]).latest.date, "", "Notes without a date heading do not get one invented");
const bodyBench = pocket.projectBench({ updated: "2026-02-07" }, [{ id: "main", title: "Current note", body: "## Description\nFirst paragraph.\n\nSecond paragraph." }], { excerpt: 1200, body: true });
assert.deepEqual(bodyBench.latest, { id: "main", date: "07 / 02 / 2026", title: "Description", excerpt: "First paragraph.\n\nSecond paragraph." },"With no dated notes, a project bench shows its record body, titled by its first heading and dated by its last update");
assert.equal(bodyBench.noteCount, 0, "The body is not counted as a filed note");
assert.equal(pocket.projectBench({}, [], { stack: Array.from({ length: 8 }, (_, i) => `S${i}`) }).moreStack, 2);
const linux = pocket.machineReadout([{ label: "Model", value: "MSI GF63 Thin 11SC" }, { label: "CPU", value: "Intel Core i5-11400H" }, { label: "RAM", value: "12GB RAM" }, { label: "GPU", value: "NVIDIA GTX 1650" }, { label: "GPU", value: "Intel UHD Graphics" }, { label: "OS", value: "Arch Linux + Hyprland" }], { title: "Linux Setup", user: "Eightmouse" });
assert.equal(linux.host, "eightmouse@arch", "The host comes from the OS line");
assert.equal(linux.entry, "Arch Linux", "The boot entry is the OS, without its desktop");
assert.deepEqual(linux.rows.map((row) => row.label), ["OS", "Model", "CPU", "GPU", "GPU", "RAM"], "Neofetch order, both GPUs kept in their filed order");
assert.deepEqual(pocket.machineReadout([{ label: "Board", value: "X" }], { title: "Spare Rig" }), { host: "operator@spare", entry: "Spare Rig", rows: [{ label: "Board", value: "X" }] }, "Without an OS line the title names the machine; unknown lines still show");
assert.equal(pocket.machineReadout([], {}).entry, "Machine");
// Recent Activity: one or two entries of a record keep a row each; three or more fold into one row.
const act = (record, n) => ({ id: record + ":" + n, record: { id: record }, noteTitle: record + " " + n });
const flood = [act("g", 1), act("g", 2), act("a", 1), act("g", 3), act("g", 4), act("b", 1), act("c", 1), act("d", 1), act("e", 1), act("f", 1), act("g", 5)];
const folded = pocket.condenseActivity(flood, 6);
assert.deepEqual(folded.map((item) => item.id), ["g:1", "a:1", "b:1", "c:1", "d:1", "e:1"], "A flooding record takes one row and the freed rows go to the records after it");
assert.deepEqual([folded[0].more, folded[0].moreTitles], [3, ["g 2", "g 3", "g 4"]], "The folded row counts and names the rest it covers, newest first");
assert.deepEqual(pocket.condenseActivity([act("g", 1), act("g", 2), act("a", 1)], 6).map((item) => item.id), ["g:1", "g:2", "a:1"], "Two entries of one record still show as two rows");
assert.equal(pocket.condenseActivity([act("g", 1), act("g", 2), act("a", 1)], 6)[0].more, undefined, "No chip below three");
assert.equal(pocket.condenseActivity(Array.from({ length: 9 }, (_, i) => act("r" + i, 1)), 6).length, 6, "Never more rows than asked for");
assert.deepEqual(pocket.condenseActivity([], 6), []);
// Dashboard plates: only filed data, nothing invented.
assert.equal(pocket.readingMinutes("word ".repeat(700)), 3, "About 220 words a minute");
assert.equal(pocket.readingMinutes("Short."), 1, "Anything written takes at least a minute");
assert.equal(pocket.readingMinutes(""), 0, "No text, no reading time");
assert.equal(pocket.readingMinutes(":::note 01 / 01 / 2026 - T {#n-a}\n![x](/a.png)\n:::"), 0, "Note markers and images are not words");
const milestones = [{ label: "Shell", progress: 100, status: "Ready" }, { label: "Release", progress: 0, status: "Queued" }];
assert.equal(pocket.projectLine({ id: "p", progress: 50, milestones }), "next: Release", "The next unfinished milestone");
assert.equal(pocket.projectLine({ id: "p", progress: 100, milestones: [milestones[0]] }, [{ id: "n-a", title: "30 / 10 / 2026 - Hi", body: "" }]), "note 30/10", "All done: the latest note's date");
assert.equal(pocket.projectLine({ id: "p", progress: 0, milestones: [] }), "", "Nothing filed, nothing shown");
const plate = pocket.gamePlate({ title: "D", completion: "38% Achievements", playtime: "212h", lastPlayed: null }, { id: "d" }, [{ id: "n-a", title: "05 / 11 / 2026 - Pleasant surprise", body: "" }]);
assert.deepEqual(plate.figures.map((figure) => figure.label), ["Play time", "Achievements"], "Unknown figures are left out, not dashed");
assert.equal(plate.share, 38);
assert.deepEqual(plate.note, { title: "Pleasant surprise", date: "05 / 11 / 2026" });
assert.equal(pocket.gamePlate({ title: "D" }, null).share, null, "No achievements, no bar");
assert.equal(pocket.gameDrive(null), null, "No current game leaves the drive empty");
const steamDrive = pocket.gameDrive({ title: "FINAL FANTASY XIV Online", status: "Playing", completion: "42% Achievements", playtime: "1088.0h", lastPlayed: "26 / 11 / 2026" }, { id: "ff", status: "Playing" }, [{ id: "n-a", title: "26 / 11 / 2026 - Phantom", body: "Near the end." }, { id: "n-b", title: "Older", body: "" }]);
assert.deepEqual(steamDrive.figures.map(({ value }) => value), ["1088.0h", "26 / 11 / 2026", "42%"]);
assert.deepEqual([steamDrive.recordId, steamDrive.latest.title, steamDrive.earlier], ["ff", "Phantom", 1]);
assert.deepEqual(steamDrive.earlierNotes, [{ id: "n-b", date: "", title: "Older" }], "The drive lists the notes before the latest, date and title only");
assert.ok(pocket.gameDrive({ title: "Long" }, { id: "l" }, [{ id: "n-a", title: "x", body: "word ".repeat(200) }]).latest.excerpt.length > 400, "The drive shows more of the latest note than a bench does");
assert.equal(pocket.gameDrive({ title: "Many" }, { id: "m" }, Array.from({ length: 6 }, (_, i) => ({ id: "n-" + i, title: "Note " + i, body: "" }))).earlierNotes.length, 3, "At most three earlier notes");
const authoredDrive = pocket.gameDrive({ title: "Deadlock", status: "Playing", completion: "100% Complete", playtime: null, lastPlayed: "" }, { id: "dl", status: "Playing" });
assert.deepEqual(authoredDrive.figures, [{ label: "Play time", value: "—" }, { label: "Last played", value: "—" }, { label: "Achievements", value: "—" }], "Unknown figures read as a dash, and a record's generic progress is never shown as completion");
assert.equal(pocket.gameDrive({ title: "Unfiled" }, undefined, [{ id: "n-a", title: "x", body: "y" }]).latest, null, "A Steam game without a record shows no borrowed notes");
assert.equal(pocket.weatherTrace(undefined), null, "No forecast draws no line");
assert.equal(pocket.weatherTrace([18, "x"]), null, "One usable reading is not a trend");
const thermo = pocket.weatherTrace([14, 16, 30, "x", 22]);
assert.deepEqual([thermo.hours, thermo.low, thermo.high, thermo.now], [4, 14, 30, [0, 26]], "Unreadable hours are skipped; now is the first point");
assert.equal(thermo.points, "0,26 33.3,23.3 66.7,4 100,15", "The line spans the box: highs near the top, lows near the bottom");
assert.equal(pocket.weatherTrace([9, 9, 9]).points, "0,15 50,15 100,15", "A steady day is a level line through the middle");
assert.equal(pocket.weatherTrace(Array.from({ length: 30 }, (_, i) => i)).hours, 12, "Only the next 12 hours are drawn");
const dispatch = (id, day, section, recordId = id, content = "notes") => ({ id, date: `2026-11-${day}`, record: { id: recordId, section }, content });
const today = Date.parse("2026-11-17T12:00:00Z");
const firstNote = dispatch("note-1", 17, "games", "game", "notes");
const secondNote = dispatch("note-2", 11, "games", "game", "notes");
assert.deepEqual(pocket.recentDispatches("featured", [
  dispatch("future", 18, "projects"), dispatch("featured-note", 17, "logs", "featured"),
  dispatch("hardware", 17, "setup"), dispatch("metadata", 17, "projects", "metadata", "overview"),
  firstNote, firstNote, secondNote, dispatch("third-note", 11, "logs")
], today), [firstNote, secondNote], "At most two recent real notes, no future items, featured duplicates or non-note project updates");
assert.deepEqual(pocket.recentDispatches(undefined, [dispatch("stale", 10, "logs")], today), [], "Quiet weeks do not get archive filler");
assert.match(pocket.bootMarkup, /<dt>Server<\/dt><dd>Online<\/dd>/);
assert.doesNotMatch(readFileSync(new URL("../public/pocket-index.js", import.meta.url), "utf8"), /fetch\(|navigator\.|setInterval\(/);
const read = (file) => readFileSync(new URL(`../${file}`, import.meta.url), "utf8");
assert.match(read("index.html"), /name="viewport"[^>]+viewport-fit=cover/);
assert.match(read("app/page.tsx"), /viewportFit:\s*"cover"/);
const css = read("app/pocket-index.css");
assert.match(css, /\.record-selector--games \.record-sleeve-label strong\s*\{[^}]*display: block;[^}]*overflow: visible;[^}]*padding-inline:/, "Tape labels wrap with clearance for handwritten glyphs");
for (const side of ["top", "right", "bottom", "left"]) assert.ok(css.includes(`env(safe-area-inset-${side}, 0px)`));
assert.match(css, /\.pocket-header \{[^}]*padding: calc\(9px \+ var\(--pocket-safe-top\)\)/);
assert.match(css, /\.archive-shell:has\(> \.pocket-header\) > \.workspace \{[^}]*calc\(24px \+ var\(--pocket-safe-bottom\)\)/);
assert.match(read("static-app.js"), /<button class="pocket-brand" type="button" aria-label="Gestalt home" data-home>/);
assert.match(read("components/archive/pocket-index.tsx"), /<button className="pocket-brand" type="button" aria-label="Gestalt home" onClick=\{onHome\}>/);
assert.match(read("components/archive-os.tsx"), /<PocketHeader[^>]+onHome=\{openHome\}/);
assert.match(css, /\.record-window \.record-link-button \{[^}]*inline-size: 44px;[^}]*block-size: 44px;[^}]*border: 0;/);
assert.match(css, /\.pocket-directory \.nav-mark \{ inline-size: 24px; block-size: 26px; \}/, "Directory glyphs keep their own centered artboard");
const staticReader = read("static-app.js"), localReader = read("components/archive/record-window.tsx");
const logViews = [{ key: "overview", label: "Entry" }, { key: "notes", label: "Full Note" }];
const attachments = { key: "attachments", label: "Attachments" };
assert.equal(pocket.readingView("logs", "overview"), "notes");
assert.equal(pocket.readingView("logs", "attachments"), "attachments", "Explicitly requested attachments remain reachable");
assert.equal(pocket.readingView("games", "overview"), "overview");
assert.deepEqual(pocket.readingContents("logs", logViews), [{ key: "notes", label: "Notes" }]);
assert.deepEqual(pocket.readingContents("logs", [...logViews, attachments]), [{ key: "notes", label: "Notes" }, attachments]);
assert.equal(pocket.readingContents("projects", logViews), logViews, "Non-log sections do not change");
assert.match(staticReader, /<label class="pocket-record-contents"><span>Contents<\/span>/);
assert.match(localReader, /<label className="pocket-record-contents">\s*<span>Contents<\/span>/);
assert.match(staticReader, /\$\{handheld \? renderNoteSearch\(record\) : ""\}\s*<div class="note-stack">/);
assert.match(read("app/pocket-index.css"), /\.pocket-boot-mount\s*\{\s*display: contents;/, "The local handheld boot wrapper must not occupy a desktop grid cell");
assert.match(read("components/archive/record-content.tsx"), /\{searchControl\}\s*<div className="note-stack">/);
assert.doesNotMatch(css, /\[data-os-group="entry"\]/, "The shared Entry Animation preferences remain visible on handheld");
console.log("Pocket Index preferences, boot lifecycle, progress curves and record paging passed.");
