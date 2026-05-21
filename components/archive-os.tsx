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

const cipherGlyphs = ["⌖", "╳", "╵", "⌁", "⟐", "⌰", "⟟", "◇", "▤", "◌"];

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

type WeatherState = {
  label: string;
  temp: string;
  condition: string;
  meta: string;
  note: string;
  loading: boolean;
};

type WeatherLocation = {
  label: string;
  latitude: number;
  longitude: number;
};

type ArchiveMetrics = {
  activeGame?: RecordEntry;
  activeProjects: number;
  latestActivityDate: string;
  mediaCount: number;
  recordCount: number;
};

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
  const activeProjects = recordsBySection.projects
    .filter((record) => record.status !== "Archived")
    .sort((a, b) => b.updated.localeCompare(a.updated) || a.priority - b.priority);
  const currentGame = recordsBySection.games.find((record) => record.meta.dashboardActive === true)
    ?? recordsBySection.games.find((record) => record.status === "Playing")
    ?? recordsBySection.games[0];
  const latestLog = [...recordsBySection.logs].sort((a, b) => b.updated.localeCompare(a.updated) || a.priority - b.priority)[0];
  const activity = recentActivity(records, 4);
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

      if (searchRef.current?.contains(target) || target.closest("[data-search-toggle]")) {
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
    setActiveSection(section);
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
    setActiveSection("system");
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
  const headlineCipher = activeSection === "system" ? cipherizeText(headline) : activeSectionConfig.cipher;
  const subtext = activeSection === "system" ? dashboardSubtext(now) : "Browse the records filed under this archive.";
  const hasFocusWindow = panelOpen || timelineOpen;

  return (
    <main className={hasFocusWindow ? "archive-shell has-record" : "archive-shell"}>
      <div className="boot-screen" aria-hidden="true">
        <span>GESTALT</span>
        <i data-cipher={cipherizeText("System initializing")}>System initializing</i>
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
            onOpenLogs={() => openSection("logs")}
            onOpenSearch={openSearchFromNavigation}
            onOpenSection={openSection}
            onOpenTimeline={openTimeline}
            searchOpen={searchOpen}
          />
        ) : null}
      </AnimatePresence>

      <section className={hasFocusWindow ? "workspace has-record" : "workspace"} aria-label="Gestalt dashboard">
        <header className="workspace-header">
          <div>
            <p className="route-label">// {routeTitle}</p>
            <h1>
              <span
                aria-hidden="true"
                className="headline-cipher-fragment"
                key={`${activeSection}-cipher`}
              >
                {headlineCipher}
              </span>
              <span
                className="headline-text is-writing"
                key={activeSection}
                style={{ "--headline-chars": headline.length } as CSSProperties}
              >
                {headline}
              </span>
              <span
                className="cursor headline-cursor is-delayed"
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
        <div className={panelOpen ? "dashboard-grid is-muted" : "dashboard-grid"}>
          <DashboardPanel
            title="ACTIVE PROJECTS"
            className="wide-panel"
            footerLabel={`View all (${activeProjects.length})`}
            onFooter={() => openSection("projects")}
          >
            {activeProjects.length > 0 ? (
              <RecordList records={activeProjects.slice(0, 3)} onOpenRecord={openRecord} />
            ) : (
              <p className="subtle">No active projects filed yet.</p>
            )}
          </DashboardPanel>

          <DashboardPanel title="CURRENT GAME" footerLabel={currentGame ? "Read note" : undefined} onFooter={() => currentGame && openRecord(currentGame, "notes")}>
            {currentGame ? <CurrentGame record={currentGame} /> : <p className="subtle">No session active.</p>}
          </DashboardPanel>

          <DashboardPanel title="LOCAL WEATHER" className="weather-panel">
            <WeatherPanel />
          </DashboardPanel>

          <DashboardPanel title="MEMORY STATE" className="memory-panel">
            <MemoryLoop />
          </DashboardPanel>

          <DashboardPanel title="LATEST LOG" footerLabel="Read log" onFooter={() => latestLog && openRecord(latestLog)}>
            {latestLog ? (
              <div className="latest-log">
                <span>{shortDate(latestLog.updated)}</span>
                <p>{latestLog.summary}</p>
              </div>
            ) : (
              <p className="subtle">No field notes stored.</p>
            )}
          </DashboardPanel>

          <DashboardPanel title="RECENT ACTIVITY" className="wide-panel">
            {activity.length > 0 ? (
              <ol className="activity-feed">
                {activity.map((item) => (
                  <li key={item.record.id}>
                    <span>[{shortDate(item.date)}]</span>
                    <button type="button" onClick={() => openRecord(item.record)}>
                      {item.record.type}: {item.record.title}
                    </button>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="subtle">No activity filed yet.</p>
            )}
          </DashboardPanel>
        </div>
        ) : (
          <SectionPage records={recordsBySection[activeSection]} section={activeSectionConfig} onOpenRecord={openRecord} />
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
        <MobileDock
          activeSection={activeSection}
          currentGame={currentGame}
          onOpenCurrent={() => currentGame && openRecord(currentGame, "notes")}
          onOpenLogs={() => openSection("logs")}
          onOpenTimeline={openTimeline}
          onSearch={() => setSearchOpen((current) => !current)}
          searchOpen={searchOpen}
        />
      </section>
    </main>
  );
}

type MobileDockProps = {
  activeSection: RecordSection;
  currentGame?: RecordEntry;
  onOpenCurrent: () => void;
  onOpenLogs: () => void;
  onOpenTimeline: () => void;
  onSearch: () => void;
  searchOpen: boolean;
};

function MobileDock({
  activeSection,
  currentGame,
  onOpenCurrent,
  onOpenLogs,
  onOpenTimeline,
  onSearch,
  searchOpen
}: MobileDockProps) {
  return (
    <nav className="mobile-dock" aria-label="Mobile quick actions">
      <button className={searchOpen ? "is-active" : ""} type="button" onClick={onSearch}>
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
      <button className={activeSection === "logs" ? "is-active" : ""} type="button" onClick={onOpenLogs}>
        <span>▤</span>
        Logs
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
        <div className="mobile-brand-meta">
          <span>v1.24.4</span>
          <span>HANDHELD FIELD MODE</span>
        </div>
        <div className="mobile-clock" aria-label="Archive date">
          <span>{formatDate(now)}</span>
        </div>
        <span className="version-label">v1.24.4</span>
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
            <dd>GESTALT OS v1.24.4</dd>
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
  onOpenLogs,
  onOpenSearch,
  onOpenSection,
  onOpenTimeline,
  searchOpen
}: {
  activeSection: RecordSection;
  currentGame?: RecordEntry;
  onClose: () => void;
  onOpenCurrent: () => void;
  onOpenLogs: () => void;
  onOpenSearch: () => void;
  onOpenSection: (section: RecordSection) => void;
  onOpenTimeline: () => void;
  searchOpen: boolean;
}) {
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
          <span>{sections.length.toString().padStart(2, "0")} RECORD GROUPS</span>
        </header>
        <div className="archive-nav-actions" aria-label="Quick archive actions">
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
          <button className={activeSection === "logs" ? "is-active" : ""} type="button" onClick={onOpenLogs}>
            <span>▤</span>
            Logs
          </button>
        </div>
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
      </motion.nav>
    </>
  );
}

