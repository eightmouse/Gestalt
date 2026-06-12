"use client";

import { motion } from "framer-motion";
import { Maximize2, Minimize2, X } from "lucide-react";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import {
  contentOrdinal,
  getRecordContents,
  NoteSearchBox,
  RecordBody,
  RecordContentPanel,
  UpdateHistory,
  UpdateHistoryModal
} from "@/components/archive/record-content";
import { formatReadableDate, recordHeaderImage } from "@/components/archive/record-utils";
import { setupGroupFor, setupNarrativeNotes, setupPathFor, setupProfile } from "@/components/archive/setup-utils";
import type { ContentKey } from "@/components/archive/types";
import type { RecordEntry } from "@/lib/types";
type RecordWindowProps = {
  initialContent: ContentKey;
  maximized: boolean;
  record: RecordEntry;
  onClose: () => void;
  onMinimize: () => void;
  onMaximize: () => void;
};

export function RecordWindow({ initialContent, maximized, record, onClose, onMinimize, onMaximize }: RecordWindowProps) {
  if (record.section === "setup") {
    return <SetupRecordWindow maximized={maximized} record={record} onClose={onClose} onMinimize={onMinimize} onMaximize={onMaximize} />;
  }

  return <ArchiveRecordWindow initialContent={initialContent} maximized={maximized} record={record} onClose={onClose} onMinimize={onMinimize} onMaximize={onMaximize} />;
}

function ArchiveRecordWindow({ initialContent, maximized, record, onClose, onMinimize, onMaximize }: RecordWindowProps) {
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
      className={`${maximized ? "record-window is-maximized" : "record-window"}${updateHistoryOpen ? " has-index-modal" : ""}${record.section === "setup" ? " is-setup-record" : ""}`}
      data-state={recordStateKey(record.status)}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      aria-label={`${record.title} archive entry`}
    >
      <header className="window-bar">
        <span>{record.section === "setup" ? "// SETUP TERMINAL" : "// ARCHIVE ENTRY"}</span>
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
            className={`${headerImage ? "record-heading has-heading-banner" : "record-heading"}${record.section === "setup" ? " setup-record-heading" : ""}`}
          >
            {headerImage ? <img className="heading-banner-image" src={headerImage} alt="" decoding="async" /> : null}
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

function SetupRecordWindow({ maximized, record, onClose, onMinimize, onMaximize }: Omit<RecordWindowProps, "initialContent">) {
  const group = setupGroupFor(record);
  const profile = setupProfile(record);
  const headerImage = setupRecordImage(record);
  const notes = setupNarrativeNotes(record);
  const [expandedImage, setExpandedImage] = useState<{ alt: string; src: string } | null>(null);
  const specs = profile.specs.length > 0
    ? profile.specs
    : [
        { label: "STATUS", value: record.status },
        { label: "UPDATED", value: formatReadableDate(record.updated) },
        { label: "PROGRESS", value: `${record.progress}%` }
      ];

  return (
    <motion.article
      className={`${maximized ? "record-window is-maximized" : "record-window"} is-setup-record is-setup-record--${group}`}
      data-state={recordStateKey(record.status)}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      aria-label={`${record.title} setup terminal`}
    >
      <div className="setup-window-shell">
        <section className={`setup-console setup-console--${group}`} aria-label={`${record.title} setup profile`}>
          <SetupPrompt
            command={profile.command}
            record={record}
            onClose={onClose}
            onMaximize={onMaximize}
            onMinimize={onMinimize}
          />

          {group === "tools" ? (
            <SetupToolBody headerImage={headerImage} profile={profile} record={record} specs={specs} />
          ) : group === "peripherals" ? (
            <SetupPeripheralBody headerImage={headerImage} profile={profile} record={record} specs={specs} onExpandImage={setExpandedImage} />
          ) : group === "notes" ? (
            <SetupNoteBody notes={notes} record={record} />
          ) : (
            <SetupSystemBody headerImage={headerImage} profile={profile} record={record} specs={specs} />
          )}
        </section>

        {group !== "notes" && notes.length > 0 ? <SetupNotesTerminal notes={notes} record={record} /> : null}
      </div>
      {expandedImage ? (
        <button className="note-image-lightbox" type="button" aria-label="Close expanded setup image" onClick={() => setExpandedImage(null)}>
          <img src={expandedImage.src} alt={expandedImage.alt} decoding="async" />
        </button>
      ) : null}
    </motion.article>
  );
}

function SetupPrompt({
  command,
  onClose,
  onMaximize,
  onMinimize,
  record
}: {
  command: string;
  record: RecordEntry;
  onClose: () => void;
  onMaximize: () => void;
  onMinimize: () => void;
}) {
  return (
    <div className="setup-console-prompt">
      <div className="setup-prompt-command">
        <span>eightmouse@gestalt</span>
        <i>:</i>
        <span>{setupPathFor(record)}</span>
        <i>$</i>
        <strong>{command}</strong>
      </div>
      <div className="window-actions setup-window-actions">
        <button type="button" data-window-action="minimize" onClick={onMinimize} aria-label="Minimize setup terminal">
          <Minimize2 size={14} />
        </button>
        <button type="button" data-window-action="maximize" onClick={onMaximize} aria-label="Maximize setup terminal">
          <Maximize2 size={14} />
        </button>
        <button type="button" data-window-action="close" onClick={onClose} aria-label="Close setup terminal">
          <X size={15} />
        </button>
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
  profile,
  record,
  specs
}: {
  headerImage: string;
  onExpandImage: (image: { alt: string; src: string }) => void;
  profile: { category: string };
  record: RecordEntry;
  specs: Array<{ label: string; value: string }>;
}) {
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

      <SetupFetchDetails command="device.photo / inspect" profile={profile} record={record} specs={specs} />
    </div>
  );
}

function SetupNoteBody({ notes, record }: { notes: Array<{ title: string; body: string }>; record: RecordEntry }) {
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
      <div className="setup-note-stack">
        {noteFiles.map((note) => (
          <article className="setup-note" key={note.title}>
            <h3>// {note.title}</h3>
            <RecordBody body={note.body} />
          </article>
        ))}
      </div>
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
          <dd>{formatReadableDate(record.updated)}</dd>
        </div>
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

function SetupNotesTerminal({ notes, record }: { notes: Array<{ title: string; body: string }>; record: RecordEntry }) {
  return (
    <section className="setup-console setup-notes-terminal" aria-label={`${record.title} setup notes`}>
      <div className="setup-console-prompt">
        <span>eightmouse@gestalt</span>
        <i>:</i>
        <span>{setupPathFor(record)}</span>
        <i>$</i>
        <strong>cat notes.log</strong>
      </div>
      <div className="setup-note-stack">
        {notes.map((note) => (
          <article className="setup-note" key={note.title}>
            <h3>// {note.title}</h3>
            <RecordBody body={note.body} />
          </article>
        ))}
      </div>
    </section>
  );
}

function setupRecordImage(record: RecordEntry): string {
  const iconImage = typeof record.meta.iconImage === "string" ? record.meta.iconImage : "";

  return iconImage || recordHeaderImage(record) || record.banner || "";
}

function recordStateKey(status: string): string {
  return status.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "unknown";
}
