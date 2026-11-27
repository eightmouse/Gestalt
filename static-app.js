const recordsLoaded = Array.isArray(window.__GESTALT_RECORDS) && window.__GESTALT_RECORDS.length > 0;
const records = (Array.isArray(window.__GESTALT_RECORDS) ? window.__GESTALT_RECORDS : [])
  .slice()
  .sort((a, b) => a.priority - b.priority || b.updated.localeCompare(a.updated));
const sections = [
  { id: "system", code: "01_SYSTEM", label: "Dashboard", icon: "system" },
  { id: "projects", code: "02_PROJECTS", label: "Active Processes", icon: "projects" },
  { id: "games", code: "03_GAMES", label: "Session Logs", icon: "games" },
  { id: "logs", code: "04_LOGS", label: "Field Notes", icon: "logs" },
  { id: "setup", code: "05_SETUP", label: "Hardware & Software", icon: "setup" },
  { id: "archive", code: "06_ARCHIVE", label: "Archive", icon: "archive" }
];

const latinSayings = [
  { latin: "Festina lente.", english: "Make haste slowly.", meaning: "Move with urgency, but keep enough control to avoid careless mistakes." },
  { latin: "Per aspera ad astra.", english: "Through hardship to the stars.", meaning: "Difficult work can still point somewhere luminous." },
  { latin: "Nulla dies sine linea.", english: "No day without a line.", meaning: "A small daily mark still counts as progress." },
  { latin: "Ars longa, vita brevis.", english: "Art is long, life is brief.", meaning: "The work outlives the short window we get to shape it." },
  { latin: "Respice finem.", english: "Consider the end.", meaning: "Keep the final shape in mind before making the next move." },
  { latin: "Non ducor, duco.", english: "I am not led; I lead.", meaning: "A reminder to steer the archive instead of letting noise steer it." },
  { latin: "Acta non verba.", english: "Deeds, not words.", meaning: "Let the record show what actually changed." }
];

const projectStatusOrder = ["active", "in progress", "planning", "blocked", "paused", "on hold", "completed", "filed", "archived"];
const sectionRegistryLabels = {
  archive: "Field Archive",
  games: "Media Cabinet",
  logs: "Field Desk",
  projects: "Process Reader",
  setup: "Setup Manifest"
};

function projectStatusRank(status) {
  const rank = projectStatusOrder.indexOf(status.toLowerCase());
  return rank === -1 ? projectStatusOrder.length : rank;
}

function gameLogPlacement(record) {
  const fields = record.meta ?? record;
  if (fields.gamePlacement === "session" || fields.gamePlacement === "past") return fields.gamePlacement;
  return ["active", "in progress", "on hold", "paused", "planning", "playing"].includes(record.status.toLowerCase()) ? "session" : "past";
}

function gameActivityValue(record) {
  const value = (record.meta ?? record).gameActivity;
  return value === "active" || value === "inactive" ? value : "";
}

function gameActivityLabel(record) {
  const activity = gameActivityValue(record);
  return record.section === "games" && gameLogPlacement(record) === "session" && activity
    ? activity === "active" ? "Active" : "Inactive"
    : record.status;
}

function renderCipherLetters(value) {
  const plan = window.GestaltCipherDecode?.plan(value);
  if (!plan) return escapeHtml(value);
  return `<span class="cipher-line" style="--cipher-steps:${plan.steps}"><span class="cipher-ink">${escapeHtml(value)}</span><span class="cipher-glyph" aria-hidden="true" data-a="${escapeHtml(plan.initial)}" data-b="${escapeHtml(plan.burst)}"></span></span>`;
}

const weatherState = {
  label: "AUTO WEATHER",
  temp: "--",
  condition: "Awaiting signal",
  meta: "Approximate network signal",
  note: "No browser location prompt. Gestalt stores nothing.",
  loading: false,
  trace: []
};

const localMemoryKey = "gestalt.local-memory";

function readLocalMemoryState() {
  try {
    return window.localStorage.getItem(localMemoryKey) === "granted" ? "granted" : "prompt";
  } catch {
    return "prompt";
  }
}

const initialLocalMemory = readLocalMemoryState();
const pocket = window.GestaltPocketIndex;
const instrumentShelves = new Map();
let standbySection = null;
let stopSectionStandby;
let stopProjectRotation;
let stopPocketGroupSwipe;
const bootStartedAt = performance.now();
let bootCleanup = null;
let osBehaviourController = null;
let workspaceToolsController = null;

// The full welcome reports real state; the Steam line changes in place if the snapshot lands during boot.
const bootPreviousSession = window.GestaltOsBehaviour?.readLastSession?.();

function bootReadinessState() {
  return {
    lastSession: state.localMemory === "granted" ? window.GestaltOsBehaviour?.lastSessionLabel?.(bootPreviousSession) ?? null : null,
    records: records.length,
    appearance: document.documentElement.getAttribute("data-appearance") === "day" ? "day" : "night",
    steam: steamDisplayReady ? (steamDisplaySnapshot ? "ready" : "offline") : "reading"
  };
}

function bootReadinessLines() {
  return (window.GestaltOsBehaviour?.bootReadiness?.(bootReadinessState()) || []).map(({ key, label, value }) => `<li data-boot-line="${escapeHtml(key)}"><span>${escapeHtml(label)}</span><b>${escapeHtml(value)}</b></li>`).join("");
}

function scheduleBootCompletion(onComplete, elapsed = 0, mode = "full") {
  const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
  let timer = 0;
  let active = true;
  const stop = () => {
    active = false;
    window.clearTimeout(timer);
    motion.removeEventListener("change", onMotionChange);
  };
  const finish = () => {
    if (!active) return;
    stop();
    onComplete();
  };
  const onMotionChange = () => {
    if (motion.matches) finish();
  };
  motion.addEventListener("change", onMotionChange);
  if (motion.matches) finish();
  // Matches the power-on timeline in globals.css: the last screen flare settles by 2.98s (quick 1.54s).
  else timer = window.setTimeout(finish, Math.max(0, (mode === "quick" ? 1600 : 3000) - elapsed));
  return stop;
}
let navMotionTimer = 0;
let recordAccessTimers = [];

function normalizeEntryAccessMode(value) {
  return value === "always" || value === "off" ? value : "first";
}

function readEntryAccessMode() {
  try {
    return normalizeEntryAccessMode(window.localStorage.getItem("gestalt.entry-animation"));
  } catch {
    return "first";
  }
}

function saveEntryAccessMode(mode) {
  try {
    window.localStorage.setItem("gestalt.entry-animation", normalizeEntryAccessMode(mode));
  } catch {
    // Keep the preference in memory for this visit if storage is blocked.
  }
}

function shouldPlayEntryAccess(mode, played, reducedMotion) {
  return !reducedMotion && (mode === "always" || (mode === "first" && !played));
}

function settleRecordAccessSequence() {
  stopRecordAccessSequence();
  state.accessComplete = true;
  const recordWindow = document.querySelector(".record-window");
  recordWindow?.classList.remove("is-access-pending");
  recordWindow?.classList.add("is-access-complete");
}

function changeEntryAccessMode(value) {
  const mode = normalizeEntryAccessMode(value);
  if (mode === state.entryAccessMode) return;
  state.entryAccessMode = mode;
  if (state.localMemory === "granted") saveEntryAccessMode(mode);
  settleRecordAccessSequence();
}

function seasonalAccentMarkup(now = new Date()) {
  const detail = window.GestaltSeasonal?.seasonFor(now, state.seasonalMode);
  const decorations = detail?.decorations || [];
  return `<div class="seasonal-accent" data-seasonal-accent aria-hidden="true" data-season="${detail?.id || ""}"${document.hidden ? " data-paused" : ""}${decorations.length ? "" : " hidden"}>${decorations.map((decoration) => `<span class="seasonal-decoration" data-placement="${escapeHtml(decoration.placement)}"><img src="${escapeHtml(decoration.image)}" alt="" decoding="async" draggable="false" />${decoration.glowImage ? `<img class="seasonal-glow" src="${escapeHtml(decoration.glowImage)}" alt="" decoding="async" draggable="false" />` : ""}</span>`).join("")}</div>`;
}

function syncSeasonalMotion() {
  document.querySelector("[data-seasonal-accent]")?.toggleAttribute("data-paused", document.hidden);
}

function syncSeasonalAccent() {
  const target = document.querySelector("[data-seasonal-accent]");
  const detail = window.GestaltSeasonal?.seasonFor(new Date(), state.seasonalMode);
  if (target && target.dataset.season !== (detail?.id || "")) target.outerHTML = seasonalAccentMarkup();
}

function changeSeasonalMode(value) {
  const api = window.GestaltSeasonal;
  if (!api) return;
  const mode = api.normalizeMode(value);
  if (mode === state.seasonalMode) return;
  state.seasonalMode = mode;
  if (state.localMemory === "granted") api.saveMode(mode);
  syncSeasonalAccent();
}

function syncDesktopNavigation() {
  desktopNavigationController?.attach(root.querySelector(".archive-shell"), {
    mode: state.desktopNavigationMode,
    ready: state.bootDismissed && state.localMemory !== "prompt",
    busy: state.panelOpen || state.timelineOpen || state.roadmapOpen || state.osBehaviourOpen || state.navOpen || Boolean(state.archiveFolderWindow) || Boolean(state.expandedImage),
    palette: state.searchOpen,
    remember: state.localMemory === "granted"
  });
}

function changeDesktopNavigationMode(value) {
  const api = window.GestaltDesktopNavigation;
  if (!api) return;
  state.desktopNavigationMode = api.normalizeMode(value);
  if (state.localMemory === "granted") api.saveMode(state.desktopNavigationMode);
  syncDesktopNavigation();
}

function stopRecordAccessSequence() {
  for (const timer of recordAccessTimers) {
    window.clearTimeout(timer);
  }
  recordAccessTimers = [];
  state.accessPending = false;
}

function startRecordAccessSequence(fieldPaper = false) {
  if (!state.accessPending) {
    return;
  }

  recordAccessTimers.push(window.setTimeout(() => {
    state.accessPending = false;
    const recordWindow = document.querySelector(".record-window");
    recordWindow?.classList.remove("is-access-pending");
    recordWindow?.classList.add("is-access-complete");
    state.accessComplete = true;
    recordAccessTimers = [];
  }, fieldPaper ? (window.GestaltRecordMotion?.paperRevealMs ?? 740) : (window.GestaltRecordMotion?.accessRevealMs ?? 1500)));
}

const state = {
  selectedId: "dashboard",
  recordLinkMissing: false,
  linkedNoteId: null,
  noteLinkMissing: false,
  activeSection: "system",
  previousActiveSection: "system",
  panelOpen: false,
  accessPending: false,
  accessComplete: false,
  recordAccessPlayed: false,
  entryAccessMode: readEntryAccessMode(),
  seasonalMode: window.GestaltSeasonal?.readMode() || "auto",
  desktopNavigationMode: window.GestaltDesktopNavigation?.readMode() || "fixed",
  startupMode: window.GestaltOsBehaviour?.readStartupMode() || "full",
  pocketBootMode: pocket?.readBootMode() || "once",
  selectorGroup: undefined,
  selectorProjectIds: [],
  fieldPaperId: undefined,
  gameShelfQuery: "",
  gameShelfSearch: false,
  gameShelfPick: undefined,
  gameShelfSearchPick: undefined,
  gameShelfOffsets: { session: 0, past: 0 },
  recordSearchReturn: null,
  panelMinimized: false,
  panelMaximized: false,
  memoryStateEnabled: true,
  memoryMode: window.GestaltMemoryState?.readMode() || "trace",
  activeContent: "overview",
  searchOpen: false,
  searchQuery: "",
  timelineOpen: false,
  roadmapOpen: false,
  osBehaviourOpen: false,
  webSearchOpen: false,
  connectionsOpen: false,
  timelineSource: "all",
  archiveFolderWindow: null,
  navOpen: false,
  noteSearchQuery: "",
  focusedNoteIndex: null,
  dashboardNoteReader: false,
  noteFileOpen: false,
  noteFileSearchOpen: false,
  noteBrowsePage: undefined,
  noteSearchPage: 0,
  updateHistoryOpen: false,
  localMemory: initialLocalMemory,
  bootDismissed: false,
  windowSteady: false,
  headlineAnimating: true,
  expandedImage: null
};

const root = document.querySelector("#root");
const desktopNavigationController = window.GestaltDesktopNavigation?.createController();
const recordMotionController = window.GestaltRecordMotion?.createController();
let minimizedRecordWindow = null;
let recordRenderPending = false;
let roadmapData = null;
let roadmapLoadPromise = null;
let roadmapFailed = false;
let roadmapTrigger = null;
let buildRoadmapHistory = null;
let roadmapChapterId = "working";
let roadmapReleaseIndex = null;
let steamDisplayModule = null;
let steamDisplaySnapshot = null;
let steamDisplayStarted = false;
let steamDisplayReady = false;
let directoryArchiveDay = "";
function recordsFor(sectionId) {
  return records.filter((record) => record.section === sectionId);
}

function selectedRecord() {
  return records.find((record) => record.id === state.selectedId) || records[0];
}

function openRecord(recordId, contentKey = "overview", noteIndex = null, noteId = null, searchKey, dashboardNote = false) {
  const record = records.find((entry) => entry.id === recordId);

  if (!record) {
    return;
  }

  if (record.section !== "system") window.GestaltRecordLinks?.open(window, record.id, noteId);
  syncRecordLinkNotice(false);
  window.GestaltMemoryState?.record("record.open", { section: record.section });

  stopRecordAccessSequence();
  const handheld = pocket?.isHandheld();
  state.recordSearchReturn = state.searchOpen && (searchKey || handheld) ? { query: state.searchQuery, key: searchKey } : null;
  state.accessPending = shouldPlayEntryAccess(state.entryAccessMode, state.recordAccessPlayed, window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  if (state.accessPending) {
    state.recordAccessPlayed = true;
  }
  state.accessComplete = false;
  state.headlineAnimating = false;
  state.selectedId = record.id;
  state.dashboardNoteReader = dashboardNote;
  state.activeContent = pocket?.readingView?.(record.section, contentKey) ?? contentKey;
  state.panelOpen = true;
  state.panelMinimized = false;
  state.panelMaximized = false;
  state.searchOpen = false;
  state.searchQuery = "";
  state.timelineOpen = false;
  state.roadmapOpen = false;
  state.archiveFolderWindow = null;
  state.navOpen = false;
  state.noteSearchQuery = "";
  state.noteFileSearchOpen = false;
  state.focusedNoteIndex = Number.isInteger(noteIndex) && noteIndex >= 0 ? noteIndex : null;
  state.noteFileOpen = usesNoteDirectory(record) && !dashboardNote && state.focusedNoteIndex !== null;
  state.linkedNoteId = noteId;
  state.noteLinkMissing = Boolean(noteId && state.focusedNoteIndex === null);
  state.noteBrowsePage = undefined;
  state.noteSearchPage = 0;
  state.updateHistoryOpen = false;
  if (!syncRecordWindow()) render();
  startRecordAccessSequence(record.section === "logs");
  if (record.section === "setup" && noteId && !state.noteLinkMissing) {
    root.querySelector(`.record-window [data-setup-note-id="${CSS.escape(noteId)}"]`)?.scrollIntoView({ block: "nearest" });
  } else if (!dashboardNote && state.focusedNoteIndex > 0) revealFocusedNote();
}

function openDashboardNote(recordId, index) {
  const record = records.find((entry) => entry.id === recordId);
  if (!record || record.section === "setup") return;
  const note = noteEntries(record.body)[index];
  if (note?.body.trim()) openRecord(recordId, "notes", index, note.id, undefined, record.section !== "logs");
  else openRecord(recordId);
}

function openSection(sectionId) {
  if (state.activeSection === sectionId) {
    return;
  }

  window.GestaltRecordLinks?.close(window);
  syncRecordLinkNotice(false);
  state.previousActiveSection = state.activeSection;
  window.GestaltMemoryState?.record("section.enter", { section: sectionId });
  stopRecordAccessSequence();
  state.headlineAnimating = state.activeSection !== sectionId;
  state.activeSection = sectionId;
  state.selectorGroup = undefined;
  state.selectorProjectIds = [];
  state.fieldPaperId = undefined;
  state.gameShelfQuery = "";
  state.gameShelfSearch = false;
  state.gameShelfPick = state.gameShelfSearchPick = undefined;
  state.gameShelfOffsets = { session: 0, past: 0 };
  state.panelOpen = false;
  state.panelMinimized = false;
  state.searchOpen = false;
  state.searchQuery = "";
  state.timelineOpen = false;
  state.roadmapOpen = false;
  state.archiveFolderWindow = null;
  state.navOpen = false;
  state.noteSearchQuery = "";
  state.focusedNoteIndex = null;
  state.updateHistoryOpen = false;
  if (!syncSection()) render();
}

function openTimeline() {
  if (state.timelineOpen) return;
  window.GestaltRecordLinks?.close(window);
  stopRecordAccessSequence();
  state.panelOpen = false;
  state.panelMinimized = false;
  state.searchOpen = false;
  state.searchQuery = "";
  state.noteSearchQuery = "";
  state.updateHistoryOpen = false;
  state.timelineOpen = true;
  state.roadmapOpen = false;
  state.timelineSource = "all";
  state.archiveFolderWindow = null;
  state.navOpen = false;
  if (!syncTimelineWindow()) render();
}

function closeTimeline() {
  if (!state.timelineOpen) return;
  state.timelineOpen = false;
  if (!syncTimelineWindow()) render();
}

function openHome() {
  window.GestaltRecordLinks?.close(window);
  syncRecordLinkNotice(false);
  stopRecordAccessSequence();
  if (state.activeSection !== "system") {
    state.previousActiveSection = state.activeSection;
    window.GestaltMemoryState?.record("section.enter", { section: "system" });
  }
  state.headlineAnimating = state.activeSection !== "system";
  state.activeSection = "system";
  state.selectorGroup = undefined;
  state.selectorProjectIds = [];
  state.fieldPaperId = undefined;
  state.gameShelfQuery = "";
  state.gameShelfSearch = false;
  state.gameShelfPick = state.gameShelfSearchPick = undefined;
  state.gameShelfOffsets = { session: 0, past: 0 };
  state.panelOpen = false;
  state.panelMinimized = false;
  state.panelMaximized = false;
  state.searchOpen = false;
  state.searchQuery = "";
  state.timelineOpen = false;
  state.roadmapOpen = false;
  state.archiveFolderWindow = null;
  state.navOpen = false;
  state.noteSearchQuery = "";
  state.updateHistoryOpen = false;
  if (!syncSection()) render();
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function textBlock(value) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item)).join("\n");
  }

  return typeof value === "string" ? value.replace(/\\+n/g, "\n") : "";
}

function textList(value) {
  return textBlock(value)
    .split(/\r?\n|\|/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function shortDate(value) {
  const [year, month, day] = value.split("-");
  return year && month && day ? `${day}/${month}` : "--/--";
}

function readableDate(value) {
  const [year, month, day] = value.split("-");
  return year && month && day ? `${day} / ${month} / ${year}` : value;
}

function activityFreshness(value, now = new Date()) {
  const [year, month, day] = value.split("-").map(Number);

  if (!year || !month || !day) {
    return "old";
  }

  const activityTime = new Date(year, month - 1, day).getTime();
  const age = now.getTime() - activityTime;

  return age >= 0 && age <= 48 * 60 * 60 * 1000 ? "new" : "old";
}

function recentActivity(limit) {
  return records
    .filter((record) => record.section !== "system" && !(record.section === "setup" && setupGroupForActivity(record) === "tools"))
    .flatMap((record) => {
      const setupDetail = setupActivityDetail(record);
      const notes = setupDetail ? [] : datedNotes(record);
      const recordItem = {
        id: `${record.id}:record`,
        date: record.section === "logs" ? logArchiveDate(record) : record.updated,
        detail: setupDetail ?? record.type,
        record,
        title: record.title
      };

      if (record.section === "setup" || (record.section === "logs" && notes.length < 2)) {
        const trace = latestActivityNote(notes, record.updated);
        if (!trace || setupDetail) return [recordItem];
        return [{
          ...recordItem,
          content: "notes",
          noteIndex: record.section === "logs" ? trace.index : undefined,
          noteId: trace.note.id,
          date: record.section === "logs" ? recordItem.date : trace.date,
          detail: `${record.type} / ${activityTraceTitle(trace.note.title)}`
        }];
      }

      const items = notes.map(({ date, note, index }) => {
        const noteTitle = activityTraceTitle(note.title);
        return {
          ...recordItem,
          id: `${record.id}:note:${index}`,
          content: "notes",
          date,
          detail: `${record.type} / ${noteTitle}`,
          noteIndex: index,
          noteId: note.id,
          noteTitle
        };
      });
      if (!items.some((item) => item.date >= recordItem.date)) items.push(recordItem);
      return items;
    })
    .sort((a, b) => b.date.localeCompare(a.date)
      || (b.record.writtenAt || "").localeCompare(a.record.writtenAt || "")
      || (b.record.writtenOrder || 0) - (a.record.writtenOrder || 0)
      || a.record.priority - b.record.priority || a.record.id.localeCompare(b.record.id))
    .slice(0, limit);
}

function activityDate(record) {
  if (record.section === "logs") return logArchiveDate(record);
  if (record.section === "setup" && setupGroupForActivity(record) !== "notes") return record.updated;
  return recordLastUpdated(record);
}

function recordLastUpdated(record) {
  return latestActivityNote(datedNotes(record), record.updated)?.date ?? record.updated;
}

function datedNotes(record) {
  return noteEntries(record.body).flatMap((note, index) => {
    const date = note.body && noteTitleDate(note.title);
    return date ? [{ date, note, index }] : [];
  });
}

function latestActivityNote(notes, updated) {
  return notes.reduce((latest, entry) =>
    entry.date >= updated && (!latest || entry.date > latest.date) ? entry : latest, null);
}

function setupActivityDetail(record) {
  if (record.section !== "setup") {
    return null;
  }

  const group = setupGroupForActivity(record);

  if (group === "tools") {
    return null;
  }

  if (group === "peripherals") {
    return "Setup Peripheral / Device";
  }

  if (group === "systems") {
    return "Setup System / Profile";
  }

  return null;
}

function setupGroupForActivity(record) {
  const explicitGroup = [record.setupGroup, record.setupKind, record.category]
    .map((value) => (typeof value === "string" ? value.toLowerCase().trim() : ""))
    .find(Boolean);

  if (explicitGroup) {
    if (/\b(tool|tools|app|apps|software|shortcut)\b/.test(explicitGroup)) {
      return "tools";
    }

    if (/\b(peripheral|peripherals|device|hardware|gear|photo)\b/.test(explicitGroup)) {
      return "peripherals";
    }

    if (/\b(note|notes|file|memo)\b/.test(explicitGroup)) {
      return "notes";
    }

    return "systems";
  }

  const haystack = [record.title, record.type, record.summary, textBlock(record.hardware)].join(" ").toLowerCase();

  if (/\b(keyboard|mouse|monitor|display|headset|speaker|audio|mic|microphone|controller|tablet|dock|peripheral|device)\b/.test(haystack)) {
    return "peripherals";
  }

  if (/\b(tool|tools|software|app|apps|utility|utilities|editor|launcher|workflow|script|stack)\b/.test(haystack)) {
    return "tools";
  }

  if (/\b(note|notes|memo|file)\b/.test(haystack) && !/\b(windows|linux|arch|os|pc|laptop|desktop|machine|rig|system|hardware)\b/.test(haystack)) {
    return "notes";
  }

  return "systems";
}

function activityTraceTitle(title) {
  const clean = title
    .replace(/^\s*\d{1,2}\s*\/\s*\d{1,2}\s*\/\s*\d{4}\s*[-:–—]?\s*/, "")
    .trim();

  return clean || "New note";
}

function recordDisplaySummary(record) {
  const latestNote = noteEntries(record.body)[0];
  const fallback = excerptFromBody(latestNote?.body ?? splitUpdateIndex(record.body).mainBody);
  const summary = cleanSummaryText(record.summary);

  if (summary) {
    return summary;
  }

  return fallback || "No summary recorded.";
}

function excerptFromBody(body, limit = 180) {
  const clean = body
    .split(/\r?\n/)
    .map(cleanExcerptLine)
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();

  if (!clean) {
    return "";
  }

  return clean.length > limit ? `${clean.slice(0, limit - 3).trim()}...` : clean;
}

function cleanSummaryText(value) {
  const clean = value?.trim() ?? "";

  return clean.toLowerCase() === "no summary recorded." ? "" : clean;
}

function cleanExcerptLine(value) {
  const line = value.trim();

  if (
    !line ||
    line.startsWith(":::") ||
    line.startsWith("#") ||
    line.startsWith("![") ||
    line === "---"
  ) {
    return "";
  }

  return line
    .replace(/^[-*>]\s*/, "")
    .replace(/!\[[^\]]*]\([^)]+\)/g, "")
    .replace(/\[([^\]]+)]\([^)]+\)/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/[*_~]/g, "")
    .trim();
}

function noteTitleDate(title) {
  const match = title.match(/\b(\d{1,2})\s*\/\s*(\d{1,2})\s*\/\s*(\d{4})\b/);

  if (!match) {
    return null;
  }

  const [, day, month, year] = match;
  return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
}

function formatClock() {
  const now = new Date();
  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).format(now);
}

function formatDate() {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  })
    .format(new Date())
    .replaceAll("/", " / ");
}

function greeting(date = new Date()) {
  const hour = date.getHours();

  if (hour < 12) {
    return "Good morning.";
  }

  if (hour < 18) {
    return "Good afternoon.";
  }

  return "Good evening.";
}

function dailyLatinSaying() {
  const today = new Date();
  const seed = today.getFullYear() * 372 + (today.getMonth() + 1) * 31 + today.getDate();

  return latinSayings[seed % latinSayings.length];
}

function dashboardSubtext() {
  const saying = dailyLatinSaying();

  return `<span class="latin-tooltip" tabindex="0">${escapeHtml(saying.latin)}<span role="tooltip"><b>${escapeHtml(saying.english)}</b><small>${escapeHtml(saying.meaning)}</small></span></span>`;
}

function weatherCodeLabel(code) {
  if (code === 0) return "Clear sky";
  if ([1, 2, 3].includes(code)) return "Partly cloudy";
  if ([45, 48].includes(code)) return "Fog";
  if ([51, 53, 55, 56, 57].includes(code)) return "Drizzle";
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return "Rain";
  if ([71, 73, 75, 77, 85, 86].includes(code)) return "Snow";
  if ([95, 96, 99].includes(code)) return "Storm";

  return "Weather logged";
}

async function resolveWeatherLocation() {
  const response = await fetch("https://ipapi.co/json/");

  if (!response.ok) {
    throw new Error("Weather location lookup failed");
  }

  const data = await response.json();
  const latitude = Number(data.latitude);
  const longitude = Number(data.longitude);

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    throw new Error("Weather location missing coordinates");
  }

  return {
    label: [data.city, data.country_code].filter(Boolean).join(", ") || "network location",
    latitude,
    longitude
  };
}

function progressBlocks(value) {
  const filled = Math.round((Math.max(0, Math.min(100, value)) / 100) * 24);
  return Array.from({ length: 24 }, (_, index) => `<i class="${index < filled ? "is-filled" : ""}"></i>`).join("");
}

function recordHeaderImage(record) {
  return record.headerImage || "";
}

function updatedProjectRecords() {
  return recordsFor("projects")
    .sort((a, b) => projectStatusRank(a.status) - projectStatusRank(b.status) || b.updated.localeCompare(a.updated) || a.priority - b.priority);
}

function currentGameRecord() {
  if (!steamDisplayReady) return undefined;
  if (steamDisplayModule) {
    const display = steamDisplayModule.resolveCurrentGame(steamDisplaySnapshot, recordsFor("games"));
    return recordsFor("games").find((record) => record.id === display?.recordId);
  }

  return recordsFor("games").find((record) => record.status === "Playing")
    || recordsFor("games")[0];
}

