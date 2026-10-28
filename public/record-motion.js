(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.GestaltRecordMotion = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  function createController(host = globalThis.window) {
    const doc = host.document;
    let active = null;
    function cancel() { active?.cancel(); }
    function minimize({ node, target, enabled = true, onComplete }) {
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
      target?.setAttribute?.("data-motion-destination", "");
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
      const consume = (event) => { event.preventDefault(); event.stopImmediatePropagation(); };
      const cleanup = () => {
        doc.removeEventListener("click", consume, true);
        doc.removeEventListener("keydown", consume, true);
        doc.removeEventListener("visibilitychange", onVisibility);
        motion.removeEventListener("change", onMotion);
        node.removeAttribute("data-record-retracting");
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
        animation?.cancel();
        onComplete();
      };
      const onVisibility = () => { if (doc.hidden) finish(); };
      const onMotion = () => { if (motion.matches) finish(); };
      active = { cancel() {
        if (finished) return;
        finished = true;
        cleanup();
        animation?.cancel();
      } };
      node.inert = true;
      node.setAttribute("data-record-retracting", "");
      doc.addEventListener("click", consume, true);
      doc.addEventListener("keydown", consume, true);
      doc.addEventListener("visibilitychange", onVisibility);
      motion.addEventListener("change", onMotion);
      try {
        animation = node.animate([
          { offset: 0, transform: `translate(0px, 0px) ${base} scale(1, 1)`, opacity, transformOrigin: "center" },
          { offset: 0.24, transform: `translate(${dx * 0.08}px, ${dy * 0.06}px) ${base} scale(0.86, 0.98)`, opacity, transformOrigin: "center" },
          { offset: 0.7, transform: `translate(${dx * 0.64}px, ${dy * 0.57}px) ${base} scale(0.25, 0.48)`, opacity: opacity * 0.8, transformOrigin: "center" },
          { offset: 1, transform: `translate(${dx}px, ${dy}px) ${base} scale(${endX}, ${endY})`, opacity: 0, transformOrigin: "center" }
        ], { duration: 480, easing: "cubic-bezier(0.4, 0, 0.2, 1)", fill: "forwards" });
        animation.finished.then(finish, finish);
      } catch { finish(); }
    }
    return { minimize, cancel, destroy: cancel, get busy() { return Boolean(active); } };
  }
  return Object.freeze({ createController });
});
