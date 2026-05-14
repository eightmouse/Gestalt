const records = [
  {
    id: "dashboard",
    title: "System Dashboard",
    section: "system",
    type: "System",
    status: "Online",
    started: "2026-05-14",
    updated: "2026-05-14",
    mood: "quiet",
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
    id: "first-signal",
    title: "First Signal",
    section: "logs",
    type: "Field Note",
    status: "Filed",
    started: "2026-05-14",
    updated: "2026-05-14",
    mood: "opening",
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
    mood: "reflective",
    summary: "First update: dashboard polish, performance work, and a clear note about building Gestalt with AI in the loop.",
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
  }
].sort((a, b) => a.priority - b.priority || b.updated.localeCompare(a.updated));

const sections = [
  { id: "system", code: "01_SYSTEM", label: "Dashboard", icon: "system" },
  { id: "projects", code: "02_PROJECTS", label: "Active Processes", icon: "projects" },
  { id: "games", code: "03_GAMES", label: "Session Logs", icon: "games" },
  { id: "logs", code: "04_LOGS", label: "Field Notes", icon: "logs" },
  { id: "setup", code: "05_SETUP", label: "Hardware & Software", icon: "setup" },
  { id: "archive", code: "06_ARCHIVE", label: "Deprecated Records", icon: "archive" }
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

const weatherState = {
  label: "LOCAL WEATHER",
  temp: "--",
  condition: "Awaiting signal",
  meta: "Browser permission required",
  note: "No location is stored. Signal is read client-side only.",
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
  bootDismissed: false,
  windowSteady: false,
  recordTitleAnimating: false,
  headlineAnimating: true
};

const root = document.querySelector("#root");

function recordsFor(sectionId) {
  return records.filter((record) => record.section === sectionId);
}

function selectedRecord() {
  return records.find((record) => record.id === state.selectedId) || records[0];
}

function openRecord(recordId) {
  const record = records.find((entry) => entry.id === recordId);

  if (!record) {
    return;
  }

  state.headlineAnimating = false;
  state.selectedId = record.id;
  state.activeContent = "overview";
  state.panelOpen = true;
  state.panelMinimized = false;
  state.panelMaximized = false;
  state.searchOpen = false;
  state.searchQuery = "";
  state.recordTitleAnimating = true;
  render();
}

function openSection(sectionId) {
  state.headlineAnimating = state.activeSection !== sectionId;
  state.activeSection = sectionId;
  state.panelOpen = false;
  state.panelMinimized = false;
  state.searchOpen = false;
  state.searchQuery = "";
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

function shortDate(value) {
  const [year, month, day] = value.split("-");
  return year && month && day ? `${day}/${month}` : "--/--";
}

function readableDate(value) {
  const [year, month, day] = value.split("-");
  return year && month && day ? `${day} / ${month} / ${year}` : value;
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

function progressBlocks(value) {
  const filled = Math.round((Math.max(0, Math.min(100, value)) / 100) * 24);
  return Array.from({ length: 24 }, (_, index) => `<i class="${index < filled ? "is-filled" : ""}"></i>`).join("");
}

function recordImage(record) {
  return record.banner || "public/images/archive-banner.png";
}

function updatedProjectRecords() {
  return recordsFor("projects")
    .filter((record) => record.status !== "Archived")
    .sort((a, b) => b.updated.localeCompare(a.updated) || a.priority - b.priority);
}

function searchResults() {
  const query = state.searchQuery.trim().toLowerCase();

  if (!query) {
    return [...records].sort((a, b) => b.updated.localeCompare(a.updated)).slice(0, 5);
  }

  return records
    .filter((record) => {
      const searchable = [record.title, record.type, record.status, record.section, ...(record.tags || [])].join(" ").toLowerCase();
      return searchable.includes(query);
    })
    .sort((a, b) => {
      const aStarts = a.title.toLowerCase().startsWith(query) ? 0 : 1;
      const bStarts = b.title.toLowerCase().startsWith(query) ? 0 : 1;
      return aStarts - bStarts || b.updated.localeCompare(a.updated) || a.priority - b.priority;
    })
    .slice(0, 6);
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
      { key: "software", label: "Software" },
      { key: "maintenance", label: "Maintenance" },
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
      { key: "samples", label: "Samples" },
      { key: "notes", label: "Notes" },
      { key: "changelog", label: "Change Log" }
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

function markdownBody(body) {
  return body
    .split(/\r?\n/)
    .map((line, index) => {
      const key = `data-line="${index}"`;

      if (!line.trim()) {
        return "<br />";
      }

      if (line.startsWith("## ")) {
        return `<h4 ${key}>// ${escapeHtml(line.slice(3))}</h4>`;
      }

      if (line.startsWith("- [x] ")) {
        return `<p class="check-line" ${key}><span>[x]</span>${escapeHtml(line.slice(6))}</p>`;
      }

      if (line.startsWith("- [ ] ")) {
        return `<p class="check-line is-open" ${key}><span>[ ]</span>${escapeHtml(line.slice(6))}</p>`;
      }

      if (line.startsWith("- ")) {
        return `<p class="bullet-line" ${key}><span>&gt;</span>${escapeHtml(line.slice(2))}</p>`;
      }

      if (line.startsWith("> ")) {
        return `<blockquote ${key}>${escapeHtml(line.slice(2))}</blockquote>`;
      }

      return `<p ${key}>${escapeHtml(line)}</p>`;
    })
    .join("");
}

function recordBanner(record) {
  return record.banner
    ? `<div class="banner-frame"><img src="${escapeHtml(record.banner)}" alt="" /></div>`
    : `<div class="empty-banner"><span class="line-icon">âŒ</span></div>`;
}

function recordMilestones(record) {
  return (record.milestones.length ? record.milestones : [{ label: "Observation", progress: record.progress, status: record.status }])
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
  return `<div class="overview-stack">
    ${recordBanner(record)}

    <section class="record-section">
      <h3>// OVERVIEW</h3>
      <p>${escapeHtml(record.summary)}</p>
    </section>

    <section class="record-section">
      <div class="section-row"><h3>// CURRENT PROGRESS</h3><span>${record.progress}%</span></div>
      <div class="progress-meter" aria-label="${record.progress}%"><span style="inline-size: ${record.progress}%"></span></div>
      <div class="milestone-list">${recordMilestones(record)}</div>
    </section>
  </div>`;
}

function renderMediaPage(record, title = "MEDIA", prefix = "MEDIA") {
  const slots = Array.from({ length: 6 }, (_, index) => index + 1);

  return `<section class="content-terminal" aria-label="${escapeHtml(record.title)} media">
    <div class="terminal-title">// ${title}</div>
    <div class="media-alert-field">
      <div class="media-alert-header"><span>MEDIA</span><i>MAX_06</i></div>
      <div class="media-popup-layer">
        ${slots
          .map((slot) => {
            const hasImage = slot === 1 && record.banner;

            return `<button class="media-popup" type="button" style="--slot: ${slot}">
              <span>${prefix}_${String(slot).padStart(2, "0")}</span>
              <div class="media-frame">
                ${
                  hasImage
                    ? `<img src="${escapeHtml(record.banner)}" alt="" />`
                    : `<div class="media-placeholder">NO CAPTURE</div>`
                }
              </div>
              <i>${hasImage ? "Primary capture" : "Awaiting media"}</i>
            </button>`;
          })
          .join("")}
      </div>
    </div>
  </section>`;
}

function renderSamplePage(record) {
  const slots = Array.from({ length: 6 }, (_, index) => index + 1);

  return `<section class="content-terminal" aria-label="${escapeHtml(record.title)} sample media">
    <div class="terminal-title">// SAMPLE</div>
    <div class="sample-kicker">Media</div>
    <div class="sample-grid" aria-label="${escapeHtml(record.title)} media samples">
      ${slots
        .map((slot) => {
          const hasImage = slot === 1 && record.banner;

          return `<button class="sample-terminal" type="button">
            <span>MEDIA_${String(slot).padStart(2, "0")}</span>
            <div class="sample-frame">
              ${
                hasImage
                  ? `<img src="${escapeHtml(record.banner)}" alt="" />`
                  : `<div class="media-placeholder">NO MEDIA</div>`
              }
            </div>
            <i>${hasImage ? "Primary sample" : "Awaiting sample"}</i>
          </button>`;
        })
        .join("")}
    </div>
  </section>`;
}

function renderNotesPage(record) {
  const noteImage = record.banner
    ? `<div class="notes-banner"><img src="${escapeHtml(record.banner)}" alt="" /></div>`
    : "";

  return `<section class="content-terminal notes-page" aria-label="${escapeHtml(record.title)} notes">
    <div class="terminal-title">// NOTES PAGE</div>
    ${noteImage}
    <div class="record-body">${markdownBody(record.body)}</div>
  </section>`;
}

function renderTechnicalPage(record) {
  return `<section class="content-terminal" aria-label="${escapeHtml(record.title)} technical stack">
    <div class="terminal-title">// TECHNICAL STACK</div>
    <div class="detail-list">
      <p>&gt; Framework: Next.js App Router</p>
      <p>&gt; Content: MDX-style records</p>
      <p>&gt; State: small local archive store</p>
      <p>&gt; Motion: restrained window transitions</p>
      <p>&gt; Privacy: public-safe content files only</p>
    </div>
  </section>`;
}

function renderSetupPage(record, key) {
  const label = key === "hardware" ? "HARDWARE" : key === "software" ? "SOFTWARE" : "MAINTENANCE";

  return `<section class="content-terminal" aria-label="${escapeHtml(record.title)} ${label.toLowerCase()}">
    <div class="terminal-title">// ${label}</div>
    <div class="record-body">${markdownBody(record.body)}</div>
  </section>`;
}

function renderRecommendationPage(record) {
  return `<section class="content-terminal" aria-label="${escapeHtml(record.title)} recommendation">
    <div class="terminal-title">// RECOMMENDATION</div>
    <div class="status-grid">
      <div class="status-cell"><span>STATUS</span><strong>${escapeHtml(record.status)}</strong></div>
      <div class="status-cell"><span>MOOD</span><strong>${escapeHtml(record.mood || "unfiled")}</strong></div>
      <div class="status-cell"><span>PROGRESS</span><strong>${record.progress}%</strong></div>
    </div>
    <p class="terminal-copy">Recommendation stays pending until the session has enough time behind it. Current notes are being kept as observations, not a final verdict.</p>
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

  if (activeContent === "hardware" || activeContent === "software" || activeContent === "maintenance") {
    return renderSetupPage(record, activeContent);
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
  const groups = sections
    .map(
      (section) => `<div class="nav-group">
        <button class="nav-trigger ${state.activeSection === section.id ? "is-active" : ""}" type="button" data-open-section="${section.id}">
          <span class="nav-mark" data-icon="${section.icon}" aria-hidden="true"></span>
          <span><strong>${section.code}</strong><small>${section.label}</small></span>
          <span class="section-signal" aria-hidden="true"></span>
        </button>
      </div>`
    )
    .join("");

  return `<aside class="sidebar">
    <div class="brand-block">
      <p class="brand">GESTALT</p>
      <span>v1.3.5</span>
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
        <div><dt>HOST</dt><dd>LOCALHOST</dd></div>
        <div><dt>UPTIME</dt><dd>02:17:43:21</dd></div>
        <div><dt>OS VERSION</dt><dd>GESTALT OS v1.3.5</dd></div>
      </dl>
    </div>
  </aside>`;
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
  const actionLabel = weatherState.loading ? "Reading signal..." : "Read local sky";

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
  return `<div class="memory-loop" aria-hidden="true">
    <span class="memory-core"></span>
    <span class="memory-orbit"></span>
    <span class="memory-gate"></span>
    <span class="memory-shard"></span>
    <span class="memory-rain"></span>
  </div>`;
}

function dashboard() {
  const activeProjects = updatedProjectRecords();
  const currentGame = recordsFor("games").find((record) => record.status === "Playing") || recordsFor("games")[0];
  const latestLog = recordsFor("logs").sort((a, b) => b.updated.localeCompare(a.updated) || a.priority - b.priority)[0];
  const activity = records.filter((record) => record.section !== "system").sort((a, b) => b.updated.localeCompare(a.updated)).slice(0, 4);

  const projectList = activeProjects.length
    ? `<div class="record-list">
      ${activeProjects
        .slice(0, 3)
        .map(
          (record) => `<button type="button" data-open-record="${record.id}">
          <span><strong>${escapeHtml(record.title)}</strong><small>${escapeHtml(record.status)}</small></span>
          <i>${record.progress}%</i>
        </button>`
        )
        .join("")}
    </div>`
    : `<p class="subtle">No active projects filed yet.</p>`;

  const game = currentGame
    ? `<div class="current-game">
        <div class="game-cover">
          <img src="${escapeHtml(recordImage(currentGame))}" alt="" />
          <span>${escapeHtml(currentGame.title.slice(0, 10))}</span>
        </div>
        <div>
          <strong>${escapeHtml(currentGame.title)}</strong>
          <span>${currentGame.progress}% Complete</span>
          <span>${escapeHtml(currentGame.playtime || "18.7h")} Play Time</span>
          <span>Last Played: Today</span>
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
          (record) => `<li>
          <span>[${shortDate(record.updated)}]</span>
          <button type="button" data-open-record="${record.id}">${escapeHtml(record.type)}: ${escapeHtml(record.title)}</button>
        </li>`
        )
        .join("")}
    </ol>`
    : `<p class="subtle">No activity filed yet.</p>`;

  return `<div class="${state.panelOpen ? "dashboard-grid is-muted" : "dashboard-grid"}">
    ${dashboardPanel("ACTIVE PROJECTS", projectList, `View all (${activeProjects.length})`, `data-open-section="projects"`, "wide-panel")}
    ${dashboardPanel("LOCAL WEATHER", weatherPanel(), "", "", "weather-panel")}
    ${dashboardPanel("MEMORY STATE", memoryLoop(), "", "", "memory-panel")}
    ${dashboardPanel("CURRENT GAME", game, "", "")}
    ${dashboardPanel("LATEST LOG", log, "Read log", latestLog ? `data-open-record="${latestLog.id}"` : "")}
    ${dashboardPanel("RECENT ACTIVITY", feed, "View full timeline", `data-open-section="logs"`, "wide-panel")}
  </div>`;
}

function sectionPage(sectionId) {
  const section = sections.find((entry) => entry.id === sectionId) || sections[0];
  const sectionRecords = recordsFor(sectionId).sort((a, b) => b.updated.localeCompare(a.updated) || a.priority - b.priority);
  const countLabel = `${sectionRecords.length} ${sectionRecords.length === 1 ? "record" : "records"}`;
  const rows = sectionRecords.length
    ? sectionRecords
        .map(
          (record) => `<button class="section-record" type="button" data-open-record="${record.id}">
            <span class="section-record-kind">${escapeHtml(record.type)}</span>
            <strong>${escapeHtml(record.title)}</strong>
            <span>${escapeHtml(record.summary)}</span>
            <i>${escapeHtml(record.status)} . ${readableDate(record.updated)}</i>
          </button>`
        )
        .join("")
    : `<p class="search-empty">No records filed here yet.</p>`;

  return `<section class="section-page" aria-label="${escapeHtml(section.code)} records">
    <header class="section-page-header">
      <span class="nav-mark" data-icon="${section.icon}" aria-hidden="true"></span>
      <div>
        <p>${escapeHtml(section.code)}</p>
        <h2>${escapeHtml(section.label)}</h2>
      </div>
      <i>${countLabel}</i>
    </header>
    <div class="section-record-grid">${rows}</div>
  </section>`;
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
  const titleClass = state.recordTitleAnimating ? "record-title-text is-writing" : "record-title-text";
  const cursorClass = state.recordTitleAnimating ? "cursor record-title-cursor is-delayed" : "cursor record-title-cursor";

  return `<article class="record-window ${state.panelMaximized ? "is-maximized" : ""} ${state.windowSteady ? "is-steady" : ""}" aria-label="${escapeHtml(record.title)} archive entry">
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
        <div class="record-heading">
          <span class="record-kind">${escapeHtml(record.type.toUpperCase())}</span>
          <span class="record-id">#${record.section.slice(0, 3).toUpperCase()}-${String(record.priority).padStart(3, "0")}</span>
          <h2><span class="${titleClass}" style="--record-title-chars: ${record.title.length}">${escapeHtml(record.title)}</span><span class="${cursorClass}" style="--record-title-chars: ${record.title.length}">_</span></h2>
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
          ${record.mood ? `<div><dt>Mood:</dt><dd>${escapeHtml(record.mood)}</dd></div>` : ""}
        </dl>
      </aside>
    </div>
  </article>`;
}

function searchPanel() {
  if (!state.searchOpen) {
    return "";
  }

  const results = searchResults();
  const resultList = results.length
    ? results
        .map(
          (record) => `<button type="button" data-open-record="${record.id}">
            <span><strong>${escapeHtml(record.title)}</strong><small>${escapeHtml(record.type)} / ${escapeHtml(record.status)}</small></span>
            <i>${escapeHtml(record.section.toUpperCase())}</i>
          </button>`
        )
        .join("")
    : `<p class="search-empty">No matching record.</p>`;

  return `<div class="search-panel" role="search">
    <label for="archive-search">// SEARCH RECORDS</label>
    <input
      id="archive-search"
      type="search"
      value="${escapeHtml(state.searchQuery)}"
      placeholder="Project, game, log..."
      autocomplete="off"
      data-search-input
    />
    <div class="search-suggestions">${resultList}</div>
  </div>`;
}

function render() {
  const record = selectedRecord();
  const section = sections.find((entry) => entry.id === state.activeSection) || sections[0];
  const routeTitle = state.activeSection === "system" ? "DASHBOARD" : section.code;
  const headline = state.activeSection === "system" ? greeting() : section.label;
  const headlineClass = state.headlineAnimating ? "headline-text is-writing" : "headline-text";
  const cursorClass = state.headlineAnimating ? "cursor headline-cursor is-delayed" : "cursor headline-cursor";

  root.innerHTML = `<main class="${state.panelOpen ? "archive-shell has-record" : "archive-shell"}">
    ${state.bootDismissed ? "" : `<div class="boot-screen" aria-hidden="true">
      <span>GESTALT</span>
      <i>System initializing</i>
      <b class="boot-meter"><b></b></b>
    </div>`}
    <div class="grain-layer"></div>
    <div class="scanline-layer"></div>
    ${sidebar()}
    <section class="${state.panelOpen ? "workspace has-record" : "workspace"}" aria-label="Gestalt dashboard">
      <header class="workspace-header">
        <div>
          <p class="route-label">// ${escapeHtml(routeTitle)}</p>
          <h1><span class="${headlineClass}" style="--headline-chars: ${headline.length}" data-time-greeting>${escapeHtml(headline)}</span><span class="${cursorClass}">_</span></h1>
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

      ${recordWindow(record)}
    </section>
  </main>`;

  syncTime();
  syncWeather();

  if (!state.bootDismissed) {
    state.bootDismissed = true;
  }

  if (state.windowSteady) {
    state.windowSteady = false;
  }

  if (state.recordTitleAnimating) {
    state.recordTitleAnimating = false;
  }

  if (state.headlineAnimating) {
    state.headlineAnimating = false;
  }

  if (state.searchOpen) {
    const input = document.querySelector("[data-search-input]");
    input?.focus();
    input?.setSelectionRange(input.value.length, input.value.length);
  }
}

function syncTime() {
  const greetingTarget = document.querySelector("[data-time-greeting]");
  const clockTarget = document.querySelector("[data-time-clock]");
  const dateTarget = document.querySelector("[data-time-date]");

  if (greetingTarget && state.activeSection === "system") {
    greetingTarget.textContent = greeting();
  }

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
    action.textContent = weatherState.loading ? "> Reading signal..." : "> Read local sky";
    action.disabled = weatherState.loading;
  }
}

function requestWeather() {
  if (weatherState.loading) {
    return;
  }

  if (!("geolocation" in navigator) || typeof fetch !== "function") {
    weatherState.condition = "Signal unavailable";
    weatherState.meta = "This browser cannot read local weather";
    weatherState.note = "Weather remains client-side; no location is stored.";
    syncWeather();
    return;
  }

  weatherState.loading = true;
  weatherState.condition = "Acquiring position";
  weatherState.meta = "Waiting for browser permission";
  weatherState.note = "Location is used once for this weather lookup only.";
  syncWeather();

  navigator.geolocation.getCurrentPosition(
    async (position) => {
      const latitude = position.coords.latitude.toFixed(3);
      const longitude = position.coords.longitude.toFixed(3);
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&timezone=auto`;

      try {
        const response = await fetch(url);
        const data = await response.json();
        const current = data.current || {};

        weatherState.temp = Number.isFinite(current.temperature_2m) ? `${Math.round(current.temperature_2m)}C` : "--";
        weatherState.condition = weatherCodeLabel(Number(current.weather_code));
        weatherState.meta = `Humidity ${current.relative_humidity_2m ?? "--"}% / Wind ${current.wind_speed_10m ?? "--"} kmh`;
        weatherState.note = "Live signal from Open-Meteo. Nothing is saved.";
      } catch {
        weatherState.condition = "Signal interrupted";
        weatherState.meta = "Weather endpoint did not respond";
        weatherState.note = "Try again later; the archive remains offline-safe.";
      } finally {
        weatherState.loading = false;
        syncWeather();
      }
    },
    () => {
      weatherState.loading = false;
      weatherState.condition = "Permission denied";
      weatherState.meta = "Local weather hidden";
      weatherState.note = "Grant location permission to read the current sky.";
      syncWeather();
    },
    { enableHighAccuracy: false, maximumAge: 600000, timeout: 10000 }
  );
}

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
  const sectionId = target.dataset.openSection;
  const contentKey = target.dataset.contentKey;
  const windowAction = target.dataset.windowAction;

  if (target.dataset.weatherAction !== undefined) {
    requestWeather();
    return;
  }

  if (target.dataset.searchToggle !== undefined) {
    state.searchOpen = !state.searchOpen;
    render();
    return;
  }

  if (recordId) {
    openRecord(recordId);
    return;
  }

  if (sectionId) {
    openSection(sectionId);
    return;
  }

  if (contentKey) {
    state.activeContent = contentKey;
    state.windowSteady = true;
    render();
    return;
  }

  if (windowAction === "open") {
    state.panelOpen = true;
    state.panelMinimized = false;
    state.recordTitleAnimating = true;
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

  if (!(target instanceof HTMLInputElement) || target.dataset.searchInput === undefined) {
    return;
  }

  state.searchQuery = target.value;
  render();
});

document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape" || !state.searchOpen) {
    return;
  }

  state.searchOpen = false;
  state.searchQuery = "";
  render();
});

render();
window.setInterval(syncTime, 30_000);
