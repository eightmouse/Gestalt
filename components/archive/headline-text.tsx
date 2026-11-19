"use client";

import type { CSSProperties } from "react";
import cipherDecode from "@/public/cipher-decode.js";

export function renderCipherLetters(value: string) {
  return cipherDecode.plan(value).map((cell, index) => !cell.glyphs ? cell.text : (
    <span className="cipher-cell" key={index} style={{ "--cipher-index": cell.step } as CSSProperties}>
      <span className="cipher-ink" data-cipher-last={cell.last || undefined}>{cell.text}</span><span className="cipher-glyph" aria-hidden="true" data-a={cell.glyphs[0]} data-b={cell.glyphs[1]} data-c={cell.glyphs[2]} />
    </span>
  ));
}