function currentGameDisplay() {
  if (!steamDisplayReady) return null;
  if (steamDisplayModule) return steamDisplayModule.resolveCurrentGame(steamDisplaySnapshot, recordsFor("games"));
  const record = currentGameRecord();
  if (!record) return null;
  return {
    title: record.title,
    status: record.status,
    recordId: record.id,
    completion: Number.isFinite(record.progress) && record.progress >= 0 && record.progress <= 100
      ? `${record.progress}% ${record.achievementCount ? "Achievements" : "Complete"}` : null,
    playtime: record.playtime || null,
    lastPlayed: record.lastPlayed || null
  };
}

async function initializeSteamDisplay() {
  if (steamDisplayStarted) return;
  steamDisplayStarted = true;
  try {
    steamDisplayModule = await import("./public/steam-display.mjs?v=1.73.4");
    steamDisplaySnapshot = await steamDisplayModule.loadSteamSnapshot(new URL("public/data/steam-current.json", document.baseURI).href);
  } catch {
    // A failed lookup settles to authored content, never an endless loading state.
  } finally {
    steamDisplayReady = true;
    // Do not rebuild the archive/window DOM when a display-only snapshot arrives.
    const panel = document.querySelector(".current-game-panel");
    if (panel && state.bootDismissed) panel.outerHTML = currentGamePanel();
    const readiness = document.querySelector(".boot-readiness");
    if (readiness) readiness.innerHTML = bootReadinessLines();
    const drive = document.querySelector(".game-drive");
    if (drive) {
      drive.outerHTML = gameDrivePanel();
      if (state.activeSection === "games") syncGameShelf();
    }
    const display = currentGameDisplay();
    const label = document.querySelector("[data-current-game-label]");
    if (label) label.textContent = display?.title || "None";
    const record = currentGameRecord();
    document.querySelectorAll("[data-current-game-action]").forEach((button) => {
      button.disabled = !record;
      if (record) button.dataset.openRecord = record.id;
      else button.removeAttribute("data-open-record");
    });
    const suggestions = document.querySelector(".search-suggestions");
    if (suggestions && state.searchOpen) {
      const template = document.createElement("template");
      template.innerHTML = searchPanel();
      const updated = template.content.querySelector(".search-suggestions");
      if (updated) suggestions.replaceChildren(...updated.childNodes);
    }
  }
}

function latestLogRecord() {
  return recordsFor("logs").sort(compareLogWritingOrder)[0];
}

function archiveMetrics() {
  const publicRecords = records.filter((record) => record.section !== "system");
  const activeGame = currentGameRecord();
  const latestActivity = recentActivity(1)[0];

  return {
    activeGame,
    activeProjects: recordsFor("projects").filter((record) => ["active", "in progress", "planning"].includes(record.status.toLowerCase())).length,
    latestActivityDate: latestActivity?.date || publicRecords[0]?.updated || "",
    mediaCount: countMediaPaths(publicRecords),
    recordCount: publicRecords.length
  };
}

function countMediaPaths(sourceRecords) {
  const paths = new Set();
  const imagePattern = /!\[(?:.*?)]\((.*?)\)/g;

  for (const record of sourceRecords) {
    for (const value of [record.banner, record.headerImage]) {
      if (value) {
        paths.add(value);
      }
    }

    for (const key of ["samples", "attachments"]) {
      const value = record[key];
      const list = Array.isArray(value) ? value : typeof value === "string" ? value.split(/\r?\n|,/) : [];

      for (const item of list) {
        const path = String(item).trim();

        if (path) {
          paths.add(path);
        }
      }
    }

    for (const match of record.body.matchAll(imagePattern)) {
      if (match[1]) {
        paths.add(match[1]);
      }
    }
  }

  return paths.size;
}

let cachedTimeline;
function getTimelineItems() {
  // Pages records do not change within a visit. Keep only the visible history window.
  return cachedTimeline ??= records
    .filter((record) => record.section !== "system")
    .flatMap((record) => {
      const date = activityDate(record);
      const items = [
        {
          content: "overview",
          date,
          detail: `${record.type} / ${record.status}`,
          id: `${record.id}-activity-${date}`,
          kind: "record",
          record,
          title: `${record.title} updated`
        }
      ];

      noteEntries(record.body).forEach((note, index) => {
        const noteDate = noteTitleDate(note.title);

        if (!noteDate) {
          return;
        }

        items.push({
          content: "notes",
          date: noteDate,
          detail: `${record.title} / Note ${index + 1}`,
          id: `${record.id}-note-${index}-${noteDate}`,
          kind: "note",
          record,
          title: note.title
        });
      });

      return items;
    })
    .sort((a, b) => b.date.localeCompare(a.date)
      || (b.record.writtenAt || "").localeCompare(a.record.writtenAt || "")
      || (b.record.writtenOrder || 0) - (a.record.writtenOrder || 0)
      || a.record.priority - b.record.priority || a.title.localeCompare(b.title))
    .slice(0, 32);
}

function searchResults() {
  return window.GestaltArchiveSearch?.search(records, state.searchQuery,
    (record) => record.section === "setup" ? setupNarrativeNotes(record) : noteEntries(record.body),
    currentGameRecord(), latestLogRecord()) ?? [];
}

function usesNoteDirectory(record) {
  return record?.section === "games" || record?.section === "projects";
}

function getRecordContents(record) {
  if (record.section === "games") {
    return [
      { key: "overview", label: "Overview" },
      { key: "notes", label: "Notes" },
      { key: "recommendation", label: "Recommendation" }
    ];
  }

  if (record.section === "setup") {
    return [
      { key: "overview", label: "Overview" },
      { key: "hardware", label: "Hardware" },
      { key: "notes", label: "Setup Notes" }
    ];
  }

  if (record.section === "logs") {
    const contents = [
      { key: "notes", label: "Note" }
    ];

    return hasRecordAttachments(record) ? [...contents, { key: "attachments", label: "Attachments" }] : contents;
  }

  if (record.section === "projects") {
    const contents = [
      { key: "overview", label: "Overview" },
      { key: "notes", label: "Notes" },
      { key: "technical", label: "Technical Stack" },
      { key: "samples", label: "Samples" }
    ];
    return contents.filter((item) => {
      if (item.key === "technical") return textList(record.technicalStack).length > 0;
      if (item.key === "samples") return recordMediaSources(record, "samples").length > 0;
      return true;
    });
  }

  return [
    { key: "overview", label: "Overview" },
    { key: "notes", label: "Notes" },
    { key: "changelog", label: "Change Log" }
  ];
}

function normalizeContentKey(record) {
  const contents = getRecordContents(record);
  return contents.some((item) => item.key === state.activeContent) ? state.activeContent : record.section === "logs" ? "notes" : "overview";
}

function hasRecordAttachments(record) {
  return recordMediaSources(record, "attachments").length > 0;
}

function contentOrdinal(record, index) {
  return String(record.section === "projects" && textList(record.technicalStack).length > 0 ? index : index + 1).padStart(2, "0");
}

function splitUpdateIndex(body) {
  const lines = body.split(/\r?\n/);
  const startIndex = lines.findIndex((line) => line.trim() === "## Update Index");

  if (startIndex === -1) {
    return { mainBody: body, updates: [] };
  }

  let endIndex = lines.length;

  for (let index = startIndex + 1; index < lines.length; index += 1) {
    if (/^#{1,3} /.test(lines[index]) || lines[index].startsWith(":::note ") || lines[index].startsWith(":::previous-note ")) {
      endIndex = index;
      break;
    }
  }

  const updates = lines
    .slice(startIndex + 1, endIndex)
    .map((line) => line.trim())
    .filter((line) => line.startsWith("- "))
    .map((line) => line.slice(2));
  const mainBody = [...lines.slice(0, startIndex), ...lines.slice(endIndex)].join("\n").trim();

  return { mainBody, updates };
}

function noteEntries(body) {
  const { mainBody } = splitUpdateIndex(body);
  return window.GestaltNoteInline?.parseNotes?.(mainBody) ?? (mainBody.trim() ? [{ title: "Current note", body: mainBody.trim() }] : []);
}

function setupHardwareFallback(body) {
  const notes = noteEntries(body);

  if (!notes.length) {
    return body;
  }

  return notes.map((note) => note.body).filter(Boolean).join("\n\n") || body;
}

function renderNoteInline(value) {
  const tokens = window.GestaltNoteInline?.tokenizeNoteInline(value);
  if (!tokens) return escapeHtml(value);
  const render = (items) => items.map((token) => {
    if (token.type === "strong") return `<strong>${render(token.children || [])}</strong>`;
    if (token.type === "em") return `<em>${render(token.children || [])}</em>`;
    if (token.type === "code") return `<code>${escapeHtml(token.value || "")}</code>`;
    if (token.type === "link") return `<a href="${escapeHtml(token.href)}" target="_blank" rel="noopener noreferrer" referrerpolicy="no-referrer">${render(token.children || [])}</a>`;
    return escapeHtml(token.value || "");
  }).join("");
  return render(tokens);
}

function markdownBody(body) {
  const lines = body.split(/\r?\n/);
  const output = [];

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const key = `data-line="${index}"`;
    const heading = window.GestaltNoteInline?.noteHeading?.(line, "Previous note");

    if (heading) {
      const innerLines = [];

      index += 1;

      while (index < lines.length && lines[index].trim() !== ":::") {
        innerLines.push(lines[index]);
        index += 1;
      }

      output.push(`<details class="note-entry" ${key}>
        <summary><span>${escapeHtml(heading.title)}</span><i>open</i></summary>
        <div class="note-entry-body">${markdownBody(innerLines.join("\n"))}</div>
      </details>`);
      continue;
    }

    if (!line.trim()) {
      output.push("<br />");
      continue;
    }

    if (line.startsWith("# ")) {
      output.push(`<h3 ${key}>${renderNoteInline(line.slice(2))}</h3>`);
      continue;
    }

    if (line.startsWith("## ")) {
      output.push(`<h4 ${key}>// ${renderNoteInline(line.slice(3))}</h4>`);
      continue;
    }

    if (line.startsWith("### ")) {
      output.push(`<h5 ${key}>${renderNoteInline(line.slice(4))}</h5>`);
      continue;
    }

    const imageMatch = line.match(/^!\[(.*?)]\((.*?)\)$/);

    if (imageMatch) {
      const media = parseNoteMediaOptions(imageMatch[1]);
      const expandedSrc = media.full || imageMatch[2];
      output.push(`<figure class="${noteMediaClassName(media)}" ${key}>
        <button class="note-media-button" type="button" data-expand-image="${escapeHtml(expandedSrc)}" data-expand-alt="${escapeHtml(media.caption)}">
          <img src="${escapeHtml(imageMatch[2])}" alt="${escapeHtml(media.caption)}" decoding="async" loading="lazy" />
        </button>
        ${media.caption ? `<figcaption>${escapeHtml(media.caption)}</figcaption>` : ""}
      </figure>`);
      continue;
    }

    if (line.startsWith("- [x] ")) {
      output.push(`<p class="check-line" ${key}><span>[x]</span>${renderNoteInline(line.slice(6))}</p>`);
      continue;
    }

    if (line.startsWith("- [ ] ")) {
      output.push(`<p class="check-line is-open" ${key}><span>[ ]</span>${renderNoteInline(line.slice(6))}</p>`);
      continue;
    }

    if (line.startsWith("- ")) {
      output.push(`<p class="bullet-line" ${key}><span>&gt;</span>${renderNoteInline(line.slice(2))}</p>`);
      continue;
    }

    if (line.startsWith("> ")) {
      output.push(`<blockquote ${key}>${renderNoteInline(line.slice(2))}</blockquote>`);
      continue;
    }

    output.push(`<p ${key}>${renderNoteInline(line)}</p>`);
  }

  return output.join("");
}

function parseNoteMediaOptions(rawAlt) {
  const tokens = rawAlt.split("|").map((token) => token.trim()).filter(Boolean);
  const caption = tokens[0] && !isNoteMediaToken(tokens[0]) ? tokens[0] : "";
  const optionTokens = tokens.slice(caption ? 1 : 0);
  const options = new Set(optionTokens.map((token) => token.toLowerCase()));
  const full = optionTokens.find((token) => token.toLowerCase().startsWith("full="))?.slice(5).trim();
  const size = options.has("banner") ? "banner" : options.has("wide") ? "wide" : options.has("small") ? "small" : "default";
  const align = options.has("left") ? "left" : options.has("right") ? "right" : "center";
  const position = options.has("top") ? "top" : options.has("bottom") ? "bottom" : "center";
  const fit = options.has("crop") || size === "banner" ? "crop" : "contain";

  return {
    align,
    caption: options.has("no-caption") ? "" : caption,
    fit: options.has("contain") ? "contain" : fit,
    full,
    position,
    size
  };
}

function isNoteMediaToken(value) {
  const normalized = value.toLowerCase();

  return normalized.startsWith("full=") || ["wide", "banner", "small", "left", "right", "center", "top", "bottom", "crop", "contain", "no-caption"].includes(normalized);
}

function noteMediaClassName(media) {
  return [
    "note-media",
    `note-media--${media.size}`,
    `note-media--${media.align}`,
    `note-media--${media.fit}`,
    `note-media--${media.position}`
  ].join(" ");
}

function recordBanner(record) {
  const steamBanner = record.section === "games" ? steamDisplayModule?.steamBannerImage(record.banner) : null;
  const framing = window.GestaltImageFraming?.imageFrameCss(record, steamBanner ? "contain" : "cover") || "";
  return record.banner
    ? `<div class="banner-frame${steamBanner ? " banner-frame--steam" : ""}"><img src="${escapeHtml(steamBanner || record.banner)}"${steamBanner ? ` data-steam-cover="${escapeHtml(record.banner)}"` : ""}${framing ? ` style="${framing}"` : ""} alt="" decoding="async" loading="lazy" /></div>`
    : `<div class="empty-banner"><svg class="empty-banner-icon" viewBox="0 0 32 32" aria-hidden="true"><rect x="9" y="9" width="14" height="14" rx="1.5"></rect><path d="M12 5v4M16 5v4M20 5v4M12 23v4M16 23v4M20 23v4M5 12h4M5 16h4M5 20h4M23 12h4M23 16h4M23 20h4"></path><path d="M13 13h6v6h-6z"></path></svg></div>`;
}

function recordMilestones(record) {
  return record.milestones
    .map(
      (milestone) => `<div class="milestone">
        <span>&gt; ${escapeHtml(milestone.label)}</span>
        <span class="progress-blocks" aria-label="${milestone.progress}%">${progressBlocks(milestone.progress)}</span>
        <em>${escapeHtml(milestone.status)}</em>
      </div>`
    )
    .join("");
}

function renderOverviewPage(record) {
  const hasHeaderArtwork = window.GestaltImageFraming?.recordHeadingArtwork?.(record) || recordHeaderImage(record);
  const showOverviewBanner = !hasHeaderArtwork && (record.section !== "projects" || Boolean(record.banner));
  const milestones = recordMilestones(record);

  return `<div class="overview-stack${record.section === "projects" ? " overview-stack--project" : ""}">
    ${showOverviewBanner ? recordBanner(record) : ""}
    <section class="record-section"><h3>// OVERVIEW</h3><p>${escapeHtml(record.summary)}</p></section>
    <section class="record-section">
      <div class="section-row"><h3>// CURRENT PROGRESS</h3><span>${record.progress}%</span></div>
      <div class="progress-meter" aria-label="${record.progress}%"><span style="inline-size: ${record.progress}%"></span></div>
      ${milestones ? `<div class="milestone-list">${milestones}</div>` : ""}
    </section>
  </div>`;
}

function renderMediaPage(record, title = "MEDIA", prefix = "MEDIA") {
  const mediaSources = recordMediaSources(record, "attachments");

  return `<section class="content-terminal" aria-label="${escapeHtml(record.title)} media">
    <div class="terminal-title">// ${title}</div>
    <div class="sample-kicker">Media</div>
      <div class="sample-grid">
        ${mediaSources
          .map((mediaSource, index) => {
            const slot = index + 1;

            return `<button class="sample-terminal" type="button" data-expand-image="${escapeHtml(mediaSource)}" data-expand-alt="${escapeHtml(`${record.title} attachment ${slot}`)}">
              <span>${prefix}_${String(slot).padStart(2, "0")}</span>
              <div class="sample-frame">
                <img src="${escapeHtml(mediaSource)}" alt="" decoding="async" loading="lazy" />
              </div>
              <i>Capture ${String(slot).padStart(2, "0")}</i>
            </button>`;
          })
          .join("")}
      </div>
  </section>`;
}

function renderSamplePage(record) {
  const mediaSources = recordMediaSources(record, "samples");

  return `<section class="content-terminal" aria-label="${escapeHtml(record.title)} sample media">
    <div class="terminal-title">// SAMPLE</div>
    <div class="sample-kicker">Media</div>
    <div class="sample-grid" aria-label="${escapeHtml(record.title)} media samples">
      ${mediaSources
        .map((mediaSource, index) => {
          const slot = index + 1;

          return `<button class="sample-terminal" type="button" data-expand-image="${escapeHtml(mediaSource)}" data-expand-alt="${escapeHtml(`${record.title} sample ${slot}`)}">
            <span>MEDIA_${String(slot).padStart(2, "0")}</span>
            <div class="sample-frame">
              <img src="${escapeHtml(mediaSource)}" alt="" decoding="async" loading="lazy" />
            </div>
            <i>Sample ${String(slot).padStart(2, "0")}</i>
          </button>`;
        })
        .join("")}
    </div>
  </section>`;
}

function recordMediaSources(record, key) {
  const rawSources = record[key];
  const sources = Array.isArray(rawSources)
    ? rawSources
    : typeof rawSources === "string"
      ? rawSources.split(/\r?\n|,/)
      : [];
  const cleanSources = sources.map((source) => String(source).trim()).filter(Boolean);

  return cleanSources.slice(0, 6);
}

function matchingNotes(notes, query) {
  const search = query.trim().toLowerCase();
  return notes.flatMap((note, index) => note.title.toLowerCase().includes(search) ? [{ ...note, index }] : []);
}

function notePage(notes, query, requestedPage, focusedIndex) {
  const size = 5;
  const search = query.trim().toLowerCase();
  const matches = matchingNotes(notes, search);
  const focused = !search && focusedIndex !== undefined && notes[focusedIndex] ? focusedIndex : undefined;
  const pages = Math.max(1, Math.ceil(matches.length / size));
  const initial = focused === undefined ? 0 : Math.floor(focused / size);
  const page = Math.min(pages - 1, Math.max(0, requestedPage ?? initial));
  const visible = matches.slice(page * size, (page + 1) * size);
  const openIndex = focused !== undefined && page === initial ? focused : search || page === 0 ? visible[0]?.index : undefined;
  return { notes: visible, page, pages, openIndex };
}

function currentNotePage(record) {
  const searching = Boolean(state.noteSearchQuery.trim());
  return notePage(noteEntries(record.body), state.noteSearchQuery, searching ? state.noteSearchPage : state.noteBrowsePage, state.focusedNoteIndex);
}

function renderNoteRows({ notes, openIndex }) {
  if (!notes.length) return '<p class="notes-empty">No note matches that signal.</p>';
  const handheld = pocket?.isHandheld();
  return notes.map((note) => {
    const index = note.index;
    const open = index === openIndex;
    const titleParts = splitNoteTitle(note.title);
    const link = note.id ? renderNoteLink(note.id) : "";
    return `<details class="note-entry note-entry--indexed" data-note-index="${index}"${open ? ' data-note-loaded="true" open' : ""}>
      <summary>
        <span class="note-entry-index">${String(index + 1).padStart(2, "0")}</span>
        ${titleParts.date ? `<time class="note-entry-date" datetime="${titleParts.dateTime}">${escapeHtml(titleParts.date)}</time>` : '<span class="note-entry-date"></span>'}
        <span class="note-entry-title">${escapeHtml(titleParts.title)}</span>
        <i aria-hidden="true">open</i>
      </summary>
      ${handheld ? "" : link}
      <div class="note-entry-body" data-note-body>${open ? `<div class="record-body">${markdownBody(note.body)}</div>` : ""}</div>
      ${handheld ? link : ""}
    </details>`;
  }).join("");
}

function renderNotesPage(record, handheld = false) {
  const paging = currentNotePage(record);
  return `<section class="content-terminal notes-page" aria-label="${escapeHtml(record.title)} notes">
    <div class="notes-page-header">
      <div class="terminal-title">// NOTES PAGE</div>
      <nav class="note-pager" aria-label="Note pages"${paging.pages < 2 ? " hidden" : ""}>
        <button type="button" data-note-page="-1" aria-label="Previous note page" title="Previous note page" aria-disabled="${paging.page === 0}">${pocketIcon('<path d="m15 18-6-6 6-6"/>')}</button>
        <span aria-live="polite" aria-atomic="true">${paging.page + 1} / ${paging.pages}</span>
        <button type="button" data-note-page="1" aria-label="Next note page" title="Next note page" aria-disabled="${paging.page + 1 === paging.pages}">${pocketIcon('<path d="m9 18 6-6-6-6"/>')}</button>
      </nav>
    </div>
    ${handheld ? renderNoteSearch(record) : ""}
    <div class="note-stack">${renderNoteRows(paging)}</div>
  </section>`;
}

function recordNoteDirectory(record, query) {
  const searching = Boolean(query.trim());
  const files = matchingNotes(noteEntries(record.body), query);
  const countLabel = searching ? (files.length === 1 ? "MATCH" : "MATCHES") : (files.length === 1 ? "FILE" : "FILES");
  const items = files.map((note) => {
    const parts = splitNoteTitle(note.title);
    const title = parts.title === "Current note" ? record.title : parts.title;
    return `<button class="record-note-file" type="button" data-note-file-index="${note.index}">${pocketIcon('<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Zm0 0v6h6M8 13h8m-8 4h8"/>')}<strong>${escapeHtml(title)}</strong>${parts.date ? `<time datetime="${parts.dateTime}">${escapeHtml(parts.date)}</time>` : ""}</button>`;
  }).join("");
  return {
    count: `${String(files.length).padStart(2, "0")} ${countLabel}`,
    items: items || `<p class="notes-empty">${searching ? "No note matches that signal." : "No notes filed."}</p>`
  };
}

function renderRecordNoteFiles(record) {
  const { count, items } = recordNoteDirectory(record, state.noteSearchQuery);
  return `<section class="record-note-files" aria-label="${escapeHtml(record.title)} notes">
    <header class="record-note-files-header">
      <h3 class="terminal-title">// NOTE FILES</h3>
      <p class="record-note-file-count" role="status">${count}</p>
    </header>
    <div class="record-note-file-grid">${items}</div>
  </section>`;
}

function renderLogNoteContent(record) {
  const notes = noteEntries(record.body);
  const items = notes.map((note, index) => {
    const { title, date, dateTime } = splitNoteTitle(note.title);
    const showTitle = title !== "Current note" && (notes.length > 1 || title !== record.title);
    const link = note.id ? renderNoteLink(note.id) : "";
    return `<article class="log-reading-note" data-note-index="${index}">
      ${date || showTitle || link ? `<header class="log-reading-note-meta">
        ${showTitle ? `<h3>${escapeHtml(title)}</h3>` : ""}
        ${date ? `<time datetime="${dateTime}">${escapeHtml(date)}</time>` : ""}
        ${link}
      </header>` : ""}
      <div class="record-body">${markdownBody(note.body)}</div>
    </article>`;
  }).join("");
  return `<section class="log-reading-notes" aria-label="${escapeHtml(record.title)} notes">${items || '<p class="notes-empty">No notes filed.</p>'}</section>`;
}

function renderFocusedNote(record, note, toFiles = false) {
  const parts = splitNoteTitle(note.title);
  const title = parts.title === "Current note" ? record.title : parts.title;
  return `<section class="focused-note" aria-labelledby="focused-note-title">
    <header class="focused-note-header"><div>
      ${parts.date ? `<time datetime="${parts.dateTime}">${escapeHtml(parts.date)}</time>` : ""}
      <h2 id="focused-note-title">${escapeHtml(title)}</h2>
      ${title !== record.title ? `<p>${escapeHtml(record.title)}</p>` : ""}
    </div><button type="button" class="focused-note-full" ${toFiles ? `data-return-note-files>${pocketIcon('<path d="m12 19-7-7 7-7m-7 7h14"/>')} Notes` : `data-open-full-entry>Open full entry ${pocketIcon('<path d="M7 17 17 7M7 7h10v10"/>')}`}</button></header>
    <div class="record-body">${markdownBody(note.body)}</div>
  </section>`;
}

function splitNoteTitle(title) {
  const match = title.match(/^\s*(\d{1,2})\s*\/\s*(\d{1,2})\s*\/\s*(\d{4})\s*[-:–—]?\s*(.*)$/);

  if (!match) {
    return { date: "", dateTime: "", title: title.trim() || "Untitled note" };
  }

  const [, day, month, year, noteTitle] = match;
  return {
    date: `${day.padStart(2, "0")} / ${month.padStart(2, "0")} / ${year}`,
    dateTime: `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`,
    title: noteTitle.trim() || "Untitled note"
  };
}

function renderNoteSearch(record) {
  const notes = noteEntries(record.body);

  if (notes.length < 2) {
    return "";
  }

  const suggestions = [...new Set(notes.map((note) => note.title))]
    .map((title) => `<option value="${escapeHtml(title)}"></option>`)
    .join("");

  return `<div class="note-search-panel">
    <label for="note-search">Search note</label>
    <input id="note-search" type="search" list="note-search-suggestions" value="${escapeHtml(state.noteSearchQuery)}" data-note-search-input autocomplete="off" placeholder="Title or date" />
    <datalist id="note-search-suggestions">${suggestions}</datalist>
  </div>`;
}

function noteFileSearchIcon(open) {
  return pocketIcon(open ? '<path d="m18 6-12 12M6 6l12 12"/>' : '<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>');
}

function renderNoteFileSearch(record) {
  if (noteEntries(record.body).length < 2) return "";
  const open = Boolean(state.noteFileSearchOpen);
  return `<div class="record-note-search"${open ? " data-expanded" : ""}>
    <input id="record-note-search-input" type="search" data-note-search-input value="${escapeHtml(state.noteSearchQuery)}" autocomplete="off" placeholder="Title or date" aria-label="Search notes" />
    <button type="button" data-record-note-search-toggle aria-expanded="${open}" aria-controls="record-note-search-input" aria-label="${open ? "Close note search" : "Search notes"}">${noteFileSearchIcon(open)}</button>
  </div>`;
}

function renderUpdateHistory(record) {
  const { updates } = splitUpdateIndex(record.body);

  if (!updates.length) {
    return "";
  }

  return `<div class="update-history">
    <button type="button" aria-expanded="false" data-update-history-toggle>
      <span>UPDATE INDEX</span>
      <i>${updates.length}</i>
    </button>
  </div>`;
}

function renderUpdateHistoryModal(record) {
  const { updates } = splitUpdateIndex(record.body);

  if (!updates.length) {
    return "";
  }

  const hidden = state.updateHistoryOpen ? "" : "hidden";

  return `<button class="update-history-backdrop" type="button" aria-label="Close update index" data-update-history-backdrop ${hidden}></button>
  <div class="update-history-window" role="dialog" aria-label="Update index" ${hidden}>
    <header><span>// UPDATE INDEX</span></header>
    <ol>${updates.map((update) => `<li>${escapeHtml(update)}</li>`).join("")}</ol>
  </div>`;
}

function renderTechnicalPage(record) {
  const stackItems = textList(record.technicalStack);

  return `<section class="content-terminal" aria-label="${escapeHtml(record.title)} technical stack">
    <div class="terminal-title">// TECHNICAL STACK</div>
    <div class="detail-list">
      ${stackItems
        .map((item) => `<p>&gt; ${escapeHtml(item)}</p>`)
        .join("")}
    </div>
  </section>`;
}

function renderSetupPage(record) {
  const hardware = setupHardwareSource(record);

  return `<section class="content-terminal setup-terminal" aria-label="${escapeHtml(record.title)} hardware">
    <div class="terminal-title">// HARDWARE</div>
    <div class="record-body">${markdownBody(hardware)}</div>
  </section>`;
}

