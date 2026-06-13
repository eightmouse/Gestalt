"use client";

import { memo, useCallback, useEffect, useMemo, useRef, useState, type DragEvent } from "react";
import type { RecordEntry, RecordSection } from "@/lib/types";

type StudioSection = Exclude<RecordSection, "system">;
type StudioContentKey = "overview" | "technical" | "notes" | "samples" | "recommendation" | "hardware" | "attachments";
type SetupGroupId = "systems" | "tools" | "peripherals" | "notes";

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
  iconImage: string;
  externalUrl: string;
  setupGroup: string;
  samples: string;
  attachments: string;
  progress: number;
  priority: number;
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

type MediaTarget = "body" | "banner" | "headerImage" | "iconImage" | "samples" | "attachments";
type ImportedMedia = {
  displayPath?: string;
  fullPath?: string;
  markdown: string;
  path: string;
};
type MediaImportOptions = {
  noteDisplayThumbnails?: boolean;
};
type StudioUpdate = <Key extends keyof StudioForm>(key: Key, value: StudioForm[Key]) => void;
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
const studioDraftStorageKey = "gestalt-studio-drafts-v1";
const noteDisplayMaxWidth = 1600;
const noteDisplayMinBytes = 900 * 1024;
const setupManagerGroups: Array<{
  id: SetupGroupId;
  action: string;
  code: string;
  description: string;
  label: string;
}> = [
  {
    id: "systems",
    action: "+ System",
    code: "SYS",
    description: "Operating systems, machines, and terminal-style profiles.",
    label: "Systems"
  },
  {
    id: "tools",
    action: "+ Tool",
    code: "APP",
    description: "Shortcut icons with an optional public link.",
    label: "Tools"
  },
  {
    id: "peripherals",
    action: "+ Peripheral",
    code: "DEV",
    description: "Device photos with an optional public description.",
    label: "Peripherals"
  },
  {
    id: "notes",
    action: "+ Note",
    code: "TXT",
    description: "Setup notes that behave like the rest of the archive notes.",
    label: "Notes"
  }
];
const setupGroupIds = setupManagerGroups.map((group) => group.id);

