"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  Clock,
  Cpu,
  Maximize2,
  Minimize2,
  Search,
  Square,
  Terminal,
  X
} from "lucide-react";
import { useEffect, useMemo, useRef, useState, type CSSProperties, type RefObject } from "react";
import { create } from "zustand";
import { ArchiveDashboard } from "@/components/archive/dashboard";
import {
  type ArchiveMetrics,
  activityDate,
  formatClock,
  formatDate,
  formatReadableDate,
  getArchiveMetrics,
  metaText,
  noteEntries,
  noteTitleDate,
  recentActivity,
  recordHeaderImage,
  splitUpdateIndex
} from "@/components/archive/record-utils";
import { SectionPage } from "@/components/archive/section-page";
import { setupHardwareSource, setupNarrativeNotes, setupPathFor, setupProfile } from "@/components/archive/setup-utils";
import type { RecordEntry, RecordSection } from "@/lib/types";

type ContentKey =
  | "overview"
  | "samples"
  | "technical"
  | "notes"
  | "changelog"
  | "recommendation"
  | "hardware"
  | "attachments";

type ArchiveState = {
  selectedId: string;
  activeSection: RecordSection;
  setSelectedId: (id: string) => void;
  setActiveSection: (section: RecordSection) => void;
};

const useArchiveStore = create<ArchiveState>((set) => ({
  selectedId: "dashboard",
  activeSection: "system",
  setSelectedId: (id) => set({ selectedId: id }),
  setActiveSection: (section) => set({ activeSection: section })
}));

