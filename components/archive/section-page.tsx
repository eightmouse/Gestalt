import type { RecordEntry, RecordSection } from "@/lib/types";
import { gameActivityLabel, gameLogPlacement } from "@/lib/game-state";
import { formatReadableDate, latestSectionNote, recordDisplaySummary, recordHeaderImage } from "@/components/archive/record-utils";
import type { ContentKey } from "@/components/archive/types";
import { setupGroupFor, setupGroupRegistry, setupProfile, type SetupGroupId } from "@/components/archive/setup-utils";
import { ArrowUp, ArrowUpRight, ChevronLeft, ChevronRight, FileText, Folder, FolderOpen, HardDrive, Pencil, Plus, Search, X } from "lucide-react";
import { buildFieldArchive, compareSectionRecords, isLogArchivedByAge, logArchiveDate, LOG_ARCHIVE_AFTER_DAYS } from "@/lib/log-archive";
import { useEffect, useEffectEvent, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import pocket from "@/public/pocket-index.js";
import recordLinks from "@/public/record-links.js";
import sectionMotion from "@/public/section-motion.js";

type ArchiveSectionConfig = {
  id: RecordSection;
  code: string;
  label: string;
  icon: string;
};

type SectionPageProps = {
  handheld: boolean;
  records: RecordEntry[];
  section: ArchiveSectionConfig;
  onOpenRecord: (record: RecordEntry, content?: ContentKey, noteIndex?: number) => void;
  onCreateRecord?: () => void;
  onCreateSetupRecord?: (group: SetupGroupId) => void;
  onEditSetupTool?: (record: RecordEntry) => void;
};
type SelectorGroup = { title: string; records: RecordEntry[] };

const sectionRegistryLabels: Partial<Record<RecordSection, string>> = {
  archive: "Field Archive",
  games: "Media Cabinet",
  logs: "Field Note Index",
  projects: "Process Reader",
  setup: "Setup Manifest"
};

const setupCreateLabels: Record<SetupGroupId, string> = {
  systems: "Add system",
  tools: "Add shortcut",
  peripherals: "Add peripheral",
  notes: "Add Setup note"
};

export function SectionPage({ handheld, records, section, onOpenRecord, onCreateRecord, onCreateSetupRecord, onEditSetupTool }: SectionPageProps) {
  const visibleRecords = section.id === "logs" ? records.filter((record) => !isLogArchivedByAge(record)) : records;
  const sortedRecords = [...visibleRecords].sort(compareSectionRecords);
  const countLabel = `${sortedRecords.length} ${sortedRecords.length === 1 ? "record" : "records"}`;
  const splitSection = splitSectionRecords(section.id, sortedRecords);
  const readout = sectionReadout(sortedRecords, splitSection, section.id);

  if (section.id === "setup") {
    return <SetupBay countLabel={countLabel} onCreateRecord={onCreateSetupRecord} onOpenRecord={onOpenRecord} onEditTool={onEditSetupTool} readout={readout} records={sortedRecords} section={section} />;
  }

  if (section.id === "archive") {
    return <ArchiveFolders onOpenRecord={onOpenRecord} records={sortedRecords} section={section} />;
  }
  if (section.id === "games" && splitSection) {
    return <GameShelf groups={splitSection} onOpenRecord={onOpenRecord} header={{ section, countLabel, readout, onCreateRecord }} />;
  }

  return (
    <section className={`section-page section-page--${section.id}${splitSection ? " section-page--selector" : ""}`} aria-label={`${section.code} records`}>
      <SectionPageHeader section={section} countLabel={countLabel} readout={readout} onCreateRecord={onCreateRecord} />
      {splitSection ? <RecordSelector groups={splitSection} onOpenRecord={onOpenRecord} /> : <div className="section-note-layout">
        <div className="section-record-grid">
          {sortedRecords.length > 0 ? (
            sortedRecords.map((record) => (
              <SectionRecordButton key={record.id} record={record} onOpenRecord={onOpenRecord} />
            ))
          ) : (
            <p className="search-empty">No records filed here yet.</p>
          )}
        </div>
        {section.id === "logs" ? <SectionNotePreview records={sortedRecords} kind="logs" onOpenRecord={onOpenRecord} /> : null}
      </div>}
    </section>
  );
}

type SectionPageHeaderProps = Pick<SectionPageProps, "section" | "onCreateRecord"> & {
  countLabel: string;
  readout: ReturnType<typeof sectionReadout>;
};

function SectionPageHeader({ section, countLabel, readout, onCreateRecord, actions }: SectionPageHeaderProps & { actions?: ReactNode }) {
  return <header className="section-page-header">
    <span className="nav-mark" data-icon={section.icon} aria-hidden="true" />
    <div>
      {section.id !== "games" && section.id !== "projects" ? <p>{section.code}</p> : null}
      <h2>{sectionRegistryLabels[section.id] ?? section.label}</h2>
      <SectionReadout items={readout} />
    </div>
    <div className="section-page-header-actions">
      <i>{countLabel}</i>
      {actions}
      {onCreateRecord ? <CreateRecordButton onClick={onCreateRecord} /> : null}
    </div>
  </header>;
}

function GameShelf({ groups, onOpenRecord, header }: Pick<SectionPageProps, "onOpenRecord"> & { groups: SelectorGroup[]; header: SectionPageHeaderProps }) {
  const cabinetRef = useRef<HTMLElement>(null);
  const [searchOpen, setSearch] = useState(false);
  const [query, setQuery] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const shelves = groups.map((group) => ({ ...group, results: pocket.filterShelfGames(group.records, query) }));
  const count = shelves.reduce((sum, shelf) => sum + shelf.results.length, 0);
  const searchable = groups.reduce((sum, group) => sum + group.records.length, 0) >= pocket.shelfSearchMin;

  useLayoutEffect(() => sectionMotion.bindSectionStandby(cabinetRef.current, "games"), []);
  useLayoutEffect(() => { if (searchOpen) searchRef.current?.focus({ preventScroll: true }); }, [searchOpen]);

  function toggleSearch(open: boolean) {
    setSearch(open);
    if (!open) {
      setQuery("");
      toggleRef.current?.focus({ preventScroll: true });
    }
  }

  return <section className="section-page section-page--games section-page--selector" aria-label={`${header.section.code} records`}>
    <SectionPageHeader {...header} actions={searchable ? <div className="game-search-dock">
      <input ref={searchRef} id="game-shelf-search" className="game-shelf-search" type="search" aria-label="Search Session and Past Logs" placeholder="Search game titles" autoComplete="off" hidden={!searchOpen} value={query} onChange={(event) => setQuery(event.currentTarget.value)} onKeyDown={(event) => {
        if (event.key !== "Escape" || event.nativeEvent.isComposing) return;
        event.preventDefault();
        event.stopPropagation();
        toggleSearch(false);
      }} />
      <button ref={toggleRef} type="button" className="archive-create-record game-shelf-search-toggle" aria-label={searchOpen ? "Close game search" : "Search games"} aria-expanded={searchOpen} aria-controls="game-shelf-search" onClick={() => toggleSearch(!searchOpen)}>{searchOpen ? <X size={16} aria-hidden="true" /> : <Search size={16} aria-hidden="true" />}</button>
    </div> : null} />
    <section ref={cabinetRef} className="record-selector record-selector--games" aria-label="Browse games">
      {shelves.map(({ title, results }, index) => {
        const kind = index === 0 ? "session" : "past";
        return <section className="game-shelf" aria-labelledby={`game-shelf-${kind}`} key={kind}>
          <h3 id={`game-shelf-${kind}`} className="game-shelf-heading">{title}<span>{results.length}</span><span className="game-shelf-bus" aria-hidden="true"><i /></span></h3>
          <GameShelfRail kind={kind} records={results} query={query} onOpenRecord={onOpenRecord} />
        </section>;
      })}
      <p className="game-shelf-live" role="status">{query ? `${count} ${count === 1 ? "game" : "games"} found` : ""}</p>
    </section>
  </section>;
}

function GameShelfRail({ kind, records, query, onOpenRecord }: Pick<SectionPageProps, "records" | "onOpenRecord"> & { kind: "session" | "past"; query: string }) {
  const shelfRef = useRef<HTMLDivElement>(null);
  const offset = useRef(0);
  const railId = `game-rail-${kind}`;
  const label = kind === "session" ? "Session Logs" : "Past Logs";
  useLayoutEffect(() => sectionMotion.revealInstrumentShelf(shelfRef.current), []);
  useLayoutEffect(() => {
    const shelf = shelfRef.current;
    if (shelf) shelf.scrollLeft = query ? 0 : offset.current;
    return sectionMotion.bindInstrumentShelf(shelf);
  }, [query, records.length]);
  return <div className="game-shelf-track">
    <div ref={shelfRef} id={railId} className="record-media-cabinet" data-media-cabinet={kind} onScroll={(event) => { if (!query) offset.current = event.currentTarget.scrollLeft; }}>
      {records.length ? records.map((record) => <RecordSelectorTile key={record.id} record={record} onOpenRecord={onOpenRecord} />) : <p className="search-empty">{query ? "No matching games." : "No records filed here yet."}</p>}
    </div>
    <button className="game-shelf-edge" type="button" data-shelf-prev="" aria-disabled="true" tabIndex={-1} aria-controls={railId} aria-label={`Scroll ${label} left`}><ChevronLeft size={20} aria-hidden="true" /></button>
    <button className="game-shelf-edge" type="button" data-shelf-next="" aria-disabled="true" tabIndex={-1} aria-controls={railId} aria-label={`Scroll ${label} right`}><ChevronRight size={20} aria-hidden="true" /></button>
  </div>;
}

function RecordSelector({ groups, onOpenRecord }: Pick<SectionPageProps, "onOpenRecord"> & { groups: SelectorGroup[] }) {
  const [selectedGroup, setGroup] = useState<number>();
  const [projectIds, setProjectIds] = useState<Record<number, string>>({});
  const readerRef = useRef<HTMLElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const commitTurn = useRef<(() => void) | null>(null);
  const index = selectedGroup ?? (groups[0].records.length || !groups[1].records.length ? 0 : 1);
  const group = groups[index];
  const other = index === 1;
  const workbench = pocket.projectWorkbench(group.records, projectIds[index]);
  const count = group.records.length;
  const page = workbench?.index ?? 0;
  const step = (direction: -1 | 1, wrap = false) => {
    if (!workbench || count < 2) return;
    const next = wrap ? (page + direction + count) % count : page + direction;
    if (next < 0 || next >= count) return;
    commitTurn.current = sectionMotion.preparePlateTurn(frameRef.current, direction);
    setProjectIds((current) => ({ ...current, [index]: group.records[next].id }));
  };
  const rotate = useEffectEvent(() => step(1, true));
  useLayoutEffect(() => sectionMotion.revealProjectReader(frameRef.current), []);
  useLayoutEffect(() => sectionMotion.bindSectionStandby(readerRef.current, "projects"), []);
  useEffect(() => sectionMotion.bindProjectRotation(readerRef.current, rotate), []);
  useLayoutEffect(() => {
    commitTurn.current?.();
    commitTurn.current = null;
  }, [workbench?.record.id]);
  return <section ref={readerRef} className="record-selector" aria-label="Browse records" data-workbench={other ? "other" : "active"} data-project-count={count}>
    <div className="record-selector-toolbar">
      <div className="record-selector-groups" role="group" aria-label="Record groups">
        {groups.map((entry, i) => <button key={entry.title} type="button" aria-pressed={i === index} onClick={() => setGroup(i)}>{entry.title}<span>{entry.records.length}</span></button>)}
      </div>
      <nav className="record-selector-pager" aria-label="Project plates" hidden={count < 2}>
        <button type="button" aria-label="Previous project" aria-disabled={page === 0} onClick={() => step(-1)}><ChevronLeft size={16} aria-hidden="true" /></button>
        <span>{page + 1} / {count}</span>
        <button type="button" aria-label="Next project" aria-disabled={page + 1 === count} onClick={() => step(1)}><ChevronRight size={16} aria-hidden="true" /></button>
      </nav>
    </div>
    {workbench ? <div className="project-workbench">
      <div ref={frameRef} className="project-workbench-frame">
        <ProjectWorkprint workbench={workbench} other={other} onOpenRecord={onOpenRecord} />
        <span className="project-workbench-register" aria-hidden="true" />
      </div>
    </div> : <p className="search-empty">No records filed here yet.</p>}
  </section>;
}

function ProjectWorkprint({ workbench, other, onOpenRecord }: { workbench: NonNullable<ReturnType<typeof pocket.projectWorkbench<RecordEntry>>>; other: boolean; onOpenRecord: (record: RecordEntry) => void }) {
  const { record, brief, progress, stops, more } = workbench;
  return <div className="project-workbench-record">
    {other ? <span className="project-state-mark" aria-hidden="true">{record.status}</span> : null}
    <div className="project-workbench-brief">
      <p className="project-workbench-signal">{record.status}</p>
      <h3>{record.title}</h3>
      {brief ? <p>{brief}</p> : null}
    </div>
    <div className="project-workbench-progress">
      <div className="project-workbench-caption"><span>{stops.length ? "Milestone trace" : "Progress readout"}</span><b>{progress}% overall</b></div>
      {stops.length ? <ol className="project-milestone-trace" role="list">
        {stops.map(({ label, state, value }, index) => <li key={`${index}-${label}`} data-stop={state}><i className="project-milestone-node" aria-hidden="true" /><strong>{label}</strong><small>{value}</small></li>)}
      </ol> : <meter min="0" max="100" value={progress} aria-label="Project progress" />}
      {more ? <small className="project-milestone-more">+{more} in record</small> : null}
    </div>
    <button className="project-workbench-hit" type="button" aria-label={`Open ${record.title}`} onClick={(event) => sectionMotion.openProjectPlate(event.currentTarget, () => onOpenRecord(record))}><span className="project-workbench-light" aria-hidden="true" /></button>
  </div>;
}

function RecordSelectorTile({ record, onOpenRecord }: { record: RecordEntry; onOpenRecord: (record: RecordEntry) => void }) {
  const status = gameActivityLabel(record);
  const activity = gameLogPlacement(record) === "session" && (status === "Active" || status === "Inactive") ? status : "";
  return <button className="record-sleeve" data-game-sleeve="" data-state={recordStateKey(status)} type="button" aria-label={activity ? `${record.title}, ${activity}` : record.title} onClick={(event) => sectionMotion.openInstrumentSleeve(event.currentTarget, () => onOpenRecord(record), event.detail > 0)}>
    <span className="record-sleeve-art" aria-hidden="true">
      <span className="record-sleeve-label"><strong>{record.title}</strong>{activity ? <small>{activity}</small> : null}</span>
      <span className="game-disk-well"><span className="game-disk-hub" /></span>
      <span className="game-disk-contacts" />
    </span>
  </button>;
}

function SectionNotePreview({ records, kind, onOpenRecord }: Pick<SectionPageProps, "records" | "onOpenRecord"> & { kind: "projects" | "games" | "logs" }) {
  const update = latestSectionNote(records, kind);
  if (!update) return null;
  const label = kind === "projects" ? "LATEST UPDATE" : kind === "games" ? "LATEST SESSION" : "READING DESK";
  const showTitle = update.title !== update.record.title && !/^(?:current note|new note|untitled note)$/i.test(update.title);
  return <aside className={`section-note-preview section-note-preview--${kind}`} aria-label={kind === "projects" ? "Latest project update" : kind === "games" ? "Latest written game session" : "Latest field note"}>
    <h3>// {label}</h3>
    <button className="section-note-link" type="button" onClick={() => onOpenRecord(update.record, "notes", update.noteIndex)}>
      <time dateTime={update.date}>{formatReadableDate(update.date)}</time>
      <strong>{update.record.title}</strong>
      {showTitle ? <span className="section-note-title">{update.title}</span> : null}
      {update.image ? <img src={update.image} alt="" loading="lazy" decoding="async" /> : null}
      <p>{update.excerpt}</p>
      <span className="section-note-open">{kind === "projects" ? "Read update" : kind === "games" ? "Read session" : "Read full note"} &#8594;</span>
    </button>
  </aside>;
}

function ArchiveFolders({ onOpenRecord, records, section }: { onOpenRecord: (record: RecordEntry) => void; records: RecordEntry[]; section: ArchiveSectionConfig }) {
  const { archivedLogs, folders, looseGroups } = buildFieldArchive(records);
  const [activeFolder, setActiveFolder] = useState<string | null>(null);
  const archiveDates = [...looseGroups, ...folders].flatMap((group) => group.records.map((record) => logArchiveDate(record))).sort();
  const looseCount = looseGroups.reduce((count, group) => count + group.records.length, 0);
  const usesFolders = folders.length > 0;
  const activeFolderData = folders.find((folder) => folder.title === activeFolder) ?? null;
  const hasActiveFolder = Boolean(activeFolderData);
  const oldestDate = archiveDates[0] ? formatReadableDate(archiveDates[0]) : "-- / -- / ----";
  const newestDateValue = archiveDates.at(-1);
  const newestDate = newestDateValue ? formatReadableDate(newestDateValue) : "-- / -- / ----";

  useEffect(() => {
    if (activeFolder && !hasActiveFolder) setActiveFolder(null);
  }, [activeFolder, hasActiveFolder]);

  useEffect(() => {
    if (!hasActiveFolder) return;

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setActiveFolder(null);
    };

    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [hasActiveFolder]);

  return (
    <section className={`section-page section-page--archive archive-folder-page${activeFolderData ? " has-folder-window" : ""}`} aria-label={`${section.code} files`}>
      <header className="section-page-header">
        <span className="nav-mark" data-icon={section.icon} aria-hidden="true" />
        <div>
          <p>{section.code}</p>
          <h2>{sectionRegistryLabels[section.id] ?? section.label}</h2>
          <SectionReadout items={sectionReadout(records)} />
        </div>
        <i>{archivedLogs.length} archived logs</i>
      </header>
      <div className="archive-manager">
        <aside className="archive-manager-side" aria-label="Archive locations and details">
          <div className="archive-manager-section">
            <p className="archive-manager-label">{usesFolders ? "LOCATIONS" : "DATE INDEX"}</p>
            <div className="archive-manager-tree">
              <div className="archive-tree-root"><HardDrive size={15} aria-hidden="true" /><span>FIELD ARCHIVE</span></div>
              {looseGroups.map((group) => (
                <div className="archive-tree-date" key={group.title}><span>{group.title}</span><i>{group.records.length}</i></div>
              ))}
              {folders.map((folder) => (
                <button className="archive-tree-folder" key={folder.title} type="button" onClick={() => setActiveFolder(folder.title)}>
                  <Folder size={15} aria-hidden="true" /><span>{folder.title}</span><i>{folder.records.length}</i>
                </button>
              ))}
              {!archiveDates.length ? <span className="archive-tree-empty">No files filed.</span> : null}
            </div>
          </div>
          <div className="archive-manager-section archive-manager-details">
            <p className="archive-manager-label">ARCHIVE STATUS</p>
            <dl>
              <div><dt>FOLDERS</dt><dd>{String(folders.length).padStart(2, "0")}</dd></div>
              <div><dt>FILES</dt><dd>{String(archiveDates.length).padStart(2, "0")}</dd></div>
              <div><dt>OLDEST</dt><dd>{oldestDate}</dd></div>
              <div><dt>NEWEST</dt><dd>{newestDate}</dd></div>
              <div><dt>LOGS FILED AFTER</dt><dd>{LOG_ARCHIVE_AFTER_DAYS} DAYS</dd></div>
            </dl>
          </div>
        </aside>
        <div className="archive-manager-main">
          <div className="archive-manager-toolbar">
            <span><FolderOpen size={16} aria-hidden="true" /> FIELD ARCHIVE</span>
            <small>{looseCount} {looseCount === 1 ? "file" : "files"}{usesFolders ? ` / ${folders.length} ${folders.length === 1 ? "folder" : "folders"}` : ""}</small>
          </div>
          <div className="archive-root-files">
            {looseGroups.map((group) => (
              <section className="archive-root-group" key={group.title} aria-label={`${group.title} files`}>
                <h3><span>{group.title}</span><small>{group.detail} / {group.records.length} {group.records.length === 1 ? "FILE" : "FILES"}</small></h3>
                <div className="archive-file-grid">
                  {group.records.map((record) => <ArchiveFile key={record.id} record={record} onOpenRecord={onOpenRecord} />)}
                </div>
              </section>
            ))}
            {usesFolders ? <section className="archive-root-group" aria-label="Monthly folders">
              <h3><span>MONTHLY FILES</span><small>{folders.length} {folders.length === 1 ? "FOLDER" : "FOLDERS"}</small></h3>
              <div className="archive-folder-tiles">
                {folders.map((folder) => (
                  <button className="archive-folder-tile" key={folder.title} type="button" onClick={() => setActiveFolder(folder.title)}>
                    <Folder size={30} strokeWidth={1.25} aria-hidden="true" />
                    <span><strong>{folder.title}</strong><small>{folder.detail}</small></span>
                    <i>{folder.records.length} {folder.records.length === 1 ? "file" : "files"}</i>
                  </button>
                ))}
              </div>
            </section> : null}
            {!archiveDates.length ? <p className="search-empty">No records have reached the archive threshold yet.</p> : null}
          </div>
          <p className="archive-manager-footnote">LOGS ARE FILED HERE AFTER {LOG_ARCHIVE_AFTER_DAYS} DAYS . FOLDERS AND FILES ARE ORDERED NEWEST TO OLDEST</p>
        </div>
      </div>
      {activeFolderData ? (
        <div className="archive-folder-overlay">
          <button className="archive-folder-backdrop" type="button" aria-label="Close folder window" onClick={() => setActiveFolder(null)} />
          <section className="archive-folder-window" role="dialog" aria-modal="true" aria-label={`${activeFolderData.title} folder`}>
            <header className="archive-folder-titlebar">
              <span><FolderOpen size={16} aria-hidden="true" /> FIELD ARCHIVE / {activeFolderData.title}</span>
              <button autoFocus type="button" aria-label="Close folder window" title="Close folder" onClick={() => setActiveFolder(null)}><X size={16} /></button>
            </header>
            <div className="archive-folder-pathbar">
              <button type="button" aria-label="Up to Field Archive" onClick={() => setActiveFolder(null)}><ArrowUp size={15} /></button>
              <span><span>Field Archive</span><b>/</b><strong>{activeFolderData.title}</strong></span>
              <small>{activeFolderData.records.length} {activeFolderData.records.length === 1 ? "file" : "files"}</small>
            </div>
            <div className="archive-folder-window-body">
              <aside className="archive-window-side" aria-label="Archive folders">
                <p className="archive-manager-label">ARCHIVE</p>
                <button className="archive-window-root" type="button" onClick={() => setActiveFolder(null)}><HardDrive size={15} /> Field Archive</button>
                <div className="archive-window-tree">
                  {folders.map((folder) => (
                    <button className={folder.title === activeFolderData.title ? "is-active" : ""} key={folder.title} type="button" onClick={() => setActiveFolder(folder.title)}>
                      <Folder size={14} /><span>{folder.title}</span><i>{folder.records.length}</i>
                    </button>
                  ))}
                </div>
                <div className="archive-window-selection">
                  <p>SELECTED FOLDER</p>
                  <strong>{activeFolderData.title}</strong>
                  <span>{activeFolderData.detail}</span>
                  <small>{activeFolderData.records.length} {activeFolderData.records.length === 1 ? "file" : "files"}</small>
                  <small>{activeFolderData.records.length ? `${formatReadableDate(logArchiveDate(activeFolderData.records.at(-1)!))} - ${formatReadableDate(logArchiveDate(activeFolderData.records[0]))}` : "No date range"}</small>
                </div>
              </aside>
              <div className="archive-folder-files">
                <div className="archive-folder-files-toolbar"><span>FILES</span><span>DATE ORDER . NEWEST FIRST</span></div>
                <div className="archive-file-grid">
                  {activeFolderData.records.map((record) => (
                    <ArchiveFile key={record.id} record={record} onOpenRecord={(entry) => { setActiveFolder(null); onOpenRecord(entry); }} />
                  ))}
                </div>
                {!activeFolderData.records.length ? <p className="search-empty">This folder contains no files.</p> : null}
                <div className="archive-folder-status"><span>{activeFolderData.records.length} items</span><span>Sorted by date . Newest first</span></div>
              </div>
            </div>
          </section>
        </div>
      ) : null}
    </section>
  );
}

function ArchiveFile({ record, onOpenRecord }: { record: RecordEntry; onOpenRecord: (record: RecordEntry) => void }) {
  return (
    <button className="archive-file" type="button" title={record.title} onClick={() => onOpenRecord(record)}>
      <FileText size={18} strokeWidth={1.5} aria-hidden="true" />
      <span><strong>{record.title}</strong><small>{formatReadableDate(logArchiveDate(record))} <i>{record.section === "logs" ? "FIELD NOTE" : record.type.toUpperCase()}</i></small></span>
    </button>
  );
}

function CreateRecordButton({ onClick, label = "Create record" }: { onClick: () => void; label?: string }) {
  return (
    <button className="archive-create-record" type="button" aria-label={label} title={label} onClick={onClick}>
      <Plus size={15} aria-hidden="true" />
    </button>
  );
}

function SectionRecordButton({ onOpenRecord, record }: { onOpenRecord: (record: RecordEntry) => void; record: RecordEntry }) {
  return (
    <button className="section-record" data-state={recordStateKey(gameActivityLabel(record))} type="button" onClick={() => onOpenRecord(record)}>
      <span className="section-record-kind">
        <span>{record.type}</span>
        <small>{recordLinks.traceId(record.id, record.section)}</small>
      </span>
      <strong>{record.title}</strong>
      <span>{record.section === "logs" ? recordDisplaySummary(record) : record.summary}</span>
      <i>
        {gameActivityLabel(record)} . {formatReadableDate(record.updated)}
      </i>
    </button>
  );
}

function recordStateKey(status: string): string {
  return status.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "unknown";
}

function SectionReadout({ items }: { items: Array<{ label: string; value: string }> }) {
  return (
    <dl className="section-page-readout">
      {items.map((item) => (
        <div key={item.label}>
          <dt>{item.label}</dt>
          <dd>{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}

function sectionReadout(records: RecordEntry[], split: SelectorGroup[] | null = null, section?: RecordSection): Array<{ label: string; value: string }> {
  const archivedStatuses = new Set(["archived", "completed", "deprecated", "done", "filed"]);
  const openCount = split?.[0].records.length ?? records.filter((record) => !archivedStatuses.has(record.status.toLowerCase())).length;
  const filedCount = records.length - openCount;

  return [
    { label: section === "games" ? "SESSION" : section === "projects" ? "ACTIVE" : "OPEN", value: String(openCount).padStart(2, "0") },
    { label: section === "games" ? "PAST" : section === "projects" ? "OTHER" : "FILED", value: String(filedCount).padStart(2, "0") },
    { label: "LAST", value: records[0] ? formatReadableDate(records[0].updated) : "-- / -- / ----" }
  ];
}

function splitSectionRecords(section: RecordSection, records: RecordEntry[]): Array<{ records: RecordEntry[]; title: string }> | null {
  if (section === "projects") {
    const activeStatuses = new Set(["active", "in progress", "planning", "blocked"]);

    return [
      { title: "ACTIVE PROJECTS", records: records.filter((record) => activeStatuses.has(record.status.toLowerCase())) },
      { title: "OTHER PROJECTS", records: records.filter((record) => !activeStatuses.has(record.status.toLowerCase())) }
    ];
  }

  if (section === "games") {
    return [
      { title: "SESSION LOGS", records: records.filter((record) => gameLogPlacement(record) === "session") },
      { title: "PAST LOGS", records: records.filter((record) => gameLogPlacement(record) === "past") }
    ];
  }

  return null;
}

function SetupBay({
  countLabel,
  onCreateRecord,
  onEditTool,
  onOpenRecord,
  readout,
  records,
  section
}: {
  countLabel: string;
  onCreateRecord?: (group: SetupGroupId) => void;
  onEditTool?: (record: RecordEntry) => void;
  onOpenRecord: (record: RecordEntry) => void;
  readout: Array<{ label: string; value: string }>;
  records: RecordEntry[];
  section: ArchiveSectionConfig;
}) {
  const [editingTools, setEditingTools] = useState(false);
  const groups = setupGroupRegistry.map((group) => ({
    ...group,
    records: records.filter((record) => setupGroupFor(record) === group.id)
  }));

  return (
    <section className="section-page setup-bay" aria-label={`${section.code} device bay`}>
      <header className="section-page-header setup-bay-header">
        <span className="nav-mark" data-icon={section.icon} aria-hidden="true" />
        <div>
          <p>{section.code}</p>
          <h2>Setup Manifest</h2>
          <SectionReadout items={readout} />
        </div>
        <i>{countLabel}</i>
      </header>

      <div className="setup-bay-grid">
        {groups.map((group) => (
          <section className={`setup-group setup-group--${group.id}`} key={group.id} aria-label={group.title}>
            <header>
              <div>
                <span>{group.path}</span>
                <h3>{group.title}</h3>
              </div>
              <div className="setup-group-actions">
                <i>{group.records.length}</i>
                {group.id === "tools" && group.records.length > 0 && onEditTool ? <button type="button" className="archive-create-record setup-edit-shortcuts" aria-label="Edit shortcuts" aria-pressed={editingTools} title={editingTools ? "Stop editing shortcuts" : "Edit shortcuts"} onClick={() => setEditingTools((current) => !current)}>
                  <Pencil size={15} aria-hidden="true" />{editingTools ? "Done" : "Edit"}
                </button> : null}
                {onCreateRecord ? <CreateRecordButton onClick={() => onCreateRecord(group.id)} label={setupCreateLabels[group.id]} /> : null}
              </div>
            </header>
            <p>{group.detail}</p>
            <div className="setup-tile-grid">
              {group.records.length > 0 ? (
                group.records.map((record) => (
                  <SetupTile key={record.id} record={record} onOpenRecord={onOpenRecord} onEditTool={editingTools && group.id === "tools" ? onEditTool : undefined} />
                ))
              ) : (
                <span className="setup-empty">No files mounted.</span>
              )}
            </div>
          </section>
        ))}
      </div>
    </section>
  );
}

function SetupTile({ onOpenRecord, onEditTool, record }: { onOpenRecord: (record: RecordEntry) => void; onEditTool?: (record: RecordEntry) => void; record: RecordEntry }) {
  const group = setupGroupFor(record);
  const image = setupTileImage(record);
  const profile = setupProfile(record);
  const externalUrl = safeExternalUrl(record.meta.externalUrl);
  const action = group === "tools" ? onEditTool ? "edit" : externalUrl ? "launch" : "idle" : group === "peripherals" ? "inspect" : group === "notes" ? "read" : "boot";
  const metaLine = group === "peripherals" ? cleanDisplaySummary(record.summary) : `${profile.category} . ${record.status}`;
  const content = (
    <>
      <span className={image ? "setup-tile-icon has-image" : "setup-tile-icon"} aria-hidden="true">
        {image ? <img src={image} alt="" decoding="async" loading="lazy" /> : null}
        <span className="setup-tile-glyph" />
      </span>
      <span className="setup-tile-body">
        <strong>{record.title}</strong>
        {metaLine ? <small>{metaLine}</small> : null}
      </span>
      <i>{action}</i>
    </>
  );

  if (group === "tools") {
    if (onEditTool) return <button className="setup-tile setup-tile--tools is-editing" type="button" aria-label={`Edit ${record.title}`} onClick={() => onEditTool(record)}>{content}</button>;
    if (externalUrl) {
      return (
        <a className="setup-tile setup-tile--tools" href={externalUrl} target="_blank" rel="noreferrer">
          {content}
        </a>
      );
    }

    return (
      <button className="setup-tile setup-tile--tools is-inert" type="button" aria-disabled="true">
        {content}
      </button>
    );
  }

  return (
    <button className={`setup-tile setup-tile--${group}`} type="button" onClick={() => onOpenRecord(record)}>
      {content}
    </button>
  );
}

function setupTileImage(record: RecordEntry): string {
  const iconImage = typeof record.meta.iconImage === "string" ? record.meta.iconImage : "";

  return iconImage || recordHeaderImage(record) || record.banner || "";
}

function safeExternalUrl(value: unknown): string {
  return typeof value === "string" && /^https?:\/\/[^\s]+$/i.test(value) ? value : "";
}

function cleanDisplaySummary(value: string): string {
  const summary = value.trim();

  return summary && summary.toLowerCase() !== "no summary recorded." ? summary : "";
}
