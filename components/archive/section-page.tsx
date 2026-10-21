import type { RecordEntry, RecordSection } from "@/lib/types";
import { gameActivityLabel, gameLogPlacement } from "@/lib/game-state";
import { formatReadableDate, recordDisplaySummary, recordHeaderImage } from "@/components/archive/record-utils";
import { setupGroupFor, setupGroupRegistry, setupProfile, type SetupGroupId } from "@/components/archive/setup-utils";
import { ArrowUp, FileText, Folder, FolderOpen, HardDrive, Plus, X } from "lucide-react";
import { archiveUsesFolders, compareSectionRecords, isLogArchivedByAge, logArchiveDate, LOG_ARCHIVE_AFTER_DAYS } from "@/lib/log-archive";
import { useEffect, useState } from "react";

type ArchiveSectionConfig = {
  id: RecordSection;
  code: string;
  label: string;
  icon: string;
};

type SectionPageProps = {
  records: RecordEntry[];
  section: ArchiveSectionConfig;
  onOpenRecord: (record: RecordEntry) => void;
  onCreateRecord?: () => void;
  onCreateSetupRecord?: (group: SetupGroupId) => void;
};

const sectionRegistryLabels: Partial<Record<RecordSection, string>> = {
  archive: "Field Archive",
  games: "Play Log Registry",
  logs: "Field Note Index",
  projects: "Process Registry",
  setup: "Setup Manifest"
};

