"use client";

import { useEffect, useRef } from "react";

// Ctrl+S (Cmd+S on a Mac) saves the record being edited instead of opening the browser's
// "save page" dialog. It stays quiet while a save or upload is already running.
export function useSaveShortcut(onSave: () => void, busy: boolean) {
  const latest = useRef({ onSave, busy });
  useEffect(() => { latest.current = { onSave, busy }; });
  useEffect(() => {
    const handle = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey) || event.altKey || event.shiftKey || event.key.toLowerCase() !== "s") return;
      event.preventDefault();
      if (!latest.current.busy) latest.current.onSave();
    };
    window.addEventListener("keydown", handle);
    return () => window.removeEventListener("keydown", handle);
  }, []);
}
