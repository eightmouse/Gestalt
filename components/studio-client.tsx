"use client";

import { memo, useCallback, useEffect, useMemo, useRef, useState, type DragEvent } from "react";
import type { RecordEntry, RecordSection } from "@/lib/types";

type StudioSection = Exclude<RecordSection, "system">;
type StudioContentKey = "overview" | "technical" | "notes" | "samples" | "recommendation" | "hardware" | "attachments";

type StudioForm = {
  originalId: string;
  id: string;
  title: string;
  section: StudioSection;
  type: string;
  status: string;
  started: string;
  updated: string;
  summary: string;
  banner: string;
  headerImage: string;
  samples: string;
  attachments: string;
  progress: number;
  priority: number;
  tags: string;
  milestones: string;
  hardware: string;
  technicalStack: string;
  recommendation: string;
  dashboardActive: boolean;
  steamAppId: string;
  playtime: string;
  lastPlayed: string;
  achievementCount: string;
  body: string;
};

type StudioClientProps = {
  records: RecordEntry[];
};

type MediaTarget = "body" | "banner" | "headerImage" | "samples" | "attachments";
type StudioDraft = {
  body: string;
  form: StudioForm;
  updatedAt: number;
};
type StudioDraftMap = Record<string, StudioDraft>;

type PublishState = {
  phase: "running" | "success" | "error";
  title: string;
  detail: string;
  summary?: PublishSummary;
  output?: string;
};

type PublishSummary = {
  branch?: string;
  cacheToken?: string;
  changedFiles?: number;
  commit?: string;
  mediaAdded?: number;
  recordsChanged?: string[];
  staticExported?: boolean;
};

const studioSections: Array<{
  id: StudioSection;
  code: string;
  label: string;
  icon: string;
}> = [
  { id: "projects", code: "02_PROJECTS", label: "Active Processes", icon: "projects" },
  { id: "games", code: "03_GAMES", label: "Session Logs", icon: "games" },
  { id: "logs", code: "04_LOGS", label: "Field Notes", icon: "logs" },
  { id: "setup", code: "05_SETUP", label: "Hardware & Software", icon: "setup" },
  { id: "archive", code: "06_ARCHIVE", label: "Deprecated Records", icon: "archive" }
];

const sections = studioSections.map((section) => section.id);
const sectionBaseTags = new Set(["archive", "games", "logs", "projects", "setup", "system"]);
const studioDraftStorageKey = "gestalt-studio-drafts-v1";
const tagSuggestions: Record<StudioSection, string[]> = {
  projects: ["web", "tool", "desktop", "python", "typescript", "nextjs", "electron", "game-tools", "patcher", "automation", "archive", "portfolio", "pokemon"],
  games: ["jrpg", "rpg", "action", "adventure", "platformer", "rhythm", "fighting", "steam", "console", "completed", "backlog"],
  logs: ["personal", "update", "site-update", "performance", "ai", "dashboard", "daily"],
  setup: ["hardware", "software", "windows", "linux", "peripherals"],
  archive: ["archived", "deprecated", "experiment", "reference"]
};