const sections: Array<{
  id: RecordSection;
  code: string;
  label: string;
  cipher: string;
  icon: string;
}> = [
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

function cipherizeText(value: string): string {
  return value
    .split("")
    .map((char, index) => {
      if (char === " ") return " ";
      if (char === "/" || char === "&" || char === "." || char === "-") return char;
      return cipherGlyphs[(char.charCodeAt(0) + index) % cipherGlyphs.length];
    })
    .join("");
}

function projectStatusRank(status: string): number {
  const rank = projectStatusOrder.indexOf(status.toLowerCase());
  return rank === -1 ? projectStatusOrder.length : rank;
}

function renderHeadlineLetters(value: string) {
  const cipher = cipherizeText(value).split("");

  return value.split("").map((char, index) => {
    const isSpace = char === " ";
    const display = isSpace ? "\u00A0" : char;
    const cipherDisplay = isSpace ? "\u00A0" : cipher[index] ?? char;

    return (
      <span
        aria-hidden="true"
        className={isSpace ? "headline-char is-space" : "headline-char"}
        key={`${char}-${index}`}
        style={{ "--headline-index": index } as CSSProperties}
      >
        <span className="headline-char-cipher">{cipherDisplay}</span>
        <span className="headline-char-readable">{display}</span>
      </span>
    );
  });
}

type TimelineItem = {
  content: ContentKey;
  date: string;
  detail: string;
  id: string;
  record: RecordEntry;
  title: string;
};

type SearchResult =
  | { kind: "command"; id: string; title: string; detail: string; action?: "timeline"; section?: RecordSection; record?: RecordEntry; content?: ContentKey }
  | { kind: "record"; record: RecordEntry; detail: string };
type SearchCommand = Extract<SearchResult, { kind: "command" }>;

type ArchiveOSProps = {
  records: RecordEntry[];
};

export function ArchiveOS({ records }: ArchiveOSProps) {
  const { selectedId, activeSection, setSelectedId, setActiveSection } = useArchiveStore();
  const [panelOpen, setPanelOpen] = useState(false);
  const [panelMinimized, setPanelMinimized] = useState(false);
  const [panelMaximized, setPanelMaximized] = useState(false);
  const [initialContent, setInitialContent] = useState<ContentKey>("overview");
  const [now, setNow] = useState<Date | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [timelineOpen, setTimelineOpen] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  const [headlineAnimating, setHeadlineAnimating] = useState(true);
  const searchRef = useRef<HTMLDivElement | null>(null);

  const recordsBySection = useMemo(() => {
    return sections.reduce<Record<RecordSection, RecordEntry[]>>(
      (acc, section) => {
        acc[section.id] = records.filter((record) => record.section === section.id);
        return acc;
      },
      {
        system: [],
        projects: [],
        games: [],
        logs: [],
        setup: [],
        archive: []
      }
    );
  }, [records]);

  const selectedRecord = records.find((record) => record.id === selectedId) ?? records[0];
  const projectDashboardRecords = recordsBySection.projects
    .sort((a, b) => projectStatusRank(a.status) - projectStatusRank(b.status) || b.updated.localeCompare(a.updated) || a.priority - b.priority);
  const currentGame = recordsBySection.games.find((record) => record.meta.dashboardActive === true)
    ?? recordsBySection.games.find((record) => record.status === "Playing")
    ?? recordsBySection.games[0];
  const latestLog = [...recordsBySection.logs].sort((a, b) => b.updated.localeCompare(a.updated) || a.priority - b.priority)[0];
  const activity = recentActivity(records, 3);
  const metrics = getArchiveMetrics(records, currentGame);

  useEffect(() => {
    const updateClock = () => setNow(new Date());
    updateClock();
    const interval = window.setInterval(updateClock, 30_000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!searchOpen) {
      return;
    }

    const closeSearch = (event: MouseEvent) => {
      const target = event.target;

      if (!(target instanceof Element)) {
        return;
      }

      if (searchRef.current?.contains(target) || target.closest("[data-search-toggle]") || target.closest(".archive-nav-search")) {
        return;
      }

      setSearchOpen(false);
      setSearchQuery("");
    };

    document.addEventListener("mousedown", closeSearch);
    return () => document.removeEventListener("mousedown", closeSearch);
  }, [searchOpen]);

  useEffect(() => {
    const togglePalette = (event: KeyboardEvent) => {
      const target = event.target;
      const isInputTarget = target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement;

      if (event.metaKey || event.ctrlKey || event.altKey || (isInputTarget && event.key !== "`")) {
        return;
      }

      if (event.key === "/" || event.key === "`") {
        event.preventDefault();
        setSearchOpen((current) => !current);
      }
    };

    document.addEventListener("keydown", togglePalette);
    return () => document.removeEventListener("keydown", togglePalette);
  }, []);

  useEffect(() => {
    if (!navOpen) {
      return;
    }

    const closeNavigation = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setNavOpen(false);
      }
    };

    document.addEventListener("keydown", closeNavigation);
    return () => document.removeEventListener("keydown", closeNavigation);
  }, [navOpen]);

  useEffect(() => {
    if (!records.some((record) => record.id === selectedId) && records[0]) {
      setSelectedId(records[0].id);
    }
  }, [records, selectedId, setSelectedId]);

  const openRecord = (record: RecordEntry, content: ContentKey = "overview") => {
    setSelectedId(record.id);
    setInitialContent(content);
    setPanelOpen(true);
    setPanelMinimized(false);
    setPanelMaximized(false);
    setSearchOpen(false);
    setSearchQuery("");
    setTimelineOpen(false);
    setNavOpen(false);
  };

  const openSection = (section: RecordSection) => {
    const sectionChanged = activeSection !== section;

    setActiveSection(section);
    setHeadlineAnimating(sectionChanged);
    setPanelOpen(false);
    setPanelMinimized(false);
    setSearchOpen(false);
    setSearchQuery("");
    setTimelineOpen(false);
    setNavOpen(false);
  };

  const openTimeline = () => {
    setPanelOpen(false);
    setPanelMinimized(false);
    setSearchOpen(false);
    setSearchQuery("");
    setTimelineOpen(true);
    setNavOpen(false);
  };

  const openHome = () => {
    const sectionChanged = activeSection !== "system";

    setActiveSection("system");
    setHeadlineAnimating(sectionChanged);
    setPanelOpen(false);
    setPanelMinimized(false);
    setPanelMaximized(false);
    setSearchOpen(false);
    setSearchQuery("");
    setTimelineOpen(false);
    setNavOpen(false);
  };

  const openSearchFromNavigation = () => {
    setNavOpen(false);
    setSearchOpen(true);
  };

  const updateSearchFromNavigation = (query: string) => {
    setSearchQuery(query);
    setSearchOpen(query.trim().length > 0);
  };

  const openSearchResult = (result: SearchResult) => {
    if (result.kind === "record") {
      openRecord(result.record);
      return;
    }

    if (result.action === "timeline") {
      openTimeline();
      return;
    }

    if (result.record) {
      openRecord(result.record, result.content ?? "overview");
      return;
    }

    if (result.section) {
      openSection(result.section);
    }
  };

  const searchResults = getSearchResults(records, searchQuery, currentGame, latestLog);
  const timelineItems = getTimelineItems(records, 32);

  const activeSectionConfig = sections.find((section) => section.id === activeSection) ?? sections[0];
  const routeTitle = activeSection === "system" ? "DASHBOARD" : activeSectionConfig.code;
  const headline = activeSection === "system" ? getGreeting(now) : activeSectionConfig.label;
  const subtext = activeSection === "system" ? dashboardSubtext(now) : "Browse the records filed under this archive.";
  const hasFocusWindow = panelOpen || timelineOpen;

  return (
    <main className={hasFocusWindow ? "archive-shell has-record" : "archive-shell"}>
      <div className="boot-screen" aria-hidden="true">
        <span>GESTALT</span>
        <div
          className="boot-status headline-decode-text is-resolving"
          aria-label="System initializing"
          style={{ "--headline-chars": "System initializing".length } as CSSProperties}
        >
          {renderHeadlineLetters("System initializing")}
        </div>
        <b className="boot-meter">
          <b />
        </b>
      </div>
      <div className="grain-layer" />
      <div className="scanline-layer" />
      <Sidebar
        activeSection={activeSection}
        metrics={metrics}
        navOpen={navOpen}
        now={now}
        onHome={openHome}
        onOpenSection={openSection}
        onToggleNav={() => setNavOpen((current) => !current)}
      />

      <AnimatePresence>
        {navOpen ? (
          <ArchiveNavigationMenu
            activeSection={activeSection}
            currentGame={currentGame}
            onClose={() => setNavOpen(false)}
            onOpenCurrent={() => currentGame && openRecord(currentGame, "notes")}
            onOpenSearch={openSearchFromNavigation}
            onOpenSection={openSection}
            onOpenTimeline={openTimeline}
            onSearchQueryChange={updateSearchFromNavigation}
            searchQuery={searchQuery}
            searchOpen={searchOpen}
          />
        ) : null}
      </AnimatePresence>

      <section className={hasFocusWindow ? "workspace has-record" : "workspace"} aria-label="Gestalt dashboard">
        <header className="workspace-header">
          <div>
            <p className="route-label">// {routeTitle}</p>
            <h1
              aria-label={headline}
              className={headlineAnimating ? "headline-decode-text is-resolving" : "headline-decode-text"}
              key={activeSection}
              style={{ "--headline-chars": headline.length } as CSSProperties}
            >
              {renderHeadlineLetters(headline)}
              <span
                className={headlineAnimating ? "cursor headline-cursor is-delayed" : "cursor headline-cursor"}
                key={`${activeSection}-cursor`}
                style={{ "--headline-chars": headline.length } as CSSProperties}
              >
                _
              </span>
            </h1>
            <p className="subtle">{subtext}</p>
          </div>
          <div className="time-block" aria-label="Local time">
            <Clock size={15} />
            <span>{formatClock(now)}</span>
            <span className="dot">.</span>
            <span>{formatDate(now)}</span>
            <button
              className={searchOpen ? "icon-button is-active" : "icon-button"}
              type="button"
              aria-label="Search records"
              data-search-toggle
              onClick={() => setSearchOpen((current) => !current)}
            >
              <Search size={15} />
            </button>
          </div>
          {searchOpen ? (
            <SearchPanel panelRef={searchRef} query={searchQuery} results={searchResults} onOpenResult={openSearchResult} onQueryChange={setSearchQuery} />
          ) : null}
        </header>

        {activeSection === "system" ? (
          <ArchiveDashboard
            activity={activity}
            currentGame={currentGame}
            latestLog={latestLog}
            panelOpen={panelOpen}
            projectRecords={projectDashboardRecords}
            onOpenRecord={(record, content) => openRecord(record, content ?? "overview")}
            onOpenSection={openSection}
          />
        ) : (
          <SectionPage
            records={recordsBySection[activeSection]}
            section={activeSectionConfig}
            onOpenRecord={openRecord}
          />
        )}

        <footer className="workspace-footer">
          <p>// FOOTER</p>
          <span>All memories are fragments. We build, thus we are.</span>
          <Terminal size={16} />
        </footer>

        <AnimatePresence>
          {panelOpen && selectedRecord ? (
            <>
              <motion.button
                aria-label="Minimize active record"
                className="record-backdrop"
                type="button"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => {
                  setPanelOpen(false);
                  setPanelMinimized(true);
                }}
              />
              <RecordWindow
                key={selectedRecord.id}
                maximized={panelMaximized}
                initialContent={initialContent}
                record={selectedRecord}
                onClose={() => {
                  setPanelOpen(false);
                  setPanelMinimized(false);
                }}
                onMinimize={() => {
                  setPanelOpen(false);
                  setPanelMinimized(true);
                }}
                onMaximize={() => setPanelMaximized((current) => !current)}
              />
            </>
          ) : panelMinimized ? (
            <motion.button
              className="reopen-control"
              type="button"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 12 }}
              onClick={() => {
                setPanelOpen(true);
                setPanelMinimized(false);
              }}
            >
              <Square size={13} />
              Restore active record
            </motion.button>
          ) : null}
        </AnimatePresence>

        <AnimatePresence>
          {timelineOpen ? (
            <>
              <motion.button
                aria-label="Close timeline"
                className="record-backdrop"
                type="button"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setTimelineOpen(false)}
              />
              <TimelineWindow
                items={timelineItems}
                onClose={() => setTimelineOpen(false)}
                onOpenRecord={(record, content) => {
                  setTimelineOpen(false);
                  openRecord(record, content);
                }}
              />
            </>
          ) : null}
        </AnimatePresence>
        <MobileDock activeSection={activeSection} onHome={openHome} onOpenSection={openSection} />
      </section>
    </main>
  );
}

