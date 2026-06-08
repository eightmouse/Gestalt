"use client";

import type { CSSProperties } from "react";
import { renderHeadlineLetters } from "@/components/archive/headline-text";

export function BootScreen() {
  return (
    <div className="boot-screen" aria-hidden="true">
      <span>GESTALT</span>
      <div
        className="boot-status headline-decode-text is-resolving"
        aria-label="System initializing"
        style={{ "--headline-chars": "System initializing".length } as CSSProperties}
      >
        {renderHeadlineLetters("System initializing")}
      </div>
      <b className="boot-meter">
        <b />
      </b>
    </div>
  );
}
