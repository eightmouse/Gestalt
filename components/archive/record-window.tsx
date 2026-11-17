"use client";

import { ImageLightbox } from "@/components/archive/image-lightbox";
import { gameActivityLabel, gameActivityValue, gameLogPlacement } from "@/lib/game-state";
import { ArrowLeft, Maximize2, Minimize2, Settings, X } from "lucide-react";
import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type ReactNode } from "react";
import {
  contentOrdinal,
  getRecordContents,
  NoteSearchBox,
  RecordBody,
  RecordContentPanel,
  UpdateHistory,
  UpdateHistoryModal
} from "@/components/archive/record-content";
import { formatReadableDate, recordHeaderImage, recordLastUpdated } from "@/components/archive/record-utils";
import { setupGroupFor, setupNarrativeNotes, setupPathFor, setupProfile } from "@/components/archive/setup-utils";
import type { ContentKey } from "@/components/archive/types";
import type { RecordEntry } from "@/lib/types";
import imageFraming from "@/public/image-framing.js";
import recordMotion from "@/public/record-motion.js";
import { NoteLinkControl, RecordLinkButton, RecordLinkFeedback } from "@/components/archive/record-link-control";
import type { ArchiveNote } from "@/public/note-inline.js";
import memoryState from "@/public/memory-state.js";
import { steamBannerImage } from "@/public/steam-display.mjs";
type RecordWindowProps = {
  handheld?: boolean;
  minimized?: boolean;
  accessPending?: boolean;
  accessComplete?: boolean;
  initialContent: ContentKey;
  initialNoteIndex?: number;
  linkedNoteId?: string;
  maximized: boolean;
  record: RecordEntry;
  shareable?: boolean;
  onEdit?: (content?: ContentKey) => void;
  editor?: ReactNode;
  editorBusy?: boolean;
  escapeBlocked?: boolean;
  onClose: () => void;
  onMinimize: () => void;
  onMaximize: () => void;
};

export function RecordWindow({ handheld, minimized = false, accessPending = false, accessComplete = false, initialContent, initialNoteIndex, linkedNoteId, maximized, record, shareable, onEdit, editor, editorBusy, escapeBlocked, onClose, onMinimize, onMaximize }: RecordWindowProps) {
  if (record.section === "setup") {
    return <SetupRecordWindow handheld={handheld} minimized={minimized} accessPending={accessPending} accessComplete={accessComplete} maximized={maximized} record={record} shareable={shareable} initialNoteIndex={initialNoteIndex} linkedNoteId={linkedNoteId} onEdit={onEdit} escapeBlocked={escapeBlocked} onClose={onClose} onMinimize={onMinimize} onMaximize={onMaximize} />;
  }

  return <ArchiveRecordWindow handheld={handheld} minimized={minimized} accessPending={accessPending} accessComplete={accessComplete} initialContent={initialContent} initialNoteIndex={initialNoteIndex} linkedNoteId={linkedNoteId} maximized={maximized} record={record} shareable={shareable} onEdit={onEdit} editor={editor} editorBusy={editorBusy} escapeBlocked={escapeBlocked} onClose={onClose} onMinimize={onMinimize} onMaximize={onMaximize} />;
}

function useRecordFocus(minimized: boolean | undefined, id: string) {
  const ref = useRef<HTMLElement | null>(null);
  useEffect(() => {
    if (!minimized) return recordMotion.focusWithin(ref.current);
  }, [minimized, id]);
  return ref;
}

function handleRecordEscape(event: KeyboardEvent<HTMLElement>, dismiss: () => void) {
  if (event.key !== "Escape" || event.defaultPrevented || event.repeat || event.nativeEvent.isComposing || event.shiftKey || event.ctrlKey || event.altKey || event.metaKey) return;
  event.preventDefault();
  event.stopPropagation();
  dismiss();
}