function renderRecommendationPage(record) {
  const recommendation = textBlock(record.recommendation) || "Recommendation stays pending until the session has enough time behind it. Current notes are being kept as observations, not a final verdict.";

  return `<section class="content-terminal" aria-label="${escapeHtml(record.title)} recommendation">
    <div class="terminal-title">// RECOMMENDATION</div>
    <div class="status-grid">
      <div class="status-cell"><span>STATUS</span><strong>${escapeHtml(record.status)}</strong></div>
      <div class="status-cell"><span>PROGRESS</span><strong>${record.progress}%</strong></div>
    </div>
    <p class="terminal-copy">${escapeHtml(recommendation)}</p>
  </section>`;
}

function renderChangeLogPage(record) {
  return `<section class="content-terminal" aria-label="${escapeHtml(record.title)} change log">
    <div class="terminal-title">// CHANGE LOG</div>
    <div class="status-grid">
      <div class="status-cell"><span>CREATED</span><strong>${record.started ? readableDate(record.started) : "Unknown"}</strong></div>
      <div class="status-cell"><span>UPDATED</span><strong>${readableDate(recordLastUpdated(record))}</strong></div>
      <div class="status-cell"><span>STATE</span><strong>${escapeHtml(record.status)}</strong></div>
    </div>
  </section>`;
}

function renderRecordContent(record, activeContent, handheld = false) {
  if (activeContent === "overview") {
    return renderOverviewPage(record);
  }

  if (activeContent === "samples") {
    return renderSamplePage(record);
  }

  if (activeContent === "attachments") {
    return renderMediaPage(record, "ATTACHMENTS", "ATTACH");
  }

  if (activeContent === "notes") {
    if (record.section === "logs") return renderLogNoteContent(record);
    return usesNoteDirectory(record) ? renderRecordNoteFiles(record) : renderNotesPage(record, handheld);
  }

  if (activeContent === "technical") {
    return renderTechnicalPage(record);
  }

  if (activeContent === "hardware") {
    return renderSetupPage(record);
  }

  if (activeContent === "recommendation") {
    return renderRecommendationPage(record);
  }

  if (activeContent === "changelog") {
    return renderChangeLogPage(record);
  }

  return renderOverviewPage(record);
}

function sidebar() {
  const metrics = archiveMetrics();
  const activeConfig = sections.find((section) => section.id === state.activeSection) || sections[0];
  const activeSectionIndex = Math.max(0, sections.findIndex((section) => section.id === state.activeSection));
  const previousActiveSectionIndex = Math.max(0, sections.findIndex((section) => section.id === state.previousActiveSection));
  const navMotionClass = previousActiveSectionIndex !== activeSectionIndex ? " is-sliding" : "";
  const groups = sections
    .map(
      (section) => `<div class="nav-group">
        <button class="nav-trigger ${state.activeSection === section.id ? "is-active" : ""}" type="button" ${state.activeSection === section.id ? `aria-current="page"` : ""} data-open-section="${section.id}">
          <span class="nav-mark" data-icon="${section.icon}" aria-hidden="true"></span>
          <span class="nav-label">
            <strong>${section.code}</strong>
            <small class="nav-readable">${renderCipherLetters(section.label)}</small>
          </span>
          <span class="section-signal" aria-hidden="true"></span>
        </button>
      </div>`
    )
    .join("");

  return `<aside class="sidebar" id="desktop-archive-sidebar" aria-label="Archive sidebar">
    <div class="brand-block">
      <div class="mobile-brand-meta">
        <span>v1.87.0</span>
        <span>HANDHELD FIELD MODE</span>
      </div>
      <div class="mobile-clock" aria-label="Archive date">
        <span data-time-date>${formatDate()}</span>
      </div>
      <div class="brand-row">
        <button class="brand" type="button" data-home>GESTALT</button>
        <button class="archive-menu-toggle ${state.navOpen ? "is-active" : ""}" type="button" aria-expanded="${state.navOpen ? "true" : "false"}" aria-label="Open archive navigation" data-nav-toggle>
          <span class="archive-menu-glyph" aria-hidden="true"><i></i></span>
          <span class="archive-menu-code">${escapeHtml(activeConfig.code)}</span>
        </button>
      </div>
      <div class="desktop-brand-meta">
        <span class="version-label">v1.87.0</span>
        <span class="desktop-mode-label">OPERATOR DESK MODE</span>
      </div>
      <i aria-hidden="true">-</i>
    </div>

    <nav aria-label="Archive navigation">
      <p class="sidebar-label">// ARCHIVE NAVIGATION</p>
      <div class="nav-stack nav-stack--sidebar${navMotionClass}" style="--active-nav-index: ${activeSectionIndex}; --previous-nav-index: ${previousActiveSectionIndex}">${groups}</div>
    </nav>

    <div class="system-status">
      <p>// SYSTEM STATUS</p>
      <dl>
        <div><dt>USER</dt><dd>Eightmouse</dd></div>
        <div><dt>RECORDS</dt><dd>${metrics.recordCount}</dd></div>
        <div><dt>MEDIA</dt><dd>${metrics.mediaCount}</dd></div>
        <div><dt>ACTIVE PRJ</dt><dd>${metrics.activeProjects}</dd></div>
        <div><dt>ACTIVE GAME</dt><dd data-current-game-label>${escapeHtml(currentGameDisplay()?.title || "None")}</dd></div>
        <div><dt>LAST FILED</dt><dd>${escapeHtml(readableDate(metrics.latestActivityDate))}</dd></div>
        <div><dt>OS VERSION</dt><dd>GESTALT OS v1.87.0</dd></div>
      </dl>
    </div>
  </aside>`;
}

function archiveNavigationMenu() {
  if (!state.navOpen) {
    return "";
  }

  const groups = sections
    .map(
      (section) => `<div class="nav-group">
        <button class="nav-trigger ${state.activeSection === section.id ? "is-active" : ""}" type="button" ${state.activeSection === section.id ? `aria-current="page"` : ""} data-open-section="${section.id}">
          <span class="nav-mark" data-icon="${section.icon}" aria-hidden="true"></span>
          <span class="nav-label">
            <strong>${section.code}</strong>
            <small class="nav-readable">${renderCipherLetters(section.label)}</small>
          </span>
          <span class="section-signal" aria-hidden="true"></span>
        </button>
      </div>`
    )
    .join("");
  const archiveGroups = sections
    .filter((section) => section.id === "archive")
    .map(
      (section) => `<div class="nav-group">
        <button class="nav-trigger ${state.activeSection === section.id ? "is-active" : ""}" type="button" ${state.activeSection === section.id ? `aria-current="page"` : ""} data-open-section="${section.id}">
          <span class="nav-mark" data-icon="${section.icon}" aria-hidden="true"></span>
          <span class="nav-label">
            <strong>${section.code}</strong>
            <small class="nav-readable">${renderCipherLetters(section.label)}</small>
          </span>
          <span class="section-signal" aria-hidden="true"></span>
        </button>
      </div>`
    )
    .join("");
  const currentGame = currentGameRecord();

  return `<button class="archive-nav-backdrop" type="button" aria-label="Close archive navigation" data-nav-backdrop></button>
    <nav class="archive-nav-panel" aria-label="Archive navigation">
      <header>
        <p>// ARCHIVE NAVIGATION</p>
        <span>UTILITY / DEEP ARCHIVE</span>
      </header>
      <div class="archive-nav-actions archive-nav-actions--desktop" aria-label="Quick archive actions">
        <button class="${state.searchOpen ? "is-active" : ""}" type="button" data-search-toggle><span class="search-icon" aria-hidden="true"></span>Search</button>
        <button type="button" data-open-timeline><span>⌬</span>Trace</button>
        <button type="button" data-current-game-action ${currentGame ? `data-open-record="${currentGame.id}" data-open-content="notes"` : "disabled"}><span>◇</span>Current</button>
      </div>
      <div class="archive-nav-search archive-nav-search--mobile" role="search">
        <label for="mobile-archive-search">// SEARCH</label>
        <input id="mobile-archive-search" type="search" value="${escapeHtml(state.searchQuery)}" placeholder="Search records" autocomplete="off" data-mobile-nav-search-input />
      </div>
      <div class="archive-nav-actions archive-nav-actions--mobile" aria-label="Mobile archive actions">
        <button type="button" data-open-timeline><span>&#9004;</span>Trace</button>
        <button type="button" data-current-game-action ${currentGame ? `data-open-record="${currentGame.id}" data-open-content="notes"` : "disabled"}><span>&#9671;</span>Current</button>
      </div>
      <div class="nav-stack nav-stack--desktop">${groups}</div>
      <div class="nav-stack nav-stack--mobile-archive">${archiveGroups}</div>
    </nav>`;
}

function dashboardPanel(title, body, footerLabel, action, className = "") {
  const module = window.GestaltOsBehaviour?.bootModules?.[title];
  const titleMarkup = footerLabel && action
    ? `<button class="panel-title-action" type="button" ${action} aria-label="${escapeHtml(footerLabel)}" title="${escapeHtml(footerLabel)}">${escapeHtml(title)}</button>`
    : escapeHtml(title);
  return `<article class="dashboard-panel ${className}"${module ? ` data-boot-module="${module.id}" style="--boot-module-order: ${module.order}"` : ""}>
    <h2>${titleMarkup}</h2>
    <div>${body}</div>

  </article>`;
}

function localMemoryPrompt() {
  if (state.localMemory !== "prompt" || !state.bootDismissed) {
    return "";
  }

  return `<div class="local-memory-consent" role="dialog" aria-modal="true" aria-labelledby="local-memory-title">
    <div>
      <p>// LOCAL MEMORY REQUEST</p>
      <h2 id="local-memory-title">Remember this terminal?</h2>
      <span>Gestalt can remember this choice in your browser so this prompt stays out of the way on repeat visits. No account, tracking, analytics, or personal data.</span>
      <div>
        <button type="button" data-local-memory-allow>Allow local memory</button>
        <button type="button" data-local-memory-session>Continue once</button>
      </div>
    </div>
  </div>`;
}

function weatherPanel() {
  const actionLabel = weatherState.loading ? "Reading sky signal" : "Refresh sky";
  const refreshIcon = weatherRefreshIcon();

  return `<div class="weather-readout" data-weather-module>
    <div class="weather-primary">
      <span class="weather-temp" data-temp="${escapeHtml(weatherState.temp)}" data-weather-temp>${escapeHtml(weatherState.temp)}</span>
      ${weatherTraceMarkup()}
      <button class="weather-action${weatherState.loading ? " is-loading" : ""}" type="button" data-weather-action aria-label="${actionLabel}" title="${actionLabel}" ${weatherState.loading ? "disabled" : ""}>
        ${refreshIcon}
      </button>
      <span class="weather-condition" data-weather-condition>${escapeHtml(weatherState.condition)}</span>
    </div>
    <div class="weather-meta">
      <span data-weather-label>${escapeHtml(weatherState.label)}</span>
      <span data-weather-meta>${escapeHtml(weatherState.meta)}</span>
    </div>
    <p class="weather-note" data-weather-note>${escapeHtml(weatherState.note)}</p>
  </div>`;
}

function weatherTraceMarkup() {
  const trace = pocket.weatherTrace(weatherState.trace);
  if (!trace) return '<span class="weather-trace" data-weather-trace aria-hidden="true"></span>';
  return `<span class="weather-trace" data-weather-trace role="img" aria-label="Next ${trace.hours} hours: low ${trace.low}C, high ${trace.high}C"><svg viewBox="0 0 100 30" preserveAspectRatio="none" aria-hidden="true" focusable="false"><polyline points="${trace.points}" vector-effect="non-scaling-stroke"></polyline><circle cx="${trace.now[0]}" cy="${trace.now[1]}" r="1.6" vector-effect="non-scaling-stroke"></circle></svg><small><span>${trace.hours}H</span>${trace.low}&ndash;${trace.high}C</small></span>`;
}

function weatherRefreshIcon() {
  return `<svg class="weather-action-icon" viewBox="0 0 36 36" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="square" stroke-linejoin="miter">
    <path class="weather-action-frame" d="M18 8.5 27.5 18 18 27.5 8.5 18Z"></path>
    <path class="weather-action-core" d="M18 13.5 22.5 18 18 22.5 13.5 18Z"></path>
    <path class="weather-action-signal" d="M26.5 10H30v3.5M9.5 26H6v-3.5M27 23l3 3M9 13l-3-3"></path>
  </svg>`;
}

function memoryLoop() {
  return `<div class="memory-loop" aria-hidden="true" data-memory-loop>
    <div class="memory-field">
    <span class="memory-core"></span>
    <span class="memory-orbit"></span>
    <span class="memory-gate"></span>
    <span class="memory-shard"></span>
    <span class="memory-nodes"></span>
    </div>
  </div>`;
}

function memoryPanelContent() {
  return state.memoryMode === "legacy" || !window.GestaltMemoryState
    ? memoryLoop()
    : `<div class="memory-trace" data-memory-trace>${window.GestaltMemoryState.renderShell()}</div>`;
}

function changeMemoryMode(value) {
  const api = window.GestaltMemoryState;
  if (!api) return;
  const mode = api.normalizeMode(value);
  if (mode === state.memoryMode) return;
  state.memoryMode = mode;
  if (state.localMemory === "granted") api.saveMode(mode);
  const panel = root.querySelector(".memory-panel > div");
  if (panel) panel.innerHTML = memoryPanelContent();
  syncMemoryMotion();
  syncMemoryTrace();
}

function currentGamePanel() {
  const currentGame = currentGameRecord();
  const display = currentGameDisplay();
  const summary = escapeHtml(cleanSummaryText(currentGame?.summary));
  const image = steamDisplayModule?.currentGameCover?.(currentGame, display?.coverAppId)
    || currentGame?.dashboardImage || currentGame?.banner || currentGame?.headerImage || "public/images/archive-backdrop.webp";
  const hint = display?.changedAt ? `Steam snapshot changed ${display.changedAt.slice(0, 10).split("-").reverse().join(" / ")}. Not live presence.` : "";
  const content = display ? `<div class="current-game" data-state="${recordStateKey(display.status)}" title="${escapeHtml(hint)}">
    <div class="game-cover${steamDisplayModule?.steamBannerImage(image) ? " is-steam-artwork" : ""}"><img src="${escapeHtml(image)}" alt="" decoding="async" referrerpolicy="no-referrer" /><img class="screen-bloom" src="${escapeHtml(image)}" alt="" aria-hidden="true" decoding="async" referrerpolicy="no-referrer" /></div>
    <div><strong>${escapeHtml(display.title)}</strong>
      ${summary ? `<span class="current-game-summary" title="${summary}">${summary}</span>` : ""}
      ${display.playtime ? `<span>${escapeHtml(display.playtime)} Play Time</span>` : ""}
      ${display.lastPlayed ? `<span>Last Played: ${escapeHtml(display.lastPlayed)}</span>` : ""}
    </div>
  </div>` : `<p class="subtle" role="status">${steamDisplayReady ? "No session active." : "Reading Steam snapshot..."}</p>`;
  return dashboardPanel("CURRENT GAME", content, currentGame ? "Read note" : "", currentGame ? `data-open-record="${currentGame.id}" data-open-content="notes"` : "", "current-game-panel");
}

function dashboard() {
  const activeProjects = updatedProjectRecords();
  const latestLog = latestLogRecord();
  const activity = recentActivity(6);
  const activityRows = activity.map((item) => {
    const freshness = activityFreshness(item.date);

    return { freshness, item };
  });

  const projectList = activeProjects.length
    ? `<div class="record-list">
      ${activeProjects
        .slice(0, 5)
        .map(
          (record) => `<button type="button" data-open-record="${record.id}" data-state="${recordStateKey(record.status)}">
          <span><strong>${escapeHtml(record.title)}</strong><small>${escapeHtml(record.status)}</small></span>
          <i>${record.progress}%</i>
        </button>`
        )
        .join("")}
    </div>`
    : `<p class="subtle">No projects filed yet.</p>`;

  const log = latestLog
    ? `<div class="latest-log" data-state="${recordStateKey(latestLog.status)}"><i class="latest-log-signal" aria-hidden="true"></i><span>${shortDate(latestLog.updated)}</span><p>${escapeHtml(recordDisplaySummary(latestLog))}</p></div>`
    : `<p class="subtle">No field notes stored.</p>`;

  const feed = activityRows.length
    ? `<ol class="activity-feed">
      ${activityRows
        .map(
          ({ freshness, item }) => `<li data-activity-age="${freshness}" data-state="${recordStateKey(item.record.status)}">
          <span>[${shortDate(item.date)}]</span>
          <button type="button" data-open-record="${escapeHtml(item.record.id)}"${item.content ? ` data-open-content="${item.content}"` : ""}${item.noteIndex !== undefined ? ` data-open-note-index="${item.noteIndex}"` : ""}${item.record.section !== "setup" && item.content === "notes" && item.noteIndex !== undefined ? " data-open-note-reader" : ""}>
            <strong>${escapeHtml(item.title)}</strong>
            <small>${escapeHtml(item.detail)}</small>
          </button>
          <i class="activity-badge" aria-hidden="true">${freshness}</i>
        </li>`
        )
        .join("")}
    </ol>`
    : `<p class="subtle">No activity filed yet.</p>`;

  return `<div class="dashboard-grid${state.panelOpen ? " is-muted" : ""}${state.memoryStateEnabled ? "" : " without-memory"}">
    ${dashboardPanel("PROJECTS", projectList, `View all (${activeProjects.length})`, `data-open-section="projects"`, "wide-panel active-projects-panel")}
    ${dashboardPanel("LOCAL WEATHER", weatherPanel(), "", "", "weather-panel")}
    ${state.memoryStateEnabled ? dashboardPanel("MEMORY STATE", memoryPanelContent(), "", "", "memory-panel") : ""}
    ${currentGamePanel()}
    ${dashboardPanel("LATEST LOG", log, "Read log", latestLog ? `data-open-record="${escapeHtml(latestLog.id)}" data-open-note-index="0" data-open-note-reader` : "", "latest-log-panel")}
    ${dashboardPanel("RECENT ACTIVITY", feed, "View full timeline", "data-open-timeline", "wide-panel activity-panel")}
    ${seasonalAccentMarkup()}
  </div>`;
}

function fieldPaperExcerpt(record) {
  const first = noteEntries(record.body)[0];
  const paragraphs = [];
  let remaining = 1800;
  for (const block of (first?.body ?? splitUpdateIndex(record.body).mainBody).split(/\r?\n\s*\r?\n/)) {
    const paragraph = excerptFromBody(block, remaining);
    if (!paragraph) continue;
    paragraphs.push(paragraph);
    remaining -= paragraph.length + 2;
    if (remaining < 40) break;
  }
  return paragraphs.join("\n\n") || excerptFromBody(cleanSummaryText(record.summary), 1800);
}

function renderFieldPaperFace(record) {
  const date = logArchiveDate(record);
  const excerpt = fieldPaperExcerpt(record);
  return `<span class="field-paper-face">
      <span class="field-paper-meta"><span>FIELD NOTE</span><time datetime="${escapeHtml(date)}">${escapeHtml(readableDate(date))}</time></span>
      <strong class="field-paper-title">${escapeHtml(record.title)}</strong>
      ${excerpt ? `<span class="field-paper-excerpt">${escapeHtml(excerpt)}</span>` : ""}
      <span class="field-paper-open" aria-hidden="true">${pocketIcon('<path d="M7 17 17 7M7 7h10v10"/>')}</span>
    </span>`;
}

function renderFieldPaperDeck({ record, edges, index }, arriving = false) {
  return `<button class="field-paper-front" type="button" data-field-current="${escapeHtml(record.id)}" data-field-lean="${index % 2 ? "right" : "left"}" ${arriving ? "data-field-arriving" : ""} data-open-record="${escapeHtml(record.id)}" data-open-content="notes" aria-label="Read ${escapeHtml(record.title)}">
      ${renderFieldPaperFace(record)}
    </button>
    ${edges.map((edge) => `<button class="field-paper-peek" type="button" data-field-peek="${escapeHtml(edge.id)}" aria-label="Bring ${escapeHtml(edge.title)} forward">
        ${renderFieldPaperFace(edge)}
        <span class="field-paper-spine-label" aria-hidden="true">${escapeHtml(edge.title)}</span>
      </button>`).join("")}`;
}

function renderFieldPapers(records) {
  const stack = pocket.fieldPaperStack(records, state.fieldPaperId);
  const { record, index, total, previous, next } = stack;
  if (!record) return '<div class="field-paper-desk"><p class="search-empty">No recent field notes.</p></div>';
  return `<section class="field-paper-desk" aria-label="Field papers">
    <div class="field-paper-deck" id="field-paper-deck">${renderFieldPaperDeck(stack)}</div>
    ${total > 3 ? `<nav class="field-paper-pager" aria-label="Browse field papers">
      <button type="button" data-field-step="previous" aria-label="Newer field note" aria-controls="field-paper-deck" aria-disabled="${!previous}">${pocketIcon('<path d="m15 18-6-6 6-6"/>')}</button>
      <span role="status"><span class="field-paper-status-title">${escapeHtml(record.title)}: </span><span data-field-position>${index + 1} / ${total}</span></span>
      <button type="button" data-field-step="next" aria-label="Older field note" aria-controls="field-paper-deck" aria-disabled="${!next}">${pocketIcon('<path d="m9 18 6-6-6-6"/>')}</button>
    </nav>` : ""}
  </section>`;
}

function selectFieldPaper(button) {
  const desk = button.closest(".field-paper-desk");
  const deck = desk?.querySelector(".field-paper-deck");
  if (state.activeSection !== "logs" || !deck) return;
  const { desk: ordered } = partitionFieldLogs(recordsFor("logs"));
  const current = pocket.fieldPaperStack(ordered, state.fieldPaperId);
  const { fieldPeek, fieldStep } = button.dataset;
  const id = fieldPeek || (fieldStep === "previous" ? current.previous : current.next);
  if (!id || id === current.record?.id) return;
  const stack = pocket.fieldPaperStack(ordered, id);
  if (stack.record?.id !== id) return;
  state.fieldPaperId = id;
  deck.innerHTML = renderFieldPaperDeck(stack, true);
  const status = desk.querySelector("[data-field-position]");
  if (status) {
    desk.querySelector(".field-paper-status-title").textContent = `${stack.record.title}: `;
    status.textContent = `${stack.index + 1} / ${stack.total}`;
    for (const step of desk.querySelectorAll("[data-field-step]")) step.setAttribute("aria-disabled", String(!stack[step.dataset.fieldStep]));
  }
  if (fieldPeek) deck.querySelector(".field-paper-front")?.focus({ preventScroll: true });
}

function sectionPage(sectionId) {
  const section = sections.find((entry) => entry.id === sectionId) || sections[0];
  if (sectionId === "logs") {
    const { desk, archived } = partitionFieldLogs(recordsFor("logs"));
    const readout = [
      { label: "DESK", value: String(desk.length).padStart(2, "0") },
      { label: "FILED", value: String(archived.length).padStart(2, "0") },
      { label: "LAST", value: desk[0] ? readableDate(logArchiveDate(desk[0])) : "-- / -- / ----" }
    ];
    return `<section class="section-page section-page--logs" aria-label="Field Notes">
    <header class="section-page-header">
      <span class="nav-mark" data-icon="${section.icon}" aria-hidden="true"></span>
      <div>
        <h2 class="cipher-section">${renderCipherLetters(sectionRegistryLabels.logs)}</h2>
        ${renderSectionReadout(readout)}
      </div>
      <i>${desk.length} ${desk.length === 1 ? "paper" : "papers"}</i>
    </header>
    ${renderFieldPapers(desk)}</section>`;
  }
  if (sectionId === "archive") {
    return renderArchiveFolders(section, [...recordsFor("archive"), ...recordsFor("logs")]);
  }
  const visibleRecords = recordsFor(sectionId).sort(compareSectionRecords);
  const countLabel = `${visibleRecords.length} ${visibleRecords.length === 1 ? "record" : "records"}`;
  const splitSection = splitSectionRecords(sectionId, visibleRecords);
  const readout = sectionReadout(visibleRecords, splitSection, sectionId);

  if (sectionId === "setup") {
    return renderSetupBay(section, visibleRecords, countLabel, readout);
  }

  const games = sectionId === "games" ? gameShelfView(splitSection) : null;
  const searchOpen = games?.searchable && state.gameShelfSearch;

  return `<section class="section-page section-page--${section.id}${splitSection ? " section-page--selector" : ""}" aria-label="${escapeHtml(section.code)} records">
    <header class="section-page-header">
      ${splitSection ? `<button class="pocket-catalog-back" type="button" data-home>${pocketIcon('<path d="m12 19-7-7 7-7M5 12h14"/>')}Back to Index</button>` : ""}
      <span class="nav-mark" data-icon="${section.icon}" aria-hidden="true"></span>
      <div>
        ${splitSection ? "" : `<p>${escapeHtml(section.code)}</p>`}
          <h2 class="cipher-section">${renderCipherLetters(sectionRegistryLabels[section.id] || section.label)}</h2>
          ${renderSectionReadout(readout)}
      </div>
      ${games ? `<div class="section-page-header-actions"><i>${countLabel}</i>${renderGameShelfSearch(games.searchable, searchOpen)}</div>` : `<i>${countLabel}</i>`}
    </header>
      ${games ? renderGameShelf(games) : splitSection ? renderRecordSelector(splitSection) : `<div class="section-record-grid">${renderSectionRows(visibleRecords)}</div>`}
  </section>`;
}

function selectorGroupIndex(groups) {
  return state.selectorGroup ?? (groups[0].records.length || !groups[1].records.length ? 0 : 1);
}

function gameShelfView(groups) {
  const shelves = groups.map((group, i) => ({
    title: group.title,
    kind: i === 0 ? "session" : "past",
    results: pocket.filterShelfGames(group.records, state.gameShelfQuery)
  }));
  const normalShelf = pocket.gameShelfIndex(groups.map((group) => group.records.length), state.gameShelfPick);
  return {
    shelves,
    activeShelf: state.gameShelfQuery.trim()
      ? pocket.gameShelfIndex(shelves.map((shelf) => shelf.results.length), state.gameShelfSearchPick, normalShelf)
      : normalShelf,
    searchable: groups.reduce((sum, group) => sum + group.records.length, 0) >= (pocket.isHandheld() ? 1 : pocket.shelfSearchMin),
    count: shelves.reduce((sum, shelf) => sum + shelf.results.length, 0)
  };
}

function gameShelfIcon(open) {
  return open ? pocketIcon('<path d="m18 6-12 12M6 6l12 12"/>') : pocketIcon('<circle cx="11" cy="11" r="6"/><path d="m16 16 4 4"/>');
}

function renderGameShelfSearch(searchable, open) {
  return `<div class="game-search-dock" ${searchable ? "" : "hidden"}>
    <input id="game-shelf-search" class="game-shelf-search" type="search" aria-label="Search Session and Past Logs" placeholder="Search game titles" autocomplete="off" value="${escapeHtml(state.gameShelfQuery)}" ${open ? "" : "hidden"}>
    <button type="button" class="archive-create-record game-shelf-search-toggle" data-shelf-search-toggle aria-controls="game-shelf-search" aria-label="${open ? "Close game search" : "Search games"}" aria-expanded="${Boolean(open)}">${gameShelfIcon(open)}</button>
  </div>`;
}

function renderGameShelfResults({ kind, results }) {
  const empty = state.gameShelfQuery ? '<p class="search-empty">No matching games.</p>' : '';
  const rail = `game-rail-${kind}`;
  const label = kind === "session" ? "Session Logs" : "Past Logs";
  return `<div class="game-shelf-track">
    <div id="${rail}" class="record-media-cabinet" data-media-cabinet="${kind}" data-pocket-catalog>${results.length ? renderSelectorTiles(results, driveRecordId()) : empty || renderSelectorTiles([])}</div>
    <button class="game-shelf-edge" type="button" data-shelf-prev aria-disabled="true" tabindex="-1" aria-controls="${rail}" aria-label="Scroll ${label} left">${pocketIcon('<path d="m15 18-6-6 6-6"/>')}</button>
    <button class="game-shelf-edge" type="button" data-shelf-next aria-disabled="true" tabindex="-1" aria-controls="${rail}" aria-label="Scroll ${label} right">${pocketIcon('<path d="m9 18 6-6-6-6"/>')}</button>
  </div>`;
}

