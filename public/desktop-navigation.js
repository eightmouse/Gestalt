(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.GestaltDesktopNavigation = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  const key = "gestalt.desktop-navigation";
  const noticesKey = "gestalt.shortcut-notices";
  const noticesRevision = "seen-with-web-search";
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
    let shell = null, sidebar = null, terminal = null, workspace = null;
    let workspaceWasInert = false, detach = () => {}, returnFocus = null;
    let settings = { mode: "fixed", ready: false, busy: false, palette: false, remember: false };
    let open = false, minimized = false, maximized = false, destroyed = false, hintSeen = false;
    let hintTimer = null, hintReady = false, hintHovered = false, hintFocused = false, noticesOpen = false;
    const enabled = () => settings.mode === "terminal" && desktop.matches && Boolean(shell) && Boolean(terminal);
    const blocked = () => !settings.ready || settings.busy || doc.hidden || Boolean(doc.querySelector("dialog[open]"));
    const noticesVisible = () => desktop.matches && Boolean(shell) && settings.ready;
    const noticesAvailable = () => noticesVisible() && !blocked() && !settings.palette && !open;
    const canHint = () => noticesAvailable() && !noticesOpen && !minimized && !hintSeen;
    function rememberIntroduction() {
      if (!settings.remember) return;
      try { host.localStorage.setItem(noticesKey, noticesRevision); }
      catch { /* The notice still works for this visit. */ }
    }
    function updateHintDelay() {
      if (!canHint()) {
        if (hintTimer !== null) host.clearTimeout(hintTimer);
        hintTimer = null;
        if (hintReady) hintSeen = true;
        hintReady = false;
      } else if (hintReady && (hintHovered || hintFocused)) {
        if (hintTimer !== null) host.clearTimeout(hintTimer);
        hintTimer = null;
      } else if (hintTimer === null) {
        hintTimer = host.setTimeout(() => {
          hintTimer = null;
          if (destroyed || !canHint()) return;
          if (hintReady) acknowledgeHint();
          else { hintReady = true; rememberIntroduction(); }
          paint();
        }, hintReady ? 5000 : 1200);
      }
    }
    function acknowledgeHint() {
      hintSeen = true;
      rememberIntroduction();
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
      shell.toggleAttribute("data-notices-visible", noticesVisible());
      shell.toggleAttribute("data-notices-available", noticesAvailable());
      shell.toggleAttribute("data-notices-open", noticesOpen && noticesAvailable());
      const noticeButton = shell.querySelector("[data-system-notices-toggle]");
      if (noticeButton) {
        noticeButton.inert = !noticesAvailable();
        noticeButton.disabled = !noticesAvailable();
        noticeButton.setAttribute("aria-hidden", String(!noticesVisible()));
        noticeButton.setAttribute("aria-expanded", String(noticesOpen && noticesAvailable()));
      }
      const notices = shell.querySelector(".system-notices-panel");
      if (notices) { notices.inert = !noticesOpen || !noticesAvailable(); notices.setAttribute("aria-hidden", String(notices.inert)); }
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
      if (!noticesAvailable()) noticesOpen = false;
      if (!enabled()) { open = false; minimized = false; maximized = false; }
      else if (blocked() || settings.palette) open = false;
      paint();
    }
    function restoreFocus() {
      const search = workspace?.querySelector('[aria-label="Search records"]');
      const target = returnFocus?.isConnected && returnFocus.tabIndex >= 0 && !returnFocus.inert && returnFocus !== search && !terminal?.contains(returnFocus) ? returnFocus : workspace;
      if (target === workspace) target?.setAttribute("tabindex", "-1");
      target?.focus({ preventScroll: true });
    }
    function closeNotices(restore = true) {
      noticesOpen = false; paint();
      if (restore) shell?.querySelector("[data-system-notices-toggle]")?.focus({ preventScroll: true });
    }
    function outsideNoticeClick(event) {
      if (!noticesOpen || event.target?.closest?.(".system-notices-panel, [data-system-notices-toggle]")) return;
      event.preventDefault(); event.stopPropagation(); closeNotices();
    }
    function show() {
      if (!enabled() || blocked() || settings.palette) return;
      if (!terminal?.contains(doc.activeElement) && !doc.activeElement?.closest?.("[data-desktop-terminal-restore]")) returnFocus = doc.activeElement;
      acknowledgeHint();
      noticesOpen = false;
      open = true; minimized = false; paint();
      (terminal?.querySelector('[aria-current="page"]') || terminal?.querySelector("[data-directory-section]"))?.focus();
    }
    function hide(minimize = false, restore = true) {
      open = false; minimized = minimize; paint();
      if (restore) restoreFocus();
    }
    function click(event) {
      const target = event.target;
      if (target.closest?.("[data-system-notices-open]")) {
        event.preventDefault(); event.stopPropagation();
        if (!noticesAvailable()) return;
        acknowledgeHint(); noticesOpen = true; paint();
        shell.querySelector(".system-notices-panel")?.focus({ preventScroll: true });
      } else if (target.closest?.("[data-system-notices-toggle]")) {
        event.preventDefault(); event.stopPropagation();
        if (!noticesAvailable()) return;
        acknowledgeHint(); noticesOpen = !noticesOpen; paint();
        if (noticesOpen) shell.querySelector(".system-notices-panel")?.focus({ preventScroll: true });
      } else if (target.closest?.("[data-system-notices-close]")) {
        event.preventDefault(); event.stopPropagation(); closeNotices();
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
      if (noticesOpen && event.key === "Escape") {
        event.preventDefault(); event.stopPropagation(); closeNotices(); return;
      }
      if (noticesOpen && !event.repeat && !event.isComposing && !event.ctrlKey && !event.altKey && !event.metaKey && ["t", "s", "~", "`"].includes(event.key?.toLowerCase()) && !event.target?.closest?.('input, textarea, select, [contenteditable]:not([contenteditable="false"]), [role="textbox"]')) closeNotices(false);
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
    doc.addEventListener("click", outsideNoticeClick, true);
    return {
      attach(nextShell, nextSettings) {
        if (destroyed) return;
        const focusAfterAttach = nextShell !== shell && workspace?.querySelector('[aria-label="Search records"]') === doc.activeElement;
        const workspaceFocusAfterAttach = nextShell !== shell && workspace === doc.activeElement;
        settings = { ...nextSettings, mode: normalizeMode(nextSettings.mode) };
        if (settings.remember && !hintReady) {
          try { hintSeen = hintSeen || host.localStorage.getItem(noticesKey) === noticesRevision; }
          catch { /* Storage is optional. */ }
        }
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
          const attachedHint = shell?.querySelector(".desktop-terminal-hint");
          hintHovered = false; hintFocused = false;
          const enterHint = () => { hintHovered = true; updateHintDelay(); };
          const leaveHint = () => { hintHovered = false; updateHintDelay(); };
          const focusHint = () => { hintFocused = true; updateHintDelay(); };
          const blurHint = (event) => { hintFocused = Boolean(event.relatedTarget && attachedHint?.contains(event.relatedTarget)); updateHintDelay(); };
          attachedHint?.addEventListener("mouseenter", enterHint);
          attachedHint?.addEventListener("mouseleave", leaveHint);
          attachedHint?.addEventListener("focusin", focusHint);
          attachedHint?.addEventListener("focusout", blurHint);
          detach = () => {
            attachedShell?.removeEventListener("click", click);
            attachedHint?.removeEventListener("mouseenter", enterHint);
            attachedHint?.removeEventListener("mouseleave", leaveHint);
            attachedHint?.removeEventListener("focusin", focusHint);
            attachedHint?.removeEventListener("focusout", blurHint);
          };
        }
        refresh();
        if (focusAfterAttach && enabled() && !blocked()) workspace?.querySelector('[aria-label="Search records"]')?.focus();
        if (workspaceFocusAfterAttach && !blocked()) { workspace?.setAttribute("tabindex", "-1"); workspace?.focus({ preventScroll: true }); }
      },
      destroy() {
        destroyed = true; detach();
        if (hintTimer !== null) host.clearTimeout(hintTimer);
        hintTimer = null;
        desktop.removeEventListener("change", refresh);
        doc.removeEventListener("visibilitychange", refresh);
        doc.removeEventListener("keydown", keydown, true);
        doc.removeEventListener("click", outsideNoticeClick, true);
        if (sidebar) { sidebar.inert = false; sidebar.removeAttribute("aria-hidden"); }
        if (workspace) workspace.inert = workspaceWasInert;
        if (terminal) { terminal.inert = true; terminal.setAttribute("aria-hidden", "true"); }
        const restore = shell?.querySelector(".desktop-terminal-restore");
        if (restore) { restore.inert = true; restore.setAttribute("aria-hidden", "true"); }
        if (shell) for (const name of ["data-desktop-nav", "data-nav-wide", "data-nav-open", "data-nav-minimized", "data-nav-maximized", "data-nav-blocked", "data-terminal-hint", "data-notices-open", "data-notices-visible", "data-notices-available"]) shell.removeAttribute(name);
        shell = null; sidebar = null; terminal = null; workspace = null; returnFocus = null;
      }
    };
  }
  return Object.freeze({ normalizeMode, readMode, saveMode, directoryRows, createController });
});