export function StudioClient({ records }: StudioClientProps) {
  const firstRecord = records[0];
  const [selectedId, setSelectedId] = useState(firstRecord?.id ?? "__new");
  const [activeSection, setActiveSection] = useState<StudioSection>(firstRecord?.section === "system" || !firstRecord ? "projects" : firstRecord.section);
  const [mode, setMode] = useState<"section" | "edit">(firstRecord ? "edit" : "section");
  const [form, setForm] = useState<StudioForm>(() => fromRecord(firstRecord));
  const [activeContent, setActiveContent] = useState<StudioContentKey>("overview");
  const [message, setMessage] = useState("Studio edit mode. Changes stay local until you save.");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [publishState, setPublishState] = useState<PublishState | null>(null);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [drafts, setDrafts] = useState<StudioDraftMap>(() => readStudioDrafts());
  const bodyDraftRef = useRef(form.body);
  const activeSectionRef = useRef(activeSection);
  const draftsRef = useRef(drafts);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const fileTargetRef = useRef<MediaTarget>("body");
  const formRef = useRef(form);
  const selectedIdRef = useRef(selectedId);

  const sortedRecords = useMemo(() => [...records].sort((a, b) => a.section.localeCompare(b.section) || a.title.localeCompare(b.title)), [records]);
  const groupedRecords = useMemo(() => groupRecords(sortedRecords), [sortedRecords]);
  const sectionRecords = groupedRecords[activeSection].slice().sort((a, b) => b.updated.localeCompare(a.updated) || a.priority - b.priority);
  const contents = useMemo(() => getStudioContents(form.section), [form.section]);
  const activeRecord = useMemo(() => toRecordPreview(form, bodyDraftRef.current), [form]);
  const activeSectionConfig = studioSections.find((section) => section.id === activeSection) ?? studioSections[0];

  useEffect(() => {
    if (!contents.some((item) => item.key === activeContent)) {
      setActiveContent(contents[0]?.key ?? "overview");
    }
  }, [activeContent, contents]);

  useEffect(() => {
    activeSectionRef.current = activeSection;
  }, [activeSection]);

  useEffect(() => {
    draftsRef.current = drafts;
    writeStudioDrafts(drafts);
  }, [drafts]);

  useEffect(() => {
    formRef.current = form;
  }, [form]);

  useEffect(() => {
    selectedIdRef.current = selectedId;
  }, [selectedId]);

  const cacheDraft = useCallback((nextForm: StudioForm, nextBody = bodyDraftRef.current, id = selectedIdRef.current) => {
    const key = studioDraftKey(nextForm, id, activeSectionRef.current);

    setDrafts((current) => ({
      ...current,
      [key]: {
        body: nextBody,
        form: { ...nextForm, body: nextBody },
        updatedAt: Date.now()
      }
    }));
  }, []);

  const update = useCallback(<Key extends keyof StudioForm>(key: Key, value: StudioForm[Key]) => {
    const next = { ...formRef.current, [key]: value };
    const nextBody = key === "body" && typeof value === "string" ? value : bodyDraftRef.current;

    if (key === "body" && typeof value === "string") {
      bodyDraftRef.current = value;
    }

    formRef.current = next;
    setForm(next);
    cacheDraft(next, nextBody);
  }, [cacheDraft]);

  const openSection = useCallback((section: StudioSection) => {
    setActiveSection(section);
    setMode("section");
    setMessage(`Browsing ${section}. Select a record to edit, or create a new one.`);
  }, []);

  const loadRecord = useCallback((id: string) => {
    setSelectedId(id);
    setActiveContent("overview");
    setMode("edit");

    if (id === "__new") {
      const draft = draftsRef.current[studioNewDraftKey(activeSection)];
      const next = draft?.form ?? emptyForm(activeSection);
      bodyDraftRef.current = draft?.body ?? next.body;
      formRef.current = next;
      setForm(next);
      setMessage(draft ? `Restored unsaved ${activeSection} draft.` : `New ${activeSection} record draft ready.`);
      return;
    }

    const record = records.find((entry) => entry.id === id);

    if (record) {
      const draft = draftsRef.current[studioRecordDraftKey(id)];
      const next = draft?.form ?? fromRecord(record);
      setActiveSection(next.section);
      bodyDraftRef.current = draft?.body ?? next.body;
      formRef.current = next;
      setForm(next);
      setMessage(draft ? `Loaded unsaved draft for ${next.title}.` : `Loaded ${record.title}.`);
    }
  }, [activeSection, records]);

  const newRecord = useCallback((section: StudioSection) => {
    setActiveSection(section);
    setSelectedId("__new");
    setActiveContent("overview");
    setMode("edit");
    const draft = draftsRef.current[studioNewDraftKey(section)];
    const next = draft?.form ?? emptyForm(section);
    bodyDraftRef.current = draft?.body ?? next.body;
    formRef.current = next;
    setForm(next);
    setMessage(draft ? `Restored unsaved ${section} draft.` : `New ${section} record draft ready.`);
  }, []);

  const writeRecord = async (recordForm: StudioForm, recordBody: string) => {
    const response = await fetch("/api/studio/entry", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...recordForm,
        body: recordBody,
        dashboardActive: recordForm.section === "games" && recordForm.dashboardActive,
        tags: parseTags(recordForm.tags)
      })
    });
    const data = await readStudioResponse(response);

    if (!response.ok) {
      throw new StudioRequestError(data.error || "Save failed.", data.output);
    }

    if (!data.id || !data.path) {
      throw new StudioRequestError("Save response was missing record details.", data.output);
    }

    return { id: String(data.id), path: String(data.path) };
  };

  const save = async () => {
    setSaving(true);
    setMessage("Writing record...");
    setPublishState({
      phase: "running",
      title: "Saving record",
      detail: "Writing MDX and refreshing static archive data."
    });
    setNotificationOpen(false);

    try {
      const pendingDrafts = Object.entries(draftsRef.current)
        .filter(([key, draft]) => key.startsWith("record:") && key !== studioDraftKey(formRef.current, selectedIdRef.current, activeSectionRef.current) && draft.form.originalId)
        .map(([key, draft]) => ({ key, draft }));
      const data = await writeRecord(form, bodyDraftRef.current);
      const savedId = data.id;
      const previousDraftKey = studioDraftKey(formRef.current, selectedIdRef.current, activeSectionRef.current);
      const savedForm = { ...formRef.current, body: bodyDraftRef.current, id: savedId, originalId: savedId };

      if (pendingDrafts.length > 0) {
        setMessage(`Saved current record. Applying ${pendingDrafts.length} pending draft${pendingDrafts.length === 1 ? "" : "s"} before publishing...`);

        for (const { draft } of pendingDrafts) {
          await writeRecord(draft.form, draft.body);
        }
      }

      formRef.current = savedForm;
      selectedIdRef.current = savedId;
      setSelectedId(savedId);
      setForm(savedForm);
      setDrafts((current) => {
        const next = { ...current };
        delete next[previousDraftKey];
        delete next[studioRecordDraftKey(savedId)];
        delete next[studioNewDraftKey(savedForm.section)];
        for (const { key, draft } of pendingDrafts) {
          delete next[key];
          delete next[studioRecordDraftKey(draft.form.id)];
          delete next[studioRecordDraftKey(draft.form.originalId)];
        }
        return next;
      });
      setMessage(`Saved ${data.path}. Publishing to GitHub...`);
      await publishArchive("Saved and published to GitHub.");
    } catch (error) {
      const detail = error instanceof Error ? error.message : "Save failed.";
      setMessage(detail);
      setPublishState({
        phase: "error",
        title: "Save failed",
        detail,
        output: error instanceof StudioRequestError ? error.output : undefined
      });
      setNotificationOpen(true);
    } finally {
      setSaving(false);
    }
  };

  const deleteRecord = async () => {
    if (!form.originalId || selectedId === "__new") {
      setMessage("Nothing saved yet, so there is no record file to delete.");
      return;
    }

    const confirmed = window.confirm(`This will delete "${form.title}" ${form.type.toLowerCase()} from Gestalt. Are you sure?`);

    if (!confirmed) {
      return;
    }

    setSaving(true);
    setMessage("Deleting record...");

    try {
      const response = await fetch("/api/studio/entry", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: form.originalId })
      });
      const data = await readStudioResponse(response);

      if (!response.ok) {
        throw new StudioRequestError(data.error || "Delete failed.", data.output);
      }

      const next = emptyForm(activeSection);
      bodyDraftRef.current = next.body;
      formRef.current = next;
      setSelectedId("__new");
      setMode("section");
      setForm(next);
      setDrafts((current) => {
        const updated = { ...current };
        delete updated[studioRecordDraftKey(form.originalId)];
        return updated;
      });
      setMessage(`Deleted ${data.id}. Publishing removal to GitHub...`);
      await publishArchive("Deleted and published to GitHub.");
    } catch (error) {
      const detail = error instanceof Error ? error.message : "Delete failed.";
      setMessage(detail);
      setPublishState({
        phase: "error",
        title: "Delete failed",
        detail,
        output: error instanceof StudioRequestError ? error.output : undefined
      });
      setNotificationOpen(true);
    } finally {
      setSaving(false);
    }
  };

  const publishArchive = async (successMessage: string) => {
    setPublishState({
      phase: "running",
      title: "Publishing archive",
      detail: "Running checks, committing, and pushing to GitHub."
    });

    const publishResponse = await fetch("/api/studio/publish", { method: "POST" });
    const publishData = await readStudioResponse(publishResponse);

    if (!publishResponse.ok) {
      setMessage("Saved locally, but publish failed.");
      setPublishState({
        phase: "error",
        title: "Publish blocked",
        detail: publishData.error || "The record changed locally, but GitHub publish failed.",
        summary: publishData.summary,
        output: publishData.output
      });
      setNotificationOpen(true);
      return;
    }

    setMessage(successMessage);
    setPublishState({
      phase: "success",
      title: "Archive published",
      detail: publishData.message || "GitHub received the latest archive update.",
      summary: publishData.summary,
      output: publishData.output
    });
  };

  const chooseFiles = (target: MediaTarget) => {
    fileTargetRef.current = target;
    fileInputRef.current?.click();
  };

  const importMediaFiles = async (files: FileList | File[]) => {
    const list = Array.from(files);

    if (list.length === 0) {
      return [];
    }

    const imported: Array<{ markdown: string; path: string }> = [];

    for (const file of list) {
      const payload = new FormData();
      payload.set("recordId", form.id || form.title || "draft");
      payload.set("file", file);

      const response = await fetch("/api/studio/media", {
        method: "POST",
        body: payload
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `Upload failed for ${file.name}.`);
      }

      imported.push({ markdown: data.markdown, path: data.path });
    }

    return imported;
  };

  const uploadFiles = async (files: FileList | File[], target = fileTargetRef.current) => {
    const list = Array.from(files);

    if (list.length === 0) {
      return;
    }

    setUploading(true);
    setMessage(`Importing ${list.length} media file${list.length === 1 ? "" : "s"}...`);

    try {
      const imported = await importMediaFiles(list);
      const snippets = imported.map((item) => item.markdown);
      const firstPath = imported[0]?.path ?? "";

      if (target === "banner") {
        update("banner", firstPath);
      } else if (target === "headerImage") {
        update("headerImage", firstPath);
      } else if (target === "samples" || target === "attachments") {
        const current = mediaListFromText(form[target]);
        const next = [...current, ...imported.map((item) => item.path)];
        update(target, mediaListToText(next));
      } else {
        const nextBody = `${bodyDraftRef.current.trim()}\n\n${snippets.join("\n")}\n`;
        bodyDraftRef.current = nextBody;
        update("body", nextBody);
      }

      setMessage(target === "body" ? "Media inserted into the body draft." : "Media assigned.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  };

  const uploadNoteMedia = async (files: FileList | File[]): Promise<string[]> => {
    const list = Array.from(files);

    if (list.length === 0) {
      return [];
    }

    setUploading(true);
    setMessage(`Importing ${list.length} note image${list.length === 1 ? "" : "s"}...`);

    try {
      const imported = await importMediaFiles(list);
      setMessage("Media inserted into the note.");
      return imported.map((item) => item.markdown);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Upload failed.");
      return [];
    } finally {
      setUploading(false);
    }
  };

  return (
    <main className="archive-shell studio-shell">
      <input
        ref={fileInputRef}
        hidden
        type="file"
        multiple
        accept="image/png,image/jpeg,image/webp,image/gif,video/mp4,video/webm"
        onChange={(event) => event.target.files && uploadFiles(event.target.files)}
        onClick={(event) => {
          event.currentTarget.value = "";
        }}
      />
      <section className="studio-workspace studio-workspace-v2" aria-label="Gestalt local studio">
        <header className="studio-header studio-header-v2">
          <div>
            <p className="route-label">// LOCAL STUDIO</p>
            <h1>Archive Edit Mode<span className="cursor">_</span></h1>
            <p className="subtle">A quiet copy of the archive for editing records before saving them to MDX.</p>
          </div>
          <div className="studio-actions">
            <button type="button" disabled={saving} onClick={save}>{saving ? "Publishing..." : "Save Record"}</button>
            <button
              className={`studio-notification-button ${publishState ? `is-${publishState.phase}` : ""}`}
              type="button"
              aria-label="Open publish notifications"
              aria-expanded={notificationOpen}
              onClick={() => setNotificationOpen((current) => !current)}
            >
              <span>NOTIFY</span>
              <i>{publishState?.phase === "error" ? "!" : publishState?.phase === "running" ? "..." : publishState ? "1" : "0"}</i>
            </button>
          </div>
        </header>

        <div className="studio-os-grid">
          <StudioNav activeSection={activeSection} onOpenSection={openSection} />

          {mode === "section" ? (
            <StudioSectionPage
              records={sectionRecords}
              section={activeSectionConfig}
              onEdit={loadRecord}
              onNew={() => newRecord(activeSection)}
            />
          ) : (
          <section className="studio-record-copy" aria-label="Editable archive preview">
            <div className="studio-copy-bar">
              <span>// EDITABLE ARCHIVE ENTRY</span>
              <i>{message}</i>
            </div>

            <div className="studio-copy-layout">
              <div className="studio-copy-main">
                <EditableHeading form={form} onFilePick={chooseFiles} onUpdate={update} />
                <StudioContent
                  activeContent={activeContent}
                  form={form}
                  record={activeRecord}
                  uploading={uploading}
                  onBodyCommit={(value) => {
                    bodyDraftRef.current = value;
                    update("body", value);
                  }}
                  onFileDrop={uploadFiles}
                  onFilePick={chooseFiles}
                  onNoteMediaUpload={uploadNoteMedia}
                  onUpdate={update}
                />
              </div>

              <aside className="studio-copy-aside">
                <div>
                  <h3>CONTENTS</h3>
                  <ol>
                    {contents.map((item, index) => (
                      <li className={activeContent === item.key ? "is-active" : ""} key={item.key}>
                        <button type="button" onClick={() => setActiveContent(item.key)}>
                          {String(form.section === "projects" ? index : index + 1).padStart(2, "0")}_{item.label}
                        </button>
                      </li>
                    ))}
                  </ol>
                </div>

                <Inspector
                  canDelete={mode === "edit" && selectedId !== "__new"}
                  form={form}
                  saving={saving}
                  onDelete={deleteRecord}
                  onUpdate={update}
                />
              </aside>
            </div>
          </section>
          )}
        </div>
      </section>
      {notificationOpen ? (
        <PublishNotificationPanel notification={publishState} onClose={() => setNotificationOpen(false)} />
      ) : null}
    </main>
  );
}

class StudioRequestError extends Error {
  output?: string;

  constructor(message: string, output?: string) {
    super(message);
    this.name = "StudioRequestError";
    this.output = output;
  }
}

async function readStudioResponse(response: Response): Promise<{ error?: string; id?: string; message?: string; output?: string; path?: string; summary?: PublishSummary }> {
  const text = await response.text();

  if (!text) {
    return {};
  }

  try {
    return JSON.parse(text) as { error?: string; id?: string; message?: string; output?: string; path?: string; summary?: PublishSummary };
  } catch {
    return {
      error: text.slice(0, 220),
      output: text
    };
  }
}

function PublishNotificationPanel({
  notification,
  onClose
}: {
  notification: PublishState | null;
  onClose: () => void;
}) {
  return (
    <aside className="studio-notification-panel" aria-label="Publish notifications">
      <div className="studio-notification-head">
        <div>
          <p>// NOTIFICATIONS</p>
          <h2>{notification?.title ?? "No publish events"}</h2>
        </div>
        <button type="button" onClick={onClose}>Close</button>
      </div>
      {notification ? (
        <article className={`studio-notification-card is-${notification.phase}`}>
          <span>{notification.detail}</span>
          {notification.summary ? <PublishSummaryGrid summary={notification.summary} /> : null}
          {notification.output ? <pre>{formatPublishOutput(notification.output)}</pre> : null}
        </article>
      ) : (
        <article className="studio-notification-card">
          <span>No save or publish event has been recorded in this Studio session.</span>
        </article>
      )}
    </aside>
  );
}

function PublishSummaryGrid({ summary }: { summary: PublishSummary }) {
  const rows = [
    ["COMMIT", summary.commit ? summary.commit.slice(0, 7) : "Pending"],
    ["BRANCH", summary.branch ?? "main"],
    ["FILES", summary.changedFiles === undefined ? "0" : String(summary.changedFiles)],
    ["RECORDS", summary.recordsChanged?.length ? summary.recordsChanged.join(", ") : "None"],
    ["MEDIA", summary.mediaAdded === undefined ? "0" : String(summary.mediaAdded)],
    ["STATIC", summary.staticExported ? "Exported" : "Not exported"],
    ["CACHE", summary.cacheToken ? summary.cacheToken.slice(-6) : "None"]
  ];

  return (
    <dl className="studio-publish-summary">
      {rows.map(([label, value]) => (
        <div key={label}>
          <dt>{label}</dt>
          <dd>{value}</dd>
        </div>
      ))}
    </dl>
  );
}

function formatPublishOutput(output: string): string {
  const lines = output.trim().split(/\r?\n/).filter(Boolean);
  return lines.slice(-34).join("\n");
}

const StudioNav = memo(function StudioNav({
  activeSection,
  onOpenSection
}: {
  activeSection: StudioSection;
  onOpenSection: (section: StudioSection) => void;
}) {
  return (
    <aside className="studio-nav-copy">
      <div className="brand-block">
        <p className="brand">GESTALT</p>
        <span>STUDIO</span>
      </div>
      <p className="studio-nav-label">// ARCHIVE NAVIGATION</p>
      {studioSections.map((section) => (
        <button
          className={activeSection === section.id ? "nav-trigger is-active" : "nav-trigger"}
          key={section.id}
          type="button"
          onClick={() => onOpenSection(section.id)}
        >
          <span className="nav-mark" data-icon={section.icon} aria-hidden="true" />
          <span>
            <strong>{section.code}</strong>
            <small>{section.label}</small>
          </span>
        </button>
      ))}
    </aside>
  );
});

function StudioSectionPage({
  onEdit,
  onNew,
  records,
  section
}: {
  onEdit: (id: string) => void;
  onNew: () => void;
  records: RecordEntry[];
  section: (typeof studioSections)[number];
}) {
  const countLabel = `${records.length} ${records.length === 1 ? "record" : "records"}`;
  const splitSection = splitStudioSectionRecords(section.id, records);

  return (
    <section className={splitSection ? "section-page section-page--split studio-section-copy" : "section-page studio-section-copy"} aria-label={`${section.code} studio records`}>
      <header className="section-page-header">
        <span className="nav-mark" data-icon={section.icon} aria-hidden="true" />
        <div>
          <p>{section.code}</p>
          <h2>{section.label}</h2>
        </div>
        <div className="studio-section-header-actions">
          <i>{countLabel}</i>
          <button type="button" onClick={onNew}>+ New</button>
        </div>
      </header>

      {splitSection ? (
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
                    <StudioSectionRecordButton key={record.id} record={record} onEdit={onEdit} />
                  ))
                ) : (
                  <p className="search-empty">No records filed here yet.</p>
                )}
              </div>
            </section>
          ))}
        </div>
      ) : (
        <div className="section-record-grid">
          {records.length > 0 ? (
            records.map((record) => (
              <StudioSectionRecordButton key={record.id} record={record} onEdit={onEdit} />
            ))
          ) : (
            <p className="search-empty">No records filed here yet.</p>
          )}
        </div>
      )}
    </section>
  );
}

