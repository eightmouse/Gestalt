(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.GestaltCipherDecode = api;
})(globalThis, function () {
  const alphabet = "23456789ABEFHKMNRSTXZ\u2316\u2573\u2301\u25C7\u27D0";
  const segmenter = typeof Intl.Segmenter === "function" ? new Intl.Segmenter(undefined, { granularity: "grapheme" }) : null;
  const letter = /[\p{L}\p{N}]/u;

  function plan(value) {
    const parts = segmenter ? Array.from(segmenter.segment(value), ({ segment }) => segment) : value.match(/\P{M}\p{M}*|\p{M}+/gu) ?? [];
    const count = parts.filter((part) => letter.test(part)).length;
    if (!count || count > 60) return [{ text: value }];
    let index = 0;
    return parts.map((text) => {
      if (!letter.test(text)) return { text };
      const seed = (text.codePointAt(0) + index * 7) % alphabet.length;
      const glyphs = [seed, (seed + 9) % alphabet.length, (seed + 17) % alphabet.length].map((slot) =>
        alphabet[slot] === text.toUpperCase() ? alphabet[(slot + 1) % alphabet.length] : alphabet[slot]
      );
      // Bound the sweep for longer headings without dropping or reordering letters.
      const step = index * Math.min(1, 23 / Math.max(1, count - 1));
      return { text, glyphs, step: Number(step.toFixed(3)), last: ++index === count };
    });
  }

  return Object.freeze({ plan });
});
