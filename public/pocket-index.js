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
  function projectBench(record, notes = [], { screen = "", stack = [], excerpt = 180, history = 0 } = {}) {
    const filed = notes.filter((note) => note && note.id !== "main");
    const plain = (text) => String(text || "").split(/\n\s*\n/)
      .map((block) => block.split(/\r?\n/).filter((line) => !/^\s*(?:!\[|<|:::|```|#{1,6}\s)/.test(line)).join(" "))
      .map((block) => block.replace(/\[([^\]]*)\]\([^)]*\)/g, "$1").replace(/(\*\*|__|`)/g, "").replace(/^\s*(?:[-*>]|\d+\.)\s+/, "").replace(/\s+/g, " ").trim())
      .find(Boolean) || "";
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
    const latest = filed[0] ? { ...heading(filed[0]), excerpt: clip(plain(filed[0].body), excerpt) } : null;
    // The notes filed before the latest, newest first, when asked for: date and title only.
    const earlierNotes = filed.slice(1, 1 + Math.max(0, history)).map(heading);
    const lines = (Array.isArray(stack) ? stack : []).map((item) => String(item).trim()).filter(Boolean);
    return { started: date(record?.started), noteCount: filed.length, latest, earlier: Math.max(0, filed.length - 1), earlierNotes, screen: String(screen || "").trim(), stack: lines.slice(0, 6), moreStack: Math.max(0, lines.length - 6) };
  }
  // The picture in a game disk's window: one landscape source for every disk, so they all read the
  // same way. Steam's store header (always the same layout, with the game's logo) when the game has a
  // Steam ID, then the record's own header image, its banner, then its dashboard art. No art, no picture.
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

  return { directory, stamp, bootMarkup, isHandheld, readingView, readingContents, recordPage, shelfSearchMin, filterShelfGames, gameShelfIndex, fieldPaperStack, projectWorkbench, projectBench, gameDrive, gameDiskArt, weatherTrace, recentDispatches, normalizeBootMode, readBootMode, saveBootMode, markBootSeen, shouldPlayBoot, meterFrames, runBoot };
});