function StudioSectionRecordButton({ onEdit, record }: { onEdit: (id: string) => void; record: RecordEntry }) {
  const tags = recordCardTags(record);

  return (
    <button className="section-record" type="button" onClick={() => onEdit(record.id)}>
      <span className="section-record-kind">{record.type}</span>
      <strong>{record.title}</strong>
      <span>{record.summary}</span>
      {tags.length > 0 ? (
        <em className="section-record-tags" aria-label="Record tags">
          {tags.map((tag) => (
            <b className={`tag-pill ${tagToneClass(tag)}`} key={tag}>#{tag}</b>
          ))}
        </em>
      ) : null}
      <i>{record.status} . {formatStudioDate(record.updated)}</i>
    </button>
  );
}

function splitStudioSectionRecords(section: StudioSection, records: RecordEntry[]): Array<{ records: RecordEntry[]; title: string }> | null {
  if (section === "projects") {
    const activeStatuses = new Set(["active", "in progress", "planning", "blocked"]);

    return [
      { title: "ACTIVE PROJECTS", records: records.filter((record) => activeStatuses.has(record.status.toLowerCase())) },
      { title: "OTHER PROCESSES", records: records.filter((record) => !activeStatuses.has(record.status.toLowerCase())) }
    ];
  }

  if (section === "games") {
    const activeStatuses = new Set(["playing", "on hold", "in progress"]);

    return [
      { title: "SESSION LOGS", records: records.filter((record) => activeStatuses.has(record.status.toLowerCase())) },
      { title: "PAST LOGS", records: records.filter((record) => !activeStatuses.has(record.status.toLowerCase())) }
    ];
  }

  return null;
}

