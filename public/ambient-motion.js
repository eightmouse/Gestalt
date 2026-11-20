(function (root, factory) {
  const api = root.GestaltAmbientMotion || factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else { root.GestaltAmbientMotion = api; api.initialize(); }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  const documents = new WeakSet();
  const covered = ".has-record, .is-booting, [data-nav-blocked], [data-nav-open], [data-workspace-tool-open], [data-search-open]";
  const clamp = (value) => Math.max(-1, Math.min(1, value));
  function initialize(doc = globalThis.document) {
    if (!doc?.documentElement || documents.has(doc)) return;
    documents.add(doc);
    const sync = () => doc.documentElement.toggleAttribute("data-archive-hidden", doc.hidden);
    sync();
    doc.addEventListener("visibilitychange", sync);
    if (doc.defaultView?.matchMedia) bindDashboardHover(doc, doc.defaultView);
  }

  function bindDashboardHover(doc, host) {
    const input = host.matchMedia("(min-width: 761px) and (hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)");
    let plate, shell, bounds, point, signature = null, frame = null;
    const paused = () => !input.matches || doc.hidden || !plate?.isConnected || shell?.matches(covered);
    const invalidate = () => { bounds = null; };
    const inSeat = (x, y) => bounds && x >= bounds.left && x <= bounds.left + bounds.width && y >= bounds.top && y <= bounds.top + bounds.height;
    const clear = () => {
      if (frame !== null) host.cancelAnimationFrame(frame);
      frame = null;
      plate?.removeEventListener("pointerleave", leave);
      plate?.removeAttribute("data-plate-hover");
      plate = shell = bounds = point = signature = null;
    };
    function leave(event) {
      if (!event?.relatedTarget || !inSeat(event.clientX, event.clientY)) clear();
    }
    function travelRoom(offset, size, limit, cap) {
      const after = Math.max(0, limit - offset - size - 1);
      const before = Math.max(0, offset - 1);
      // Keep the usual direction unless a grid edge makes the opposite direction safer.
      return after >= cap || after >= before ? Math.min(after, cap) : -Math.min(before, cap);
    }
    function measureSeat() {
      const grid = plate.offsetParent;
      if (!grid) return null;
      const { left, top } = grid.getBoundingClientRect();
      // Read the fixed layout offsets, not the moving plate's painted rectangle.
      const x = plate.offsetLeft - grid.scrollLeft, y = plate.offsetTop - grid.scrollTop;
      const width = plate.offsetWidth, height = plate.offsetHeight;
      return {
        left: left + grid.clientLeft + x,
        top: top + grid.clientTop + y,
        width,
        height,
        roomX: travelRoom(x, width, grid.clientWidth, 2),
        roomY: travelRoom(y, height, grid.clientHeight, 3)
      };
    }
    function move(event) {
      if (paused()) return clear();
      point = { x: event.clientX, y: event.clientY };
      if (frame !== null) return;
      frame = host.requestAnimationFrame(() => {
        frame = null;
        if (paused()) return clear();
        bounds ??= measureSeat();
        if (!bounds?.width || !bounds.height || !inSeat(point.x, point.y)) return clear();
        const x = Math.sign(bounds.roomX) * Math.min(Math.abs(bounds.roomX), Math.round(2 * (point.x - bounds.left) / bounds.width));
        const y = Math.sign(bounds.roomY) * Math.min(Math.abs(bounds.roomY), 1 + Math.round(2 * (point.y - bounds.top) / bounds.height));
        const next = `${x},${y}`;
        if (next === signature) return;
        plate.style.setProperty("--plate-hover-x", `${x}px`);
        plate.style.setProperty("--plate-hover-y", `${y}px`);
        if (signature === null) plate.setAttribute("data-plate-hover", "");
        signature = next;
      });
    }
    doc.addEventListener("pointermove", (event) => {
      if (!input.matches || event.pointerType !== "mouse" || doc.hidden) return;
      if (plate && (inSeat(event.clientX, event.clientY) || (!bounds && plate.contains(event.target)))) return move(event);
      const next = event.target?.closest?.(".dashboard-grid > .dashboard-panel");
      if (plate && next === plate) return clear();
      if (plate) clear();
      if (!next) return;
      plate = next;
      shell = next.closest(".archive-shell");
      if (paused()) return clear();
      plate.addEventListener("pointerleave", leave);
      move(event);
    }, { passive: true });
    host.addEventListener("resize", invalidate, { passive: true });
    host.addEventListener("blur", clear);
    doc.addEventListener("scroll", invalidate, { capture: true, passive: true });
    doc.addEventListener("gestalt:navigation-layout", invalidate);
    doc.addEventListener("visibilitychange", clear);
    input.addEventListener("change", clear);
  }

  function watchMemory(node, host = globalThis.window) {
    if (!node) return () => {};
    const doc = host.document;
    initialize(doc);
    const shell = node.closest(".archive-shell");
    const motion = host.matchMedia("(prefers-reduced-motion: reduce), (pointer: coarse)");
    let frame = null, pointer = null, bounds = null, visible = true, previous = "";
    const paused = () => doc.hidden || motion.matches || !visible || !node.isConnected || shell?.matches(covered);
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
