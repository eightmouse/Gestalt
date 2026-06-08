const cipherGlyphs = ["\u2316", "\u2573", "\u2575", "\u2301", "\u27D0", "\u2330", "\u27DF", "\u25C7", "\u25A4", "\u25CC"];

export function cipherizeText(value: string): string {
  return value
    .split("")
    .map((char, index) => {
      if (char === " ") return " ";
      if (char === "/" || char === "&" || char === "." || char === "-") return char;
      return cipherGlyphs[(char.charCodeAt(0) + index) % cipherGlyphs.length];
    })
    .join("");
}