function EditableHeading({
  form,
  onFilePick,
  onUpdate
}: {
  form: StudioForm;
  onFilePick: (target: MediaTarget) => void;
  onUpdate: <Key extends keyof StudioForm>(key: Key, value: StudioForm[Key]) => void;
}) {
  return (
    <div className={form.headerImage ? "studio-entry-heading has-heading-banner" : "studio-entry-heading"}>
      {form.headerImage ? <img src={form.headerImage} alt="" decoding="async" /> : null}
      <div className="studio-heading-content">
        <div className="studio-heading-topline">
          <EditableText className="studio-kind-edit" label="Type" value={form.type} onChange={(value) => onUpdate("type", value)} />
          <EditableText className="studio-id-edit" label="ID" value={form.id} onChange={(value) => onUpdate("id", value)} placeholder="auto-from-title" />
        </div>
        <h2>
          <EditableText className="studio-title-edit" label="Title" value={form.title} onChange={(value) => onUpdate("title", value)} />
        </h2>
        <div className="studio-heading-meta">
          <span>
            Status: <EditableText label="Status" value={form.status} onChange={(value) => onUpdate("status", value)} />
          </span>
          <span>
            Started: <EditableText label="Started" value={form.started} onChange={(value) => onUpdate("started", value)} placeholder="YYYY-MM-DD" />
          </span>
          <span>
            Updated: <EditableText label="Updated" value={form.updated} onChange={(value) => onUpdate("updated", value)} placeholder="YYYY-MM-DD" />
          </span>
      </div>
        {form.section === "games" ? (
          <button className="studio-thumbnail-button" type="button" onClick={() => onFilePick("banner")}>
            {form.banner ? "Change thumbnail" : "Set thumbnail"}
          </button>
        ) : null}
      </div>
      <button className="studio-header-button" type="button" onClick={() => onFilePick("headerImage")}>
        {form.headerImage ? "Change Header" : "Add Header"}
      </button>
    </div>
  );
}

