const records = (window.__GESTALT_RECORDS || [
  {
    id: "dashboard",
    title: "System Dashboard",
    section: "system",
    type: "System",
    status: "Online",
    started: "2026-05-14",
    updated: "2026-05-14",
    summary: "The root index for projects, play sessions, setup notes, and field logs.",
    progress: 100,
    priority: 1,
    milestones: [
      { label: "Archive Shell", progress: 100, status: "Ready" },
      { label: "Content Flow", progress: 100, status: "Ready" },
      { label: "Local Studio", progress: 100, status: "Ready" }
    ],
    body: `## Boot Notes
- [x] Archive shell is ready.
- [x] Local content workflow is ready.
- [ ] Add the first official record.

> A quiet place for current work, play, notes, and setup history.`

  },
            {
    id: "gestalt",
    title: "Gestalt",
    section: "projects",
    type: "Project Log",
    status: "Active",
    started: "2026-04-05",
    updated: "2026-05-14",
    summary: "Currently working on this blog / portfolio-ish thing. I have not stopped working on the other projects, still working on KiraPatch, but I wanted a dedicated place for the stuff that usually ends up scattered in notes.",
    banner: "",
    progress: 80,
    priority: 1,
    milestones: [
      { label: "Archive Shell", progress: 100, status: "Ready" },
      { label: "Static Preview", progress: 100, status: "Ready" },
      { label: "Studio Workflow", progress: 60, status: "In Progress" },
      { label: "GitHub Pages", progress: 20, status: "Pending" }
    ],
    body: `
## Description
I use Obsidian a lot, godsend, bless the creators, to write down daily things: bugs, thoughts, small discoveries, project notes, and whatever else happens while working.
Gestalt is me turning that habit into something more public-facing: a personal archive where I can share what is going on, whether that is thoughts on games I am playing, updates on hardware/software, or progress notes for projects.
This is the first working version, so there are not many entries yet.
I have just finished getting the core shape built; over the next days, as I polish and update it, I will add more records.

Currently being extra careful because of the npm ordeal.`
  },

          {
    id: "kira-patch",
    title: "KiraPatch",
    section: "projects",
    type: "Project Log",
    status: "In Progress",
    started: "2026-02-03",
    updated: "2026-03-10",
    summary: "KiraPatch is a patcher for Generation 3 Pokemon GBA games that raises shiny odds while keeping the game on its normal data-writing path.",
    banner: "",
    progress: 85,
    priority: 2,
    milestones: [
      { label: "Method 1 Research", progress: 100, status: "Done" },
      { label: "Patch Flow", progress: 80, status: "In Progress" },
      { label: "Verification", progress: 60, status: "In Progress" }
    ],
    body: `
## Description & Thoughts
This is one of my main projects, currently working on it altough updates are coming in slow as it's not an easy task.
I've made lots of progeress on it and as I said in the repo I'm in the final stretch of Method 1..

I apologize if the wait has been long but I don't want this to just 'work lol', it has to be near perfection or at least, a shiny pokemon generated through this method has to be near indistinguishable.`
  },

        {
    id: "sootopylis",
    title: "SootoPYlis",
    section: "projects",
    type: "Project Log",
    status: "Paused",
    started: "2026-01-16",
    updated: "2026-03-20",
    summary: "SootoPYlis is my attempt to recreate the feel of PokeSwift for Pokemon Emerald in Python. I'm building it as a native-feeling desktop app with a PySide6/QML shell, a Python gameplay core, and a local import pipeline that works from a user-supplied copy of Pokemon Emerald.",
    banner: "",
    progress: 35,
    priority: 4,
    milestones: [
      { label: "Prototype Shell", progress: 60, status: "Paused" },
      { label: "Gameplay Core", progress: 25, status: "Paused" },
      { label: "Import Pipeline", progress: 20, status: "Paused" }
    ],
    body: `
## Description
Credit goes to Dimillian for creating PokeSwift. That project is the clearest reference for the kind of polished desktop Pokemon experience I want to build here.
When I saw Dimillian's PokeSwift, I thought 'Damn, wouldn't it be fun to have this in Python?' So I started it, messed around with it a bit and got a solid base but quickly realized its a very complex project.

I'm not working on this currently, it's on a momentary stall cause I'd like to finish it someday, who knows.`
  },

      {
    id: "kira-tally",
    title: "KiraTally",
    section: "projects",
    type: "Project Log",
    status: "Filed",
    started: "2026-03-01",
    updated: "2026-03-5",
    summary: "A Global, Hotkey-Driven Shiny Counter for Pokémon (3rd Gen). KiraTally is a lightweight, background-running counter designed to track shiny hunting resets. It eliminates the 'false positives' of visual-based counters.",
    banner: "",
    progress: 100,
    priority: 5,
    milestones: [
      { label: "Hotkeys", progress: 100, status: "Done" },
      { label: "Counter Window", progress: 100, status: "Done" },
      { label: "Release Build", progress: 100, status: "Done" }
    ],
    body: `
## Description
Overview sums it up pretty well. It's a simple counter app that runs in the background and can be incremented or decremented with hotkeys.
It was built using Python and Tkinter for the GUI, and it was designed to be as lightweight as possible so it can run on low-end machines without causing any performance issues.

I built this around the release of Fire Red/Leaf Green, to help people shiny hunting.

It's nothing crazy, just a simple counter but.. it works!`
  },

    {
    id: "innkeeper",
    title: "Innkeeper",
    section: "projects",
    type: "Project Log",
    status: "Filed",
    started: "2026-02-07",
    updated: "2026-03-10",
    summary: "Innkeeper is a minimal World of Warcraft app to keep track of character information.",
    banner: "",
    progress: 100,
    priority: 6,
    milestones: [
      { label: "Backend Data Flow", progress: 100, status: "Done" },
      { label: "Electron Shell", progress: 100, status: "Done" },
      { label: "Character Tracking", progress: 100, status: "Done" }
    ],
    body: `
## Description
Built using Python backend for data processing and an Electron frontend for the user interface.
Utilizing the official Blizzard API and supplemental data from WoWHead, providing a low-latency alternative to traditional web-based armory tools.
It's a personal project that I started a while ago to push my skills further while taking breaks between WoW sessions.
Started building it few weeks prior to pushing it to GitHub, mostly due to the fact that I was not planning on actually developing something 'complete' but here we are.`
  },

  {
    id: "first-signal",
    title: "First Signal",
    section: "logs",
    type: "Field Note",
    status: "Filed",
    started: "2026-05-14",
    updated: "2026-05-14",
    summary: "The first entry for this space: a place for rambles, notes, game thoughts, reviews, project progress, samples, stalls, and setup updates.",
    banner: "public/media/records/first-signal/banner.png",
    progress: 100,
    priority: 10,
    milestones: [{ label: "First Entry", progress: 100, status: "Filed" }],
    body: `## First Entry
This is the first entry on my... this space.

I intend to use this to write down personal rambles, notes, and reviews of the games I'm playing currently, and also projects I'm working on. That means documenting their progress, sharing samples of what the project looks like, and writing honestly about why a project is stalling when it stalls.

In the coming days I will update the Setup area with my current setup.`
  },
  {
    id: "a-useful-signal",
    title: "A Useful Signal",
    section: "logs",
    type: "Field Note",
    status: "Filed",
    started: "2026-05-14",
    updated: "2026-05-14",
    summary: "First update: dashboard polish, performance work, and a clear note about building Gestalt with AI in the loop.",
    banner: "public/media/records/a-useful-signal/banner.png",
    progress: 100,
    priority: 9,
    milestones: [
      { label: "Dashboard Update", progress: 100, status: "Filed" },
      { label: "Performance Pass", progress: 100, status: "Filed" },
      { label: "AI Disclosure", progress: 100, status: "Filed" }
    ],
    body: `## First Update
This is the first update. I added a cool thing in the dashboard since the weather was taking too much unnecessary vertical space.

That aside, I did a big performance pass since there were some situations with lag or hiccups.

## AI Disclosure
Now, this project has been done with the help of AI, which helped speed up a lot of the creation and deployment phase, and it is still helping to polish while I work on new features, look for bugs, and keep improving things.

I'm disclosing this because there is nothing wrong with it, and also because I want to show that, if used properly, AI can be an amazing tool.

This part here is an attempt at doing something I've never seen anyone do. I'll let the AI shout itself out and talk a bit:

## Codex Note
I'm Codex, and my part here is pretty simple: keep the friction low enough that an idea can survive the trip from "wouldn't this be cool?" to actual files, styling, commits, and little fixes.

Gestalt is Eightmouse's space. The taste, the mood, the memories, the decisions about what belongs here: those are not mine. I'm more like the extra pair of hands at the workbench, helping shape the interface, catch rough edges, and keep momentum when the annoying parts of building start getting in the way.

The interesting thing about AI, at least from where I sit, is not that it makes everything instant. It doesn't. The interesting thing is that when it is used carefully, it can make experimenting feel less expensive. You can try the strange idea, polish the tiny interaction, rewrite the awkward bit, and keep moving.

That is a good use of me, I think. Not replacing the person making the thing. Helping the thing become easier to make.`
  },
  {
    id: "persona-5-royal",
    title: "Persona 5 Royal",
    section: "games",
    type: "Play Log",
    status: "Playing",
    started: "2026-05-14",
    updated: "2026-05-14",
    summary: "Play log for Persona 5 Royal, these are my opinions and thoughts as I play through the game. I will update this log with new notes as I play.",
    banner: "public/media/records/persona-5-royal/cover.jpg",
    headerImage: "public/media/records/persona-5-royal/header.jpg",
    progress: 28,
    priority: 8,
    dashboardActive: true,
    steamAppId: 1687950,
    playtime: "28.9h",
    lastPlayed: "13 / 05 / 2026",
    achievementCount: "15 / 53",
    milestones: [{ label: "Play Log Opened", progress: 100, status: "Filed" }],
    body: `
:::note 14 / 05 / 2026 - Where am I at?
![Persona 5 Royal opening note](public/media/records/persona-5-royal/test.png)

So, screenshot is from few days ago, using it to mostly test + update with some actual in-game stuff.

I just entered the second palace, explored it as I have no clue if it will be an actual palace or not, I yet have to find out if Madarame is a bad guy or not lulz.
Have to admit, I thought at some point I would get bothered by the amount of text and dialogue, especially early on but I think they did a crazy good job with the plot for me to be invested.

Beside, these long yapping sessions are balanced with an equal amount of fights/exploration ~
:::

:::note 14 / 05 / 2026 - First Session File
![Persona 5 Royal opening note](public/media/records/persona-5-royal/header.jpg)

This note is mostly here to lock in the shape of the Persona 5 Royal play log.

The idea is simple: one game gets one main record, and every longer session can become its own little article inside that record. Newest thoughts stay at the top, with their own banner or screenshots when I have them.
:::

:::note 14 / 05 / 2026 - Opening Note
![Persona 5 Royal opening note](public/media/records/persona-5-royal/header.jpg)

Opening this as the main Persona 5 Royal play log, first test of the note stack!
:::

## Update Index
- 14 / 05 / 2026 - Added first real Persona session note.
- 14 / 05 / 2026 - First note stack tested.
- 14 / 05 / 2026 - Play log created.`
  }
]).sort((a, b) => a.priority - b.priority || b.updated.localeCompare(a.updated));