type DashboardPanelProps = {
  title: string;
  children: React.ReactNode;
  footerLabel?: string;
  className?: string;
  onFooter?: () => void;
};

function DashboardPanel({ title, children, footerLabel, className = "", onFooter }: DashboardPanelProps) {
  return (
    <article className={`dashboard-panel ${className}`}>
      <h2>{title}</h2>
      <div>{children}</div>
      {footerLabel ? (
        <button className="panel-link" type="button" onClick={onFooter}>
          {footerLabel} <span>-&gt;</span>
        </button>
      ) : null}
    </article>
  );
}

function WeatherPanel() {
  const [weather, setWeather] = useState<WeatherState>({
    label: "AUTO WEATHER",
    temp: "--",
    condition: "Awaiting signal",
    meta: "Approximate network signal",
    note: "No browser location prompt. Gestalt stores nothing.",
    loading: false
  });

  const requestWeather = async () => {
    if (weather.loading) {
      return;
    }

    if (typeof fetch !== "function") {
      setWeather((current) => ({
        ...current,
        condition: "Signal unavailable",
        meta: "This browser cannot read weather",
        note: "Weather remains client-side; no location is stored."
      }));
      return;
    }

    setWeather((current) => ({
      ...current,
      loading: true,
      condition: "Reading signal",
      meta: "Resolving approximate sky",
      note: "No browser permission dialog is required."
    }));

    try {
      const location = await resolveWeatherLocation();
      const latitude = location.latitude.toFixed(3);
      const longitude = location.longitude.toFixed(3);
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&timezone=auto`;
      const response = await fetch(url);
      const data = await response.json();
      const current = data.current ?? {};

      setWeather({
        label: "AUTO WEATHER",
        temp: Number.isFinite(current.temperature_2m) ? `${Math.round(current.temperature_2m)}C` : "--",
        condition: weatherCodeLabel(Number(current.weather_code)),
        meta: `Humidity ${current.relative_humidity_2m ?? "--"}% / Wind ${current.wind_speed_10m ?? "--"} kmh`,
        note: `Approximate sky: ${location.label}. Nothing is saved by Gestalt.`,
        loading: false
      });
    } catch {
      setWeather({
        label: "AUTO WEATHER",
        temp: "--",
        condition: "Signal interrupted",
        meta: "Weather endpoints did not respond",
        note: "Try again later; the archive remains offline-safe.",
        loading: false
      });
    }
  };

  useEffect(() => {
    void requestWeather();
    // The first read should happen once on mount; the refresh button handles later reads.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="weather-readout">
      <div className="weather-primary">
        <span className="weather-temp">{weather.temp}</span>
        <span className="weather-condition">{weather.condition}</span>
      </div>
      <div className="weather-meta">
        <span>{weather.label}</span>
        <span>{weather.meta}</span>
      </div>
      <p className="weather-note">{weather.note}</p>
      <button className="weather-action" type="button" disabled={weather.loading} onClick={requestWeather}>
        &gt; {weather.loading ? "Reading signal..." : "Refresh sky"}
      </button>
    </div>
  );
}

function MemoryLoop() {
  const memoryRef = useRef<HTMLDivElement | null>(null);
  const frameRef = useRef<number | null>(null);

  const setMemoryPointer = (x: number, y: number) => {
    const node = memoryRef.current;

    if (!node) {
      return;
    }

    node.style.setProperty("--memory-core-x", `${(x * 4).toFixed(2)}px`);
    node.style.setProperty("--memory-core-y", `${(y * 4).toFixed(2)}px`);
    node.style.setProperty("--memory-orbit-x", `${(x * -6).toFixed(2)}px`);
    node.style.setProperty("--memory-orbit-y", `${(y * -5).toFixed(2)}px`);
    node.style.setProperty("--memory-shard-x", `${(x * 7).toFixed(2)}px`);
    node.style.setProperty("--memory-shard-y", `${(y * 5).toFixed(2)}px`);
    node.style.setProperty("--memory-axis-x", `${(x * 2).toFixed(2)}px`);
    node.style.setProperty("--memory-axis-y", `${(y * 2).toFixed(2)}px`);
  };
  const clampPointer = (value: number) => Math.max(-1, Math.min(1, value));

  const handlePointerMove = (event: globalThis.PointerEvent) => {
    const node = memoryRef.current;

    if (!node) {
      return;
    }

    const rect = node.getBoundingClientRect();
    const x = clampPointer((event.clientX - (rect.left + rect.width / 2)) / (window.innerWidth / 2));
    const y = clampPointer((event.clientY - (rect.top + rect.height / 2)) / (window.innerHeight / 2));

    if (frameRef.current !== null) {
      window.cancelAnimationFrame(frameRef.current);
    }

    frameRef.current = window.requestAnimationFrame(() => {
      setMemoryPointer(x, y);
      frameRef.current = null;
    });
  };

  useEffect(() => {
    window.addEventListener("pointermove", handlePointerMove, { passive: true });

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);

      if (frameRef.current !== null) {
        window.cancelAnimationFrame(frameRef.current);
      }
    };
  }, []);

  return (
    <div className="memory-loop" aria-hidden="true" ref={memoryRef}>
      <span className="memory-core" />
      <span className="memory-orbit" />
      <span className="memory-gate" />
      <span className="memory-shard" />
      <span className="memory-rain" />
      <span className="memory-axis" />
      <span className="memory-cipher" />
      <span className="memory-nodes" />
    </div>
  );
}

function RecordList({ records, onOpenRecord }: { records: RecordEntry[]; onOpenRecord: (record: RecordEntry) => void }) {
  return (
    <div className="record-list">
      {records.map((record) => (
        <button key={record.id} type="button" onClick={() => onOpenRecord(record)}>
          <span>
            <strong>{record.title}</strong>
            <small>{record.status}</small>
          </span>
          <i>{record.progress}%</i>
        </button>
      ))}
    </div>
  );
}

function SectionPage({
  records,
  section,
  onOpenRecord
}: {
  records: RecordEntry[];
  section: (typeof sections)[number];
  onOpenRecord: (record: RecordEntry) => void;
}) {
  const sortedRecords = [...records].sort((a, b) => b.updated.localeCompare(a.updated) || a.priority - b.priority);
  const countLabel = `${sortedRecords.length} ${sortedRecords.length === 1 ? "record" : "records"}`;
  const splitSection = splitSectionRecords(section.id, sortedRecords);

  if (splitSection) {
    return (
      <section className="section-page section-page--split" aria-label={`${section.code} records`}>
        <header className="section-page-header">
          <span className="nav-mark" data-icon={section.icon} aria-hidden="true" />
          <div>
            <p>{section.code}</p>
            <h2>{section.label}</h2>
          </div>
          <i>{countLabel}</i>
        </header>

        <div className="section-split-grid">
          {splitSection.map((group) => (
            <section className="section-record-column" key={group.title} aria-label={group.title}>
              <header>
                <h3>{group.title}</h3>
                <span>{group.records.length}</span>
              </header>
              <div className="section-record-grid">
                {group.records.length > 0 ? (
                  group.records.map((record) => (
                    <SectionRecordButton key={record.id} record={record} onOpenRecord={onOpenRecord} />
                  ))
                ) : (
                  <p className="search-empty">No records filed here yet.</p>
                )}
              </div>
            </section>
          ))}
        </div>
      </section>
    );
  }

  return (
    <section className="section-page" aria-label={`${section.code} records`}>
      <header className="section-page-header">
        <span className="nav-mark" data-icon={section.icon} aria-hidden="true" />
        <div>
          <p>{section.code}</p>
          <h2>{section.label}</h2>
        </div>
        <i>{countLabel}</i>
      </header>

      <div className="section-record-grid">
        {sortedRecords.length > 0 ? (
          sortedRecords.map((record) => (
            <SectionRecordButton key={record.id} record={record} onOpenRecord={onOpenRecord} />
          ))
        ) : (
          <p className="search-empty">No records filed here yet.</p>
        )}
      </div>
    </section>
  );
}

function SectionRecordButton({ onOpenRecord, record }: { onOpenRecord: (record: RecordEntry) => void; record: RecordEntry }) {
  return (
    <button className="section-record" type="button" onClick={() => onOpenRecord(record)}>
      <span className="section-record-kind">{record.type}</span>
      <strong>{record.title}</strong>
      <span>{record.summary}</span>
      <i>
        {record.status} . {formatReadableDate(record.updated)}
      </i>
    </button>
  );
}

function splitSectionRecords(section: RecordSection, records: RecordEntry[]): Array<{ records: RecordEntry[]; title: string }> | null {
  if (section === "projects") {
    const activeStatuses = new Set(["active", "in progress", "planning", "blocked"]);

    return [
      { title: "ACTIVE PROJECTS", records: records.filter((record) => activeStatuses.has(record.status.toLowerCase())) },
      { title: "OTHER PROCESSES", records: records.filter((record) => !activeStatuses.has(record.status.toLowerCase())) }
    ];
  }

  if (section === "games") {
    const activeStatuses = new Set(["playing", "on hold", "in progress"]);

    return [
      { title: "SESSION LOGS", records: records.filter((record) => activeStatuses.has(record.status.toLowerCase())) },
      { title: "PAST LOGS", records: records.filter((record) => !activeStatuses.has(record.status.toLowerCase())) }
    ];
  }

  return null;
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
                <strong data-cipher={cipherizeText(result.kind === "record" ? result.record.title : result.title)}>
                  {result.kind === "record" ? result.record.title : result.title}
                </strong>
                <small>
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

function CurrentGame({ record }: { record: RecordEntry }) {
  return (
    <div className="current-game">
      <div className="game-cover">
        <img src={record.banner || "/images/archive-banner.png"} alt="" decoding="async" />
        <span>{record.title.slice(0, 10)}</span>
      </div>
      <div>
        <strong>{record.title}</strong>
        <span>{record.progress}% Complete</span>
        <span>{String(record.meta.playtime ?? "18.7h")} Play Time</span>
        <span>Last Played: {String(record.meta.lastPlayed ?? "Today")}</span>
      </div>
    </div>
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
      className={`${maximized ? "record-window is-maximized" : "record-window"}${updateHistoryOpen ? " has-index-modal" : ""}`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      aria-label={`${record.title} archive entry`}
    >
      <header className="window-bar">
        <span>// ARCHIVE ENTRY</span>
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
            className={headerImage ? "record-heading has-heading-banner" : "record-heading"}
          >
            {headerImage ? <img className="heading-banner-image" src={headerImage} alt="" decoding="async" /> : null}
            <span className="record-kind">{record.type.toUpperCase()}</span>
            <span className="record-id">#{record.section.slice(0, 3).toUpperCase()}-{record.priority.toString().padStart(3, "0")}</span>
            <h2>
              <span className="record-title-text is-writing" style={{ "--record-title-chars": record.title.length } as CSSProperties}>
                {record.title}
              </span>
              <span className="cursor record-title-cursor is-delayed" style={{ "--record-title-chars": record.title.length } as CSSProperties}>
                _
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

function recordHeaderImage(record: RecordEntry): string {
  return typeof record.meta.headerImage === "string" ? record.meta.headerImage : "";
}

function splitUpdateIndex(body: string): { mainBody: string; updates: string[] } {
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

function noteEntries(body: string): Array<{ title: string; body: string }> {
  const { mainBody } = splitUpdateIndex(body);
  const lines = mainBody.split(/\r?\n/);
  const notes: Array<{ title: string; body: string }> = [];

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const notePrefix = line.startsWith(":::previous-note ") ? ":::previous-note " : ":::note ";

    if (!line.startsWith(":::note ") && !line.startsWith(":::previous-note ")) {
      continue;
    }

    const title = line.slice(notePrefix.length).trim() || "Untitled note";
    const innerLines: string[] = [];

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

function setupHardwareFallback(body: string): string {
  const notes = noteEntries(body);

  if (!notes.length) {
    return body;
  }

  return notes.map((note) => note.body).filter(Boolean).join("\n\n") || body;
}

function metaText(value: unknown): string {
  if (typeof value === "string") {
    return decodeTextBlock(value);
  }

  if (Array.isArray(value)) {
    return value.map((item) => String(item)).join("\n");
  }

  return "";
}

function decodeTextBlock(value: string): string {
  return value.replace(/\\+n/g, "\n");
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
    const hardware = metaText(record.meta.hardware) || setupHardwareFallback(record.body);

    return (
      <section className="content-terminal" aria-label={`${record.title} setup details`}>
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

function weatherCodeLabel(code: number): string {
  if (code === 0) return "Clear sky";
  if ([1, 2, 3].includes(code)) return "Partly cloudy";
  if ([45, 48].includes(code)) return "Fog";
  if ([51, 53, 55, 56, 57].includes(code)) return "Drizzle";
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return "Rain";
  if ([71, 73, 75, 77, 85, 86].includes(code)) return "Snow";
  if ([95, 96, 99].includes(code)) return "Storm";

  return "Weather logged";
}

async function resolveWeatherLocation(): Promise<WeatherLocation> {
  const response = await fetch("https://ipapi.co/json/");

  if (!response.ok) {
    throw new Error("Weather location lookup failed");
  }

  const data = await response.json() as {
    city?: string;
    country_code?: string;
    latitude?: number | string;
    longitude?: number | string;
  };
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

function formatClock(date: Date | null): string {
  if (!date) {
    return "--:--";
  }

  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).format(date);
}

function formatDate(date: Date | null): string {
  if (!date) {
    return "-- / -- / ----";
  }

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  })
    .format(date)
    .replaceAll("/", " / ");
}

function shortDate(value: string): string {
  const [year, month, day] = value.split("-");
  return year && month && day ? `${day}/${month}` : "--/--";
}

function formatReadableDate(value: string): string {
  const [year, month, day] = value.split("-");
  return year && month && day ? `${day} / ${month} / ${year}` : value;
}

function recentActivity(records: RecordEntry[], limit: number): Array<{ date: string; record: RecordEntry }> {
  return records
    .filter((record) => record.section !== "system")
    .map((record) => ({ date: activityDate(record), record }))
    .sort((a, b) => b.date.localeCompare(a.date) || b.record.updated.localeCompare(a.record.updated) || a.record.priority - b.record.priority)
    .slice(0, limit);
}

function activityDate(record: RecordEntry): string {
  const noteDates = noteEntries(record.body)
    .map((note) => noteTitleDate(note.title))
    .filter((value): value is string => Boolean(value));

  return [record.updated, ...noteDates].sort((a, b) => b.localeCompare(a))[0] ?? record.updated;
}

function noteTitleDate(title: string): string | null {
  const match = title.match(/\b(\d{1,2})\s*\/\s*(\d{1,2})\s*\/\s*(\d{4})\b/);

  if (!match) {
    return null;
  }

  const [, day, month, year] = match;
  return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
}

function getArchiveMetrics(records: RecordEntry[], activeGame?: RecordEntry): ArchiveMetrics {
  const publicRecords = records.filter((record) => record.section !== "system");
  const latestActivityDate = recentActivity(records, 1)[0]?.date ?? publicRecords[0]?.updated ?? "";

  return {
    activeGame,
    activeProjects: records.filter((record) => record.section === "projects" && ["active", "in progress", "planning"].includes(record.status.toLowerCase())).length,
    latestActivityDate,
    mediaCount: countMediaPaths(publicRecords),
    recordCount: publicRecords.length
  };
}

function countMediaPaths(records: RecordEntry[]): number {
  const paths = new Set<string>();
  const markdownImagePattern = /!\[(?:.*?)]\((.*?)\)/g;

  for (const record of records) {
    for (const value of [record.banner, record.meta.headerImage]) {
      if (typeof value === "string" && value) {
        paths.add(value);
      }
    }

    for (const key of ["samples", "attachments"] as const) {
      const value = record.meta[key];
      const list = Array.isArray(value) ? value : typeof value === "string" ? value.split(/\r?\n|,/) : [];

      for (const item of list) {
        const path = String(item).trim();

        if (path) {
          paths.add(path);
        }
      }
    }

    for (const match of record.body.matchAll(markdownImagePattern)) {
      if (match[1]) {
        paths.add(match[1]);
      }
    }
  }

  return paths.size;
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