function StudioContent({
  activeContent,
  form,
  onBodyCommit,
  onFileDrop,
  onFilePick,
  onNoteMediaUpload,
  onUpdate,
  record,
  uploading
}: {
  activeContent: StudioContentKey;
  form: StudioForm;
  onBodyCommit: (value: string) => void;
  onFileDrop: (files: FileList | File[], target?: MediaTarget) => void;
  onFilePick: (target: MediaTarget) => void;
  onNoteMediaUpload: (files: FileList | File[]) => Promise<string[]>;
  onUpdate: <Key extends keyof StudioForm>(key: Key, value: StudioForm[Key]) => void;
  record: RecordEntry;
  uploading: boolean;
}) {
  if (activeContent === "samples" || activeContent === "attachments") {
    const target = activeContent;
    const paths = mediaListFromText(form[target]);

    return (
      <section className="studio-content-terminal">
        <div className="terminal-title">// {activeContent === "samples" ? "SAMPLES" : "ATTACHMENTS"}</div>
        <DropZone uploading={uploading} onDrop={(files) => onFileDrop(files, target)} onPick={() => onFilePick(target)} />
        <MediaPathList
          paths={paths}
          onRemove={(pathToRemove) => onUpdate(target, mediaListToText(paths.filter((path) => path !== pathToRemove)))}
        />
      </section>
    );
  }

  if (activeContent === "technical") {
    return (
      <section className="studio-content-terminal">
        <div className="terminal-title">// TECHNICAL STACK</div>
        <StackEditor value={form.technicalStack} onChange={(value) => onUpdate("technicalStack", value)} />
      </section>
    );
  }

  if (activeContent === "hardware") {
    return (
      <section className="studio-content-terminal">
        <div className="terminal-title">// HARDWARE</div>
        <BufferedBodyEditor label="Hardware Notes" value={form.hardware} onCommit={(value) => onUpdate("hardware", value)} />
      </section>
    );
  }

  if (activeContent === "recommendation") {
    return (
      <section className="studio-content-terminal">
        <div className="terminal-title">// RECOMMENDATION</div>
        <div className="studio-inline-grid">
          <InlineField label="Status" value={form.status} onChange={(value) => onUpdate("status", value)} />
          <InlineField label="Completion" type="number" value={String(form.progress)} onChange={(value) => onUpdate("progress", Number(value))} />
        </div>
        <div className="status-grid">
          <div className="status-cell"><span>STATUS</span><strong>{form.status}</strong></div>
          <div className="status-cell"><span>PROGRESS</span><strong>{form.progress}%</strong></div>
        </div>
        <BufferedBodyEditor label="Recommendation Text" value={form.recommendation} onCommit={(value) => onUpdate("recommendation", value)} />
      </section>
    );
  }

  if (activeContent === "notes") {
    return (
      <section className="studio-content-terminal">
        <div className="terminal-title">// NOTES</div>
        <NoteStackEditor value={form.body} onCommit={onBodyCommit} onMediaUpload={onNoteMediaUpload} />
      </section>
    );
  }

  return (
    <section className="studio-content-terminal">
      <div className="terminal-title">// OVERVIEW</div>
      <label className="studio-textarea-field">
        Summary
        <textarea value={form.summary} onChange={(event) => onUpdate("summary", event.target.value)} />
      </label>
      <div className="studio-progress-edit">
        <span>Current Progress</span>
        <input type="range" min="0" max="100" value={form.progress} onChange={(event) => onUpdate("progress", Number(event.target.value))} />
        <strong>{record.progress}%</strong>
      </div>
      <MilestoneEditor value={form.milestones} onChange={(value) => onUpdate("milestones", value)} />
    </section>
  );
}

function Inspector({
  canDelete,
  form,
  onDelete,
  saving,
  onUpdate
}: {
  canDelete: boolean;
  form: StudioForm;
  onDelete: () => void;
  saving: boolean;
  onUpdate: <Key extends keyof StudioForm>(key: Key, value: StudioForm[Key]) => void;
}) {
  return (
    <div className="studio-inspector">
      <h3>INSPECTOR</h3>
      <label>
        Section
        <select value={form.section} onChange={(event) => onUpdate("section", event.target.value as StudioSection)}>
          {sections.map((section) => (
            <option key={section} value={section}>{section}</option>
          ))}
        </select>
      </label>
      {form.section === "games" ? (
        <>
          <label className="studio-check">
            <input type="checkbox" checked={form.dashboardActive} onChange={(event) => onUpdate("dashboardActive", event.target.checked)} />
            <span>Dashboard active game</span>
          </label>
          <InlineField label="Steam App ID" value={form.steamAppId} onChange={(value) => onUpdate("steamAppId", value)} />
        </>
      ) : null}
      <TagEditor section={form.section} value={form.tags} onChange={(value) => onUpdate("tags", value)} />
      <dl>
        <div><dt>Created</dt><dd>{form.started || "Unknown"}</dd></div>
        <div><dt>Updated</dt><dd>{form.updated || "Unknown"}</dd></div>
      </dl>
      {canDelete ? (
        <div className="studio-inspector-danger">
          <span>Danger Zone</span>
          <button className="studio-danger-action" type="button" disabled={saving} onClick={onDelete}>Delete Record</button>
        </div>
      ) : null}
    </div>
  );
}