type MobileDockProps = {
  activeSection: RecordSection;
  onHome: () => void;
  onOpenSection: (section: RecordSection) => void;
};

function MobileDock({
  activeSection,
  onHome,
  onOpenSection
}: MobileDockProps) {
  return (
    <nav className="mobile-dock" aria-label="Mobile archive sections">
      <button className={activeSection === "setup" ? "is-active" : ""} type="button" onClick={() => onOpenSection("setup")}>
        <span className="nav-mark" data-icon="setup" aria-hidden="true" />
        <small>Setup</small>
      </button>
      <button className={activeSection === "logs" ? "is-active" : ""} type="button" onClick={() => onOpenSection("logs")}>
        <span className="nav-mark" data-icon="logs" aria-hidden="true" />
        <small>Logs</small>
      </button>
      <button className={activeSection === "system" ? "is-active is-center" : "is-center"} type="button" onClick={onHome}>
        <span className="nav-mark" data-icon="system" aria-hidden="true" />
        <small>Dashboard</small>
      </button>
      <button className={activeSection === "games" ? "is-active" : ""} type="button" onClick={() => onOpenSection("games")}>
        <span className="nav-mark" data-icon="games" aria-hidden="true" />
        <small>Games</small>
      </button>
      <button className={activeSection === "projects" ? "is-active" : ""} type="button" onClick={() => onOpenSection("projects")}>
        <span className="nav-mark" data-icon="projects" aria-hidden="true" />
        <small>Projects</small>
      </button>
    </nav>
  );
}

type SidebarProps = {
  activeSection: RecordSection;
  metrics: ArchiveMetrics;
  navOpen: boolean;
  now: Date | null;
  onHome: () => void;
  onOpenSection: (section: RecordSection) => void;
  onToggleNav: () => void;
};

function Sidebar({
  activeSection,
  metrics,
  navOpen,
  now,
  onHome,
  onOpenSection,
  onToggleNav
}: SidebarProps) {
  const activeConfig = sections.find((section) => section.id === activeSection) ?? sections[0];

  return (
    <aside className="sidebar">
      <div className="brand-block">
        <div className="mobile-brand-meta">
          <span>v1.26.2</span>
          <span>HANDHELD FIELD MODE</span>
        </div>
        <div className="mobile-clock" aria-label="Archive date">
          <span>{formatDate(now)}</span>
        </div>
        <div className="brand-row">
          <button className="brand" type="button" onClick={onHome}>
            GESTALT
          </button>
          <button
            className={navOpen ? "archive-menu-toggle is-active" : "archive-menu-toggle"}
            type="button"
            aria-expanded={navOpen}
            aria-label="Open archive navigation"
            onClick={onToggleNav}
          >
            <span className="archive-menu-glyph" aria-hidden="true">
              <i />
            </span>
            <span className="archive-menu-code">{activeConfig.code}</span>
          </button>
        </div>
        <div className="desktop-brand-meta">
          <span className="version-label">v1.26.2</span>
          <span className="desktop-mode-label">OPERATOR DESK MODE</span>
        </div>
        <i aria-hidden="true">-</i>
      </div>

      <nav aria-label="Archive navigation">
        <p className="sidebar-label">// ARCHIVE NAVIGATION</p>
        <div className="nav-stack">
          {sections.map((section) => (
            <div className="nav-group" key={section.id}>
              <button
                type="button"
                className={activeSection === section.id ? "nav-trigger is-active" : "nav-trigger"}
                onClick={() => onOpenSection(section.id)}
              >
                <span className="nav-mark" data-icon={section.icon} aria-hidden="true" />
                <span className="nav-label">
                  <strong>{section.code}</strong>
                  <small className="nav-readable" data-cipher={section.cipher}>{section.label}</small>
                  <small className="nav-cipher" aria-hidden="true">{section.cipher}</small>
                </span>
                <span className="section-signal" aria-hidden="true" />
              </button>
            </div>
          ))}
        </div>
      </nav>

      <div className="system-status">
        <p>// SYSTEM STATUS</p>
        <dl>
          <div>
            <dt>USER</dt>
            <dd>Eightmouse</dd>
          </div>
          <div>
            <dt>RECORDS</dt>
            <dd>{metrics.recordCount}</dd>
          </div>
          <div>
            <dt>MEDIA</dt>
            <dd>{metrics.mediaCount}</dd>
          </div>
          <div>
            <dt>ACTIVE PRJ</dt>
            <dd>{metrics.activeProjects}</dd>
          </div>
          <div>
            <dt>ACTIVE GAME</dt>
            <dd>{metrics.activeGame?.title ?? "None"}</dd>
          </div>
          <div>
            <dt>LAST FILED</dt>
            <dd>{formatReadableDate(metrics.latestActivityDate)}</dd>
          </div>
          <div>
            <dt>OS VERSION</dt>
            <dd>GESTALT OS v1.26.2</dd>
          </div>
        </dl>
      </div>
    </aside>
  );
}