export function StudioClient({ records }: StudioClientProps) {
  const firstRecord = records[0];
  const [studioRecords, setStudioRecords] = useState<RecordEntry[]>(records);
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

  const sortedRecords = useMemo(() => [...studioRecords].sort((a, b) => a.section.localeCompare(b.section) || a.title.localeCompare(b.title)), [studioRecords]);
  const groupedRecords = useMemo(() => groupRecords(sortedRecords), [sortedRecords]);
  const sectionRecords = groupedRecords[activeSection].slice().sort((a, b) => b.updated.localeCompare(a.updated) || a.priority - b.priority);
  const contents = useMemo(() => getStudioContents(form.section, form.setupGroup), [form.section, form.setupGroup]);
  const activeRecord = useMemo(() => toRecordPreview(form, bodyDraftRef.current), [form]);
  const activeSectionConfig = studioSections.find((section) => section.id === activeSection) ?? studioSections[0];

  useEffect(() => {
    setStudioRecords(records);
  }, [records]);

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
    let next = { ...formRef.current, [key]: value };
    let nextBody = key === "body" && typeof value === "string" ? value : bodyDraftRef.current;

    if (key === "body" && typeof value === "string") {
      bodyDraftRef.current = value;
    }

    if (
      key === "setupGroup" &&
      typeof value === "string" &&
      formRef.current.section === "setup" &&
      isGeneratedSetupBody(bodyDraftRef.current)
    ) {
      nextBody = defaultStudioBody("setup", value);
      next = { ...next, body: nextBody };
      bodyDraftRef.current = nextBody;
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

    const record = studioRecords.find((entry) => entry.id === id);

    if (record) {
      const draft = draftsRef.current[studioRecordDraftKey(id)];
      const next = draft?.form ?? fromRecord(record);
      setActiveSection(next.section);
      bodyDraftRef.current = draft?.body ?? next.body;
      formRef.current = next;
      setForm(next);
      setMessage(draft ? `Loaded unsaved draft for ${next.title}.` : `Loaded ${record.title}.`);
    }
  }, [activeSection, studioRecords]);

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

  const newSetupRecord = useCallback((setupGroup: SetupGroupId) => {
    setActiveSection("setup");
    setSelectedId("__new");
    setActiveContent("overview");
    setMode("edit");
    const next = emptyForm("setup", setupGroup);
    bodyDraftRef.current = next.body;
    formRef.current = next;
    setForm(next);
    setMessage(`New ${setupGroupLabel(setupGroup).toLowerCase()} setup record ready.`);
  }, []);

  const writeRecord = async (recordForm: StudioForm, recordBody: string) => {
    const response = await fetch("/api/studio/entry", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...recordForm,
        body: recordBody,
        dashboardActive: recordForm.section === "games" && recordForm.dashboardActive
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
      const originalRecordId = formRef.current.originalId || selectedIdRef.current;
      const data = await writeRecord(form, bodyDraftRef.current);
      const savedId = data.id;
      const previousDraftKey = studioDraftKey(formRef.current, selectedIdRef.current, activeSectionRef.current);
      const savedForm = { ...formRef.current, body: bodyDraftRef.current, id: savedId, originalId: savedId };

      if (pendingDrafts.length > 0) {
        setMessage(`Saved current record. Applying ${pendingDrafts.length} pending draft${pendingDrafts.length === 1 ? "" : "s"} locally...`);

        for (const { draft } of pendingDrafts) {
          await writeRecord(draft.form, draft.body);
        }
      }

      formRef.current = savedForm;
      selectedIdRef.current = savedId;
      setSelectedId(savedId);
      setForm(savedForm);
      setStudioRecords((current) => {
        let next = upsertStudioRecord(current, toRecordPreview(savedForm, bodyDraftRef.current), originalRecordId);

        for (const { draft } of pendingDrafts) {
          next = upsertStudioRecord(next, toRecordPreview(draft.form, draft.body), draft.form.originalId || draft.form.id);
        }

        return next;
      });
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
      setMessage(`Saved ${data.path}. Publish when you are ready.`);
      setPublishState({
        phase: "success",
        title: "Record saved locally",
        detail: "MDX and static archive data were refreshed. Publish Changes when you want GitHub Pages to update."
      });
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
      setStudioRecords((current) => current.filter((record) => record.id !== form.originalId));
      setDrafts((current) => {
        const updated = { ...current };
        delete updated[studioRecordDraftKey(form.originalId)];
        return updated;
      });
      setMessage(`Deleted ${data.id}. Publish when you are ready.`);
      setPublishState({
        phase: "success",
        title: "Record deleted locally",
        detail: "The record file and static archive data were refreshed. Publish Changes when you want GitHub Pages to update."
      });
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

  const publishChanges = async () => {
    setSaving(true);
    setNotificationOpen(false);

    try {
      await publishArchive("Published to GitHub.");
    } catch (error) {
      const detail = error instanceof Error ? error.message : "Publish failed.";
      setMessage(detail);
      setPublishState({
        phase: "error",
        title: "Publish failed",
        detail
      });
      setNotificationOpen(true);
    } finally {
      setSaving(false);
    }
  };

  const chooseFiles = (target: MediaTarget) => {
    fileTargetRef.current = target;
    fileInputRef.current?.click();
  };

  const uploadMediaFile = async (file: File) => {
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

    return {
      markdown: typeof data.markdown === "string" ? data.markdown : noteMediaMarkdown(String(data.path ?? "")),
      path: String(data.path ?? "")
    };
  };

  const importMediaFiles = async (files: FileList | File[], options: MediaImportOptions = {}) => {
    const list = Array.from(files);

    if (list.length === 0) {
      return [];
    }

    const imported: ImportedMedia[] = [];

    for (const file of list) {
      const original = await uploadMediaFile(file);

      if (options.noteDisplayThumbnails) {
        const displayFile = await createDisplayThumbnail(file);

        if (displayFile) {
          const display = await uploadMediaFile(displayFile);
          imported.push({
            displayPath: display.path,
            fullPath: original.path,
            markdown: noteMediaMarkdown(display.path, original.path),
            path: display.path
          });
          continue;
        }
      }

      imported.push(original);
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
      const imported = await importMediaFiles(list, { noteDisplayThumbnails: target === "body" });
      const snippets = imported.map((item) => item.markdown);
      const firstPath = imported[0]?.path ?? "";

      if (target === "banner") {
        update("banner", firstPath);
      } else if (target === "headerImage") {
        update("headerImage", firstPath);
      } else if (target === "iconImage") {
        update("iconImage", firstPath);
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
      const imported = await importMediaFiles(list, { noteDisplayThumbnails: true });
      setMessage("Media inserted into the note.");
      return imported.map((item) => item.markdown);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Upload failed.");
      return [];
    } finally {
      setUploading(false);
    }
  };

  const optimizeNoteMedia = async (markdown: string): Promise<string> => {
    setUploading(true);
    setMessage("Generating display thumbnails...");

    try {
      const nextMarkdown = await optimizeExistingNoteImages(markdown, uploadMediaFile);
      setMessage(nextMarkdown === markdown ? "No large note images needed thumbnails." : "Display thumbnails generated.");
      return nextMarkdown;
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Thumbnail generation failed.");
      return markdown;
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
            <button type="button" disabled={saving} onClick={save}>{saving ? "Working..." : "Save Record"}</button>
            <button type="button" disabled={saving} onClick={publishChanges}>Publish Changes</button>
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
            activeSection === "setup" ? (
              <StudioSetupManager records={sectionRecords} onEdit={loadRecord} onNewGroup={newSetupRecord} />
            ) : (
              <StudioSectionPage
                records={sectionRecords}
                section={activeSectionConfig}
                onEdit={loadRecord}
                onNew={() => newRecord(activeSection)}
              />
            )
          ) : form.section === "setup" ? (
            <StudioSetupEditor
              canDelete={mode === "edit" && selectedId !== "__new"}
              form={form}
              message={message}
              saving={saving}
              uploading={uploading}
              onBodyCommit={(value) => {
                bodyDraftRef.current = value;
                update("body", value);
              }}
              onDelete={deleteRecord}
              onFileDrop={uploadFiles}
              onFilePick={chooseFiles}
              onNoteMediaUpload={uploadNoteMedia}
              onOptimizeNoteMedia={optimizeNoteMedia}
              onUpdate={update}
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
                  onOptimizeNoteMedia={optimizeNoteMedia}
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

function noteMediaMarkdown(displayPath: string, fullPath = ""): string {
  if (!displayPath) {
    return "";
  }

  return fullPath && fullPath !== displayPath ? `![full=${fullPath}](${displayPath})` : `![](${displayPath})`;
}

function canThumbnailFile(file: File): boolean {
  return file.type.startsWith("image/") && !/image\/gif/i.test(file.type) && !/\.(gif|svg)$/i.test(file.name);
}

async function createDisplayThumbnail(file: File): Promise<File | null> {
  if (!canThumbnailFile(file)) {
    return null;
  }

  const image = await loadCanvasImage(file);

  if (!image.width || image.width <= noteDisplayMaxWidth && file.size <= noteDisplayMinBytes) {
    return null;
  }

  const scale = Math.min(1, noteDisplayMaxWidth / image.width);
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(image.width * scale));
  canvas.height = Math.max(1, Math.round(image.height * scale));

  const context = canvas.getContext("2d", { alpha: true });

  if (!context) {
    return null;
  }

  context.drawImage(image, 0, 0, canvas.width, canvas.height);

  const webpBlob = await canvasToBlob(canvas, "image/webp", 0.82);
  const blob = webpBlob ?? await canvasToBlob(canvas, "image/jpeg", 0.84);

  if (!blob) {
    return null;
  }

  const extension = blob.type === "image/webp" ? "webp" : "jpg";
  const baseName = file.name.replace(/\.[^.]+$/, "");

  return new File([blob], `${baseName}-display.${extension}`, { type: blob.type, lastModified: Date.now() });
}

async function loadCanvasImage(file: File): Promise<HTMLImageElement> {
  const imageUrl = URL.createObjectURL(file);

  try {
    const image = new Image();
    image.decoding = "async";
    image.src = imageUrl;

    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error(`Could not read ${file.name}.`));
    });

    return image;
  } finally {
    URL.revokeObjectURL(imageUrl);
  }
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), type, quality);
  });
}

