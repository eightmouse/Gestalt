(function (root, factory) {
  const api = root.GestaltAmbientMotion || factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else { root.GestaltAmbientMotion = api; api.initialize(); }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  const documents = new WeakSet();
  function initialize(doc = globalThis.document) {
    if (!doc?.documentElement || documents.has(doc)) return;
    documents.add(doc);
    const sync = () => doc.documentElement.toggleAttribute("data-archive-hidden", doc.hidden);
    sync();
    doc.addEventListener("visibilitychange", sync);
  }
  function watchMemory(node, host = globalThis.window) {
    if (!node) return () => {};
    const doc = host.document;
    initialize(doc);
    const shell = node.closest(".archive-shell");
    const motion = host.matchMedia("(prefers-reduced-motion: reduce), (pointer: coarse)");
    let frame = null, pointer = null, bounds = null, visible = true, previous = "";
    const paused = () => doc.hidden || motion.matches || !visible || !node.isConnected ||
      shell?.matches(".has-record, .is-booting, [data-nav-open], [data-workspace-tool-open], [data-search-open]");
    const stop = () => {
      if (frame !== null) host.cancelAnimationFrame(frame);
      frame = null;
      pointer = null;
    };
    const invalidate = () => { bounds = null; };
    const move = (event) => {
      if (paused()) return;
      pointer = { x: event.clientX, y: event.clientY };
      if (frame !== null) return;
      frame = host.requestAnimationFrame(() => {
        frame = null;
        if (paused() || !pointer) return;
        bounds ??= node.getBoundingClientRect();
        const clamp = (value) => Math.max(-1, Math.min(1, value));
        const x = clamp((pointer.x - bounds.left - bounds.width / 2) / (host.innerWidth / 2));
        const y = clamp((pointer.y - bounds.top - bounds.height / 2) / (host.innerHeight / 2));
        const values = [x * 4, y * 4, x * -6, y * -5, x * 7, y * 5, x * 2, y * 2].map((value) => `${value.toFixed(2)}px`);
        const signature = values.join(",");
        if (signature === previous) return;
        previous = signature;
        ["core-x", "core-y", "orbit-x", "orbit-y", "shard-x", "shard-y", "axis-x", "axis-y"].forEach((name, index) => node.style.setProperty(`--memory-${name}`, values[index]));
      });
    };
    const observer = host.IntersectionObserver ? new host.IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      node.toggleAttribute("data-memory-offscreen", !visible);
      invalidate();
      if (!visible) stop();
    }) : null;
    observer?.observe(node);
    host.addEventListener("pointermove", move, { passive: true });
    host.addEventListener("resize", invalidate, { passive: true });
    doc.addEventListener("scroll", invalidate, { capture: true, passive: true });
    doc.addEventListener("gestalt:navigation-layout", invalidate);
    doc.addEventListener("visibilitychange", stop);
    motion.addEventListener("change", stop);
    return () => {
      stop();
      observer?.disconnect();
      host.removeEventListener("pointermove", move);
      host.removeEventListener("resize", invalidate);
      doc.removeEventListener("scroll", invalidate, true);
      doc.removeEventListener("gestalt:navigation-layout", invalidate);
      doc.removeEventListener("visibilitychange", stop);
      motion.removeEventListener("change", stop);
      node.removeAttribute("data-memory-offscreen");
    };
  }
  return { initialize, watchMemory };
});