function gameShelfStatus(count) {
  return state.gameShelfQuery ? `${count} ${count === 1 ? "game" : "games"} found` : "";
}

function renderGameShelf(view) {
  return `<section class="record-selector record-selector--games" aria-label="Browse games">
    <div class="record-selector-groups pocket-shelf-switch" role="group" aria-label="Game shelves">
      ${view.shelves.map((shelf, index) => `<button type="button" data-pocket-shelf="${index}" aria-pressed="${index === view.activeShelf}" aria-controls="game-shelf-panel-${index}">${index === 0 ? "Session Logs" : "Past Logs"}<span>${shelf.results.length}</span></button>`).join("")}
    </div>
    ${view.shelves.map((shelf, index) => `<section class="game-shelf" id="game-shelf-panel-${index}" data-pocket-current="${index === view.activeShelf}" aria-labelledby="game-shelf-${shelf.kind}">
      <h3 id="game-shelf-${shelf.kind}" class="game-shelf-heading">${escapeHtml(shelf.title)}<span>${shelf.results.length}</span><span class="game-shelf-bus" aria-hidden="true"><i></i></span></h3>
      ${renderGameShelfResults(shelf)}
    </section>`).join("")}
    <p class="game-shelf-live" role="status">${gameShelfStatus(view.count)}</p>
    ${gameDrivePanel()}
  </section>`;
}

// The drive is desktop only, so only the desktop reader marks the loaded disk.
function driveRecordId() {
  return pocket.isHandheld() ? "" : currentGameRecord()?.id || "";
}

// The drive holds the current game only; handheld hides it in CSS and keeps its own shelves.
function gameDrivePanel() {
  const display = currentGameDisplay();
  const record = currentGameRecord();
  const drive = pocket.gameDrive(display, record, record ? noteEntries(record.body || "") : []);
  if (!drive) return `<aside class="game-drive" aria-label="Drive" data-empty>
    <p class="game-drive-label">Drive A<span>Empty</span></p>
    <p class="game-drive-empty" role="status">${steamDisplayReady ? "No game loaded." : "Reading Steam snapshot..."}</p>
  </aside>`;
  const cover = steamDisplayModule?.currentGameCover?.(record, display?.coverAppId)
    || record?.dashboardImage || record?.banner || record?.headerImage || "public/images/archive-backdrop.webp";
  const image = steamDisplayModule?.steamBannerImage?.(cover) || cover;
  const hint = display?.changedAt ? `Steam snapshot changed ${display.changedAt.slice(0, 10).split("-").reverse().join(" / ")}. Not live presence.` : "";
  return `<aside class="game-drive" aria-label="Drive"${hint ? ` title="${escapeHtml(hint)}"` : ""}>
    <p class="game-drive-label">Drive A<span>Loaded</span></p>
    <div class="game-drive-screen"><img src="${escapeHtml(image)}" alt="" decoding="async" referrerpolicy="no-referrer" /><img class="screen-bloom" src="${escapeHtml(image)}" alt="" aria-hidden="true" decoding="async" referrerpolicy="no-referrer" /></div>
    <div class="game-drive-title"><h4>${escapeHtml(drive.title)}</h4><p>${escapeHtml([drive.status, "Current game"].filter(Boolean).join(" · "))}</p></div>
    <dl class="game-drive-figures">${drive.figures.map(({ label, value }) => `<div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd></div>`).join("")}</dl>
    ${drive.latest ? `<section class="game-drive-note" aria-label="Latest note">
      <p class="game-drive-label">Latest note${drive.latest.date ? `<span>${escapeHtml(drive.latest.date)}</span>` : ""}</p>
      <h5>${escapeHtml(drive.latest.title)}</h5>
      ${drive.latest.excerpt ? `<p>${escapeHtml(drive.latest.excerpt)}</p>` : ""}
      ${drive.earlier ? `<small>+ ${drive.earlier} earlier</small>` : ""}
    </section>` : ""}
    ${record ? `<button class="game-drive-hit" type="button" data-open-record="${escapeHtml(record.id)}" data-open-content="notes" aria-label="${escapeHtml(`Open ${record.title} notes`)}"></button>` : ""}
  </aside>`;
}

function syncPocketGameShelf(shell, view, restoreOffset = false) {
  view.shelves.forEach(({ kind, results }, i) => {
    const control = shell.querySelector(`[data-pocket-shelf="${i}"]`);
    const panel = shell.querySelector(`#game-shelf-panel-${i}`);
    const active = i === view.activeShelf;
    control.setAttribute("aria-pressed", String(active));
    control.querySelector("span").textContent = String(results.length);
    panel.dataset.pocketCurrent = String(active);
    if (active && restoreOffset && pocket.isHandheld()) {
      panel.querySelector("[data-media-cabinet]").scrollLeft = state.gameShelfQuery ? 0 : state.gameShelfOffsets[kind];
    }
  });
}

function syncGameShelf({ search, query, pick } = {}) {
  if (state.activeSection !== "games") return;
  if (pick !== undefined && pick !== 0 && pick !== 1) return;
  const shell = root.querySelector(".workspace .section-page--games");
  if (!shell) return;
  const groups = splitSectionRecords("games", recordsFor("games").sort(compareSectionRecords));
  if (pick === 0 || pick === 1) {
    if (state.gameShelfQuery.trim()) state.gameShelfSearchPick = pick;
    else state.gameShelfPick = pick;
    syncPocketGameShelf(shell, gameShelfView(groups), true);
    return;
  }
  if (search !== undefined) {
    state.gameShelfSearch = search;
    if (!search) {
      state.gameShelfQuery = "";
      state.gameShelfSearchPick = undefined;
    }
  } else if (query !== undefined) {
    state.gameShelfQuery = query;
    state.gameShelfSearchPick = undefined;
  }
  const view = gameShelfView(groups);
  syncPocketGameShelf(shell, view);
  const open = view.searchable && state.gameShelfSearch;
  const toggle = shell.querySelector("[data-shelf-search-toggle]");
  toggle.parentElement.hidden = !view.searchable;
  if (toggle.getAttribute("aria-expanded") !== String(open)) toggle.innerHTML = gameShelfIcon(open);
  toggle.setAttribute("aria-expanded", String(open));
  toggle.setAttribute("aria-label", open ? "Close game search" : "Search games");
  const input = shell.querySelector("#game-shelf-search");
  input.hidden = !open;
  if (input.value !== state.gameShelfQuery) input.value = state.gameShelfQuery;
  if (search !== true) {
    for (const shelf of view.shelves) {
      shell.querySelector(`#game-shelf-${shelf.kind} span`).textContent = String(shelf.results.length);
      shell.querySelector(`[data-media-cabinet="${shelf.kind}"]`).parentElement.outerHTML = renderGameShelfResults(shelf);
    }
    syncInstrumentShelf();
  }
  shell.querySelector(".game-shelf-live").textContent = gameShelfStatus(view.count);
  if (search !== undefined) (open ? input : toggle).focus({ preventScroll: true });
}

function selectorView(groups) {
  const index = selectorGroupIndex(groups);
  const group = groups[index];
  const workbench = pocket.projectWorkbench(group.records, state.selectorProjectIds[index]);
  return { index, group, workbench, page: workbench?.index ?? 0, count: group.records.length, other: index === 1 };
}

function renderRecordSelector(groups) {
  const view = selectorView(groups);
  const { index, page, count, other } = view;
  return `<section class="record-selector" aria-label="Browse records" data-workbench="${other ? "other" : "active"}" data-project-count="${count}">
    <div class="record-selector-toolbar">
      <div class="record-selector-groups" role="group" aria-label="Record groups">
        ${groups.map((group, i) => `<button type="button" data-selector-group="${i}" aria-pressed="${i === index}">${escapeHtml(group.title)}<span>${group.records.length}</span></button>`).join("")}
      </div>
      <nav class="record-selector-pager" aria-label="Project plates" ${count < 2 ? "hidden" : ""}>
        <button type="button" data-selector-page="-1" aria-label="Previous project" aria-disabled="${page === 0}">${pocketIcon('<path d="m15 18-6-6 6-6"/>')}</button>
        <span>${page + 1} / ${count}</span>
        <button type="button" data-selector-page="1" aria-label="Next project" aria-disabled="${page + 1 === count}">${pocketIcon('<path d="m9 18 6-6-6-6"/>')}</button>
      </nav>
    </div>
    ${renderProjectSpines(groups, view)}
    <div class="record-selector-results">${renderSelectorResults(view)}</div>
    <div class="pocket-project-stack">
      ${groups.map(({ title, records }, i) => `<div class="pocket-project-rail" data-pocket-catalog role="region" aria-label="${escapeHtml(title)}" tabindex="0" ${i === index ? "" : "hidden"}>
        ${records.length ? records.map((record) => `<div class="project-workbench">${renderProjectStage(pocket.projectWorkbench([record]), i === 1, true)}</div>`).join("") : '<p class="search-empty">No records filed here yet.</p>'}
      </div>`).join("")}
    </div>
  </section>`;
}

function renderProjectSpines(groups, { index, workbench }) {
  if (!groups.some((group) => group.records.length)) return "";
  return `<nav class="project-spines" aria-label="Projects">${groups.map((group, i) => group.records.length ? `<div class="project-spine-group" data-group="${i === 1 ? "other" : "active"}">
    <p class="project-spines-label">${escapeHtml(group.title)}<span>${String(group.records.length).padStart(2, "0")}</span></p>
    ${group.records.map((record) => {
      const progress = pocket.projectWorkbench([record]).progress;
      const current = i === index && record.id === workbench?.record.id;
      return `<button type="button" class="project-spine" data-project-spine="${i}" data-spine-id="${escapeHtml(record.id)}"${current ? ' aria-current="true"' : ""}><span class="project-spine-title">${escapeHtml(record.title)}</span><small>${escapeHtml(i === 1 ? record.status : `${progress}%`)}</small><i class="project-spine-meter" style="--spine-progress: ${progress}%" aria-hidden="true"></i></button>`;
    }).join("")}
  </div>` : "").join("")}</nav>`;
}

function projectBenchFor(record) {
  return pocket.projectBench(record, noteEntries(record.body || ""), { screen: recordMediaSources(record, "samples")[0] || recordHeaderImage(record), stack: textList(record.technicalStack) });
}

function renderSelectorResults({ workbench, other }) {
  if (!workbench) return '<p class="search-empty">No records filed here yet.</p>';
  return `<div class="project-workbench">
    <div class="project-workbench-frame">${renderProjectStage(workbench, other, false, projectBenchFor(workbench.record))}<span class="project-workbench-register" aria-hidden="true"></span></div>
  </div>`;
}

function renderProjectStage({ record, brief, progress, stops, more, nextStop }, other, compact = false, bench) {
  const meta = bench ? [bench.started && `Started ${bench.started}`, bench.noteCount && `${bench.noteCount} ${bench.noteCount === 1 ? "note" : "notes"}`].filter(Boolean) : [];
  const deck = bench && (bench.latest || bench.screen || bench.stack.length) ? `<div class="project-bench-deck">
      ${bench.latest ? `<section class="project-dispatch" aria-label="Latest note">
        <p class="project-bench-label">Latest note${bench.latest.date ? `<span>${escapeHtml(bench.latest.date)}</span>` : ""}</p>
        <h4>${escapeHtml(bench.latest.title)}</h4>
        ${bench.latest.excerpt ? `<p>${escapeHtml(bench.latest.excerpt)}</p>` : ""}
        ${bench.earlier ? `<small>+ ${bench.earlier} earlier</small>` : ""}
      </section>` : bench.stack.length ? `<section class="project-dispatch project-build-sheet" aria-label="Build sheet">
        <p class="project-bench-label">Build sheet</p>
        <ul>${bench.stack.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}${bench.moreStack ? `<li>+${bench.moreStack} more</li>` : ""}</ul>
      </section>` : ""}
      ${bench.screen ? `<figure class="project-screen" data-lit>
        <div class="project-screen-glass"><img src="${escapeHtml(bench.screen)}" alt="" decoding="async" loading="lazy" /><img class="screen-bloom" src="${escapeHtml(bench.screen)}" alt="" aria-hidden="true" decoding="async" loading="lazy" /></div>
        ${bench.latest && bench.stack.length ? `<figcaption><span class="project-bench-label">Build sheet</span>${escapeHtml(bench.stack.join(" · "))}${bench.moreStack ? ` · +${bench.moreStack}` : ""}</figcaption>` : ""}
      </figure>` : ""}
    </div>` : "";
  return `<div class="project-workbench-record"${bench ? " data-bench" : ""}>
    ${other ? `<span class="project-state-mark" aria-hidden="true">${escapeHtml(record.status)}</span>` : ""}
    <div class="project-workbench-brief"><p class="project-workbench-signal">${escapeHtml(record.status)}${meta.map((item) => `<span>${escapeHtml(item)}</span>`).join("")}</p><h3>${escapeHtml(record.title)}</h3>${brief ? `<p>${escapeHtml(brief)}</p>` : ""}</div>
    <div class="project-workbench-progress">
      ${compact ? `<div class="pocket-project-readout">
        <div class="project-workbench-caption"><span>Progress</span><b>${progress}%</b></div>
        <meter min="0" max="100" value="${progress}" aria-label="Project progress"></meter>
        ${nextStop ? `<div class="pocket-project-milestone" data-stop="${nextStop.state}"><strong>${escapeHtml(nextStop.label)}</strong><small>${escapeHtml(nextStop.value)}</small></div>` : ""}
      </div>` : `
        <div class="project-workbench-caption"><span>${stops.length ? "Milestone trace" : "Progress readout"}</span><b>${progress}% overall</b></div>
        ${stops.length ? `<ol class="project-milestone-trace" role="list">${stops.map(({ label, state, value }) => `<li data-stop="${state}"><i class="project-milestone-node" aria-hidden="true"></i><strong>${escapeHtml(label)}</strong><small>${escapeHtml(value)}</small></li>`).join("")}</ol>` : `<meter min="0" max="100" value="${progress}" aria-label="Project progress"></meter>`}
        ${more ? `<small class="project-milestone-more">+${more} in record</small>` : ""}
      `}
    </div>
    ${deck}
    <button class="project-workbench-hit" type="button" data-open-record="${escapeHtml(record.id)}" aria-label="${escapeHtml(`Open ${record.title}`)}"><span class="project-workbench-light" aria-hidden="true"></span></button>
  </div>`;
}

function renderSelectorTiles(sectionRecords, loadedId = "") {
  if (!sectionRecords.length) return '<p class="search-empty">No records filed here yet.</p>';
  return sectionRecords.map((record) => {
    const status = gameActivityLabel(record);
    const activity = gameLogPlacement(record) === "session" && (status === "Active" || status === "Inactive") ? status : "";
    const loaded = record.id === loadedId;
    const label = [record.title, activity, loaded ? "in drive" : ""].filter(Boolean).join(", ");
    return `<button class="record-sleeve" data-game-sleeve type="button" data-state="${recordStateKey(status)}"${loaded ? " data-in-drive" : ""} data-open-record="${escapeHtml(record.id)}" aria-label="${escapeHtml(label)}">
      <span class="record-sleeve-art" aria-hidden="true"><span class="record-sleeve-label"><strong>${escapeHtml(record.title)}</strong>${loaded ? "<small>In drive</small>" : activity ? `<small>${activity}</small>` : ""}</span><span class="game-disk-well"><span class="game-disk-hub"></span></span><span class="game-disk-contacts"></span><span class="pocket-tape-reels"></span></span>
    </button>`;
  }).join("");
}

function syncInstrumentShelf(reveal = false) {
  if (reveal && state.activeSection === "projects" && !pocket.isHandheld()) window.GestaltSectionMotion?.revealProjectReader(root.querySelector(".workspace .project-workbench-frame"));
  const section = root.querySelector(".workspace > :is(.section-page--games, .section-page--projects) > .record-selector");
  if (section !== standbySection) {
    stopSectionStandby?.();
    stopProjectRotation?.();
    stopPocketGroupSwipe?.();
    standbySection = section;
    stopSectionStandby = window.GestaltSectionMotion?.bindSectionStandby(section, state.activeSection);
    stopProjectRotation = state.activeSection === "projects" ? window.GestaltSectionMotion?.bindProjectRotation(section, () => syncRecordSelector(null, true)) : undefined;
    stopPocketGroupSwipe = window.GestaltSectionMotion?.bindPocketGroupSwipe(section, (direction) => {
      if (state.activeSection === "projects") syncRecordSelector(null, false, direction);
      else if (state.activeSection === "games") {
        const selected = section.querySelector('[data-pocket-shelf][aria-pressed="true"]');
        if (selected) syncGameShelf({ pick: Number(selected.dataset.pocketShelf) + direction });
      }
    });
  }
  const nodes = new Set(root.querySelectorAll(".workspace [data-media-cabinet]"));
  for (const [node, release] of instrumentShelves) {
    if (nodes.has(node)) continue;
    release();
    instrumentShelves.delete(node);
  }
  for (const node of nodes) {
    if (instrumentShelves.has(node)) continue;
    const group = node.dataset.mediaCabinet;
    node.scrollLeft = state.gameShelfQuery ? 0 : state.gameShelfOffsets[group];
    const remember = () => { if (!state.gameShelfQuery && node.clientWidth) state.gameShelfOffsets[group] = node.scrollLeft; };
    const unbind = window.GestaltSectionMotion?.bindInstrumentShelf(node);
    const cancelReveal = reveal ? window.GestaltSectionMotion?.revealInstrumentShelf(node) : null;
    node.addEventListener("scroll", remember, { passive: true });
    instrumentShelves.set(node, () => { node.removeEventListener("scroll", remember); unbind?.(); cancelReveal?.(); });
  }
}

function syncRecordSelector(button, automatic = false, swipeDirection) {
  const selector = root.querySelector(".workspace > .section-page--selector .record-selector");
  if (state.activeSection !== "projects" || !selector || button?.getAttribute("aria-disabled") === "true") return;
  const groups = splitSectionRecords(state.activeSection, recordsFor(state.activeSection).sort(compareSectionRecords));
  const current = selectorView(groups);
  let direction;
  if (button?.dataset.projectSpine !== undefined) {
    const group = Number(button.dataset.projectSpine);
    const id = button.dataset.spineId;
    if (!groups[group]?.records.some((record) => record.id === id) || (group === current.index && id === current.workbench?.record.id)) return;
    const order = groups.flatMap((entry, i) => entry.records.map((record) => `${i}:${record.id}`));
    direction = order.indexOf(`${group}:${id}`) < order.indexOf(`${current.index}:${current.workbench?.record.id}`) ? -1 : 1;
    state.selectorGroup = group;
    state.selectorProjectIds[group] = id;
  } else if (button?.dataset.selectorGroup !== undefined || swipeDirection) {
    const group = swipeDirection ? current.index + swipeDirection : Number(button.dataset.selectorGroup);
    if (!groups[group] || group === current.index) return;
    state.selectorGroup = group;
  } else {
    if (current.count < 2) return;
    direction = automatic ? 1 : Number(button?.dataset.selectorPage);
    const next = automatic ? (current.page + 1) % current.count : current.page + direction;
    if ((direction !== -1 && direction !== 1) || next < 0 || next >= current.count) return;
    state.selectorProjectIds[current.index] = current.group.records[next].id;
  }
  const next = selectorView(groups);
  const { index, page, count, workbench, other } = next;
  if (index !== current.index) {
    selector.dataset.workbench = other ? "other" : "active";
    selector.dataset.projectCount = String(count);
    const stack = selector.querySelector(".pocket-project-stack");
    stack.querySelectorAll(".pocket-project-rail").forEach((rail, i) => { rail.hidden = i !== index; });
  }
  selector.querySelectorAll("[data-selector-group]").forEach((control, i) => control.setAttribute("aria-pressed", String(i === index)));
  selector.querySelectorAll("[data-project-spine]").forEach((spine) => {
    if (Number(spine.dataset.projectSpine) === index && spine.dataset.spineId === workbench?.record.id) spine.setAttribute("aria-current", "true");
    else spine.removeAttribute("aria-current");
  });
  const frame = selector.querySelector(".project-workbench-frame");
  if (workbench && direction && frame) {
    const commit = window.GestaltSectionMotion?.preparePlateTurn(frame, direction);
    frame.firstElementChild.outerHTML = renderProjectStage(workbench, other, false, projectBenchFor(workbench.record));
    commit?.();
  } else {
    selector.querySelector(".record-selector-results").innerHTML = renderSelectorResults(next);
  }
  const pager = selector.querySelector(".record-selector-pager");
  pager.hidden = count < 2;
  pager.querySelector("span").textContent = `${page + 1} / ${count}`;
  const previous = pager.querySelector('[data-selector-page="-1"]');
  const forward = pager.querySelector('[data-selector-page="1"]');
  previous.setAttribute("aria-disabled", String(page === 0));
  forward.setAttribute("aria-disabled", String(page + 1 === count));
}

const logArchiveAfterDays = 7;
const logDeskKeep = 3;
const archiveRootFileLimit = 24;
const archiveRecentFileLimit = 12;

function logArchiveDate(record) {
  if (record.section === "logs" && record.writtenAt) {
    return record.writtenAt.slice(0, 10);
  }
  return record.started || record.updated;
}

function compareLogWritingOrder(a, b) {
  const left = a.writtenAt || logArchiveDate(a);
  const right = b.writtenAt || logArchiveDate(b);
  return right.localeCompare(left)
    || (b.writtenOrder || 0) - (a.writtenOrder || 0)
    || a.priority - b.priority
    || a.id.localeCompare(b.id);
}

function compareSectionRecords(a, b) {
  return a.section === "logs" && b.section === "logs"
    ? compareLogWritingOrder(a, b)
    : b.updated.localeCompare(a.updated) || a.priority - b.priority;
}

function partitionFieldLogs(records, now = new Date()) {
  const desk = [];
  const archived = [];
  records.filter((record) => record.section === "logs").sort(compareLogWritingOrder).forEach((record, index) => {
    (index >= logDeskKeep && isLogArchivedByAge(record, now) ? archived : desk).push(record);
  });
  return { desk, archived };
}

function isLogArchivedByAge(record, now) {
  const date = logArchiveDate(record);
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);

  if (!match) return false;

  const [, yearText, monthText, dayText] = match;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const entryTime = Date.UTC(year, month - 1, day);
  const entryDate = new Date(entryTime);

  if (entryDate.getUTCFullYear() !== year || entryDate.getUTCMonth() !== month - 1 || entryDate.getUTCDate() !== day) return false;

  const todayTime = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return Math.floor((todayTime - entryTime) / 86400000) >= logArchiveAfterDays;
}

function renderArchiveFolderWindow(folders) {
  const activeFolder = folders.find((folder) => folder.title === state.archiveFolderWindow);
  if (!activeFolder) {
    state.archiveFolderWindow = "";
    return "";
  }
  return `<div class="archive-folder-overlay">
    <button class="archive-folder-backdrop" type="button" aria-label="Close folder window" data-close-archive-folder></button>
    <section class="archive-folder-window" role="dialog" aria-modal="true" tabindex="-1" aria-label="${escapeHtml(activeFolder.title)} folder">
      <header class="archive-folder-titlebar"><span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true"><path d="M2.5 5.5h7l2 2h10v11h-19z"/><path d="M2.5 8h19"/></svg>FIELD ARCHIVE / ${escapeHtml(activeFolder.title)}</span><button type="button" aria-label="Close folder window" title="Close folder" data-close-archive-folder><span aria-hidden="true">×</span></button></header>
      <div class="archive-folder-pathbar"><button type="button" aria-label="Up to Field Archive" data-close-archive-folder>↑</button><span><span>Field Archive</span><b>/</b><strong>${escapeHtml(activeFolder.title)}</strong></span><small>${activeFolder.records.length} ${activeFolder.records.length === 1 ? "file" : "files"}</small></div>
      <div class="archive-folder-window-body">
        <aside class="archive-window-side" aria-label="Archive folders"><p class="archive-manager-label">ARCHIVE</p><button class="archive-window-root" type="button" data-close-archive-folder><span>▧</span>Field Archive</button>
          <div class="archive-window-tree">${folders.map((folder) => `<button class="${folder.title === activeFolder.title ? "is-active" : ""}" type="button" data-open-archive-folder="${escapeHtml(folder.title)}"><span>▱</span><span>${escapeHtml(folder.title)}</span><i>${folder.records.length}</i></button>`).join("")}</div>
          <div class="archive-window-selection"><p>SELECTED FOLDER</p><strong>${escapeHtml(activeFolder.title)}</strong><span>${escapeHtml(activeFolder.detail)}</span><small>${activeFolder.records.length} ${activeFolder.records.length === 1 ? "file" : "files"}</small><small>${activeFolder.records.length ? `${readableDate(logArchiveDate(activeFolder.records[activeFolder.records.length - 1]))} - ${readableDate(logArchiveDate(activeFolder.records[0]))}` : "No date range"}</small></div>
        </aside>
        <div class="archive-folder-files"><div class="archive-folder-files-toolbar"><span>FILES</span><span>DATE ORDER . NEWEST FIRST</span></div>
          <div class="archive-file-grid">${activeFolder.records.map(renderArchiveFile).join("")}</div>
          ${activeFolder.records.length ? "" : `<p class="search-empty">This folder contains no files.</p>`}<div class="archive-folder-status"><span>${activeFolder.records.length} items</span><span>Sorted by date . Newest first</span></div>
        </div>
      </div>
    </section>
  </div>`;
}

function renderArchiveFolders(section, sectionRecords) {
  const { archivedLogs, folders, looseGroups } = buildFieldArchive(sectionRecords);
  const filedRecords = [...looseGroups, ...folders].flatMap((group) => group.records);
  const archiveDates = filedRecords.map(logArchiveDate).sort();
  const looseCount = looseGroups.reduce((count, group) => count + group.records.length, 0);
  const usesFolders = folders.length > 0;
  const folderWindow = renderArchiveFolderWindow(folders);
  const folderButton = (folder, className = "archive-folder-tile") => `<button class="${className}" type="button" data-open-archive-folder="${escapeHtml(folder.title)}">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.35" aria-hidden="true"><path d="M2.5 5.5h7l2 2h10v11h-19z"/><path d="M2.5 8h19"/></svg>
    ${className === "archive-tree-folder" ? `<span>${escapeHtml(folder.title)}</span><i>${folder.records.length}</i>` : `<span><strong>${escapeHtml(folder.title)}</strong><small>${escapeHtml(folder.detail)}</small></span><i>${folder.records.length} ${folder.records.length === 1 ? "file" : "files"}</i>`}
  </button>`;

  return `<section class="section-page section-page--archive archive-folder-page${folderWindow ? " has-folder-window" : ""}" aria-label="${escapeHtml(section.code)} files">
    <header class="section-page-header">
      <span class="nav-mark" data-icon="${section.icon}" aria-hidden="true"></span>
      <div><p>${escapeHtml(section.code)}</p><h2 class="cipher-section">${renderCipherLetters(sectionRegistryLabels.archive || section.label)}</h2>${renderSectionReadout(sectionReadout(filedRecords))}</div>
      <i>${archivedLogs.length} archived logs</i>
    </header>
    <div class="archive-manager">
      <aside class="archive-manager-side" aria-label="Archive locations and details"><div class="archive-manager-section"><p class="archive-manager-label">${usesFolders ? "LOCATIONS" : "DATE INDEX"}</p><div class="archive-manager-tree">
        <div class="archive-tree-root"><span>▧</span><span>FIELD ARCHIVE</span></div>${looseGroups.map((group) => `<div class="archive-tree-date"><span>${escapeHtml(group.title)}</span><i>${group.records.length}</i></div>`).join("")}${folders.map((folder) => folderButton(folder, "archive-tree-folder")).join("")}${archiveDates.length ? "" : `<span class="archive-tree-empty">No files filed.</span>`}
      </div></div><div class="archive-manager-section archive-manager-details"><p class="archive-manager-label">ARCHIVE STATUS</p><dl>
        <div><dt>FOLDERS</dt><dd>${String(folders.length).padStart(2, "0")}</dd></div><div><dt>FILES</dt><dd>${String(archiveDates.length).padStart(2, "0")}</dd></div><div><dt>OLDEST</dt><dd>${archiveDates[0] ? readableDate(archiveDates[0]) : "-- / -- / ----"}</dd></div><div><dt>NEWEST</dt><dd>${archiveDates.length ? readableDate(archiveDates[archiveDates.length - 1]) : "-- / -- / ----"}</dd></div><div><dt>LOGS FILED AFTER</dt><dd>${logArchiveAfterDays} DAYS</dd></div>
      </dl></div></aside>
      <div class="archive-manager-main"><div class="archive-manager-toolbar"><span><span>▱</span> FIELD ARCHIVE</span><small>${looseCount} ${looseCount === 1 ? "file" : "files"}${usesFolders ? ` / ${folders.length} ${folders.length === 1 ? "folder" : "folders"}` : ""}</small></div>
        <div class="archive-root-files">${looseGroups.map((group) => `<section class="archive-root-group" aria-label="${escapeHtml(group.title)} files"><h3><span>${escapeHtml(group.title)}</span><small>${escapeHtml(group.detail)} / ${group.records.length} ${group.records.length === 1 ? "FILE" : "FILES"}</small></h3><div class="archive-file-grid">${group.records.map(renderArchiveFile).join("")}</div></section>`).join("")}
          ${usesFolders ? `<section class="archive-root-group" aria-label="Monthly folders"><h3><span>MONTHLY FILES</span><small>${folders.length} ${folders.length === 1 ? "FOLDER" : "FOLDERS"}</small></h3><div class="archive-folder-tiles">${folders.map((folder) => folderButton(folder)).join("")}</div></section>` : ""}
          ${archiveDates.length ? "" : `<p class="search-empty">No records have reached the archive threshold yet.</p>`}</div>
        <p class="archive-manager-footnote">THE NEWEST ${logDeskKeep} STAY ON THE DESK . OLDER LOGS ARE FILED AFTER ${logArchiveAfterDays} DAYS</p>
      </div>
    </div>${folderWindow}
  </section>`;
}

