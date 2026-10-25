(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.GestaltDesktopNavigation = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  const key = "gestalt.desktop-navigation";
  function normalizeMode(value) { return value === "terminal" || value === "auto" ? "terminal" : "fixed"; }
  function readMode(storage) {
    try { return normalizeMode((storage || globalThis.localStorage).getItem(key)); }
    catch { return "fixed"; }
  }
  function saveMode(value, storage) {
    try { (storage || globalThis.localStorage).setItem(key, normalizeMode(value)); }
    catch { /* The selected mode still works for this visit. */ }
  }

  function directoryRows(entries) {
    const rows = ["system", "projects", "games", "logs", "setup", "archive"].map((id, index) => ({
      id, name: `${String(index + 1).padStart(2, "0")}_${id === "system" ? "dashboard" : id}`, date: ""
    }));
    for (const entry of entries) {
      if (!entry || entry.section === "system" || !rows.some((row) => row.id === entry.section) || typeof entry.date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(entry.date)) continue;
      const parsed = new Date(`${entry.date}T00:00:00Z`);
      if (!Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== entry.date) continue;
      const section = entry.section === "logs" && entry.archived ? "archive" : entry.section;
      for (const row of rows) if ((row.id === "system" || row.id === section) && entry.date > row.date) row.date = entry.date;
    }
    return rows;
  }

  function createController(host = globalThis.window) {
    const doc = host.document;
    const desktop = host.matchMedia("(min-width: 1181px) and (min-height: 700px) and (hover: hover) and (pointer: fine)");
    const hintKey = "gestalt.terminal-hint";
    let shell = null, sidebar = null, terminal = null, workspace = null;
    let workspaceWasInert = false, detach = () => {}, returnFocus = null;
    let settings = { mode: "fixed", ready: false, busy: false, palette: false, remember: false };
    let open = false, minimized = false, maximized = false, destroyed = false, hintSeen = false, hintRead = false;
    let hintTimer = null, hintReady = false;
    const enabled = () => settings.mode === "terminal" && desktop.matches && Boolean(shell) && Boolean(terminal);
    const blocked = () => !settings.ready || settings.busy || doc.hidden || Boolean(doc.querySelector("dialog[open]"));
    const canHint = () => enabled() && !blocked() && !settings.palette && !open && !minimized && !hintSeen;
    function updateHintDelay() {
      if (!canHint()) {
        if (hintTimer !== null) host.clearTimeout(hintTimer);
        hintTimer = null;
        hintReady = false;
      } else if (!hintReady && hintTimer === null) {
        hintTimer = host.setTimeout(() => {
          hintTimer = null;
          if (destroyed || !canHint()) return;
          hintReady = true;
          paint();
        }, 3000);
      }
    }
    function acknowledgeHint() {
      hintSeen = true;
      if (settings.remember) {
        try { host.localStorage.setItem(hintKey, "seen"); }
        catch { /* Session-only dismissal still works. */ }
      }
    }
    function paint() {
      if (!shell) return;
      const wide = enabled(), shown = wide && open && !blocked(), compact = wide && minimized && !blocked();
      updateHintDelay();
      const layoutChanged = shell.hasAttribute("data-nav-wide") !== wide;
      shell.toggleAttribute("data-desktop-nav", wide);
      shell.toggleAttribute("data-nav-wide", wide);
      shell.toggleAttribute("data-nav-open", shown);
      shell.toggleAttribute("data-nav-minimized", compact);
      shell.toggleAttribute("data-nav-maximized", shown && maximized);
      shell.toggleAttribute("data-nav-blocked", blocked());
      shell.toggleAttribute("data-terminal-hint", canHint() && hintReady);
      if (sidebar) {
        sidebar.inert = wide;
        if (wide) sidebar.setAttribute("aria-hidden", "true");
        else sidebar.removeAttribute("aria-hidden");
      }
      if (terminal) {
        terminal.inert = !shown;
        terminal.setAttribute("aria-hidden", String(!shown));
        if (shown) terminal.setAttribute("aria-modal", "true");
        else terminal.removeAttribute("aria-modal");
        terminal.querySelector("[data-desktop-terminal-maximize]")?.setAttribute("aria-label", maximized ? "Restore terminal size" : "Maximize terminal");
      }
      const restore = shell.querySelector(".desktop-terminal-restore");
      if (restore) { restore.inert = !compact; restore.setAttribute("aria-hidden", String(!compact)); }
      if (workspace) workspace.inert = workspaceWasInert || shown;
      const hint = shell.querySelector(".desktop-terminal-hint");
      if (hint) { hint.inert = !shell.hasAttribute("data-terminal-hint"); hint.setAttribute("aria-hidden", String(hint.inert)); }
      if (layoutChanged) shell.dispatchEvent(new host.Event("gestalt:navigation-layout", { bubbles: true }));
    }
    function refresh() {
      if (destroyed) return;
      if (settings.remember && !hintRead) {
        hintRead = true;
        try { hintSeen ||= host.localStorage.getItem(hintKey) === "seen"; }
        catch { /* An unavailable store must not block navigation. */ }
      }
      if (!enabled()) { open = false; minimized = false; maximized = false; }
      else if (blocked() || settings.palette) open = false;
      paint();
    }
    function restoreFocus() {
      const target = returnFocus?.isConnected && returnFocus.tabIndex >= 0 && !terminal?.contains(returnFocus) ? returnFocus : workspace?.querySelector('[aria-label="Search records"]');
      target?.focus({ preventScroll: true });
    }
    function show() {
      if (!enabled() || blocked() || settings.palette) return;
      if (!terminal?.contains(doc.activeElement) && !doc.activeElement?.closest?.("[data-desktop-terminal-restore]")) returnFocus = doc.activeElement;
      acknowledgeHint();
      open = true; minimized = false; paint();
      (terminal?.querySelector('[aria-current="page"]') || terminal?.querySelector("[data-directory-section]"))?.focus();
    }
    function hide(minimize = false, restore = true) {
      open = false; minimized = minimize; paint();
      if (restore) restoreFocus();
    }
    function click(event) {
      const target = event.target;
      if (target.closest?.("[data-desktop-terminal-hint-dismiss]")) {
        event.preventDefault(); event.stopPropagation(); acknowledgeHint(); paint(); restoreFocus();
      } else if (target.closest?.("[data-desktop-terminal-restore]")) {
        event.preventDefault(); event.stopPropagation(); show();
      } else if (target.closest?.("[data-desktop-terminal-minimize]")) {
        event.preventDefault(); event.stopPropagation(); hide(true);
      } else if (target.closest?.("[data-desktop-terminal-maximize]")) {
        event.preventDefault(); event.stopPropagation(); maximized = !maximized; paint();
      } else if (target.closest?.("[data-desktop-nav-dismiss]")) {
        event.preventDefault(); event.stopPropagation(); hide();
      } else if (terminal?.contains(target) && target.closest?.("[data-directory-section]")) {
        hide(true);
      }
    }
    function keydown(event) {
      if (!enabled() || blocked()) return;
      const editing = event.target?.closest?.('input, textarea, select, [contenteditable]:not([contenteditable="false"]), [role="textbox"]');
      if (!editing && !settings.palette && !event.repeat && !event.isComposing && !event.ctrlKey && !event.altKey && !event.metaKey && event.key?.toLowerCase() === "t") {
        event.preventDefault(); event.stopPropagation(); if (!open) show(); return;
      }
      if (!open) return;
      event.stopPropagation();
      if (event.key === "Escape") {
        event.preventDefault(); hide();
      } else if (event.key === "Tab") {
        const buttons = [...terminal.querySelectorAll('button:not([disabled])')];
        const index = buttons.indexOf(doc.activeElement);
        if (index === -1 || (!event.shiftKey && index === buttons.length - 1) || (event.shiftKey && index === 0)) {
          event.preventDefault();
          (event.shiftKey ? buttons.at(-1) : buttons[0])?.focus();
        }
      }
    }
    desktop.addEventListener("change", refresh);
    doc.addEventListener("visibilitychange", refresh);
    doc.addEventListener("keydown", keydown, true);
    return {
      attach(nextShell, nextSettings) {
        if (destroyed) return;
        const focusAfterAttach = nextShell !== shell && workspace?.querySelector('[aria-label="Search records"]') === doc.activeElement;
        settings = { ...nextSettings, mode: normalizeMode(nextSettings.mode) };
        if (nextShell !== shell) {
          detach();
          if (workspace) workspace.inert = workspaceWasInert;
          if (sidebar) { sidebar.inert = false; sidebar.removeAttribute("aria-hidden"); }
          shell = nextShell;
          sidebar = shell?.querySelector(":scope > .sidebar") || null;
          terminal = shell?.querySelector(".desktop-nav-terminal") || null;
          workspace = shell?.querySelector(":scope > .workspace") || null;
          workspaceWasInert = Boolean(workspace?.inert);
          open = false;
          shell?.addEventListener("click", click);
          const attachedShell = shell;
          detach = () => attachedShell?.removeEventListener("click", click);
        }
        refresh();
        if (focusAfterAttach && enabled() && !blocked()) workspace?.querySelector('[aria-label="Search records"]')?.focus();
      },
      destroy() {
        destroyed = true; detach();
        if (hintTimer !== null) host.clearTimeout(hintTimer);
        hintTimer = null;
        desktop.removeEventListener("change", refresh);
        doc.removeEventListener("visibilitychange", refresh);
        doc.removeEventListener("keydown", keydown, true);
        if (sidebar) { sidebar.inert = false; sidebar.removeAttribute("aria-hidden"); }
        if (workspace) workspace.inert = workspaceWasInert;
        if (terminal) { terminal.inert = true; terminal.setAttribute("aria-hidden", "true"); }
        const restore = shell?.querySelector(".desktop-terminal-restore");
        if (restore) { restore.inert = true; restore.setAttribute("aria-hidden", "true"); }
        if (shell) for (const name of ["data-desktop-nav", "data-nav-wide", "data-nav-open", "data-nav-minimized", "data-nav-maximized", "data-nav-blocked", "data-terminal-hint"]) shell.removeAttribute(name);
        shell = null; sidebar = null; terminal = null; workspace = null; returnFocus = null;
      }
    };
  }
  return Object.freeze({ normalizeMode, readMode, saveMode, directoryRows, createController });
});
