"use client";

import { Cpu } from "lucide-react";
import { useEffect, useRef, useState, type CSSProperties, type ReactNode, type RefObject } from "react";
import {
  formatReadableDate,
  metaText,
  noteEntries,
  recordHeaderImage,
  splitUpdateIndex
} from "@/components/archive/record-utils";
import { setupHardwareSource } from "@/components/archive/setup-utils";
import type { ContentKey } from "@/components/archive/types";
import type { RecordEntry } from "@/lib/types";
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

export function contentOrdinal(record: RecordEntry, index: number): string {
  return String(record.section === "projects" ? index : index + 1).padStart(2, "0");
}

function getTextList(value: unknown): string[] {
  return metaText(value)
    .split(/\r?\n|\|/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function RecordContentPanel({ activeContent, noteSearchQuery, record }: { activeContent: ContentKey; noteSearchQuery: string; record: RecordEntry }) {
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

export function NoteSearchBox({ onQueryChange, query, record }: { onQueryChange: (value: string) => void; query: string; record: RecordEntry }) {
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
  full?: string;
  position: "top" | "center" | "bottom";
  size: "default" | "wide" | "banner" | "small";
};

export function RecordBody({ body }: { body: string }) {
  const [expandedImage, setExpandedImage] = useState<{ alt: string; src: string } | null>(null);
  const lines = body.split(/\r?\n/);
  const nodes: ReactNode[] = [];

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
