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
import { setupNarrativeNotes, setupPathFor, setupProfile } from "@/components/archive/setup-utils";
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
  const profile = setupProfile(record);
  const headerImage = recordHeaderImage(record) || record.banner;
  const notes = setupNarrativeNotes(record);
  const specs = profile.specs.length > 0
    ? profile.specs
    : [
        { label: "STATUS", value: record.status },
        { label: "UPDATED", value: formatReadableDate(record.updated) },
        { label: "PROGRESS", value: `${record.progress}%` }
      ];

  return (
    <motion.article
      className={`${maximized ? "record-window is-maximized" : "record-window"} is-setup-record`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      aria-label={`${record.title} setup terminal`}
    >
      <div className="setup-window-shell">
        <section className="setup-console" aria-label={`${record.title} machine profile`}>
          <div className="setup-console-prompt">
            <div className="setup-prompt-command">
              <span>eightmouse@gestalt</span>
              <i>:</i>
              <span>{setupPathFor(record)}</span>
              <i>$</i>
              <strong>{profile.command}</strong>
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

          <div className="setup-console-body">
            <div className={headerImage ? "setup-terminal-avatar has-image" : "setup-terminal-avatar"} aria-hidden="true">
              {headerImage ? <img src={headerImage} alt="" decoding="async" loading="lazy" /> : null}
              <span />
              <span />
              <span />
              <span />
            </div>

            <div className="setup-fetch setup-fetch--terminal">
              <p className="setup-command">&gt; profile.loaded / public-safe</p>
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
          </div>
        </section>

        {notes.length > 0 ? (
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
        ) : null}
      </div>
    </motion.article>
  );
}