function ArchiveNavigationMenu({
  activeSection,
  currentGame,
  onClose,
  onOpenCurrent,
  onOpenSearch,
  onOpenSection,
  onOpenTimeline,
  onSearchQueryChange,
  searchQuery,
  searchOpen
}: {
  activeSection: RecordSection;
  currentGame?: RecordEntry;
  onClose: () => void;
  onOpenCurrent: () => void;
  onOpenSearch: () => void;
  onOpenSection: (section: RecordSection) => void;
  onOpenTimeline: () => void;
  onSearchQueryChange: (query: string) => void;
  searchQuery: string;
  searchOpen: boolean;
}) {
  const renderSectionButton = (section: (typeof sections)[number]) => (
    <div className="nav-group" key={section.id}>
      <button
        type="button"
        className={activeSection === section.id ? "nav-trigger is-active" : "nav-trigger"}
        onClick={() => onOpenSection(section.id)}
      >
        <span className="nav-mark" data-icon={section.icon} aria-hidden="true" />
        <span className="nav-label">
          <strong>{section.code}</strong>
          <small className="nav-readable" data-cipher={section.cipher}>{section.label}</small>
          <small className="nav-cipher" aria-hidden="true">{section.cipher}</small>
        </span>
        <span className="section-signal" aria-hidden="true" />
      </button>
    </div>
  );

  const archiveSections = sections.filter((section) => section.id === "archive");

  return (
    <>
      <motion.button
        aria-label="Close archive navigation"
        className="archive-nav-backdrop"
        type="button"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      />
      <motion.nav
        aria-label="Archive navigation"
        className="archive-nav-panel"
        initial={{ opacity: 0, x: -18, filter: "blur(2px)" }}
        animate={{ opacity: 1, x: 0, filter: "blur(0)" }}
        exit={{ opacity: 0, x: -18, filter: "blur(2px)" }}
        transition={{ duration: 0.18, ease: "easeOut" }}
      >
        <header>
          <p>// ARCHIVE NAVIGATION</p>
          <span>UTILITY / DEEP ARCHIVE</span>
        </header>
        <div className="archive-nav-actions archive-nav-actions--desktop" aria-label="Quick archive actions">
          <button className={searchOpen ? "is-active" : ""} type="button" onClick={onOpenSearch}>
            <span>⌕</span>
            Search
          </button>
          <button type="button" onClick={onOpenTimeline}>
            <span>⌬</span>
            Trace
          </button>
          <button disabled={!currentGame} type="button" onClick={onOpenCurrent}>
            <span>◇</span>
            Current
          </button>
          <button type="button" onClick={() => onOpenSection("logs")}>
            <span>{"\u2261"}</span>
            Logs
          </button>
        </div>
        <div className="archive-nav-search archive-nav-search--mobile" role="search">
          <label htmlFor="mobile-archive-search">// SEARCH</label>
          <input
            id="mobile-archive-search"
            type="search"
            value={searchQuery}
            placeholder="Search records"
            autoComplete="off"
            onChange={(event) => onSearchQueryChange(event.target.value)}
          />
        </div>
        <div className="archive-nav-actions archive-nav-actions--mobile" aria-label="Mobile archive actions">
          <button type="button" onClick={onOpenTimeline}>
            <span>{"\u232C"}</span>
            Trace
          </button>
          <button disabled={!currentGame} type="button" onClick={onOpenCurrent}>
            <span>{"\u25C7"}</span>
            Current
          </button>
        </div>
        <div className="nav-stack nav-stack--desktop">
          {sections.map(renderSectionButton)}
        </div>
        <div className="nav-stack nav-stack--mobile-archive">
          {archiveSections.map(renderSectionButton)}
        </div>
      </motion.nav>
    </>
  );
}

function SearchPanel({
  panelRef,
  query,
  results,
  onOpenResult,
  onQueryChange
}: {
  panelRef: RefObject<HTMLDivElement | null>;
  query: string;
  results: SearchResult[];
  onOpenResult: (result: SearchResult) => void;
  onQueryChange: (query: string) => void;
}) {
  return (
    <div className="search-panel command-panel" ref={panelRef} role="search">
      <label htmlFor="archive-search" data-cipher={cipherizeText("COMMAND PALETTE")}>// COMMAND PALETTE</label>
      <input
        autoComplete="off"
        autoFocus
        id="archive-search"
        onChange={(event) => onQueryChange(event.target.value)}
        placeholder="Search records or type a command"
        type="search"
        value={query}
      />
      <div className="search-suggestions">
        {results.length > 0 ? (
          results.map((result) => (
            <button key={result.kind === "record" ? result.record.id : result.id} type="button" onClick={() => onOpenResult(result)}>
              <span>
                <strong>
                  {result.kind === "record" ? result.record.title : result.title}
                </strong>
                <small data-cipher={cipherizeText(result.detail)}>
                  {result.detail}
                </small>
              </span>
              <i>{result.kind === "record" ? result.record.section.toUpperCase() : "CMD"}</i>
            </button>
          ))
        ) : (
          <p className="search-empty">No matching command or record.</p>
        )}
      </div>
    </div>
  );
}

function TimelineWindow({
  items,
  onClose,
  onOpenRecord
}: {
  items: TimelineItem[];
  onClose: () => void;
  onOpenRecord: (record: RecordEntry, content: ContentKey) => void;
}) {
  return (
    <motion.article
      className="timeline-window"
      aria-label="Archive timeline"
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 14 }}
      transition={{ duration: 0.18 }}
    >
      <header className="window-bar">
        <span>// TIMELINE RECONSTRUCTION</span>
        <div className="window-actions">
          <button type="button" data-window-action="close" aria-label="Close timeline" onClick={onClose}>
            close
          </button>
        </div>
      </header>
      <div className="timeline-body">
        <div className="timeline-summary">
          <p>RECENT SIGNALS</p>
          <strong>{items.length}</strong>
          <span>records and notes sorted by observed date</span>
        </div>
        <ol className="timeline-list">
          {items.map((item) => (
            <li key={item.id}>
              <time>{formatReadableDate(item.date)}</time>
              <button type="button" onClick={() => onOpenRecord(item.record, item.content)}>
                <span>{item.title}</span>
                <small>{item.detail}</small>
              </button>
            </li>
          ))}
        </ol>
      </div>
    </motion.article>
  );
}

type RecordWindowProps = {
  initialContent: ContentKey;
  maximized: boolean;
  record: RecordEntry;
  onClose: () => void;
  onMinimize: () => void;
  onMaximize: () => void;
};

function RecordWindow({ initialContent, maximized, record, onClose, onMinimize, onMaximize }: RecordWindowProps) {
  if (record.section === "setup") {
    return <SetupRecordWindow maximized={maximized} record={record} onClose={onClose} onMinimize={onMinimize} onMaximize={onMaximize} />;
  }

  return <ArchiveRecordWindow initialContent={initialContent} maximized={maximized} record={record} onClose={onClose} onMinimize={onMinimize} onMaximize={onMaximize} />;
}

