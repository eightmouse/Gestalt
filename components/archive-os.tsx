"use client";

import { AnimatePresence, motion } from "framer-motion";
import dynamic from "next/dynamic";
import {
  Clock,
  Square,
  Terminal,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { create } from "zustand";
import { BootScreen } from "@/components/archive/boot-screen";
import { scheduleBootCompletion } from "@/lib/boot";
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
  recordDashboardImage,
  recordHeaderImage,
} from "@/components/archive/record-utils";
import { SectionPage } from "@/components/archive/section-page";
import type { SetupGroupId } from "@/components/archive/setup-utils";
import { compareLogWritingOrder, isLogArchivedByAge } from "@/lib/log-archive";
import { SearchPanel } from "@/components/archive/search-panel";
import { getSearchResults, getTimelineItems } from "@/components/archive/search-utils";
import { ArchiveNavigationMenu, sections, Sidebar } from "@/components/archive/sidebar";
import { TimelineWindow } from "@/components/archive/timeline-window";
import { RoadmapWindow } from "@/components/archive/roadmap-window";
import type { ContentKey, SearchResult } from "@/components/archive/types";
import type { RecordEntry, RecordSection } from "@/lib/types";
import { createSteamSnapshotLoader, loadSteamSnapshot, resolveCurrentGame, steamRecordSeed, type SteamRecordSeed, type SteamSnapshot } from "@/public/steam-display.mjs";
import { normalizeEntryAccessMode, readEntryAccessMode, saveEntryAccessMode, shouldPlayEntryAccess, type EntryAccessMode } from "@/lib/entry-access";
import { newInlineRecord, supportsInlineEditing } from "@/lib/inline-editing";
import seasonal, { type SeasonalMode } from "@/public/seasonal.js";
import desktopNavigation, { type DesktopNavigationMode } from "@/public/desktop-navigation.js";
import { DesktopNavigationChrome, DesktopTerminalRestore, useDesktopNavigation } from "@/components/archive/desktop-navigation";

const LocalStudioEditor = dynamic(
  () => import("@/components/studio-client").then((module) => module.StudioClient),
  { ssr: false, loading: () => <p role="status">Opening local editor...</p> }
);
const LocalReviewButton = dynamic(() => import("@/components/studio/local-change-review").then((module) => module.LocalReviewButton), { ssr: false });
const LocalChangeReview = dynamic(() => import("@/components/studio/local-change-review").then((module) => module.LocalChangeReview), { ssr: false });

const loadLocalSteamPreview = createSteamSnapshotLoader((url, options) => fetch(url, { ...options, method: "POST", credentials: "same-origin" }));

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

type LocalMemoryState = "checking" | "prompt" | "granted" | "session";

const localMemoryKey = "gestalt.local-memory";

function isLocalArchiveMediaSource(source: unknown): source is string {
  return typeof source === "string" && /^(?:\.\/)?public\/(?:images|media)\//.test(source);
}

function setupWarmupGroup(record: RecordEntry): string {
  const explicitGroup = [record.meta.setupGroup, record.meta.setupKind, record.meta.category]
    .map((value) => (typeof value === "string" ? value.toLowerCase().trim() : ""))
    .find(Boolean);

  if (explicitGroup) {
    if (/\b(tool|tools|app|apps|software|shortcut)\b/.test(explicitGroup)) {
      return "tools";
    }

    if (/\b(peripheral|peripherals|device|hardware|gear|photo)\b/.test(explicitGroup)) {
      return "peripherals";
    }
  }

  return "";
}

function warmArchiveMedia(records: RecordEntry[], currentGame?: RecordEntry) {
  const sources = new Set<string>(["public/images/archive-banner.png"]);

  if (currentGame) {
    sources.add(recordDashboardImage(currentGame));
  }

  for (const record of records) {
    const group = setupWarmupGroup(record);

    if (record.section === "setup" && (group === "tools" || group === "peripherals")) {
      sources.add(typeof record.meta.iconImage === "string" ? record.meta.iconImage : "");
      sources.add(recordHeaderImage(record));
      sources.add(record.banner ?? "");
    }
  }

  for (const source of [...sources].filter(isLocalArchiveMediaSource)) {
    const image = new Image();
    image.decoding = "async";
    image.src = source;
  }
}

