"use client";

import { useEffect, useRef } from "react";
import xTerminal from "@/public/x-terminal.js";

export function XTerminal() {
  const ref = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!ref.current) return;
    const embedUrl = process.env.NODE_ENV === "development"
      ? "https://eightmouse.github.io/Gestalt/public/x-embed.html"
      : "/x-embed.html";
    const terminal = xTerminal.mount(ref.current, { embedUrl });
    return () => terminal.destroy();
  }, []);
  return <div className="x-terminal" data-x-terminal ref={ref}>
    <div className="x-terminal-ui" data-x-ui />
  </div>;
}
