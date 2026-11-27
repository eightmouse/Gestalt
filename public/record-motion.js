(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.GestaltRecordMotion = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  function guardEntryReveal(node, host) {
    if (!node.matches?.(".record-window") || !host.MutationObserver) return () => {};
    const guarded = new Set();
    const release = () => {
      for (const region of guarded) region.removeAttribute("inert");
      guarded.clear();
    };
    const sync = () => {
      if (!node.classList.contains("is-access-pending")) { release(); return; }
      // Keep the scroll containers active while their contents are gated.
      for (const region of node.querySelectorAll(":scope > .record-layout > *, :scope > .record-link-feedback, :scope > .window-bar .window-control-group, :scope > .setup-window-shell :is(.setup-prompt-actions, .setup-console-body, .setup-note-file-shell, .setup-notes-terminal)")) {
        if (region.hasAttribute("inert")) continue;
        region.setAttribute("inert", "");
        guarded.add(region);
      }
    };
    const observer = new host.MutationObserver(sync);
    sync();
    observer.observe(node, { attributes: true, attributeFilter: ["class"] });
    return () => { observer.disconnect(); release(); };
  }

  function focusWithin(node, host = globalThis.window) {
    if (!node) return () => {};
    const doc = host.document;
    const previous = doc.activeElement;
    const releaseReveal = guardEntryReveal(node, host);
    const tabbable = () => [...node.querySelectorAll("button, a[href], input, select, textarea, summary, [tabindex]")]
      .filter((control) => control.tabIndex >= 0 && !control.disabled && control.getClientRects().length && !control.closest("[inert], [hidden]"));
    const onKey = (event) => {
      if (event.key !== "Tab" || event.defaultPrevented) return;
      const controls = tabbable();
      if (node.classList?.contains("is-access-pending")) {
        event.preventDefault();
        (controls.find((control) => control.matches(".pocket-record-back")) || node).focus({ preventScroll: true });
        return;
      }
      const current = controls.indexOf(doc.activeElement);
      if (!controls.length || current === -1 || event.shiftKey && current === 0 || !event.shiftKey && current === controls.length - 1) {
        event.preventDefault();
        (event.shiftKey ? controls.at(-1) || node : controls[0] || node).focus({ preventScroll: true });
      }
    };
    node.addEventListener("keydown", onKey);
    node.focus({ preventScroll: true });
    return () => {
      node.removeEventListener("keydown", onKey);
      releaseReveal();
      // Do not steal focus from a restore button or a nested window.
      if (doc.activeElement !== doc.body && !node.contains(doc.activeElement)) return;
      const target = previous !== doc.body && previous?.isConnected && previous.getClientRects().length && !previous.closest("[inert], [hidden]")
        ? previous : [...doc.querySelectorAll("[data-search-toggle], .archive-menu-toggle")].find((control) => control.getClientRects().length && !control.closest("[inert], [hidden]"));
      target?.focus({ preventScroll: true });
    };
  }
  function createController(host = globalThis.window) {
    const doc = host.document;
    let active = null;
    function cancel() { active?.cancel(); }
    function run({ node, target, enabled = true, onComplete }, closing = false) {
      if (active) return;
      const motion = host.matchMedia("(prefers-reduced-motion: reduce)");
      const hide = () => {
        if (!node) return;
        for (const media of node.querySelectorAll?.("video, audio") ?? []) media.pause();
        node.hidden = true;
      };
      if (!node || !enabled || motion.matches || doc.hidden || typeof node.animate !== "function") {
        hide();
        onComplete();
        return;
      }
      if (!closing) target?.setAttribute?.("data-motion-destination", "");
      const rect = node.getBoundingClientRect();
      const destination = target?.getBoundingClientRect();
      const x = destination?.width ? destination.left + destination.width / 2 : host.innerWidth - 110;
      const y = destination?.height ? destination.top + destination.height / 2 : host.innerHeight - 36;
      const dx = x - rect.left - rect.width / 2;
      const dy = y - rect.top - rect.height / 2;
      const style = host.getComputedStyle(node);
      const base = style.transform === "none" ? "" : style.transform;
      const opacityValue = Number.parseFloat(style.opacity);
      const opacity = Number.isFinite(opacityValue) ? opacityValue : 1;
      const endX = Math.max(0.03, Math.min(0.14, (destination?.width || 44) / Math.max(1, rect.width)));
      const endY = Math.max(0.03, Math.min(0.14, (destination?.height || 44) / Math.max(1, rect.height)));
      const wasInert = node.inert;
      let animation, finished = false;
      const contents = [];
      const consume = (event) => { event.preventDefault(); event.stopImmediatePropagation(); };
      const cleanup = () => {
        doc.removeEventListener("click", consume, true);
        doc.removeEventListener("keydown", consume, true);
        doc.removeEventListener("visibilitychange", onVisibility);
        motion.removeEventListener("change", onMotion);
        node.removeAttribute("data-record-retracting");
        node.removeAttribute("data-record-closing");
        node.removeAttribute("data-record-content-hidden");
        target?.removeAttribute?.("data-motion-destination");
        node.inert = wasInert;
        active = null;
      };
      const finish = () => {
        if (finished) return;
        finished = true;
        // Hide before cancelling the filled animation so the original frame cannot flash back.
        hide();
        cleanup();
        for (const content of contents) content.cancel();
        animation?.cancel();
        onComplete();
      };
      const onVisibility = () => { if (doc.hidden) finish(); };
      const onMotion = () => { if (motion.matches) finish(); };
      active = { cancel() {
        if (finished) return;
        finished = true;
        cleanup();
        for (const content of contents) content.cancel();
        animation?.cancel();
      } };
      node.inert = true;
      node.setAttribute("data-record-retracting", "");
      if (closing) node.setAttribute("data-record-closing", "");
      doc.addEventListener("click", consume, true);
      doc.addEventListener("keydown", consume, true);
      doc.addEventListener("visibilitychange", onVisibility);
      motion.addEventListener("change", onMotion);
      try {
        if (closing && node.classList.contains("is-field-paper-reader")) {
          animation = node.animate([
            { transform: `${base} translateY(0) rotate(0deg)`, opacity },
            { transform: `${base} translateY(16px) rotate(-2deg)`, opacity: 0 }
          ], { duration: 240, easing: "cubic-bezier(.4,0,.6,1)", fill: "forwards" });
        } else if (closing) {
          // The open run backwards: each content surface folds into its centre line (no dissolve),
          // then the frame closes to a two-pixel line and the line retracts to a point. Only the
          // last sliver of the point fades. Never clone the record.
          for (const child of node.children ?? []) {
            const value = Number.parseFloat(host.getComputedStyle(child).opacity);
            const from = Number.isFinite(value) ? value : 1;
            const content = child.animate([
              { offset: 0, transform: "scaleY(1)", opacity: from, transformOrigin: "center" },
              { offset: 0.8, transform: "scaleY(0.02)", opacity: from, transformOrigin: "center" },
              { offset: 1, transform: "scaleY(0.02)", opacity: 0, transformOrigin: "center" }
            ], { duration: 120, easing: "cubic-bezier(0.7, 0, 0.84, 0)", fill: "forwards" });
            content.finished.catch(() => {});
            contents.push(content);
          }
          // Once folded, stop compositing the nested content during frame contraction.
          Promise.all(contents.map((content) => content.finished)).then(() => {
            if (!finished) node.setAttribute("data-record-content-hidden", "");
          }, () => {});
          const lineHeight = Math.min(1, 2 / Math.max(1, rect.height));
          animation = node.animate([
            { offset: 0, transform: `${base} scale(1, 1)`, opacity, transformOrigin: "center", easing: "steps(1, end)" },
            { offset: 0.3, transform: `${base} scale(1, 1)`, opacity, transformOrigin: "center", easing: "cubic-bezier(0.7, 0, 0.84, 0)" },
            { offset: 0.62, transform: `${base} scale(1, ${lineHeight})`, opacity, transformOrigin: "center", easing: "cubic-bezier(0.7, 0, 0.84, 0)" },
            { offset: 0.94, transform: `${base} scale(0.01, ${lineHeight})`, opacity, transformOrigin: "center" },
            { offset: 1, transform: `${base} scale(0.01, ${lineHeight})`, opacity: 0, transformOrigin: "center" }
          ], { duration: 420, easing: "linear", fill: "forwards" });
        } else animation = node.animate([
          { offset: 0, transform: `translate(0px, 0px) ${base} scale(1, 1)`, opacity, transformOrigin: "center" },
          { offset: 0.24, transform: `translate(${dx * 0.08}px, ${dy * 0.06}px) ${base} scale(0.86, 0.98)`, opacity, transformOrigin: "center" },
          { offset: 0.7, transform: `translate(${dx * 0.64}px, ${dy * 0.57}px) ${base} scale(0.25, 0.48)`, opacity: opacity * 0.8, transformOrigin: "center" },
          { offset: 1, transform: `translate(${dx}px, ${dy}px) ${base} scale(${endX}, ${endY})`, opacity: 0, transformOrigin: "center" }
        ], { duration: 480, easing: "cubic-bezier(0.4, 0, 0.2, 1)", fill: "forwards" });
        animation.finished.then(finish, finish);
      } catch { finish(); }
    }
    return { minimize: (options) => run(options), close: (options) => run(options, true), cancel, destroy: cancel, get busy() { return Boolean(active); } };
  }
  // accessRevealMs is the whole record access timeline in globals.css: the last panel settles by 1420ms.
  return Object.freeze({ createController, focusWithin, paperRevealMs: 740, accessRevealMs: 1500 });
});
