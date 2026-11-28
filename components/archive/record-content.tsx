"use client";

import { ArrowLeft, ArrowUpRight, ChevronLeft, ChevronRight, Cpu, FileText, Search, X } from "lucide-react";
import { ImageLightbox } from "@/components/archive/image-lightbox";
import { useEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import {
  formatReadableDate,
  matchingNotes,
  metaText,
  noteEntries,
  notePage,
  recordLastUpdated,
  splitUpdateIndex
} from "@/components/archive/record-utils";
import { setupHardwareSource } from "@/components/archive/setup-utils";
import type { ContentKey } from "@/components/archive/types";
import type { RecordEntry } from "@/lib/types";
import noteInline, { type ArchiveNote, type NoteInlineToken } from "@/public/note-inline.js";
import { NoteLinkControl } from "@/components/archive/record-link-control";
import { steamBannerImage } from "@/public/steam-display.mjs";
import imageFraming from "@/public/image-framing.js";
import memoryState from "@/public/memory-state.js";
import pocket from "@/public/pocket-index.js";
export function getRecordContents(record: RecordEntry): Array<{ key: ContentKey; label: string }> {
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
    const contents: Array<{ key: ContentKey; label: string }> = [
      { key: "notes", label: "Note" }
    ];

    return hasRecordAttachments(record) ? [...contents, { key: "attachments", label: "Attachments" }] : contents;
  }

  if (record.section === "projects") {
    const contents: Array<{ key: ContentKey; label: string }> = [
      { key: "overview", label: "Overview" },
      { key: "notes", label: "Notes" },
      { key: "technical", label: "Technical Stack" },
      { key: "samples", label: "Samples" }
    ];
    return contents.filter((item) => {
      if (item.key === "technical") return getTextList(record.meta.technicalStack).length > 0;
      if (item.key === "samples") return recordMediaSources(record, "samples").length > 0;
      return true;
    });
  }

  return [
    { key: "overview", label: "Overview" },
    { key: "notes", label: "Notes" },
    { key: "changelog", label: "Change Log" }
  ];
}

export function contentOrdinal(record: RecordEntry, index: number): string {
  return String(record.section === "projects" && getTextList(record.meta.technicalStack).length > 0 ? index : index + 1).padStart(2, "0");
}