function ArchiveRecordWindow({ handheld, minimized, accessPending, accessComplete, initialContent, initialNoteIndex, linkedNoteId, maximized, record, shareable, onEdit, editor, editorBusy, escapeBlocked, onClose, onMinimize, onMaximize }: RecordWindowProps) {
  const windowRef = useRecordFocus(minimized, record.id);
  const contents = getRecordContents(record);
  const [requestedContent, setActiveContent] = useState<ContentKey>(initialContent);
  const activeContent = contents.some((item) => item.key === requestedContent) ? requestedContent : "overview";
  const [noteSearchQuery, setNoteSearchQuery] = useState("");
  const [focusedNoteIndex, setFocusedNoteIndex] = useState(initialNoteIndex);
  const [updateHistoryOpen, setUpdateHistoryOpen] = useState(false);
  const updateHistoryRef = useRef<HTMLDivElement | null>(null);
  const artwork = imageFraming.recordHeadingArtwork(record, steamBannerImage);

  useEffect(() => {
    setActiveContent(initialContent);
    setNoteSearchQuery("");
    setFocusedNoteIndex(initialNoteIndex);
    setUpdateHistoryOpen(false);
  }, [initialContent, initialNoteIndex, record.id]);

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
    <article
      ref={windowRef}
      role="dialog"
      aria-modal="true"
      tabIndex={-1}
      hidden={minimized}
      inert={minimized}
      className={`${maximized ? "record-window is-maximized" : "record-window"}${accessPending ? " is-access-pending" : accessComplete ? " is-access-complete" : ""}${updateHistoryOpen ? " has-index-modal" : ""}${record.section === "setup" ? " is-setup-record" : ""}`}
      data-state={recordStateKey(record.status)}
      aria-label={`${record.title} archive entry`}
      onKeyDown={(event) => {
        if (minimized || escapeBlocked || editor || editorBusy) return;
        handleRecordEscape(event, () => {
          if (updateHistoryOpen) {
            setUpdateHistoryOpen(false);
            updateHistoryRef.current?.querySelector("button")?.focus({ preventScroll: true });
          } else if (noteSearchQuery) setNoteSearchQuery("");
          else onClose();
        });
      }}
    >
      <RecordAccessSurface />
      <header className="window-bar">
        <button className="pocket-record-back" type="button" disabled={editorBusy} onClick={onClose}><ArrowLeft size={16} aria-hidden="true" />Back</button>
        <div className="window-title-group">
          <span>{record.section === "setup" ? "// SETUP TERMINAL" : "// ARCHIVE ENTRY"}</span>
        </div>
        <div className="window-control-group">
          {shareable ? <RecordLinkButton id={record.id} /> : null}
          {onEdit ? <button className="window-edit-action" type="button" disabled={editorBusy} onClick={() => onEdit(activeContent)} aria-pressed={Boolean(editor)} aria-label={editor ? "Read saved record" : "Edit this record locally"} title={editor ? "Read saved record" : "Edit locally"}><Settings size={15} aria-hidden="true" /></button> : null}
          <div className="window-actions">
            <button type="button" disabled={editorBusy} data-window-action="minimize" onClick={onMinimize} aria-label="Minimize record">
              <Minimize2 size={14} />
            </button>
            <button type="button" data-window-action="maximize" onClick={onMaximize} aria-label={maximized ? "Restore record" : "Maximize record"}>
              <Maximize2 size={14} />
            </button>
            <button type="button" disabled={editorBusy} data-window-action="close" onClick={onClose} aria-label="Close record">
              <X size={15} />
            </button>
          </div>
        </div>
      </header>

      {shareable ? <RecordLinkFeedback unavailable={Boolean(linkedNoteId && initialNoteIndex === undefined)} /> : null}
      <div className={editor ? "record-layout is-editing-record" : "record-layout"} aria-busy={editorBusy || undefined}>
        {editor ?? <>
        <div className="record-main">
          <div
            className={`${artwork ? "record-heading has-heading-banner" : "record-heading"}${record.section === "setup" ? " setup-record-heading" : ""}`}
          >
            {artwork ? <img key={artwork.src} className="heading-banner-image" src={artwork.src} alt="" decoding="async" referrerPolicy="no-referrer" style={imageFraming.headerFrameStyle(record.meta)} onError={artwork.coverFallback ? (event) => {
              const image = event.currentTarget;
              if (image.dataset.coverFallback) return;
              image.dataset.coverFallback = "true";
              image.src = artwork.coverFallback;
            } : undefined} /> : null}
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
              {record.section === "games" && gameLogPlacement(record) === "session" && gameActivityValue(record) ? <><span>.</span>Activity: {gameActivityLabel(record)}</> : null}
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

          <RecordContentPanel activeContent={activeContent} focusedNoteIndex={focusedNoteIndex} noteSearchQuery={noteSearchQuery} record={record} shareable={shareable} handheld={handheld} />
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
                      if (activeContent !== item.key) memoryState.record("content.select", { view: item.key });
                      setActiveContent(item.key);
                      if (item.key !== "notes") {
                        setNoteSearchQuery("");
                        setFocusedNoteIndex(undefined);
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
              <dd>{formatReadableDate(recordLastUpdated(record))}</dd>
            </div>
          </dl>
          {activeContent === "notes" ? (
            <NoteSearchBox query={noteSearchQuery} record={record} onQueryChange={setNoteSearchQuery} />
          ) : null}
          {record.section === "games" || activeContent === "notes" ? null : (
            <UpdateHistory body={record.body} containerRef={updateHistoryRef} isOpen={updateHistoryOpen} onToggle={() => setUpdateHistoryOpen((current) => !current)} />
          )}
        </aside>
        </>}
      </div>
      {updateHistoryOpen && record.section !== "games" ? <UpdateHistoryModal body={record.body} onClose={() => setUpdateHistoryOpen(false)} /> : null}
    </article>
    </>
  );
}

