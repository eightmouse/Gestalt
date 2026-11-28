(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.GestaltPocketIndex = api;
})(globalThis, function () {
  const directory = [
    ["projects", "02", "Projects"], ["games", "03", "Games"], ["logs", "04", "Logs"],
    ["setup", "05", "Setup"], ["archive", "06", "Field Archive"]
  ];
  const bootKey = "gestalt.handheld-boot";
  const seenKey = "gestalt.handheld-boot-seen";
  const stamp = '<span class="pocket-stamp" aria-hidden="true"><i></i><i></i><i></i></span>';
  const bootMarkup = `<div class="pocket-boot" aria-hidden="true"><div class="pocket-boot-screen"><div class="pocket-boot-panel">
    <div class="pocket-boot-ledger"><p>Checking systems...</p><dl><div><dt>Archive storage</dt><dd>Mounted</dd></div><div><dt>Server</dt><dd>Online</dd></div><div><dt>Reactor</dt><dd>Operational</dd></div></dl></div>
    <div class="pocket-boot-face"><div><strong>GESTALT</strong><span>HANDHELD FIELD MODE</span></div>${stamp}<div class="pocket-boot-meter"><i></i></div></div>
    </div></div><div class="pocket-boot-scan"></div></div>`;

  function isHandheld(host = globalThis.window) {
    return Boolean(host?.matchMedia("(max-width: 760px)").matches);
  }
  function readingView(section, view) {
    return section === "logs" && view === "overview" ? "notes" : view;
  }
  function readingContents(section, contents) {
    return section === "logs" ? contents.filter(({ key }) => key !== "overview")
      .map((item) => item.key === "notes" ? { ...item, label: "Notes" } : item) : contents;
  }
  function recordPage(records, requestedPage = 0, handheld = true) {
    const size = handheld ? 4 : 6;
    const pages = Math.max(1, Math.ceil(records.length / size));
    const page = Math.max(0, Math.min(pages - 1, Number.isInteger(requestedPage) ? requestedPage : 0));
    return { records: records.slice(page * size, (page + 1) * size), page, pages };
  }
  const shelfSearchMin = 8;
  function filterShelfGames(records, query) {
    const key = (value) => value.normalize("NFKD").replace(/\p{M}/gu, "").toLowerCase().trim();
    const term = key(query);
    return term ? records.filter(({ title }) => key(title).includes(term)) : records;
  }
  function gameShelfIndex(counts, selected, fallback = 0) {
    if (selected === 0 || selected === 1) return selected;
    const other = 1 - fallback;
    return counts[fallback] || !counts[other] ? fallback : other;
  }
  function fieldPaperStack(records, selectedId) {
    const index = Math.max(0, records.findIndex((record) => record.id === selectedId));
    const start = Math.min(index, Math.max(0, records.length - 3));
    return {
      record: records[index], index, total: records.length,
      edges: records.slice(start, start + 3).filter((record) => record !== records[index]),
      previous: records[index - 1]?.id, next: records[index + 1]?.id
    };
  }
  function projectWorkbench(records, selectedId) {
    const index = Math.max(0, records.findIndex((record) => record.id === selectedId));
    const record = records[index];
    if (!record) return null;
    const percent = (value) => Math.round(Math.min(100, Math.max(0, Number(value) || 0)));
    const stops = (record.milestones || []).filter((item) => item.label?.trim()).map((item) => {
      const label = item.label.trim();
      const status = item.status?.trim() || "Queued";
      const progress = percent(item.progress);
      const state = /^blocked$/i.test(status) ? "blocked" : progress === 100 ? "ready" : /active|in progress/i.test(status) ? "working" : "queued";
      return { label, state, value: state === "working" && progress > 0 ? `${progress}%` : status };
    });
    const visible = stops.slice(0, 4);
    const blocker = stops.find((item) => item.state === "blocked");
    if (blocker && !visible.includes(blocker)) visible[3] = blocker;
    const nextStop = blocker ?? stops.find((item) => item.state === "working")
      ?? stops.find((item) => item.state === "queued") ?? stops.at(-1);
    return { record, index, progress: percent(record.progress), brief: record.summary?.trim() || "", stops: visible, more: stops.length - visible.length, nextStop };
  }
  // Everything the desktop workbench shows beyond the plate itself. Renderers pass their own
  // parsed notes, image source and stack list; nothing here is invented when a field is empty.
  function projectBench(record, notes = [], { screen = "", stack = [], excerpt = 180, history = 0, body = false } = {}) {
    const filed = notes.filter((note) => note && note.id !== "main");
    const blocks = (text) => String(text || "").split(/\n\s*\n/)
      .map((block) => block.split(/\r?\n/).filter((line) => !/^\s*(?:!\[|<|:::|```|#{1,6}\s)/.test(line)).join(" "))
      .map((block) => block.replace(/\[([^\]]*)\]\([^)]*\)/g, "$1").replace(/(\*\*|__|`)/g, "").replace(/^\s*(?:[-*>]|\d+\.)\s+/, "").replace(/\s+/g, " ").trim())
      .filter(Boolean);
    // A short excerpt is the first paragraph; a longer one keeps the note's paragraphs, separated by a blank line.
    const plain = (text, size) => size > 180 ? blocks(text).join("\n\n") : blocks(text)[0] || "";
    const clip = (text, size = 180) => text.length <= size ? text : `${text.slice(0, text.lastIndexOf(" ", size) > size * .6 ? text.lastIndexOf(" ", size) : size).trim()}…`;
    const date = (value) => {
      const [year, month, day] = String(value || "").split("-");
      return year && month && day ? `${day} / ${month} / ${year}` : "";
    };
    const heading = (note) => {
      const match = /^(\d{1,2})\s*\/\s*(\d{1,2})\s*\/\s*(\d{4})\s*[-–—]\s*(.*)$/.exec(note.title || "");
      return {
        id: note.id || "",
        date: match ? `${match[1].padStart(2, "0")} / ${match[2].padStart(2, "0")} / ${match[3]}` : "",
        title: (match ? match[4] : note.title || "").trim() || "Untitled note"
      };
    };
    // With no dated notes, a record's own body can stand in (when asked): titled by its first heading,
    // dated by the record's last update.
    const main = body && !filed[0] ? notes.find((note) => note?.id === "main" && String(note.body || "").trim()) : null;
    const mainTitle = main ? (/^\s*#{1,6}\s+(.+)$/m.exec(main.body)?.[1] || "").trim() : "";
    const latest = filed[0] ? { ...heading(filed[0]), excerpt: clip(plain(filed[0].body, excerpt), excerpt) }
      : main ? { id: "main", date: date(record?.updated), title: mainTitle || "Notes", excerpt: clip(plain(main.body, excerpt), excerpt) } : null;
    // The notes filed before the latest, newest first, when asked for: date and title only.
    const earlierNotes = filed.slice(1, 1 + Math.max(0, history)).map(heading);
    const lines = (Array.isArray(stack) ? stack : []).map((item) => String(item).trim()).filter(Boolean);
    return { started: date(record?.started), noteCount: filed.length, latest, earlier: Math.max(0, filed.length - 1), earlierNotes, screen: String(screen || "").trim(), stack: lines.slice(0, 6), moreStack: Math.max(0, lines.length - 6) };
  }
  // A machine's readout, the way neofetch prints it: user@host, then OS, Model, CPU, GPU and RAM
  // in that order and any other filed lines after them. Built only from the record's own spec lines
  // (already parsed, private labels removed); the host and boot entry come from the OS line, or the
  // record's title when there is none. Nothing is invented.
  function machineReadout(specs = [], { title = "", user = "operator" } = {}) {
    const rows = (Array.isArray(specs) ? specs : [])
      .map((row) => ({ label: String(row?.label || "").trim(), value: String(row?.value || "").trim() }))
      .filter((row) => row.label && row.value);
    const order = ["os", "model", "cpu", "gpu", "ram", "memory"];
    const rank = (row) => { const index = order.indexOf(row.label.toLowerCase()); return index < 0 ? order.length : index; };
    const sorted = rows.map((row, index) => ({ row, index })).sort((a, b) => rank(a.row) - rank(b.row) || a.index - b.index).map(({ row }) => row).slice(0, 8);
    const os = rows.find((row) => row.label.toLowerCase() === "os")?.value || "";
    const entry = os.split(/\s+[+&|/]\s+/)[0].trim() || String(title).trim() || "Machine";
    const slug = (value) => (String(value).toLowerCase().match(/[a-z0-9]+/) || [""])[0];
    const host = slug(os) || slug(title) || "machine";
    return { host: `${slug(user) || "operator"}@${host}`, entry, rows: sorted };
  }
  // A game disk's wear: where its picture is faded, the angle of a faint crease and how heavy the
  // grain is. Derived from the record id, so every disk is different and each stays the same.
  function diskWear(id = "") {
    let hash = 2166136261;
    for (const char of String(id)) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619) >>> 0;
    const pick = (shift, size) => ((hash >>> shift) % size);
    return `--wear-x: ${10 + pick(0, 80)}%; --wear-y: ${10 + pick(7, 80)}%; --wear-a: ${pick(14, 180)}deg; --wear-c: ${20 + pick(21, 60)}%; --wear-g: ${(0.25 + pick(3, 25) / 100).toFixed(2)}`;
  }
  // The insert behind a game disk's clear case: a wide picture, turned on its side to run up the
  // case. Steam's store header (always the same wide layout, with the game's logo) when the game has
  // a Steam ID, then the record's own header image, its banner, then its dashboard art. No art, no picture.
  function gameDiskArt(fields = {}) {
    const text = (value) => typeof value === "string" ? value.trim() : "";
    const appId = Number(fields.steamAppId);
    const steam = Number.isInteger(appId) && appId > 0 && appId <= 0xffffffff
      ? `https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/${appId}/header.jpg` : "";
    return steam || text(fields.headerImage) || text(fields.banner) || text(fields.dashboardImage);
  }
  // A thermograph line for the Weather plate: the next hours' forecast, drawn in a 100 x 30 box.
  // Fewer than two readings draws nothing rather than a flat or guessed line.
  function weatherTrace(values) {
    const readings = (Array.isArray(values) ? values : []).map(Number).filter(Number.isFinite).slice(0, 12);
    if (readings.length < 2) return null;
    const low = Math.min(...readings), high = Math.max(...readings), span = high - low;
    const point = (value, index) => [
      Math.round(index / (readings.length - 1) * 1000) / 10,
      span ? Math.round((26 - (value - low) / span * 22) * 10) / 10 : 15
    ];
    const points = readings.map(point);
    return { points: points.map((xy) => xy.join(",")).join(" "), now: points[0], low: Math.round(low), high: Math.round(high), hours: readings.length };
  }
  // The Games drive holds the current game only. Figures come from the Steam snapshot (or the
  // record when there is none); a figure that is not known reads as a dash, never an estimate.
  // Only Steam's achievement share is shown: a record's generic progress is not a game completion.
  function gameDrive(display, record, notes = []) {
    if (!display) return null;
    const share = /^(\d{1,3})%\s+Achievements$/i.exec(String(display.completion || "").trim());
    const figures = [
      { label: "Play time", value: String(display.playtime || "").trim() || "—" },
      { label: "Last played", value: String(display.lastPlayed || "").trim() || "—" },
      { label: "Achievements", value: share ? `${share[1]}%` : "—" }
    ];
    // The drive has room for more of the latest note and a short list of the notes before it.
    const { latest, earlier, earlierNotes } = projectBench(record, record ? notes : [], { excerpt: 1200, history: 3 });
    return { title: String(display.title || record?.title || "").trim() || "Untitled game", status: String(record?.status || display.status || "").trim(), recordId: record?.id || "", figures, latest, earlier, earlierNotes };
  }
  // Dashboard plates. Each line is built from data already filed; a missing value is left out.
  // Current Game: the Steam figures that are known, the achievement share for its bar, and the
  // record's latest note.
  function gamePlate(display, record, notes = []) {
    const drive = gameDrive(display, record, notes);
    if (!drive) return null;
    const figures = drive.figures.filter((figure) => figure.value && figure.value !== "—");
    const achievements = figures.find((figure) => figure.label === "Achievements");
    const share = achievements ? Math.max(0, Math.min(100, Number.parseInt(achievements.value, 10))) : null;
    return { figures, share: Number.isFinite(share) ? share : null, note: drive.latest ? { title: drive.latest.title, date: drive.latest.date } : null };
  }
  // Latest Log: minutes to read, at about 220 words a minute, from the text without markup.
  function readingMinutes(text) {
    const words = String(text || "").replace(/:::[^\n]*/g, " ").replace(/!\[[^\]]*\]\([^)]*\)/g, " ").replace(/\[([^\]]*)\]\([^)]*\)/g, "$1").replace(/<[^>]+>/g, " ").match(/[\p{L}\p{N}'’]+/gu) || [];
    return words.length ? Math.max(1, Math.round(words.length / 220)) : 0;
  }
  // Projects: the next unfinished milestone, or the latest note's date when every milestone is done
  // or none are filed.
  function projectLine(record, notes = []) {
    const next = projectWorkbench([record])?.nextStop;
    if (next && next.state !== "ready") return `next: ${next.label}`;
    const latest = projectBench(record, notes).latest;
    return latest?.date ? `note ${latest.date.replace(/ \/ \d{4}$/, "").replace(/ /g, "")}` : "";
  }
  // The note index for records with many notes: the newest note as a featured card, then every other
  // note grouped by month, newest first, and undated notes at the end. A trailing "(v1.90)" in a
  // title becomes a version tag. Fewer than `threshold` notes: null, and the reader keeps its grid.
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  function noteIndex(notes = [], threshold = 9) {
    const list = (Array.isArray(notes) ? notes : []).filter((note) => note && note.id !== "main");
    if (list.length < threshold) return null;
    const entries = list.map((note, order) => {
      const match = /^(\d{1,2})\s*\/\s*(\d{1,2})\s*\/\s*(\d{4})\s*[-–—]\s*(.*)$/.exec(String(note.title || "").trim());
      const raw = (match ? match[4] : String(note.title || "")).trim() || "Untitled note";
      const tag = /\s*\((v\d+(?:\.\d+)*)[^)]*\)\s*$/i.exec(raw);
      const day = match ? match[1].padStart(2, "0") : "", month = match ? match[2].padStart(2, "0") : "", year = match ? match[3] : "";
      return {
        index: Number.isInteger(note.index) ? note.index : order, order,
        title: tag ? raw.slice(0, tag.index).trim() || raw : raw,
        version: tag ? tag[1].toLowerCase() : "",
        key: match ? `${year}-${month}-${day}` : "",
        date: match ? `${day} / ${month}` : "",
        fullDate: match ? `${day} / ${month} / ${year}` : "",
        month: match ? `${year}-${month}` : "",
        body: note.body || ""
      };
    });
    const dated = entries.filter((entry) => entry.key).sort((a, b) => b.key.localeCompare(a.key) || a.order - b.order);
    const undated = entries.filter((entry) => !entry.key);
    const first = dated[0] || undated[0];
    const plain = String(first.body).split(/\n\s*\n/)
      .map((block) => block.split(/\r?\n/).filter((line) => !/^\s*(?:!\[|<|:::|```|#{1,6}\s)/.test(line)).join(" "))
      .map((block) => block.replace(/\[([^\]]*)\]\([^)]*\)/g, "$1").replace(/(\*\*|__|`)/g, "").replace(/\s+/g, " ").trim())
      .find(Boolean) || "";
    const excerpt = plain.length <= 170 ? plain : `${plain.slice(0, plain.lastIndexOf(" ", 170) > 100 ? plain.lastIndexOf(" ", 170) : 170).trim()}…`;
    const strip = ({ index, title, version, date }) => ({ index, title, version, date });
    const months = [];
    for (const entry of dated) {
      if (entry === first) continue;
      let group = months.at(-1);
      if (!group || group.key !== entry.month) {
        const [year, month] = entry.month.split("-");
        group = { key: entry.month, label: `${monthNames[Number(month) - 1]} ${year}`, notes: [] };
        months.push(group);
      }
      group.notes.push(strip(entry));
    }
    return {
      count: entries.length,
      latest: { ...strip(first), date: first.fullDate, excerpt },
      months,
      undated: undated.filter((entry) => entry !== first).map(strip)
    };
  }
  // Recent Activity without one record flooding it. Reads the activity newest first until the rows
  // are full: a record with one or two entries keeps a row each, as before; three or more fold into
  // one row at the newest entry, carrying how many more there are and their titles. Folding frees
  // rows, so reading carries on to the records after it. An item only extends an already folded
  // record once the rows are full, never pulls in a new one.
  function condenseActivity(items = [], limit = 6, keyOf = (item) => item?.record?.id) {
    const buckets = new Map();
    let rows = 0;
    (Array.isArray(items) ? items : []).some((item, index) => {
      const key = keyOf(item) ?? item?.id;
      const bucket = buckets.get(key);
      const size = bucket ? bucket.entries.length : 0;
      const delta = size === 2 ? -1 : size > 2 ? 0 : 1;
      if (rows + delta > limit) return true;
      rows += delta;
      if (bucket) bucket.entries.push({ item, index });
      else buckets.set(key, { entries: [{ item, index }] });
      return false;
    });
    const out = [];
    for (const { entries } of buckets.values()) {
      if (entries.length < 3) { out.push(...entries); continue; }
      const titles = entries.slice(1).map(({ item }) => String(item.noteTitle || item.detail || item.title || "").trim()).filter(Boolean);
      out.push({ item: { ...entries[0].item, more: entries.length - 1, moreTitles: titles }, index: entries[0].index });
    }
    return out.sort((a, b) => a.index - b.index).slice(0, limit).map(({ item }) => item);
  }
  function recentDispatches(featuredId, activity, now = Date.now()) {
    const day = 86_400_000;
    const today = Math.floor(now / day) * day;
    const seen = new Set();
    const items = [];
    for (const item of activity) {
      const { id, section } = item.record;
      if (id === featuredId || seen.has(item.id)) continue;
      if (section !== "logs" && !((section === "games" || section === "projects") && item.content === "notes")) continue;
      const filed = Date.parse(item.date);
      if (!(filed >= today - 6 * day && filed < today + day)) continue;
      seen.add(item.id);
      items.push(item);
      if (items.length === 2) break;
    }
    return items;
  }
  function normalizeBootMode(value) { return value === "always" ? "always" : "once"; }
  function readBootMode(host = globalThis.window) {
    try {
      const storage = host.localStorage;
      if (storage.getItem("gestalt.local-memory") === "granted") return normalizeBootMode(storage.getItem(bootKey));
    } catch { /* Storage is optional. */ }
    return "once";
  }
  function saveBootMode(value, host = globalThis.window) {
    try {
      const storage = host.localStorage;
      if (storage.getItem("gestalt.local-memory") !== "granted") return false;
      storage.setItem(bootKey, normalizeBootMode(value));
      return true;
    } catch { return false; }
  }
  function markBootSeen(host = globalThis.window) {
    try { host.sessionStorage.setItem(seenKey, "1"); } catch { /* Storage is optional. */ }
  }
  function shouldPlayBoot(mode, remember, host = globalThis.window) {
    if (host.matchMedia("(prefers-reduced-motion: reduce)").matches) return false;
    if (mode === "always" || !remember) return true;
    try { return host.sessionStorage.getItem(seenKey) !== "1"; } catch { return true; }
  }

  function meterFrames(random = Math.random) {
    const checkpoint = 0.3 + random() * 0.27;
    const holdAt = 0.24 + random() * 0.2;
    const holdUntil = holdAt + 0.15 + random() * 0.1;
    const finish = 0.76 + random() * 0.09;
    const frame = (offset, fill, easing = "linear") => ({ offset, transform: `scaleX(${fill})`, easing });
    return [frame(0, 0, "ease-out"), frame(holdAt, checkpoint), frame(holdUntil, checkpoint + 0.016, "ease-in-out"), frame(finish, 0.79 + random() * 0.12, "ease-out"), frame(1, 1)];
  }

  function runBoot(shell, onComplete, { mode, remember }, host = globalThis.window) {
    const boot = shell?.querySelector(".pocket-boot-screen");
    const cover = boot?.parentElement;
    if (!cover || !shouldPlayBoot(mode, remember, host)) {
      if (cover) cover.hidden = true;
      onComplete();
      return () => {};
    }
    const motion = host.matchMedia("(prefers-reduced-motion: reduce)");
    const width = host.matchMedia("(max-width: 760px)");
    let timer, meter, active = true;
    function stop() {
      active = false;
      host.clearTimeout(timer);
      meter?.cancel();
      boot.removeEventListener("animationend", onEnd);
      motion.removeEventListener("change", onChange);
      width.removeEventListener("change", onChange);
      shell.removeAttribute("data-pocket-booting");
    }
    function finish() {
      if (!active) return;
      cover.hidden = true;
      stop();
      if (remember && !motion.matches && width.matches) markBootSeen(host);
      onComplete();
    }
    function onEnd(event) { if (event.target === boot && event.animationName === "pocket-boot-wipe") finish(); }
    function onChange() { if (motion.matches || !width.matches) finish(); }
    boot.addEventListener("animationend", onEnd);
    motion.addEventListener("change", onChange);
    width.addEventListener("change", onChange);
    shell.setAttribute("data-pocket-booting", "");
    cover.hidden = false;
    meter = shell.querySelector(".pocket-boot-meter i")?.animate?.(meterFrames(), { duration: 1470, delay: 1580, fill: "both" });
    timer = host.setTimeout(finish, 4100);
    return stop;
  }

  return { directory, stamp, bootMarkup, isHandheld, readingView, readingContents, recordPage, shelfSearchMin, filterShelfGames, gameShelfIndex, fieldPaperStack, projectWorkbench, projectBench, gameDrive, gamePlate, readingMinutes, projectLine, noteIndex, gameDiskArt, diskWear, machineReadout, weatherTrace, condenseActivity, recentDispatches, normalizeBootMode, readBootMode, saveBootMode, markBootSeen, shouldPlayBoot, meterFrames, runBoot };
});