function sortArchiveRecords(groupRecords) {
  return [...groupRecords].sort((a, b) => logArchiveDate(b).localeCompare(logArchiveDate(a)) || compareSectionRecords(a, b));
}

function archiveUsesFolders(recordCount) {
  return recordCount > archiveRootFileLimit;
}

function buildFieldArchive(records, now = new Date()) {
  const { archived: archivedLogs } = partitionFieldLogs(records, now);
  const filedRecords = records.filter((record) => record.section !== "logs");
  const months = new Map();
  for (const record of archivedLogs) {
    const month = logArchiveDate(record).slice(0, 7);
    if (!months.has(month)) months.set(month, []);
    months.get(month).push(record);
  }

  const recentMonths = new Set(archivedLogs.slice(0, archiveRecentFileLimit).map((record) => logArchiveDate(record).slice(0, 7)));
  const foldedMonths = new Set();
  let rootItems = archivedLogs.length;
  // Keep complete recent months together; only fold older months when it saves space.
  for (const [month, monthRecords] of [...months.entries()].reverse()) {
    if (!archiveUsesFolders(rootItems)) break;
    if (recentMonths.has(month) || monthRecords.length < 2) continue;
    foldedMonths.add(month);
    rootItems -= monthRecords.length - 1;
  }

  const folders = [];
  const years = new Map();
  for (const [month, monthRecords] of months) {
    if (foldedMonths.has(month)) {
      folders.push({ title: `${month.slice(5, 7)}/${month.slice(0, 4)}`, detail: "FIELD NOTES", records: monthRecords });
    } else {
      const year = month.slice(0, 4);
      if (!years.has(year)) years.set(year, []);
      years.get(year).push(...monthRecords);
    }
  }
  const looseGroups = [...years].map(([title, yearRecords]) => ({ title, detail: "FIELD NOTES", records: yearRecords }));
  if (filedRecords.length) {
    looseGroups.push({ title: "FILED RECORDS", detail: "MANUAL ARCHIVE", records: sortArchiveRecords(filedRecords) });
  }
  return { archivedLogs, folders, looseGroups };
}

function renderArchiveFile(record) {
  return `<button class="archive-file" type="button" title="${escapeHtml(record.title)}" data-open-record="${escapeHtml(record.id)}">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M6 3.5h8l4 4v13H6z"/><path d="M14 3.5v5h4M9 13h6M9 16h6"/></svg>
    <span><strong>${escapeHtml(record.title)}</strong><small>${escapeHtml(readableDate(logArchiveDate(record)))} <i>${escapeHtml(record.section === "logs" ? "FIELD NOTE" : record.type.toUpperCase())}</i></small></span>
  </button>`;
}

function renderSectionRows(sectionRecords) {
  return sectionRecords.length
    ? sectionRecords
        .map(
          (record) => `<button class="section-record" type="button" data-open-record="${record.id}" data-state="${recordStateKey(gameActivityLabel(record))}">
            <span class="section-record-kind"><span>${escapeHtml(record.type)}</span><small>${escapeHtml(recordTraceId(record))}</small></span>
            <strong>${escapeHtml(record.title)}</strong>
            <span>${escapeHtml(record.section === "logs" ? recordDisplaySummary(record) : record.summary)}</span>
            <i>${escapeHtml(gameActivityLabel(record))} . ${readableDate(record.updated)}</i>
          </button>`
        )
        .join("")
    : `<p class="search-empty">No records filed here yet.</p>`;
}

function recordStateKey(status) {
  return status.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "unknown";
}

function recordTraceId(record) {
  return window.GestaltRecordLinks?.traceId?.(record.id, record.section) || "";
}

function sectionReadout(sectionRecords, split = null, section) {
  const archivedStatuses = new Set(["archived", "completed", "deprecated", "done", "filed"]);
  const openCount = split?.[0].records.length ?? sectionRecords.filter((record) => !archivedStatuses.has(record.status.toLowerCase())).length;
  const filedCount = sectionRecords.length - openCount;

  return [
    { label: section === "games" ? "SESSION" : section === "projects" ? "ACTIVE" : "OPEN", value: String(openCount).padStart(2, "0") },
    { label: section === "games" ? "PAST" : section === "projects" ? "OTHER" : "FILED", value: String(filedCount).padStart(2, "0") },
    { label: "LAST", value: sectionRecords[0] ? readableDate(sectionRecords[0].updated) : "-- / -- / ----" }
  ];
}

function renderSectionReadout(items) {
  return `<dl class="section-page-readout">
    ${items.map((item) => `<div><dt>${escapeHtml(item.label)}</dt><dd>${escapeHtml(item.value)}</dd></div>`).join("")}
  </dl>`;
}

const setupGroupRegistry = [
  { id: "systems", title: "SYSTEMS", path: "/setup/systems", detail: "Operating systems, machines, rigs" },
  { id: "tools", title: "TOOLS", path: "/setup/tools", detail: "Apps, utilities, workflows" },
  { id: "peripherals", title: "PERIPHERALS", path: "/setup/peripherals", detail: "Input, display, audio, devices" },
  { id: "notes", title: "NOTES", path: "/setup/notes", detail: "Loose setup notes and pending files" }
];

function renderSetupBay(section, sectionRecords, countLabel, readout) {
  const groups = setupGroupRegistry.map((group) => ({
    ...group,
    records: []
  }));
  for (const record of sectionRecords) {
    const group = setupGroupFor(record);
    groups.find(({ id }) => id === group)?.records.push(record);
  }

  return `<section class="section-page setup-bay" aria-label="${escapeHtml(section.code)} device bay">
    <header class="section-page-header setup-bay-header">
      <span class="nav-mark" data-icon="${section.icon}" aria-hidden="true"></span>
      <div>
        <p>${escapeHtml(section.code)}</p>
        <h2 class="cipher-section">${renderCipherLetters("Setup Manifest")}</h2>
        ${renderSectionReadout(readout)}
      </div>
      <i>${countLabel}</i>
    </header>
    <div class="setup-bay-grid">
      ${groups
        .map(
          (group) => `<section class="setup-group setup-group--${group.id}" aria-label="${escapeHtml(group.title)}">
            <header>
              <div><span>${escapeHtml(group.path)}</span><h3>${escapeHtml(group.title)}</h3></div>
              <i>${group.records.length}</i>
            </header>
            <p>${escapeHtml(group.detail)}</p>
            <div class="setup-tile-grid">
              ${
                group.records.length
                  ? group.records.map((record) => renderSetupTile(record, group)).join("")
                  : `<span class="setup-empty">No files mounted.</span>`
              }
            </div>
          </section>`
        )
        .join("")}
    </div>
  </section>`;
}

function renderSetupTile(record, { id: group, title: category }) {
  const image = setupTileImage(record);
  const externalUrl = safeExternalUrl(record.externalUrl);
  const action = group === "tools" ? (externalUrl ? "launch" : "idle") : group === "peripherals" ? "inspect" : group === "notes" ? "read" : "boot";
  const metaLine = group === "peripherals" ? cleanDisplaySummary(record.summary) : `${category} . ${record.status}`;
  const content = `<span class="${image ? "setup-tile-icon has-image" : "setup-tile-icon"}" aria-hidden="true">${image ? `<img src="${escapeHtml(image)}" alt="" decoding="async" loading="lazy" />` : ""}<span class="setup-tile-glyph"></span></span>
    <span class="setup-tile-body">
      <strong>${escapeHtml(record.title)}</strong>
      ${metaLine ? `<small>${escapeHtml(metaLine)}</small>` : ""}
    </span>
    <i>${action}</i>`;

  if (group === "tools") {
    return externalUrl
      ? `<a class="setup-tile setup-tile--tools" href="${escapeHtml(externalUrl)}" target="_blank" rel="noreferrer">${content}</a>`
      : `<button class="setup-tile setup-tile--tools is-inert" type="button" aria-disabled="true">${content}</button>`;
  }

  return `<button class="setup-tile setup-tile--${group}" type="button" data-open-record="${record.id}">${content}</button>`;
}

function setupTileImage(record) {
  return record.iconImage || recordHeaderImage(record) || record.banner || "";
}

function setupGroupFor(record) {
  const explicitGroup = [record.setupGroup, record.setupKind, record.category]
    .map((value) => (typeof value === "string" ? value.toLowerCase().trim() : ""))
    .find(Boolean);

  if (explicitGroup) {
    if (/\b(system|systems|machine|rig|os)\b/.test(explicitGroup)) {
      return "systems";
    }

    if (/\b(tool|tools|app|apps|software|shortcut)\b/.test(explicitGroup)) {
      return "tools";
    }

    if (/\b(peripheral|peripherals|device|hardware|gear|photo)\b/.test(explicitGroup)) {
      return "peripherals";
    }

    if (/\b(note|notes|file|memo)\b/.test(explicitGroup)) {
      return "notes";
    }
  }

  const haystack = [record.title, record.type, record.summary, textBlock(record.hardware)].join(" ").toLowerCase();

  if (/\b(keyboard|mouse|monitor|display|headset|speaker|audio|mic|microphone|controller|tablet|dock|peripheral|device)\b/.test(haystack)) {
    return "peripherals";
  }

  if (/\b(tool|tools|software|app|apps|utility|utilities|editor|launcher|workflow|script|stack)\b/.test(haystack)) {
    return "tools";
  }

  if (/\b(windows|linux|arch|os|pc|laptop|desktop|machine|rig|system|hardware)\b/.test(haystack)) {
    return "systems";
  }

  return "notes";
}

function registerMediaCacheWorker() {
  if (!("serviceWorker" in navigator) || window.location.protocol === "file:") {
    return;
  }

  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("./sw.js", { updateViaCache: "none" })
      .catch(() => {
        // Media cache is optional. The archive stays fully usable without it.
      });
  }, { once: true });
}

function setupProfile(record) {
  const group = setupGroupFor(record);
  const groupConfig = setupGroupRegistry.find((item) => item.id === group) || setupGroupRegistry[3];

  return {
    category: groupConfig.title,
    command: setupCommandFor(record, group),
    specs: setupSpecRows(record)
  };
}

function setupCommandFor(record, group = setupGroupFor(record)) {
  const groupConfig = setupGroupRegistry.find((item) => item.id === group) || setupGroupRegistry[3];

  if (group === "tools") {
    return `open ${groupConfig.path}/${record.id}.shortcut`;
  }

  if (group === "peripherals") {
    return `inspect ${groupConfig.path}/${record.id}.device`;
  }

  if (group === "notes") {
    return `less ${groupConfig.path}/${record.id}.note`;
  }

  return `cat ${groupConfig.path}/${record.id}.log`;
}

function setupSpecRows(record) {
  const privateLabel = /\b(serial|token|secret|password|passwd|key|path|host|hostname|user|username|email|address|phone|ip)\b/i;

  return setupHardwareSource(record)
    .split(/\r?\n/)
    .map((line) => line.trim())
    .map((line) => {
      const match = line.match(/^([^:]{2,32}):\s*(.+)$/);

      if (!match) {
        return null;
      }

      const label = match[1].trim();
      const value = match[2].trim();

      if (!label || !value || privateLabel.test(label)) {
        return null;
      }

      return { label, value };
    })
    .filter(Boolean);
}

function setupHardwareSource(record) {
  return textBlock(record.hardware) || setupHardwareFallback(record.body);
}

function setupPathFor(record) {
  const group = setupGroupFor(record);
  const groupConfig = setupGroupRegistry.find((item) => item.id === group) || setupGroupRegistry[3];

  return `${groupConfig.path}/${record.id}`;
}

function setupNarrativeNotes(record) {
  const hasExplicitNotes = /(^|\n):::(?:previous-note|note)\s+/i.test(record.body);

  if (setupGroupFor(record) !== "notes" && !hasExplicitNotes) {
    return [];
  }

  return noteEntries(record.body).filter((note) => !setupNoteIsSpecOnly(note.body));
}

function setupNoteIsSpecOnly(body) {
  const lines = body
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !line.startsWith("!") && !line.startsWith("#"));

  if (!lines.length) {
    return true;
  }

  return lines.every((line) => /^([^:]{2,32}):\s*(.+)$/.test(line));
}

function splitSectionRecords(sectionId, sectionRecords) {
  if (sectionId === "projects") {
    const activeStatuses = new Set(["active", "in progress", "planning", "blocked"]);

    return [
      { title: "ACTIVE PROJECTS", records: sectionRecords.filter((record) => activeStatuses.has(record.status.toLowerCase())) },
      { title: "OTHER PROJECTS", records: sectionRecords.filter((record) => !activeStatuses.has(record.status.toLowerCase())) }
    ];
  }

  if (sectionId === "games") {
    return [
      { title: "SESSION LOGS", records: sectionRecords.filter((record) => gameLogPlacement(record) === "session") },
      { title: "PAST LOGS", records: sectionRecords.filter((record) => gameLogPlacement(record) === "past") }
    ];
  }

  return null;
}

function workspaceContent() {
  if (state.activeSection !== "system") return sectionPage(state.activeSection);
  return pocket?.isHandheld() ? '<div class="dashboard-grid" hidden></div>' : dashboard();
}

function recordAccessSurfaceMarkup() {
  return `<div class="record-access-surface" aria-hidden="true">
    <div class="record-access-identity"><small>ARCHIVE LINK // 01</small><strong>${renderCipherLetters("ACCESSING")}</strong><span class="record-access-meter"><i></i></span><small class="record-access-state">INDEXING RECORD</small></div>
    <div class="record-access-frame" aria-hidden="true">
      <i class="record-access-rule record-access-rule--top"></i>
      <i class="record-access-rule record-access-rule--right"></i>
      <i class="record-access-rule record-access-rule--bottom"></i>
      <i class="record-access-rule record-access-rule--left"></i>
      <span class="record-access-corners"><i></i><i></i><i></i><i></i></span>
      <span class="record-access-traces"><i></i><i></i><i></i><i></i></span>
      <span class="record-access-ticks"><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i></span>
    </div>
    <i class="record-access-scan"></i>
  </div>`;
}

function setupRecordWindow(record) {
  const group = setupGroupFor(record);
  const profile = setupProfile(record);
  const headerImage = setupRecordImage(record);
  const notes = setupNarrativeNotes(record);
  const specs = profile.specs.length
    ? profile.specs
    : [
        { label: "STATUS", value: record.status },
        { label: "UPDATED", value: readableDate(recordLastUpdated(record)) },
        { label: "PROGRESS", value: `${record.progress}%` }
      ];

  const body = group === "tools"
    ? setupToolBody(record, profile, specs, headerImage)
    : group === "peripherals"
      ? setupPeripheralBody(record, profile, specs, headerImage)
      : group === "notes"
        ? setupNoteBody(record, notes)
        : setupSystemBody(record, profile, specs, headerImage);

  return `<article role="dialog" aria-modal="true" tabindex="-1" class="record-window ${state.panelMaximized ? "is-maximized" : ""} ${state.windowSteady ? "is-steady" : ""} ${state.accessPending ? "is-access-pending" : state.accessComplete ? "is-access-complete" : ""} is-setup-record is-setup-record--${group}" data-state="${recordStateKey(record.status)}" aria-label="${escapeHtml(record.title)} setup terminal">
    ${recordAccessSurfaceMarkup()}
    ${recordLinkFeedback(false, state.noteLinkMissing)}
    <div class="setup-window-shell">
      <section class="setup-console setup-console--${group}" aria-label="${escapeHtml(record.title)} setup profile">
        ${setupPrompt(record, profile.command)}
        ${body}
      </section>

      ${
        group !== "notes" && notes.length
          ? `<section class="setup-console setup-notes-terminal" aria-label="${escapeHtml(record.title)} setup notes">
              <div class="setup-console-prompt">
                <span>eightmouse@gestalt</span><i>:</i><span>${escapeHtml(setupPathFor(record))}</span><i>$</i><strong>cat notes.log</strong>
              </div>
              ${renderSetupNotes(notes)}
            </section>`
          : ""
      }
    </div>
  </article>`;
}

function setupPrompt(record, command) {
  return `<div class="setup-console-prompt">
    ${pocketBack()}
    <div class="setup-prompt-command">
      <span>eightmouse@gestalt</span><i>:</i><span>${escapeHtml(setupPathFor(record))}</span><i>$</i><strong>${escapeHtml(command)}</strong>
    </div>
    <div class="setup-prompt-actions">
      ${recordLinkButton()}
      <div class="window-actions setup-window-actions">
        <button type="button" data-window-action="minimize" aria-label="Minimize setup terminal">minimize</button>
        <button type="button" data-window-action="maximize" aria-label="${state.panelMaximized ? "Restore setup terminal" : "Maximize setup terminal"}">${state.panelMaximized ? "restore" : "maximize"}</button>
        <button type="button" data-window-action="close" aria-label="Close setup terminal">close</button>
      </div>
    </div>
  </div>`;
}

function setupSystemBody(record, profile, specs, headerImage) {
  return `<div class="setup-console-body setup-console-body--system">
    <div class="${headerImage ? "setup-terminal-avatar has-image" : "setup-terminal-avatar"}" aria-hidden="true">
      ${headerImage ? `<img src="${escapeHtml(headerImage)}" alt="" decoding="async" loading="lazy" />` : ""}
      <span></span><span></span><span></span><span></span>
    </div>
    ${setupFetchDetails(record, profile, specs, "profile.loaded / public-safe")}
  </div>`;
}

function setupToolBody(record, profile, specs, headerImage) {
  return `<div class="setup-console-body setup-console-body--tool">
    <div class="${headerImage ? "setup-shortcut-preview has-image" : "setup-shortcut-preview"}" aria-hidden="true">
      ${headerImage ? `<img src="${escapeHtml(headerImage)}" alt="" decoding="async" loading="lazy" />` : ""}
      <span></span>
    </div>
    ${setupFetchDetails(record, profile, specs, "shortcut.loaded / local-use")}
  </div>`;
}

function setupPeripheralBody(record, profile, specs, headerImage) {
  const description = cleanDisplaySummary(record.summary);

  return `<div class="setup-console-body setup-console-body--peripheral">
    <button class="${headerImage ? "setup-inspection-photo has-image" : "setup-inspection-photo"}" ${headerImage ? `data-expand-image="${escapeHtml(headerImage)}" data-expand-alt="${escapeHtml(record.title)}"` : "disabled"} type="button">
      ${headerImage ? `<img src="${escapeHtml(headerImage)}" alt="" decoding="async" loading="lazy" />` : ""}
      <span>${headerImage ? "inspect photo" : "no capture"}</span>
    </button>
    <div class="setup-peripheral-copy">
      <h2>${escapeHtml(record.title)}</h2>
      ${description ? `<p>${escapeHtml(description)}</p>` : ""}
    </div>
  </div>`;
}

function setupNoteBody(record, notes) {
  const noteFiles = notes.length ? notes : [{ title: record.title, body: record.body }];

  return `<div class="setup-note-file-shell">
    <div class="setup-note-file-icon" aria-hidden="true"><span></span></div>
    <div class="setup-note-file-copy">
      <p class="setup-command">&gt; note.opened / public-safe</p>
      <h2>${escapeHtml(record.title)}</h2>
      ${record.summary ? `<p class="setup-motd">${escapeHtml(record.summary)}</p>` : ""}
    </div>
    ${renderSetupNotes(noteFiles)}
  </div>`;
}

function renderSetupNotes(notes) {
  const handheld = pocket?.isHandheld();
  return `<div class="setup-note-stack">${notes.map((note) => {
    const link = note.id ? renderNoteLink(note.id) : "";
    return `<article class="setup-note"${note.id ? ` data-setup-note-id="${escapeHtml(note.id)}"` : ""}><h3>// ${escapeHtml(note.title)}</h3>${handheld ? "" : link}<div class="record-body">${markdownBody(note.body)}</div>${handheld ? link : ""}</article>`;
  }).join("")}</div>`;
}

function setupFetchDetails(record, profile, specs, command) {
  const externalUrl = safeExternalUrl(record.externalUrl);

  return `<div class="setup-fetch setup-fetch--terminal">
    <p class="setup-command">&gt; ${escapeHtml(command)}</p>
    <h2>${escapeHtml(record.title)}</h2>
    ${record.summary ? `<p class="setup-motd">${escapeHtml(record.summary)}</p>` : ""}
    <dl>
      <div><dt>TYPE</dt><dd>${escapeHtml(profile.category)}</dd></div>
      <div><dt>STATE</dt><dd>${escapeHtml(record.status)}</dd></div>
      <div><dt>UPDATED</dt><dd>${readableDate(recordLastUpdated(record))}</dd></div>
      ${externalUrl ? `<div><dt>LINK</dt><dd><a href="${escapeHtml(externalUrl)}" target="_blank" rel="noreferrer">open page</a></dd></div>` : ""}
      ${specs.map((spec) => `<div><dt>${escapeHtml(spec.label)}</dt><dd>${escapeHtml(spec.value)}</dd></div>`).join("")}
    </dl>
  </div>`;
}

function setupRecordImage(record) {
  return record.iconImage || recordHeaderImage(record) || record.banner || "";
}

function safeExternalUrl(value) {
  return typeof value === "string" && /^https?:\/\/[^\s]+$/i.test(value) ? value : "";
}

function cleanDisplaySummary(value) {
  const summary = typeof value === "string" ? value.trim() : "";

  return summary && summary.toLowerCase() !== "no summary recorded." ? summary : "";
}

function recordArtwork(record) {
  return window.GestaltImageFraming?.recordHeadingArtwork?.(record, steamDisplayModule?.steamBannerImage) || { src: recordHeaderImage(record) };
}

function renderHeadingImage(record, artwork) {
  return `<img class="heading-banner-image" src="${escapeHtml(artwork.src)}"${artwork.coverFallback ? ` data-steam-cover="${escapeHtml(artwork.coverFallback)}"` : ""} alt="" decoding="async" referrerpolicy="no-referrer" style="${window.GestaltImageFraming?.headerFrameCss(record) || ""}" />`;
}

function recordWindow(record) {
  if (!state.panelOpen) {
    return "";
  }

  if (record.section === "setup") {
    return setupRecordWindow(record);
  }

  const contents = getRecordContents(record);
  const handheld = window.GestaltPocketIndex?.isHandheld();
  const availableContent = normalizeContentKey(record);
  const activeContent = handheld ? window.GestaltPocketIndex?.readingView?.(record.section, availableContent) ?? availableContent : availableContent;
  const readingContents = window.GestaltPocketIndex?.readingContents?.(record.section, contents) ?? contents;
  const titleClass = `record-title-text${record.title.length > 26 ? " is-long-title" : ""}`;
  const readingNotes = activeContent === "notes";
  const logs = record.section === "logs";
  const noteDirectory = usesNoteDirectory(record);
  const readingLayout = noteDirectory || logs;
  const retractArtwork = readingNotes && !readingLayout;
  const directoryNote = noteDirectory && readingNotes && state.noteFileOpen;
  const focusedNote = (state.dashboardNoteReader || directoryNote) && state.focusedNoteIndex !== null ? noteEntries(record.body)[state.focusedNoteIndex] : null;
  const noteTitle = focusedNote ? splitNoteTitle(focusedNote.title).title : "";
  const caption = logs ? "FIELD NOTE" : focusedNote ? `// ${noteTitle === "Current note" ? record.title : noteTitle}` : readingLayout || readingNotes ? `// ${record.title}` : "// ARCHIVE ENTRY";
  const artwork = recordArtwork(record);

  return `<article role="dialog" aria-modal="true" tabindex="-1" class="record-window ${state.panelMaximized ? "is-maximized" : ""} ${state.windowSteady ? "is-steady" : ""} ${state.accessPending ? "is-access-pending" : state.accessComplete ? "is-access-complete" : ""} ${state.updateHistoryOpen ? "has-index-modal" : ""} ${readingLayout ? "has-reading-layout" : ""} ${logs ? "is-log-record is-field-paper-reader" : ""} ${focusedNote ? "is-note-reader" : readingNotes ? "is-notes-view" : ""}" data-state="${recordStateKey(record.status)}" aria-label="${escapeHtml(record.title)} ${logs || focusedNote ? "note reader" : "archive entry"}">
    ${logs ? "" : recordAccessSurfaceMarkup()}
    <header class="window-bar">
      ${pocketBack()}
      <span class="record-window-caption">${escapeHtml(caption)}</span>
      <div class="window-control-group">
        ${record.section !== "system" ? recordLinkButton(focusedNote?.id) : ""}
        <div class="window-actions">
          <button type="button" data-window-action="minimize" aria-label="Minimize record">minimize</button>
          <button type="button" data-window-action="maximize" aria-label="${state.panelMaximized ? "Restore record" : "Maximize record"}">${state.panelMaximized ? "restore" : "maximize"}</button>
          <button type="button" data-window-action="close" aria-label="Close record">close</button>
        </div>
      </div>
    </header>

    ${record.section !== "system" ? recordLinkFeedback(Boolean(focusedNote?.id), state.noteLinkMissing) : ""}
    <div class="record-layout">
      ${focusedNote ? renderFocusedNote(record, focusedNote, directoryNote && !state.dashboardNoteReader) : `
      <div class="record-main">
        ${readingLayout && contents.length > 1 ? `<nav class="record-view-tabs" aria-label="Entry contents">
          <div class="record-view-tab-links">${contents.map(({ key, label }) => `<button type="button" data-content-key="${key}"${activeContent === key ? ' aria-current="true"' : ""}>${escapeHtml(label)}</button>`).join("")}</div>
          ${noteDirectory ? renderNoteFileSearch(record) : ""}
        </nav>` : ""}
        ${logs ? `<div class="record-heading field-paper-heading">
          <div class="field-paper-filing"><span>${escapeHtml(recordTraceId(record))}</span><span>${escapeHtml(record.status)}</span></div>
          <h2>${escapeHtml(record.title)}</h2>
          ${artwork.src ? renderHeadingImage(record, artwork) : ""}
        </div>` : `<div class="record-heading${artwork.src ? " has-heading-banner" : ""}${retractArtwork ? " is-notes-heading" : ""}">
          ${artwork.src && !retractArtwork ? renderHeadingImage(record, artwork) : ""}
          <span class="record-kind">${escapeHtml(record.type.toUpperCase())}</span>
          <span class="record-id">${escapeHtml(recordTraceId(record))}</span>
          <h2><span class="${titleClass}">${escapeHtml(record.title)}</span></h2>
          <p>
            Status: ${escapeHtml(record.status)}
            ${record.section === "games" && gameLogPlacement(record) === "session" && gameActivityValue(record) ? `<span>.</span> Activity: ${escapeHtml(gameActivityLabel(record))}` : ""}
            <span>.</span>
            Type: ${escapeHtml(record.type)}
            ${record.started ? `<span>.</span>Started: ${readableDate(record.started)}` : ""}
          </p>
        </div>`}

        ${!readingLayout && readingContents.length > 1 ? `<label class="pocket-record-contents"><span>Contents</span><span class="pocket-record-select"><select data-record-content-picker>
          ${readingContents.map(({ key, label }) => `<option value="${key}"${key === activeContent ? " selected" : ""}>${escapeHtml(label)}</option>`).join("")}
        </select></span></label>` : ""}
        ${logs ? recordReadingDetails(record) : ""}
        <div class="record-content-view">${renderRecordContent(record, activeContent, handheld)}</div>
        ${noteDirectory && activeContent === "overview" ? recordReadingDetails(record) : ""}
      </div>

      ${readingLayout ? "" : `<aside class="record-aside">${recordAsideContent(record, contents, activeContent, handheld)}</aside>`}
      `}
    </div>
    ${focusedNote || record.section === "games" ? "" : renderUpdateHistoryModal(record)}
  </article>`;
}