export function SectionPage({ records, section, onOpenRecord, onCreateRecord, onCreateSetupRecord }: SectionPageProps) {
  const visibleRecords = section.id === "logs" ? records.filter((record) => !isLogArchivedByAge(record)) : records;
  const sortedRecords = [...visibleRecords].sort(compareSectionRecords);
  const countLabel = `${sortedRecords.length} ${sortedRecords.length === 1 ? "record" : "records"}`;
  const splitSection = splitSectionRecords(section.id, sortedRecords);
  const readout = sectionReadout(sortedRecords);

  if (section.id === "setup") {
    return <SetupBay countLabel={countLabel} onCreateRecord={onCreateSetupRecord} onOpenRecord={onOpenRecord} readout={readout} records={sortedRecords} section={section} />;
  }

  if (section.id === "archive") {
    return <ArchiveFolders onOpenRecord={onOpenRecord} records={sortedRecords} section={section} />;
  }

  if (splitSection) {
    return (
      <section className={`section-page section-page--split section-page--${section.id}`} aria-label={`${section.code} records`}>
        <header className="section-page-header">
          <span className="nav-mark" data-icon={section.icon} aria-hidden="true" />
          <div>
            <p>{section.code}</p>
            <h2>{sectionRegistryLabels[section.id] ?? section.label}</h2>
            <SectionReadout items={readout} />
          </div>
          <div className="section-page-header-actions">
            <i>{countLabel}</i>
            {onCreateRecord ? <CreateRecordButton onClick={onCreateRecord} /> : null}
          </div>
        </header>

        <div className="section-split-grid">
          {splitSection.map((group) => (
            <section className="section-record-column" key={group.title} aria-label={group.title}>
              <header>
                <div>
                  <h3>{group.title}</h3>
                  <small>{groupStatusLine(group.records)}</small>
                </div>
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
    <section className={`section-page section-page--${section.id}`} aria-label={`${section.code} records`}>
      <header className="section-page-header">
        <span className="nav-mark" data-icon={section.icon} aria-hidden="true" />
        <div>
          <p>{section.code}</p>
          <h2>{sectionRegistryLabels[section.id] ?? section.label}</h2>
          <SectionReadout items={readout} />
        </div>
        <div className="section-page-header-actions">
          <i>{countLabel}</i>
          {onCreateRecord ? <CreateRecordButton onClick={onCreateRecord} /> : null}
        </div>
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

function ArchiveFolders({ onOpenRecord, records, section }: { onOpenRecord: (record: RecordEntry) => void; records: RecordEntry[]; section: ArchiveSectionConfig }) {
  const nowArchivedLogs = records.filter((record) => record.section === "logs" && isLogArchivedByAge(record));
  const filedRecords = records.filter((record) => record.section !== "logs");
  const yearGroups = new Map<string, RecordEntry[]>();
  for (const record of nowArchivedLogs) {
    const year = logArchiveDate(record).slice(0, 4) || "Undated";
    yearGroups.set(year, [...(yearGroups.get(year) ?? []), record]);
  }
  const folders = [...yearGroups.entries()]
    .sort(([left], [right]) => right.localeCompare(left))
    .map(([year, yearRecords]) => ({ title: year, detail: "FIELD NOTES", records: sortByArchiveDate(yearRecords) }));

  if (filedRecords.length) {
    folders.push({ title: "FILED RECORDS", detail: "MANUAL ARCHIVE", records: sortByArchiveDate(filedRecords) });
  }

  const [activeFolder, setActiveFolder] = useState<string | null>(null);
  const archiveDates = folders.flatMap((folder) => folder.records.map((record) => logArchiveDate(record))).sort();
  const usesFolders = archiveUsesFolders(archiveDates.length);
  const activeFolderData = usesFolders ? folders.find((folder) => folder.title === activeFolder) ?? null : null;
  const oldestDate = archiveDates[0] ? formatReadableDate(archiveDates[0]) : "-- / -- / ----";
  const newestDateValue = archiveDates.at(-1);
  const newestDate = newestDateValue ? formatReadableDate(newestDateValue) : "-- / -- / ----";

  useEffect(() => {
    if (!usesFolders) setActiveFolder(null);
  }, [usesFolders]);

  useEffect(() => {
    if (!activeFolderData) return;

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setActiveFolder(null);
    };

    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [activeFolder]);

  return (
    <section className={`section-page section-page--archive archive-folder-page${activeFolderData ? " has-folder-window" : ""}`} aria-label={`${section.code} files`}>
      <header className="section-page-header">
        <span className="nav-mark" data-icon={section.icon} aria-hidden="true" />
        <div>
          <p>{section.code}</p>
          <h2>{sectionRegistryLabels[section.id] ?? section.label}</h2>
          <SectionReadout items={sectionReadout(records)} />
        </div>
        <i>{nowArchivedLogs.length} archived logs</i>
      </header>
      <div className="archive-manager">
        <aside className="archive-manager-side" aria-label="Archive locations and details">
          <div className="archive-manager-section">
            <p className="archive-manager-label">{usesFolders ? "LOCATIONS" : "DATE INDEX"}</p>
            <div className="archive-manager-tree">
              <div className="archive-tree-root"><HardDrive size={15} aria-hidden="true" /><span>FIELD ARCHIVE</span></div>
              {usesFolders ? folders.map((folder) => (
                <button className="archive-tree-folder" key={folder.title} type="button" onClick={() => setActiveFolder(folder.title)}>
                  <Folder size={15} aria-hidden="true" /><span>{folder.title}</span><i>{folder.records.length}</i>
                </button>
              )) : folders.map((folder) => (
                <div className="archive-tree-date" key={folder.title}><span>{folder.title}</span><i>{folder.records.length}</i></div>
              ))}
              {!folders.length ? <span className="archive-tree-empty">No files filed.</span> : null}
            </div>
          </div>
          <div className="archive-manager-section archive-manager-details">
            <p className="archive-manager-label">ARCHIVE STATUS</p>
            <dl>
              <div><dt>FOLDERS</dt><dd>{String(usesFolders ? folders.length : 0).padStart(2, "0")}</dd></div>
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
            <small>{usesFolders ? `${folders.length} ${folders.length === 1 ? "folder" : "folders"}` : `${archiveDates.length} ${archiveDates.length === 1 ? "file" : "files"}`}</small>
          </div>
          {usesFolders ? <div className="archive-folder-tiles">
            {folders.length ? folders.map((folder) => (
              <button className="archive-folder-tile" key={folder.title} type="button" onClick={() => setActiveFolder(folder.title)}>
                <Folder size={30} strokeWidth={1.25} aria-hidden="true" />
                <span><strong>{folder.title}</strong><small>{folder.detail}</small></span>
                <i>{folder.records.length} {folder.records.length === 1 ? "file" : "files"}</i>
              </button>
            )) : <p className="search-empty">No records have reached the archive threshold yet.</p>}
          </div> : <div className="archive-root-files">
            {folders.map((group) => (
              <section className="archive-root-group" key={group.title} aria-label={`${group.title} files`}>
                <h3><span>{group.title}</span><small>{group.detail} / {group.records.length} {group.records.length === 1 ? "FILE" : "FILES"}</small></h3>
                <div className="archive-file-grid">
                  {group.records.map((record) => <ArchiveFile key={record.id} record={record} onOpenRecord={onOpenRecord} />)}
                </div>
              </section>
            ))}
            {!folders.length ? <p className="search-empty">No records have reached the archive threshold yet.</p> : null}
          </div>}
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

function sortByArchiveDate(records: RecordEntry[]): RecordEntry[] {
  return [...records].sort((a, b) => logArchiveDate(b).localeCompare(logArchiveDate(a)) || compareSectionRecords(a, b));
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
        <small>{recordTraceId(record)}</small>
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

function recordTraceId(record: RecordEntry): string {
  return `#${record.section.slice(0, 3).toUpperCase()}-${record.priority.toString().padStart(3, "0")}`;
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

function sectionReadout(records: RecordEntry[]): Array<{ label: string; value: string }> {
  const archivedStatuses = new Set(["archived", "completed", "deprecated", "done", "filed"]);
  const openCount = records.filter((record) => record.section === "games" ? gameLogPlacement(record) === "session" : !archivedStatuses.has(record.status.toLowerCase())).length;
  const filedCount = records.length - openCount;

  return [
    { label: "OPEN", value: String(openCount).padStart(2, "0") },
    { label: "FILED", value: String(filedCount).padStart(2, "0") },
    { label: "LAST", value: records[0] ? formatReadableDate(records[0].updated) : "-- / -- / ----" }
  ];
}

function groupStatusLine(records: RecordEntry[]): string {
  if (records.length > 0 && records[0].section === "games") {
    const activeCount = records.filter((record) => ["active", "playing", "in progress"].includes(gameActivityLabel(record).toLowerCase())).length;
    return `${activeCount} active / ${records.length} indexed`;
  }
  const liveStatuses = new Set(["active", "blocked", "in progress", "on hold", "paused", "planning", "playing"]);
  const liveCount = records.filter((record) => liveStatuses.has(record.status.toLowerCase())).length;

  return `${liveCount} live ${liveCount === 1 ? "file" : "files"} / ${records.length} indexed`;
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
  onOpenRecord,
  readout,
  records,
  section
}: {
  countLabel: string;
  onCreateRecord?: (group: SetupGroupId) => void;
  onOpenRecord: (record: RecordEntry) => void;
  readout: Array<{ label: string; value: string }>;
  records: RecordEntry[];
  section: ArchiveSectionConfig;
}) {
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
                {onCreateRecord ? <CreateRecordButton onClick={() => onCreateRecord(group.id)} label={`Add ${group.title.toLowerCase()} record`} /> : null}
              </div>
            </header>
            <p>{group.detail}</p>
            <div className="setup-tile-grid">
              {group.records.length > 0 ? (
                group.records.map((record) => (
                  <SetupTile key={record.id} record={record} onOpenRecord={onOpenRecord} />
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

function SetupTile({ onOpenRecord, record }: { onOpenRecord: (record: RecordEntry) => void; record: RecordEntry }) {
  const group = setupGroupFor(record);
  const image = setupTileImage(record);
  const profile = setupProfile(record);
  const externalUrl = safeExternalUrl(record.meta.externalUrl);
  const action = group === "tools" ? externalUrl ? "launch" : "idle" : group === "peripherals" ? "inspect" : group === "notes" ? "read" : "boot";
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
