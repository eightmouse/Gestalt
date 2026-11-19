"use client";

import type { CSSProperties } from "react";
import cipherDecode from "@/public/cipher-decode.js";

export function renderCipherLetters(value: string) {
  const plan = cipherDecode.plan(value);
  if (!plan) return value;
  return <span className="cipher-line" style={{ "--cipher-steps": plan.steps } as CSSProperties}>
    <span className="cipher-ink">{value}</span><span className="cipher-glyph" aria-hidden="true" data-a={plan.initial} data-b={plan.burst} />
  </span>;
}
