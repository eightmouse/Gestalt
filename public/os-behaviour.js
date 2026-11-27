(function (root, factory) {
  const api = root.GestaltOsBehaviour || factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else { root.GestaltOsBehaviour = api; api.initializeBootPresentation(); }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  const startupKey = "gestalt.startup";
  const bootProfiles = Object.freeze(["staged", "probe", "stream", "verify"]);
  // The full welcome reports what has actually happened, never a scripted list. A line shows the
  // state it has when the beat arrives and changes in place if the state changes before the handoff.
  function bootReadiness({ records = 0, appearance = "night", steam = "reading", lastSession = null } = {}) {
    const count = Math.max(0, Math.floor(Number(records) || 0));
    const lines = [
      { key: "records", label: "RECORDS", value: `${String(count).padStart(2, "0")} read` },
      { key: "appearance", label: "APPEARANCE", value: appearance === "day" ? "Day" : "Night" },
      { key: "steam", label: "STEAM", value: steam === "ready" ? "Snapshot read" : steam === "offline" ? "Offline, using records" : "Reading" }
    ];
    if (typeof lastSession === "string" && lastSession) lines.push({ key: "session", label: "LAST SESSION", value: lastSession });
    return lines;
  }
  // The last visit is remembered only with local memory, only on this device: one timestamp.
  const lastSessionKey = "gestalt.last-session";
  function readLastSession(storage) {
    try {
      const local = storage || globalThis.localStorage;
      if (local.getItem("gestalt.local-memory") !== "granted") return undefined;
      return local.getItem(lastSessionKey) || null;
    } catch { return undefined; }
  }
  function saveLastSession(now = new Date(), storage) {
    try {
      const local = storage || globalThis.localStorage;
      if (local.getItem("gestalt.local-memory") !== "granted") return false;
      local.setItem(lastSessionKey, now.toISOString());
      return true;
    } catch { return false; }
  }
  function lastSessionLabel(previous, now = new Date()) {
    if (previous === undefined) return null;
    const then = previous ? new Date(previous) : null;
    if (!then || Number.isNaN(then.getTime()) || then > now) return "First session";
    const day = (date) => Math.floor(new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime() / 86_400_000);
    const days = day(now) - day(then);
    if (days <= 0) return "Earlier today";
    if (days === 1) return "Yesterday";
    if (days < 30) return `${days} days ago`;
    return [then.getDate(), then.getMonth() + 1].map((value) => String(value).padStart(2, "0")).join(" / ") + ` / ${then.getFullYear()}`;
  }
  const bootModules = Object.freeze({
    PROJECTS: Object.freeze({ id: "projects", order: 0, label: "Mounting process table" }),
    "LOCAL WEATHER": Object.freeze({ id: "weather", order: 1, label: "Checking local sensors" }),
    "CURRENT GAME": Object.freeze({ id: "game", order: 2, label: "Reading session slot" }),
    "LATEST LOG": Object.freeze({ id: "log", order: 3, label: "Unsealing field log" }),
    "MEMORY STATE": Object.freeze({ id: "memory", order: 4, label: "Checking memory banks" }),
    "RECENT ACTIVITY": Object.freeze({ id: "activity", order: 5, label: "Indexing recent signals" })
  });
  function initializeBootPresentation(doc = globalThis.document, random = Math.random) {
    const element = doc?.documentElement;
    if (!element) return bootProfiles[0];
    const existing = element.getAttribute("data-boot-profile");
    if (bootProfiles.includes(existing)) return existing;
    const sample = random();
    const index = Number.isFinite(sample) ? Math.max(0, Math.min(bootProfiles.length - 1, Math.floor(sample * bootProfiles.length))) : 0;
    // One visit's entropy varies the loader signal without a running randomizer.
    const detail = Math.floor((Number.isFinite(sample) ? Math.max(0, Math.min(1, sample)) : 0) * 0xffffffff) >>> 0;
    element.style?.setProperty("--boot-signal-start", `${90 + (detail >>> 2) % 301}ms`);
    element.style?.setProperty("--boot-signal-span", `${760 + (detail >>> 11) % 401}ms`);
    element.setAttribute("data-boot-profile", bootProfiles[index]);
    return bootProfiles[index];
  }
  const groups = [
    { key: "appearance", title: "APPEARANCE", options: [["night", "Night"], ["day", "Day"], ["auto", "Auto"]] },
    { key: "entry", title: "ENTRY ANIMATION", options: [["first", "First entry only"], ["always", "Every entry"], ["off", "Off"]] },
    { key: "startup", title: "NEXT STARTUP", options: [["full", "Full welcome"], ["quick", "Quick start"]] },
    { key: "pocketBoot", title: "HANDHELD BOOT", options: [["once", "Play once"], ["always", "Always"]] },
    { key: "seasonal", title: "SEASONAL DETAILS", options: [["auto", "By calendar"], ["off", "Off"]] },
    { key: "navigation", title: "DESKTOP NAVIGATION", options: [["fixed", "Legacy Mode"], ["terminal", "Terminal"]] },
    { key: "memory", title: "MEMORY STATE", defaultValue: "trace", options: [["legacy", "Legacy Visual"], ["trace", "Code Surface"]] }
  ];
  function normalizeStartupMode(value) { return value === "quick" ? "quick" : "full"; }
  function readStartupMode(storage) {
    try {
      const local = storage || globalThis.localStorage;
      return local.getItem("gestalt.local-memory") === "granted" ? normalizeStartupMode(local.getItem(startupKey)) : "full";
    } catch { return "full"; }
  }
  function saveStartupMode(value, storage) {
    try {
      const local = storage || globalThis.localStorage;
      if (local.getItem("gestalt.local-memory") !== "granted") return false;
      local.setItem(startupKey, normalizeStartupMode(value));
      return true;
    } catch { return false; }
  }
  function normalizeValues(values = {}) {
    return Object.fromEntries(groups.map((group) => [group.key, group.options.some(([value]) => value === values?.[group.key]) ? values[group.key] : group.defaultValue || group.options[0][0]]));
  }
  function needsLocalMemory(key) { return key === "startup" || key === "pocketBoot"; }
  function preferenceNote(key, remember) {
    if (key === "entry") return '<small data-os-reduced-motion>Device reduced motion is active.</small>';
    if (key === "startup") return `<small data-os-startup-note>${remember ? "" : "Local memory required."}</small>`;
    if (key === "pocketBoot") return `<small data-os-pocket-note>${remember ? "Play once per tab session." : "Local memory is required to remember this choice."}</small>`;
    return "";
  }
  function renderContent(values, remember) {
    const selected = normalizeValues(values);
    return `<article class="os-behaviour-frame"><header class="window-bar"><span>// SETTINGS</span><div class="window-actions"><button type="button" data-window-action="close" data-os-close aria-label="Close Settings">close</button></div></header>
      <div class="os-behaviour-body">${groups.map((group) => `<fieldset class="os-preference" data-os-group="${group.key}"><legend>${group.title}</legend><div class="os-preference-options" data-options="${group.options.length}">${group.options.map(([value, label]) => `<label><input type="radio" name="os-${group.key}" data-os-preference="${group.key}" value="${value}"${selected[group.key] === value ? " checked" : ""}${needsLocalMemory(group.key) && !remember ? " disabled" : ""}><span>${label}</span></label>`).join("")}</div>${preferenceNote(group.key, remember)}</fieldset>`).join("")}
      <footer class="os-behaviour-footnote">LOCAL MEMORY <span data-os-memory>${remember ? "ENABLED" : "SESSION ONLY"}</span></footer></div></article>`;
  }
  function createController(host = globalThis.window) {
    const doc = host.document;
    let dialog = null, trigger = null, callbacks = null;
    let currentValues = normalizeValues(), currentRemember = false;
    function update(values, remember) {
      if (!dialog) return;
      const selected = normalizeValues(values);
      currentValues = selected;
      currentRemember = remember;
      for (const input of dialog.querySelectorAll("input[data-os-preference]")) {
        input.checked = selected[input.dataset.osPreference] === input.value;
        input.disabled = needsLocalMemory(input.dataset.osPreference) && !remember;
      }
      dialog.querySelector("[data-os-memory]").textContent = remember ? "ENABLED" : "SESSION ONLY";
      dialog.querySelector("[data-os-startup-note]").textContent = remember ? "" : "Local memory required.";
      dialog.querySelector("[data-os-pocket-note]").textContent = remember ? "Play once per tab session." : "Local memory is required to remember this choice.";
    }
    function close() {
      if (!dialog) return;
      const node = dialog;
      dialog = null;
      if (node.open) node.close();
      node.remove();
      if (trigger && trigger !== doc.body && trigger.isConnected && trigger.getClientRects().length && !trigger.closest("[inert]")) trigger.focus({ preventScroll: true });
      else {
        for (const control of doc.querySelectorAll("[data-search-toggle], .archive-menu-toggle")) {
          if (control.getClientRects().length && !control.closest("[inert]")) { control.focus({ preventScroll: true }); break; }
        }
      }
      trigger = null;
      callbacks = null;
    }
    function open(values, handlers, remember) {
      callbacks = handlers;
      if (dialog) { update(values, remember); return; }
      trigger = doc.activeElement;
      dialog = doc.createElement("dialog");
      dialog.className = "os-behaviour-dialog";
      dialog.setAttribute("aria-label", "Settings");
      dialog.innerHTML = renderContent(values, remember);
      currentValues = normalizeValues(values);
      currentRemember = remember;
      const dismiss = () => { const onClose = callbacks?.onClose; onClose?.(); close(); };
      dialog.addEventListener("keydown", (event) => event.stopPropagation());
      dialog.addEventListener("cancel", (event) => { event.preventDefault(); event.stopPropagation(); dismiss(); });
      dialog.addEventListener("click", (event) => {
        event.stopPropagation();
        if (event.target === dialog || event.target.closest?.("[data-os-close]")) dismiss();
      });
      dialog.addEventListener("change", (event) => {
        event.stopPropagation();
        const input = event.target;
        const group = groups.find((item) => item.key === input.dataset?.osPreference);
        if (input.checked && !input.disabled && group?.options.some(([value]) => value === input.value)) {
          if (callbacks?.onChange(group.key, input.value) === false) {
            update(currentValues, currentRemember);
            dialog.querySelector("[data-os-memory]").textContent = "STORAGE UNAVAILABLE";
          }
        }
      });
      doc.body.append(dialog);
      dialog.showModal();
    }
    return { open, update, close, destroy: close };
  }
  return { bootProfiles, bootReadiness, readLastSession, saveLastSession, lastSessionLabel, bootModules, initializeBootPresentation, normalizeStartupMode, readStartupMode, saveStartupMode, normalizeValues, renderContent, createController };
});