function recordReadingDetails(record) {
  return `<div class="record-reading-details">
    <dl class="record-reading-dates">
      <div><dt>Created</dt><dd>${record.started ? readableDate(record.started) : "Unknown"}</dd></div>
      <div><dt>Last Updated</dt><dd>${readableDate(recordLastUpdated(record))}</dd></div>
    </dl>
    ${record.section === "games" ? "" : renderUpdateHistory(record)}
  </div>`;
}

function recordAsideContent(record, contents, activeContent, handheld) {
  return `<div class="record-contents-list">
          <h3>CONTENTS</h3>
          <ol>
            ${contents
              .map(
                (item, index) => `<li class="${activeContent === item.key ? "is-active" : ""}">
                  <button type="button" data-content-key="${item.key}">${contentOrdinal(record, index)}_${escapeHtml(item.label)}</button>
                </li>`
              )
              .join("")}
          </ol>
        </div>

        <dl class="record-meta">
          <div><dt>Created:</dt><dd>${record.started ? readableDate(record.started) : "Unknown"}</dd></div>
          <div><dt>Last Updated:</dt><dd>${readableDate(recordLastUpdated(record))}</dd></div>
        </dl>

        ${activeContent === "notes" ? handheld ? "" : renderNoteSearch(record) : record.section === "games" ? "" : renderUpdateHistory(record)}`;
}

function recordBackdrop() {
  return state.panelOpen
    ? `<button class="record-backdrop" type="button" aria-label="Minimize active record" data-record-backdrop></button>`
    : "";
}

function searchPanel() {
  if (!state.searchOpen) {
    return "";
  }

  const results = searchResults();
  const resultList = results.length
    ? results
        .map(
          (result) => {
            const returnKey = result.record && window.GestaltArchiveSearch?.resultKey?.(result);
            const returnAttr = returnKey ? ` data-search-result="${escapeHtml(returnKey)}"` : "";
            if (result.kind === "command") {
              if (result.action === "behaviour") {
                return `<button type="button" class="palette-settings-button" data-open-os-behaviour aria-haspopup="dialog"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9.671 4.136a2.34 2.34 0 0 1 4.659 0 2.34 2.34 0 0 0 3.319 1.915 2.34 2.34 0 0 1 2.33 4.033 2.34 2.34 0 0 0 0 3.831 2.34 2.34 0 0 1-2.33 4.033 2.34 2.34 0 0 0-3.319 1.915 2.34 2.34 0 0 1-4.659 0 2.34 2.34 0 0 0-3.32-1.915 2.34 2.34 0 0 1-2.33-4.033 2.34 2.34 0 0 0 0-3.831A2.34 2.34 0 0 1 6.35 6.051a2.34 2.34 0 0 0 3.319-1.915"/><circle cx="12" cy="12" r="3"/></svg><strong>Settings</strong></button>`;
              }
              const commandAttrs = result.record
                ? `data-open-record="${result.record.id}" ${result.content ? `data-open-content="${result.content}"` : ""}`
                : result.action === "timeline"
                  ? "data-open-timeline"
                  : result.action === "roadmap"
                    ? "data-open-roadmap"
                    : result.action === "connections"
                      ? 'data-open-connections aria-haspopup="dialog"'
                    : `data-open-section="${result.section}"`;
              const stateAttr = result.record ? ` data-state="${recordStateKey(result.record.status)}"` : "";

              return `<button type="button" ${commandAttrs}${stateAttr}${returnAttr}>
                <span><strong>${escapeHtml(result.title)}</strong><small class="cipher-description">${renderCipherLetters(result.detail)}</small></span>
                <i>CMD</i>
              </button>`;
            }

            const isNote = result.kind === "note";
            const noteAttr = isNote ? ` data-open-note-id="${escapeHtml(result.noteId)}"` : "";
            return `<button type="button" data-open-record="${escapeHtml(result.record.id)}"${noteAttr} data-state="${recordStateKey(result.record.status)}"${returnAttr}>
            <span><strong>${escapeHtml(isNote ? result.title : result.record.title)}</strong><small>${escapeHtml(result.detail)}</small></span>
            <i>${isNote ? "NOTE" : escapeHtml(result.record.section.toUpperCase())}</i>
          </button>`
          }
        )
        .join("")
    : `<p class="search-empty">No matching records, notes or commands.</p>`;

  return `<div class="search-panel command-panel" role="search">
    <label for="archive-search" class="cipher-on-open">~ ${renderCipherLetters("COMMAND PALETTE")}</label>
    <input
      id="archive-search"
      type="search"
      value="${escapeHtml(state.searchQuery)}"
      placeholder="Find a record, note or command"
      autocomplete="off"
      data-search-input
    />
    <div class="search-suggestions">${resultList}</div>
  </div>`;
}

function syncSearchPanel(returnKey) {
  document.querySelector(".archive-shell")?.toggleAttribute("data-search-open", state.searchOpen);
  const header = document.querySelector(".workspace-header");
  if (!header) return;
  const panel = header.querySelector(".command-panel");
  const restoreFocus = panel?.contains(document.activeElement);
  if (state.searchOpen) {
    const template = document.createElement("template");
    template.innerHTML = searchPanel();
    const next = template.content.querySelector(".command-panel");
    if (panel) {
      panel.querySelector(".search-suggestions").replaceChildren(...next.querySelector(".search-suggestions").childNodes);
      const input = panel.querySelector("[data-search-input]");
      if (input.value !== state.searchQuery) input.value = state.searchQuery;
    } else {
      header.append(next);
    }
    if (returnKey) {
      const target = (panel || next).querySelector(`[data-search-result="${CSS.escape(returnKey)}"]`);
      (target || (panel || next).querySelector("[data-search-input]"))?.focus();
    } else if (!panel) next.querySelector("[data-search-input]")?.focus();
  } else {
    panel?.remove();
    if (restoreFocus) {
      const folder = state.archiveFolderWindow && root.querySelector(".archive-folder-window");
      if (folder) folder.focus({ preventScroll: true });
      else {
        for (const control of document.querySelectorAll("[data-search-toggle], .archive-menu-toggle")) {
          if (control.getClientRects().length && !control.closest("[inert]")) { control.focus({ preventScroll: true }); break; }
        }
      }
    }
  }
  document.querySelectorAll("[data-search-toggle]").forEach((button) => {
    button.classList.toggle("is-active", state.searchOpen);
    if (button.closest(".pocket-header")) button.setAttribute("aria-expanded", String(state.searchOpen));
  });
  syncDesktopNavigation();
}

function openWebSearch() {
  openWorkspaceTool("search");
}

function openWorkspaceTool(mode) {
  const api = window.GestaltWorkspaceTools;
  if (!api || state.webSearchOpen || state.connectionsOpen || (mode === "search" && (state.panelOpen || state.timelineOpen || state.roadmapOpen || state.osBehaviourOpen || state.expandedImage || state.archiveFolderWindow))) return;
  state.searchOpen = false;
  state.searchQuery = "";
  state.webSearchOpen = mode === "search";
  state.connectionsOpen = mode === "connections";
  syncSearchPanel();
  workspaceToolsController ??= api.createController();
  workspaceToolsController.open({ mode, remember: state.localMemory === "granted", onClose() {
    state.webSearchOpen = false;
    state.connectionsOpen = false;
    syncDesktopNavigation();
  } });
  syncDesktopNavigation();
}

function openOsBehaviour() {
  const rebuild = state.navOpen || !root.querySelector(".workspace");
  state.searchOpen = false;
  state.searchQuery = "";
  state.navOpen = false;
  state.osBehaviourOpen = true;
  if (rebuild) { state.windowSteady = true; render(); return; }
  syncSearchPanel();
  syncWorkspaceFocus();
  syncOsBehaviourDialog();
  syncDesktopNavigation();
}

function syncOsBehaviourDialog() {
  const api = window.GestaltOsBehaviour;
  if (!state.osBehaviourOpen || !api) {
    osBehaviourController?.destroy();
    osBehaviourController = null;
    return;
  }
  osBehaviourController ??= api.createController();
  osBehaviourController.open({ entry: state.entryAccessMode, startup: state.startupMode, pocketBoot: state.pocketBootMode, seasonal: state.seasonalMode, navigation: state.desktopNavigationMode, appearance: window.GestaltAppearance?.getMode() || "night", memory: state.memoryMode }, {
    onClose() {
      state.osBehaviourOpen = false;
      syncOsBehaviourDialog();
      syncWorkspaceFocus();
      syncDesktopNavigation();
      root.querySelector(".record-window:not([hidden]):not([inert]), .timeline-window, .archive-folder-window")?.focus({ preventScroll: true });
    },
    onChange(key, value) {
      if (key === "pocketBoot" && pocket) {
        const mode = pocket.normalizeBootMode(value);
        if (state.localMemory === "granted" && !pocket.saveBootMode(mode)) return false;
        state.pocketBootMode = mode;
      }
      if (key === "appearance") window.GestaltAppearance?.setMode(value, state.localMemory === "granted");
      if (key === "entry") changeEntryAccessMode(value);
      if (key === "seasonal") changeSeasonalMode(value);
      if (key === "navigation") changeDesktopNavigationMode(value);
      if (key === "memory") changeMemoryMode(value);
      if (key === "startup") {
        if (!api.saveStartupMode(value)) return false;
        state.startupMode = api.normalizeStartupMode(value);
      }
      syncOsBehaviourDialog();
    }
  }, state.localMemory === "granted");
}

function loadPublicRoadmap() {
  if (roadmapData) return Promise.resolve(roadmapData);
  if (!roadmapLoadPromise) {
    let timer, expired = false;
    const deadline = new Promise((resolve) => { timer = setTimeout(() => { expired = true; resolve(null); }, 12000); });
    const request = import("./public/roadmap.mjs?v=1.73.4")
      .then(async (module) => expired ? null : { module, data: await module.loadRoadmap(new URL("public/data/roadmap.json", document.baseURI)) });
    roadmapLoadPromise = Promise.race([request, deadline])
      .then((result) => { if (!result || expired) return null; buildRoadmapHistory = result.module.buildRoadmapHistory; roadmapData = result.data; return roadmapData; })
      .catch(() => null)
      .finally(() => { clearTimeout(timer); roadmapLoadPromise = null; });
  }
  return roadmapLoadPromise;
}

async function refreshPublicRoadmap() {
  roadmapFailed = false;
  syncRoadmapDialog();
  const data = await loadPublicRoadmap();
  if (!state.roadmapOpen) return;
  roadmapFailed = !data;
  syncRoadmapDialog();
}

function openRoadmap() {
  if (state.roadmapOpen || recordMotionController?.busy) return;
  window.GestaltRecordLinks?.close(window);
  stopRecordAccessSequence();
  state.panelOpen = false;
  state.panelMinimized = false;
  state.timelineOpen = false;
  state.archiveFolderWindow = null;
  state.searchOpen = false;
  state.searchQuery = "";
  state.navOpen = false;
  state.roadmapOpen = true;
  roadmapChapterId = "working";
  roadmapReleaseIndex = null;
  if (!syncRoadmapWindow()) render();
  void refreshPublicRoadmap();
}

function closeRoadmap() {
  if (!state.roadmapOpen) return;
  state.roadmapOpen = false;
  syncRoadmapDialog();
  syncRecordWindowChrome();
}

function syncRoadmapWindow() {
  const workspace = root.querySelector(".workspace");
  if (!workspace || !state.bootDismissed) return false;
  removeReadingWindows(workspace);
  dismissArchiveMenu();
  syncSearchPanel();
  syncRecordWindowChrome();
  syncRoadmapDialog();
  return true;
}

function renderRoadmapContent(data, chapterId = roadmapChapterId, releaseIndex = roadmapReleaseIndex) {
  const chapter = data.groups.find((group) => group.id === chapterId) || data.groups[0];
  if (!chapter) return '<p class="roadmap-message" role="status">No work notes filed yet.</p>';
  const history = buildRoadmapHistory?.(data) || [];
  const release = chapter.id === "done" && releaseIndex !== null ? history[releaseIndex] : null;
  const indexOpen = chapter.id === "done" && !release;
  const items = release?.items || chapter.items;
  const title = release?.version || chapter.title;
  const intro = release ? null : chapter.id === "working" ? data.intro : indexOpen ? "Completed work, kept in the record." : "Loose ends and possibilities. Some will become records, some might not ~";
  return `<nav class="notebook-chapters" aria-label="Notebook chapters">${data.groups.map((group) => `<button type="button" data-notebook-chapter="${escapeHtml(group.id)}"${group.id === chapter.id ? ' aria-current="page"' : ""}>${escapeHtml(group.title)}<span>${String(group.items.length).padStart(2, "0")}</span></button>`).join("")}</nav>
    <div class="notebook-sheet"><span class="notebook-binding" aria-hidden="true"><i></i><i></i><i></i></span><div class="notebook-page" id="roadmap-page">
      <div class="notebook-registration"><span>GESTALT / FIELD COPY</span><span>${release ? "FILED UPDATE" : indexOpen ? "UPDATE INDEX" : "WORKING COPY"}</span></div>
      <header class="roadmap-heading"><span>${escapeHtml(release ? chapter.title : data.title)}</span><h2 id="roadmap-page-title" tabindex="-1">${escapeHtml(title)}</h2>${intro ? `<p>${escapeHtml(intro)}</p>` : ""}</header>${release?.releasedOn ? `<time class="notebook-release-date" datetime="${escapeHtml(release.releasedOn)}">${escapeHtml(readableDate(release.releasedOn))}</time>` : ""}
      ${indexOpen ? `<ol class="notebook-release-index" aria-label="Filed updates">${history.map((update, index) => `<li><button type="button" data-notebook-release="${index}"><span class="notebook-release-version">${escapeHtml(update.version)}</span><span><strong>${escapeHtml(update.title)}</strong><small>${update.releasedOn ? `<time datetime="${escapeHtml(update.releasedOn)}">${escapeHtml(readableDate(update.releasedOn))}</time> . ` : ""}${update.items.length} ${update.items.length === 1 ? "milestone" : "milestones"}</small></span><img src="public/images/ui/notebook-next.svg" alt="" /></button></li>`).join("")}${!history.length ? '<li class="roadmap-message">No completed updates filed yet.</li>' : ""}</ol>`
        : `<section class="roadmap-group" data-roadmap-state="${escapeHtml(chapter.id)}" aria-labelledby="roadmap-page-title"><div class="notebook-entry-count"><span>${release ? "RELEASE NOTES" : "WORK NOTES"}</span><span>${String(items.length).padStart(2, "0")} RECORDS</span></div><ol>${items.map((item, index) => `<li><span class="roadmap-mark" aria-hidden="true">${String(index + 1).padStart(2, "0")}</span><div><h3>${release || item.completed ? `<s>${escapeHtml(item.title)}</s>` : escapeHtml(item.title)}</h3><p>${escapeHtml(item.detail)}</p></div></li>`).join("")}</ol>${!items.length ? '<p class="roadmap-message">Nothing written here yet.</p>' : ""}</section>`}
    </div></div>
    ${release ? `<footer class="notebook-pagination is-history"><button type="button" data-notebook-index aria-label="Back to update index" title="Update index" aria-controls="roadmap-page"><img src="public/images/ui/notebook-index.svg" alt="" /></button><button type="button" data-notebook-release="${releaseIndex - 1}" aria-label="Newer update" title="Newer update" aria-controls="roadmap-page"${releaseIndex === 0 ? " disabled" : ""}><img src="public/images/ui/notebook-prev.svg" alt="" /></button><span role="status" aria-live="polite" aria-atomic="true">${escapeHtml(release.version)}<span>${String(releaseIndex + 1).padStart(2, "0")} / ${String(history.length).padStart(2, "0")}</span></span><button type="button" data-notebook-release="${releaseIndex + 1}" aria-label="Older update" title="Older update" aria-controls="roadmap-page"${releaseIndex === history.length - 1 ? " disabled" : ""}><img src="public/images/ui/notebook-next.svg" alt="" /></button></footer>`
      : `<footer class="notebook-pagination is-summary"><span>${indexOpen ? `${history.length} filed updates` : `${items.filter((item) => !item.completed).length} open notes`}</span><span>Revised ${escapeHtml(data.updated)}</span></footer>`}`;
}

function navigateRoadmap(chapterId, releaseIndex = null) {
  if (!state.roadmapOpen || !roadmapData || !["working", "ideas", "done"].includes(chapterId) || !roadmapData.groups.some((group) => group.id === chapterId)) return;
  const history = buildRoadmapHistory?.(roadmapData) || [];
  if (releaseIndex !== null && (chapterId !== "done" || !Number.isInteger(releaseIndex) || !history[releaseIndex])) return;
  if (roadmapChapterId === chapterId && roadmapReleaseIndex === releaseIndex) return;
  const previousRelease = roadmapChapterId === "done" ? roadmapReleaseIndex : null;
  document.getElementById("gestalt-roadmap")?.setAttribute("data-notebook-settled", "");
  roadmapChapterId = chapterId;
  roadmapReleaseIndex = releaseIndex;
  syncRoadmapDialog();
  const dialog = document.getElementById("gestalt-roadmap");
  const selector = releaseIndex !== null ? "#roadmap-page-title" : chapterId === "done" && previousRelease !== null
    ? `[data-notebook-release="${previousRelease}"]` : `[data-notebook-chapter="${chapterId}"]`;
  dialog?.querySelector(selector)?.focus();
}

function syncRoadmapDialog() {
  let dialog = document.getElementById("gestalt-roadmap");
  if (!state.roadmapOpen) {
    if (dialog) {
      if (dialog.open) dialog.close();
      dialog.remove();
      const controls = [roadmapTrigger, ...document.querySelectorAll("[data-search-toggle], .archive-menu-toggle")];
      const target = controls.find((control) => control instanceof HTMLElement && control !== document.body && control.isConnected && control.getClientRects().length && !control.closest("[inert], [hidden]"));
      target?.focus({ preventScroll: true });
      roadmapTrigger = null;
    }
    return;
  }
  if (!dialog) {
    roadmapTrigger = document.activeElement;
    dialog = document.createElement("dialog");
    dialog.id = "gestalt-roadmap";
    dialog.className = "roadmap-dialog";
    dialog.setAttribute("aria-label", "Gestalt roadmap");
    dialog.innerHTML = '<article class="roadmap-note"><header class="window-bar"><span>// FIELD NOTEBOOK</span><div class="window-actions"><button type="button" data-window-action="close" data-roadmap-close aria-label="Close roadmap">close</button></div></header><div class="roadmap-body"></div></article>';
    dialog.addEventListener("keydown", (event) => event.stopPropagation());
    const settleOpening = () => dialog.setAttribute("data-notebook-settled", "");
    dialog.addEventListener("pointerdown", (event) => { if (event.target instanceof Element && event.target.closest(".roadmap-note")) settleOpening(); }, { capture: true });
    dialog.addEventListener("focusin", (event) => { if (event.target instanceof Element && event.target.closest(".roadmap-body")) settleOpening(); });
    dialog.addEventListener("animationend", (event) => { if (event.animationName === "notebook-register-edges") settleOpening(); });
    dialog.addEventListener("cancel", (event) => { event.preventDefault(); closeRoadmap(); });
    dialog.addEventListener("click", (event) => {
      if (event.target === dialog) { event.stopPropagation(); closeRoadmap(); return; }
      const control = event.target instanceof Element ? event.target.closest("[data-notebook-chapter], [data-notebook-release], [data-notebook-index]") : null;
      if (control && !control.disabled) {
        event.stopPropagation();
        if (control.hasAttribute("data-notebook-chapter")) navigateRoadmap(control.getAttribute("data-notebook-chapter"));
        else navigateRoadmap("done", control.hasAttribute("data-notebook-release") ? Number(control.getAttribute("data-notebook-release")) : null);
      }
    });
    document.body.append(dialog);
    dialog.showModal();
  }
  const status = roadmapData ? "ready" : roadmapFailed ? "failed" : "loading";
  const pageState = status === "ready" ? `${status}:${roadmapChapterId}:${roadmapReleaseIndex ?? "index"}` : status;
  if (dialog.dataset.roadmapState === pageState) return;
  dialog.dataset.roadmapState = pageState;
  const body = dialog.querySelector(".roadmap-body");
  body.setAttribute("aria-busy", String(status === "loading"));
  body.innerHTML = roadmapData ? renderRoadmapContent(roadmapData)
    : roadmapFailed ? '<div class="roadmap-message" role="status"><p>Work note unavailable.</p><button type="button" data-roadmap-retry>Try again</button></div>'
      : '<p class="roadmap-message" role="status">Retrieving work note...</p>';
  if (status === "ready") dialog.setAttribute("data-notebook-ready", "");
}

function timelineSources(items) {
  const labels = { projects: "Projects", games: "Games", logs: "Logs", setup: "Setup", archive: "Archive" };
  return Object.entries(labels)
    .map(([id, label]) => ({ id, label, count: items.filter((item) => item.record.section === id).length }))
    .filter((source) => source.count > 0);
}

function groupTimelineItems(items, source = "all") {
  const groups = new Map();
  for (const item of items) {
    if (source !== "all" && item.record.section !== source) continue;
    const group = groups.get(item.date) ?? { date: item.date, items: [] };
    group.items.push(item);
    groups.set(item.date, group);
  }
  return [...groups.values()];
}

function timelineItemTitle(item) {
  if (item.kind !== "note") return item.title;
  return item.title.replace(/^\s*\d{1,2}\s*\/\s*\d{1,2}\s*\/\s*\d{4}\s*[-:\u2013\u2014|]?\s*/, "").trim() || item.title;
}

function renderTimelineResults(items, source) {
  const groups = groupTimelineItems(items, source);
  const count = groups.reduce((total, group) => total + group.items.length, 0);
  return `<p class="timeline-scope" role="status">Showing ${count} of ${items.length} recent signals / Newest first</p>
    ${groups.length ? groups.map((group) => `<section class="timeline-day" aria-label="${escapeHtml(readableDate(group.date))}">
      <h2><time datetime="${escapeHtml(group.date)}">${escapeHtml(readableDate(group.date))}</time><span>${group.items.length} ${group.items.length === 1 ? "SIGNAL" : "SIGNALS"}</span></h2>
      <ol class="timeline-list">${group.items.map((item) => `<li data-state="${recordStateKey(item.record.status)}">
        <button type="button" data-open-record="${escapeHtml(item.record.id)}" data-open-content="${escapeHtml(item.content)}">
          <span>${escapeHtml(timelineItemTitle(item))}</span>
          <small>${escapeHtml(item.detail)}</small>
          <i>${item.kind === "note" ? "NOTE" : "RECORD"}</i>
        </button>
      </li>`).join("")}</ol>
    </section>`).join("") : '<p class="timeline-empty">No signals in this view.</p>'}`;
}

function changeTimelineSource(source) {
  if (!state.timelineOpen) return;
  const items = getTimelineItems();
  if (source !== "all" && !timelineSources(items).some((item) => item.id === source)) return;
  const results = root.querySelector(".timeline-window #timeline-results");
  if (!(results instanceof HTMLElement)) return;
  state.timelineSource = source;
  results.innerHTML = renderTimelineResults(items, source);
  const body = results.closest(".timeline-body");
  if (body instanceof HTMLElement) body.scrollTop = 0;
}

function timelineWindow() {
  if (!state.timelineOpen) {
    return "";
  }

  const items = getTimelineItems();
  const sources = timelineSources(items);
  const source = state.timelineSource === "all" || sources.some((item) => item.id === state.timelineSource) ? state.timelineSource : "all";
  const range = items.length ? `${readableDate(items[items.length - 1].date)} to ${readableDate(items[0].date)}` : "No activity recorded";

  return `<button class="record-backdrop" type="button" aria-label="Close timeline" data-timeline-close></button>
    <article role="dialog" aria-modal="true" tabindex="-1" class="timeline-window" aria-label="Archive timeline">
      <div class="timeline-registration" aria-hidden="true"><i></i><i></i><i></i></div>
      <header class="window-bar">
        <span>// TIMELINE RECONSTRUCTION</span>
        <div class="window-actions">
          <button type="button" data-window-action="close" data-timeline-close aria-label="Close timeline">close</button>
        </div>
      </header>
      <div class="timeline-toolbar">
        <div class="timeline-range"><span>RECENT SIGNALS</span><strong>${escapeHtml(range)}</strong></div>
        <label class="timeline-source">Source
          <select data-timeline-source aria-controls="timeline-results">
            <option value="all"${source === "all" ? " selected" : ""}>All sources (${items.length})</option>
            ${sources.map((item) => `<option value="${item.id}"${source === item.id ? " selected" : ""}>${item.label} (${item.count})</option>`).join("")}
          </select>
        </label>
      </div>
      <div class="timeline-body">
        <div id="timeline-results">${renderTimelineResults(items, source)}</div>
      </div>
    </article>`;
}

function pocketIcon(markup) {
  return `<svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">${markup}</svg>`;
}

function pocketBack() {
  return `<button class="pocket-record-back" type="button" data-window-action="close">${pocketIcon('<path d="m12 19-7-7 7-7M5 12h14"/>')}Back</button>`;
}

function recordLinkButton(noteId) {
  const label = noteId ? "Copy note link" : "Copy record link";
  const caption = noteId ? `<span class="pocket-note-link-label" aria-hidden="true">${label}</span>` : "";
  return `<button class="record-link-button" type="button" ${noteId ? `data-copy-note-link="${escapeHtml(noteId)}"` : "data-copy-record-link"} aria-label="${label}" title="${label}">${pocketIcon('<path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7"/>')}${caption}</button>`;
}

function recordLinkFeedback(note = false, unavailable = false) {
  return `<div class="record-link-feedback"><span data-record-copy-status role="status">${unavailable ? "This note is not available in the record." : ""}</span><input aria-label="${note ? "Note" : "Record"} link" type="url" readonly hidden></div>`;
}

function renderNoteLink(noteId) {
  return `<div class="note-link-tools">${recordLinkButton(noteId)}${recordLinkFeedback(true)}</div>`;
}

function pocketHeader() {
  if (!pocket) return "";
  return `<header class="pocket-header"><button class="pocket-brand" type="button" aria-label="Gestalt home" data-home><strong>GESTALT</strong><small>HANDHELD FIELD MODE</small></button><div class="pocket-tools">
    <button type="button" data-search-toggle aria-expanded="${state.searchOpen}">${pocketIcon('<circle cx="11" cy="11" r="7"/><path d="m16 16 4 4"/>')}Search</button>
    <button type="button" data-open-os-behaviour aria-haspopup="dialog">${pocketIcon('<path d="m9 3-1 3-3 1v3l-2 2 2 2v3l3 1 1 3h6l1-3 3-1v-3l2-2-2-2V7l-3-1-1-3z"/><circle cx="12" cy="12" r="3"/>')}Settings</button>
    </div></header>`;
}

