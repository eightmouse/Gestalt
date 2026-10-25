"use client";

import { useEffect, useMemo, useRef, type RefObject } from "react";
import { Terminal } from "lucide-react";
import navigation, { type DesktopNavigationController, type DesktopNavigationMode } from "@/public/desktop-navigation.js";
import { activityDate, formatReadableDate } from "@/components/archive/record-utils";
import { isLogArchivedByAge } from "@/lib/log-archive";
import type { RecordEntry, RecordSection } from "@/lib/types";

export function useDesktopNavigation(shellRef: RefObject<HTMLElement | null>, mode: DesktopNavigationMode, ready: boolean, busy: boolean, palette: boolean, remember: boolean) {
  const controller = useRef<DesktopNavigationController | null>(null);
  useEffect(() => {
    controller.current = navigation.createController();
    return () => { controller.current?.destroy(); controller.current = null; };
  }, []);
  useEffect(() => { controller.current?.attach(shellRef.current, { mode, ready, busy, palette, remember }); }, [shellRef, mode, ready, busy, palette, remember]);
}

export function DesktopNavigationChrome({ records, activeSection, onOpenSection }: { records: RecordEntry[]; activeSection: RecordSection; onOpenSection: (section: RecordSection) => void }) {
  const rows = useMemo(() => navigation.directoryRows(records.map((record) => ({ section: record.section, date: activityDate(record), archived: isLogArchivedByAge(record) }))), [records]);
  return <>
    <button className="desktop-nav-backdrop" data-desktop-nav-dismiss type="button" aria-label="Close archive navigation" tabIndex={-1} />
    <aside className="desktop-terminal-hint" role="status" aria-hidden="true" inert><span>Press <kbd>T</kbd> to open terminal</span><div className="window-actions"><button type="button" data-window-action="close" data-desktop-terminal-hint-dismiss aria-label="Dismiss terminal hint">close</button></div></aside>
    <section className="desktop-nav-terminal" id="desktop-directory" role="dialog" aria-modal="true" aria-labelledby="desktop-directory-title" aria-hidden="true" inert>
      <header className="desktop-terminal-bar">
        <span id="desktop-directory-title">Eightmouse@Gestalt: ~ <small>v1.59.2</small></span>
        <div className="window-actions">
          <button type="button" data-window-action="minimize" data-desktop-terminal-minimize aria-label="Minimize terminal">minimize</button>
          <button type="button" data-window-action="maximize" data-desktop-terminal-maximize aria-label="Maximize terminal">maximize</button>
          <button type="button" data-window-action="close" data-desktop-nav-dismiss aria-label="Close terminal">close</button>
        </div>
      </header>
      <div className="desktop-terminal-body">
        <p className="desktop-terminal-prompt"><span>[Eightmouse@Gestalt ~]$</span> ls -l<span className="desktop-terminal-cursor" aria-hidden="true">_</span></p>
        <div className="desktop-directory-heading"><span>total {rows.length}</span><span>LAST FILED</span></div>
        <nav aria-label="Directory sections">
          {rows.map((row) => <button key={row.id} type="button" data-directory-section aria-current={activeSection === row.id ? "page" : undefined} onClick={() => { if (activeSection !== row.id) onOpenSection(row.id); }}>
            <span className="desktop-directory-marker" aria-hidden="true">{activeSection === row.id ? ">" : "-"}</span>
            <span>{row.name}</span>
            <time dateTime={row.date || undefined}>{row.date ? formatReadableDate(row.date) : "--"}</time>
          </button>)}
        </nav>
      </div>
    </section>
  </>;
}

export function DesktopTerminalRestore() {
  return <button className="desktop-terminal-restore" type="button" data-desktop-terminal-restore aria-label="Restore terminal" aria-controls="desktop-directory" title="Restore terminal (T)" aria-hidden="true" inert>
    <Terminal size={18} aria-hidden="true" />
  </button>;
}