function SetupRecordWindow({ handheld, minimized, accessPending, accessComplete, initialNoteIndex, linkedNoteId, maximized, record, shareable, onEdit, escapeBlocked, onClose, onMinimize, onMaximize }: Omit<RecordWindowProps, "initialContent">) {
  const windowRef = useRecordFocus(minimized, record.id);
  const group = setupGroupFor(record);
  const profile = setupProfile(record);
  const headerImage = setupRecordImage(record);
  const notes = setupNarrativeNotes(record);
  const [expandedImage, setExpandedImage] = useState<{ alt: string; src: string } | null>(null);
  useEffect(() => {
    if (!minimized && linkedNoteId && initialNoteIndex !== undefined) {
      windowRef.current?.querySelector(`[data-setup-note-id="${CSS.escape(linkedNoteId)}"]`)?.scrollIntoView({ block: "nearest" });
    }
  }, [windowRef, initialNoteIndex, linkedNoteId, minimized]);
  const specs = profile.specs.length > 0
    ? profile.specs
    : [
        { label: "STATUS", value: record.status },
        { label: "UPDATED", value: formatReadableDate(recordLastUpdated(record)) },
        { label: "PROGRESS", value: `${record.progress}%` }
      ];

  return (
    <article
      ref={windowRef}
      role="dialog"
      aria-modal="true"
      tabIndex={-1}
      hidden={minimized}
      inert={minimized}
      className={`${maximized ? "record-window is-maximized" : "record-window"}${accessPending ? " is-access-pending" : accessComplete ? " is-access-complete" : ""} is-setup-record is-setup-record--${group}`}
      data-state={recordStateKey(record.status)}
      aria-label={`${record.title} setup terminal`}
      onKeyDown={(event) => {
        if (!minimized && !escapeBlocked && !expandedImage) handleRecordEscape(event, onClose);
      }}
    >
      <RecordAccessSurface />
      {shareable ? <RecordLinkFeedback unavailable={Boolean(linkedNoteId && initialNoteIndex === undefined)} /> : null}
      <div className="setup-window-shell">
        <section className={`setup-console setup-console--${group}`} aria-label={`${record.title} setup profile`}>
          <SetupPrompt
            command={profile.command}
            maximized={maximized}
            record={record}
            shareable={shareable}
            onClose={onClose}
            onEdit={onEdit}
            onMaximize={onMaximize}
            onMinimize={onMinimize}
          />

          {group === "tools" ? (
            <SetupToolBody headerImage={headerImage} profile={profile} record={record} specs={specs} />
          ) : group === "peripherals" ? (
            <SetupPeripheralBody headerImage={headerImage} record={record} onExpandImage={setExpandedImage} />
          ) : group === "notes" ? (
            <SetupNoteBody notes={notes} record={record} shareable={shareable} handheld={handheld} />
          ) : (
            <SetupSystemBody headerImage={headerImage} profile={profile} record={record} specs={specs} />
          )}
        </section>

        {group !== "notes" && notes.length > 0 ? <SetupNotesTerminal notes={notes} record={record} shareable={shareable} handheld={handheld} /> : null}
      </div>
      {expandedImage ? (
        <ImageLightbox image={expandedImage} label="Close expanded setup image" onClose={() => setExpandedImage(null)} />
      ) : null}
    </article>
  );
}