export function ArchiveOS({ records }: ArchiveOSProps) {
  const { selectedId, activeSection, setSelectedId, setActiveSection } = useArchiveStore();
  const [archiveRecords, setArchiveRecords] = useState(records);
  const [steamSnapshot, setSteamSnapshot] = useState<SteamSnapshot | null>(null);
  const [steamReady, setSteamReady] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const [recordAccessPending, setRecordAccessPending] = useState(false);
  const [recordAccessComplete, setRecordAccessComplete] = useState(false);
  const [panelMinimized, setPanelMinimized] = useState(false);
  const [panelMaximized, setPanelMaximized] = useState(false);
  const [initialContent, setInitialContent] = useState<ContentKey>("overview");
  const [initialNoteQuery, setInitialNoteQuery] = useState("");
  const [now, setNow] = useState<Date | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [timelineOpen, setTimelineOpen] = useState(false);
  const [roadmapOpen, setRoadmapOpen] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  const [headlineAnimating, setHeadlineAnimating] = useState(true);
  const [localMemory, setLocalMemory] = useState<LocalMemoryState>("checking");
  const [bootComplete, setBootComplete] = useState(false);
  const [studioRecordId, setStudioRecordId] = useState<string | null>(null);
  const [studioCreateSection, setStudioCreateSection] = useState<Exclude<RecordSection, "system"> | null>(null);
  const [studioSetupGroup, setStudioSetupGroup] = useState<SetupGroupId | undefined>();
  const [studioSteamGame, setStudioSteamGame] = useState<SteamRecordSeed | undefined>();
  const [inlineRecordId, setInlineRecordId] = useState<string | null>(null);
  const [inlineBusy, setInlineBusy] = useState(false);
  const [inlineDraftWindow, setInlineDraftWindow] = useState<RecordEntry | null>(null);
  const searchRef = useRef<HTMLDivElement | null>(null);
  const recordAccessTimerRef = useRef<number | null>(null);
  const recordAccessPlayedRef = useRef(false);
  const [entryAccessMode, setEntryAccessMode] = useState<EntryAccessMode>("first");
  const [seasonalMode, setSeasonalMode] = useState<SeasonalMode>("auto");
  const [desktopNavigationMode, setDesktopNavigationMode] = useState<DesktopNavigationMode>("fixed");
  const shellRef = useRef<HTMLElement | null>(null);
  const entryAccessModeRef = useRef<EntryAccessMode>("first");

  const changeEntryAccessMode = (value: EntryAccessMode) => {
    const mode = normalizeEntryAccessMode(value);
    if (mode === entryAccessModeRef.current) return;
    entryAccessModeRef.current = mode;
    setEntryAccessMode(mode);
    saveEntryAccessMode(mode);
    stopRecordAccess();
    setRecordAccessComplete(true);
  };

  const stopRecordAccess = () => {
    if (recordAccessTimerRef.current !== null) {
      window.clearTimeout(recordAccessTimerRef.current);
      recordAccessTimerRef.current = null;
    }
    setRecordAccessPending(false);
    setRecordAccessComplete(false);
  };

  const startRecordAccess = () => {
    stopRecordAccess();

    if (
      !shouldPlayEntryAccess(entryAccessModeRef.current, recordAccessPlayedRef.current,
        window.matchMedia("(prefers-reduced-motion: reduce)").matches)
    ) {
      return;
    }

    recordAccessPlayedRef.current = true;
    setRecordAccessPending(true);
    setRecordAccessComplete(false);
    recordAccessTimerRef.current = window.setTimeout(() => {
      recordAccessTimerRef.current = null;
      setRecordAccessPending(false);
      setRecordAccessComplete(true);
    }, 3250);
  };

  useEffect(() => () => {
    if (recordAccessTimerRef.current !== null) {
      window.clearTimeout(recordAccessTimerRef.current);
    }
  }, []);

  useEffect(() => {
    const mode = readEntryAccessMode();
    setSeasonalMode(seasonal.readMode());
    setDesktopNavigationMode(desktopNavigation.readMode());
    entryAccessModeRef.current = mode;
    setEntryAccessMode(mode);
    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onMotionChange = () => {
      if (motionQuery.matches) {
        stopRecordAccess();
        setRecordAccessComplete(true);
      }
    };
    motionQuery.addEventListener("change", onMotionChange);
    return () => motionQuery.removeEventListener("change", onMotionChange);
  }, []);

  const recordsBySection = useMemo(() => {
    return sections.reduce<Record<RecordSection, RecordEntry[]>>(
      (acc, section) => {
        acc[section.id] = archiveRecords.filter((record) => record.section === section.id);
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
  }, [archiveRecords]);

  const archivedLogs = recordsBySection.logs.filter((record) => isLogArchivedByAge(record));
  const archivePageRecords = [...recordsBySection.archive, ...archivedLogs];

  const selectedRecord = archiveRecords.find((record) => record.id === selectedId) ?? inlineDraftWindow ?? archiveRecords[0];
  const recordWindowKey = inlineDraftWindow?.id ?? selectedRecord?.id;
  const editingInline = Boolean(inlineRecordId && inlineRecordId === recordWindowKey);
  const unsavedInline = Boolean(inlineDraftWindow && selectedId === inlineDraftWindow.id);
  const projectDashboardRecords = recordsBySection.projects
    .sort((a, b) => projectStatusRank(a.status) - projectStatusRank(b.status) || b.updated.localeCompare(a.updated) || a.priority - b.priority);
  const currentGameDisplay = useMemo(() => steamReady ? resolveCurrentGame(steamSnapshot, recordsBySection.games) : null, [steamReady, steamSnapshot, recordsBySection.games]);
  const currentGame = recordsBySection.games.find((record) => record.id === currentGameDisplay?.recordId);
  const latestLog = [...recordsBySection.logs].sort(compareLogWritingOrder)[0];
  const activity = recentActivity(archiveRecords, 6);
  const metrics = { ...getArchiveMetrics(archiveRecords, currentGame), activeGame: currentGameDisplay ? { title: currentGameDisplay.title } : undefined };

  useEffect(() => {
    if (!bootComplete) return;
    let active = true;
    const loading = process.env.NODE_ENV === "development"
      ? loadLocalSteamPreview("/api/studio/steam").then((snapshot) => snapshot ?? loadSteamSnapshot("/data/steam-current.json"))
      : loadSteamSnapshot("/data/steam-current.json");
    void loading.then((snapshot) => {
      if (active) { setSteamSnapshot(snapshot); setSteamReady(true); }
    }).catch(() => { if (active) setSteamReady(true); });
    return () => { active = false; };
  }, [bootComplete]);

  useEffect(() => {
    setArchiveRecords(records);
  }, [records]);

  useEffect(() => {
    warmArchiveMedia(archiveRecords, currentGame);
  }, [archiveRecords, currentGame]);

  useEffect(() => {
    const updateClock = () => setNow(new Date());
    updateClock();
    const interval = window.setInterval(updateClock, 30_000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    try {
      if (window.localStorage.getItem(localMemoryKey) === "granted") {
        setLocalMemory("granted");
        return;
      }
    } catch {
      // Local storage can be blocked by strict browser settings. Gestalt keeps working without it.
    }

    setLocalMemory("prompt");
  }, []);

  useEffect(() => {
    if (localMemory === "checking" || bootComplete) {
      return;
    }

    return scheduleBootCompletion(() => setBootComplete(true));
  }, [bootComplete, localMemory]);

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
      const isInputTarget = target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || (target instanceof HTMLElement && target.isContentEditable);

      if ((inlineRecordId && panelOpen) || event.metaKey || event.ctrlKey || event.altKey || isInputTarget) {
        return;
      }

      if (event.key === "~" || event.key === "`") {
        event.preventDefault();
        setSearchOpen((current) => !current);
      }
    };

    document.addEventListener("keydown", togglePalette);
    return () => document.removeEventListener("keydown", togglePalette);
  }, [inlineRecordId, panelOpen]);

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
    if (inlineDraftWindow?.id === selectedId) return;
    if (!archiveRecords.some((record) => record.id === selectedId) && archiveRecords[0]) {
      setSelectedId(archiveRecords[0].id);
    }
  }, [archiveRecords, selectedId, setSelectedId, inlineDraftWindow]);

  const openRecord = (record: RecordEntry, content: ContentKey = "overview", noteQuery = "") => {
    if (inlineBusy) return;
    setInlineRecordId(null);
    setInlineDraftWindow(null);
    startRecordAccess();
    setSelectedId(record.id);
    setInitialContent(content);
    setInitialNoteQuery(noteQuery);
    setPanelOpen(true);
    setPanelMinimized(false);
    setPanelMaximized(false);
    setSearchOpen(false);
    setSearchQuery("");
    setTimelineOpen(false);
    setRoadmapOpen(false);
    setNavOpen(false);
  };

  const openLocalEditor = (recordId: string, content: ContentKey = "overview") => {
    if (inlineBusy) return;
    if (panelOpen && recordId === selectedRecord?.id && supportsInlineEditing(selectedRecord.section)) {
      stopRecordAccess();
      setRecordAccessComplete(true);
      setInitialContent(content);
      setInitialNoteQuery("");
      if (editingInline) finishInlineEditing();
      else setInlineRecordId(recordWindowKey!);
      setSearchOpen(false);
      return;
    }
    setStudioSteamGame(undefined);
    setStudioCreateSection(null);
    setStudioSetupGroup(undefined);
    setStudioRecordId(recordId);
  };

  const finishInlineEditing = () => {
    if (inlineBusy) return;
    setInlineRecordId(null);
    if (unsavedInline) {
      setPanelOpen(false);
      setPanelMinimized(false);
      setInlineDraftWindow(null);
    }
  };

  const createLocalRecord = (section: Exclude<RecordSection, "system">, setupGroup?: SetupGroupId, steamGame?: SteamRecordSeed) => {
    if (inlineBusy) return;
    setStudioSteamGame(steamGame);
    if (supportsInlineEditing(section)) {
      const draft = newInlineRecord(section, steamGame);
      stopRecordAccess();
      setRecordAccessComplete(true);
      setInlineDraftWindow(draft);
      setSelectedId(draft.id);
      setInlineRecordId(draft.id);
      setInitialContent(section === "logs" ? "notes" : "overview");
      setInitialNoteQuery("");
      setPanelOpen(true);
      setPanelMinimized(false);
      setPanelMaximized(false);
      setSearchOpen(false);
      setTimelineOpen(false);
      setRoadmapOpen(false);
      setNavOpen(false);
      return;
    }
    setStudioCreateSection(section);
    setStudioSetupGroup(setupGroup);
    setStudioRecordId("__new");
  };

  const createCurrentGameRecord = () => {
    const seed = steamRecordSeed(currentGameDisplay);
    if (!seed) return;
    const existing = recordsBySection.games.find((record) => Number(record.meta.steamAppId) === Number(seed.steamAppId));
    if (existing) {
      openRecord(existing);
      return;
    }
    createLocalRecord("games", undefined, seed);
  };

  const openSection = (section: RecordSection) => {
    if (inlineBusy) return;
    setInlineRecordId(null);
    setInlineDraftWindow(null);
    const sectionChanged = activeSection !== section;

    setActiveSection(section);
    stopRecordAccess();
    setHeadlineAnimating(sectionChanged);
    setPanelOpen(false);
    setPanelMinimized(false);
    setSearchOpen(false);
    setSearchQuery("");
    setTimelineOpen(false);
    setRoadmapOpen(false);
    setNavOpen(false);
  };

  const openTimeline = () => {
    if (inlineBusy) return;
    setInlineRecordId(null);
    setInlineDraftWindow(null);
    stopRecordAccess();
    setPanelOpen(false);
    setPanelMinimized(false);
    setSearchOpen(false);
    setSearchQuery("");
    setTimelineOpen(true);
    setRoadmapOpen(false);
    setNavOpen(false);
  };

  const openRoadmap = () => {
    if (inlineBusy) return;
    setInlineRecordId(null);
    setInlineDraftWindow(null);
    stopRecordAccess();
    setPanelOpen(false);
    setPanelMinimized(false);
    setSearchOpen(false);
    setSearchQuery("");
    setTimelineOpen(false);
    setNavOpen(false);
    setRoadmapOpen(true);
  };

  const openHome = () => {
    if (inlineBusy) return;
    setInlineRecordId(null);
    setInlineDraftWindow(null);
    const sectionChanged = activeSection !== "system";

    stopRecordAccess();
    setActiveSection("system");
    setHeadlineAnimating(sectionChanged);
    setPanelOpen(false);
    setPanelMinimized(false);
    setPanelMaximized(false);
    setSearchOpen(false);
    setSearchQuery("");
    setTimelineOpen(false);
    setRoadmapOpen(false);
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

    if (result.action === "roadmap") {
      openRoadmap();
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

  const searchResults = getSearchResults(archiveRecords, searchQuery, currentGame, latestLog);
  const applyStudioRecords = (updatedRecords: RecordEntry[], currentId?: string | null, options?: { keepEditorOpen?: boolean }) => {
    setInitialNoteQuery("");
    setArchiveRecords((current) => [...current.filter((record) => record.section === "system"), ...updatedRecords]);
    if (currentId) {
      setSelectedId(currentId);
      if (studioRecordId === "__new") {
        setInitialContent("overview");
        setPanelOpen(true);
        setPanelMinimized(false);
        setPanelMaximized(false);
      }
    } else if (currentId === null) {
      if (!options?.keepEditorOpen) setStudioRecordId(null);
      setPanelOpen(false);
      setPanelMinimized(false);
      stopRecordAccess();
    }
  };
  const timelineItems = useMemo(() => timelineOpen ? getTimelineItems(archiveRecords, 32) : [], [archiveRecords, timelineOpen]);

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
  const hasFocusWindow = panelOpen || timelineOpen || roadmapOpen;
  const grantLocalMemory = () => {
    try {
      window.localStorage.setItem(localMemoryKey, "granted");
      setLocalMemory("granted");
    } catch {
      setLocalMemory("session");
    }
  };

  const continueOnce = () => {
    setBootComplete(true);
    setLocalMemory("session");
  };
  const showBoot = !bootComplete;
  useDesktopNavigation(shellRef, desktopNavigationMode, bootComplete && (localMemory === "granted" || localMemory === "session"),
    hasFocusWindow || navOpen || Boolean(studioRecordId) || Boolean(inlineRecordId), searchOpen, localMemory === "granted");

  return (
    <main ref={shellRef} className={`archive-shell${hasFocusWindow ? " has-record" : ""}${showBoot ? " is-booting" : ""}`} inert={showBoot} aria-busy={showBoot}>
      <DesktopNavigationChrome records={archiveRecords} activeSection={activeSection} onOpenSection={openSection} />
      {showBoot ? <BootScreen /> : null}
      {process.env.NODE_ENV === "development" ? <LocalChangeReview busy={inlineBusy || Boolean(studioRecordId)} onReview={(id) => {
        const record = archiveRecords.find((entry) => entry.id === id);
        if (!record || inlineBusy) return false;
        openRecord(record, record.section === "setup" ? "overview" : "notes");
        return true;
      }} /> : null}
      {roadmapOpen ? <RoadmapWindow onClose={() => setRoadmapOpen(false)} /> : null}
      {localMemory === "prompt" && bootComplete ? <LocalMemoryPrompt onAllow={grantLocalMemory} onContinue={continueOnce} /> : null}
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
        localReview={process.env.NODE_ENV === "development" ? <LocalReviewButton /> : undefined}
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
            {process.env.NODE_ENV === "development" ? <LocalReviewButton /> : null}
            <button
              className={searchOpen ? "icon-button is-active" : "icon-button"}
              type="button"
              aria-label="Search records"
              data-search-toggle
              onClick={() => setSearchOpen((current) => !current)}
            >
              <span className="search-icon" aria-hidden="true" />
            </button>
          </div>
          {searchOpen ? (
            <SearchPanel panelRef={searchRef} query={searchQuery} results={searchResults} onOpenResult={openSearchResult} onQueryChange={setSearchQuery} entryAccessMode={entryAccessMode} onEntryAccessModeChange={changeEntryAccessMode}
              seasonalMode={seasonalMode} onSeasonalModeChange={(mode) => { setSeasonalMode(mode); seasonal.saveMode(mode); }}
              desktopNavigationMode={desktopNavigationMode} onDesktopNavigationModeChange={(mode) => { setDesktopNavigationMode(mode); desktopNavigation.saveMode(mode); }} />
          ) : null}
        </header>

        {activeSection === "system" ? (
          <ArchiveDashboard
            now={now}
            seasonalMode={seasonalMode}
            activity={activity}
            currentGame={currentGame}
            currentGameDisplay={currentGameDisplay}
            currentGameLoading={!steamReady}
            onCreateCurrentGame={process.env.NODE_ENV === "development" && steamRecordSeed(currentGameDisplay) ? createCurrentGameRecord : undefined}
            latestLog={latestLog}
            panelOpen={panelOpen}
            projectRecords={projectDashboardRecords}
            onOpenRecord={(record, content) => openRecord(record, content ?? "overview")}
            onOpenSection={openSection}
            onOpenTimeline={openTimeline}
          />
        ) : (
          <SectionPage
            records={activeSection === "archive" ? archivePageRecords : recordsBySection[activeSection]}
            section={activeSectionConfig}
            onOpenRecord={openRecord}
            onCreateRecord={process.env.NODE_ENV === "development" ? () => createLocalRecord(activeSection as Exclude<RecordSection, "system">) : undefined}
            onCreateSetupRecord={process.env.NODE_ENV === "development" ? (group) => createLocalRecord("setup", group) : undefined}
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
                  if (inlineBusy) return;
                  if (!unsavedInline) setInlineRecordId(null);
                  setPanelOpen(false);
                  setPanelMinimized(true);
                  stopRecordAccess();
                }}
              />
              <RecordWindow
                key={recordWindowKey}
                accessPending={recordAccessPending}
                accessComplete={recordAccessComplete}
                maximized={panelMaximized}
                initialContent={initialContent}
                initialNoteQuery={initialNoteQuery}
                record={selectedRecord}
                onEdit={process.env.NODE_ENV === "development" && selectedRecord.section !== "system" ? (content) => openLocalEditor(selectedRecord.id, content) : undefined}
                editorBusy={inlineBusy}
                editor={process.env.NODE_ENV === "development" && editingInline ? (
                  <LocalStudioEditor embedded inline initialRecordId={unsavedInline ? undefined : selectedRecord.id}
                    initialSection={supportsInlineEditing(selectedRecord.section) ? selectedRecord.section : undefined}
                    initialSteamGame={unsavedInline ? studioSteamGame : undefined}
                    initialContent={initialContent === "changelog" || initialContent === "hardware" ? "overview" : initialContent}
                    records={archiveRecords.filter((record) => record.section !== "system")}
                    onBusyChange={setInlineBusy} onContentChange={(content) => setInitialContent(content)}
                    onExit={finishInlineEditing} onRecordsChange={applyStudioRecords} />
                ) : undefined}
                onClose={() => {
                  if (inlineBusy) return;
                  setInlineRecordId(null);
                  setInlineDraftWindow(null);
                  setPanelOpen(false);
                  setPanelMinimized(false);
                  stopRecordAccess();
                }}
                onMinimize={() => {
                  if (inlineBusy) return;
                  if (!unsavedInline) setInlineRecordId(null);
                  setPanelOpen(false);
                  setPanelMinimized(true);
                  stopRecordAccess();
                }}
                onMaximize={() => setPanelMaximized((current) => !current)}
              />
            </>
          ) : null}
        </AnimatePresence>

        <div className="workspace-window-tray">
          <DesktopTerminalRestore />
          <AnimatePresence>
            {!panelOpen && panelMinimized ? (
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
        </div>

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
      <AnimatePresence>
        {studioRecordId ? (
          <motion.div
            className="local-studio-overlay"
            role="dialog"
            aria-modal="true"
            aria-label="Local archive record editor"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.16, ease: "easeOut" }}
          >
            <LocalStudioEditor
              embedded
              initialRecordId={studioRecordId === "__new" ? undefined : studioRecordId}
              initialSection={studioCreateSection ?? undefined}
              initialSetupGroup={studioSetupGroup}
              initialSteamGame={studioSteamGame}
              records={archiveRecords.filter((record) => record.section !== "system")}
              onExit={() => setStudioRecordId(null)}
              onRecordsChange={applyStudioRecords}
            />
          </motion.div>
        ) : null}
      </AnimatePresence>
    </main>
  );
}

function LocalMemoryPrompt({ onAllow, onContinue }: { onAllow: () => void; onContinue: () => void }) {
  return (
    <div className="local-memory-consent" role="dialog" aria-modal="true" aria-labelledby="local-memory-title">
      <div>
        <p>// LOCAL MEMORY REQUEST</p>
        <h2 id="local-memory-title">Remember this terminal?</h2>
        <span>
          Gestalt can remember this choice in your browser so this prompt stays out of the way on repeat visits. No
          account, tracking, analytics, or personal data.
        </span>
        <div>
          <button type="button" onClick={onAllow}>
            Allow local memory
          </button>
          <button type="button" onClick={onContinue}>
            Continue once
          </button>
        </div>
      </div>
    </div>
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