async function optimizeExistingNoteImages(
  markdown: string,
  uploadMediaFile: (file: File) => Promise<{ markdown: string; path: string }>
): Promise<string> {
  const matches = [...markdown.matchAll(/!\[(.*?)]\((.*?)\)/g)].filter((match) => {
    const alt = match[1];
    const src = match[2];

    return !/\|\s*full=/i.test(`|${alt}`) && !/\.(gif|svg|mp4|webm)$/i.test(src);
  });

  if (!matches.length) {
    return markdown;
  }

  let nextMarkdown = markdown;
  let offset = 0;

  for (const match of matches) {
    const source = match[2];

    try {
      const response = await fetch(mediaFetchUrl(source));

      if (!response.ok) {
        continue;
      }

      const blob = await response.blob();
      const filename = source.split("/").at(-1) || "note-image";
      const file = new File([blob], filename, { type: blob.type || "image/jpeg" });
      const displayFile = await createDisplayThumbnail(file);

      if (!displayFile) {
        continue;
      }

      const display = await uploadMediaFile(displayFile);
      const rawAlt = match[1];
      const parts = rawAlt.split("|").map((part) => part.trim()).filter(Boolean);
      const captionOffset = parts[0] && !isStudioMediaToken(parts[0]) ? 1 : 0;
      const nextParts = [
        ...parts.slice(0, captionOffset),
        `full=${source}`,
        ...parts.slice(captionOffset)
      ];
      const replacement = `![${nextParts.join(" | ")}](${display.path})`;
      const start = (match.index ?? 0) + offset;
      const end = start + match[0].length;

      nextMarkdown = `${nextMarkdown.slice(0, start)}${replacement}${nextMarkdown.slice(end)}`;
      offset += replacement.length - match[0].length;
    } catch {
      // Keep the original image syntax when a local media item cannot be read.
    }
  }

  return nextMarkdown;
}

