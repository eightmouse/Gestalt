import type { CSSProperties } from "react";
import type { RecordEntry, RecordSection } from "@/lib/types";
import { formatReadableDate, recordHeaderImage } from "@/components/archive/record-utils";
import { setupGroupFor, setupGroupRegistry, setupProfile } from "@/components/archive/setup-utils";

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
};

const sectionRegistryLabels: Partial<Record<RecordSection, string>> = {
  archive: "Deprecated Index",
  games: "Play Log Registry",
  logs: "Field Note Index",
  projects: "Process Registry",
  setup: "Setup Manifest"
};

const sessionGameStatuses = new Set(["active", "in progress", "on hold", "paused", "planning", "playing"]);

export function SectionPage({ records, section, onOpenRecord }: SectionPageProps) {
  const sortedRecords = [...records].sort((a, b) => b.updated.localeCompare(a.updated) || a.priority - b.priority);
  const countLabel = `${sortedRecords.length} ${sortedRecords.length === 1 ? "record" : "records"}`;
  const splitSection = splitSectionRecords(section.id, sortedRecords);
  const readout = sectionReadout(sortedRecords);

  if (section.id === "setup") {
    return <SetupBay countLabel={countLabel} onOpenRecord={onOpenRecord} readout={readout} records={sortedRecords} section={section} />;
  }

  if (splitSection) {
    return (
      <section className="section-page section-page--split" aria-label={`${section.code} records`}>
        <header className="section-page-header">
          <span className="nav-mark" data-icon={section.icon} aria-hidden="true" />
          <div>
            <p>{section.code}</p>
            <h2>{sectionRegistryLabels[section.id] ?? section.label}</h2>
            <SectionReadout items={readout} />
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
          <h2>{sectionRegistryLabels[section.id] ?? section.label}</h2>
          <SectionReadout items={readout} />
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
    <button
      className="section-record"
      data-state={recordStateKey(record.status)}
      style={{ "--record-progress": `${recordProgress(record)}%` } as CSSProperties}
      type="button"
      onClick={() => onOpenRecord(record)}
    >
      <span className="section-record-kind">
        <span>{record.type}</span>
        <small>{recordTraceId(record)}</small>
      </span>
      <strong>{record.title}</strong>
      <span>{record.summary}</span>
      <i>
        {record.status} . {formatReadableDate(record.updated)}
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

function recordProgress(record: RecordEntry): number {
  return Math.max(0, Math.min(100, Number(record.progress) || 0));
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
  const openCount = records.filter((record) => !archivedStatuses.has(record.status.toLowerCase())).length;
  const filedCount = records.length - openCount;

  return [
    { label: "OPEN", value: String(openCount).padStart(2, "0") },
    { label: "FILED", value: String(filedCount).padStart(2, "0") },
    { label: "LAST", value: records[0] ? formatReadableDate(records[0].updated) : "-- / -- / ----" }
  ];
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
      { title: "SESSION LOGS", records: records.filter((record) => sessionGameStatuses.has(record.status.toLowerCase())) },
      { title: "PAST LOGS", records: records.filter((record) => !sessionGameStatuses.has(record.status.toLowerCase())) }
    ];
  }

  return null;
}

function SetupBay({
  countLabel,
  onOpenRecord,
  readout,
  records,
  section
}: {
  countLabel: string;
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
              <i>{group.records.length}</i>
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
  const image = recordHeaderImage(record) || record.banner;
  const profile = setupProfile(record);

  return (
    <button className="setup-tile" type="button" onClick={() => onOpenRecord(record)}>
      <span className="setup-tile-icon" aria-hidden="true">
        {image ? <img src={image} alt="" decoding="async" loading="lazy" /> : null}
      </span>
      <span className="setup-tile-body">
        <strong>{record.title}</strong>
        <small>{profile.category} . {record.status}</small>
      </span>
      <i>open</i>
    </button>
  );
}
