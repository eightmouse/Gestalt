"use client";

import { useEffect, useRef } from "react";
import memoryState, { type MemoryStateMode } from "@/public/memory-state.js";
import ambientMotion from "@/public/ambient-motion.js";

export function MemoryState({ mode }: { mode: MemoryStateMode }) {
  return mode === "legacy" ? <MemoryLoop /> : <SessionTrace />;
}

function SessionTrace() {
  const traceRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => memoryState.watchTrace(traceRef.current), []);
  return <div className="memory-trace" ref={traceRef}>
    <header className="memory-trace-header"><span>workspace.gs</span></header>
    <ol className="memory-trace-lines" aria-label="Workspace code stream" aria-live="off" />
  </div>;
}

// Retain the original moving visual as an optional, independently mounted variant.
function MemoryLoop() {
  const memoryRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => ambientMotion.watchMemory(memoryRef.current), []);
  return <div className="memory-loop" aria-hidden="true" ref={memoryRef}>
    <div className="memory-field">
      <span className="memory-core" />
      <span className="memory-orbit" />
      <span className="memory-gate" />
      <span className="memory-shard" />
      <span className="memory-nodes" />
    </div>
  </div>;
}
