(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.GestaltSeasonal = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  const key = "gestalt.seasonal-details";
  const halloween = Object.freeze([
    Object.freeze({ placement: "projects-web", image: "public/images/seasonal/halloween-web.svg" }),
    Object.freeze({ placement: "game-pumpkin", image: "public/images/seasonal/october.svg", glowImage: "public/images/seasonal/october-glow.svg" }),
    Object.freeze({ placement: "memory-hanging", image: "public/images/seasonal/halloween-hanging.svg" }),
    Object.freeze({ placement: "log-web", image: "public/images/seasonal/halloween-web.svg" })
  ]);
  const undecorated = Object.freeze([]);
  const seasons = Object.freeze({
    9: Object.freeze({ id: "october", decorations: halloween }),
    11: Object.freeze({ id: "december", decorations: undecorated }),
    0: Object.freeze({ id: "january", decorations: undecorated })
  });

  function normalizeMode(value) { return value === "off" ? "off" : "auto"; }
  function readMode(storage) {
    try { return normalizeMode((storage || globalThis.localStorage).getItem(key)); }
    catch { return "auto"; }
  }
  function saveMode(value, storage) {
    try { (storage || globalThis.localStorage).setItem(key, normalizeMode(value)); }
    catch { /* The preference still applies for this visit if storage is blocked. */ }
  }
  function seasonFor(date, mode = "auto") {
    if (normalizeMode(mode) === "off" || !(date instanceof Date) || !Number.isFinite(date.getTime())) return null;
    return seasons[date.getMonth()] || null;
  }
  return Object.freeze({ normalizeMode, readMode, saveMode, seasonFor });
});
