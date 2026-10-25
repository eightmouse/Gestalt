"use client";

import type { CSSProperties } from "react";
import { renderHeadlineLetters } from "@/components/archive/headline-text";

export function BootScreen() {
  return (
    <div className="boot-screen" aria-hidden="true">
      <div className="boot-loader">
        <span>GESTALT</span>
        <div
          className="boot-status headline-decode-text is-resolving"
          aria-label="System initializing"
          style={{ "--headline-chars": "System initializing".length } as CSSProperties}
        >
          {renderHeadlineLetters("System initializing")}
        </div>
        <b className="boot-meter"><b /></b>
      </div>
      <div className="boot-session">
        <span className="boot-session-label">// SESSION READY</span>
        <img className="boot-session-mark" src="/images/eightmouse-avatar.png" width="112" height="112" alt="" decoding="async" />
        <span className="boot-session-user">Eightmouse</span>
        <span className="boot-session-detail">Opening the archive</span>
      </div>
    </div>
  );
}
