(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.GestaltOsBehaviour = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  const startupKey = "gestalt.startup";
  const groups = [
    { key: "entry", title: "ENTRY ANIMATION", options: [["first", "First entry only"], ["always", "Every entry"], ["off", "Off"]] },
    { key: "startup", title: "NEXT STARTUP", options: [["full", "Full welcome"], ["quick", "Quick start"]] },
    { key: "seasonal", title: "SEASONAL DETAILS", options: [["auto", "By calendar"], ["off", "Off"]] },
    { key: "navigation", title: "DESKTOP NAVIGATION", options: [["fixed", "Legacy Mode"], ["terminal", "Terminal"]] }
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
    return Object.fromEntries(groups.map((group) => [group.key, group.options.some(([value]) => value === values?.[group.key]) ? values[group.key] : group.options[0][0]]));
  }
  function renderContent(values, remember) {
    const selected = normalizeValues(values);
    return `<article class="os-behaviour-frame"><header class="window-bar"><span>// SETTINGS</span><div class="window-actions"><button type="button" data-window-action="close" data-os-close aria-label="Close Settings">close</button></div></header>
      <div class="os-behaviour-body">${groups.map((group) => `<fieldset class="os-preference" data-os-group="${group.key}"><legend>${group.title}</legend><div class="os-preference-options" data-options="${group.options.length}">${group.options.map(([value, label]) => `<label><input type="radio" name="os-${group.key}" data-os-preference="${group.key}" value="${value}"${selected[group.key] === value ? " checked" : ""}${group.key === "startup" && !remember ? " disabled" : ""}><span>${label}</span></label>`).join("")}</div>${group.key === "startup" ? `<small data-os-startup-note>${remember ? "" : "Local memory required."}</small>` : ""}</fieldset>`).join("")}
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
        input.disabled = input.dataset.osPreference === "startup" && !remember;
      }
      dialog.querySelector("[data-os-memory]").textContent = remember ? "ENABLED" : "SESSION ONLY";
      dialog.querySelector("[data-os-startup-note]").textContent = remember ? "" : "Local memory required.";
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
  return { normalizeStartupMode, readStartupMode, saveStartupMode, normalizeValues, renderContent, createController };
});
