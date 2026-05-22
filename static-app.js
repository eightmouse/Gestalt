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
    tags: ["system", "index", "home"],
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
    tags: ["gestalt", "blog", "archive", "portfolio"],
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
    tags: ["kirapatch", "pokemon", "gba", "patcher"],
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
    tags: ["sootopylis", "pokemon", "python", "desktop"],
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
    tags: ["kiratally", "pokemon", "shiny-hunting", "tools"],
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
    tags: ["innkeeper", "wow", "electron", "blizzard-api"],
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
    tags: ["first-entry", "personal", "archive"],
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
    tags: ["update", "ai", "performance", "dashboard"],
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
    tags: ["persona", "games", "jrpg", "play-log"],
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
  { latin: "Festina lente.", english: "Make haste slowly." },
  { latin: "Per aspera ad astra.", english: "Through hardship to the stars." },
  { latin: "Nulla dies sine linea.", english: "No day without a line." },
  { latin: "Ars longa, vita brevis.", english: "Art is long, life is brief." },
  { latin: "Respice finem.", english: "Consider the end." },
  { latin: "Non ducor, duco.", english: "I am not led; I lead." },
  { latin: "Acta non verba.", english: "Deeds, not words." }
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

const state = {
  selectedId: "dashboard",
  activeSection: "system",
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
    .map((record) => ({ date: activityDate(record), record }))
    .sort((a, b) => b.date.localeCompare(a.date) || b.record.updated.localeCompare(a.record.updated) || a.record.priority - b.record.priority)
    .slice(0, limit);
}

function activityDate(record) {
  const noteDates = noteEntries(record.body)
    .map((note) => noteTitleDate(note.title))
    .filter(Boolean);

  return [record.updated, ...noteDates].sort((a, b) => b.localeCompare(a))[0] || record.updated;
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

  return `${saying.latin} / ${saying.english}`;
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
  return record.banner || "public/images/archive-banner.png";
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
  const hardware = textBlock(record.hardware) || setupHardwareFallback(record.body);

  return `<section class="content-terminal" aria-label="${escapeHtml(record.title)} hardware">
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
  const groups = sections
    .map(
      (section) => `<div class="nav-group">
        <button class="nav-trigger ${state.activeSection === section.id ? "is-active" : ""}" type="button" data-open-section="${section.id}">
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
        <span>v1.24.17</span>
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
      <span class="version-label">v1.24.17</span>
      <i aria-hidden="true">-</i>
    </div>

    <nav aria-label="Archive navigation">
      <p class="sidebar-label">// ARCHIVE NAVIGATION</p>
      <div class="nav-stack">${groups}</div>
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
        <div><dt>OS VERSION</dt><dd>GESTALT OS v1.24.17</dd></div>
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
        <button class="nav-trigger ${state.activeSection === section.id ? "is-active" : ""}" type="button" data-open-section="${section.id}">
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
        <span>${String(sections.length).padStart(2, "0")} RECORD GROUPS</span>
      </header>
      <div class="archive-nav-actions" aria-label="Quick archive actions">
        <button class="${state.searchOpen ? "is-active" : ""}" type="button" data-search-toggle><span>⌕</span>Search</button>
        <button type="button" data-open-timeline><span>⌬</span>Trace</button>
        <button type="button" ${currentGame ? `data-open-record="${currentGame.id}" data-open-content="notes"` : "disabled"}><span>◇</span>Current</button>
        <button class="${state.activeSection === "logs" ? "is-active" : ""}" type="button" data-open-section="logs"><span>▤</span>Logs</button>
      </div>
      <div class="nav-stack">${groups}</div>
    </nav>`;
}

function dashboardPanel(title, body, footerLabel, action, className = "") {
  const footer = footerLabel
    ? `<button class="panel-link" type="button" ${action}>${footerLabel} <span>-&gt;</span></button>`
    : "";

  return `<article class="dashboard-panel ${className}">
    <h2>${title}</h2>
    <div>${body}</div>
    ${footer}
  </article>`;
}

function weatherPanel() {
  const actionLabel = weatherState.loading ? "Reading signal..." : "Refresh sky";

  return `<div class="weather-readout" data-weather-module>
    <div class="weather-primary">
      <span class="weather-temp" data-weather-temp>${escapeHtml(weatherState.temp)}</span>
      <span class="weather-condition" data-weather-condition>${escapeHtml(weatherState.condition)}</span>
    </div>
    <div class="weather-meta">
      <span data-weather-label>${escapeHtml(weatherState.label)}</span>
      <span data-weather-meta>${escapeHtml(weatherState.meta)}</span>
    </div>
    <p class="weather-note" data-weather-note>${escapeHtml(weatherState.note)}</p>
    <button class="weather-action" type="button" data-weather-action ${weatherState.loading ? "disabled" : ""}>&gt; ${actionLabel}</button>
  </div>`;
}

function memoryLoop() {
  return `<div class="memory-loop" aria-hidden="true" data-memory-loop>
    <span class="memory-core"></span>
    <span class="memory-orbit"></span>
    <span class="memory-gate"></span>
    <span class="memory-shard"></span>
    <span class="memory-rain"></span>
    <span class="memory-axis"></span>
    <span class="memory-cipher"></span>
    <span class="memory-nodes"></span>
  </div>`;
}

function dashboard() {
  const activeProjects = updatedProjectRecords();
  const currentGame = currentGameRecord();
  const latestLog = latestLogRecord();
  const activity = recentActivity(4);

  const projectList = activeProjects.length
    ? `<div class="record-list">
      ${activeProjects
        .slice(0, 5)
        .map(
          (record) => `<button type="button" data-open-record="${record.id}">
          <span><strong>${escapeHtml(record.title)}</strong><small>${escapeHtml(record.status)}</small></span>
          <i>${record.progress}%</i>
        </button>`
        )
        .join("")}
    </div>`
    : `<p class="subtle">No projects filed yet.</p>`;

  const game = currentGame
    ? `<div class="current-game">
        <div class="game-cover">
          <img src="${escapeHtml(recordImage(currentGame))}" alt="" decoding="async" />
          <span>${escapeHtml(currentGame.title.slice(0, 10))}</span>
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
    ? `<div class="latest-log"><span>${shortDate(latestLog.updated)}</span><p>${escapeHtml(latestLog.summary)}</p></div>`
    : `<p class="subtle">No field notes stored.</p>`;

  const feed = activity.length
    ? `<ol class="activity-feed">
      ${activity
        .map(
          (item) => `<li>
          <span>[${shortDate(item.date)}]</span>
          <button type="button" data-open-record="${item.record.id}">${escapeHtml(item.record.type)}: ${escapeHtml(item.record.title)}</button>
        </li>`
        )
        .join("")}
    </ol>`
    : `<p class="subtle">No activity filed yet.</p>`;

  return `<div class="${state.panelOpen ? "dashboard-grid is-muted" : "dashboard-grid"}">
    ${dashboardPanel("PROJECTS", projectList, `View all (${activeProjects.length})`, `data-open-section="projects"`, "wide-panel active-projects-panel")}
    ${dashboardPanel("LOCAL WEATHER", weatherPanel(), "", "", "weather-panel")}
    ${dashboardPanel("MEMORY STATE", memoryLoop(), "", "", "memory-panel")}
    ${dashboardPanel("CURRENT GAME", game, currentGame ? "Read note" : "", currentGame ? `data-open-record="${currentGame.id}" data-open-content="notes"` : "")}
    ${dashboardPanel("LATEST LOG", log, "Read log", latestLog ? `data-open-record="${latestLog.id}"` : "")}
    ${dashboardPanel("RECENT ACTIVITY", feed, "", "", "wide-panel")}
  </div>`;
}

