(function (root, factory) {
  const api = root.GestaltAppearance || factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else { root.GestaltAppearance = api; api.initialize(root); }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  const key = "gestalt.appearance";
  const observers = new WeakMap();
  function normalizeMode(value) { return value === "day" || value === "auto" ? value : "night"; }
  function resolveMode(mode, date = new Date()) {
    if (normalizeMode(mode) !== "auto") return normalizeMode(mode);
    return date.getHours() >= 7 && date.getHours() < 19 ? "day" : "night";
  }
  function readMode(storage) {
    try {
      const local = storage || globalThis.localStorage;
      return local.getItem("gestalt.local-memory") === "granted" ? normalizeMode(local.getItem(key)) : "night";
    } catch { return "night"; }
  }
  function getMode(doc = globalThis.document) { return normalizeMode(doc?.documentElement?.getAttribute("data-appearance-mode")); }
  function sync(doc = globalThis.document, date = new Date()) {
    const element = doc?.documentElement;
    if (!element) return;
    const appearance = resolveMode(getMode(doc), date);
    if (element.getAttribute("data-appearance") !== appearance) element.setAttribute("data-appearance", appearance);
  }
  function scheduleBoundary(doc) {
    const state = observers.get(doc);
    if (!state) return;
    if (state.timer !== null) state.host.clearTimeout(state.timer);
    state.timer = null;
    if (doc.hidden || getMode(doc) !== "auto" || typeof state.host.setTimeout !== "function") return;
    const now = new (state.host.Date || Date)();
    const next = new Date(now);
    next.setHours(now.getHours() < 7 ? 7 : now.getHours() < 19 ? 19 : 7, 0, 0, 0);
    if (next.getTime() <= now.getTime()) next.setDate(next.getDate() + 1);
    // One boundary wake-up, not a background polling interval or editor render.
    state.timer = state.host.setTimeout(() => {
      state.timer = null;
      if (!doc.hidden) sync(doc, new (state.host.Date || Date)());
      scheduleBoundary(doc);
    }, next.getTime() - now.getTime());
  }
  function setMode(value, remember = false, host = globalThis.window) {
    const mode = normalizeMode(value);
    host.document.documentElement.setAttribute("data-appearance-mode", mode);
    sync(host.document, new (host.Date || Date)());
    scheduleBoundary(host.document);
    if (remember) {
      try {
        if (host.localStorage.getItem("gestalt.local-memory") === "granted") host.localStorage.setItem(key, mode);
      } catch { /* The selected appearance still works for this visit. */ }
    }
    return mode;
  }
  function initialize(host = globalThis.window) {
    const doc = host?.document;
    if (!doc?.documentElement) return "night";
    if (!doc.documentElement.hasAttribute("data-appearance-mode")) {
      let mode = "night";
      try { mode = readMode(host.localStorage); } catch { /* Storage can be blocked. */ }
      doc.documentElement.setAttribute("data-appearance-mode", mode);
    }
    sync(doc, new (host.Date || Date)());
    if (!observers.has(doc) && doc.addEventListener) {
      observers.set(doc, { host, timer: null });
      doc.addEventListener("visibilitychange", () => {
        if (!doc.hidden) sync(doc, new (host.Date || Date)());
        scheduleBoundary(doc);
      });
      scheduleBoundary(doc);
    }
    return getMode(doc);
  }
  return Object.freeze({ normalizeMode, resolveMode, readMode, getMode, setMode, sync, initialize });
});
