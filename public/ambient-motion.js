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
    if (doc.defaultView?.ResizeObserver && doc.defaultView.MutationObserver && doc.body) {
      bindScreenLight(doc, doc.defaultView);
      bindBenchScreens(doc);
    }
  }

  // Every project screen is 16:9. A picture near that shape fills it (a sliver may crop); a much
  // taller one (a phone app, a narrow window) stands whole in the middle with dark glass either side.
  function screenShape(ratio) {
    if (!(ratio > 0)) return null;
    return ratio >= 1.3 ? "wide" : "tall";
  }

  // Marks each project screen with its picture's shape once the picture has loaded.
  function bindBenchScreens(doc) {
    const mark = (image) => {
      const glass = image?.closest?.(".project-screen-glass");
      if (!glass || image.classList.contains("screen-bloom") || !image.naturalWidth) return;
      const shape = screenShape(image.naturalWidth / image.naturalHeight);
      if (shape) glass.setAttribute("data-shape", shape);
    };
    doc.addEventListener("load", (event) => mark(event.target), true);
    const scan = () => { for (const image of doc.querySelectorAll(".project-screen-glass:not([data-shape]) img:not(.screen-bloom)")) if (image.complete) mark(image); };
    new doc.defaultView.MutationObserver(scan).observe(doc.body, { childList: true, subtree: true });
    scan();
  }

  // Averages a small RGBA sample into the colour a lit screen would cast. Bright pixels
  // dominate (they emit the light), and the result is lifted to a light-like brightness
  // so intensity stays a CSS decision. Returns "r g b" or null for an unusable sample.
  function screenLightColour(pixels) {
    let red = 0, green = 0, blue = 0, total = 0;
    for (let index = 0; index + 3 < pixels.length; index += 4) {
      if (pixels[index + 3] < 128) continue;
      const r = pixels[index], g = pixels[index + 1], b = pixels[index + 2];
      const weight = ((0.2126 * r + 0.7152 * g + 0.0722 * b) / 255) ** 2 + 0.02;
      red += r * weight; green += g * weight; blue += b * weight; total += weight;
    }
    if (!total) return null;
    const mean = [red / total, green / total, blue / total];
    const peak = Math.max(...mean, 1);
    // Lift to a light-like level, then keep a fifth of a neutral so vivid art stays plausible.
    return mean.map((value, index) => Math.round(value * (210 / peak) * 0.8 + [188, 194, 188][index] * 0.2)).join(" ");
  }

  // Night screens cast light onto the plates around them. Positions are measured from the
  // fixed layout (offsets, not the hover-shifted paint), and only when the layout changes.
  function bindScreenLight(doc, host) {
    const names = ["x", "y", "rx", "ry"];
    const colours = new Map();
    let grid = null, frame = null;
    const resize = new host.ResizeObserver(() => schedule());
    function schedule() {
      if (frame === null) frame = host.requestAnimationFrame(() => { frame = null; measure(); });
    }
    function attach(next) {
      resize.disconnect();
      grid = next;
      if (grid) resize.observe(grid);
    }
    function box(element) {
      let x = 0, y = 0, node = element;
      while (node && node !== grid) {
        x += node.offsetLeft; y += node.offsetTop;
        node = node.offsetParent;
      }
      return node === grid ? { x, y, width: element.offsetWidth, height: element.offsetHeight } : null;
    }
    function write(panel, name, source, plate) {
      if (!source || !plate) {
        for (const key of names) panel.style.removeProperty(`--${name}-light-${key}`);
        return;
      }
      // Gradients are placed from the padding box; the border sits outside it.
      const values = [
        source.x + source.width / 2 - plate.x - panel.clientLeft,
        source.y + source.height / 2 - plate.y - panel.clientTop,
        source.width / 2,
        source.height / 2
      ];
      names.forEach((key, index) => panel.style.setProperty(`--${name}-light-${key}`, `${values[index].toFixed(1)}px`));
    }
    function read(source) {
      // A fresh canvas each time: once tainted by a cross-origin draw, a canvas stays unreadable.
      const canvas = doc.createElement("canvas");
      canvas.width = canvas.height = 16;
      const context = canvas.getContext("2d", { willReadFrequently: true });
      if (!context) return null;
      context.drawImage(source, 0, 0, 16, 16);
      return screenLightColour(context.getImageData(0, 0, 16, 16).data);
    }
    async function sample(image, src) {
      try {
        return read(image);
      } catch {
        // A cross-origin cover (Steam artwork) taints the canvas; read the same file through CORS.
        if (!host.fetch || !host.createImageBitmap) return null;
        const response = await host.fetch(src, { mode: "cors", credentials: "omit" });
        if (!response.ok) return null;
        const bitmap = await host.createImageBitmap(await response.blob(), { resizeWidth: 16, resizeHeight: 16 });
        try { return read(bitmap); } finally { bitmap.close?.(); }
      }
    }
    // The colour lands on `target` (the dashboard grid, or the Games drive) as --cover-light-rgb.
    function sampleCover(cover, target) {
      if (!target) return;
      const image = cover?.querySelector("img");
      const src = image?.currentSrc || image?.src || "";
      const apply = (key) => {
        const colour = key ? colours.get(key) : null;
        if (colour) target.style.setProperty("--cover-light-rgb", colour);
        else target.style.removeProperty("--cover-light-rgb");
      };
      if (!src || colours.has(src) || !image.complete || !image.naturalWidth) return apply(colours.has(src) ? src : "");
      colours.set(src, null);
      sample(image, src).catch(() => null).then((colour) => {
        colours.set(src, colour);
        if (target.isConnected) apply((cover.querySelector("img")?.currentSrc) === src ? src : "");
      });
    }
    function measure() {
      const drive = doc.querySelector(".game-drive");
      sampleCover(drive?.querySelector(".game-drive-screen"), drive);
      if (!grid?.isConnected) attach(doc.querySelector(".dashboard-grid"));
      if (!grid) return;
      const memory = grid.querySelector(".memory-trace"), cover = grid.querySelector(".game-cover");
      const screens = { memory: memory && box(memory), cover: cover && box(cover) };
      for (const panel of grid.children) {
        if (!panel.classList?.contains("dashboard-panel")) continue;
        const plate = box(panel);
        for (const name of Object.keys(screens)) write(panel, name, screens[name], plate);
      }
      sampleCover(cover, grid);
    }
    const relevant = ".dashboard-grid, .dashboard-panel, .game-cover, .game-drive";
    const screen = ".game-cover, .game-drive-screen";
    new host.MutationObserver((records) => {
      for (const record of records) {
        if (record.type === "attributes" ? record.target.closest?.(screen) : !grid?.isConnected || [...record.addedNodes].some((node) => node.nodeType === 1 && (node.matches(relevant) || node.querySelector(relevant)))) {
          schedule();
          return;
        }
      }
    }).observe(doc.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["src"] });
    doc.addEventListener("load", (event) => { if (event.target?.closest?.(screen)) schedule(); }, true);
    doc.addEventListener("gestalt:navigation-layout", schedule);
    schedule();
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
  return { initialize, watchMemory, screenLightColour, screenShape };
});
