"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  Clock,
  Search,
  Square,
  Terminal,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { create } from "zustand";
import { BootScreen } from "@/components/archive/boot-screen";
import { ArchiveDashboard } from "@/components/archive/dashboard";
import { renderHeadlineLetters } from "@/components/archive/headline-text";
import { MobileDock } from "@/components/archive/mobile-dock";
import { RecordWindow } from "@/components/archive/record-window";
import {
  formatClock,
  formatDate,
  getArchiveMetrics,
  noteEntries,
  recentActivity,
} from "@/components/archive/record-utils";
import { SectionPage } from "@/components/archive/section-page";
import { SearchPanel } from "@/components/archive/search-panel";
import { getSearchResults, getTimelineItems } from "@/components/archive/search-utils";
import { ArchiveNavigationMenu, sections, Sidebar } from "@/components/archive/sidebar";
import { TimelineWindow } from "@/components/archive/timeline-window";
import type { ContentKey, SearchResult } from "@/components/archive/types";
import type { RecordEntry, RecordSection } from "@/lib/types";

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

function projectStatusRank(status: string): number {
  const rank = projectStatusOrder.indexOf(status.toLowerCase());
  return rank === -1 ? projectStatusOrder.length : rank;
}

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
  const saying = dailyLatinSaying(now);
  const subtext = activeSection === "system" ? (
    <span className="latin-tooltip" tabIndex={0}>
      {saying.latin}
      <span role="tooltip">
        <b>{saying.english}</b>
        <small>{saying.meaning}</small>
      </span>
    </span>
  ) : "Browse the records filed under this archive.";
  const hasFocusWindow = panelOpen || timelineOpen;

  return (
    <main className={hasFocusWindow ? "archive-shell has-record" : "archive-shell"}>
      <BootScreen />
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
            onOpenTimeline={openTimeline}
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
