"use client";

import type { CSSProperties } from "react";
import { cipherizeText } from "@/components/archive/cipher";

export function renderHeadlineLetters(value: string) {
  const cipher = cipherizeText(value).split("");

  return value.split("").map((char, index) => {
    const isSpace = char === " ";
    const display = isSpace ? "\u00A0" : char;
    const cipherDisplay = isSpace ? "\u00A0" : cipher[index] ?? char;

    return (
      <span
        aria-hidden="true"
        className={isSpace ? "headline-char is-space" : "headline-char"}
        key={`${char}-${index}`}
        style={{ "--headline-index": index } as CSSProperties}
      >
        <span className="headline-char-cipher">{cipherDisplay}</span>
        <span className="headline-char-readable">{display}</span>
      </span>
    );
  });
}