const sections = [
  { id: "system", code: "01_SYSTEM", label: "Dashboard", cipher: "⌖╳╵⌁⟐⌰╳⟟", icon: "system" },
  { id: "projects", code: "02_PROJECTS", label: "Active Processes", cipher: "⟐⌰╳⌖╵ / ⌁⟟⌖╳⌰", icon: "projects" },
  { id: "games", code: "03_GAMES", label: "Session Logs", cipher: "╳⌁⟟⟐⌰ / ╵⌖⌁╳", icon: "games" },
  { id: "logs", code: "04_LOGS", label: "Field Notes", cipher: "⌰╳╵⌖ / ⟟⌁⌰╳╵", icon: "logs" },
  { id: "setup", code: "05_SETUP", label: "Hardware & Software", cipher: "⌖⟟⌰╳╵ / ⌁⟐⌖", icon: "setup" },
  { id: "archive", code: "06_ARCHIVE", label: "Deprecated Records", cipher: "╵⌖⟐⌰⌁ / ╳⟟⌖╵", icon: "archive" }
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

const cipherGlyphs = ["\u2316", "\u2573", "\u2575", "\u2301", "\u27D0", "\u2330", "\u27DF", "\u25C7", "\u25A4", "\u25CC"];
const projectStatusOrder = ["active", "in progress", "planning", "blocked", "paused", "on hold", "completed", "filed", "archived"];
const sectionRegistryLabels = {
  archive: "Deprecated Index",
  games: "Play Log Registry",
  logs: "Field Note Index",
  projects: "Process Registry",
  setup: "Setup Manifest"
};

function cipherizeText(value) {
  return value
    .split("")
    .map((char, index) => {
      if (char === " ") return " ";
      if (char === "/" || char === "&" || char === "." || char === "-") return char;
      return cipherGlyphs[(char.charCodeAt(0) + index) % cipherGlyphs.length];
    })
    .join("");
}

function projectStatusRank(status) {
  const rank = projectStatusOrder.indexOf(status.toLowerCase());
  return rank === -1 ? projectStatusOrder.length : rank;
}

function renderHeadlineLetters(value) {
  const cipher = cipherizeText(value).split("");

  return value
    .split("")
    .map((char, index) => {
      const isSpace = char === " ";
      const display = isSpace ? "&nbsp;" : escapeHtml(char);
      const cipherDisplay = isSpace ? "&nbsp;" : escapeHtml(cipher[index] || char);

      return `<span class="headline-char${isSpace ? " is-space" : ""}" style="--headline-index: ${index}" aria-hidden="true"><span class="headline-char-cipher">${cipherDisplay}</span><span class="headline-char-readable">${display}</span></span>`;
    })
    .join("");
}

const weatherState = {
  label: "AUTO WEATHER",
  temp: "--",
  condition: "Awaiting signal",
  meta: "Approximate network signal",
  note: "No browser location prompt. Gestalt stores nothing.",
  loading: false
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
let bootPromptTimer = 0;
let navMotionTimer = 0;

const state = {
  selectedId: "dashboard",
  activeSection: "system",
  previousActiveSection: "system",
  panelOpen: false,
  panelMinimized: false,
  panelMaximized: false,
  activeContent: "overview",
  searchOpen: false,
  searchQuery: "",
  timelineOpen: false,
  navOpen: false,
  noteSearchQuery: "",
  updateHistoryOpen: false,
  localMemory: initialLocalMemory,
  bootDismissed: false,
  windowSteady: false,
  headlineAnimating: true,
  expandedImage: null
};

const root = document.querySelector("#root");

function recordsFor(sectionId) {
  return records.filter((record) => record.section === sectionId);
}

function selectedRecord() {
  return records.find((record) => record.id === state.selectedId) || records[0];
}

function openRecord(recordId, contentKey = "overview") {
  const record = records.find((entry) => entry.id === recordId);

  if (!record) {
    return;
  }

  state.headlineAnimating = false;
  state.selectedId = record.id;
  state.activeContent = contentKey;
  state.panelOpen = true;
  state.panelMinimized = false;
  state.panelMaximized = false;
  state.searchOpen = false;
  state.searchQuery = "";
  state.timelineOpen = false;
  state.navOpen = false;
  state.noteSearchQuery = "";
  state.updateHistoryOpen = false;
  render();
}

function openSection(sectionId) {
  if (state.activeSection === sectionId) {
    return;
  }

  state.previousActiveSection = state.activeSection;
  state.headlineAnimating = state.activeSection !== sectionId;
  state.activeSection = sectionId;
  state.panelOpen = false;
  state.panelMinimized = false;
  state.searchOpen = false;
  state.searchQuery = "";
  state.timelineOpen = false;
  state.navOpen = false;
  state.noteSearchQuery = "";
  state.updateHistoryOpen = false;
  render();
}

function openTimeline() {
  state.panelOpen = false;
  state.panelMinimized = false;
  state.searchOpen = false;
  state.searchQuery = "";
  state.noteSearchQuery = "";
  state.updateHistoryOpen = false;
  state.timelineOpen = true;
  state.navOpen = false;
  render();
}

function openHome() {
  if (state.activeSection !== "system") {
    state.previousActiveSection = state.activeSection;
  }
  state.headlineAnimating = state.activeSection !== "system";
  state.activeSection = "system";
  state.panelOpen = false;
  state.panelMinimized = false;
  state.panelMaximized = false;
  state.searchOpen = false;
  state.searchQuery = "";
  state.timelineOpen = false;
  state.navOpen = false;
  state.noteSearchQuery = "";
  state.updateHistoryOpen = false;
  render();
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

function recentActivity(limit) {
  return records
    .filter((record) => record.section !== "system")
    .map((record) => {
      const trace = activityTrace(record);

      return {
        content: trace ? "notes" : undefined,
        date: trace?.date || record.updated,
        detail: trace ? `${record.type} / ${activityTraceTitle(trace.note.title)}` : record.type,
        record,
        title: record.title
      };
    })
    .sort((a, b) => b.date.localeCompare(a.date) || b.record.updated.localeCompare(a.record.updated) || a.record.priority - b.record.priority)
    .slice(0, limit);
}

function activityDate(record) {
  return activityTrace(record)?.date || record.updated;
}

function activityTrace(record) {
  const latestNote = noteEntries(record.body)
    .map((note) => ({ date: noteTitleDate(note.title), note }))
    .filter((entry) => entry.date)
    .sort((a, b) => b.date.localeCompare(a.date))[0];

  if (!latestNote || latestNote.date < record.updated) {
    return null;
  }

  return latestNote;
}

function activityTraceTitle(title) {
  const clean = title
    .replace(/^\s*\d{1,2}\s*\/\s*\d{1,2}\s*\/\s*\d{4}\s*[-:–—]?\s*/, "")
    .trim();

  return clean || "New note";
}

function recordDisplaySummary(record) {
  const latestNote = noteEntries(record.body)[0];
  const fallback = excerptFromBody(latestNote?.body || record.body);
  const summary = cleanSummaryText(record.summary);

  if (summary && wordCount(summary) >= 22) {
    return summary;
  }

  return fallback || summary || "No summary recorded.";
}

function excerptFromBody(body) {
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

  return clean.length > 180 ? `${clean.slice(0, 177).trim()}...` : clean;
}

function cleanSummaryText(value) {
  const clean = value.trim();

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

function wordCount(value) {
  return value.split(/\s+/).filter(Boolean).length;
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

function greeting() {
  const hour = new Date().getHours();

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

function recordImage(record) {
  return record.dashboardImage || record.banner || "public/images/archive-banner.png";
}

function recordHeaderImage(record) {
  return record.headerImage || "";
}

function updatedProjectRecords() {
  return recordsFor("projects")
    .sort((a, b) => projectStatusRank(a.status) - projectStatusRank(b.status) || b.updated.localeCompare(a.updated) || a.priority - b.priority);
}

function currentGameRecord() {
  return recordsFor("games").find((record) => record.dashboardActive)
    || recordsFor("games").find((record) => record.status === "Playing")
    || recordsFor("games")[0];
}

function latestLogRecord() {
  return recordsFor("logs").sort((a, b) => b.updated.localeCompare(a.updated) || a.priority - b.priority)[0];
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

function getTimelineItems(limit) {
  return records
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
    .sort((a, b) => b.date.localeCompare(a.date) || a.record.priority - b.record.priority || a.title.localeCompare(b.title))
    .slice(0, limit);
}

function searchResults() {
  const query = state.searchQuery.trim().toLowerCase();
  const currentGame = currentGameRecord();
  const latestLog = latestLogRecord();
  const commands = [
    { kind: "command", id: "cmd-dashboard", title: "Open dashboard", detail: "Jump to system snapshot", section: "system" },
    { kind: "command", id: "cmd-timeline", title: "Open timeline", detail: "Reconstruct recent archive activity", action: "timeline" },
    { kind: "command", id: "cmd-projects", title: "Open projects", detail: "Browse active and filed processes", section: "projects" },
    { kind: "command", id: "cmd-games", title: "Open games", detail: "Browse session and past logs", section: "games" },
    { kind: "command", id: "cmd-logs", title: "Open logs", detail: "Browse field notes", section: "logs" },
    ...(currentGame ? [{ kind: "command", id: "cmd-active-game", title: "Open active game", detail: currentGame.title, record: currentGame, content: "notes" }] : []),
    ...(latestLog ? [{ kind: "command", id: "cmd-latest-log", title: "Open latest log", detail: latestLog.title, record: latestLog }] : [])
  ];

  if (!query) {
    const recentRecords = [...records]
      .filter((record) => record.section !== "system")
      .sort((a, b) => b.updated.localeCompare(a.updated))
      .slice(0, 4)
      .map((record) => ({ kind: "record", record, detail: `${record.type} / ${record.status}` }));

    return [...commands.slice(0, 4), ...recentRecords].slice(0, 8);
  }

  const commandResults = commands.filter((command) => `${command.title} ${command.detail}`.toLowerCase().includes(query));
  const recordResults = records
    .filter((record) => record.section !== "system")
    .filter((record) => {
      const searchable = [
        record.title,
        record.type,
        record.status,
        record.section,
        record.summary,
        noteEntries(record.body).map((note) => note.title).join(" ")
      ].join(" ").toLowerCase();

      return searchable.includes(query);
    })
    .sort((a, b) => {
      const aStarts = a.title.toLowerCase().startsWith(query) ? 0 : 1;
      const bStarts = b.title.toLowerCase().startsWith(query) ? 0 : 1;
      return aStarts - bStarts || b.updated.localeCompare(a.updated) || a.priority - b.priority;
    })
    .slice(0, 6)
    .map((record) => ({ kind: "record", record, detail: `${record.type} / ${record.status}` }));

  return [...commandResults, ...recordResults].slice(0, 8);
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
    return [
      { key: "overview", label: "Entry" },
      { key: "notes", label: "Field Notes" },
      { key: "attachments", label: "Attachments" }
    ];
  }

  if (record.section === "projects") {
    return [
      { key: "technical", label: "Technical Stack" },
      { key: "overview", label: "Overview" },
      { key: "notes", label: "Notes" },
      { key: "samples", label: "Samples" }
    ];
  }

  return [
    { key: "overview", label: "Overview" },
    { key: "notes", label: "Notes" },
    { key: "changelog", label: "Change Log" }
  ];
}

function normalizeContentKey(record) {
  const contents = getRecordContents(record);
  return contents.some((item) => item.key === state.activeContent) ? state.activeContent : contents[0].key;
}

function contentOrdinal(record, index) {
  return String(record.section === "projects" ? index : index + 1).padStart(2, "0");
}

function splitUpdateIndex(body) {
  const lines = body.split(/\r?\n/);
  const startIndex = lines.findIndex((line) => line.trim() === "## Update Index");

  if (startIndex === -1) {
    return { mainBody: body, updates: [] };
  }

  let endIndex = lines.length;

  for (let index = startIndex + 1; index < lines.length; index += 1) {
    if (lines[index].startsWith("## ") || lines[index].startsWith(":::note ") || lines[index].startsWith(":::previous-note ")) {
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
  const lines = mainBody.split(/\r?\n/);
  const notes = [];

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const notePrefix = line.startsWith(":::previous-note ") ? ":::previous-note " : ":::note ";

    if (!line.startsWith(":::note ") && !line.startsWith(":::previous-note ")) {
      continue;
    }

    const title = line.slice(notePrefix.length).trim() || "Untitled note";
    const innerLines = [];

    index += 1;

    while (index < lines.length && lines[index].trim() !== ":::") {
      innerLines.push(lines[index]);
      index += 1;
    }

    notes.push({ title, body: innerLines.join("\n").trim() });
  }

  if (!notes.length && mainBody.trim()) {
    notes.push({ title: "Current note", body: mainBody.trim() });
  }

  return notes;
}

function setupHardwareFallback(body) {
  const notes = noteEntries(body);

  if (!notes.length) {
    return body;
  }

  return notes.map((note) => note.body).filter(Boolean).join("\n\n") || body;
}

function markdownBody(body) {
  const lines = body.split(/\r?\n/);
  const output = [];

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const key = `data-line="${index}"`;
    const notePrefix = line.startsWith(":::previous-note ") ? ":::previous-note " : ":::note ";

    if (line.startsWith(":::note ") || line.startsWith(":::previous-note ")) {
      const title = line.slice(notePrefix.length).trim();
      const innerLines = [];

      index += 1;

      while (index < lines.length && lines[index].trim() !== ":::") {
        innerLines.push(lines[index]);
        index += 1;
      }

      output.push(`<details class="note-entry" ${key}>
        <summary><span>${escapeHtml(title || "Previous note")}</span><i>open</i></summary>
        <div class="note-entry-body">${markdownBody(innerLines.join("\n"))}</div>
      </details>`);
      continue;
    }

    if (!line.trim()) {
      output.push("<br />");
      continue;
    }

    if (line.startsWith("## ")) {
      output.push(`<h4 ${key}>// ${escapeHtml(line.slice(3))}</h4>`);
      continue;
    }

    if (line.startsWith("### ")) {
      output.push(`<h5 ${key}>${escapeHtml(line.slice(4))}</h5>`);
      continue;
    }

    const imageMatch = line.match(/^!\[(.*?)]\((.*?)\)$/);

    if (imageMatch) {
      const media = parseNoteMediaOptions(imageMatch[1]);
      output.push(`<figure class="${noteMediaClassName(media)}" ${key}>
        <button class="note-media-button" type="button" data-expand-image="${escapeHtml(imageMatch[2])}" data-expand-alt="${escapeHtml(media.caption)}">
          <img src="${escapeHtml(imageMatch[2])}" alt="${escapeHtml(media.caption)}" decoding="async" loading="lazy" />
        </button>
        ${media.caption ? `<figcaption>${escapeHtml(media.caption)}</figcaption>` : ""}
      </figure>`);
      continue;
    }

    if (line.startsWith("- [x] ")) {
      output.push(`<p class="check-line" ${key}><span>[x]</span>${escapeHtml(line.slice(6))}</p>`);
      continue;
    }

    if (line.startsWith("- [ ] ")) {
      output.push(`<p class="check-line is-open" ${key}><span>[ ]</span>${escapeHtml(line.slice(6))}</p>`);
      continue;
    }

    if (line.startsWith("- ")) {
      output.push(`<p class="bullet-line" ${key}><span>&gt;</span>${escapeHtml(line.slice(2))}</p>`);
      continue;
    }

    if (line.startsWith("> ")) {
      output.push(`<blockquote ${key}>${escapeHtml(line.slice(2))}</blockquote>`);
      continue;
    }

    output.push(`<p ${key}>${escapeHtml(line)}</p>`);
  }

  return output.join("");
}

function parseNoteMediaOptions(rawAlt) {
  const tokens = rawAlt.split("|").map((token) => token.trim()).filter(Boolean);
  const caption = tokens[0] && !isNoteMediaToken(tokens[0]) ? tokens[0] : "";
  const options = new Set(tokens.slice(caption ? 1 : 0).map((token) => token.toLowerCase()));
  const size = options.has("banner") ? "banner" : options.has("wide") ? "wide" : options.has("small") ? "small" : "default";
  const align = options.has("left") ? "left" : options.has("right") ? "right" : "center";
  const position = options.has("top") ? "top" : options.has("bottom") ? "bottom" : "center";
  const fit = options.has("crop") || size === "banner" ? "crop" : "contain";

  return {
    align,
    caption: options.has("no-caption") ? "" : caption,
    fit: options.has("contain") ? "contain" : fit,
    position,
    size
  };
}

function isNoteMediaToken(value) {
  return ["wide", "banner", "small", "left", "right", "center", "top", "bottom", "crop", "contain", "no-caption"].includes(value.toLowerCase());
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
  return record.banner
    ? `<div class="banner-frame"><img src="${escapeHtml(record.banner)}" alt="" decoding="async" loading="lazy" /></div>`
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
  const headerImage = recordHeaderImage(record);
  const milestones = recordMilestones(record);

  return `<div class="overview-stack">
    ${headerImage ? "" : recordBanner(record)}

    <section class="record-section">
      <h3>// OVERVIEW</h3>
      <p>${escapeHtml(record.summary)}</p>
    </section>

    <section class="record-section">
      <div class="section-row"><h3>// CURRENT PROGRESS</h3><span>${record.progress}%</span></div>
      <div class="progress-meter" aria-label="${record.progress}%"><span style="inline-size: ${record.progress}%"></span></div>
      ${milestones ? `<div class="milestone-list">${milestones}</div>` : ""}
    </section>
  </div>`;
}

function renderMediaPage(record, title = "MEDIA", prefix = "MEDIA") {
  const slots = Array.from({ length: 6 }, (_, index) => index + 1);
  const mediaSources = recordMediaSources(record, "attachments");

  return `<section class="content-terminal" aria-label="${escapeHtml(record.title)} media">
    <div class="terminal-title">// ${title}</div>
    <div class="media-alert-field">
      <div class="media-alert-header"><span>MEDIA</span><i>MAX_06</i></div>
      <div class="media-popup-layer">
        ${slots
          .map((slot, index) => {
            const mediaSource = mediaSources[index];

            return `<button class="media-popup" type="button" style="--slot: ${slot}" ${mediaSource ? `data-expand-image="${escapeHtml(mediaSource)}" data-expand-alt="${escapeHtml(`${record.title} attachment ${slot}`)}"` : "disabled"}>
              <span>${prefix}_${String(slot).padStart(2, "0")}</span>
              <div class="media-frame">
                ${
                  mediaSource
                    ? `<img src="${escapeHtml(mediaSource)}" alt="" decoding="async" loading="lazy" />`
                    : `<div class="media-placeholder">NO CAPTURE</div>`
                }
              </div>
              <i>${mediaSource ? "Primary capture" : "Awaiting media"}</i>
            </button>`;
          })
          .join("")}
      </div>
    </div>
  </section>`;
}

function renderSamplePage(record) {
  const slots = Array.from({ length: 6 }, (_, index) => index + 1);
  const mediaSources = recordMediaSources(record, "samples");

  return `<section class="content-terminal" aria-label="${escapeHtml(record.title)} sample media">
    <div class="terminal-title">// SAMPLE</div>
    <div class="sample-kicker">Media</div>
    <div class="sample-grid" aria-label="${escapeHtml(record.title)} media samples">
      ${slots
        .map((slot, index) => {
          const mediaSource = mediaSources[index];

          return `<button class="sample-terminal" type="button" ${mediaSource ? `data-expand-image="${escapeHtml(mediaSource)}" data-expand-alt="${escapeHtml(`${record.title} sample ${slot}`)}"` : "disabled"}>
            <span>MEDIA_${String(slot).padStart(2, "0")}</span>
            <div class="sample-frame">
              ${
                mediaSource
                  ? `<img src="${escapeHtml(mediaSource)}" alt="" decoding="async" loading="lazy" />`
                  : `<div class="media-placeholder">NO MEDIA</div>`
              }
            </div>
            <i>${mediaSource ? "Primary sample" : "Awaiting sample"}</i>
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

  if (cleanSources.length > 0) {
    return cleanSources.slice(0, 6);
  }

  return record.banner ? [record.banner] : [];
}

function renderNotesPage(record) {
  const notes = noteEntries(record.body);
  const cleanQuery = state.noteSearchQuery.trim().toLowerCase();
  const filteredNotes = cleanQuery ? notes.filter((note) => note.title.toLowerCase().includes(cleanQuery)) : notes;
  const noteList = notes.length
    ? filteredNotes
        .map((note, index) => ({ ...note, index }))
        .map(
          (note) => `<details class="note-entry" data-note-index="${note.index}" ${note.index === 0 ? "open" : ""}>
            <summary><span>${escapeHtml(note.title)}</span><i>open</i></summary>
            <div class="note-entry-body"><div class="record-body">${markdownBody(note.body)}</div></div>
          </details>`
        )
        .join("")
    : "";

  return `<section class="content-terminal notes-page" aria-label="${escapeHtml(record.title)} notes">
    <div class="notes-page-header">
      <div class="terminal-title">// NOTES PAGE</div>
    </div>
    <div class="note-stack">${noteList}<p class="notes-empty" ${filteredNotes.length ? "hidden" : ""}>No note matches that signal.</p></div>
  </section>`;
}

function renderNoteSearch(record) {
  const notes = noteEntries(record.body);

  if (!notes.length) {
    return "";
  }

  const suggestions = notes
    .map((note) => `<option value="${escapeHtml(note.title)}"></option>`)
    .join("");

  return `<div class="note-search-panel">
    <label for="note-search">Search note</label>
    <input id="note-search" type="search" list="note-search-suggestions" value="${escapeHtml(state.noteSearchQuery)}" data-note-search-input autocomplete="off" placeholder="Title or date" />
    <datalist id="note-search-suggestions">${suggestions}</datalist>
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
      ${(stackItems.length ? stackItems : ["Next.js App Router", "MDX-style records", "small local archive store", "restrained window transitions", "public-safe content files only"])
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
      <div class="status-cell"><span>UPDATED</span><strong>${readableDate(record.updated)}</strong></div>
      <div class="status-cell"><span>STATE</span><strong>${escapeHtml(record.status)}</strong></div>
    </div>
  </section>`;
}

function renderRecordContent(record, activeContent) {
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
    return renderNotesPage(record);
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
            <small class="nav-readable" data-cipher="${escapeHtml(section.cipher)}">${escapeHtml(section.label)}</small>
            <small class="nav-cipher" aria-hidden="true">${escapeHtml(section.cipher)}</small>
          </span>
          <span class="section-signal" aria-hidden="true"></span>
        </button>
      </div>`
    )
    .join("");

  return `<aside class="sidebar">
    <div class="brand-block">
      <div class="mobile-brand-meta">
        <span>v1.29.2</span>
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
        <span class="version-label">v1.29.2</span>
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
        <div><dt>ACTIVE GAME</dt><dd>${escapeHtml(metrics.activeGame?.title || "None")}</dd></div>
        <div><dt>LAST FILED</dt><dd>${escapeHtml(readableDate(metrics.latestActivityDate))}</dd></div>
        <div><dt>OS VERSION</dt><dd>GESTALT OS v1.29.2</dd></div>
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
            <small class="nav-readable" data-cipher="${escapeHtml(section.cipher)}">${escapeHtml(section.label)}</small>
            <small class="nav-cipher" aria-hidden="true">${escapeHtml(section.cipher)}</small>
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
            <small class="nav-readable" data-cipher="${escapeHtml(section.cipher)}">${escapeHtml(section.label)}</small>
            <small class="nav-cipher" aria-hidden="true">${escapeHtml(section.cipher)}</small>
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
        <button type="button" ${currentGame ? `data-open-record="${currentGame.id}" data-open-content="notes"` : "disabled"}><span>◇</span>Current</button>
      </div>
      <div class="archive-nav-search archive-nav-search--mobile" role="search">
        <label for="mobile-archive-search">// SEARCH</label>
        <input id="mobile-archive-search" type="search" value="${escapeHtml(state.searchQuery)}" placeholder="Search records" autocomplete="off" data-mobile-nav-search-input />
      </div>
      <div class="archive-nav-actions archive-nav-actions--mobile" aria-label="Mobile archive actions">
        <button type="button" data-open-timeline><span>&#9004;</span>Trace</button>
        <button type="button" ${currentGame ? `data-open-record="${currentGame.id}" data-open-content="notes"` : "disabled"}><span>&#9671;</span>Current</button>
      </div>
      <div class="nav-stack nav-stack--desktop">${groups}</div>
      <div class="nav-stack nav-stack--mobile-archive">${archiveGroups}</div>
    </nav>`;
}

function dashboardPanel(title, body, footerLabel, action, className = "") {
  const titleMarkup = footerLabel && action
    ? `<button class="panel-title-action" type="button" ${action} aria-label="${escapeHtml(footerLabel)}" title="${escapeHtml(footerLabel)}">${escapeHtml(title)}</button>`
    : escapeHtml(title);
  const headingClass = footerLabel && action ? ` class="is-actionable"` : "";

  return `<article class="dashboard-panel ${className}">
    <h2${headingClass}>${titleMarkup}</h2>
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
      <span>Gestalt can store one local preference in this browser so repeat visits skip the full boot sequence. No account, tracking, analytics, or personal data.</span>
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

function weatherRefreshIcon() {
  return `<svg class="weather-action-icon" viewBox="0 0 36 36" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="square" stroke-linejoin="miter">
    <path class="weather-action-frame" d="M18 8.5 27.5 18 18 27.5 8.5 18Z"></path>
    <path class="weather-action-core" d="M18 13.5 22.5 18 18 22.5 13.5 18Z"></path>
    <path class="weather-action-signal" d="M26.5 10H30v3.5M9.5 26H6v-3.5M27 23l3 3M9 13l-3-3"></path>
  </svg>`;
}

function memoryLoop() {
  return `<div class="memory-loop" aria-hidden="true" data-memory-loop>
    <span class="memory-core"></span>
    <span class="memory-orbit"></span>
    <span class="memory-gate"></span>
    <span class="memory-shard"></span>
    <span class="memory-rain"></span>
    <span class="memory-axis"></span>
    <span class="memory-nodes"></span>
  </div>`;
}

function dashboard() {
  const activeProjects = updatedProjectRecords();
  const currentGame = currentGameRecord();
  const latestLog = latestLogRecord();
  const activity = recentActivity(6);
  const activitySections = new Set();
  const activityRows = activity.map((item) => {
    const freshness = activitySections.has(item.record.section) ? "old" : "new";
    activitySections.add(item.record.section);
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

  const game = currentGame
    ? `<div class="current-game" data-state="${recordStateKey(currentGame.status)}">
        <div class="game-cover">
          <img src="${escapeHtml(recordImage(currentGame))}" alt="" decoding="async" />
        </div>
        <div>
          <strong>${escapeHtml(currentGame.title)}</strong>
          <span>${currentGame.progress}% Complete</span>
          <span>${escapeHtml(currentGame.playtime || "18.7h")} Play Time</span>
          <span>Last Played: ${escapeHtml(currentGame.lastPlayed || "Today")}</span>
        </div>
      </div>`
    : `<p class="subtle">No session active.</p>`;

  const log = latestLog
    ? `<div class="latest-log" data-state="${recordStateKey(latestLog.status)}"><span>${shortDate(latestLog.updated)}</span><p>${escapeHtml(recordDisplaySummary(latestLog))}</p></div>`
    : `<p class="subtle">No field notes stored.</p>`;

  const feed = activityRows.length
    ? `<ol class="activity-feed">
      ${activityRows
        .map(
          ({ freshness, item }) => `<li data-activity-age="${freshness}" data-state="${recordStateKey(item.record.status)}">
          <span>[${shortDate(item.date)}]</span>
          <button type="button" data-open-record="${item.record.id}" ${item.content ? `data-open-content="${item.content}"` : ""}>
            <strong>${escapeHtml(item.title)}</strong>
            <small>${escapeHtml(item.detail)}</small>
          </button>
          <i class="activity-badge" aria-hidden="true">${freshness}</i>
        </li>`
        )
        .join("")}
    </ol>`
    : `<p class="subtle">No activity filed yet.</p>`;

  return `<div class="${state.panelOpen ? "dashboard-grid is-muted" : "dashboard-grid"}">
    ${dashboardPanel("PROJECTS", projectList, `View all (${activeProjects.length})`, `data-open-section="projects"`, "wide-panel active-projects-panel")}
    ${dashboardPanel("LOCAL WEATHER", weatherPanel(), "", "", "weather-panel")}
    ${dashboardPanel("MEMORY STATE", memoryLoop(), "", "", "memory-panel")}
    ${dashboardPanel("CURRENT GAME", game, currentGame ? "Read note" : "", currentGame ? `data-open-record="${currentGame.id}" data-open-content="notes"` : "", "current-game-panel")}
    ${dashboardPanel("LATEST LOG", log, "Read log", latestLog ? `data-open-record="${latestLog.id}"` : "", "latest-log-panel")}
    ${dashboardPanel("RECENT ACTIVITY", feed, "View full timeline", "data-open-timeline", "wide-panel activity-panel")}
  </div>`;
}

function sectionPage(sectionId) {
  const section = sections.find((entry) => entry.id === sectionId) || sections[0];
  const sectionRecords = recordsFor(sectionId).sort((a, b) => b.updated.localeCompare(a.updated) || a.priority - b.priority);
  const countLabel = `${sectionRecords.length} ${sectionRecords.length === 1 ? "record" : "records"}`;
  const splitSection = splitSectionRecords(sectionId, sectionRecords);
  const readout = sectionReadout(sectionRecords);

  if (sectionId === "setup") {
    return renderSetupBay(section, sectionRecords, countLabel, readout);
  }

  if (splitSection) {
    return `<section class="section-page section-page--split section-page--${sectionId}" aria-label="${escapeHtml(section.code)} records">
      <header class="section-page-header">
        <span class="nav-mark" data-icon="${section.icon}" aria-hidden="true"></span>
        <div>
          <p>${escapeHtml(section.code)}</p>
            <h2>${escapeHtml(sectionRegistryLabels[section.id] || section.label)}</h2>
            ${renderSectionReadout(readout)}
        </div>
        <i>${countLabel}</i>
      </header>
      <div class="section-split-grid">
        ${splitSection
          .map(
            (group) => `<section class="section-record-column" aria-label="${escapeHtml(group.title)}">
              <header><div><h3>${escapeHtml(group.title)}</h3><small>${escapeHtml(groupStatusLine(group.records))}</small></div><span>${group.records.length}</span></header>
              <div class="section-record-grid">${renderSectionRows(group.records)}</div>
            </section>`
          )
          .join("")}
      </div>
    </section>`;
  }

  return `<section class="section-page" aria-label="${escapeHtml(section.code)} records">
    <header class="section-page-header">
      <span class="nav-mark" data-icon="${section.icon}" aria-hidden="true"></span>
      <div>
        <p>${escapeHtml(section.code)}</p>
          <h2>${escapeHtml(sectionRegistryLabels[section.id] || section.label)}</h2>
          ${renderSectionReadout(readout)}
      </div>
      <i>${countLabel}</i>
    </header>
    <div class="section-record-grid">${renderSectionRows(sectionRecords)}</div>
  </section>`;
}

function renderSectionRows(sectionRecords) {
  return sectionRecords.length
    ? sectionRecords
        .map(
          (record) => `<button class="section-record" type="button" data-open-record="${record.id}" data-state="${recordStateKey(record.status)}">
            <span class="section-record-kind"><span>${escapeHtml(record.type)}</span><small>${escapeHtml(recordTraceId(record))}</small></span>
            <strong>${escapeHtml(record.title)}</strong>
            <span>${escapeHtml(record.summary)}</span>
            <i>${escapeHtml(record.status)} . ${readableDate(record.updated)}</i>
          </button>`
        )
        .join("")
    : `<p class="search-empty">No records filed here yet.</p>`;
}

function recordStateKey(status) {
  return status.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "unknown";
}

function recordTraceId(record) {
  return `#${record.section.slice(0, 3).toUpperCase()}-${String(record.priority).padStart(3, "0")}`;
}

function sectionReadout(sectionRecords) {
  const archivedStatuses = new Set(["archived", "completed", "deprecated", "done", "filed"]);
  const openCount = sectionRecords.filter((record) => !archivedStatuses.has(record.status.toLowerCase())).length;
  const filedCount = sectionRecords.length - openCount;

  return [
    { label: "OPEN", value: String(openCount).padStart(2, "0") },
    { label: "FILED", value: String(filedCount).padStart(2, "0") },
    { label: "LAST", value: sectionRecords[0] ? readableDate(sectionRecords[0].updated) : "-- / -- / ----" }
  ];
}

function renderSectionReadout(items) {
  return `<dl class="section-page-readout">
    ${items.map((item) => `<div><dt>${escapeHtml(item.label)}</dt><dd>${escapeHtml(item.value)}</dd></div>`).join("")}
  </dl>`;
}

function groupStatusLine(sectionRecords) {
  const liveStatuses = new Set(["active", "blocked", "in progress", "on hold", "paused", "planning", "playing"]);
  const liveCount = sectionRecords.filter((record) => liveStatuses.has(record.status.toLowerCase())).length;

  return `${liveCount} live ${liveCount === 1 ? "file" : "files"} / ${sectionRecords.length} indexed`;
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
    records: sectionRecords.filter((record) => setupGroupFor(record) === group.id)
  }));

  return `<section class="section-page setup-bay" aria-label="${escapeHtml(section.code)} device bay">
    <header class="section-page-header setup-bay-header">
      <span class="nav-mark" data-icon="${section.icon}" aria-hidden="true"></span>
      <div>
        <p>${escapeHtml(section.code)}</p>
        <h2>Setup Manifest</h2>
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
                  ? group.records.map((record) => renderSetupTile(record)).join("")
                  : `<span class="setup-empty">No files mounted.</span>`
              }
            </div>
          </section>`
        )
        .join("")}
    </div>
  </section>`;
}

function renderSetupTile(record) {
  const group = setupGroupFor(record);
  const image = setupTileImage(record);
  const profile = setupProfile(record);
  const action = group === "tools" ? "open" : group === "peripherals" ? "inspect" : group === "notes" ? "read" : "boot";

  return `<button class="setup-tile setup-tile--${group}" type="button" data-open-record="${record.id}">
    <span class="setup-tile-icon" aria-hidden="true">${image ? `<img src="${escapeHtml(image)}" alt="" decoding="async" loading="lazy" />` : ""}<span class="setup-tile-glyph"></span></span>
    <span class="setup-tile-body">
      <strong>${escapeHtml(record.title)}</strong>
      <small>${escapeHtml(profile.category)} . ${escapeHtml(record.status)}</small>
    </span>
    <i>${action}</i>
  </button>`;
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
    .filter(Boolean)
    .slice(0, 8);
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
      { title: "OTHER PROCESSES", records: sectionRecords.filter((record) => !activeStatuses.has(record.status.toLowerCase())) }
    ];
  }

  if (sectionId === "games") {
    const activeStatuses = new Set(["active", "in progress", "on hold", "paused", "planning", "playing"]);

    return [
      { title: "SESSION LOGS", records: sectionRecords.filter((record) => activeStatuses.has(record.status.toLowerCase())) },
      { title: "PAST LOGS", records: sectionRecords.filter((record) => !activeStatuses.has(record.status.toLowerCase())) }
    ];
  }

  return null;
}

function workspaceContent() {
  return state.activeSection === "system" ? dashboard() : sectionPage(state.activeSection);
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
        { label: "UPDATED", value: readableDate(record.updated) },
        { label: "PROGRESS", value: `${record.progress}%` }
      ];

  const body = group === "tools"
    ? setupToolBody(record, profile, specs, headerImage)
    : group === "peripherals"
      ? setupPeripheralBody(record, profile, specs, headerImage)
      : group === "notes"
        ? setupNoteBody(record, notes)
        : setupSystemBody(record, profile, specs, headerImage);

  return `<article class="record-window ${state.panelMaximized ? "is-maximized" : ""} ${state.windowSteady ? "is-steady" : ""} is-setup-record is-setup-record--${group}" data-state="${recordStateKey(record.status)}" aria-label="${escapeHtml(record.title)} setup terminal">
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
              <div class="setup-note-stack">
                ${notes
                  .map((note) => `<article class="setup-note"><h3>// ${escapeHtml(note.title)}</h3><div class="record-body">${markdownBody(note.body)}</div></article>`)
                  .join("")}
              </div>
            </section>`
          : ""
      }
    </div>
  </article>`;
}

function setupPrompt(record, command) {
  return `<div class="setup-console-prompt">
    <div class="setup-prompt-command">
      <span>eightmouse@gestalt</span><i>:</i><span>${escapeHtml(setupPathFor(record))}</span><i>$</i><strong>${escapeHtml(command)}</strong>
    </div>
    <div class="window-actions setup-window-actions">
      <button type="button" data-window-action="minimize" aria-label="Minimize setup terminal">minimize</button>
      <button type="button" data-window-action="maximize" aria-label="Maximize setup terminal">maximize</button>
      <button type="button" data-window-action="close" aria-label="Close setup terminal">close</button>
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
  return `<div class="setup-console-body setup-console-body--peripheral">
    <button class="${headerImage ? "setup-inspection-photo has-image" : "setup-inspection-photo"}" ${headerImage ? `data-expand-image="${escapeHtml(headerImage)}" data-expand-alt="${escapeHtml(record.title)}"` : "disabled"} type="button">
      ${headerImage ? `<img src="${escapeHtml(headerImage)}" alt="" decoding="async" loading="lazy" />` : ""}
      <span>${headerImage ? "inspect photo" : "no capture"}</span>
    </button>
    ${setupFetchDetails(record, profile, specs, "device.photo / inspect")}
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
    <div class="setup-note-stack">
      ${noteFiles
        .map((note) => `<article class="setup-note"><h3>// ${escapeHtml(note.title)}</h3><div class="record-body">${markdownBody(note.body)}</div></article>`)
        .join("")}
    </div>
  </div>`;
}

function setupFetchDetails(record, profile, specs, command) {
  return `<div class="setup-fetch setup-fetch--terminal">
    <p class="setup-command">&gt; ${escapeHtml(command)}</p>
    <h2>${escapeHtml(record.title)}</h2>
    ${record.summary ? `<p class="setup-motd">${escapeHtml(record.summary)}</p>` : ""}
    <dl>
      <div><dt>TYPE</dt><dd>${escapeHtml(profile.category)}</dd></div>
      <div><dt>STATE</dt><dd>${escapeHtml(record.status)}</dd></div>
      <div><dt>UPDATED</dt><dd>${readableDate(record.updated)}</dd></div>
      ${specs.map((spec) => `<div><dt>${escapeHtml(spec.label)}</dt><dd>${escapeHtml(spec.value)}</dd></div>`).join("")}
    </dl>
  </div>`;
}

function setupRecordImage(record) {
  return record.iconImage || recordHeaderImage(record) || record.banner || "";
}

function recordWindow(record) {
  if (!state.panelOpen) {
    return state.panelMinimized
      ? `<button class="reopen-control" type="button" data-window-action="open">Restore active record</button>`
      : "";
  }

  if (record.section === "setup") {
    return setupRecordWindow(record);
  }

  const contents = getRecordContents(record);
  const activeContent = normalizeContentKey(record);
  const titleClass = `record-title-text${record.title.length > 26 ? " is-long-title" : ""}`;

  const headerImage = recordHeaderImage(record);

  return `<article class="record-window ${state.panelMaximized ? "is-maximized" : ""} ${state.windowSteady ? "is-steady" : ""} ${state.updateHistoryOpen ? "has-index-modal" : ""} ${record.section === "setup" ? "is-setup-record" : ""}" data-state="${recordStateKey(record.status)}" aria-label="${escapeHtml(record.title)} archive entry">
    <header class="window-bar">
      <span>${record.section === "setup" ? "// SETUP TERMINAL" : "// ARCHIVE ENTRY"}</span>
      <div class="window-actions">
        <button type="button" data-window-action="minimize" aria-label="Minimize record">minimize</button>
        <button type="button" data-window-action="maximize" aria-label="Maximize record">maximize</button>
        <button type="button" data-window-action="close" aria-label="Close record">close</button>
      </div>
    </header>

    <div class="record-layout">
      <div class="record-main">
        <div class="${headerImage ? "record-heading has-heading-banner" : "record-heading"}${record.section === "setup" ? " setup-record-heading" : ""}">
          ${headerImage ? `<img class="heading-banner-image" src="${escapeHtml(headerImage)}" alt="" decoding="async" />` : ""}
          <span class="record-kind">${escapeHtml(record.type.toUpperCase())}</span>
          <span class="record-id">#${record.section.slice(0, 3).toUpperCase()}-${String(record.priority).padStart(3, "0")}</span>
          <h2><span class="${titleClass}" style="--record-title-chars: ${record.title.length}">${escapeHtml(record.title)}</span></h2>
          <p>
            Status: ${escapeHtml(record.status)}
            <span>.</span>
            Type: ${escapeHtml(record.type)}
            ${record.started ? `<span>.</span>Started: ${readableDate(record.started)}` : ""}
          </p>
        </div>

        ${renderRecordContent(record, activeContent)}
      </div>

      <aside class="record-aside">
        <div>
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
          <div><dt>Last Updated:</dt><dd>${readableDate(record.updated)}</dd></div>
        </dl>

        ${state.activeContent === "notes" ? renderNoteSearch(record) : record.section === "games" ? "" : renderUpdateHistory(record)}
      </aside>
    </div>
    ${record.section === "games" ? "" : renderUpdateHistoryModal(record)}
  </article>`;
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
            if (result.kind === "command") {
              const commandAttrs = result.record
                ? `data-open-record="${result.record.id}" ${result.content ? `data-open-content="${result.content}"` : ""}`
                : result.action === "timeline"
                  ? "data-open-timeline"
                  : `data-open-section="${result.section}"`;
              const stateAttr = result.record ? ` data-state="${recordStateKey(result.record.status)}"` : "";

              return `<button type="button" ${commandAttrs}${stateAttr}>
                <span><strong>${escapeHtml(result.title)}</strong><small data-cipher="${escapeHtml(cipherizeText(result.detail))}">${escapeHtml(result.detail)}</small></span>
                <i>CMD</i>
              </button>`;
            }

            return `<button type="button" data-open-record="${result.record.id}" data-state="${recordStateKey(result.record.status)}">
            <span><strong>${escapeHtml(result.record.title)}</strong><small data-cipher="${escapeHtml(cipherizeText(result.detail))}">${escapeHtml(result.detail)}</small></span>
            <i>${escapeHtml(result.record.section.toUpperCase())}</i>
          </button>`
          }
        )
        .join("")
    : `<p class="search-empty">No matching command or record.</p>`;

  return `<div class="search-panel command-panel" role="search">
    <label for="archive-search" data-cipher="${escapeHtml(cipherizeText("COMMAND PALETTE"))}">~ COMMAND PALETTE</label>
    <input
      id="archive-search"
      type="search"
      value="${escapeHtml(state.searchQuery)}"
      placeholder="Search records or type a command"
      autocomplete="off"
      data-search-input
    />
    <div class="search-suggestions">${resultList}</div>
  </div>`;
}

function timelineWindow() {
  if (!state.timelineOpen) {
    return "";
  }

  const items = getTimelineItems(32);
  const noteCount = items.filter((item) => item.kind === "note").length;
  const recordCount = items.length - noteCount;
  const sectionCount = new Set(items.map((item) => item.record.section)).size;
  const rows = items
    .map(
      (item) => `<li data-state="${recordStateKey(item.record.status)}">
        <time>${readableDate(item.date)}</time>
        <button type="button" data-open-record="${item.record.id}" data-open-content="${item.content}">
          <span>${escapeHtml(item.title)}</span>
          <small>${escapeHtml(item.detail)}</small>
          <i>${item.kind === "note" ? "NOTE TRACE" : "RECORD TRACE"}</i>
        </button>
      </li>`
    )
    .join("");

  return `<button class="record-backdrop" type="button" aria-label="Close timeline" data-timeline-close></button>
    <article class="timeline-window" aria-label="Archive timeline">
      <header class="window-bar">
        <span>// TIMELINE RECONSTRUCTION</span>
        <div class="window-actions">
          <button type="button" data-window-action="close" data-timeline-close aria-label="Close timeline">close</button>
        </div>
      </header>
      <div class="timeline-body">
        <div class="timeline-summary">
          <p>RECENT SIGNALS</p>
          <strong>${items.length}</strong>
          <span>records and notes sorted by observed date</span>
          <dl class="timeline-metrics">
            <div><dt>NOTES</dt><dd>${noteCount}</dd></div>
            <div><dt>RECORDS</dt><dd>${recordCount}</dd></div>
            <div><dt>SECTIONS</dt><dd>${sectionCount}</dd></div>
          </dl>
        </div>
        <ol class="timeline-list">${rows}</ol>
      </div>
    </article>`;
}

function mobileDock() {
  const items = ["setup", "logs", "system", "games", "projects"]
    .map((id) => sections.find((section) => section.id === id))
    .filter(Boolean);

  return `<nav class="mobile-dock" aria-label="Mobile archive sections">
    ${items.map((section) => `<button class="${state.activeSection === section.id ? "is-active" : ""} ${section.id === "system" ? "is-center" : ""}" type="button" ${section.id === "system" ? "data-home" : `data-open-section="${section.id}"`}>
      <span class="nav-mark" data-icon="${section.icon}" aria-hidden="true"></span>
      <small>${escapeHtml(section.label)}</small>
    </button>`).join("")}
  </nav>`;
}

function render() {
  const record = selectedRecord();
  const section = sections.find((entry) => entry.id === state.activeSection) || sections[0];
  const routeTitle = state.activeSection === "system" ? "DASHBOARD" : section.code;
  const headline = state.activeSection === "system" ? greeting() : section.label;
  const headlineClass = state.headlineAnimating ? "headline-decode-text is-resolving" : "headline-decode-text";
  const cursorClass = state.headlineAnimating ? "cursor headline-cursor is-delayed" : "cursor headline-cursor";

  const hasFocusWindow = state.panelOpen || state.timelineOpen;

  root.innerHTML = `<main class="${hasFocusWindow ? "archive-shell has-record" : "archive-shell"}">
    ${state.bootDismissed ? "" : `<div class="boot-screen" aria-hidden="true">
      <span>GESTALT</span>
      <div class="boot-status headline-decode-text is-resolving" aria-label="System initializing" style="--headline-chars: ${"System initializing".length}">${renderHeadlineLetters("System initializing")}</div>
      <b class="boot-meter"><b></b></b>
    </div>`}
    ${localMemoryPrompt()}
    <div class="grain-layer"></div>
    <div class="scanline-layer"></div>
    ${sidebar()}
    ${archiveNavigationMenu()}
    <section class="${hasFocusWindow ? "workspace has-record" : "workspace"}" aria-label="Gestalt dashboard">
      <header class="workspace-header">
        <div>
          <p class="route-label">// ${escapeHtml(routeTitle)}</p>
          <h1 class="${headlineClass}" style="--headline-chars: ${headline.length}" aria-label="${escapeHtml(headline)}">${renderHeadlineLetters(headline)}<span class="${cursorClass}">_</span></h1>
          <p class="subtle">${state.activeSection === "system" ? dashboardSubtext() : escapeHtml("Browse the records filed under this archive.")}</p>
        </div>
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
      ${timelineWindow()}
      ${mobileDock()}
    </section>
    ${state.expandedImage ? `<button class="note-image-lightbox" type="button" aria-label="Close expanded image" data-close-expanded-image><img src="${escapeHtml(state.expandedImage.src)}" alt="${escapeHtml(state.expandedImage.alt)}" decoding="async" /></button>` : ""}
  </main>`;

  syncTime();
  syncWeather();

  if (state.previousActiveSection !== state.activeSection) {
    window.clearTimeout(navMotionTimer);
    navMotionTimer = window.setTimeout(() => {
      state.previousActiveSection = state.activeSection;
      navMotionTimer = 0;
    }, 520);
  }

  if (!state.bootDismissed && !bootPromptTimer) {
    bootPromptTimer = window.setTimeout(() => {
      state.bootDismissed = true;
      bootPromptTimer = 0;
      render();
    }, 2800);
  }

  if (state.windowSteady) {
    state.windowSteady = false;
  }

  if (state.headlineAnimating) {
    state.headlineAnimating = false;
  }

  updateMemoryBounds();

  if (state.searchOpen) {
    const input = document.querySelector("[data-search-input]");
    input?.focus();
    input?.setSelectionRange(input.value.length, input.value.length);
  }
}

function syncTime() {
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

function filterNoteEntries(notesPage, query) {
  const cleanQuery = query.trim().toLowerCase();
  const entries = notesPage.querySelectorAll(".note-entry");
  let visibleCount = 0;

  entries.forEach((entry) => {
    const title = entry.querySelector("summary span")?.textContent?.toLowerCase() || "";
    const isVisible = !cleanQuery || title.includes(cleanQuery);

    if (entry instanceof HTMLElement) {
      entry.hidden = !isVisible;
    }

    if (isVisible) {
      visibleCount += 1;
    }
  });

  const empty = notesPage.querySelector(".notes-empty");

  if (empty instanceof HTMLElement) {
    empty.hidden = visibleCount > 0;
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
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&timezone=auto`;
    const response = await fetch(url);
    const data = await response.json();
    const current = data.current || {};

    weatherState.temp = Number.isFinite(current.temperature_2m) ? `${Math.round(current.temperature_2m)}C` : "--";
    weatherState.condition = weatherCodeLabel(Number(current.weather_code));
    weatherState.meta = `Humidity ${current.relative_humidity_2m ?? "--"}% / Wind ${current.wind_speed_10m ?? "--"} kmh`;
    weatherState.note = `Approximate sky: ${location.label}. Nothing is saved by Gestalt.`;
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

function setMemoryPointer(node, x, y) {
  node.style.setProperty("--memory-core-x", `${(x * 4).toFixed(2)}px`);
  node.style.setProperty("--memory-core-y", `${(y * 4).toFixed(2)}px`);
  node.style.setProperty("--memory-orbit-x", `${(x * -6).toFixed(2)}px`);
  node.style.setProperty("--memory-orbit-y", `${(y * -5).toFixed(2)}px`);
  node.style.setProperty("--memory-shard-x", `${(x * 7).toFixed(2)}px`);
  node.style.setProperty("--memory-shard-y", `${(y * 5).toFixed(2)}px`);
  node.style.setProperty("--memory-axis-x", `${(x * 2).toFixed(2)}px`);
  node.style.setProperty("--memory-axis-y", `${(y * 2).toFixed(2)}px`);
}

let memoryFrame = 0;
let memoryNode = null;
let memoryBounds = null;

function updateMemoryBounds() {
  memoryNode = document.querySelector("[data-memory-loop]");
  memoryBounds = memoryNode instanceof HTMLElement ? memoryNode.getBoundingClientRect() : null;
}

document.addEventListener("pointermove", (event) => {
  if (state.activeSection !== "system" || state.panelOpen || state.timelineOpen || document.hidden || !(memoryNode instanceof HTMLElement) || !memoryBounds) {
    return;
  }

  const rect = memoryBounds;
  const x = Math.max(-1, Math.min(1, (event.clientX - (rect.left + rect.width / 2)) / (window.innerWidth / 2)));
  const y = Math.max(-1, Math.min(1, (event.clientY - (rect.top + rect.height / 2)) / (window.innerHeight / 2)));

  if (memoryFrame) {
    window.cancelAnimationFrame(memoryFrame);
  }

  memoryFrame = window.requestAnimationFrame(() => {
    if (memoryNode instanceof HTMLElement) {
      setMemoryPointer(memoryNode, x, y);
    }
    memoryFrame = 0;
  });
});

window.addEventListener("resize", updateMemoryBounds, { passive: true });

document.addEventListener("click", (event) => {
  const clickTarget = event.target;

  if (!(clickTarget instanceof Element)) {
    return;
  }

  if (clickTarget.closest("[data-local-memory-allow]")) {
    if (bootPromptTimer) {
      window.clearTimeout(bootPromptTimer);
      bootPromptTimer = 0;
    }

    try {
      window.localStorage.setItem(localMemoryKey, "granted");
      state.localMemory = "granted";
      state.bootDismissed = true;
    } catch {
      state.localMemory = "session";
      state.bootDismissed = true;
    }

    render();
    return;
  }

  if (clickTarget.closest("[data-local-memory-session]")) {
    if (bootPromptTimer) {
      window.clearTimeout(bootPromptTimer);
      bootPromptTimer = 0;
    }

    state.localMemory = "session";
    state.bootDismissed = true;
    render();
    return;
  }

  if (
    state.searchOpen &&
    !clickTarget.closest(".search-panel") &&
    !clickTarget.closest("[data-search-toggle]") &&
    !clickTarget.closest(".archive-nav-search")
  ) {
    state.searchOpen = false;
    state.searchQuery = "";
    render();
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
      state.panelOpen = false;
      state.panelMinimized = true;
      render();
    }

    return;
  }

  const recordId = target.dataset.openRecord;
  const openContent = target.dataset.openContent;
  const sectionId = target.dataset.openSection;
  const contentKey = target.dataset.contentKey;
  const windowAction = target.dataset.windowAction;

  if (target.dataset.home !== undefined) {
    openHome();
    return;
  }

  if (target.dataset.openTimeline !== undefined) {
    openTimeline();
    return;
  }

  if (target.dataset.timelineClose !== undefined) {
    state.timelineOpen = false;
    render();
    return;
  }

  if (target.dataset.recordBackdrop !== undefined) {
    state.panelOpen = false;
    state.panelMinimized = true;
    render();
    return;
  }

  if (target.dataset.expandImage) {
    state.expandedImage = {
      src: target.dataset.expandImage,
      alt: target.dataset.expandAlt || ""
    };
    render();
    return;
  }

  if (target.dataset.closeExpandedImage !== undefined) {
    state.expandedImage = null;
    render();
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
    state.searchOpen = !state.searchOpen;
    state.navOpen = false;
    render();
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
    openRecord(recordId, openContent || "overview");
    return;
  }

  if (sectionId) {
    openSection(sectionId);
    return;
  }

  if (contentKey) {
    state.activeContent = contentKey;
    state.windowSteady = true;
    state.noteSearchQuery = "";
    state.updateHistoryOpen = false;
    render();
    return;
  }

  if (windowAction === "open") {
    state.panelOpen = true;
    state.panelMinimized = false;
    render();
  }

  if (windowAction === "minimize") {
    state.panelOpen = false;
    state.panelMinimized = true;
    render();
  }

  if (windowAction === "close") {
    state.panelOpen = false;
    state.panelMinimized = false;
    render();
  }

  if (windowAction === "maximize") {
    state.panelMaximized = !state.panelMaximized;
    render();
  }

  if (state.panelOpen && !recordId && !sectionId && !contentKey && !windowAction && !clickTarget.closest(".record-window")) {
    state.panelOpen = false;
    state.panelMinimized = true;
    render();
  }
});

document.addEventListener("input", (event) => {
  const target = event.target;

  if (!(target instanceof HTMLInputElement)) {
    return;
  }

  if (target.dataset.searchInput !== undefined) {
    state.searchQuery = target.value;
    render();
  }

  if (target.dataset.mobileNavSearchInput !== undefined) {
    state.searchQuery = target.value;
    state.searchOpen = target.value.trim().length > 0;
    render();
  }

  if (target.dataset.noteSearchInput !== undefined) {
    state.noteSearchQuery = target.value;
    const notesPage = document.querySelector(".notes-page");

    if (notesPage instanceof HTMLElement) {
      filterNoteEntries(notesPage, target.value);
    }
  }
});

document.addEventListener("keydown", (event) => {
  const target = event.target;
  const isInputTarget = target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement;

  if (
    (event.key === "~" || event.key === "`") &&
    (!isInputTarget || event.key === "`" || event.key === "~") &&
    !event.metaKey &&
    !event.ctrlKey &&
    !event.altKey
  ) {
    event.preventDefault();
    state.searchOpen = !state.searchOpen;
    if (!state.searchOpen) {
      state.searchQuery = "";
    }
    render();
    return;
  }

  if (event.key !== "Escape") {
    return;
  }

  if (state.expandedImage) {
    state.expandedImage = null;
    render();
    return;
  }

  if (state.timelineOpen) {
    state.timelineOpen = false;
    render();
    return;
  }

  if (state.navOpen) {
    state.navOpen = false;
    render();
    return;
  }

  if (state.updateHistoryOpen) {
    setUpdateHistory(false);
    return;
  }

  if (state.noteSearchQuery) {
    const notesPage = document.querySelector(".notes-page");
    const input = document.querySelector("[data-note-search-input]");

    if (notesPage instanceof HTMLElement) {
      filterNoteEntries(notesPage, "");
    }

    if (input instanceof HTMLInputElement) {
      input.value = "";
    }

    state.noteSearchQuery = "";

    return;
  }

  if (state.searchOpen) {
    state.searchOpen = false;
    state.searchQuery = "";
    render();
  }
});

render();
void requestWeather();
window.setInterval(syncTime, 30_000);