function pocketIndex() {
  if (!pocket) return "";
  return `<div class="pocket-context"><button type="button" data-home>${pocketIcon('<path d="m12 19-7-7 7-7M5 12h14"/>')}Back to Index</button></div>
    <div class="pocket-index"><div class="pocket-register"><div><small>// FIELD DIRECTORY</small><h1>Archive index</h1></div>${pocket.stamp}</div>
    <nav class="pocket-directory" aria-label="Archive sections">${pocket.directory.map(([id, number, label]) => `<button type="button" data-open-section="${id}"><small aria-hidden="true">${number}</small><span class="nav-mark" data-icon="${id}" aria-hidden="true"></span><strong>${label}</strong>${pocketIcon('<path d="m9 18 6-6-6-6"/>')}</button>`).join("")}</nav>
    <section class="pocket-dispatches" aria-label="Recent dispatches">${pocket.isHandheld() ? pocketDispatchesMarkup() : ""}</section></div>`;
}

function pocketDispatchesMarkup() {
  const latest = latestLogRecord();
  const featured = latest ? `<button class="pocket-dispatch" type="button" data-open-record="${escapeHtml(latest.id)}"><span><small>LATEST FIELD NOTE</small><strong>${escapeHtml(latest.title)}</strong></span>${pocketIcon('<path d="M7 17 17 7M7 7h10v10"/>')}</button>` : "";
  const dispatches = pocket.recentDispatches?.(latest?.id, recentActivity(6)) ?? [];
  const rows = dispatches.map((dispatch) => {
    const noteTarget = dispatch.noteId ? ` data-open-note-id="${escapeHtml(dispatch.noteId)}"` : Number.isInteger(dispatch.noteIndex) ? ` data-open-note-index="${dispatch.noteIndex}"` : "";
    const parent = dispatch.noteTitle && dispatch.noteTitle !== dispatch.title ? `<small>${escapeHtml(dispatch.title)}</small>` : "";
    return `<button class="pocket-dispatch-row" type="button" data-open-record="${escapeHtml(dispatch.record.id)}" data-open-content="${dispatch.content ?? "overview"}"${noteTarget}>
      <time datetime="${escapeHtml(dispatch.date)}">${escapeHtml(shortDate(dispatch.date))}</time>
      <span><strong>${escapeHtml(dispatch.noteTitle || dispatch.title)}</strong>${parent}</span>
      ${pocketIcon('<path d="m9 18 6-6-6-6"/>')}
    </button>`;
  }).join("");
  return featured + (rows ? `<div class="pocket-dispatch-list"><p>// RECENT DISPATCHES</p>${rows}</div>` : "");
}

function syncImageLightbox() {
  let dialog = document.getElementById("gestalt-image-viewer");
  if (!state.expandedImage) {
    if (dialog) {
      if (dialog.open) dialog.close();
      dialog.remove();
    }
    return;
  }

  if (!dialog) {
    dialog = document.createElement("dialog");
    dialog.id = "gestalt-image-viewer";
    dialog.className = "note-image-dialog";
    const button = document.createElement("button");
    button.type = "button";
    button.className = "note-image-lightbox";
    button.setAttribute("aria-label", "Close expanded image");
    button.dataset.closeExpandedImage = "";
    const image = document.createElement("img");
    image.decoding = "async";
    button.append(image);
    dialog.append(button);
    dialog.addEventListener("keydown", (event) => event.stopPropagation());
    dialog.addEventListener("cancel", (event) => {
      event.preventDefault();
      event.stopPropagation();
      state.expandedImage = null;
      syncImageLightbox();
    });
    document.body.append(dialog);
  }

  const image = dialog.querySelector("img");
  if (image.getAttribute("src") !== state.expandedImage.src) image.src = state.expandedImage.src;
  image.alt = state.expandedImage.alt;
  dialog.setAttribute("aria-label", state.expandedImage.alt || "Expanded image");
  if (!dialog.open) dialog.showModal();
}

function syncWorkspaceFocus() {
  const focused = state.panelOpen || state.timelineOpen || state.roadmapOpen || state.osBehaviourOpen;
  root.querySelector(".archive-shell")?.classList.toggle("has-record", focused);
  root.querySelector(".workspace")?.classList.toggle("has-record", focused);
  root.querySelector(".dashboard-grid")?.classList.toggle("is-muted", state.panelOpen);
}

function syncRecordWindowChrome() {
  syncWorkspaceFocus();
  const restore = root.querySelector(".reopen-control");
  if (restore) restore.hidden = state.panelOpen || !state.panelMinimized;
  syncDesktopNavigation();
  syncRecordFocus();
}

function removeReadingWindows(workspace) {
  workspace.querySelectorAll(":scope > :is(.record-window, .timeline-window, [data-record-backdrop], [data-timeline-close])").forEach((node) => node.remove());
  removeArchiveFolderWindow(workspace.querySelector(":scope > .archive-folder-page"));
  minimizedRecordWindow = null;
}

function removeArchiveFolderWindow(page) {
  page?.querySelector(":scope > .archive-folder-overlay")?.remove();
  page?.classList.remove("has-folder-window");
}

function syncArchiveFolderWindow() {
  const page = root.querySelector(".workspace > .archive-folder-page");
  const now = new Date();
  if (!page || !state.bootDismissed || directoryArchiveDay !== now.toISOString().slice(0, 10)) return false;
  const markup = state.archiveFolderWindow ? renderArchiveFolderWindow(buildFieldArchive(recordsFor("logs"), now).folders) : "";
  removeArchiveFolderWindow(page);
  if (markup) {
    page.insertAdjacentHTML("beforeend", markup);
    page.classList.add("has-folder-window");
  }
  syncDesktopNavigation();
  syncRecordFocus();
  return true;
}

function openArchiveFolder(title) {
  if (state.archiveFolderWindow === title || recordMotionController?.busy) return;
  state.archiveFolderWindow = title;
  if (!syncArchiveFolderWindow()) render();
}

function closeArchiveFolder() {
  if (!state.archiveFolderWindow) return;
  state.archiveFolderWindow = null;
  if (!syncArchiveFolderWindow()) render();
}

function dismissArchiveMenu() {
  const menu = root.querySelector(".archive-nav-panel");
  const restoreFocus = menu?.contains(document.activeElement);
  menu?.remove();
  root.querySelector("[data-nav-backdrop]")?.remove();
  const toggle = root.querySelector("[data-nav-toggle]");
  toggle?.classList.remove("is-active");
  toggle?.setAttribute("aria-expanded", "false");
  if (restoreFocus) toggle?.focus({ preventScroll: true });
  return toggle;
}

// A window change must not rebuild the scenery, dashboard, images or section scroll.
function syncRecordWindow() {
  const workspace = root.querySelector(".workspace");
  if (!workspace || !state.bootDismissed || recordMotionController?.busy || root.querySelector(".archive-nav-panel")) return false;
  removeReadingWindows(workspace);
  syncSearchPanel();
  syncRoadmapDialog();
  workspace.insertAdjacentHTML("beforeend", recordBackdrop() + recordWindow(selectedRecord()));
  state.windowSteady = false;
  syncRecordWindowChrome();
  return true;
}

function replaceRecordReadingView(record, focusFile) {
  const current = root.querySelector(".record-window");
  if (!current) return;
  const template = document.createElement("template");
  template.innerHTML = recordWindow(record);
  const entry = template.content.firstElementChild;
  if (!entry) return;
  for (const name of ["is-note-reader", "is-notes-view"]) current.classList.toggle(name, entry.classList.contains(name));
  current.setAttribute("aria-label", entry.getAttribute("aria-label"));
  current.replaceChildren(...entry.childNodes);
  const file = focusFile ? current.querySelector(`[data-note-file-index="${state.focusedNoteIndex}"]`) : null;
  if (file) file.focus();
  else current.focus({ preventScroll: true });
}

function openFullEntry() {
  if (!state.dashboardNoteReader || !state.panelOpen) return;
  state.dashboardNoteReader = false;
  const record = selectedRecord();
  const directory = usesNoteDirectory(record);
  if (directory) {
    state.linkedNoteId = null;
    window.GestaltRecordLinks?.open(window, record.id);
  }
  replaceRecordReadingView(record, directory);
  if (!directory && state.focusedNoteIndex > 0) revealFocusedNote();
}

function showNoteFile(index) {
  const record = selectedRecord();
  if (!state.panelOpen || !usesNoteDirectory(record) || state.activeContent !== "notes" || state.dashboardNoteReader) return;
  const note = index === null ? null : noteEntries(record.body)[index];
  if (index !== null && !note) return;
  if (note) {
    state.focusedNoteIndex = index;
    window.GestaltMemoryState?.record("note.expand", { index: index + 1 });
  }
  state.noteFileOpen = Boolean(note);
  state.noteLinkMissing = false;
  state.linkedNoteId = note?.id ?? null;
  window.GestaltRecordLinks?.open(window, record.id, note?.id);
  replaceRecordReadingView(record, !note);
}

function syncTimelineWindow() {
  const workspace = root.querySelector(".workspace");
  if (!workspace || !state.bootDismissed || recordMotionController?.busy) return false;
  removeReadingWindows(workspace);
  if (state.timelineOpen) {
    dismissArchiveMenu();
    syncSearchPanel();
    syncRoadmapDialog();
    workspace.insertAdjacentHTML("beforeend", timelineWindow());
  }
  syncRecordWindowChrome();
  return true;
}

function closeRecord() {
  if (!state.panelOpen || recordMotionController?.busy) return;
  const finish = () => { dismissRecordView(); window.GestaltRecordLinks?.close(window); };
  if (recordMotionController) {
    recordMotionController.close({ node: root.querySelector(".record-window"), enabled: !pocket?.isHandheld() && state.entryAccessMode !== "off", onComplete: finish });
  } else finish();
}

function dismissRecordView() {
  window.GestaltMemoryState?.record("record.close");
  stopRecordAccessSequence();
  state.panelOpen = false;
  state.panelMinimized = false;
  state.dashboardNoteReader = false;
  minimizedRecordWindow = null;
  root.querySelector(".record-window")?.remove();
  root.querySelector("[data-record-backdrop]")?.remove();
  const priorSearch = state.recordSearchReturn;
  state.recordSearchReturn = null;
  if (priorSearch) {
    state.searchQuery = priorSearch.query;
    state.searchOpen = true;
  }
  if (recordRenderPending) {
    recordRenderPending = false;
    render();
    if (priorSearch?.key) syncSearchPanel(priorSearch.key);
  } else {
    if (priorSearch) syncSearchPanel(priorSearch.key);
    syncRecordWindowChrome();
  }
}

function syncRecordLinkNotice(missing) {
  state.recordLinkMissing = missing;
  const notice = root.querySelector("[data-record-link-notice]");
  if (notice) notice.textContent = missing ? "This record is not available in the archive." : "";
}

function openAddressedRecord(record, noteId, searchKey) {
  const index = noteId ? window.GestaltNoteInline?.noteIndexById?.(record.section === "setup" ? setupNarrativeNotes(record) : noteEntries(record.body), noteId) ?? -1 : -1;
  openRecord(record.id, index >= 0 ? "notes" : "overview", index >= 0 ? index : null, noteId, searchKey);
}

function syncRecordLocation() {
  const links = window.GestaltRecordLinks;
  if (!links || !state.bootDismissed || state.localMemory === "prompt") return;
  const hash = window.location.hash;
  const target = links.target(hash);
  const record = target ? records.find((entry) => entry.id === target.recordId && entry.section !== "system") : null;
  const noteId = target?.noteId ?? null;
  if (record && state.panelOpen && state.selectedId === record.id && state.linkedNoteId === noteId) return;
  if (record || state.panelOpen || state.panelMinimized) recordMotionController?.cancel();
  if (record) openAddressedRecord(record, noteId);
  else {
    if (state.panelOpen || state.panelMinimized) dismissRecordView();
    syncRecordLinkNotice(links.isRecordLink(hash));
  }
}

function minimizeRecord() {
  if (!state.panelOpen || recordMotionController?.busy) return;
  const node = root.querySelector(".record-window");
  const finish = () => {
    window.GestaltMemoryState?.record("record.minimize");
    settleRecordAccessSequence();
    state.panelOpen = false;
    state.panelMinimized = true;
    if (node) {
      node.hidden = true;
      node.classList.add("is-steady");
      minimizedRecordWindow = { id: state.selectedId, node };
    }
    root.querySelector("[data-record-backdrop]")?.remove();
    if (recordRenderPending) { recordRenderPending = false; render(); }
    else syncRecordWindowChrome();
    root.querySelector(".reopen-control")?.focus({ preventScroll: true });
  };
  if (recordMotionController) {
    recordMotionController.minimize({ node, target: root.querySelector(".reopen-control"), enabled: state.entryAccessMode !== "off", onComplete: finish });
  } else finish();
}

function restoreRecord() {
  window.GestaltMemoryState?.record("record.restore");
  const retained = minimizedRecordWindow?.id === state.selectedId ? minimizedRecordWindow.node : null;
  state.panelOpen = true;
  state.panelMinimized = false;
  minimizedRecordWindow = null;
  if (!retained?.isConnected) { render(); return; }
  retained.hidden = false;
  retained.insertAdjacentHTML("beforebegin", recordBackdrop());
  syncRecordWindowChrome();
  retained.querySelector("[data-window-action='minimize']")?.focus({ preventScroll: true });
}

function workspaceWindowTray() {
  return `<div class="workspace-window-tray"><button class="desktop-terminal-restore" type="button" data-desktop-terminal-restore aria-label="Restore terminal" aria-controls="desktop-directory" title="Restore terminal (T)" aria-hidden="true" inert><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 19h8"/><path d="m4 17 6-6-6-6"/></svg></button><button class="reopen-control" type="button" data-window-action="open"${!state.panelOpen && state.panelMinimized ? "" : " hidden"}>Restore active record</button><button class="system-notices-toggle" type="button" data-system-notices-toggle aria-label="System Tips" aria-controls="system-notices" aria-expanded="false" title="System Tips" inert><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg></button></div>`;
}

function desktopDirectory() {
  const now = new Date();
  directoryArchiveDay = now.toISOString().slice(0, 10);
  const filedIds = new Set(partitionFieldLogs(records, now).archived.map((record) => record.id));
  const rows = window.GestaltDesktopNavigation?.directoryRows(records.map((record) => ({ section: record.section, date: activityDate(record), archived: filedIds.has(record.id) }))) || [];
  return `<section class="desktop-nav-terminal" id="desktop-directory" role="dialog" aria-modal="true" aria-labelledby="desktop-directory-title" aria-hidden="true" inert>
    <header class="desktop-terminal-bar"><span id="desktop-directory-title">Eightmouse@Gestalt: ~ <small>v1.87.0</small></span><div class="window-actions"><button type="button" data-window-action="minimize" data-desktop-terminal-minimize aria-label="Minimize terminal">minimize</button><button type="button" data-window-action="maximize" data-desktop-terminal-maximize aria-label="Maximize terminal">maximize</button><button type="button" data-window-action="close" data-desktop-nav-dismiss aria-label="Close terminal">close</button></div></header>
    <div class="desktop-terminal-body"><p class="desktop-terminal-prompt"><span>[Eightmouse@Gestalt ~]$</span> ls -l<span class="desktop-terminal-cursor" aria-hidden="true">_</span></p>
      <div class="desktop-directory-heading"><span>total ${rows.length}</span><span>LAST FILED</span></div>
      <nav aria-label="Directory sections">${rows.map((row) => `<button type="button" data-directory-section data-open-section="${row.id}"${state.activeSection === row.id ? ' aria-current="page"' : ""}><span class="desktop-directory-marker" aria-hidden="true">${state.activeSection === row.id ? ">" : "-"}</span><span>${row.name}</span><time${row.date ? ` datetime="${row.date}"` : ""}>${row.date ? readableDate(row.date) : "--"}</time></button>`).join("")}</nav>
    </div>
  </section><aside class="desktop-terminal-hint" role="status" aria-hidden="true" inert><button type="button" class="desktop-terminal-hint-action" data-system-notices-open aria-controls="system-notices" title="Open System Tips"><span class="terminal-shortcut-line">Press <kbd>T</kbd> to open terminal</span><span>Press <kbd>~</kbd> to open command palette</span><span>Press <kbd>S</kbd> to search the web</span></button></aside><section class="system-notices-panel" id="system-notices" role="region" aria-label="System Tips" aria-hidden="true" tabindex="-1" inert><header><span>// SYSTEM TIPS</span><div class="window-actions"><button type="button" data-window-action="close" data-system-notices-close aria-label="Close System Tips">close</button></div></header><dl><div class="terminal-shortcut-line"><dt><kbd>T</kbd></dt><dd>Open terminal</dd></div><div><dt><kbd>~</kbd></dt><dd>Command palette</dd></div><div><dt><kbd>S</kbd></dt><dd>Web search</dd></div><div><dt><kbd>Esc</kbd></dt><dd>Close the active window</dd></div></dl></section>`;
}

function workspaceHeading() {
  const section = sections.find((entry) => entry.id === state.activeSection) || sections[0];
  const dashboard = state.activeSection === "system";
  const headline = dashboard ? greeting() : section.label;
  const resolving = state.headlineAnimating || !state.bootDismissed;
  return `<div>
    <p class="route-label">// ${escapeHtml(dashboard ? "DASHBOARD" : section.code)}</p>
    <h1 class="headline-decode-text${resolving ? " is-resolving" : ""}" aria-label="${escapeHtml(headline)}"><span>${renderCipherLetters(headline)}</span><span class="cursor headline-cursor${resolving ? " is-delayed" : ""}" aria-hidden="true">_</span></h1>
    <p class="subtle">${dashboard ? dashboardSubtext() : section.id === "games" || section.id === "projects" || section.id === "logs" ? "" : "Browse the records filed under this archive."}</p>
  </div>`;
}

function syncSection() {
  // Rebuild at the next UTC date boundary so archive-aged directory dates stay current.
  if (!state.bootDismissed || recordMotionController?.busy || directoryArchiveDay !== new Date().toISOString().slice(0, 10)) return false;
  const workspace = root.querySelector(".workspace");
  const heading = workspace?.querySelector(".workspace-header")?.firstElementChild;
  const content = workspace?.querySelector(":scope > :is(.dashboard-grid, .section-page)");
  if (!heading || !content) return false;

  const previousFocus = document.activeElement;
  const previousSection = workspace.dataset.pocketSection;
  workspace.dataset.pocketSection = state.activeSection;
  heading.outerHTML = workspaceHeading();
  content.outerHTML = workspaceContent();
  syncInstrumentShelf(previousSection !== state.activeSection);
  removeReadingWindows(workspace);
  const menuToggle = dismissArchiveMenu();

  const sectionIndex = Math.max(0, sections.findIndex((section) => section.id === state.activeSection));
  const navStack = root.querySelector(".nav-stack--sidebar");
  navStack?.classList.remove("is-sliding");
  navStack?.style.setProperty("--active-nav-index", String(sectionIndex));
  for (const button of root.querySelectorAll(".nav-stack--sidebar [data-open-section], [data-directory-section]")) {
    const active = (button.dataset.openSection || "system") === state.activeSection;
    if (active) button.setAttribute("aria-current", "page");
    else button.removeAttribute("aria-current");
    const marker = button.querySelector(".desktop-directory-marker");
    if (marker) marker.textContent = active ? ">" : "-";
    else button.classList.toggle("is-active", active);
  }
  if (menuToggle) menuToggle.querySelector(".archive-menu-code").textContent = sections[sectionIndex].code;
  const restore = workspace.querySelector(".reopen-control");
  if (restore) restore.hidden = true;
  window.clearTimeout(navMotionTimer);
  navMotionTimer = 0;
  state.previousActiveSection = state.activeSection;
  state.headlineAnimating = false;
  state.windowSteady = false;
  syncRoadmapDialog();
  syncWorkspaceFocus();
  syncSearchPanel();
  syncRecordFocus();
  syncMemoryMotion();
  syncMemoryTrace();
  workspace.scrollTop = 0;
  if (window.scrollY) window.scrollTo({ top: 0, behavior: "instant" });
  if (pocket?.isHandheld()) {
    const target = state.activeSection === "system"
      ? `.pocket-directory [data-open-section="${CSS.escape(previousSection || "")}"]`
      : state.activeSection === "games" || state.activeSection === "projects" ? ".pocket-catalog-back" : ".pocket-context button";
    workspace.querySelector(target)?.focus({ preventScroll: true });
  } else if (document.activeElement === document.body && previousFocus && !previousFocus.isConnected) {
    const title = workspace.querySelector(".workspace-header h1");
    title?.setAttribute("tabindex", "-1");
    title?.focus({ preventScroll: true });
  }
  return true;
}

function render() {
  if (recordMotionController?.busy) { recordRenderPending = true; return; }
  const retained = state.panelMinimized && minimizedRecordWindow?.id === state.selectedId ? minimizedRecordWindow.node : null;
  if (!retained) minimizedRecordWindow = null;
  if (!recordsLoaded) {
    root.innerHTML = `<main class="archive-shell archive-shell--unavailable">
      <div class="grain-layer"></div>
      <div class="scanline-layer"></div>
      <section class="static-data-error" aria-live="polite">
        <p>// ARCHIVE ERROR</p>
        <h1>Records unavailable<span class="cursor">_</span></h1>
        <span>Gestalt could not load public/data/records.js. Refresh after publishing the static archive.</span>
      </section>
    </main>`;
    return;
  }

  const record = selectedRecord();

  const hasFocusWindow = state.panelOpen || state.timelineOpen || state.roadmapOpen || state.osBehaviourOpen;

  const markup = `<main class="archive-shell${hasFocusWindow ? " has-record" : ""}${state.bootDismissed ? "" : " is-booting"}${!state.bootDismissed && state.startupMode === "quick" ? " is-quick-boot" : ""}"${state.bootDismissed ? "" : ` inert aria-busy="true" style="--boot-elapsed: -${Math.max(0, performance.now() - bootStartedAt)}ms"`}>
    <button class="desktop-nav-backdrop" data-desktop-nav-dismiss type="button" aria-label="Close archive navigation" tabindex="-1"></button>
    ${desktopDirectory()}
    ${!state.bootDismissed && pocket ? pocket.bootMarkup : ""}
    ${state.bootDismissed ? "" : `<div class="boot-screen" aria-hidden="true">
      <i class="boot-tube"></i>
      <div class="boot-loader">
        <span>GESTALT</span>
        <div class="boot-status headline-decode-text is-resolving" aria-label="System initializing"><span>${renderCipherLetters("System initializing")}</span></div>
        ${state.startupMode === "full" ? `<ol class="boot-readiness">${bootReadinessLines()}</ol>` : ""}
      </div>
      <div class="boot-session">
        <span class="boot-session-label">// SESSION READY</span>
        <img class="boot-session-mark" src="public/images/eightmouse-avatar.png" width="120" height="120" alt="" decoding="async" loading="lazy">
        <span class="boot-session-user">Eightmouse</span>
        <span class="boot-session-detail">Opening the archive</span>
      </div>
    </div><i class="boot-thread" aria-hidden="true"></i>`}
    ${localMemoryPrompt()}
    <div class="grain-layer"></div>
    <div class="scanline-layer"></div>
    ${sidebar()}
    ${archiveNavigationMenu()}
    ${pocketHeader()}
    <section class="${hasFocusWindow ? "workspace has-record" : "workspace"}" data-pocket-section="${state.activeSection}" aria-label="Gestalt archive">
      <p class="record-link-notice" data-record-link-notice role="status">${state.recordLinkMissing ? "This record is not available in the archive." : ""}</p>
      ${pocketIndex()}
      <header class="workspace-header">
        ${workspaceHeading()}
        <div class="time-block" aria-label="Local time">
          <span>◷</span>
          <span data-time-clock>${formatClock()}</span>
          <span class="dot">.</span>
          <span data-time-date>${formatDate()}</span>
          <button class="icon-button ${state.searchOpen ? "is-active" : ""}" type="button" aria-label="Search records" data-search-toggle><span class="search-icon" aria-hidden="true"></span></button>
        </div>
        ${searchPanel()}
      </header>

      ${workspaceContent()}

      <footer class="workspace-footer">
        <p>// FOOTER</p>
        <span>All memories are fragments. We build, thus we are.</span>
        <span>⌁</span>
      </footer>

      ${recordBackdrop()}
      ${recordWindow(record)}
      ${workspaceWindowTray()}
      ${timelineWindow()}
    </section>
  </main>`;

  root.innerHTML = markup;
  syncInstrumentShelf(state.previousActiveSection !== state.activeSection);
  if (retained) root.querySelector(".workspace")?.append(retained);
  if (state.webSearchOpen || state.connectionsOpen) root.querySelector(".archive-shell")?.setAttribute("data-workspace-tool-open", "");
  root.querySelector(".archive-shell")?.toggleAttribute("data-search-open", state.searchOpen);
  syncImageLightbox();
  syncRoadmapDialog();
  syncOsBehaviourDialog();
  syncDesktopNavigation();
  syncTime();
  syncWeather();

  if (state.previousActiveSection !== state.activeSection) {
    window.clearTimeout(navMotionTimer);
    navMotionTimer = window.setTimeout(() => {
      state.previousActiveSection = state.activeSection;
      navMotionTimer = 0;
    }, 520);
  }

  if (!state.bootDismissed) window.GestaltOsBehaviour?.measureBootThread?.(root.querySelector(".archive-shell"));
  if (!state.bootDismissed && !bootCleanup) {
    bootCleanup = pocket?.isHandheld()
      ? pocket.runBoot(root.querySelector(".archive-shell"), completeBoot, { mode: state.pocketBootMode, remember: state.localMemory === "granted" })
      : scheduleBootCompletion(completeBoot, performance.now() - bootStartedAt, state.startupMode);
  }

  if (state.windowSteady) {
    state.windowSteady = false;
  }

  if (state.headlineAnimating) {
    state.headlineAnimating = false;
  }

  syncMemoryMotion();
  syncMemoryTrace();
  syncRecordFocus();
  void initializeSteamDisplay();

  if (state.searchOpen) {
    const input = document.querySelector("[data-search-input]");
    input?.focus();
    input?.setSelectionRange(input.value.length, input.value.length);
  }
}

let bootFinishedAt = null;
function completeBoot() {
  bootFinishedAt = globalThis.performance?.now?.() ?? null;
  state.bootDismissed = true;
  bootCleanup = null;
  const shell = root.querySelector(".archive-shell");
  if (!shell) { render(); return; }
  shell.classList.remove("is-booting", "is-quick-boot");
  shell.inert = false;
  shell.removeAttribute("aria-busy");
  shell.style.removeProperty("--boot-elapsed");
  root.querySelector(".boot-screen")?.remove();
  root.querySelector(".boot-thread")?.remove();
  if (state.localMemory === "granted") window.GestaltOsBehaviour?.saveLastSession?.();
  root.querySelector(".pocket-boot")?.remove();
  const gamePanel = shell.querySelector(".current-game-panel");
  // Keep the plate's animation timeline intact if the snapshot arrives during boot.
  if (gamePanel && steamDisplayReady) gamePanel.outerHTML = currentGamePanel();
  const prompt = root.querySelector(".local-memory-consent");
  if (state.localMemory === "prompt") {
    if (!prompt) shell.insertAdjacentHTML("afterbegin", localMemoryPrompt());
  } else prompt?.remove();
  syncDesktopNavigation();
  syncMemoryTrace();
  syncRecordLocation();
}

function syncDashboardGreeting(date = new Date()) {
  if (document.hidden || !state.bootDismissed || state.activeSection !== "system") return;
  const heading = document.querySelector(".workspace-header h1");
  const text = greeting(date);
  if (!heading || heading.getAttribute("aria-label") === text) return;
  heading.classList.remove("is-resolving");
  heading.setAttribute("aria-label", text);
  heading.innerHTML = `<span>${renderCipherLetters(text)}</span><span class="cursor headline-cursor" aria-hidden="true">_</span>`;
}

function syncTime() {
  if (document.hidden) return;
  window.GestaltAppearance?.sync(document);
  syncSeasonalAccent();
  syncDashboardGreeting();
  const clockTarget = document.querySelector("[data-time-clock]");
  const dateTarget = document.querySelector("[data-time-date]");

  if (clockTarget) {
    clockTarget.textContent = formatClock();
  }

  if (dateTarget) {
    dateTarget.textContent = formatDate();
  }
}

