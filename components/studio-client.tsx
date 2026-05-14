"use client";

import { useMemo, useRef, useState } from "react";
import type { RecordEntry, RecordSection } from "@/lib/types";

type StudioForm = {
  id: string;
  title: string;
  section: Exclude<RecordSection, "system">;
  type: string;
  status: string;
  started: string;
  updated: string;
  mood: string;
  summary: string;
  banner: string;
  progress: number;
  priority: number;
  tags: string;
  milestones: string;
  playtime: string;
  body: string;
};

type StudioClientProps = {
  records: RecordEntry[];
};

const sections: StudioForm["section"][] = ["projects", "games", "logs", "setup", "archive"];

export function StudioClient({ records }: StudioClientProps) {
  const [selectedId, setSelectedId] = useState(records[0]?.id ?? "");
  const [form, setForm] = useState<StudioForm>(() => fromRecord(records[0]));
  const [message, setMessage] = useState("Studio is local-only. Save writes directly to content/records.");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const sortedRecords = useMemo(() => [...records].sort((a, b) => a.section.localeCompare(b.section) || a.title.localeCompare(b.title)), [records]);

  const update = <Key extends keyof StudioForm>(key: Key, value: StudioForm[Key]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const loadRecord = (id: string) => {
    setSelectedId(id);

    if (id === "__new") {
      setForm(emptyForm());
      setMessage("New entry draft ready.");
      return;
    }

    const record = records.find((entry) => entry.id === id);

    if (record) {
      setForm(fromRecord(record));
      setMessage(`Loaded ${record.title}.`);
    }
  };

  const save = async () => {
    setSaving(true);
    setMessage("Writing entry...");

    try {
      const response = await fetch("/api/studio/entry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          tags: form.tags.split(",").map((tag) => tag.trim()).filter(Boolean)
        })
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Save failed.");
      }

      setSelectedId(data.id);
      update("id", data.id);
      setMessage(`Saved ${data.path}. Run content validation before committing.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  };

  const uploadFiles = async (files: FileList | File[]) => {
    const list = Array.from(files);

    if (list.length === 0) {
      return;
    }

    setUploading(true);
    setMessage(`Uploading ${list.length} file${list.length === 1 ? "" : "s"}...`);

    try {
      const snippets: string[] = [];
      let firstImage = "";

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

        snippets.push(data.markdown);

        if (!firstImage && file.type.startsWith("image/")) {
          firstImage = data.path;
        }
      }

      setForm((current) => ({
        ...current,
        banner: current.banner || firstImage,
        body: `${current.body.trim()}\n\n${snippets.join("\n")}\n`
      }));
      setMessage("Media uploaded and inserted into the body.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <main className="archive-shell studio-shell">
      <div className="grain-layer" />
      <div className="scanline-layer" />
      <section className="studio-workspace" aria-label="Gestalt local studio">
        <header className="studio-header">
          <div>
            <p className="route-label">// LOCAL STUDIO</p>
            <h1>Entry Editor<span className="cursor">_</span></h1>
            <p className="subtle">Local-only writing surface for records and media.</p>
          </div>
          <a className="studio-return" href="/">Return to Archive</a>
        </header>

        <div className="studio-grid">
          <aside className="studio-panel">
            <h2>RECORDS</h2>
            <label>
              Select Entry
              <select value={selectedId} onChange={(event) => loadRecord(event.target.value)}>
                <option value="__new">+ New entry</option>
                {sortedRecords.map((record) => (
                  <option key={record.id} value={record.id}>
                    {record.section.toUpperCase()} / {record.title}
                  </option>
                ))}
              </select>
            </label>
            <p className="studio-message">{message}</p>
            <button className="studio-save" type="button" disabled={saving} onClick={save}>
              {saving ? "Saving..." : "Save Entry"}
            </button>
          </aside>

          <section className="studio-panel studio-editor">
            <h2>ENTRY DATA</h2>
            <div className="studio-fields">
              <label>
                ID / Filename
                <input value={form.id} onChange={(event) => update("id", event.target.value)} placeholder="auto-from-title" />
              </label>
              <label>
                Title
                <input value={form.title} onChange={(event) => update("title", event.target.value)} />
              </label>
              <label>
                Section
                <select value={form.section} onChange={(event) => update("section", event.target.value as StudioForm["section"])}>
                  {sections.map((section) => (
                    <option key={section} value={section}>
                      {section}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Type
                <input value={form.type} onChange={(event) => update("type", event.target.value)} />
              </label>
              <label>
                Status
                <input value={form.status} onChange={(event) => update("status", event.target.value)} />
              </label>
              <label>
                Mood
                <input value={form.mood} onChange={(event) => update("mood", event.target.value)} />
              </label>
              <label>
                Started
                <input value={form.started} onChange={(event) => update("started", event.target.value)} placeholder="YYYY-MM-DD" />
              </label>
              <label>
                Updated
                <input value={form.updated} onChange={(event) => update("updated", event.target.value)} placeholder="YYYY-MM-DD" />
              </label>
              <label>
                Progress
                <input type="number" min="0" max="100" value={form.progress} onChange={(event) => update("progress", Number(event.target.value))} />
              </label>
              <label>
                Priority
                <input type="number" value={form.priority} onChange={(event) => update("priority", Number(event.target.value))} />
              </label>
              <label>
                Tags
                <input value={form.tags} onChange={(event) => update("tags", event.target.value)} placeholder="games, notes" />
              </label>
              <label>
                Playtime
                <input value={form.playtime} onChange={(event) => update("playtime", event.target.value)} placeholder="Games only, optional" />
              </label>
              <label className="span-2">
                Summary
                <input value={form.summary} onChange={(event) => update("summary", event.target.value)} />
              </label>
              <label className="span-2">
                Banner / Primary Media
                <input value={form.banner} onChange={(event) => update("banner", event.target.value)} placeholder="/media/records/..." />
              </label>
              <label className="span-2">
                Milestones
                <input value={form.milestones} onChange={(event) => update("milestones", event.target.value)} placeholder="Label|50|Status; Other|10|Pending" />
              </label>
            </div>

            <div
              className="studio-dropzone"
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault();
                uploadFiles(event.dataTransfer.files);
              }}
            >
              <input ref={fileInputRef} type="file" multiple accept="image/png,image/jpeg,image/webp,image/gif,video/mp4,video/webm" onChange={(event) => event.target.files && uploadFiles(event.target.files)} />
              <strong>{uploading ? "Uploading..." : "Drop screenshots, samples, gifs, or video here"}</strong>
              <span>Files are copied into public/media/records and inserted into the note body.</span>
              <button type="button" onClick={() => fileInputRef.current?.click()}>Choose Files</button>
            </div>

            <label className="studio-body">
              Body
              <textarea value={form.body} onChange={(event) => update("body", event.target.value)} />
            </label>
          </section>
        </div>
      </section>
    </main>
  );
}

function emptyForm(): StudioForm {
  const today = new Date().toISOString().slice(0, 10);

  return {
    id: "",
    title: "",
    section: "logs",
    type: "Field Note",
    status: "Draft",
    started: today,
    updated: today,
    mood: "unfiled",
    summary: "",
    banner: "",
    progress: 0,
    priority: 50,
    tags: "logs",
    milestones: "",
    playtime: "",
    body: "## Notes\n- [ ] Write the first note.\n"
  };
}

function fromRecord(record?: RecordEntry): StudioForm {
  if (!record || record.section === "system") {
    return emptyForm();
  }

  return {
    id: record.id,
    title: record.title,
    section: record.section,
    type: record.type,
    status: record.status,
    started: record.started ?? "",
    updated: record.updated,
    mood: record.mood ?? "",
    summary: record.summary,
    banner: record.banner ?? "",
    progress: record.progress,
    priority: record.priority,
    tags: record.tags.join(", "),
    milestones: typeof record.meta.milestones === "string" ? record.meta.milestones : "",
    playtime: typeof record.meta.playtime === "string" ? record.meta.playtime : "",
    body: record.body
  };
}
