(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.GestaltDesktopNavigation = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  const key = "gestalt.desktop-navigation";
  function normalizeMode(value) { return value === "auto" ? "auto" : "fixed"; }
  function readMode(storage) {
    try { return normalizeMode((storage || globalThis.localStorage).getItem(key)); }
    catch { return "fixed"; }
  }
  function saveMode(value, storage) {
    try { (storage || globalThis.localStorage).setItem(key, normalizeMode(value)); }
    catch { /* The selected mode still works for this visit. */ }
  }

  function createController(host = globalThis.window) {
    const doc = host.document;
    const desktop = host.matchMedia("(min-width: 1181px) and (min-height: 700px) and (hover: hover) and (pointer: fine)");
    const reduced = host.matchMedia("(prefers-reduced-motion: reduce)");
    const timers = new Map();
    let shell = null, sidebar = null, detach = () => {};
    let settings = { mode: "fixed", ready: false, busy: false, palette: false };
    let reclaimed = false, open = false, inside = false, shifting = false, destroyed = false;
    const enabled = () => settings.mode === "auto" && desktop.matches && Boolean(shell);
    const blocked = () => !settings.ready || settings.busy || doc.hidden || Boolean(doc.querySelector("dialog[open]"));
    const introBlocked = () => blocked() || settings.palette;
    const focused = () => Boolean(sidebar?.contains(doc.activeElement));
    function clear(name) {
      if (timers.has(name)) host.clearTimeout(timers.get(name));
      timers.delete(name);
    }
    function later(name, delay, callback) {
      clear(name);
      timers.set(name, host.setTimeout(() => { timers.delete(name); if (!destroyed) callback(); }, delay));
    }
    function paint() {
      if (!shell) return;
      const active = enabled(), wide = active && reclaimed, shown = wide && open && !blocked();
      const layoutChanged = shell.hasAttribute("data-nav-wide") !== wide;
      shell.toggleAttribute("data-desktop-nav", active);
      shell.toggleAttribute("data-nav-wide", wide);
      shell.toggleAttribute("data-nav-open", shown);
      shell.toggleAttribute("data-nav-blocked", blocked());
      shell.toggleAttribute("data-nav-shifting", active && shifting);
      if (sidebar) {
        sidebar.inert = wide && !shown;
        if (sidebar.inert) sidebar.setAttribute("aria-hidden", "true");
        else sidebar.removeAttribute("aria-hidden");
      }
      shell.querySelector("[data-desktop-nav-toggle]")?.setAttribute("aria-expanded", String(shown));
      if (layoutChanged) shell.dispatchEvent(new host.Event("gestalt:navigation-layout", { bubbles: true }));
    }
    function cancelShift() {
      clear("commit"); clear("finish"); shifting = false;
    }
    function reclaim() {
      if (!enabled() || introBlocked() || inside || focused()) { refresh(); return; }
      if (reduced.matches) {
        reclaimed = true; open = false; paint(); return;
      }
      shifting = true;
      paint();
      later("commit", 150, () => {
        if (!enabled() || introBlocked() || inside || focused()) { cancelShift(); refresh(); return; }
        reclaimed = true; open = false; paint();
      });
      later("finish", 420, () => { shifting = false; paint(); });
    }
    function refresh() {
      if (destroyed) return;
      if (!enabled()) { clear("intro"); clear("hide"); clear("focus"); cancelShift(); open = false; }
      else if (blocked()) { clear("intro"); clear("hide"); clear("focus"); cancelShift(); open = false; }
      if (enabled() && !reclaimed && !shifting && !introBlocked() && !inside && !focused()) {
        if (!timers.has("intro")) later("intro", 5500, reclaim);
      } else clear("intro");
      paint();
    }
    function show(keyboard = false) {
      if (!enabled() || !reclaimed || blocked()) return;
      clear("hide"); open = true; paint();
      if (keyboard) {
        const focus = () => { if (open && enabled() && !blocked()) sidebar?.querySelector(".brand")?.focus(); };
        focus();
        if (!focused()) later("focus", reduced.matches ? 0 : 570, focus);
      }
    }
    function close(restore = false) {
      clear("hide"); clear("focus"); open = false; paint();
      if (restore) shell?.querySelector("[data-desktop-nav-toggle]")?.focus();
    }
    function leave() {
      inside = false;
      if (reclaimed && open) later("hide", 500, () => { if (!inside && !focused() && !timers.has("focus")) close(); });
      refresh();
    }
    function enter() { inside = true; clear("intro"); clear("hide"); show(); }
    function click(event) {
      const target = event.target;
      if (target.closest?.("[data-desktop-nav-toggle]")) {
        event.preventDefault(); event.stopPropagation();
        show(event.detail === 0);
      } else if (target.closest?.("[data-desktop-nav-dismiss]")) {
        event.preventDefault(); event.stopPropagation(); close(true);
      } else if (sidebar?.contains(target) && target.closest?.(".nav-trigger, .brand") && reclaimed) {
        close(focused());
      }
    }
    function keydown(event) {
      if (event.key === "Escape" && open && enabled() && !blocked()) {
        event.preventDefault(); event.stopPropagation(); close(true);
      }
    }
    function focusin() { clear("hide"); refresh(); }
    function focusout() {
      Promise.resolve().then(() => { if (!destroyed) { if (!focused()) leave(); else refresh(); } });
    }
    function motionChanged() {
      if (reduced.matches && shifting) {
        cancelShift();
        if (enabled() && !blocked() && !focused()) { reclaimed = true; open = false; }
      }
      refresh();
    }
    function visibilityChanged() { if (doc.hidden) inside = false; refresh(); }
    desktop.addEventListener("change", refresh);
    reduced.addEventListener("change", motionChanged);
    doc.addEventListener("visibilitychange", visibilityChanged);

    return {
      attach(nextShell, nextSettings) {
        if (destroyed) return;
        settings = { ...nextSettings, mode: normalizeMode(nextSettings.mode) };
        if (nextShell !== shell) {
          detach();
          shell = nextShell;
          sidebar = shell?.querySelector(":scope > .sidebar") || null;
          inside = false;
          const edge = shell?.querySelector("[data-desktop-nav-toggle]");
          const bindings = [[sidebar, "pointerenter", enter], [sidebar, "pointerleave", leave], [edge, "pointerenter", enter], [edge, "pointerleave", leave], [shell, "click", click], [shell, "keydown", keydown], [shell, "focusin", focusin], [shell, "focusout", focusout]];
          for (const [node, name, handler] of bindings) node?.addEventListener(name, handler);
          detach = () => { for (const [node, name, handler] of bindings) node?.removeEventListener(name, handler); };
        }
        refresh();
      },
      destroy() {
        destroyed = true;
        detach();
        for (const name of [...timers.keys()]) clear(name);
        desktop.removeEventListener("change", refresh);
        reduced.removeEventListener("change", motionChanged);
        doc.removeEventListener("visibilitychange", visibilityChanged);
        if (sidebar) { sidebar.inert = false; sidebar.removeAttribute("aria-hidden"); }
        if (shell) for (const name of ["data-desktop-nav", "data-nav-wide", "data-nav-open", "data-nav-blocked", "data-nav-shifting"]) shell.removeAttribute(name);
        shell = null; sidebar = null;
      }
    };
  }
  return Object.freeze({ normalizeMode, readMode, saveMode, createController });
});
