"use client";

import type { CSSProperties } from "react";
import { renderCipherLetters } from "@/components/archive/headline-text";
import osBehaviour, { type StartupMode } from "@/public/os-behaviour.js";

export function BootScreen({ startupMode }: { startupMode: StartupMode }) {
  return (
    <div className="boot-screen" aria-hidden="true">
      <div className="boot-loader">
        <span>GESTALT</span>
        <div
          className="boot-status headline-decode-text is-resolving"
          aria-label="System initializing"
        >
          <span>{renderCipherLetters("System initializing")}</span>
        </div>
        <b className="boot-meter"><b /></b>
      </div>
      {startupMode === "full" ? <ol className="boot-process-log">
        {osBehaviour.bootProcesses.map(({ at, label, stamp }) => <li key={label} style={{ "--boot-line-time": `${at}ms` } as CSSProperties}><span className="boot-process-stamp">{stamp}</span><span className="boot-process-state">[ OK ]</span>{label}</li>)}
      </ol> : null}
      <div className="boot-session">
        <span className="boot-session-label">// SESSION READY</span>
        <img className="boot-session-mark" src="/images/eightmouse-avatar.png" width="120" height="120" alt="" decoding="async" loading="lazy" />
        <span className="boot-session-user">Eightmouse</span>
        <span className="boot-session-detail">Opening the archive</span>
      </div>
    </div>
  );
}
