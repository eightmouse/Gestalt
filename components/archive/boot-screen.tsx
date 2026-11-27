"use client";

import { renderCipherLetters } from "@/components/archive/headline-text";
import osBehaviour, { type StartupMode } from "@/public/os-behaviour.js";

type BootReadiness = { records: number; appearance: string; steam: "reading" | "ready" | "offline"; lastSession?: string | null };

// Power-on: the tube warms up, the wordmark resolves, the full welcome reports real readiness,
// then the operator session holds before the screen shutters into the workspace (globals.css, Boot).
export function BootScreen({ startupMode, readiness }: { startupMode: StartupMode; readiness?: BootReadiness }) {
  return (
    <div className="boot-screen" aria-hidden="true">
      <i className="boot-tube" />
      <div className="boot-loader">
        <span>GESTALT</span>
        <div
          className="boot-status headline-decode-text is-resolving"
          aria-label="System initializing"
        >
          <span>{renderCipherLetters("System initializing")}</span>
        </div>
        {startupMode === "full" ? <ol className="boot-readiness">
          {osBehaviour.bootReadiness(readiness).map(({ key, label, value }) => <li key={key} data-boot-line={key}><span>{label}</span><b>{value}</b></li>)}
        </ol> : null}
      </div>
      <div className="boot-session">
        <span className="boot-session-label">// SESSION READY</span>
        <img className="boot-session-mark" src="/images/eightmouse-avatar.png" width="120" height="120" alt="" decoding="async" loading="lazy" />
        <span className="boot-session-user">Eightmouse</span>
        <span className="boot-session-detail">Opening the archive</span>
      </div>
    </div>
  );
}
