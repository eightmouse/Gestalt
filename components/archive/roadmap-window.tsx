"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { PublicRoadmap, RoadmapChapterId, RoadmapRelease } from "@/public/roadmap.mjs";

export function RoadmapNotebook({ data, history, chapterId, releaseIndex, onNavigate }: {
  data: PublicRoadmap;
  history: RoadmapRelease[];
  chapterId: RoadmapChapterId;
  releaseIndex: number | null;
  onNavigate: (chapter: RoadmapChapterId, release?: number | null) => void;
}) {
  const chapter = data.groups.find((group) => group.id === chapterId) || data.groups[0];
  if (!chapter) return <p className="roadmap-message" role="status">No work notes filed yet.</p>;
  const release = chapter.id === "done" && releaseIndex !== null ? history[releaseIndex] : null;
  const indexOpen = chapter.id === "done" && !release;
  const items = release?.items || chapter.items;
  const title = release?.version || chapter.title;
  const intro = release ? null : chapter.id === "working" ? data.intro : indexOpen
    ? "Completed work, kept in the record." : "Loose ends and possibilities. Some will become records, some might not ~";
  return <>
    <nav className="notebook-chapters" aria-label="Notebook chapters">
      {data.groups.map((group) => <button type="button" key={group.id} data-notebook-chapter={group.id}
        aria-current={group.id === chapter.id ? "page" : undefined} onClick={() => onNavigate(group.id)}>
        {group.title}<span>{String(group.items.length).padStart(2, "0")}</span>
      </button>)}
    </nav>
    <div className="notebook-sheet">
      <span className="notebook-binding" aria-hidden="true"><i /><i /><i /></span>
      <div className="notebook-page" id="roadmap-page" key={`${chapter.id}:${releaseIndex}`}>
        <div className="notebook-registration"><span>GESTALT / FIELD COPY</span><span>{release ? "FILED UPDATE" : indexOpen ? "UPDATE INDEX" : "WORKING COPY"}</span></div>
        <header className="roadmap-heading"><span>{release ? chapter.title : data.title}</span><h2 id="roadmap-page-title" tabIndex={-1}>{title}</h2>{intro ? <p>{intro}</p> : null}</header>
        {indexOpen ? <ol className="notebook-release-index" aria-label="Filed updates">
          {history.map((update, index) => <li key={update.version}><button type="button" data-notebook-release={index} onClick={() => onNavigate("done", index)}>
            <span className="notebook-release-version">{update.version}</span><span><strong>{update.title}</strong><small>{update.items.length} {update.items.length === 1 ? "milestone" : "milestones"}</small></span>
            <img src="/images/ui/notebook-next.svg" alt="" />
          </button></li>)}
          {!history.length ? <li className="roadmap-message">No completed updates filed yet.</li> : null}
        </ol> : <section className="roadmap-group" data-roadmap-state={chapter.id} aria-labelledby="roadmap-page-title">
          <div className="notebook-entry-count"><span>{release ? "RELEASE NOTES" : "OPEN NOTES"}</span><span>{String(items.length).padStart(2, "0")} RECORDS</span></div>
          <ol>{items.map((item, index) => <li key={index}><span className="roadmap-mark" aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
            <div><h3>{release ? <s>{item.title}</s> : item.title}</h3><p>{item.detail}</p></div>
          </li>)}</ol>
          {!items.length ? <p className="roadmap-message">Nothing written here yet.</p> : null}
        </section>}
      </div>
    </div>
    {release && releaseIndex !== null ? <footer className="notebook-pagination is-history">
      <button type="button" aria-label="Back to update index" title="Update index" aria-controls="roadmap-page" onClick={() => onNavigate("done")}><img src="/images/ui/notebook-index.svg" alt="" /></button>
      <button type="button" aria-label="Newer update" title="Newer update" aria-controls="roadmap-page" disabled={releaseIndex === 0} onClick={() => onNavigate("done", releaseIndex - 1)}><img src="/images/ui/notebook-prev.svg" alt="" /></button>
      <span role="status" aria-live="polite" aria-atomic="true">{release.version}<span>{String(releaseIndex + 1).padStart(2, "0")} / {String(history.length).padStart(2, "0")}</span></span>
      <button type="button" aria-label="Older update" title="Older update" aria-controls="roadmap-page" disabled={releaseIndex === history.length - 1} onClick={() => onNavigate("done", releaseIndex + 1)}><img src="/images/ui/notebook-next.svg" alt="" /></button>
    </footer> : <footer className="notebook-pagination is-summary"><span>{indexOpen ? `${history.length} filed updates` : `${items.length} open notes`}</span><span>Revised {data.updated}</span></footer>}
  </>;
}

