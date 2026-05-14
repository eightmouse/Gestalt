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
  | "software"
  | "maintenance"
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
  icon: string;
}> = [
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

type WeatherState = {
  label: string;
  temp: string;
  condition: string;
  meta: string;
  note: string;
  loading: boolean;
};

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
  const [viewedNoteIds, setViewedNoteIds] = useState<string[]>([]);
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
  const currentGame = recordsBySection.games.find((record) => record.status === "Playing") ?? recordsBySection.games[0];
  const latestLog = [...recordsBySection.logs].sort((a, b) => b.updated.localeCompare(a.updated) || a.priority - b.priority)[0];
  const activity = records.filter((record) => record.section !== "system").sort((a, b) => b.updated.localeCompare(a.updated)).slice(0, 4);
  const searchResults = getSearchResults(records, searchQuery);

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
    if (!panelOpen) {
      return;
    }

    const minimizeOnOutsideClick = (event: MouseEvent) => {
      const target = event.target;

      if (!(target instanceof Element)) {
        return;
      }

      if (target.closest(".record-window") || target.closest(".reopen-control")) {
        return;
      }

      setPanelOpen(false);
      setPanelMinimized(true);
    };

    document.addEventListener("mousedown", minimizeOnOutsideClick);
    return () => document.removeEventListener("mousedown", minimizeOnOutsideClick);
  }, [panelOpen]);

  useEffect(() => {
    if (!records.some((record) => record.id === selectedId) && records[0]) {
      setSelectedId(records[0].id);
    }
  }, [records, selectedId, setSelectedId]);

  const openRecord = (record: RecordEntry, content: ContentKey = "overview") => {
    setSelectedId(record.id);
    setInitialContent(content);
    if (typeof record.meta.latestNote === "string") {
      setViewedNoteIds((current) => (current.includes(record.id) ? current : [...current, record.id]));
    }
    setPanelOpen(true);
    setPanelMinimized(false);
    setPanelMaximized(false);
    setSearchOpen(false);
    setSearchQuery("");
  };

  const openSection = (section: RecordSection) => {
    setActiveSection(section);
    setPanelOpen(false);
    setPanelMinimized(false);
    setSearchOpen(false);
    setSearchQuery("");
  };

  const activeSectionConfig = sections.find((section) => section.id === activeSection) ?? sections[0];
  const routeTitle = activeSection === "system" ? "DASHBOARD" : activeSectionConfig.code;
  const headline = activeSection === "system" ? getGreeting(now) : activeSectionConfig.label;
  const subtext = activeSection === "system" ? dashboardSubtext(now) : "Browse the records filed under this archive.";

  return (
    <main className={panelOpen ? "archive-shell has-record" : "archive-shell"}>
      <div className="boot-screen" aria-hidden="true">
        <span>GESTALT</span>
        <i>System initializing</i>
        <b className="boot-meter">
          <b />
        </b>
      </div>
      <div className="grain-layer" />
      <div className="scanline-layer" />
      <Sidebar
        activeSection={activeSection}
        onOpenSection={openSection}
      />

      <section className={panelOpen ? "workspace has-record" : "workspace"} aria-label="Gestalt dashboard">
        <header className="workspace-header">
          <div>
            <p className="route-label">// {routeTitle}</p>
            <h1>
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
            <SearchPanel panelRef={searchRef} query={searchQuery} records={searchResults} onOpenRecord={openRecord} onQueryChange={setSearchQuery} />
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

          <DashboardPanel title="CURRENT GAME">
            {currentGame ? <CurrentGame onOpenNotes={() => openRecord(currentGame, "notes")} record={currentGame} viewedNoteIds={viewedNoteIds} /> : <p className="subtle">No session active.</p>}
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

          <DashboardPanel title="RECENT ACTIVITY" className="wide-panel" footerLabel="View full timeline" onFooter={() => openSection("logs")}>
            {activity.length > 0 ? (
              <ol className="activity-feed">
                {activity.map((record) => (
                  <li key={record.id}>
                    <span>[{shortDate(record.updated)}]</span>
                    <button type="button" onClick={() => openRecord(record)}>
                      {record.type}: {record.title}
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
      </section>
    </main>
  );
}

type SidebarProps = {
  activeSection: RecordSection;
  onOpenSection: (section: RecordSection) => void;
};

function Sidebar({
  activeSection,
  onOpenSection
}: SidebarProps) {
  return (
    <aside className="sidebar">
      <div className="brand-block">
        <p className="brand">GESTALT</p>
        <span>v1.5.4</span>
        <i aria-hidden="true">-</i>
      </div>

      <nav aria-label="Archive navigation">
        <p className="sidebar-label">// ARCHIVE NAVIGATION</p>
        <div className="nav-stack">
          {sections.map((section) => {
            return (
              <div className="nav-group" key={section.id}>
                <button
                  type="button"
                  className={activeSection === section.id ? "nav-trigger is-active" : "nav-trigger"}
                  onClick={() => onOpenSection(section.id)}
                >
                  <span className="nav-mark" data-icon={section.icon} aria-hidden="true" />
                  <span>
                    <strong>{section.code}</strong>
                    <small>{section.label}</small>
                  </span>
                  <span className="section-signal" aria-hidden="true" />
                </button>
              </div>
            );
          })}
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
            <dt>HOST</dt>
            <dd>LOCALHOST</dd>
          </div>
          <div>
            <dt>UPTIME</dt>
            <dd>02:17:43:21</dd>
          </div>
          <div>
            <dt>OS VERSION</dt>
            <dd>GESTALT OS v1.5.4</dd>
          </div>
        </dl>
      </div>
    </aside>
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
    label: "LOCAL WEATHER",
    temp: "--",
    condition: "Awaiting signal",
    meta: "Browser permission required",
    note: "No location is stored. Signal is read client-side only.",
    loading: false
  });

  const requestWeather = () => {
    if (weather.loading) {
      return;
    }

    if (!("geolocation" in navigator) || typeof fetch !== "function") {
      setWeather((current) => ({
        ...current,
        condition: "Signal unavailable",
        meta: "This browser cannot read local weather",
        note: "Weather remains client-side; no location is stored."
      }));
      return;
    }

    setWeather((current) => ({
      ...current,
      loading: true,
      condition: "Acquiring position",
      meta: "Waiting for browser permission",
      note: "Location is used once for this weather lookup only."
    }));

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const latitude = position.coords.latitude.toFixed(3);
        const longitude = position.coords.longitude.toFixed(3);
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&timezone=auto`;

        try {
          const response = await fetch(url);
          const data = await response.json();
          const current = data.current ?? {};

          setWeather({
            label: "LOCAL WEATHER",
            temp: Number.isFinite(current.temperature_2m) ? `${Math.round(current.temperature_2m)}C` : "--",
            condition: weatherCodeLabel(Number(current.weather_code)),
            meta: `Humidity ${current.relative_humidity_2m ?? "--"}% / Wind ${current.wind_speed_10m ?? "--"} kmh`,
            note: "Live signal from Open-Meteo. Nothing is saved.",
            loading: false
          });
        } catch {
          setWeather({
            label: "LOCAL WEATHER",
            temp: "--",
            condition: "Signal interrupted",
            meta: "Weather endpoint did not respond",
            note: "Try again later; the archive remains offline-safe.",
            loading: false
          });
        }
      },
      () => {
        setWeather({
          label: "LOCAL WEATHER",
          temp: "--",
          condition: "Permission denied",
          meta: "Local weather hidden",
          note: "Grant location permission to read the current sky.",
          loading: false
        });
      },
      { enableHighAccuracy: false, maximumAge: 600000, timeout: 10000 }
    );
  };

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
        &gt; {weather.loading ? "Reading signal..." : "Read local sky"}
      </button>
    </div>
  );
}

function MemoryLoop() {
  return (
    <div className="memory-loop" aria-hidden="true">
      <span className="memory-core" />
      <span className="memory-orbit" />
      <span className="memory-gate" />
      <span className="memory-shard" />
      <span className="memory-rain" />
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
            <button className="section-record" key={record.id} type="button" onClick={() => onOpenRecord(record)}>
              <span className="section-record-kind">{record.type}</span>
              <strong>{record.title}</strong>
              <span>{record.summary}</span>
              <i>
                {record.status} . {formatReadableDate(record.updated)}
              </i>
            </button>
          ))
        ) : (
          <p className="search-empty">No records filed here yet.</p>
        )}
      </div>
    </section>
  );
}

function SearchPanel({
  panelRef,
  query,
  records,
  onOpenRecord,
  onQueryChange
}: {
  panelRef: RefObject<HTMLDivElement | null>;
  query: string;
  records: RecordEntry[];
  onOpenRecord: (record: RecordEntry) => void;
  onQueryChange: (query: string) => void;
}) {
  return (
    <div className="search-panel" ref={panelRef} role="search">
      <label htmlFor="archive-search">// SEARCH RECORDS</label>
      <input
        autoComplete="off"
        autoFocus
        id="archive-search"
        onChange={(event) => onQueryChange(event.target.value)}
        placeholder="Project, game, log..."
        type="search"
        value={query}
      />
      <div className="search-suggestions">
        {records.length > 0 ? (
          records.map((record) => (
            <button key={record.id} type="button" onClick={() => onOpenRecord(record)}>
              <span>
                <strong>{record.title}</strong>
                <small>
                  {record.type} / {record.status}
                </small>
              </span>
              <i>{record.section.toUpperCase()}</i>
            </button>
          ))
        ) : (
          <p className="search-empty">No matching record.</p>
        )}
      </div>
    </div>
  );
}

function CurrentGame({
  onOpenNotes,
  record,
  viewedNoteIds
}: {
  onOpenNotes: () => void;
  record: RecordEntry;
  viewedNoteIds: string[];
}) {
  const latestNote = typeof record.meta.latestNote === "string" && !viewedNoteIds.includes(record.id) ? record.meta.latestNote : "";

  return (
    <div className="current-game">
      <div className="game-cover">
        <img src={record.banner || "/images/archive-banner.png"} alt="" />
        {latestNote ? <i className="game-cover-signal">{latestNote}</i> : null}
        <span>{record.title.slice(0, 10)}</span>
      </div>
      <div>
        <strong>{record.title}</strong>
        <span>{record.progress}% Complete</span>
        <span>{String(record.meta.playtime ?? "18.7h")} Play Time</span>
        <span>Last Played: {String(record.meta.lastPlayed ?? "Today")}</span>
        <button className="current-game-note" type="button" onClick={onOpenNotes}>
          Read note -&gt;
        </button>
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
  const [updateHistoryOpen, setUpdateHistoryOpen] = useState(false);
  const updateHistoryRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setActiveContent(initialContent);
    setUpdateHistoryOpen(false);
  }, [initialContent, record.id]);

  useEffect(() => {
    if (!updateHistoryOpen) {
      return;
    }

    const closeUpdateHistory = (event: MouseEvent) => {
      const target = event.target;

      if (!(target instanceof Element) || updateHistoryRef.current?.contains(target)) {
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
      className={maximized ? "record-window is-maximized" : "record-window"}
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
            className={record.banner ? "record-heading has-heading-banner" : "record-heading"}
            style={record.banner ? ({ "--heading-banner": `url("${record.banner}")` } as CSSProperties) : undefined}
          >
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

          <RecordContentPanel activeContent={activeContent} record={record} />
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
            {record.mood ? (
              <div>
                <dt>Mood:</dt>
                <dd>{record.mood}</dd>
              </div>
            ) : null}
          </dl>
          <UpdateHistory body={record.body} containerRef={updateHistoryRef} isOpen={updateHistoryOpen} onOpen={() => setUpdateHistoryOpen(true)} />
        </aside>

      </div>
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
      { key: "software", label: "Software" },
      { key: "maintenance", label: "Maintenance" },
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

function contentOrdinal(record: RecordEntry, index: number): string {
  return String(record.section === "projects" ? index : index + 1).padStart(2, "0");
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

function RecordContentPanel({ activeContent, record }: { activeContent: ContentKey; record: RecordEntry }) {
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
    return <NotesPage record={record} />;
  }

  if (activeContent === "technical") {
    return (
      <section className="content-terminal" aria-label={`${record.title} technical stack`}>
        <div className="terminal-title">// TECHNICAL STACK</div>
        <div className="detail-list">
          <p>&gt; Framework: Next.js App Router</p>
          <p>&gt; Content: MDX records</p>
          <p>&gt; Motion: restrained panel transitions</p>
          <p>&gt; State: lightweight local archive state</p>
          <p>&gt; Privacy: public-safe content files only</p>
        </div>
      </section>
    );
  }

  if (activeContent === "hardware" || activeContent === "software" || activeContent === "maintenance") {
    return (
      <section className="content-terminal" aria-label={`${record.title} setup details`}>
        <div className="terminal-title">// {activeContent.toUpperCase()}</div>
        <RecordBody body={record.body} />
      </section>
    );
  }

  if (activeContent === "recommendation") {
    return (
      <section className="content-terminal" aria-label={`${record.title} recommendation`}>
        <div className="terminal-title">// RECOMMENDATION</div>
        <div className="status-grid">
          <div className="status-cell">
            <span>STATUS</span>
            <strong>{record.status}</strong>
          </div>
          <div className="status-cell">
            <span>MOOD</span>
            <strong>{record.mood ?? "unfiled"}</strong>
          </div>
          <div className="status-cell">
            <span>PROGRESS</span>
            <strong>{record.progress}%</strong>
          </div>
        </div>
        <p className="terminal-copy">
          Recommendation stays pending until the session has enough time behind it. Current notes are being kept as observations, not a final verdict.
        </p>
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
  return (
    <div className="overview-stack">
      <RecordBanner record={record} />

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
        <MilestoneList record={record} />
      </section>
    </div>
  );
}

function RecordBanner({ record }: { record: RecordEntry }) {
  if (record.banner) {
    return (
      <div className="banner-frame">
        <img src={record.banner} alt="" />
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
  const milestones = record.milestones.length > 0 ? record.milestones : [{ label: "Observation", progress: record.progress, status: record.status }];

  return (
    <div className="milestone-list">
      {milestones.map((milestone) => (
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
            const imageSource = slot === 1 ? record.banner : undefined;

            return (
              <button className="media-popup" style={{ "--slot": slot } as CSSProperties} type="button" key={`${record.id}-media-${slot}`}>
                <span>
                {prefix}_{String(slot).padStart(2, "0")}
              </span>
              <div className="media-frame">
                {imageSource ? <img src={imageSource} alt="" /> : <div className="media-placeholder">NO CAPTURE</div>}
              </div>
              <i>{imageSource ? "Primary capture" : "Awaiting media"}</i>
            </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function SampleGrid({ record }: { record: RecordEntry }) {
  return (
    <section className="content-terminal" aria-label={`${record.title} sample media`}>
      <div className="terminal-title">// SAMPLE</div>
      <div className="sample-kicker">Media</div>
      <div className="sample-grid" aria-label={`${record.title} media samples`}>
        {Array.from({ length: 6 }).map((_, index) => {
          const slot = index + 1;
          const imageSource = slot === 1 ? record.banner : undefined;

          return (
            <button className="sample-terminal" type="button" key={`${record.id}-sample-${slot}`}>
              <span>MEDIA_{String(slot).padStart(2, "0")}</span>
              <div className="sample-frame">
                {imageSource ? <img src={imageSource} alt="" /> : <div className="media-placeholder">NO MEDIA</div>}
              </div>
              <i>{imageSource ? "Primary sample" : "Awaiting sample"}</i>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function NotesPage({ record }: { record: RecordEntry }) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const notes = noteEntries(record.body);
  const indexedNotes = notes.map((note, index) => ({ ...note, index }));
  const cleanQuery = query.trim().toLowerCase();
  const filteredNotes = cleanQuery ? indexedNotes.filter((note) => note.title.toLowerCase().includes(cleanQuery)) : indexedNotes;

  return (
    <section className="content-terminal notes-page" aria-label={`${record.title} notes`}>
      <div className="notes-page-header">
        <div className="terminal-title">// NOTES PAGE</div>
        <button
          aria-label="Search notes"
          aria-expanded={searchOpen}
          className={searchOpen ? "note-search-toggle is-active" : "note-search-toggle"}
          type="button"
          onClick={() => {
            setSearchOpen((current) => !current);
            setQuery("");
          }}
        >
          <span className="search-icon" aria-hidden="true" />
        </button>
      </div>
      {searchOpen ? (
        <div className="note-search-panel">
          <label htmlFor={`${record.id}-note-search`}>Search note title or date</label>
          <input
            autoComplete="off"
            id={`${record.id}-note-search`}
            list={`${record.id}-note-suggestions`}
            onChange={(event) => setQuery(event.target.value)}
            type="search"
            value={query}
          />
          <datalist id={`${record.id}-note-suggestions`}>
            {notes.map((note) => (
              <option key={note.title} value={note.title} />
            ))}
          </datalist>
        </div>
      ) : null}
      <div className="note-stack">
        {filteredNotes.length > 0 ? (
          filteredNotes.map((note) => (
            <details className="note-entry" defaultOpen={note.index === 0} key={note.title}>
              <summary>
                <span>{note.title}</span>
                <i>open</i>
              </summary>
              <div className="note-entry-body">
                <RecordBody body={note.body} />
              </div>
            </details>
          ))
        ) : (
          <p className="notes-empty">No note matches that signal.</p>
        )}
      </div>
    </section>
  );
}

function RecordBody({ body }: { body: string }) {
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
      nodes.push(
        <figure className="note-banner" key={key}>
          <img src={imageMatch[2]} alt={imageMatch[1]} />
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
    </div>
  );
}

function UpdateHistory({
  body,
  containerRef,
  isOpen,
  onOpen
}: {
  body: string;
  containerRef: RefObject<HTMLDivElement | null>;
  isOpen: boolean;
  onOpen: () => void;
}) {
  const { updates } = splitUpdateIndex(body);

  if (!updates.length) {
    return null;
  }

  return (
    <div className="update-history" ref={containerRef}>
      <button type="button" aria-expanded={isOpen} onClick={onOpen}>
        <span>UPDATE INDEX</span>
        <i>{updates.length}</i>
      </button>
      {isOpen ? (
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
      ) : null}
    </div>
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

function getSearchResults(records: RecordEntry[], query: string): RecordEntry[] {
  const normalized = query.trim().toLowerCase();

  if (!normalized) {
    return [...records].sort((a, b) => b.updated.localeCompare(a.updated)).slice(0, 5);
  }

  return records
    .filter((record) => {
      const searchable = [record.title, record.type, record.status, record.section, ...record.tags].join(" ").toLowerCase();
      return searchable.includes(normalized);
    })
    .sort((a, b) => {
      const aStarts = a.title.toLowerCase().startsWith(normalized) ? 0 : 1;
      const bStarts = b.title.toLowerCase().startsWith(normalized) ? 0 : 1;
      return aStarts - bStarts || b.updated.localeCompare(a.updated) || a.priority - b.priority;
    })
    .slice(0, 6);
}