function getTextList(value: unknown): string[] {
  return metaText(value)
    .split(/\r?\n|\|/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function RecordContentPanel({ activeContent, focusedNoteIndex, noteSearchQuery, record, shareable, handheld, noteSearch }: { activeContent: ContentKey; focusedNoteIndex?: number; noteSearchQuery: string; record: RecordEntry; shareable?: boolean; handheld?: boolean; noteSearch?: ReactNode }) {
  if (activeContent === "overview") {
    return <RecordOverviewPage record={record} />;
  }

  if (activeContent === "samples") {
    return <SampleGrid record={record} />;
  }

  if (activeContent === "attachments") {
    return <AttachmentGrid prefix="ATTACH" record={record} title="ATTACHMENTS" />;
  }

  if (activeContent === "notes") {
    if (record.section === "logs") return <LogNoteContent record={record} focusedIndex={focusedNoteIndex} shareable={shareable} />;
    return <NotesPage key={focusedNoteIndex ?? "default"} focusedIndex={focusedNoteIndex} query={noteSearchQuery} record={record} shareable={shareable} handheld={handheld} searchControl={noteSearch} />;
  }

  if (activeContent === "technical") {
    const stackItems = getTextList(record.meta.technicalStack);

    return (
      <section className="content-terminal" aria-label={`${record.title} technical stack`}>
        <div className="terminal-title">// TECHNICAL STACK</div>
        <div className="detail-list">
          {stackItems.map((item) => (
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
            <strong>{formatReadableDate(recordLastUpdated(record))}</strong>
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
  const hasHeaderArtwork = Boolean(imageFraming.recordHeadingArtwork(record));
  const showOverviewBanner = !hasHeaderArtwork && (record.section !== "projects" || Boolean(record.banner));

  return (
    <div className={record.section === "projects" ? "overview-stack overview-stack--project" : "overview-stack"}>
      {showOverviewBanner ? <RecordBanner record={record} /> : null}

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
    const steamBanner = record.section === "games" ? steamBannerImage(record.banner) : null;
    return (
      <div className={steamBanner ? "banner-frame banner-frame--steam" : "banner-frame"}>
        <img key={steamBanner || record.banner} src={steamBanner || record.banner} style={imageFraming.imageFrameStyle(record.meta, steamBanner ? "contain" : "cover")} alt="" decoding="async" loading="lazy" onError={steamBanner ? (event) => {
          if (event.currentTarget.dataset.coverFallback) return;
          event.currentTarget.dataset.coverFallback = "true";
          event.currentTarget.src = record.banner!;
        } : undefined} />
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

function AttachmentGrid({ prefix, record, title }: { prefix: string; record: RecordEntry; title: string }) {
  const mediaSources = recordMediaSources(record, "attachments");
  const [expandedImage, setExpandedImage] = useState<{ alt: string; src: string } | null>(null);

  return (
    <section className="content-terminal" aria-label={`${record.title} media`}>
      <div className="terminal-title">// {title}</div>
      <div className="sample-kicker">Media</div>
      <div className="sample-grid" aria-label={`${record.title} attachments`}>
        {mediaSources.map((imageSource, index) => {
          const slot = index + 1;

          return (
            <button
              className="sample-terminal"
              type="button"
              key={`${record.id}-media-${slot}`}
              onClick={() => setExpandedImage({ alt: `${record.title} attachment ${slot}`, src: imageSource })}
            >
              <span>{prefix}_{String(slot).padStart(2, "0")}</span>
              <div className="sample-frame">
                <img src={imageSource} alt="" decoding="async" loading="lazy" />
              </div>
              <i>Capture {String(slot).padStart(2, "0")}</i>
            </button>
          );
        })}
      </div>
      {expandedImage ? (
        <ImageLightbox image={expandedImage} label="Close expanded attachment" onClose={() => setExpandedImage(null)} />
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
        {mediaSources.map((imageSource, index) => {
          const slot = index + 1;

          return (
            <button
              className="sample-terminal"
              type="button"
              key={`${record.id}-sample-${slot}`}
              onClick={() => setExpandedImage({ alt: `${record.title} sample ${slot}`, src: imageSource })}
            >
              <span>MEDIA_{String(slot).padStart(2, "0")}</span>
              <div className="sample-frame">
                <img src={imageSource} alt="" decoding="async" loading="lazy" />
              </div>
              <i>Sample {String(slot).padStart(2, "0")}</i>
            </button>
          );
        })}
      </div>
      {expandedImage ? (
        <ImageLightbox image={expandedImage} label="Close expanded sample" onClose={() => setExpandedImage(null)} />
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

  return list.map((item) => item.trim()).filter(Boolean).slice(0, 6);
}

function hasRecordAttachments(record: RecordEntry): boolean {
  return recordMediaSources(record, "attachments").length > 0;
}

export function NoteSearchBox({ onQueryChange, query, record }: { onQueryChange: (value: string) => void; query: string; record: RecordEntry }) {
  const notes = noteEntries(record.body);

  if (notes.length < 2) {
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
        {[...new Set(notes.map((note) => note.title))].map((title) => (
          <option key={title} value={title} />
        ))}
      </datalist>
    </div>
  );
}

export function noteReaderTitle(title: string, recordTitle: string) {
  const parts = splitNoteTitle(title);
  return parts.title === "Current note" ? recordTitle : parts.title;
}

export function FocusedNotePanel({ note, recordTitle, onReturn, toFiles = false }: { note: ArchiveNote; recordTitle: string; onReturn: () => void; toFiles?: boolean }) {
  const parts = splitNoteTitle(note.title);
  const title = parts.title === "Current note" ? recordTitle : parts.title;
  return <section className="focused-note" aria-labelledby="focused-note-title">
    <header className="focused-note-header">
      <div>
        {parts.date ? <time dateTime={parts.dateTime}>{parts.date}</time> : null}
        <h2 id="focused-note-title">{title}</h2>
        {title !== recordTitle ? <p>{recordTitle}</p> : null}
      </div>
      <button type="button" className="focused-note-full" onClick={onReturn}>{toFiles ? <><ArrowLeft size={16} aria-hidden="true" />Notes</> : <>Open full entry <ArrowUpRight size={16} aria-hidden="true" /></>}</button>
    </header>
    <RecordBody body={note.body} />
  </section>;
}

type NotesPageProps = { focusedIndex?: number; query: string; record: RecordEntry; shareable?: boolean; handheld?: boolean; searchControl?: ReactNode };

function NotesPage({ focusedIndex, query, record, shareable, handheld, searchControl }: NotesPageProps) {
  const pageRef = useRef<HTMLElement>(null);
  const search = query.trim().toLowerCase();
  const [browsePage, setBrowsePage] = useState<number>();
  const [searchCursor, setSearchCursor] = useState({ query: search, page: 0 });
  if (searchCursor.query !== search) setSearchCursor({ query: search, page: 0 });
  const { notes, page, pages, openIndex } = notePage(noteEntries(record.body), search, search ? searchCursor.page : browsePage, focusedIndex);

  const step = (delta: number) => {
    const next = page + delta;
    if (next < 0 || next >= pages) return;
    if (search) setSearchCursor({ query: search, page: next });
    else setBrowsePage(next);
  };

  useEffect(() => {
    if (!focusedIndex) return;
    const page = pageRef.current;
    const layout = page?.closest<HTMLElement>(".record-layout");
    const summary = page?.querySelector(`[data-note-index="${focusedIndex}"] > summary`);
    if (!layout || !summary) return;
    const top = layout.getBoundingClientRect().top + layout.clientTop;
    const bounds = summary.getBoundingClientRect();
    if (bounds.bottom > top + layout.clientHeight) layout.scrollTop += bounds.top - top - 16;
  }, [focusedIndex]);

  return (
    <section ref={pageRef} className="content-terminal notes-page" aria-label={`${record.title} notes`}>
      <div className="notes-page-header">
        <div className="terminal-title">// NOTES PAGE</div>
        {pages > 1 ? <nav className="note-pager" aria-label="Note pages">
          <button type="button" aria-label="Previous note page" title="Previous note page" aria-disabled={page === 0} onClick={() => step(-1)}><ChevronLeft size={16} aria-hidden="true" /></button>
          <span aria-live="polite" aria-atomic="true">{page + 1} / {pages}</span>
          <button type="button" aria-label="Next note page" title="Next note page" aria-disabled={page + 1 === pages} onClick={() => step(1)}><ChevronRight size={16} aria-hidden="true" /></button>
        </nav> : null}
      </div>
      {searchControl}
      <div className="note-stack">
        {notes.length > 0 ? (
          notes.map((note) => (
            <NoteEntry body={note.body} defaultOpen={note.index === openIndex} index={note.index} key={`${note.index}:${note.title}`} title={note.title} recordId={shareable && note.id ? record.id : undefined} noteId={note.id} handheld={handheld} />
          ))
        ) : (
          <p className="notes-empty">No note matches that signal.</p>
        )}
      </div>
    </section>
  );
}

export function NoteFileSearch({ expanded, query, inputRef, buttonRef, onToggle, onQueryChange }: {
  expanded: boolean;
  query: string;
  inputRef: RefObject<HTMLInputElement | null>;
  buttonRef: RefObject<HTMLButtonElement | null>;
  onToggle: (expanded: boolean) => void;
  onQueryChange: (query: string) => void;
}) {
  return <div className="record-note-search" data-expanded={expanded ? "" : undefined}>
    <input ref={inputRef} id="record-note-search-input" type="search" autoComplete="off" placeholder="Title or date" aria-label="Search notes" value={query} onChange={(event) => onQueryChange(event.target.value)} />
    <button ref={buttonRef} type="button" aria-label={expanded ? "Close note search" : "Search notes"} aria-expanded={expanded} aria-controls="record-note-search-input" onClick={() => onToggle(!expanded)}>
      {expanded ? <X size={17} aria-hidden="true" /> : <Search size={17} aria-hidden="true" />}
    </button>
  </div>;
}

export function RecordNoteFiles({ record, query, notes, action, onOpen }: { record: RecordEntry; query: string; notes?: ArchiveNote[]; action?: ReactNode; onOpen: (index: number) => void }) {
  const files = matchingNotes(notes ?? noteEntries(record.body), query);
  const countLabel = query.trim() ? (files.length === 1 ? "MATCH" : "MATCHES") : (files.length === 1 ? "FILE" : "FILES");
  // Any dated notes (and no search): the note index, the newest featured and the rest filed by month.
  const index = query.trim() ? null : pocket.noteIndex(files, 1);

  return <section className="record-note-files" aria-label={`${record.title} notes`}>
    <header className="record-note-files-header">
      <h3 className="terminal-title">// NOTE FILES</h3>
      <p className="record-note-file-count" role="status">{String(files.length).padStart(2, "0")} {countLabel}</p>
      {action}
    </header>
    <div className="record-note-file-grid" data-index={index ? "" : undefined}>
      {index ? <NoteIndex index={index} onOpen={onOpen} /> : files.length ? files.map((note) => <NoteFile key={note.id ?? note.index} note={note} recordTitle={record.title} onOpen={onOpen} />)
        : <p className="notes-empty">{query.trim() ? "No note matches that signal." : "No notes filed."}</p>}
    </div>
  </section>;
}

function LogNoteContent({ record, focusedIndex, shareable }: { record: RecordEntry; focusedIndex?: number; shareable?: boolean }) {
  const sectionRef = useRef<HTMLElement>(null);
  const notes = noteEntries(record.body);

  useEffect(() => {
    if (!focusedIndex) return;
    const note = sectionRef.current?.querySelector<HTMLElement>(`[data-note-index="${focusedIndex}"]`);
    const layout = note?.closest<HTMLElement>(".record-layout");
    if (note && layout) layout.scrollTop += note.getBoundingClientRect().top - layout.getBoundingClientRect().top - 16;
  }, [focusedIndex]);

  return <section className="log-reading-notes" ref={sectionRef} aria-label={`${record.title} notes`}>
    {notes.length ? notes.map((note, index) => {
      const { title, date, dateTime } = splitNoteTitle(note.title);
      const showTitle = title !== "Current note" && (notes.length > 1 || title !== record.title);
      const link = shareable && note.id ? <NoteLinkControl id={record.id} noteId={note.id} /> : null;
      return <article className="log-reading-note" key={note.id ?? index} data-note-index={index}>
        {date || showTitle || link ? <header className="log-reading-note-meta">
          {showTitle ? <h3>{title}</h3> : null}
          {date ? <time dateTime={dateTime}>{date}</time> : null}
          {link}
        </header> : null}
        <RecordBody body={note.body} />
      </article>;
    }) : <p className="notes-empty">No notes filed.</p>}
  </section>;
}

function NoteIndex({ index, onOpen }: { index: NonNullable<ReturnType<typeof pocket.noteIndex>>; onOpen: (index: number) => void }) {
  const { latest } = index;
  const row = (note: { index: number; title: string; version: string; date: string }) => <button key={note.index} className="record-note-row" type="button" data-note-file-index={note.index} onClick={() => onOpen(note.index)}>
    <time>{note.date || "--"}</time><span>{note.title}</span>{note.version ? <b className="record-note-version">{note.version}</b> : <b />}
  </button>;
  const group = (key: string, label: string, notes: typeof index.undated, open: boolean) => <details key={key} className="record-note-month" open={open}>
    <summary><span>{label}</span><small>{notes.length} {notes.length === 1 ? "note" : "notes"}</small></summary>
    <div className="record-note-rows">{notes.map(row)}</div>
  </details>;
  return <>
    <button className="record-note-latest" type="button" data-note-file-index={latest.index} onClick={() => onOpen(latest.index)}>
      <span className="record-note-latest-meta"><span>Latest{latest.date ? ` · ${latest.date}` : ""}</span>{latest.version ? <b className="record-note-version">{latest.version}</b> : null}</span>
      <strong>{latest.title}</strong>
      {latest.excerpt ? <span className="record-note-latest-excerpt">{latest.excerpt}</span> : null}
    </button>
    <div className="record-note-months">
      {index.months.map((month, position) => group(month.key, month.label, month.notes, position === 0))}
      {index.undated.length ? group("undated", "Undated", index.undated, false) : null}
    </div>
  </>;
}

function NoteFile({ note, recordTitle, onOpen }: { note: ArchiveNote & { index: number }; recordTitle: string; onOpen: (index: number) => void }) {
  const parts = splitNoteTitle(note.title);
  return <button className="record-note-file" data-note-file-index={note.index} type="button" onClick={() => onOpen(note.index)}>
    <FileText size={36} strokeWidth={1.3} aria-hidden="true" />
    <strong>{parts.title === "Current note" ? recordTitle : parts.title}</strong>
    {parts.date ? <time dateTime={parts.dateTime}>{parts.date}</time> : null}
  </button>;
}

function NoteEntry({ body, defaultOpen, index, title, recordId, noteId, handheld }: { body: string; defaultOpen: boolean; index?: number; title: string; recordId?: string; noteId?: string; handheld?: boolean }) {
  const detailsRef = useRef<HTMLDetailsElement | null>(null);
  const initializedRef = useRef(false);
  const [hasLoaded, setHasLoaded] = useState(defaultOpen);
  const titleParts = splitNoteTitle(title);
  const link = recordId && noteId ? <NoteLinkControl id={recordId} noteId={noteId} /> : null;

  useEffect(() => {
    if (!initializedRef.current && detailsRef.current) {
      detailsRef.current.open = defaultOpen;
      initializedRef.current = true;
    }
  }, [defaultOpen]);

  return (
    <details
      className={index === undefined ? "note-entry" : "note-entry note-entry--indexed"}
      data-note-index={index}
      ref={detailsRef}
      onToggle={(event) => {
        if (event.currentTarget.open) setHasLoaded(true);
      }}
    >
      <summary onClick={(event) => {
        if (!event.defaultPrevented && !detailsRef.current?.open && index !== undefined) memoryState.record("note.expand", { index: index + 1 });
      }}>
        {index === undefined ? (
          <span>{title}</span>
        ) : (
          <>
            <span className="note-entry-index">{String(index + 1).padStart(2, "0")}</span>
            {titleParts.date ? <time className="note-entry-date" dateTime={titleParts.dateTime}>{titleParts.date}</time> : <span className="note-entry-date" />}
            <span className="note-entry-title">{titleParts.title}</span>
          </>
        )}
        <i aria-hidden="true">open</i>
      </summary>
      {!handheld ? link : null}
      {hasLoaded ? <div className="note-entry-body"><RecordBody body={body} /></div> : null}
      {handheld ? link : null}
    </details>
  );
}

function splitNoteTitle(title: string) {
  const match = title.match(/^\s*(\d{1,2})\s*\/\s*(\d{1,2})\s*\/\s*(\d{4})\s*[-:–—]?\s*(.*)$/);

  if (!match) {
    return { date: "", dateTime: "", title: title.trim() || "Untitled note" };
  }

  const [, day, month, year, noteTitle] = match;
  return {
    date: `${day.padStart(2, "0")} / ${month.padStart(2, "0")} / ${year}`,
    dateTime: `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`,
    title: noteTitle.trim() || "Untitled note"
  };
}

type NoteMediaOptions = {
  align: "left" | "center" | "right";
  caption: string;
  fit: "contain" | "crop";
  full?: string;
  position: "top" | "center" | "bottom";
  size: "default" | "wide" | "banner" | "small";
};

function renderNoteInline(value: string): ReactNode[] {
  const render = (tokens: NoteInlineToken[]): ReactNode[] => tokens.map((token, index) => {
    if (token.type === "strong") return <strong key={index}>{render(token.children || [])}</strong>;
    if (token.type === "em") return <em key={index}>{render(token.children || [])}</em>;
    if (token.type === "code") return <code key={index}>{token.value}</code>;
    if (token.type === "link") return <a key={index} href={token.href} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer">{render(token.children || [])}</a>;
    return token.value || "";
  });
  return render(noteInline.tokenizeNoteInline(value));
}

export function RecordBody({ body }: { body: string }) {
  const [expandedImage, setExpandedImage] = useState<{ alt: string; src: string } | null>(null);
  const lines = body.split(/\r?\n/);
  const nodes: ReactNode[] = [];

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const key = `${index}-${line}`;
    const heading = noteInline.noteHeading(line, "Previous note");

    if (heading) {
      const innerLines: string[] = [];

      index += 1;

      while (index < lines.length && lines[index].trim() !== ":::") {
        innerLines.push(lines[index]);
        index += 1;
      }

      nodes.push(<NoteEntry body={innerLines.join("\n")} defaultOpen={false} key={key} title={heading.title} />);
      continue;
    }

    if (!line.trim()) {
      nodes.push(<br key={key} />);
      continue;
    }

    if (line.startsWith("# ")) {
      nodes.push(<h3 key={key}>{renderNoteInline(line.slice(2))}</h3>);
      continue;
    }

    if (line.startsWith("## ")) {
      nodes.push(<h4 key={key}>// {renderNoteInline(line.slice(3))}</h4>);
      continue;
    }

    if (line.startsWith("### ")) {
      nodes.push(<h5 key={key}>{renderNoteInline(line.slice(4))}</h5>);
      continue;
    }

    const imageMatch = line.match(/^!\[(.*?)]\((.*?)\)$/);

    if (imageMatch) {
      const media = parseNoteMediaOptions(imageMatch[1]);
      const expandedSrc = media.full || imageMatch[2];

      nodes.push(
        <figure className={noteMediaClassName(media)} key={key}>
          <button className="note-media-button" type="button" onClick={() => setExpandedImage({ alt: media.caption, src: expandedSrc })}>
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
          {renderNoteInline(line.slice(6))}
        </p>
      );
      continue;
    }

    if (line.startsWith("- [ ] ")) {
      nodes.push(
        <p className="check-line is-open" key={key}>
          <span>[ ]</span>
          {renderNoteInline(line.slice(6))}
        </p>
      );
      continue;
    }

    if (line.startsWith("- ")) {
      nodes.push(
        <p className="bullet-line" key={key}>
          <span>&gt;</span>
          {renderNoteInline(line.slice(2))}
        </p>
      );
      continue;
    }

    if (line.startsWith("> ")) {
      nodes.push(<blockquote key={key}>{renderNoteInline(line.slice(2))}</blockquote>);
      continue;
    }

    nodes.push(<p key={key}>{renderNoteInline(line)}</p>);
  }

  return (
    <div className="record-body">
      {nodes}
      {expandedImage ? (
        <ImageLightbox image={expandedImage} label="Close expanded image" onClose={() => setExpandedImage(null)} />
      ) : null}
    </div>
  );
}

function parseNoteMediaOptions(rawAlt: string): NoteMediaOptions {
  const tokens = rawAlt.split("|").map((token) => token.trim()).filter(Boolean);
  const caption = tokens[0] && !isNoteMediaToken(tokens[0]) ? tokens[0] : "";
  const optionTokens = tokens.slice(caption ? 1 : 0);
  const options = new Set(optionTokens.map((token) => token.toLowerCase()));
  const full = optionTokens.find((token) => token.toLowerCase().startsWith("full="))?.slice(5).trim();
  const size = options.has("banner") ? "banner" : options.has("wide") ? "wide" : options.has("small") ? "small" : "default";
  const align = options.has("left") ? "left" : options.has("right") ? "right" : "center";
  const position = options.has("top") ? "top" : options.has("bottom") ? "bottom" : "center";
  const fit = options.has("crop") || size === "banner" ? "crop" : "contain";

  return {
    align,
    caption: options.has("no-caption") ? "" : caption,
    fit: options.has("contain") ? "contain" : fit,
    full,
    position,
    size
  };
}

function isNoteMediaToken(value: string): boolean {
  const normalized = value.toLowerCase();

  return normalized.startsWith("full=") || ["wide", "banner", "small", "left", "right", "center", "top", "bottom", "crop", "contain", "no-caption"].includes(normalized);
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

export function UpdateHistory({ body, containerRef, isOpen, onToggle }: { body: string; containerRef: RefObject<HTMLDivElement | null>; isOpen: boolean; onToggle: () => void }) {
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

export function UpdateHistoryModal({ body, onClose }: { body: string; onClose: () => void }) {
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
