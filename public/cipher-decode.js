(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.GestaltCipherDecode = api;
})(globalThis, function () {
  const alphabet = "23456789ABEFHKMNRSTXZ#/+|:[]";
  const letter = /[\p{L}\p{N}]/u;

  function plan(value) {
    let count = 0, seed = 7;
    for (const char of value) {
      if (letter.test(char)) count++;
      if (count > 60) return null;
      seed = (seed * 31 + char.codePointAt(0)) >>> 0;
    }
    if (!count) return null;
    // The signal is a separate line, not a replacement in each letter's space.
    const width = Math.max(4, Math.min(32, Math.ceil(count * .8)));
    const signal = (offset) => Array.from({ length: width }, (_, index) => {
      const slot = (seed + offset + index * 7 + index * index) % alphabet.length;
      return (index > 0 && index % 5 === 0 ? " " : "") + alphabet[slot];
    }).join("");
    return { initial: signal(0), burst: signal(11), steps: Math.min(18, Math.max(4, count)) };
  }

  return Object.freeze({ plan });
});