function mediaFetchUrl(source: string): string {
  if (/^(?:https?:|data:|blob:|\/)/i.test(source)) {
    return source;
  }

  if (source.startsWith("public/")) {
    return `/${source.slice("public/".length)}`;
  }

  return source;
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

function StudioSetupManager({
  onEdit,
  onNewGroup,
  records
}: {
  onEdit: (id: string) => void;
  onNewGroup: (setupGroup: SetupGroupId) => void;
  records: RecordEntry[];
}) {
  const grouped = setupManagerGroups.map((group) => ({
    ...group,
    records: records.filter((record) => setupGroupForRecord(record) === group.id)
  }));
  const recordCount = records.length;

  return (
    <section className="section-page studio-section-copy studio-setup-manager" aria-label="05_SETUP studio manager">
      <header className="section-page-header studio-setup-manager-header">
        <span className="nav-mark" data-icon="setup" aria-hidden="true" />
        <div>
          <p>05_SETUP</p>
          <h2>Device Bay</h2>
          <small>Systems, shortcuts, device photos, and setup notes are managed in separate lanes.</small>
        </div>
        <i>{recordCount} {recordCount === 1 ? "record" : "records"}</i>
      </header>

      <div className="studio-setup-manager-grid">
        {grouped.map((group) => (
          <section className={`studio-setup-group-card is-${group.id}`} key={group.id}>
            <header>
              <div>
                <span>{group.code}</span>
                <h3>{group.label}</h3>
                <p>{group.description}</p>
              </div>
              <button type="button" onClick={() => onNewGroup(group.id)}>{group.action}</button>
            </header>
            <div className="studio-setup-item-grid">
              {group.records.length > 0 ? (
                group.records.map((record) => (
                  <StudioSetupManagerTile group={group.id} key={record.id} record={record} onEdit={onEdit} />
                ))
              ) : (
                <p className="studio-setup-empty">No {group.label.toLowerCase()} filed yet.</p>
              )}
            </div>
          </section>
        ))}
      </div>
    </section>
  );
}

function StudioSetupManagerTile({
  group,
  onEdit,
  record
}: {
  group: SetupGroupId;
  onEdit: (id: string) => void;
  record: RecordEntry;
}) {
  const media = setupRecordStudioMedia(record);
  const label = setupGroupLabel(group);

  return (
    <button className={`studio-setup-item is-${group}`} type="button" onClick={() => onEdit(record.id)}>
      <span className={media ? "studio-setup-item-media has-media" : "studio-setup-item-media"} aria-hidden="true">
        {media ? <img src={media} alt="" decoding="async" loading="lazy" /> : <i>{group === "tools" ? "APP" : group === "peripherals" ? "DEV" : group === "notes" ? "TXT" : "SYS"}</i>}
      </span>
      <span className="studio-setup-item-copy">
        <small>{label}</small>
        <strong>{record.title}</strong>
        <em>{record.summary || record.status}</em>
      </span>
    </button>
  );
}

function StudioSetupEditor({
  canDelete,
  form,
  message,
  onBodyCommit,
  onDelete,
  onFileDrop,
  onFilePick,
  onNoteMediaUpload,
  onOptimizeNoteMedia,
  onUpdate,
  saving,
  uploading
}: {
  canDelete: boolean;
  form: StudioForm;
  message: string;
  onBodyCommit: (value: string) => void;
  onDelete: () => void;
  onFileDrop: (files: FileList | File[], target?: MediaTarget) => void;
  onFilePick: (target: MediaTarget) => void;
  onNoteMediaUpload: (files: FileList | File[]) => Promise<string[]>;
  onOptimizeNoteMedia: (markdown: string) => Promise<string>;
  onUpdate: StudioUpdate;
  saving: boolean;
  uploading: boolean;
}) {
  const setupGroup = normalizeSetupGroup(form.setupGroup);

  const changeSetupGroup = (nextGroup: SetupGroupId) => {
    onUpdate("setupGroup", nextGroup);

    if (isDefaultSetupType(form.type)) {
      onUpdate("type", defaultSetupType(nextGroup));
    }
  };

  return (
    <section className={`studio-record-copy studio-setup-editor is-${setupGroup}`} aria-label="Editable setup record">
      <div className="studio-copy-bar">
        <span>// SETUP BAY EDITOR</span>
        <i>{message}</i>
      </div>

      <div className="studio-setup-editor-layout">
        <div className="studio-setup-editor-main">
          <header className="studio-setup-editor-heading">
            <span className="nav-mark" data-icon="setup" aria-hidden="true" />
            <div>
              <p>{setupGroupLabel(setupGroup).toUpperCase()}</p>
              <h2>
                <EditableText className="studio-title-edit" label="Title" value={form.title} onChange={(value) => onUpdate("title", value)} />
              </h2>
              <small>{setupGroupHelp(setupGroup)}</small>
            </div>
          </header>

          <SetupGroupSwitch activeGroup={setupGroup} onChange={changeSetupGroup} />

          {setupGroup === "tools" ? (
            <StudioSetupToolEditor form={form} uploading={uploading} onFileDrop={onFileDrop} onFilePick={onFilePick} onUpdate={onUpdate} />
          ) : setupGroup === "peripherals" ? (
            <StudioSetupPeripheralEditor form={form} uploading={uploading} onFileDrop={onFileDrop} onFilePick={onFilePick} onUpdate={onUpdate} />
          ) : setupGroup === "notes" ? (
            <StudioSetupNoteEditor form={form} onBodyCommit={onBodyCommit} onNoteMediaUpload={onNoteMediaUpload} onOptimizeNoteMedia={onOptimizeNoteMedia} onUpdate={onUpdate} />
          ) : (
            <StudioSetupSystemEditor form={form} uploading={uploading} onBodyCommit={onBodyCommit} onFileDrop={onFileDrop} onFilePick={onFilePick} onNoteMediaUpload={onNoteMediaUpload} onOptimizeNoteMedia={onOptimizeNoteMedia} onUpdate={onUpdate} />
          )}
        </div>

        <aside className="studio-setup-editor-aside">
          <h3>RECORD</h3>
          <InlineField label="Slug" value={form.id} placeholder="auto-from-title" onChange={(value) => onUpdate("id", value)} />
          <InlineField label="Status" value={form.status} onChange={(value) => onUpdate("status", value)} />
          <InlineField label="Created" value={form.started} placeholder="YYYY-MM-DD" onChange={(value) => onUpdate("started", value)} />
          <InlineField label="Updated" value={form.updated} placeholder="YYYY-MM-DD" onChange={(value) => onUpdate("updated", value)} />
          <dl>
            <div><dt>Mode</dt><dd>{setupGroupLabel(setupGroup)}</dd></div>
            <div><dt>Type</dt><dd>{form.type}</dd></div>
          </dl>
          {canDelete ? (
            <div className="studio-inspector-danger">
              <span>Danger Zone</span>
              <button className="studio-danger-action" type="button" disabled={saving} onClick={onDelete}>Delete Record</button>
            </div>
          ) : null}
        </aside>
      </div>
    </section>
  );
}

function SetupGroupSwitch({
  activeGroup,
  onChange
}: {
  activeGroup: SetupGroupId;
  onChange: (setupGroup: SetupGroupId) => void;
}) {
  return (
    <div className="studio-setup-kind-switch" aria-label="Setup record group">
      {setupManagerGroups.map((group) => (
        <button
          className={activeGroup === group.id ? "is-active" : ""}
          key={group.id}
          type="button"
          onClick={() => onChange(group.id)}
        >
          <span>{group.code}</span>
          <strong>{group.label}</strong>
        </button>
      ))}
    </div>
  );
}

function StudioSetupToolEditor({
  form,
  onFileDrop,
  onFilePick,
  onUpdate,
  uploading
}: {
  form: StudioForm;
  onFileDrop: (files: FileList | File[], target?: MediaTarget) => void;
  onFilePick: (target: MediaTarget) => void;
  onUpdate: StudioUpdate;
  uploading: boolean;
}) {
  return (
    <section className="studio-setup-simple-editor">
      <div className="studio-setup-form-grid">
        <InlineField label="Public link" value={form.externalUrl} placeholder="https://example.com" onChange={(value) => onUpdate("externalUrl", value)} />
      </div>
      <SetupMediaInput
        description="Drop one app icon here. It appears as the shortcut image in the Tools bay."
        label="Shortcut icon"
        mediaPath={form.iconImage}
        target="iconImage"
        uploading={uploading}
        onClear={() => onUpdate("iconImage", "")}
        onFileDrop={onFileDrop}
        onFilePick={onFilePick}
      />
    </section>
  );
}

function StudioSetupPeripheralEditor({
  form,
  onFileDrop,
  onFilePick,
  onUpdate,
  uploading
}: {
  form: StudioForm;
  onFileDrop: (files: FileList | File[], target?: MediaTarget) => void;
  onFilePick: (target: MediaTarget) => void;
  onUpdate: StudioUpdate;
  uploading: boolean;
}) {
  return (
    <section className="studio-setup-simple-editor">
      <SetupMediaInput
        description="Drop one photo here. It becomes the expandable peripheral preview."
        label="Device photo"
        mediaPath={form.headerImage}
        target="headerImage"
        uploading={uploading}
        onClear={() => onUpdate("headerImage", "")}
        onFileDrop={onFileDrop}
        onFilePick={onFilePick}
      />
      <label className="studio-textarea-field">
        Description
        <textarea value={form.summary} onChange={(event) => onUpdate("summary", event.target.value)} />
      </label>
    </section>
  );
}

function StudioSetupNoteEditor({
  form,
  onBodyCommit,
  onNoteMediaUpload,
  onOptimizeNoteMedia,
  onUpdate
}: {
  form: StudioForm;
  onBodyCommit: (value: string) => void;
  onNoteMediaUpload: (files: FileList | File[]) => Promise<string[]>;
  onOptimizeNoteMedia: (markdown: string) => Promise<string>;
  onUpdate: StudioUpdate;
}) {
  return (
    <section className="studio-setup-simple-editor">
      <label className="studio-textarea-field">
        Summary
        <textarea value={form.summary} onChange={(event) => onUpdate("summary", event.target.value)} />
      </label>
      <NoteStackEditor value={form.body} onCommit={onBodyCommit} onMediaUpload={onNoteMediaUpload} onOptimizeMedia={onOptimizeNoteMedia} />
    </section>
  );
}

function StudioSetupSystemEditor({
  form,
  onBodyCommit,
  onFileDrop,
  onFilePick,
  onNoteMediaUpload,
  onOptimizeNoteMedia,
  onUpdate,
  uploading
}: {
  form: StudioForm;
  onBodyCommit: (value: string) => void;
  onFileDrop: (files: FileList | File[], target?: MediaTarget) => void;
  onFilePick: (target: MediaTarget) => void;
  onNoteMediaUpload: (files: FileList | File[]) => Promise<string[]>;
  onOptimizeNoteMedia: (markdown: string) => Promise<string>;
  onUpdate: StudioUpdate;
  uploading: boolean;
}) {
  return (
    <section className="studio-setup-simple-editor">
      <div className="studio-setup-form-grid">
        <InlineField label="Display type" value={form.type} onChange={(value) => onUpdate("type", value)} />
      </div>
      <SetupMediaInput
        description="Optional profile image. Keep it public-safe and avoid screenshots with local paths."
        label="Profile image"
        mediaPath={form.headerImage}
        target="headerImage"
        uploading={uploading}
        onClear={() => onUpdate("headerImage", "")}
        onFileDrop={onFileDrop}
        onFilePick={onFilePick}
      />
      <label className="studio-textarea-field">
        Summary
        <textarea value={form.summary} onChange={(event) => onUpdate("summary", event.target.value)} />
      </label>
      <BufferedBodyEditor label="Specs / Hardware" value={form.hardware} onCommit={(value) => onUpdate("hardware", value)} />
      <div className="studio-setup-note-stack">
        <div className="terminal-title">// SETUP NOTES</div>
        <NoteStackEditor value={form.body} onCommit={onBodyCommit} onMediaUpload={onNoteMediaUpload} onOptimizeMedia={onOptimizeNoteMedia} />
      </div>
    </section>
  );
}

function SetupMediaInput({
  description,
  label,
  mediaPath,
  onClear,
  onFileDrop,
  onFilePick,
  target,
  uploading
}: {
  description: string;
  label: string;
  mediaPath: string;
  onClear: () => void;
  onFileDrop: (files: FileList | File[], target?: MediaTarget) => void;
  onFilePick: (target: MediaTarget) => void;
  target: Extract<MediaTarget, "headerImage" | "iconImage">;
  uploading: boolean;
}) {
  return (
    <div className="studio-setup-media-field">
      <div className="studio-setup-media-head">
        <span>{label}</span>
        {mediaPath ? <button type="button" onClick={onClear}>Clear</button> : null}
      </div>
      <DropZone
        description={description}
        uploading={uploading}
        onDrop={(files) => onFileDrop(files, target)}
        onPick={() => onFilePick(target)}
      />
      {mediaPath ? <MediaPathList paths={[mediaPath]} onRemove={onClear} /> : null}
    </div>
  );
}

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
    <section className={splitSection ? `section-page section-page--split section-page--${section.id} studio-section-copy` : "section-page studio-section-copy"} aria-label={`${section.code} studio records`}>
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
  return (
    <button className="section-record" data-state={studioRecordStateKey(record.status)} type="button" onClick={() => onEdit(record.id)}>
      <span className="section-record-kind">{record.type}</span>
      <strong>{record.title}</strong>
      <span>{record.summary}</span>
      <i>{record.status} . {formatStudioDate(record.updated)}</i>
    </button>
  );
}

