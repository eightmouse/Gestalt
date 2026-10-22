"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { PublicRoadmap } from "@/public/roadmap.mjs";

export function RoadmapWindow({ onClose }: { onClose: () => void }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [data, setData] = useState<PublicRoadmap | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

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
      if (active) setData(module.publicRoadmap);
    }).catch(() => { if (active) setFailed(true); });
    return () => { active = false; };
  }, [attempt]);

  if (typeof document === "undefined") return null;
  return createPortal(
    <dialog className="roadmap-dialog" ref={dialogRef} aria-label="Gestalt roadmap"
      onKeyDown={(event) => event.stopPropagation()}
      onCancel={(event) => { event.preventDefault(); event.stopPropagation(); onClose(); }}
      onClick={(event) => { if (event.target === event.currentTarget) { event.stopPropagation(); onClose(); } }}>
      <article className="roadmap-note">
        <header className="window-bar"><span>// WORK NOTE</span><div className="window-actions"><button type="button" data-window-action="close" aria-label="Close roadmap" onClick={onClose}>close</button></div></header>
        <div className="roadmap-body" aria-busy={!data && !failed}>
          {data ? <>
            <div className="roadmap-heading"><span>GESTALT / ROADMAP</span><h2>{data.title}</h2><p>{data.intro}</p></div>
            {data.groups.map((group) => <section className="roadmap-group" data-roadmap-state={group.id} key={group.id}>
              <h3>{group.title}<span>{String(group.items.length).padStart(2, "0")}</span></h3>
              <ul>{group.items.map((item) => <li key={item.title}>
                <span className="roadmap-mark" aria-hidden="true" />
                <div><h4>{group.id === "done" ? <s>{item.title}</s> : item.title}</h4><p>{item.detail}</p></div>
                {item.version ? <small>{item.version}</small> : null}
              </li>)}</ul>
            </section>)}
            <footer className="roadmap-footnote">Last revised: {data.updated}</footer>
          </> : failed ? <div className="roadmap-message" role="status"><p>Work note unavailable.</p><button type="button" onClick={() => setAttempt((value) => value + 1)}>Try again</button></div> : <p className="roadmap-message" role="status">Retrieving work note...</p>}
        </div>
      </article>
    </dialog>, document.body
  );
}