function RecordAccessSurface() {
  return (
    <div className="record-access-surface" aria-hidden="true">
      <div className="record-access-identity">
        <small>ARCHIVE LINK // 01</small>
        <strong>ACCESSING</strong>
        <span className="record-access-meter"><i /></span>
        <small className="record-access-state">INDEXING RECORD</small>
      </div>
      <div className="record-access-frame" aria-hidden="true">
        <i className="record-access-rule record-access-rule--top" />
        <i className="record-access-rule record-access-rule--right" />
        <i className="record-access-rule record-access-rule--bottom" />
        <i className="record-access-rule record-access-rule--left" />
        <span className="record-access-corners">
          <i /><i /><i /><i />
        </span>
        <span className="record-access-traces">
          <i /><i /><i /><i />
        </span>
        <span className="record-access-ticks">
          <i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i />
        </span>
      </div>
      <i className="record-access-scan" />
    </div>
  );
}

function SetupPrompt({
  command,
  maximized,
  onClose,
  onEdit,
  onMaximize,
  onMinimize,
  record,
  shareable
}: {
  command: string;
  maximized: boolean;
  record: RecordEntry;
  shareable?: boolean;
  onClose: () => void;
  onEdit?: () => void;
  onMaximize: () => void;
  onMinimize: () => void;
}) {
  return (
    <div className="setup-console-prompt">
      <button className="pocket-record-back" type="button" onClick={onClose}><ArrowLeft size={16} aria-hidden="true" />Back</button>
      <div className="setup-prompt-command">
        <span>eightmouse@gestalt</span>
        <i>:</i>
        <span>{setupPathFor(record)}</span>
        <i>$</i>
        <strong>{command}</strong>
      </div>
      <div className="setup-prompt-actions">
        {shareable ? <RecordLinkButton id={record.id} /> : null}
        {onEdit ? <button className="window-edit-action" type="button" onClick={onEdit} aria-label="Edit this record locally" title="Edit locally"><Settings size={15} aria-hidden="true" /></button> : null}
        <div className="window-actions setup-window-actions">
          <button type="button" data-window-action="minimize" onClick={onMinimize} aria-label="Minimize setup terminal">
            <Minimize2 size={14} />
          </button>
          <button type="button" data-window-action="maximize" onClick={onMaximize} aria-label={maximized ? "Restore setup terminal" : "Maximize setup terminal"}>
            <Maximize2 size={14} />
          </button>
          <button type="button" data-window-action="close" onClick={onClose} aria-label="Close setup terminal">
            <X size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}

function SetupSystemBody({
  headerImage,
  profile,
  record,
  specs
}: {
  headerImage: string;
  profile: { category: string };
  record: RecordEntry;
  specs: Array<{ label: string; value: string }>;
}) {
  return (
    <div className="setup-console-body setup-console-body--system">
      <div className={headerImage ? "setup-terminal-avatar has-image" : "setup-terminal-avatar"} aria-hidden="true">
        {headerImage ? <img src={headerImage} alt="" decoding="async" loading="lazy" /> : null}
        <span />
        <span />
        <span />
        <span />
      </div>

      <SetupFetchDetails command="profile.loaded / public-safe" profile={profile} record={record} specs={specs} />
    </div>
  );
}

function SetupToolBody({
  headerImage,
  profile,
  record,
  specs
}: {
  headerImage: string;
  profile: { category: string };
  record: RecordEntry;
  specs: Array<{ label: string; value: string }>;
}) {
  return (
    <div className="setup-console-body setup-console-body--tool">
      <div className={headerImage ? "setup-shortcut-preview has-image" : "setup-shortcut-preview"} aria-hidden="true">
        {headerImage ? <img src={headerImage} alt="" decoding="async" loading="lazy" /> : null}
        <span />
      </div>

      <SetupFetchDetails command="shortcut.loaded / local-use" profile={profile} record={record} specs={specs} />
    </div>
  );
}

function SetupPeripheralBody({
  headerImage,
  onExpandImage,
  record
}: {
  headerImage: string;
  onExpandImage: (image: { alt: string; src: string }) => void;
  record: RecordEntry;
}) {
  const description = cleanDisplaySummary(record.summary);

  return (
    <div className="setup-console-body setup-console-body--peripheral">
      <button
        className={headerImage ? "setup-inspection-photo has-image" : "setup-inspection-photo"}
        disabled={!headerImage}
        type="button"
        onClick={() => headerImage && onExpandImage({ alt: record.title, src: headerImage })}
      >
        {headerImage ? <img src={headerImage} alt="" decoding="async" loading="lazy" /> : null}
        <span>{headerImage ? "inspect photo" : "no capture"}</span>
      </button>
      <div className="setup-peripheral-copy">
        <h2>{record.title}</h2>
        {description ? <p>{description}</p> : null}
      </div>
    </div>
  );
}

type SetupNoteProps = { notes: ArchiveNote[]; record: RecordEntry; shareable?: boolean; handheld?: boolean };

function SetupNoteBody({ notes, record, shareable, handheld }: SetupNoteProps) {
  const noteFiles = notes.length > 0 ? notes : [{ title: record.title, body: record.body }];

  return (
    <div className="setup-note-file-shell">
      <div className="setup-note-file-icon" aria-hidden="true">
        <span />
      </div>
      <div className="setup-note-file-copy">
        <p className="setup-command">&gt; note.opened / public-safe</p>
        <h2>{record.title}</h2>
        {record.summary ? <p className="setup-motd">{record.summary}</p> : null}
      </div>
      <SetupNoteStack notes={noteFiles} recordId={shareable ? record.id : undefined} handheld={handheld} />
    </div>
  );
}

function SetupFetchDetails({
  command,
  profile,
  record,
  specs
}: {
  command: string;
  profile: { category: string };
  record: RecordEntry;
  specs: Array<{ label: string; value: string }>;
}) {
  const externalUrl = safeExternalUrl(record.meta.externalUrl);

  return (
    <div className="setup-fetch setup-fetch--terminal">
      <p className="setup-command">&gt; {command}</p>
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
          <dd>{formatReadableDate(recordLastUpdated(record))}</dd>
        </div>
        {externalUrl ? (
          <div>
            <dt>LINK</dt>
            <dd><a href={externalUrl} target="_blank" rel="noreferrer">open page</a></dd>
          </div>
        ) : null}
        {specs.map((spec, index) => (
          <div key={`${spec.label}-${index}`}>
            <dt>{spec.label}</dt>
            <dd>{spec.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function SetupNotesTerminal({ notes, record, shareable, handheld }: SetupNoteProps) {
  return (
    <section className="setup-console setup-notes-terminal" aria-label={`${record.title} setup notes`}>
      <div className="setup-console-prompt">
        <span>eightmouse@gestalt</span>
        <i>:</i>
        <span>{setupPathFor(record)}</span>
        <i>$</i>
        <strong>cat notes.log</strong>
      </div>
      <SetupNoteStack notes={notes} recordId={shareable ? record.id : undefined} handheld={handheld} />
    </section>
  );
}

function SetupNoteStack({ notes, recordId, handheld }: { notes: ArchiveNote[]; recordId?: string; handheld?: boolean }) {
  return <div className="setup-note-stack">
    {notes.map((note, index) => {
      const link = recordId && note.id ? <NoteLinkControl id={recordId} noteId={note.id} /> : null;
      return <article className="setup-note" data-setup-note-id={note.id} key={note.id ?? index}>
        <h3>// {note.title}</h3>
        {!handheld ? link : null}
        <RecordBody body={note.body} />
        {handheld ? link : null}
      </article>;
    })}
  </div>;
}

function setupRecordImage(record: RecordEntry): string {
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

function recordStateKey(status: string): string {
  return status.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "unknown";
}