function ArchiveRecordWindow({ initialContent, maximized, record, onClose, onMinimize, onMaximize }: RecordWindowProps) {
  const contents = getRecordContents(record);
  const [activeContent, setActiveContent] = useState<ContentKey>(initialContent);
  const [noteSearchQuery, setNoteSearchQuery] = useState("");
  const [updateHistoryOpen, setUpdateHistoryOpen] = useState(false);
  const updateHistoryRef = useRef<HTMLDivElement | null>(null);
  const headerImage = recordHeaderImage(record);

  useEffect(() => {
    setActiveContent(initialContent);
    setNoteSearchQuery("");
    setUpdateHistoryOpen(false);
  }, [initialContent, record.id]);

  useEffect(() => {
    if (!updateHistoryOpen) {
      return;
    }

    const closeUpdateHistory = (event: MouseEvent) => {
      const target = event.target;

      if (!(target instanceof Element) || updateHistoryRef.current?.contains(target) || target.closest(".update-history-window")) {
        return;
      }

      setUpdateHistoryOpen(false);
    };

    document.addEventListener("mousedown", closeUpdateHistory);
    return () => document.removeEventListener("mousedown", closeUpdateHistory);
  }, [updateHistoryOpen]);

  return (
    <>
    <motion.article
      className={`${maximized ? "record-window is-maximized" : "record-window"}${updateHistoryOpen ? " has-index-modal" : ""}${record.section === "setup" ? " is-setup-record" : ""}`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      aria-label={`${record.title} archive entry`}
    >
      <header className="window-bar">
        <span>{record.section === "setup" ? "// SETUP TERMINAL" : "// ARCHIVE ENTRY"}</span>
        <div className="window-actions">
          <button type="button" data-window-action="minimize" onClick={onMinimize} aria-label="Minimize record">
            <Minimize2 size={14} />
          </button>
          <button type="button" data-window-action="maximize" onClick={onMaximize} aria-label="Maximize record">
            <Maximize2 size={14} />
          </button>
          <button type="button" data-window-action="close" onClick={onClose} aria-label="Close record">
            <X size={15} />
          </button>
        </div>
      </header>

      <div className="record-layout">
        <div className="record-main">
          <div
            className={`${headerImage ? "record-heading has-heading-banner" : "record-heading"}${record.section === "setup" ? " setup-record-heading" : ""}`}
          >
            {headerImage ? <img className="heading-banner-image" src={headerImage} alt="" decoding="async" /> : null}
            <span className="record-kind">{record.type.toUpperCase()}</span>
            <span className="record-id">#{record.section.slice(0, 3).toUpperCase()}-{record.priority.toString().padStart(3, "0")}</span>
            <h2>
              <span
                className={record.title.length > 26 ? "record-title-text is-long-title" : "record-title-text"}
                style={{ "--record-title-chars": record.title.length } as CSSProperties}
              >
                {record.title}
              </span>
            </h2>
            <p>
              Status: {record.status}
              <span>.</span>
              Type: {record.type}
              {record.started ? (
                <>
                  <span>.</span>
                  Started: {formatReadableDate(record.started)}
                </>
              ) : null}
            </p>
          </div>

          <RecordContentPanel activeContent={activeContent} noteSearchQuery={noteSearchQuery} record={record} />
        </div>

        <aside className="record-aside">
          <div>
            <h3>CONTENTS</h3>
            <ol>
              {contents.map((item, index) => (
                <li className={activeContent === item.key ? "is-active" : ""} key={item.key}>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveContent(item.key);
                      if (item.key !== "notes") {
                        setNoteSearchQuery("");
                      }
                      setUpdateHistoryOpen(false);
                    }}
                  >
                    {contentOrdinal(record, index)}_{item.label}
                  </button>
                </li>
              ))}
            </ol>
          </div>

          <dl className="record-meta">
            <div>
              <dt>Created:</dt>
              <dd>{record.started ? formatReadableDate(record.started) : "Unknown"}</dd>
            </div>
            <div>
              <dt>Last Updated:</dt>
              <dd>{formatReadableDate(record.updated)}</dd>
            </div>
          </dl>
          {activeContent === "notes" ? (
            <NoteSearchBox query={noteSearchQuery} record={record} onQueryChange={setNoteSearchQuery} />
          ) : null}
          {record.section === "games" || activeContent === "notes" ? null : (
            <UpdateHistory body={record.body} containerRef={updateHistoryRef} isOpen={updateHistoryOpen} onToggle={() => setUpdateHistoryOpen((current) => !current)} />
          )}
        </aside>

      </div>
      {updateHistoryOpen && record.section !== "games" ? <UpdateHistoryModal body={record.body} onClose={() => setUpdateHistoryOpen(false)} /> : null}
    </motion.article>
    </>
  );
}

