(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.GestaltWorkspaceTools = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  const engines = Object.freeze([
    Object.freeze({ id: "duckduckgo", label: "DuckDuckGo", url: "https://duckduckgo.com/", parameter: "q" }),
    Object.freeze({ id: "google", label: "Google", url: "https://www.google.com/search", parameter: "q" }),
    Object.freeze({ id: "yandex", label: "Yandex", url: "https://yandex.com/search/", parameter: "text" })
  ]);
  const connections = Object.freeze([
    Object.freeze({ name: "X", detail: "@Eitomausu", url: "https://x.com/Eitomausu" }),
    Object.freeze({ name: "Reddit", detail: "u/youhen", url: "https://www.reddit.com/user/youhen/" })
  ]);
  const engineKey = "gestalt.web-search-engine";
  function normalizeEngine(value) { return engines.some((engine) => engine.id === value) ? value : engines[0].id; }
  function searchUrl(engineId, query) {
    if (typeof query !== "string" || !query.trim() || query.length > 1000) return null;
    const engine = engines.find((item) => item.id === normalizeEngine(engineId));
    const url = new URL(engine.url);
    url.searchParams.set(engine.parameter, query.trim());
    return url.href;
  }
  function shouldOpenSearch(event, state, doc) {
    if (String(event.key).toLowerCase() !== "s" || event.defaultPrevented || event.repeat || event.isComposing || event.ctrlKey || event.metaKey || event.altKey || event.shiftKey || !state.ready || state.busy || doc.hidden) return false;
    if (event.target?.closest?.('input, textarea, select, [contenteditable]:not([contenteditable="false"]), [role="textbox"], [role="combobox"]')) return false;
    return !doc.querySelector('dialog[open], [role="dialog"]:not([aria-hidden="true"]):not([inert]), .archive-shell[data-nav-open]');
  }
  function renderConnections() {
    return `<article class="connections-sheet"><div class="connections-acquire" aria-hidden="true"><span>// ACQUIRING SIGNAL</span><i></i></div><header class="connections-heading"><div class="connections-identity"><span>// CONNECTIONS</span><h2>Eightmouse</h2></div><div class="window-actions"><button type="button" data-window-action="close" data-web-close aria-label="Close Connections">close</button></div></header><nav class="connection-register" aria-label="External channels">${connections.map((item) => item.url
      ? `<a href="${item.url}" target="_blank" rel="noopener noreferrer" referrerpolicy="no-referrer"><b>${item.name}</b><span>${item.detail}</span><i aria-hidden="true">&#8599;</i></a>`
      : `<span class="connection-pending" aria-disabled="true"><b>${item.name}</b><span>${item.detail}</span></span>`).join("")}</nav><footer>GESTALT / PUBLIC CHANNELS</footer></article>`;
  }
  function createController(host = globalThis.window) {
    const doc = host.document;
    let dialog = null, trigger = null, onClose = null, engine = engines[0].id;
    function close() {
      if (!dialog) return;
      const node = dialog;
      dialog = null;
      if (node.open) node.close();
      node.remove();
      doc.querySelector(".archive-shell")?.removeAttribute("data-workspace-tool-open");
      if (trigger && trigger !== doc.body && trigger.isConnected && trigger.getClientRects().length && !trigger.closest("[inert]")) trigger.focus({ preventScroll: true });
      else for (const control of doc.querySelectorAll("[data-search-toggle], .archive-menu-toggle")) {
        if (control.getClientRects().length && !control.closest("[inert]")) { control.focus({ preventScroll: true }); break; }
      }
      trigger = null;
      onClose = null;
    }
    function open(options = {}) {
      if (dialog) return;
      const isConnections = options.mode === "connections";
      trigger = doc.activeElement;
      onClose = options.onClose;
      if (options.remember && !isConnections) {
        try { engine = normalizeEngine(host.localStorage.getItem(engineKey)); } catch { /* Use this visit's choice. */ }
      }
      dialog = doc.createElement("dialog");
      dialog.className = isConnections ? "connections-dialog" : "web-search-dialog";
      dialog.setAttribute("aria-label", isConnections ? "Connections" : "Web search");
      dialog.innerHTML = isConnections ? renderConnections() : `<div class="web-search-shell"><div class="web-search-access" aria-hidden="true"></div><form class="web-search-form"><div class="web-search-heading"><label for="gestalt-web-query">// WEB SEARCH</label></div><div class="web-search-row"><select aria-label="Search engine">${engines.map((item) => `<option value="${item.id}"${item.id === engine ? " selected" : ""}>${item.label}</option>`).join("")}</select><input id="gestalt-web-query" type="search" aria-label="Search the web" placeholder="Search the web" autocomplete="off" autocapitalize="off" spellcheck="false" maxlength="1000" required></div><p class="web-search-error" role="status" hidden>Search could not open. Try again.</p></form></div>`;
      const dismiss = () => { const callback = onClose; close(); callback?.(); };
      dialog.addEventListener("keydown", (event) => {
        event.stopPropagation();
        if (!isConnections && event.key !== "Escape") event.currentTarget.setAttribute("data-search-ready", "");
        if (event.key === "Escape" && !event.isComposing) { event.preventDefault(); dismiss(); }
      });
      dialog.addEventListener("cancel", (event) => { event.preventDefault(); event.stopPropagation(); dismiss(); });
      dialog.addEventListener("click", (event) => {
        event.stopPropagation();
        if (event.target === dialog || event.target.closest?.("[data-web-close]")) dismiss();
      });
      if (!isConnections) {
        const searchDialog = dialog;
        const settleSearch = () => searchDialog.setAttribute("data-search-ready", "");
        searchDialog.addEventListener("input", settleSearch, { once: true });
        searchDialog.addEventListener("pointerdown", settleSearch, { once: true });
        const select = dialog.querySelector("select");
        select.addEventListener("change", () => {
          engine = normalizeEngine(select.value);
          if (options.remember) {
            try { host.localStorage.setItem(engineKey, engine); } catch { /* Session choice still applies. */ }
          }
        });
        dialog.querySelector("form").addEventListener("submit", (event) => {
          event.preventDefault();
          event.stopPropagation();
          const url = searchUrl(select.value, dialog.querySelector("input").value);
          if (!url) return;
          try { host.open(url, "_blank", "noopener,noreferrer"); }
          catch { dialog.querySelector(".web-search-error").hidden = false; }
        });
      }
      doc.body.append(dialog);
      dialog.showModal();
      doc.querySelector(".archive-shell")?.setAttribute("data-workspace-tool-open", "");
      dialog.querySelector(isConnections ? "[data-web-close]" : "input")?.focus({ preventScroll: true });
    }
    return { open, close, destroy: close };
  }
  return Object.freeze({ engines, connections, normalizeEngine, searchUrl, shouldOpenSearch, renderConnections, createController });
});