function StackEditor({ onChange, value }: { onChange: (value: string) => void; value: string }) {
  return (
    <label className="studio-textarea-field">
      Stack Items
      <textarea
        value={value}
        placeholder={"Next.js App Router\nTypeScript\nMDX records"}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

function TagEditor({
  onChange,
  section,
  value
}: {
  onChange: (value: string) => void;
  section: StudioSection;
  value: string;
}) {
  const currentTags = parseTags(value);
  const suggestions = tagSuggestions[section].filter((tag) => tag !== section && tag !== `${section}s`);

  const toggleTag = (tag: string) => {
    const nextTags = currentTags.includes(tag)
      ? currentTags.filter((currentTag) => currentTag !== tag)
      : [...currentTags, tag];

    onChange(formatTags(nextTags));
  };

  return (
    <div className="studio-tag-editor">
      <span>Tags</span>
      <div className="studio-tag-suggestions" aria-label="Suggested tags">
        {suggestions.map((tag) => (
          <button
            className={currentTags.includes(tag) ? "is-active" : ""}
            key={tag}
            type="button"
            onClick={() => toggleTag(tag)}
          >
            #{tag}
          </button>
        ))}
      </div>
      <label>
        Custom tags
        <input
          value={value}
          placeholder="jrpg, steam, performance"
          onChange={(event) => onChange(event.target.value)}
        />
      </label>
    </div>
  );
}

function NoteStackEditor({
  onCommit,
  onMediaUpload,
  value
}: {
  onCommit: (value: string) => void;
  onMediaUpload: (files: FileList | File[]) => Promise<string[]>;
  value: string;
}) {
  const initialParts = useMemo(() => splitStudioUpdateIndex(value), [value]);
  const [notes, setNotes] = useState<StudioNote[]>(() => parseStudioNotes(value));
  const [updateIndex, setUpdateIndex] = useState(initialParts.updateIndex);
  const [openIndex, setOpenIndex] = useState(0);
  const lastSerializedRef = useRef("");
  const noteSelectionsRef = useRef<Record<number, { end: number; start: number }>>({});

  useEffect(() => {
    if (value === lastSerializedRef.current) {
      return;
    }

    const parts = splitStudioUpdateIndex(value);
    setNotes(parseStudioNotes(value));
    setUpdateIndex(parts.updateIndex);
    setOpenIndex(0);
  }, [value]);

  const commitNotes = (nextNotes: StudioNote[]) => {
    const serialized = serializeStudioNotes(nextNotes, updateIndex);

    lastSerializedRef.current = serialized;
    setNotes(nextNotes);
    onCommit(serialized);
  };

  const addNote = () => {
    commitNotes([
      {
        title: new Date().toLocaleDateString("en-GB").replaceAll("/", " / ") + " - New Note",
        body: ""
      },
      ...notes
    ]);
    setOpenIndex(0);
  };

  const updateNote = (index: number, key: keyof StudioNote, nextValue: string) => {
    const nextNotes = [...notes];
    nextNotes[index] = { ...nextNotes[index], [key]: nextValue };
    commitNotes(nextNotes);
  };

  const insertIntoNote = (index: number, markdown: string, cursorPosition: number) => {
    const note = notes[index];
    const insert = `\n\n${markdown.trim()}\n\n`;
    const nextBody = `${note.body.slice(0, cursorPosition)}${insert}${note.body.slice(cursorPosition)}`.replace(/\n{5,}/g, "\n\n\n");

    updateNote(index, "body", nextBody.trim());
    setOpenIndex(index);
  };

  const dropMediaIntoNote = async (event: DragEvent<HTMLTextAreaElement>, index: number) => {
    event.preventDefault();

    if (!event.dataTransfer.files.length) {
      return;
    }

    const cursorPosition = event.currentTarget.selectionStart;
    const snippets = await onMediaUpload(event.dataTransfer.files);

    if (snippets.length > 0) {
      insertIntoNote(index, snippets.join("\n"), cursorPosition);
    }
  };

  const applyMediaToken = (index: number, token: string) => {
    const note = notes[index];
    const matches = [...note.body.matchAll(/!\[(.*?)]\((.*?)\)/g)];
    const selection = noteSelectionsRef.current[index] ?? { start: note.body.length, end: note.body.length };
    const selectedMatch = matches.find((match) => {
      const start = match.index ?? -1;
      const end = start + match[0].length;

      if (selection.start === selection.end) {
        return selection.start >= start && selection.start <= end;
      }

      return selection.start < end && selection.end > start;
    });
    const previousMatch = matches.filter((match) => (match.index ?? 0) <= selection.start).at(-1);
    const targetMatch = selectedMatch ?? previousMatch ?? matches.at(-1);

    if (!targetMatch || targetMatch.index === undefined) {
      return;
    }

    const [fullMatch, rawAlt, src] = targetMatch;
    const parts = rawAlt.split("|").map((part) => part.trim()).filter(Boolean);
    const normalized = token.toLowerCase();
    const nextParts = mediaPartsWithToken(parts, normalized);
    const nextMarkdown = `![${nextParts.join(" | ")}](${src})`;
    const nextBody = `${note.body.slice(0, targetMatch.index)}${nextMarkdown}${note.body.slice(targetMatch.index + fullMatch.length)}`;

    updateNote(index, "body", nextBody);
  };

  const removeNote = (index: number) => {
    const nextNotes = notes.filter((_, noteIndex) => noteIndex !== index);
    commitNotes(nextNotes);
    setOpenIndex(Math.max(0, Math.min(openIndex, nextNotes.length - 1)));
  };

  return (
    <div className="studio-note-editor">
      <div className="studio-note-editor-head">
        <span>{notes.length} {notes.length === 1 ? "note" : "notes"}</span>
        <button type="button" onClick={addNote}>+ Note</button>
      </div>
      {notes.length > 0 ? (
        notes.map((note, index) => (
          <article className={openIndex === index ? "studio-note-edit is-open" : "studio-note-edit"} key={`note-${index}`}>
            <div className="studio-note-row">
              <button
                className="studio-note-toggle"
                type="button"
                aria-expanded={openIndex === index}
                onClick={() => setOpenIndex(openIndex === index ? -1 : index)}
              >
                {openIndex === index ? "Collapse" : "Open"}
              </button>
              <input aria-label="Note title" value={note.title} onChange={(event) => updateNote(index, "title", event.target.value)} />
              <button type="button" onClick={(event) => {
                removeNote(index);
              }}>Remove</button>
            </div>
            {openIndex === index ? (
              <>
                <p className="studio-note-hint">Drop screenshots inside the note body to insert them at the cursor.</p>
                <div className="studio-note-media-tools" aria-label="Apply style to the last image in this note">
                  {["wide", "banner", "small", "top", "bottom", "contain", "no-caption"].map((token) => (
                    <button
                      type="button"
                      key={token}
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => applyMediaToken(index, token)}
                    >
                      {token}
                    </button>
                  ))}
                </div>
                <textarea
                  aria-label={`${note.title} body`}
                  value={note.body}
                  onChange={(event) => updateNote(index, "body", event.target.value)}
                  onSelect={(event) => {
                    noteSelectionsRef.current[index] = {
                      end: event.currentTarget.selectionEnd,
                      start: event.currentTarget.selectionStart
                    };
                  }}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={(event) => dropMediaIntoNote(event, index)}
                />
              </>
            ) : null}
          </article>
        ))
      ) : (
        <p className="studio-empty-note">No notes yet.</p>
      )}
    </div>
  );
}

function isStudioMediaToken(value: string): boolean {
  return ["wide", "banner", "small", "left", "right", "center", "top", "bottom", "crop", "contain", "no-caption"].includes(value.toLowerCase());
}

function mediaPartsWithToken(parts: string[], token: string): string[] {
  const tokenGroups = [
    ["wide", "banner", "small"],
    ["left", "right", "center"],
    ["top", "bottom"],
    ["crop", "contain"]
  ];
  const tokenGroup = tokenGroups.find((group) => group.includes(token)) ?? [token];
  const existing = parts.filter((part) => {
    const normalized = part.toLowerCase();

    if (token === "no-caption") {
      return normalized !== "no-caption" && isStudioMediaToken(part);
    }

    return !tokenGroup.includes(normalized) && normalized !== token;
  });

  if (token === "no-caption") {
    return ["no-caption", ...existing];
  }

  return [...existing, token];
}

function MilestoneEditor({ onChange, value }: { onChange: (value: string) => void; value: string }) {
  const [rows, setRows] = useState<MilestoneDraft[]>(() => {
    const parsed = parseMilestoneDraft(value);
    return parsed.length > 0 ? parsed : [emptyMilestoneDraft()];
  });

  useEffect(() => {
    const parsed = parseMilestoneDraft(value);
    setRows(parsed.length > 0 ? parsed : [emptyMilestoneDraft()]);
  }, [value]);

  const commitRows = (nextRows: MilestoneDraft[]) => {
    setRows(nextRows);
    onChange(serializeMilestones(nextRows));
  };

  const updateRow = (index: number, key: keyof MilestoneDraft, nextValue: string | number) => {
    const nextRows = [...rows];
    nextRows[index] = { ...nextRows[index], [key]: nextValue };
    commitRows(nextRows);
  };

  const addRow = () => {
    commitRows([...rows, emptyMilestoneDraft()]);
  };

  const removeRow = (index: number) => {
    const nextRows = rows.filter((_, rowIndex) => rowIndex !== index);
    commitRows(nextRows.length > 0 ? nextRows : [emptyMilestoneDraft()]);
  };

  return (
    <div className="studio-milestone-editor">
      <div className="studio-milestone-head">
        <span>Progress Rows</span>
        <button type="button" onClick={addRow}>+ Row</button>
      </div>
      {rows.map((row, index) => (
        <div className="studio-milestone-row" key={`${index}-${row.label}`}>
          <input aria-label="Progress label" value={row.label} placeholder="Label" onChange={(event) => updateRow(index, "label", event.target.value)} />
          <input aria-label="Progress value" type="number" min="0" max="100" value={row.progress} onChange={(event) => updateRow(index, "progress", Number(event.target.value))} />
          <input aria-label="Progress status" value={row.status} placeholder="Status" onChange={(event) => updateRow(index, "status", event.target.value)} />
          <button type="button" aria-label="Remove progress row" onClick={() => removeRow(index)}>x</button>
        </div>
      ))}
    </div>
  );
}

function InlineField({
  className = "",
  label,
  onChange,
  placeholder = "",
  type = "text",
  value
}: {
  className?: string;
  label: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  value: string;
}) {
  return (
    <label className={`studio-inline-field ${className}`}>
      <span>{label}</span>
      <input type={type} value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function EditableText({
  className = "",
  label,
  onChange,
  placeholder = "",
  value
}: {
  className?: string;
  label: string;
  onChange: (value: string) => void;
  placeholder?: string;
  value: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  const commit = () => {
    onChange(draft.trim());
    setEditing(false);
  };

  if (editing) {
    return (
      <input
        aria-label={label}
        autoFocus
        className={`studio-editable-input ${className}`}
        placeholder={placeholder}
        value={draft}
        onBlur={commit}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            commit();
          }

          if (event.key === "Escape") {
            setDraft(value);
            setEditing(false);
          }
        }}
      />
    );
  }

  return (
    <button className={`studio-editable-text ${className}`} type="button" onClick={() => setEditing(true)}>
      {value || placeholder || label}
    </button>
  );
}

function BufferedBodyEditor({ label, onCommit, value }: { label: string; onCommit: (value: string) => void; value: string }) {
  const [draft, setDraft] = useState(value);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  return (
    <label className="studio-textarea-field">
      {label}
      <textarea
        value={draft}
        onBlur={() => onCommit(draft)}
        onChange={(event) => setDraft(event.target.value)}
      />
    </label>
  );
}

function DropZone({
  onDrop,
  onPick,
  uploading
}: {
  onDrop: (files: FileList) => void;
  onPick: () => void;
  uploading: boolean;
}) {
  return (
    <div
      className="studio-dropzone"
      onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => {
        event.preventDefault();
        onDrop(event.dataTransfer.files);
      }}
    >
      <strong>{uploading ? "Importing..." : "Drop media here"}</strong>
      <span>Images and videos are copied into public/media/records and inserted into the current body draft.</span>
      <button type="button" onClick={onPick}>Choose Files</button>
    </div>
  );
}