function SetupRecordWindow({ maximized, record, onClose, onMinimize, onMaximize }: Omit<RecordWindowProps, "initialContent">) {
  const profile = setupProfile(record);
  const headerImage = recordHeaderImage(record) || record.banner;
  const notes = setupNarrativeNotes(record);
  const specs = profile.specs.length > 0
    ? profile.specs
    : [
        { label: "STATUS", value: record.status },
        { label: "UPDATED", value: formatReadableDate(record.updated) },
        { label: "PROGRESS", value: `${record.progress}%` }
      ];

  return (
    <motion.article
      className={`${maximized ? "record-window is-maximized" : "record-window"} is-setup-record`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      aria-label={`${record.title} setup terminal`}
    >
      <div className="setup-window-shell">
        <section className="setup-console" aria-label={`${record.title} machine profile`}>
          <div className="setup-console-prompt">
            <div className="setup-prompt-command">
              <span>eightmouse@gestalt</span>
              <i>:</i>
              <span>{setupPathFor(record)}</span>
              <i>$</i>
              <strong>{profile.command}</strong>
            </div>
            <div className="window-actions setup-window-actions">
              <button type="button" data-window-action="minimize" onClick={onMinimize} aria-label="Minimize setup terminal">
                <Minimize2 size={14} />
              </button>
              <button type="button" data-window-action="maximize" onClick={onMaximize} aria-label="Maximize setup terminal">
                <Maximize2 size={14} />
              </button>
              <button type="button" data-window-action="close" onClick={onClose} aria-label="Close setup terminal">
                <X size={15} />
              </button>
            </div>
          </div>

          <div className="setup-console-body">
            <div className={headerImage ? "setup-terminal-avatar has-image" : "setup-terminal-avatar"} aria-hidden="true">
              {headerImage ? <img src={headerImage} alt="" decoding="async" loading="lazy" /> : null}
              <span />
              <span />
              <span />
              <span />
            </div>

            <div className="setup-fetch setup-fetch--terminal">
              <p className="setup-command">&gt; profile.loaded / public-safe</p>
              <h2>{record.title}</h2>
              {record.summary ? <p className="setup-motd">{record.summary}</p> : null}
              <dl>
                <div>
                  <dt>TYPE</dt>
                  <dd>{profile.category}</dd>
                </div>
                <div>
                  <dt>STATE</dt>
                  <dd>{record.status}</dd>
                </div>
                <div>
                  <dt>UPDATED</dt>
                  <dd>{formatReadableDate(record.updated)}</dd>
                </div>
                {specs.map((spec, index) => (
                  <div key={`${spec.label}-${index}`}>
                    <dt>{spec.label}</dt>
                    <dd>{spec.value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        </section>

        {notes.length > 0 ? (
          <section className="setup-console setup-notes-terminal" aria-label={`${record.title} setup notes`}>
            <div className="setup-console-prompt">
              <span>eightmouse@gestalt</span>
              <i>:</i>
              <span>{setupPathFor(record)}</span>
              <i>$</i>
              <strong>cat notes.log</strong>
            </div>
            <div className="setup-note-stack">
              {notes.map((note) => (
                <article className="setup-note" key={note.title}>
                  <h3>// {note.title}</h3>
                  <RecordBody body={note.body} />
                </article>
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </motion.article>
  );
}

function getRecordContents(record: RecordEntry): Array<{ key: ContentKey; label: string }> {
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
      { key: "notes", label: "Full Note" },
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

function contentOrdinal(record: RecordEntry, index: number): string {
  return String(record.section === "projects" ? index : index + 1).padStart(2, "0");
}

function getTextList(value: unknown): string[] {
  return metaText(value)
    .split(/\r?\n|\|/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function RecordContentPanel({ activeContent, noteSearchQuery, record }: { activeContent: ContentKey; noteSearchQuery: string; record: RecordEntry }) {
  if (activeContent === "overview") {
    return <RecordOverviewPage record={record} />;
  }

  if (activeContent === "samples") {
    return <SampleGrid record={record} />;
  }

  if (activeContent === "attachments") {
    return <MediaPopupField prefix="ATTACH" record={record} title="ATTACHMENTS" />;
  }

  if (activeContent === "notes") {
    return <NotesPage query={noteSearchQuery} record={record} />;
  }

  if (activeContent === "technical") {
    const stackItems = getTextList(record.meta.technicalStack);

    return (
      <section className="content-terminal" aria-label={`${record.title} technical stack`}>
        <div className="terminal-title">// TECHNICAL STACK</div>
        <div className="detail-list">
          {(stackItems.length > 0 ? stackItems : ["Next.js App Router", "MDX records", "restrained panel transitions", "lightweight local archive state", "public-safe content files only"]).map((item) => (
            <p key={item}>&gt; {item}</p>
          ))}
        </div>
      </section>
    );
  }

  if (activeContent === "hardware") {
    const hardware = setupHardwareSource(record);

    return (
      <section className="content-terminal setup-terminal" aria-label={`${record.title} setup details`}>
        <div className="terminal-title">// HARDWARE</div>
        <RecordBody body={hardware} />
      </section>
    );
  }

  if (activeContent === "recommendation") {
    const recommendation = metaText(record.meta.recommendation) || "Recommendation stays pending until the session has enough time behind it. Current notes are being kept as observations, not a final verdict.";

    return (
      <section className="content-terminal" aria-label={`${record.title} recommendation`}>
        <div className="terminal-title">// RECOMMENDATION</div>
        <div className="status-grid">
          <div className="status-cell">
            <span>STATUS</span>
            <strong>{record.status}</strong>
          </div>
          <div className="status-cell">
            <span>PROGRESS</span>
            <strong>{record.progress}%</strong>
          </div>
        </div>
        <p className="terminal-copy">{recommendation}</p>
      </section>
    );
  }

  if (activeContent === "changelog") {
    return (
      <section className="content-terminal" aria-label={`${record.title} change log`}>
        <div className="terminal-title">// CHANGE LOG</div>
        <div className="status-grid">
          <div className="status-cell">
            <span>CREATED</span>
            <strong>{record.started ? formatReadableDate(record.started) : "Unknown"}</strong>
          </div>
          <div className="status-cell">
            <span>UPDATED</span>
            <strong>{formatReadableDate(record.updated)}</strong>
          </div>
          <div className="status-cell">
            <span>STATE</span>
            <strong>{record.status}</strong>
          </div>
        </div>
      </section>
    );
  }

  return null;
}

function RecordOverviewPage({ record }: { record: RecordEntry }) {
  const headerImage = recordHeaderImage(record);

  return (
    <div className="overview-stack">
      {headerImage ? null : <RecordBanner record={record} />}

      <section className="record-section">
        <h3>// OVERVIEW</h3>
        <p>{record.summary}</p>
      </section>

      <section className="record-section">
        <div className="section-row">
          <h3>// CURRENT PROGRESS</h3>
          <span>{record.progress}%</span>
        </div>
        <ProgressMeter value={record.progress} />
        {record.milestones.length > 0 ? <MilestoneList record={record} /> : null}
      </section>
    </div>
  );
}

function RecordBanner({ record }: { record: RecordEntry }) {
  if (record.banner) {
    return (
      <div className="banner-frame">
        <img src={record.banner} alt="" decoding="async" loading="lazy" />
      </div>
    );
  }

  return (
    <div className="empty-banner">
      <Cpu size={28} />
    </div>
  );
}

function MilestoneList({ record }: { record: RecordEntry }) {
  return (
    <div className="milestone-list">
      {record.milestones.map((milestone) => (
        <div key={`${record.id}-${milestone.label}`} className="milestone">
          <span>&gt; {milestone.label}</span>
          <ProgressBlocks value={milestone.progress} />
          <em>{milestone.status}</em>
        </div>
      ))}
    </div>
  );
}

function MediaPopupField({ prefix, record, title }: { prefix: string; record: RecordEntry; title: string }) {
  const mediaSources = recordMediaSources(record, "attachments");
  const [expandedImage, setExpandedImage] = useState<{ alt: string; src: string } | null>(null);

  return (
    <section className="content-terminal" aria-label={`${record.title} media`}>
      <div className="terminal-title">// {title}</div>
      <div className="media-alert-field">
        <div className="media-alert-header">
          <span>MEDIA</span>
          <i>MAX_06</i>
        </div>
        <div className="media-popup-layer">
          {Array.from({ length: 6 }).map((_, index) => {
            const slot = index + 1;
            const imageSource = mediaSources[index];

            return (
              <button
                className="media-popup"
                disabled={!imageSource}
                style={{ "--slot": slot } as CSSProperties}
                type="button"
                key={`${record.id}-media-${slot}`}
                onClick={() => imageSource && setExpandedImage({ alt: `${record.title} attachment ${slot}`, src: imageSource })}
              >
                <span>
                {prefix}_{String(slot).padStart(2, "0")}
              </span>
              <div className="media-frame">
                {imageSource ? <img src={imageSource} alt="" decoding="async" loading="lazy" /> : <div className="media-placeholder">NO CAPTURE</div>}
              </div>
              <i>{imageSource ? "Primary capture" : "Awaiting media"}</i>
            </button>
            );
          })}
        </div>
      </div>
      {expandedImage ? (
        <button className="note-image-lightbox" type="button" aria-label="Close expanded attachment" onClick={() => setExpandedImage(null)}>
          <img src={expandedImage.src} alt={expandedImage.alt} decoding="async" />
        </button>
      ) : null}
    </section>
  );
}

function SampleGrid({ record }: { record: RecordEntry }) {
  const mediaSources = recordMediaSources(record, "samples");
  const [expandedImage, setExpandedImage] = useState<{ alt: string; src: string } | null>(null);

  return (
    <section className="content-terminal" aria-label={`${record.title} sample media`}>
      <div className="terminal-title">// SAMPLE</div>
      <div className="sample-kicker">Media</div>
      <div className="sample-grid" aria-label={`${record.title} media samples`}>
        {Array.from({ length: 6 }).map((_, index) => {
          const slot = index + 1;
          const imageSource = mediaSources[index];

          return (
            <button
              className="sample-terminal"
              disabled={!imageSource}
              type="button"
              key={`${record.id}-sample-${slot}`}
              onClick={() => imageSource && setExpandedImage({ alt: `${record.title} sample ${slot}`, src: imageSource })}
            >
              <span>MEDIA_{String(slot).padStart(2, "0")}</span>
              <div className="sample-frame">
                {imageSource ? <img src={imageSource} alt="" decoding="async" loading="lazy" /> : <div className="media-placeholder">NO MEDIA</div>}
              </div>
              <i>{imageSource ? "Primary sample" : "Awaiting sample"}</i>
            </button>
          );
        })}
      </div>
      {expandedImage ? (
        <button className="note-image-lightbox" type="button" aria-label="Close expanded sample" onClick={() => setExpandedImage(null)}>
          <img src={expandedImage.src} alt={expandedImage.alt} decoding="async" />
        </button>
      ) : null}
    </section>
  );
}

function recordMediaSources(record: RecordEntry, key: "attachments" | "samples"): string[] {
  const sources = record.meta[key];
  const list = Array.isArray(sources)
    ? sources.map((item) => String(item))
    : typeof sources === "string"
      ? sources.split(/\r?\n|,/)
      : [];

  if (list.length > 0) {
    return list.map((item) => item.trim()).filter(Boolean).slice(0, 6);
  }

  return record.banner ? [record.banner] : [];
}

function NoteSearchBox({ onQueryChange, query, record }: { onQueryChange: (value: string) => void; query: string; record: RecordEntry }) {
  const notes = noteEntries(record.body);

  if (!notes.length) {
    return null;
  }

  return (
    <div className="note-search-panel">
      <label htmlFor={`${record.id}-note-search`}>Search note</label>
      <input
        autoComplete="off"
        id={`${record.id}-note-search`}
        list={`${record.id}-note-suggestions`}
        onChange={(event) => onQueryChange(event.target.value)}
        placeholder="Title or date"
        type="search"
        value={query}
      />
      <datalist id={`${record.id}-note-suggestions`}>
        {notes.map((note) => (
          <option key={note.title} value={note.title} />
        ))}
      </datalist>
    </div>
  );
}

function NotesPage({ query, record }: { query: string; record: RecordEntry }) {
  const notes = noteEntries(record.body);
  const indexedNotes = notes.map((note, index) => ({ ...note, index }));
  const cleanQuery = query.trim().toLowerCase();
  const filteredNotes = cleanQuery ? indexedNotes.filter((note) => note.title.toLowerCase().includes(cleanQuery)) : indexedNotes;

  return (
    <section className="content-terminal notes-page" aria-label={`${record.title} notes`}>
      <div className="notes-page-header">
        <div className="terminal-title">// NOTES PAGE</div>
      </div>
      <div className="note-stack">
        {filteredNotes.length > 0 ? (
          filteredNotes.map((note) => (
            <NoteEntry body={note.body} defaultOpen={note.index === 0} key={note.title} title={note.title} />
          ))
        ) : (
          <p className="notes-empty">No note matches that signal.</p>
        )}
      </div>
    </section>
  );
}

function NoteEntry({ body, defaultOpen, title }: { body: string; defaultOpen: boolean; title: string }) {
  const detailsRef = useRef<HTMLDetailsElement | null>(null);
  const initializedRef = useRef(false);

  useEffect(() => {
    if (!initializedRef.current && detailsRef.current) {
      detailsRef.current.open = defaultOpen;
      initializedRef.current = true;
    }
  }, [defaultOpen]);

  return (
    <details className="note-entry" ref={detailsRef}>
      <summary>
        <span>{title}</span>
        <i>open</i>
      </summary>
      <div className="note-entry-body">
        <RecordBody body={body} />
      </div>
    </details>
  );
}

type NoteMediaOptions = {
  align: "left" | "center" | "right";
  caption: string;
  fit: "contain" | "crop";
  position: "top" | "center" | "bottom";
  size: "default" | "wide" | "banner" | "small";
};

function RecordBody({ body }: { body: string }) {
  const [expandedImage, setExpandedImage] = useState<{ alt: string; src: string } | null>(null);
  const lines = body.split(/\r?\n/);
  const nodes: React.ReactNode[] = [];

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const key = `${index}-${line}`;
    const notePrefix = line.startsWith(":::previous-note ") ? ":::previous-note " : ":::note ";

    if (line.startsWith(":::note ") || line.startsWith(":::previous-note ")) {
      const title = line.slice(notePrefix.length).trim() || "Previous note";
      const innerLines: string[] = [];

      index += 1;

      while (index < lines.length && lines[index].trim() !== ":::") {
        innerLines.push(lines[index]);
        index += 1;
      }

      nodes.push(
        <details className="note-entry" key={key}>
          <summary>
            <span>{title}</span>
            <i>open</i>
          </summary>
          <div className="note-entry-body">
            <RecordBody body={innerLines.join("\n")} />
          </div>
        </details>
      );
      continue;
    }

    if (!line.trim()) {
      nodes.push(<br key={key} />);
      continue;
    }

    if (line.startsWith("## ")) {
      nodes.push(<h4 key={key}>// {line.slice(3)}</h4>);
      continue;
    }

    if (line.startsWith("### ")) {
      nodes.push(<h5 key={key}>{line.slice(4)}</h5>);
      continue;
    }

    const imageMatch = line.match(/^!\[(.*?)]\((.*?)\)$/);

    if (imageMatch) {
      const media = parseNoteMediaOptions(imageMatch[1]);

      nodes.push(
        <figure className={noteMediaClassName(media)} key={key}>
          <button className="note-media-button" type="button" onClick={() => setExpandedImage({ alt: media.caption, src: imageMatch[2] })}>
            <img src={imageMatch[2]} alt={media.caption} decoding="async" loading="lazy" />
          </button>
          {media.caption ? <figcaption>{media.caption}</figcaption> : null}
        </figure>
      );
      continue;
    }

    if (line.startsWith("- [x] ")) {
      nodes.push(
        <p className="check-line" key={key}>
          <span>[x]</span>
          {line.slice(6)}
        </p>
      );
      continue;
    }

    if (line.startsWith("- [ ] ")) {
      nodes.push(
        <p className="check-line is-open" key={key}>
          <span>[ ]</span>
          {line.slice(6)}
        </p>
      );
      continue;
    }

    if (line.startsWith("- ")) {
      nodes.push(
        <p className="bullet-line" key={key}>
          <span>&gt;</span>
          {line.slice(2)}
        </p>
      );
      continue;
    }

    if (line.startsWith("> ")) {
      nodes.push(<blockquote key={key}>{line.slice(2)}</blockquote>);
      continue;
    }

    nodes.push(<p key={key}>{line}</p>);
  }

  return (
    <div className="record-body">
      {nodes}
      {expandedImage ? (
        <button className="note-image-lightbox" type="button" aria-label="Close expanded image" onClick={() => setExpandedImage(null)}>
          <img src={expandedImage.src} alt={expandedImage.alt} decoding="async" />
        </button>
      ) : null}
    </div>
  );
}

function parseNoteMediaOptions(rawAlt: string): NoteMediaOptions {
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

function isNoteMediaToken(value: string): boolean {
  return ["wide", "banner", "small", "left", "right", "center", "top", "bottom", "crop", "contain", "no-caption"].includes(value.toLowerCase());
}

function noteMediaClassName(media: NoteMediaOptions): string {
  return [
    "note-media",
    `note-media--${media.size}`,
    `note-media--${media.align}`,
    `note-media--${media.fit}`,
    `note-media--${media.position}`
  ].join(" ");
}

function UpdateHistory({ body, containerRef, isOpen, onToggle }: { body: string; containerRef: RefObject<HTMLDivElement | null>; isOpen: boolean; onToggle: () => void }) {
  const { updates } = splitUpdateIndex(body);

  if (!updates.length) {
    return null;
  }

  return (
    <div className="update-history" ref={containerRef}>
      <button type="button" aria-expanded={isOpen} onClick={onToggle}>
        <span>UPDATE INDEX</span>
        <i>{updates.length}</i>
      </button>
    </div>
  );
}

function UpdateHistoryModal({ body, onClose }: { body: string; onClose: () => void }) {
  const { updates } = splitUpdateIndex(body);

  if (!updates.length) {
    return null;
  }

  return (
    <>
      <button className="update-history-backdrop" type="button" aria-label="Close update index" onClick={onClose} />
      <div className="update-history-window" role="dialog" aria-label="Update index">
        <header>
          <span>// UPDATE INDEX</span>
        </header>
        <ol>
          {updates.map((update) => (
            <li key={update}>{update}</li>
          ))}
        </ol>
      </div>
    </>
  );
}

function ProgressMeter({ value }: { value: number }) {
  return (
    <div className="progress-meter" aria-label={`${value}%`}>
      <span style={{ inlineSize: `${value}%` }} />
    </div>
  );
}

function ProgressBlocks({ value }: { value: number }) {
  const filledBlocks = Math.round((Math.max(0, Math.min(100, value)) / 100) * 24);

  return (
    <span className="progress-blocks" aria-label={`${value}%`}>
      {Array.from({ length: 24 }).map((_, index) => (
        <i className={index < filledBlocks ? "is-filled" : ""} key={index} />
      ))}
    </span>
  );
}

function getGreeting(date: Date | null): string {
  if (!date) {
    return "Opening archive.";
  }

  const hour = date.getHours();

  if (hour < 12) {
    return "Good morning.";
  }

  if (hour < 18) {
    return "Good afternoon.";
  }

  return "Good evening.";
}

function dailyLatinSaying(date: Date | null) {
  const source = date ?? new Date();
  const seed = source.getFullYear() * 372 + (source.getMonth() + 1) * 31 + source.getDate();

  return latinSayings[seed % latinSayings.length];
}

function dashboardSubtext(date: Date | null): string {
  const saying = dailyLatinSaying(date);

  return `${saying.latin} / ${saying.english}`;
}

function getTimelineItems(records: RecordEntry[], limit: number): TimelineItem[] {
  return records
    .filter((record) => record.section !== "system")
    .flatMap((record) => {
      const items: TimelineItem[] = [
        {
          content: "overview",
          date: activityDate(record),
          detail: `${record.type} / ${record.status}`,
          id: `${record.id}-activity-${activityDate(record)}`,
          record,
          title: `${record.title} updated`
        }
      ];

      noteEntries(record.body).forEach((note, index) => {
        const date = noteTitleDate(note.title);

        if (!date) {
          return;
        }

        items.push({
          content: "notes",
          date,
          detail: `${record.title} / Note ${index + 1}`,
          id: `${record.id}-note-${index}-${date}`,
          record,
          title: note.title
        });
      });

      return items;
    })
    .sort((a, b) => b.date.localeCompare(a.date) || a.record.priority - b.record.priority || a.title.localeCompare(b.title))
    .slice(0, limit);
}

function getSearchResults(records: RecordEntry[], query: string, currentGame?: RecordEntry, latestLog?: RecordEntry): SearchResult[] {
  const normalized = query.trim().toLowerCase();
  const commands: SearchCommand[] = [
    { kind: "command", id: "cmd-dashboard", title: "Open dashboard", detail: "Jump to system snapshot", section: "system" },
    { kind: "command", id: "cmd-timeline", title: "Open timeline", detail: "Reconstruct recent archive activity", action: "timeline" },
    { kind: "command", id: "cmd-projects", title: "Open projects", detail: "Browse active and filed processes", section: "projects" },
    { kind: "command", id: "cmd-games", title: "Open games", detail: "Browse session and past logs", section: "games" },
    { kind: "command", id: "cmd-logs", title: "Open logs", detail: "Browse field notes", section: "logs" },
    ...(currentGame ? [{ kind: "command" as const, id: "cmd-active-game", title: "Open active game", detail: currentGame.title, record: currentGame, content: "notes" as ContentKey }] : []),
    ...(latestLog ? [{ kind: "command" as const, id: "cmd-latest-log", title: "Open latest log", detail: latestLog.title, record: latestLog }] : [])
  ];

  if (!normalized) {
    const recentRecords = [...records]
      .filter((record) => record.section !== "system")
      .sort((a, b) => b.updated.localeCompare(a.updated))
      .slice(0, 4)
      .map<SearchResult>((record) => ({ kind: "record", record, detail: `${record.type} / ${record.status}` }));

    return [...commands.slice(0, 4), ...recentRecords].slice(0, 8);
  }

  const commandResults = commands.filter((command) => `${command.title} ${command.detail}`.toLowerCase().includes(normalized));
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

      return searchable.includes(normalized);
    })
    .sort((a, b) => {
      const aStarts = a.title.toLowerCase().startsWith(normalized) ? 0 : 1;
      const bStarts = b.title.toLowerCase().startsWith(normalized) ? 0 : 1;
      return aStarts - bStarts || b.updated.localeCompare(a.updated) || a.priority - b.priority;
    })
    .slice(0, 6)
    .map<SearchResult>((record) => ({ kind: "record", record, detail: `${record.type} / ${record.status}` }));

  return [...commandResults, ...recordResults].slice(0, 8);
}