function studioRecordStateKey(status: string): string {
  return status.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "unknown";
}

const sessionGameStatuses = new Set(["active", "in progress", "on hold", "paused", "planning", "playing"]);

function isSessionGameStatus(status: string): boolean {
  return sessionGameStatuses.has(status.toLowerCase());
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
    return [
      { title: "SESSION LOGS", records: records.filter((record) => isSessionGameStatus(record.status)) },
      { title: "PAST LOGS", records: records.filter((record) => !isSessionGameStatus(record.status)) }
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
  onOptimizeNoteMedia,
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
  onOptimizeNoteMedia: (markdown: string) => Promise<string>;
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
        <DropZone
          description="Images and videos are copied into public/media/records and appended to this media list."
          uploading={uploading}
          onDrop={(files) => onFileDrop(files, target)}
          onPick={() => onFilePick(target)}
        />
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
    const detailLabel = setupDetailsLabel(form.setupGroup);

    return (
      <section className="studio-content-terminal">
        <div className="terminal-title">// {detailLabel.toUpperCase()}</div>
        <BufferedBodyEditor label={detailLabel} value={form.hardware} onCommit={(value) => onUpdate("hardware", value)} />
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
        <NoteStackEditor value={form.body} onCommit={onBodyCommit} onMediaUpload={onNoteMediaUpload} onOptimizeMedia={onOptimizeNoteMedia} />
      </section>
    );
  }

  if (form.section === "setup") {
    return (
      <SetupOverviewEditor
        form={form}
        uploading={uploading}
        onFileDrop={onFileDrop}
        onFilePick={onFilePick}
        onUpdate={onUpdate}
      />
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

function SetupOverviewEditor({
  form,
  onFileDrop,
  onFilePick,
  onUpdate,
  uploading
}: {
  form: StudioForm;
  onFileDrop: (files: FileList | File[], target?: MediaTarget) => void;
  onFilePick: (target: MediaTarget) => void;
  onUpdate: <Key extends keyof StudioForm>(key: Key, value: StudioForm[Key]) => void;
  uploading: boolean;
}) {
  const setupGroup = normalizeSetupGroup(form.setupGroup);
  const mediaTarget: Extract<MediaTarget, "headerImage" | "iconImage"> | null = setupGroup === "tools" ? "iconImage" : setupGroup === "peripherals" ? "headerImage" : null;
  const mediaPath = mediaTarget === "iconImage" ? form.iconImage : mediaTarget === "headerImage" ? form.headerImage : "";
  const mediaLabel = setupGroup === "tools" ? "Shortcut Icon" : setupGroup === "peripherals" ? "Peripheral Photo" : "";
  const mediaDescription = setupGroup === "tools"
    ? "Drop the app icon here. This is what appears in the Tools desktop grid."
    : "Drop the main device photo here. This becomes the expandable peripheral thumbnail.";

  return (
    <section className="studio-content-terminal studio-setup-overview">
      <div className="terminal-title">// SETUP OVERVIEW</div>
      <label className="studio-textarea-field">
        Summary
        <textarea value={form.summary} onChange={(event) => onUpdate("summary", event.target.value)} />
      </label>
      {mediaTarget ? (
        <div className="studio-setup-media-field">
          <div className="studio-setup-media-head">
            <span>{mediaLabel}</span>
            {mediaPath ? <button type="button" onClick={() => onUpdate(mediaTarget, "")}>Clear</button> : null}
          </div>
          <DropZone
            description={mediaDescription}
            uploading={uploading}
            onDrop={(files) => onFileDrop(files, mediaTarget)}
            onPick={() => onFilePick(mediaTarget)}
          />
          {mediaPath ? (
            <MediaPathList paths={[mediaPath]} onRemove={() => onUpdate(mediaTarget, "")} />
          ) : null}
        </div>
      ) : (
        <p className="studio-setup-note">Systems use Hardware for specs. Notes use the Notes page. No extra media is required here.</p>
      )}
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
  const gamePlacement = isSessionGameStatus(form.status) ? "session" : "past";

  return (
    <div className="studio-inspector">
      <h3>INSPECTOR</h3>
      <div className="studio-inspector-section">
        <span>Section</span>
        <strong>{form.section}</strong>
      </div>
      {form.section === "games" ? (
        <>
          <label className="studio-placement-field">
            Log placement
            <select
              value={gamePlacement}
              onChange={(event) => {
                if (event.target.value === "session") {
                  onUpdate("status", isSessionGameStatus(form.status) ? form.status : "Playing");
                  return;
                }

                onUpdate("status", "Completed");

                if (form.dashboardActive) {
                  onUpdate("dashboardActive", false);
                }
              }}
            >
              <option value="session">Session Logs</option>
              <option value="past">Past Logs</option>
            </select>
            <small>Session Logs are still alive. Past Logs are completed, filed, or archived.</small>
          </label>
          <label className="studio-check">
            <input type="checkbox" checked={form.dashboardActive} onChange={(event) => onUpdate("dashboardActive", event.target.checked)} />
            <span>Dashboard active game</span>
          </label>
          <InlineField label="Steam App ID" value={form.steamAppId} onChange={(value) => onUpdate("steamAppId", value)} />
        </>
      ) : null}
      {form.section === "setup" ? (
        <SetupInspectorControls form={form} onUpdate={onUpdate} />
      ) : null}
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

function SetupInspectorControls({
  form,
  onUpdate
}: {
  form: StudioForm;
  onUpdate: <Key extends keyof StudioForm>(key: Key, value: StudioForm[Key]) => void;
}) {
  const setupGroup = normalizeSetupGroup(form.setupGroup);

  return (
    <div className="studio-setup-controls">
      <label>
        Setup folder
        <select value={setupGroup} onChange={(event) => onUpdate("setupGroup", event.target.value)}>
          <option value="systems">Systems</option>
          <option value="tools">Tools</option>
          <option value="peripherals">Peripherals</option>
          <option value="notes">Notes</option>
        </select>
      </label>
      <p>{setupGroupHelp(setupGroup)}</p>
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

function NoteStackEditor({
  onCommit,
  onMediaUpload,
  onOptimizeMedia,
  value
}: {
  onCommit: (value: string) => void;
  onMediaUpload: (files: FileList | File[]) => Promise<string[]>;
  onOptimizeMedia?: (markdown: string) => Promise<string>;
  value: string;
}) {
  const initialParts = useMemo(() => splitStudioUpdateIndex(value), [value]);
  const [notes, setNotes] = useState<StudioNote[]>(() => parseStudioNotes(value));
  const [updateIndex, setUpdateIndex] = useState(initialParts.updateIndex);
  const [openIndex, setOpenIndex] = useState(0);
  const [optimizingIndex, setOptimizingIndex] = useState<number | null>(null);
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

  const optimizeMedia = async (index: number) => {
    if (!onOptimizeMedia) {
      return;
    }

    setOptimizingIndex(index);
    const nextBody = await onOptimizeMedia(notes[index].body);
    setOptimizingIndex(null);

    if (nextBody !== notes[index].body) {
      updateNote(index, "body", nextBody);
      setOpenIndex(index);
    }
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
                  {onOptimizeMedia ? (
                    <button type="button" disabled={optimizingIndex === index} onMouseDown={(event) => event.preventDefault()} onClick={() => optimizeMedia(index)}>
                      {optimizingIndex === index ? "working" : "display thumbs"}
                    </button>
                  ) : null}
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
  const normalized = value.toLowerCase();

  return normalized.startsWith("full=") || ["wide", "banner", "small", "left", "right", "center", "top", "bottom", "crop", "contain", "no-caption"].includes(normalized);
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
  description = "Images and videos are copied into public/media/records and inserted into the current body draft.",
  onDrop,
  onPick,
  uploading
}: {
  description?: string;
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
      <span>{description}</span>
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

function emptyForm(section: StudioSection = "logs", setupGroup: SetupGroupId | "" = ""): StudioForm {
  const today = new Date().toISOString().slice(0, 10);
  const normalizedSetupGroup = section === "setup" ? normalizeSetupGroup(setupGroup) : "";

  return {
    originalId: "",
    id: "",
    title: "Untitled Record",
    section,
    type: section === "setup" ? defaultSetupType(normalizedSetupGroup) : defaultType(section),
    status: "Draft",
    started: today,
    updated: today,
    summary: defaultSummary(section, normalizedSetupGroup),
    banner: "",
    headerImage: "",
    iconImage: "",
    externalUrl: "",
    setupGroup: normalizedSetupGroup,
    samples: "",
    attachments: "",
    progress: 0,
    priority: 50,
    milestones: "",
    hardware: "",
    technicalStack: "",
    recommendation: "",
    dashboardActive: false,
    steamAppId: "",
    playtime: "",
    lastPlayed: "",
    achievementCount: "",
    body: defaultStudioBody(section, normalizedSetupGroup)
  };
}

function defaultStudioBody(section: StudioSection, setupGroup = ""): string {
  if (section !== "setup") {
    const noteTitle = new Date().toLocaleDateString("en-GB").replaceAll("/", " / ") + " - New Note";

    return `:::note ${noteTitle}\nWrite the first note here.\n:::`;
  }

  const group = normalizeSetupGroup(setupGroup);

  if (group === "tools") {
    return "Shortcut registered.";
  }

  if (group === "peripherals") {
    return "Device capture registered.";
  }

  if (group === "notes") {
    const noteTitle = new Date().toLocaleDateString("en-GB").replaceAll("/", " / ") + " - New Note";

    return `:::note ${noteTitle}\nWrite the first setup note here.\n:::`;
  }

  return "System profile pending.";
}

function isGeneratedSetupBody(value: string): boolean {
  return (
    /^:::note\s+\d{1,2}\s*\/\s*\d{1,2}\s*\/\s*\d{4}\s+-\s+New Note\s*\r?\nWrite the first (setup )?note here\.\s*\r?\n:::\s*$/i.test(value.trim()) ||
    ["System profile pending.", "Shortcut registered.", "Device capture registered."].includes(value.trim())
  );
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
    iconImage: typeof record.meta.iconImage === "string" ? record.meta.iconImage : "",
    externalUrl: typeof record.meta.externalUrl === "string" ? record.meta.externalUrl : "",
    setupGroup: typeof record.meta.setupGroup === "string" ? normalizeSetupGroup(record.meta.setupGroup) : record.section === "setup" ? inferSetupGroup(record) : "",
    samples: metaMediaList(record.meta.samples),
    attachments: metaMediaList(record.meta.attachments),
    progress: record.progress,
    priority: record.priority,
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

function upsertStudioRecord(records: RecordEntry[], nextRecord: RecordEntry, previousId = ""): RecordEntry[] {
  const filtered = records.filter((record) => record.id !== nextRecord.id && (!previousId || record.id !== previousId));

  return [...filtered, nextRecord];
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

function defaultType(section: StudioSection): string {
  return {
    projects: "Project Log",
    games: "Play Log",
    logs: "Field Note",
    setup: "Setup Note",
    archive: "Archive Record"
  }[section];
}

function defaultSummary(section: StudioSection, setupGroup = ""): string {
  if (section !== "setup") {
    return "No summary recorded.";
  }

  return {
    systems: "System profile pending.",
    tools: "Shortcut registered.",
    peripherals: "Device capture registered.",
    notes: "Setup note pending."
  }[normalizeSetupGroup(setupGroup)];
}

function normalizeSetupGroup(value: string): SetupGroupId {
  return setupGroupIds.includes(value as SetupGroupId) ? value as SetupGroupId : "systems";
}

function inferSetupGroup(record: RecordEntry): SetupGroupId {
  const haystack = [record.title, record.type, record.summary, metaTextBlock(record.meta.hardware)].join(" ").toLowerCase();

  if (/\b(keyboard|mouse|monitor|display|headset|speaker|audio|mic|microphone|controller|tablet|dock|peripheral|device)\b/.test(haystack)) {
    return "peripherals";
  }

  if (/\b(tool|tools|software|app|apps|utility|utilities|editor|launcher|workflow|script|stack)\b/.test(haystack)) {
    return "tools";
  }

  if (/\b(note|notes|memo|file)\b/.test(haystack) && !/\b(windows|linux|arch|os|pc|laptop|desktop|machine|rig|system|hardware)\b/.test(haystack)) {
    return "notes";
  }

  return "systems";
}

function setupDetailsLabel(setupGroup: string): string {
  return {
    systems: "Hardware Notes",
    tools: "Shortcut Details",
    peripherals: "Device Details",
    notes: "Note Details"
  }[normalizeSetupGroup(setupGroup)] ?? "Details";
}

function setupGroupHelp(setupGroup: string): string {
  return {
    systems: "Opens as a neofetch-style terminal profile.",
    tools: "Appears as a desktop shortcut. Add a public link when you want clicks to leave Gestalt.",
    peripherals: "Appears as an inspection photo tile with expandable media and optional description.",
    notes: "Appears as a note/file icon and opens into note content."
  }[normalizeSetupGroup(setupGroup)] ?? "Choose how this Setup record should appear.";
}

function setupGroupLabel(setupGroup: string): string {
  return setupManagerGroups.find((group) => group.id === normalizeSetupGroup(setupGroup))?.label ?? "Systems";
}

function setupGroupForRecord(record: RecordEntry): SetupGroupId {
  return typeof record.meta.setupGroup === "string" ? normalizeSetupGroup(record.meta.setupGroup) : inferSetupGroup(record);
}

function setupRecordStudioMedia(record: RecordEntry): string {
  const iconImage = typeof record.meta.iconImage === "string" ? record.meta.iconImage : "";
  const headerImage = typeof record.meta.headerImage === "string" ? record.meta.headerImage : "";

  return iconImage || headerImage || record.banner || "";
}

function defaultSetupType(setupGroup: string): string {
  return {
    systems: "System Profile",
    tools: "Tool Shortcut",
    peripherals: "Peripheral",
    notes: "Setup Note"
  }[normalizeSetupGroup(setupGroup)];
}

function isDefaultSetupType(value: string): boolean {
  return ["Setup Note", "Setup", "System Profile", "Tool Shortcut", "Peripheral"].includes(value);
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

function getStudioContents(section: StudioSection, setupGroup = ""): Array<{ key: StudioContentKey; label: string }> {
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
    const group = normalizeSetupGroup(setupGroup);

    if (group === "tools" || group === "peripherals") {
      return [
        { key: "overview", label: "Overview" }
      ];
    }

    if (group === "notes") {
      return [
        { key: "overview", label: "Overview" },
        { key: "notes", label: "Notes" }
      ];
    }

    return [
      { key: "overview", label: "Overview" },
      { key: "hardware", label: setupDetailsLabel(setupGroup).replace(" Notes", "") },
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
    meta: {
      headerImage: form.headerImage,
      iconImage: form.iconImage,
      externalUrl: form.externalUrl,
      setupGroup: form.section === "setup" ? normalizeSetupGroup(form.setupGroup) : "",
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
