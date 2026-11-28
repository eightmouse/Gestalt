"use client";

import { useEffect, useMemo, useRef, type RefObject } from "react";
import { Info, Terminal } from "lucide-react";
import navigation, { type DesktopNavigationController, type DesktopNavigationMode } from "@/public/desktop-navigation.js";
import recordMotion from "@/public/record-motion.js";
import memoryState from "@/public/memory-state.js";
import { activityDate, formatReadableDate } from "@/components/archive/record-utils";
import type { RecordEntry, RecordSection } from "@/lib/types";

export function useDesktopNavigation(shellRef: RefObject<HTMLElement | null>, mode: DesktopNavigationMode, ready: boolean, busy: boolean, palette: boolean, remember: boolean) {
  const controller = useRef<DesktopNavigationController | null>(null);
  useEffect(() => {
    controller.current = navigation.createController(window, recordMotion, memoryState);
    return () => { controller.current?.destroy(); controller.current = null; };
  }, []);
  useEffect(() => { controller.current?.attach(shellRef.current, { mode, ready, busy, palette, remember }); }, [shellRef, mode, ready, busy, palette, remember]);
}

export function DesktopNavigationChrome({ records, filedLogs, activeSection, lastSession, onOpenSection }: { records: RecordEntry[]; filedLogs: RecordEntry[]; activeSection: RecordSection; lastSession?: string | null; onOpenSection: (section: RecordSection) => void }) {
  const rows = useMemo(() => {
    const filedIds = new Set(filedLogs.map((record) => record.id));
    return navigation.directoryRows(records.map((record) => ({ section: record.section, date: activityDate(record), archived: filedIds.has(record.id), title: record.title })));
  }, [records, filedLogs]);
  const current = rows.find((row) => row.id === activeSection) ?? rows[0];
  return <>
    <button className="desktop-nav-backdrop" data-desktop-nav-dismiss type="button" aria-label="Close archive navigation" tabIndex={-1} />
    <aside className="desktop-terminal-hint" role="status" aria-hidden="true" inert><button type="button" className="desktop-terminal-hint-action" data-system-notices-open aria-controls="system-notices" title="Open System Tips"><span className="terminal-shortcut-line">Press <kbd>T</kbd> to open terminal</span><span>Press <kbd>~</kbd> to open command palette</span><span>Press <kbd>S</kbd> to search the web</span></button></aside>
    <section className="system-notices-panel" id="system-notices" role="region" aria-label="System Tips" aria-hidden="true" tabIndex={-1} inert>
      <header><span>// SYSTEM TIPS</span><div className="window-actions"><button type="button" data-window-action="close" data-system-notices-close aria-label="Close System Tips">close</button></div></header>
      <dl><div className="terminal-shortcut-line"><dt><kbd>T</kbd></dt><dd>Open terminal</dd></div><div><dt><kbd>~</kbd></dt><dd>Command palette</dd></div><div><dt><kbd>S</kbd></dt><dd>Web search</dd></div><div><dt><kbd>Esc</kbd></dt><dd>Close the active window</dd></div></dl>
    </section>
    <section className="desktop-nav-terminal" id="desktop-directory" role="dialog" aria-modal="true" aria-labelledby="desktop-directory-title" aria-hidden="true" inert>
      <header className="desktop-terminal-bar">
        <span id="desktop-directory-title">Eightmouse@Gestalt: ~ <small>v1.91.0</small></span>
        <div className="window-actions">
          <button type="button" data-window-action="minimize" data-desktop-terminal-minimize aria-label="Minimize terminal">minimize</button>
          <button type="button" data-window-action="maximize" data-desktop-terminal-maximize aria-label="Maximize terminal">maximize</button>
          <button type="button" data-window-action="close" data-desktop-nav-dismiss aria-label="Close terminal">close</button>
        </div>
      </header>
      <div className="desktop-terminal-body">
        <p className="desktop-terminal-login">{navigation.loginLine(lastSession, records.length)}</p>
        <p className="desktop-terminal-prompt"><span className="desktop-terminal-user">eightmouse@gestalt</span>:~$ <span className="desktop-terminal-command">ls -l</span></p>
        <div className="desktop-directory-heading"><span>total {rows.length}</span></div>
        <nav aria-label="Directory sections">
          {rows.map((row) => <button key={row.id} type="button" data-directory-section data-directory-name={row.name} aria-label={`${row.name}, ${row.label}, ${row.count} records${row.date ? `, last filed ${formatReadableDate(row.date)}` : ""}`} aria-current={activeSection === row.id ? "page" : undefined} onClick={() => { if (activeSection !== row.id) onOpenSection(row.id); }}>
            <span className="desktop-directory-marker" aria-hidden="true">{activeSection === row.id ? ">" : "-"}</span>
            <span className="desktop-directory-mode" aria-hidden="true">{row.mode}</span>
            <span className="desktop-directory-count" aria-hidden="true">{row.count}</span>
            <time dateTime={row.date || undefined} aria-hidden="true">{navigation.listingDate(row.date)}</time>
            <span className="desktop-directory-name" aria-hidden="true">{row.name}/</span>
            <small className="desktop-directory-preview" aria-hidden="true">{row.label}{row.newest ? ` · newest: ${row.newest}` : ""}</small>
          </button>)}
        </nav>
        <p className="desktop-terminal-prompt desktop-terminal-next" aria-hidden="true"><span className="desktop-terminal-user">eightmouse@gestalt</span>:~$ <span className="desktop-terminal-cursor" /></p>
      </div>
      <footer className="desktop-terminal-status" aria-hidden="true"><span>NORMAL · <b data-terminal-focus>{current?.name}</b></span><span>↑↓ move · ↵ open · esc close</span><time data-terminal-clock /></footer>
    </section>
  </>;
}

export function DesktopTerminalRestore() {
  return <button className="desktop-terminal-restore" type="button" data-desktop-terminal-restore aria-label="Restore terminal" aria-controls="desktop-directory" title="Restore terminal (T)" aria-hidden="true" inert>
    <Terminal size={18} aria-hidden="true" />
  </button>;
}

export function SystemTipsButton() {
  return <button className="system-notices-toggle" type="button" data-system-notices-toggle aria-label="System Tips" aria-controls="system-notices" aria-expanded="false" title="System Tips" inert><Info size={18} aria-hidden="true" /></button>;
}