function MediaPathList({
  onRemove,
  paths
}: {
  onRemove: (path: string) => void;
  paths: string[];
}) {
  if (paths.length === 0) {
    return (
      <div className="studio-sample-preview">
        <span>NO MEDIA ASSIGNED</span>
      </div>
    );
  }

  return (
    <div className="studio-media-list">
      {paths.map((path) => (
        <article key={path}>
          <div className="studio-media-preview-frame">
            {isVideoPath(path) ? (
              <video src={path} muted playsInline preload="metadata" />
            ) : (
              <img src={path} alt="" decoding="async" loading="lazy" />
            )}
          </div>
          <span>{path.split("/").at(-1)}</span>
          <button type="button" onClick={() => onRemove(path)}>Remove</button>
        </article>
      ))}
    </div>
  );
}

function mediaListFromText(value: string): string[] {
  return value
    .split(/\r?\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function mediaListToText(value: string[]): string {
  return [...new Set(value)].join("\n");
}

function isVideoPath(value: string): boolean {
  return /\.(mp4|webm)$/i.test(value);
}

function emptyForm(section: StudioSection = "logs"): StudioForm {
  const today = new Date().toISOString().slice(0, 10);
  const noteTitle = new Date().toLocaleDateString("en-GB").replaceAll("/", " / ") + " - New Note";

  return {
    originalId: "",
    id: "",
    title: "Untitled Record",
    section,
    type: defaultType(section),
    status: "Draft",
    started: today,
    updated: today,
    summary: "No summary recorded.",
    banner: "",
    headerImage: "",
    samples: "",
    attachments: "",
    progress: 0,
    priority: 50,
    tags: section,
    milestones: "",
    hardware: "",
    technicalStack: "",
    recommendation: "",
    dashboardActive: false,
    steamAppId: "",
    playtime: "",
    lastPlayed: "",
    achievementCount: "",
    body: `:::note ${noteTitle}\nWrite the first note here.\n:::`
  };
}

function fromRecord(record?: RecordEntry): StudioForm {
  if (!record || record.section === "system") {
    return emptyForm();
  }

  return {
    originalId: record.id,
    id: record.id,
    title: record.title,
    section: record.section,
    type: record.type,
    status: record.status,
    started: record.started ?? "",
    updated: record.updated,
    summary: record.summary,
    banner: record.banner ?? "",
    headerImage: typeof record.meta.headerImage === "string" ? record.meta.headerImage : "",
    samples: metaMediaList(record.meta.samples),
    attachments: metaMediaList(record.meta.attachments),
    progress: record.progress,
    priority: record.priority,
    tags: record.tags.join(", "),
    milestones: typeof record.meta.milestones === "string" ? record.meta.milestones : "",
    hardware: metaTextBlock(record.meta.hardware) || (record.section === "setup" ? setupHardwareFallback(record.body) : ""),
    technicalStack: metaTextBlock(record.meta.technicalStack),
    recommendation: metaTextBlock(record.meta.recommendation),
    dashboardActive: record.meta.dashboardActive === true,
    steamAppId: typeof record.meta.steamAppId === "number" || typeof record.meta.steamAppId === "string" ? String(record.meta.steamAppId) : "",
    playtime: typeof record.meta.playtime === "string" ? record.meta.playtime : "",
    lastPlayed: typeof record.meta.lastPlayed === "string" ? record.meta.lastPlayed : "",
    achievementCount: typeof record.meta.achievementCount === "string" ? record.meta.achievementCount : "",
    body: record.body
  };
}

function groupRecords(records: RecordEntry[]): Record<StudioSection, RecordEntry[]> {
  return sections.reduce<Record<StudioSection, RecordEntry[]>>((acc, section) => {
    acc[section] = records.filter((record) => record.section === section);
    return acc;
  }, {
    projects: [],
    games: [],
    logs: [],
    setup: [],
    archive: []
  });
}

function readStudioDrafts(): StudioDraftMap {
  if (typeof window === "undefined") {
    return {};
  }

  try {
    const raw = window.localStorage.getItem(studioDraftStorageKey);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === "object" ? parsed as StudioDraftMap : {};
  } catch {
    return {};
  }
}

function writeStudioDrafts(drafts: StudioDraftMap) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    const keys = Object.keys(drafts);

    if (!keys.length) {
      window.localStorage.removeItem(studioDraftStorageKey);
      return;
    }

    window.localStorage.setItem(studioDraftStorageKey, JSON.stringify(drafts));
  } catch {
    // Local drafts are a convenience cache; failing to persist them should not block editing.
  }
}

function studioRecordDraftKey(id: string) {
  return `record:${id}`;
}

function studioNewDraftKey(section: StudioSection) {
  return `new:${section}`;
}