function sectionPage(sectionId) {
  const section = sections.find((entry) => entry.id === sectionId) || sections[0];
  const sectionRecords = recordsFor(sectionId).sort((a, b) => b.updated.localeCompare(a.updated) || a.priority - b.priority);
  const countLabel = `${sectionRecords.length} ${sectionRecords.length === 1 ? "record" : "records"}`;
  const splitSection = splitSectionRecords(sectionId, sectionRecords);

  if (splitSection) {
    return `<section class="section-page section-page--split" aria-label="${escapeHtml(section.code)} records">
      <header class="section-page-header">
        <span class="nav-mark" data-icon="${section.icon}" aria-hidden="true"></span>
        <div>
          <p>${escapeHtml(section.code)}</p>
            <h2>${escapeHtml(sectionRegistryLabels[section.id] || section.label)}</h2>
        </div>
        <i>${countLabel}</i>
      </header>
      <div class="section-split-grid">
        ${splitSection
          .map(
            (group) => `<section class="section-record-column" aria-label="${escapeHtml(group.title)}">
              <header><h3>${escapeHtml(group.title)}</h3><span>${group.records.length}</span></header>
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
          (record) => `<button class="section-record${record.title.length > 28 ? " has-long-title" : ""}" type="button" data-open-record="${record.id}">
            <span class="section-record-kind">${escapeHtml(record.type)}</span>
            <strong>${escapeHtml(record.title)}</strong>
            <span>${escapeHtml(record.summary)}</span>
            <i>${escapeHtml(record.status)} . ${readableDate(record.updated)}</i>
          </button>`
        )
        .join("")
    : `<p class="search-empty">No records filed here yet.</p>`;
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
    const activeStatuses = new Set(["playing", "on hold", "in progress"]);

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

function recordWindow(record) {
  if (!state.panelOpen) {
    return state.panelMinimized
      ? `<button class="reopen-control" type="button" data-window-action="open">Restore active record</button>`
      : "";
  }

  const contents = getRecordContents(record);
  const activeContent = normalizeContentKey(record);
  const titleClass = `record-title-text${record.title.length > 26 ? " is-long-title" : ""}`;

  const headerImage = recordHeaderImage(record);

  return `<article class="record-window ${state.panelMaximized ? "is-maximized" : ""} ${state.windowSteady ? "is-steady" : ""} ${state.updateHistoryOpen ? "has-index-modal" : ""}" aria-label="${escapeHtml(record.title)} archive entry">
    <header class="window-bar">
      <span>// ARCHIVE ENTRY</span>
      <div class="window-actions">
        <button type="button" data-window-action="minimize" aria-label="Minimize record">minimize</button>
        <button type="button" data-window-action="maximize" aria-label="Maximize record">maximize</button>
        <button type="button" data-window-action="close" aria-label="Close record">close</button>
      </div>
    </header>

    <div class="record-layout">
      <div class="record-main">
        <div class="${headerImage ? "record-heading has-heading-banner" : "record-heading"}">
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

              return `<button type="button" ${commandAttrs}>
                <span><strong>${escapeHtml(result.title)}</strong><small data-cipher="${escapeHtml(cipherizeText(result.detail))}">${escapeHtml(result.detail)}</small></span>
                <i>CMD</i>
              </button>`;
            }

            return `<button type="button" data-open-record="${result.record.id}">
            <span><strong>${escapeHtml(result.record.title)}</strong><small data-cipher="${escapeHtml(cipherizeText(result.detail))}">${escapeHtml(result.detail)}</small></span>
            <i>${escapeHtml(result.record.section.toUpperCase())}</i>
          </button>`
          }
        )
        .join("")
    : `<p class="search-empty">No matching command or record.</p>`;

  return `<div class="search-panel command-panel" role="search">
    <label for="archive-search" data-cipher="${escapeHtml(cipherizeText("COMMAND PALETTE"))}">// COMMAND PALETTE</label>
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
  const rows = items
    .map(
      (item) => `<li>
        <time>${readableDate(item.date)}</time>
        <button type="button" data-open-record="${item.record.id}" data-open-content="${item.content}">
          <span>${escapeHtml(item.title)}</span>
          <small>${escapeHtml(item.detail)}</small>
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
        </div>
        <ol class="timeline-list">${rows}</ol>
      </div>
    </article>`;
}

function mobileDock() {
  const currentGame = currentGameRecord();

  return `<nav class="mobile-dock" aria-label="Mobile quick actions">
    <button class="${state.searchOpen ? "is-active" : ""}" type="button" data-search-toggle><span>⌕</span>Search</button>
    <button type="button" data-open-timeline><span>⌬</span>Trace</button>
    <button type="button" ${currentGame ? `data-open-record="${currentGame.id}" data-open-content="notes"` : "disabled"}><span>◇</span>Current</button>
    <button class="${state.activeSection === "logs" ? "is-active" : ""}" type="button" data-open-section="logs"><span>▤</span>Logs</button>
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
      <i data-cipher="${escapeHtml(cipherizeText("System initializing"))}">System initializing</i>
      <b class="boot-meter"><b></b></b>
    </div>`}
    <div class="grain-layer"></div>
    <div class="scanline-layer"></div>
    ${sidebar()}
    ${archiveNavigationMenu()}
    <section class="${hasFocusWindow ? "workspace has-record" : "workspace"}" aria-label="Gestalt dashboard">
      <header class="workspace-header">
        <div>
          <p class="route-label">// ${escapeHtml(routeTitle)}</p>
          <h1 class="${headlineClass}" style="--headline-chars: ${headline.length}" aria-label="${escapeHtml(headline)}">${renderHeadlineLetters(headline)}<span class="${cursorClass}">_</span></h1>
          <p class="subtle">${escapeHtml(state.activeSection === "system" ? dashboardSubtext() : "Browse the records filed under this archive.")}</p>
        </div>
        <div class="time-block" aria-label="Local time">
          <span>◷</span>
          <span data-time-clock>${formatClock()}</span>
          <span class="dot">.</span>
          <span data-time-date>${formatDate()}</span>
          <button class="icon-button ${state.searchOpen ? "is-active" : ""}" type="button" aria-label="Search records" data-search-toggle>⌕</button>
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

  if (!state.bootDismissed) {
    state.bootDismissed = true;
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

  if (temp) temp.textContent = weatherState.temp;
  if (condition) condition.textContent = weatherState.condition;
  if (label) label.textContent = weatherState.label;
  if (meta) meta.textContent = weatherState.meta;
  if (note) note.textContent = weatherState.note;
  if (action) {
    action.textContent = weatherState.loading ? "> Reading signal..." : "> Refresh sky";
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

  if (
    state.searchOpen &&
    !clickTarget.closest(".search-panel") &&
    !clickTarget.closest("[data-search-toggle]")
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
    (event.key === "/" || event.key === "`") &&
    (!isInputTarget || event.key === "`") &&
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