export function RoadmapWindow({ onClose }: { onClose: () => void }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const focusRequest = useRef<string | null>(null);
  const [data, setData] = useState<PublicRoadmap | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [history, setHistory] = useState<RoadmapRelease[]>([]);
  const [location, setLocation] = useState<{ chapterId: RoadmapChapterId; releaseIndex: number | null }>({ chapterId: "working", releaseIndex: null });

  const navigate = (chapterId: RoadmapChapterId, releaseIndex: number | null = null) => {
    if (!["working", "ideas", "done"].includes(chapterId) || !data?.groups.some((group) => group.id === chapterId) || (releaseIndex !== null && (chapterId !== "done" || !Number.isInteger(releaseIndex) || !history[releaseIndex]))) return;
    if (location.chapterId === chapterId && location.releaseIndex === releaseIndex) return;
    focusRequest.current = releaseIndex !== null ? "#roadmap-page-title" : chapterId === "done" && location.releaseIndex !== null
      ? `[data-notebook-release="${location.releaseIndex}"]` : `[data-notebook-chapter="${chapterId}"]`;
    setLocation({ chapterId, releaseIndex });
  };

  useEffect(() => {
    const selector = focusRequest.current;
    focusRequest.current = null;
    if (selector) dialogRef.current?.querySelector<HTMLElement>(selector)?.focus();
  }, [location]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const trigger = document.activeElement;
    dialog.showModal();
    return () => {
      if (dialog.open) dialog.close();
      if (trigger instanceof HTMLElement && trigger !== document.body && trigger.isConnected) trigger.focus({ preventScroll: true });
      else {
        for (const control of document.querySelectorAll<HTMLElement>("[data-search-toggle], .archive-menu-toggle")) {
          if (control.getClientRects().length) { control.focus({ preventScroll: true }); break; }
        }
      }
    };
  }, []);

  useEffect(() => {
    let active = true;
    setFailed(false);
    import("@/public/roadmap.mjs").then((module) => {
      if (active) {
        setHistory(module.buildRoadmapHistory(module.publicRoadmap));
        setLocation({ chapterId: "working", releaseIndex: null });
        setData(module.publicRoadmap);
      }
    }).catch(() => { if (active) setFailed(true); });
    return () => { active = false; };
  }, [attempt]);

  if (typeof document === "undefined") return null;
  return createPortal(
    <dialog className="roadmap-dialog" ref={dialogRef} aria-label="Gestalt roadmap" data-notebook-ready={data ? "" : undefined}
      onKeyDown={(event) => event.stopPropagation()}
      onCancel={(event) => { event.preventDefault(); event.stopPropagation(); onClose(); }}
      onClick={(event) => { if (event.target === event.currentTarget) { event.stopPropagation(); onClose(); } }}>
      <article className="roadmap-note">
        <header className="window-bar"><span>// FIELD NOTEBOOK</span><div className="window-actions"><button type="button" data-window-action="close" aria-label="Close roadmap" onClick={onClose}>close</button></div></header>
        <div className="roadmap-body" aria-busy={!data && !failed}>
          {data ? <RoadmapNotebook data={data} history={history} chapterId={location.chapterId} releaseIndex={location.releaseIndex} onNavigate={navigate} />
            : failed ? <div className="roadmap-message" role="status"><p>Work note unavailable.</p><button type="button" onClick={() => setAttempt((value) => value + 1)}>Try again</button></div> : <p className="roadmap-message" role="status">Retrieving work note...</p>}
        </div>
      </article>
    </dialog>, document.body
  );
}
