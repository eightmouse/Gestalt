"use client";

import { RotateCcw } from "lucide-react";
import imageFraming, { type HeaderFrame } from "@/public/image-framing.js";

export function HeaderFraming({ frame, onChange }: {
  frame: HeaderFrame;
  onChange: (frame: HeaderFrame) => void;
}) {
  return <details className="studio-artwork-framing studio-header-framing">
    <summary title="Adjusts only the background behind the entry title">Frame header</summary>
    {([["headerZoom", "Header zoom", 100, 200], ["headerX", "Header horizontal position", 0, 100], ["headerY", "Header vertical position", 0, 100]] as const).map(([key, label, min, max]) => (
      <label className="studio-artwork-slider" key={key}>
        <span>{label}</span>
        <input type="range" min={min} max={max} value={frame[key]} onChange={(event) => onChange({ ...frame, [key]: Number(event.target.value) })} />
        <output>{frame[key]}%</output>
      </label>
    ))}
    <button className="studio-artwork-reset" type="button" onClick={() => onChange(imageFraming.normalizeHeaderFrame(null))}>
      <RotateCcw size={14} aria-hidden="true" /> Reset header framing
    </button>
  </details>;
}