function syncWeather() {
  const module = document.querySelector("[data-weather-module]");

  if (!module) {
    return;
  }

  const temp = module.querySelector("[data-weather-temp]");
  const condition = module.querySelector("[data-weather-condition]");
  const label = module.querySelector("[data-weather-label]");
  const meta = module.querySelector("[data-weather-meta]");
  const note = module.querySelector("[data-weather-note]");
  const action = module.querySelector("[data-weather-action]");

  if (temp) {
    temp.textContent = weatherState.temp;
    temp.setAttribute("data-temp", weatherState.temp);
  }
  if (condition) condition.textContent = weatherState.condition;
  if (label) label.textContent = weatherState.label;
  if (meta) meta.textContent = weatherState.meta;
  if (note) note.textContent = weatherState.note;
  const trace = module.querySelector("[data-weather-trace]");
  if (trace) trace.outerHTML = weatherTraceMarkup();
  if (action) {
    const actionLabel = weatherState.loading ? "Reading sky signal" : "Refresh sky";
    if (!action.querySelector(".weather-action-icon")) {
      action.innerHTML = weatherRefreshIcon();
    }
    action.setAttribute("aria-label", actionLabel);
    action.setAttribute("title", actionLabel);
    action.classList.toggle("is-loading", weatherState.loading);
    action.disabled = weatherState.loading;
  }
}

function revealFocusedNote() {
  const layout = root.querySelector(".record-window .record-layout");
  const logNote = layout?.querySelector(`.log-reading-note[data-note-index="${state.focusedNoteIndex}"]`);
  if (logNote) {
    layout.scrollTop += logNote.getBoundingClientRect().top - layout.getBoundingClientRect().top - 16;
    return;
  }
  const summary = layout?.querySelector(`[data-note-index="${state.focusedNoteIndex}"] > summary`);
  if (!layout || !summary) return;
  const top = layout.getBoundingClientRect().top + layout.clientTop;
  const bounds = summary.getBoundingClientRect();
  if (bounds.bottom > top + layout.clientHeight) layout.scrollTop += bounds.top - top - 16;
}

function syncNotePage(notesPage, paging = currentNotePage(selectedRecord())) {
  const pager = notesPage.querySelector(".note-pager");
  const stack = notesPage.querySelector(".note-stack");
  if (!pager || !stack) return;
  pager.hidden = paging.pages < 2;
  pager.querySelector("span").textContent = `${paging.page + 1} / ${paging.pages}`;
  pager.querySelector('[data-note-page="-1"]').setAttribute("aria-disabled", String(paging.page === 0));
  pager.querySelector('[data-note-page="1"]').setAttribute("aria-disabled", String(paging.page + 1 === paging.pages));
  stack.innerHTML = renderNoteRows(paging);
}

function syncRecordNoteFiles(directory) {
  if (!directory) return;
  const { count, items } = recordNoteDirectory(selectedRecord(), state.noteSearchQuery);
  directory.querySelector(".record-note-file-count").textContent = count;
  directory.querySelector(".record-note-file-grid").innerHTML = items;
}

function stepNotePage(button) {
  const notesPage = button.closest(".notes-page");
  if (!notesPage || button.getAttribute("aria-disabled") === "true") return;
  const direction = Number(button.dataset.notePage);
  if (direction !== -1 && direction !== 1) return;
  const record = selectedRecord();
  const paging = currentNotePage(record);
  const next = paging.page + direction;
  if (next < 0 || next >= paging.pages) return;
  if (state.noteSearchQuery.trim()) state.noteSearchPage = next;
  else state.noteBrowsePage = next;
  syncNotePage(notesPage, currentNotePage(record));
}

function paintNoteFileSearch(button, open) {
  const search = button.closest(".record-note-search");
  const input = search?.querySelector("input");
  if (!input) return null;
  search.toggleAttribute("data-expanded", open);
  button.setAttribute("aria-expanded", String(open));
  button.setAttribute("aria-label", open ? "Close note search" : "Search notes");
  button.innerHTML = noteFileSearchIcon(open);
  if (!open) input.value = "";
  return input;
}

function toggleNoteFileSearch(button, open) {
  if (open && state.activeContent !== "notes") selectRecordContent("notes");
  const input = paintNoteFileSearch(button, open);
  if (!input) return;
  state.noteFileSearchOpen = open;
  if (open) {
    input.focus();
  } else {
    state.noteSearchQuery = "";
    state.noteSearchPage = 0;
    syncRecordNoteFiles(button.closest(".record-layout")?.querySelector(".record-note-files"));
    button.focus({ preventScroll: true });
  }
}

function setUpdateHistory(open) {
  state.updateHistoryOpen = open;
  const recordWindow = document.querySelector(".record-window");
  const button = recordWindow?.querySelector("[data-update-history-toggle]");
  const backdrop = recordWindow?.querySelector(".update-history-backdrop");
  const modal = recordWindow?.querySelector(".update-history-window");

  recordWindow?.classList.toggle("has-index-modal", open);
  button?.setAttribute("aria-expanded", String(open));

  if (backdrop instanceof HTMLElement) {
    backdrop.hidden = !open;
  }

  if (modal instanceof HTMLElement) {
    modal.hidden = !open;
  }
}

function selectRecordContent(key, layout) {
  const record = selectedRecord();
  const contents = record ? getRecordContents(record) : [];
  const available = layout ? pocket?.readingContents?.(record?.section, contents) ?? contents : contents;
  if (!state.panelOpen || !available.some((item) => item.key === key)) return;
  if (usesNoteDirectory(record) && state.activeContent === key) return;
  if (state.activeContent !== key) window.GestaltMemoryState?.record("content.select", { view: key });
  state.activeContent = key;
  state.noteFileOpen = false;
  state.noteFileSearchOpen = false;
  state.noteSearchQuery = "";
  state.focusedNoteIndex = null;
  state.noteBrowsePage = undefined;
  state.noteSearchPage = 0;
  setUpdateHistory(false);

  // Keep the heading and window mounted so the artwork can retract in place.
  layout ??= root.querySelector(".record-window .record-layout");
  const panel = layout?.querySelector(".record-content-view");
  const aside = layout?.querySelector(".record-aside");
  const tabs = layout?.querySelector(".record-view-tabs");
  const heading = layout?.querySelector(".record-heading");
  if (panel && (aside || tabs) && heading) {
    const handheld = pocket?.isHandheld();
    const focusTab = aside?.contains(document.activeElement);
    if (!handheld) layout.scrollTop = 0;
    if (key !== "notes" && heading.classList.contains("has-heading-banner") && !heading.querySelector(".heading-banner-image")) {
      const artwork = recordArtwork(record);
      if (artwork.src) heading.insertAdjacentHTML("afterbegin", renderHeadingImage(record, artwork));
    }
    heading.classList.toggle("is-notes-heading", key === "notes" && !tabs);
    const entry = layout.closest(".record-window");
    const caption = entry?.querySelector(".record-window-caption");
    entry?.classList.toggle("is-notes-view", key === "notes");
    if (caption && record.section !== "logs") caption.textContent = tabs || key === "notes" ? `// ${record.title}` : "// ARCHIVE ENTRY";
    panel.innerHTML = renderRecordContent(record, key, handheld);
    if (aside) aside.innerHTML = recordAsideContent(record, contents, key, handheld);
    if (tabs) {
      tabs.querySelectorAll("[data-content-key]").forEach((tab) => {
        if (tab.dataset.contentKey === key) tab.setAttribute("aria-current", "true");
        else tab.removeAttribute("aria-current");
      });
      if (usesNoteDirectory(record)) {
        const details = layout.querySelector(".record-reading-details");
        if (key !== "overview") details?.remove();
        else if (!details) panel.insertAdjacentHTML("afterend", recordReadingDetails(record));
      }
      const toggle = tabs.querySelector('[data-record-note-search-toggle][aria-expanded="true"]');
      if (toggle) paintNoteFileSearch(toggle, false);
    }
    if (focusTab) aside.querySelector(`[data-content-key="${key}"]`)?.focus({ preventScroll: true });
    const picker = layout.querySelector("[data-record-content-picker]");
    if (picker && picker.value !== key) picker.value = key;
    return;
  }

  state.windowSteady = true;
  if (!syncRecordWindow()) render();
}

async function requestWeather() {
  if (weatherState.loading) {
    return;
  }

  if (typeof fetch !== "function") {
    weatherState.condition = "Signal unavailable";
    weatherState.meta = "This browser cannot read weather";
    weatherState.note = "Weather remains client-side; no location is stored.";
    syncWeather();
    return;
  }

  weatherState.loading = true;
  weatherState.condition = "Reading signal";
  weatherState.meta = "Resolving approximate sky";
  weatherState.note = "No browser permission dialog is required.";
  syncWeather();

  try {
    const location = await resolveWeatherLocation();
    const latitude = location.latitude.toFixed(3);
    const longitude = location.longitude.toFixed(3);
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&hourly=temperature_2m&forecast_hours=12&timezone=auto`;
    const response = await fetch(url);
    const data = await response.json();
    const current = data.current || {};

    weatherState.temp = Number.isFinite(current.temperature_2m) ? `${Math.round(current.temperature_2m)}C` : "--";
    weatherState.condition = weatherCodeLabel(Number(current.weather_code));
    weatherState.meta = `Humidity ${current.relative_humidity_2m ?? "--"}% / Wind ${current.wind_speed_10m ?? "--"} kmh`;
    weatherState.note = `Approximate sky: ${location.label}. Nothing is saved by Gestalt.`;
    weatherState.trace = Array.isArray(data.hourly?.temperature_2m) ? data.hourly.temperature_2m : [];
  } catch {
    weatherState.temp = "--";
    weatherState.condition = "Signal interrupted";
    weatherState.meta = "Weather endpoints did not respond";
    weatherState.note = "Try again later; the archive remains offline-safe.";
  } finally {
    weatherState.loading = false;
    syncWeather();
  }
}

let memoryNode = null;
let recordFocusNode = null;
let recordFocusCleanup = null;
function syncRecordFocus() {
  const node = document.querySelector(".record-window:not([hidden]):not([inert]), .timeline-window, .archive-folder-window");
  if (node === recordFocusNode) return;
  recordFocusCleanup?.();
  recordFocusNode = node;
  recordFocusCleanup = window.GestaltRecordMotion.focusWithin(node);
}
let memoryCleanup = null;
function syncMemoryMotion() {
  const node = document.querySelector("[data-memory-loop]");
  if (node === memoryNode) return;
  memoryCleanup?.();
  memoryNode = node;
  memoryCleanup = window.GestaltAmbientMotion.watchMemory(node);
}

let traceNode = null, traceCleanup = null;
function syncMemoryTrace() {
  const api = window.GestaltMemoryState;
  if (!api) return;
  if (state.bootDismissed && state.localMemory !== "prompt") {
    // Memory State's first lines are the boot itself, with the real time and record count.
    const instant = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    api.record("workspace.boot", { mode: instant ? "instant" : state.startupMode, ms: Math.round(bootFinishedAt ?? globalThis.performance?.now?.() ?? 0), records: records.length });
    api.record("workspace.ready");
  }
  const node = document.querySelector("[data-memory-trace]");
  if (node === traceNode) return;
  traceCleanup?.();
  traceNode = node;
  traceCleanup = node ? api.watchTrace(node) : null;
}

document.addEventListener("click", (event) => {
  const clickTarget = event.target;

  if (!(clickTarget instanceof Element)) {
    return;
  }

  const copyLink = clickTarget.closest("[data-copy-record-link], [data-copy-note-link]");
  if (copyLink instanceof HTMLButtonElement) {
    void window.GestaltRecordLinks?.copyFromControl(copyLink, state.selectedId, copyLink.dataset.copyNoteLink);
    return;
  }

  if (clickTarget.closest("[data-roadmap-close]")) { closeRoadmap(); return; }
  if (clickTarget.closest("[data-roadmap-retry]")) { void refreshPublicRoadmap(); return; }
  if (clickTarget.closest("[data-open-os-behaviour]")) { openOsBehaviour(); return; }
  if (clickTarget.closest("[data-open-connections]")) { openWorkspaceTool("connections"); return; }
  if (clickTarget.closest("[data-open-full-entry]")) { openFullEntry(); return; }
  if (clickTarget.closest("[data-return-note-files]")) { showNoteFile(null); return; }
  const noteSearchToggle = clickTarget.closest("[data-record-note-search-toggle]");
  if (noteSearchToggle) { toggleNoteFileSearch(noteSearchToggle, !state.noteFileSearchOpen); return; }
  const noteFile = clickTarget.closest("[data-note-file-index]");
  if (noteFile) { showNoteFile(Number(noteFile.dataset.noteFileIndex)); return; }

  const lazyNote = clickTarget.closest("details.note-entry[data-note-index]");

  if (lazyNote instanceof HTMLDetailsElement && !lazyNote.open && clickTarget.closest("summary")) {
    window.GestaltMemoryState?.record("note.expand", { index: Number(lazyNote.dataset.noteIndex) + 1 });
  }

  if (lazyNote instanceof HTMLDetailsElement && lazyNote.dataset.noteLoaded !== "true") {
    const noteIndex = Number(lazyNote.dataset.noteIndex);
    const note = noteEntries(selectedRecord().body)[noteIndex];
    const noteBody = lazyNote.querySelector("[data-note-body]");

    if (note && noteBody instanceof HTMLElement) {
      noteBody.innerHTML = `<div class="record-body">${markdownBody(note.body)}</div>`;
      lazyNote.dataset.noteLoaded = "true";
    }
  }

  if (clickTarget.closest("[data-local-memory-allow]")) {
    bootCleanup?.();
    bootCleanup = null;

    try {
      window.localStorage.setItem(localMemoryKey, "granted");
      if (pocket?.isHandheld()) pocket.markBootSeen();
      state.localMemory = "granted";
      state.bootDismissed = true;
    } catch {
      state.localMemory = "session";
      state.bootDismissed = true;
    }

    completeBoot();
    return;
  }

  if (clickTarget.closest("[data-local-memory-session]")) {
    bootCleanup?.();
    bootCleanup = null;

    state.localMemory = "session";
    state.bootDismissed = true;
    completeBoot();
    return;
  }

  if (
    state.searchOpen &&
    !clickTarget.closest(".search-panel") &&
    !clickTarget.closest("[data-directory-section]") &&
    !clickTarget.closest("[data-search-toggle]") &&
    !clickTarget.closest(".pocket-brand") &&
    !clickTarget.closest(".archive-nav-search")
  ) {
    state.searchOpen = false;
    state.searchQuery = "";
    syncSearchPanel();
    return;
  }

  if (
    state.updateHistoryOpen &&
    !clickTarget.closest(".update-history-window") &&
    !clickTarget.closest("[data-update-history-toggle]")
  ) {
    setUpdateHistory(false);
    return;
  }

  const target = clickTarget.closest("button");

  if (!target) {
    if (state.panelOpen && !clickTarget.closest(".record-window")) {
      minimizeRecord();
    }

    return;
  }

  const recordId = target.dataset.openRecord;
  const openContent = target.dataset.openContent;
  const sectionId = target.dataset.openSection;
  const contentKey = target.dataset.contentKey;
  const windowAction = target.dataset.windowAction;

  if (target.dataset.notePage !== undefined) {
    stepNotePage(target);
    return;
  }

  if (target.dataset.selectorGroup !== undefined || target.dataset.selectorPage !== undefined || target.dataset.projectSpine !== undefined) {
    syncRecordSelector(target);
    return;
  }
  if (target.dataset.fieldPeek !== undefined || target.dataset.fieldStep !== undefined) {
    selectFieldPaper(target);
    return;
  }
  if (target.dataset.shelfSearchToggle !== undefined) {
    syncGameShelf({ search: !state.gameShelfSearch });
    return;
  }
  if (target.dataset.pocketShelf !== undefined) {
    syncGameShelf({ pick: Number(target.dataset.pocketShelf) });
    return;
  }

  if (target.dataset.home !== undefined) {
    openHome();
    return;
  }

  if (target.dataset.openTimeline !== undefined) {
    openTimeline();
    return;
  }

  if (target.dataset.openRoadmap !== undefined) { openRoadmap(); return; }

  if (target.dataset.timelineClose !== undefined) {
    closeTimeline();
    return;
  }

  if (target.dataset.closeArchiveFolder !== undefined) {
    closeArchiveFolder();
    return;
  }

  if (target.dataset.openArchiveFolder) {
    openArchiveFolder(target.dataset.openArchiveFolder);
    return;
  }

  if (target.dataset.recordBackdrop !== undefined) {
    minimizeRecord();
    return;
  }

  if (target.dataset.expandImage) {
    state.expandedImage = {
      src: target.dataset.expandImage,
      alt: target.dataset.expandAlt || ""
    };
    syncImageLightbox();
    return;
  }

  if (target.dataset.closeExpandedImage !== undefined) {
    state.expandedImage = null;
    syncImageLightbox();
    return;
  }

  if (target.dataset.updateHistoryToggle !== undefined) {
    setUpdateHistory(!state.updateHistoryOpen);
    return;
  }

  if (target.dataset.updateHistoryBackdrop !== undefined) {
    setUpdateHistory(false);
    return;
  }

  if (target.dataset.weatherAction !== undefined) {
    requestWeather();
    return;
  }

  if (target.dataset.searchToggle !== undefined) {
    const hadNavigation = state.navOpen;
    state.searchOpen = !state.searchOpen;
    state.navOpen = false;
    if (hadNavigation) render();
    else syncSearchPanel();
    return;
  }

  if (target.dataset.navToggle !== undefined) {
    state.navOpen = !state.navOpen;
    if (state.navOpen) {
      state.searchOpen = false;
      state.searchQuery = "";
    }
    render();
    return;
  }

  if (target.dataset.navBackdrop !== undefined) {
    state.navOpen = false;
    render();
    return;
  }

  if (recordId) {
    if (target.classList.contains("project-workbench-hit") && window.GestaltSectionMotion) {
      window.GestaltSectionMotion.openProjectPlate(target, () => openRecord(recordId));
      return;
    }
    if (target.hasAttribute("data-game-sleeve") && window.GestaltSectionMotion) {
      window.GestaltSectionMotion.openInstrumentSleeve(target, () => openRecord(recordId), event.detail > 0);
      return;
    }
    if (target.closest(".pocket-dispatches, .record-selector")) target.focus({ preventScroll: true });
    if (target.hasAttribute("data-open-note-reader")) {
      target.focus({ preventScroll: true });
      openDashboardNote(recordId, Number(target.dataset.openNoteIndex));
      return;
    }
    const searchKey = target.dataset.searchResult;
    if (target.dataset.openNoteId) {
      const record = records.find((entry) => entry.id === recordId);
      if (record) openAddressedRecord(record, target.dataset.openNoteId, searchKey);
      return;
    }
    const noteTarget = target.dataset.openNoteIndex === undefined ? null : Number(target.dataset.openNoteIndex);
    openRecord(recordId, openContent || "overview", noteTarget, null, searchKey);
    return;
  }

  if (sectionId) {
    if (target.hasAttribute("data-directory-section") && sectionId === state.activeSection && state.searchOpen) {
      state.searchOpen = false;
      state.searchQuery = "";
      render();
      return;
    }
    openSection(sectionId);
    return;
  }

  if (contentKey) {
    selectRecordContent(contentKey);
    return;
  }

  if (windowAction === "open") {
    restoreRecord();
  }

  if (windowAction === "minimize") {
    minimizeRecord();
  }

  if (windowAction === "close") {
    closeRecord();
  }

  if (windowAction === "maximize") {
    state.panelMaximized = !state.panelMaximized;
    window.GestaltMemoryState?.record("record.resize", { state: state.panelMaximized ? "maximized" : "normal" });
    const node = root.querySelector(".record-window");
    node?.classList.toggle("is-maximized", state.panelMaximized);
    const name = node?.classList.contains("is-setup-record") ? "setup terminal" : "record";
    target.setAttribute("aria-label", `${state.panelMaximized ? "Restore" : "Maximize"} ${name}`);
    target.textContent = state.panelMaximized ? "restore" : "maximize";
  }

  if (state.panelOpen && !recordId && !sectionId && !contentKey && !windowAction && !clickTarget.closest(".record-window")) {
    minimizeRecord();
  }
});

document.addEventListener("change", (event) => {
  const picker = event.target;
  if (picker instanceof HTMLSelectElement && picker.hasAttribute("data-record-content-picker") && pocket?.isHandheld()) {
    selectRecordContent(picker.value, picker.closest(".record-layout"));
  }
});

document.addEventListener("input", (event) => {
  const target = event.target;

  if (!(target instanceof HTMLInputElement)) {
    return;
  }

  if (target.id === "game-shelf-search") {
    syncGameShelf({ query: target.value });
    return;
  }

  if (target.dataset.searchInput !== undefined) {
    state.searchQuery = target.value;
    syncSearchPanel();
  }

  if (target.dataset.mobileNavSearchInput !== undefined) {
    state.searchQuery = target.value;
    state.searchOpen = target.value.trim().length > 0;
    if (state.searchOpen) state.navOpen = false;
    render();
  }

  if (target.dataset.noteSearchInput !== undefined) {
    const changed = target.value.trim().toLowerCase() !== state.noteSearchQuery.trim().toLowerCase();
    state.noteSearchQuery = target.value;
    if (!changed) return;
    if (target.id === "record-note-search-input") {
      syncRecordNoteFiles(target.closest(".record-layout")?.querySelector(".record-note-files"));
      return;
    }
    state.noteSearchPage = 0;
    const notesPage = document.querySelector(".notes-page");

    if (notesPage instanceof HTMLElement) {
      syncNotePage(notesPage);
    }
  }
});

document.addEventListener("keydown", (event) => {
  if (!state.bootDismissed || state.localMemory === "prompt") return;
  if (String(event.key).toLowerCase() === "s" && window.GestaltWorkspaceTools?.shouldOpenSearch(event, { ready: true, busy: state.panelOpen || state.searchOpen || state.timelineOpen || state.roadmapOpen || state.osBehaviourOpen || state.webSearchOpen || state.connectionsOpen || state.navOpen || Boolean(state.expandedImage) || Boolean(state.archiveFolderWindow) }, document)) {
    event.preventDefault();
    event.stopPropagation();
    openWebSearch();
    return;
  }
  if (event.repeat || event.isComposing) return;
  const target = event.target;
  const isInputTarget = target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || (target instanceof HTMLElement && (target.isContentEditable || Boolean(target.closest('select, [role="textbox"]'))));
  const isPaletteInput = target instanceof HTMLInputElement && target.id === "archive-search";
  if (event.key === "Escape" && target instanceof HTMLInputElement && target.id === "game-shelf-search") {
    event.preventDefault();
    event.stopPropagation();
    syncGameShelf({ search: false });
    return;
  }

  if (event.key === "Enter" && isPaletteInput && target.value.trim() && !event.defaultPrevented && !event.metaKey && !event.ctrlKey && !event.altKey) {
    const firstResult = target.closest(".command-panel")?.querySelector(".search-suggestions button");
    if (firstResult) {
      event.preventDefault();
      firstResult.click();
      return;
    }
  }

  if (
    (event.key === "~" || event.key === "`") &&
    (!isInputTarget || isPaletteInput) &&
    !event.metaKey &&
    !event.ctrlKey &&
    !event.altKey
  ) {
    event.preventDefault();
    const hadNavigation = state.navOpen;
    state.navOpen = false;
    state.searchOpen = !state.searchOpen;
    if (!state.searchOpen) {
      state.searchQuery = "";
    }
    if (hadNavigation) render();
    else syncSearchPanel();
    return;
  }

  if (event.key !== "Escape" || event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey) {
    return;
  }

  if (state.searchOpen) {
    event.preventDefault();
    event.stopPropagation();
    state.searchOpen = false;
    state.searchQuery = "";
    syncSearchPanel();
    return;
  }

  if (state.expandedImage) {
    state.expandedImage = null;
    syncImageLightbox();
    return;
  }

  if (state.timelineOpen) {
    event.preventDefault();
    event.stopPropagation();
    closeTimeline();
    return;
  }

  if (state.archiveFolderWindow) {
    event.preventDefault();
    event.stopPropagation();
    closeArchiveFolder();
    return;
  }

  if (state.navOpen) {
    state.navOpen = false;
    render();
    return;
  }

  if (state.updateHistoryOpen) {
    event.preventDefault();
    setUpdateHistory(false);
    return;
  }

  if (state.panelOpen && state.noteFileSearchOpen && !state.noteFileOpen) {
    const button = root.querySelector("[data-record-note-search-toggle]");
    if (button) {
      event.preventDefault();
      event.stopPropagation();
      toggleNoteFileSearch(button, false);
      return;
    }
  }

  if (state.noteSearchQuery && !state.noteFileOpen && !state.dashboardNoteReader) {
    event.preventDefault();
    const notesPage = document.querySelector(".notes-page");
    const input = document.querySelector("[data-note-search-input]");

    state.noteSearchQuery = "";
    state.noteSearchPage = 0;
    if (notesPage instanceof HTMLElement) syncNotePage(notesPage);

    if (input instanceof HTMLInputElement) {
      input.value = "";
    }

    return;
  }

  if (state.panelOpen && !event.shiftKey) {
    event.preventDefault();
    event.stopPropagation();
    closeRecord();
  }
});

document.addEventListener("error", (event) => {
  const image = event.target;
  if (image instanceof HTMLImageElement && image.matches(".banner-frame--steam img[data-steam-cover], .heading-banner-image[data-steam-cover]") && !image.dataset.coverFallback) {
    image.dataset.coverFallback = "true";
    image.src = image.dataset.steamCover;
    return;
  }
  if (image instanceof HTMLImageElement && image.matches(".current-game img") && !image.dataset.coverFallback) {
    image.dataset.coverFallback = "true";
    image.src = "public/images/archive-backdrop.webp";
  }
}, true);

document.addEventListener("visibilitychange", () => {
  syncSeasonalMotion();
  if (!document.hidden) syncTime();
});

document.addEventListener("change", (event) => {
  const input = event.target;
  if (input instanceof HTMLSelectElement && input.matches("[data-timeline-source]")) {
    changeTimelineSource(input.value);
    return;
  }
});

window.matchMedia("(prefers-reduced-motion: reduce)").addEventListener("change", (event) => {
  if (event.matches) settleRecordAccessSequence();
});

registerMediaCacheWorker();
window.addEventListener("popstate", syncRecordLocation);
render();
let weatherStarted = !pocket?.isHandheld();
if (weatherStarted) void requestWeather();
window.matchMedia("(max-width: 760px)").addEventListener("change", (event) => {
  const dispatches = root.querySelector(".pocket-dispatches");
  if (dispatches && event.matches) dispatches.innerHTML = pocketDispatchesMarkup();
  if (event.matches && state.panelOpen && state.activeContent === "overview" && selectedRecord()?.section === "logs") {
    selectRecordContent("notes", root.querySelector(".record-window .record-layout"));
  }
  for (const tools of root.querySelectorAll(".record-window :is(.note-entry, .setup-note) > .note-link-tools")) {
    const note = tools.parentElement;
    if (event.matches) note.append(tools);
    else note.firstElementChild?.after(tools);
  }
  const noteSearch = root.querySelector(".record-window .note-search-panel");
  if (noteSearch && !noteSearch.closest(".record-note-files")) {
    const record = noteSearch.closest(".record-window");
    if (event.matches) record.querySelector(".notes-page-header")?.after(noteSearch);
    else record.querySelector(".record-aside")?.append(noteSearch);
  }
  if (state.activeSection === "system") {
    const grid = root.querySelector(".workspace > .dashboard-grid");
    if (grid) grid.outerHTML = workspaceContent();
    syncWeather();
    syncMemoryMotion();
    syncMemoryTrace();
  } else if (state.activeSection === "games") {
    const dock = root.querySelector(".section-page--games .game-search-dock");
    const view = gameShelfView(splitSectionRecords("games", recordsFor("games").sort(compareSectionRecords)));
    if (dock) {
      if (!view.searchable && state.gameShelfSearch) syncGameShelf({ search: false });
      dock.hidden = !view.searchable;
    }
  }
  if (!event.matches && !weatherStarted) { weatherStarted = true; void requestWeather(); }
});
window.setInterval(syncTime, 30_000);