function studioDraftKey(form: StudioForm, selectedId: string, fallbackSection: StudioSection) {
  if (form.originalId) {
    return studioRecordDraftKey(form.originalId);
  }

  if (selectedId && selectedId !== "__new") {
    return studioRecordDraftKey(selectedId);
  }

  return studioNewDraftKey(form.section || fallbackSection);
}

function formatStudioDate(value: string): string {
  const [year, month, day] = value.split("-");
  return year && month && day ? `${day} / ${month} / ${year}` : value;
}

function parseTags(value: string): string[] {
  return value
    .split(",")
    .map((tag) => tag.trim().toLowerCase())
    .filter((tag, index, tags) => tag && tags.indexOf(tag) === index);
}

function formatTags(tags: string[]): string {
  return tags.join(", ");
}

function recordCardTags(record: RecordEntry): string[] {
  const titleSlug = tagSlug(record.title);
  const typeSlug = tagSlug(record.type);

  return record.tags
    .map((tag) => tag.trim())
    .filter((tag, index, tags) => tag && tags.indexOf(tag) === index)
    .filter((tag) => {
      const slug = tagSlug(tag);

      return (
        Boolean(slug) &&
        !sectionBaseTags.has(slug) &&
        slug !== record.id &&
        slug !== titleSlug &&
        slug !== typeSlug &&
        !titleSlug.split("-").includes(slug)
      );
    })
    .slice(0, 3);
}

function tagToneClass(tag: string) {
  const tones = ["tone-a", "tone-b", "tone-c", "tone-d"];
  const seed = [...tag].reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return tones[seed % tones.length];
}

function tagSlug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

function defaultType(section: StudioSection): string {
  return {
    projects: "Project Log",
    games: "Play Log",
    logs: "Field Note",
    setup: "Setup Note",
    archive: "Archive Record"
  }[section];
}

type MilestoneDraft = {
  label: string;
  progress: number;
  status: string;
};

type StudioNote = {
  title: string;
  body: string;
};

function parseStudioNotes(value: string): StudioNote[] {
  const { mainBody } = splitStudioUpdateIndex(value);
  const lines = mainBody.split(/\r?\n/);
  const notes: StudioNote[] = [];

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const notePrefix = line.startsWith(":::previous-note ") ? ":::previous-note " : ":::note ";

    if (!line.startsWith(":::note ") && !line.startsWith(":::previous-note ")) {
      continue;
    }

    const title = line.slice(notePrefix.length).trim() || "Untitled note";
    const innerLines: string[] = [];

    index += 1;

    while (index < lines.length && lines[index].trim() !== ":::") {
      innerLines.push(lines[index]);
      index += 1;
    }

    notes.push({ title, body: innerLines.join("\n").trim() });
  }

  if (!notes.length && mainBody.trim()) {
    notes.push({ title: "Current note", body: mainBody.trim() });
  }

  return notes;
}

function setupHardwareFallback(body: string): string {
  const notes = parseStudioNotes(body);

  if (!notes.length) {
    return body;
  }

  return notes.map((note) => note.body).filter(Boolean).join("\n\n") || body;
}

function serializeStudioNotes(notes: StudioNote[], updateIndex = ""): string {
  const serializedNotes = notes
    .filter((note) => note.title.trim() || note.body.trim())
    .map((note) => `:::note ${note.title.trim() || "Untitled note"}\n${note.body.trim()}\n:::`)
    .join("\n\n");
  const preservedIndex = updateIndex.trim();

  return [serializedNotes, preservedIndex].filter(Boolean).join("\n\n");
}

function splitStudioUpdateIndex(value: string): { mainBody: string; updateIndex: string } {
  const lines = value.split(/\r?\n/);
  const startIndex = lines.findIndex((line) => line.trim() === "## Update Index");

  if (startIndex === -1) {
    return { mainBody: value, updateIndex: "" };
  }

  return {
    mainBody: lines.slice(0, startIndex).join("\n").trim(),
    updateIndex: lines.slice(startIndex).join("\n").trim()
  };
}

function emptyMilestoneDraft(): MilestoneDraft {
  return { label: "", progress: 0, status: "Pending" };
}

function parseMilestoneDraft(value: string): MilestoneDraft[] {
  return value
    .split(";")
    .map((entry) => {
      const [label = "", progress = "0", status = "Pending"] = entry.split("|").map((part) => part.trim());
      return {
        label,
        progress: Math.max(0, Math.min(100, Number(progress) || 0)),
        status
      };
    })
    .filter((entry) => entry.label || entry.status || entry.progress > 0);
}

function serializeMilestones(rows: MilestoneDraft[]): string {
  return rows
    .map((row) => ({
      label: row.label.trim(),
      progress: Math.max(0, Math.min(100, Number(row.progress) || 0)),
      status: row.status.trim() || "Pending"
    }))
    .filter((row) => row.label)
    .map((row) => `${row.label}|${row.progress}|${row.status}`)
    .join("; ");
}

function metaTextBlock(value: unknown): string {
  if (Array.isArray(value)) {
    return value.map((item) => String(item)).join("\n");
  }

  if (typeof value === "string") {
    return value.replace(/\\+n/g, "\n");
  }

  return "";
}

function metaMediaList(value: unknown): string {
  if (Array.isArray(value)) {
    return value.map((item) => String(item)).filter(Boolean).join("\n");
  }

  return typeof value === "string" ? value.replace(/\\+n/g, "\n") : "";
}

function getStudioContents(section: StudioSection): Array<{ key: StudioContentKey; label: string }> {
  if (section === "projects") {
    return [
      { key: "technical", label: "Technical Stack" },
      { key: "overview", label: "Overview" },
      { key: "notes", label: "Notes" },
      { key: "samples", label: "Samples" }
    ];
  }

  if (section === "games") {
    return [
      { key: "overview", label: "Overview" },
      { key: "notes", label: "Notes" },
      { key: "recommendation", label: "Recommendation" }
    ];
  }

  if (section === "setup") {
    return [
      { key: "overview", label: "Overview" },
      { key: "hardware", label: "Hardware" },
      { key: "notes", label: "Notes" },
    ];
  }

  return [
    { key: "overview", label: "Overview" },
    { key: "notes", label: "Notes" },
    { key: "attachments", label: "Attachments" }
  ];
}

function toRecordPreview(form: StudioForm, body: string): RecordEntry {
  return {
    id: form.id || "draft",
    title: form.title,
    section: form.section,
    type: form.type,
    status: form.status,
    started: form.started,
    updated: form.updated,
    summary: form.summary,
    banner: form.banner,
    progress: form.progress,
    priority: form.priority,
    tags: parseTags(form.tags),
    meta: {
      headerImage: form.headerImage,
      samples: mediaListFromText(form.samples),
      attachments: mediaListFromText(form.attachments),
      dashboardActive: form.dashboardActive,
      hardware: form.hardware,
      technicalStack: form.technicalStack,
      recommendation: form.recommendation,
      steamAppId: form.steamAppId,
      playtime: form.playtime,
      lastPlayed: form.lastPlayed,
      achievementCount: form.achievementCount,
      milestones: form.milestones
    },
    milestones: [],
    body
  };
}
