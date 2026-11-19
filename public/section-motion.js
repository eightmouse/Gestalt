(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.GestaltSectionMotion = api;
})(globalThis, function () {
  const turns = new WeakMap();
  const shelves = new WeakMap();
  const projectPresses = new WeakSet();

  function motionAllowed(host) {
    return !host.document.hidden && !host.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  function preparePlateTurn(frame, direction, host = globalThis.window) {
    const old = frame?.firstElementChild;
    turns.get(frame)?.();
    if (!old?.animate || !motionAllowed(host)) return () => {};
    if (host.matchMedia("(max-width: 760px)").matches) return () => {
      const plate = frame.firstElementChild;
      if (!plate?.animate || !motionAllowed(host)) return;
      const motion = plate.animate([
        { transform: `translateX(${direction * 14}px)`, opacity: .68 },
        { transform: "translateX(0)", opacity: 1 }
      ], { duration: 230, easing: "cubic-bezier(.2,.7,.3,1)" });
      const cancel = finishReveal([motion], host);
      turns.set(frame, cancel);
      const clear = () => { if (turns.get(frame) === cancel) turns.delete(frame); };
      motion.finished.then(clear, clear);
    };
    const leaving = old.cloneNode(true);
    leaving.classList.add("is-turning-out");
    leaving.setAttribute("aria-hidden", "true");
    leaving.removeAttribute("aria-live");
    leaving.inert = true;
    return () => {
      const arriving = frame.firstElementChild;
      if (!frame.isConnected || !arriving?.animate || !motionAllowed(host)) return;
      const flat = "perspective(950px) rotateX(0deg)";
      const other = frame.closest('[data-workbench="other"]');
      frame.append(leaving);
      const out = other ? leaving.animate([
        { opacity: 1 },
        { transform: `translateX(${-direction * 3}px)`, clipPath: "inset(6% 0 29%)", opacity: .75, offset: .6 },
        { clipPath: "inset(51% 0 48%)", opacity: 0 }
      ], { duration: 145, fill: "forwards" }) : leaving.animate(
        [{ transform: flat, opacity: 1 }, { transform: `perspective(950px) rotateX(${-direction * 78}deg)`, opacity: 0 }],
        { duration: 185, easing: "cubic-bezier(.55,.08,.8,.5)", fill: "forwards" }
      );
      const into = other ? arriving.animate([
        { clipPath: "inset(39% 0 48%)", opacity: 0 },
        { transform: `translateX(${direction * 4}px)`, clipPath: "inset(29% 0 17%)", opacity: .8, offset: .32 },
        { transform: `translateX(${-direction * 2}px)`, clipPath: "inset(5% 0 5%)", opacity: .92, offset: .48 },
        { transform: "none", clipPath: "inset(0)", opacity: 1 }
      ], { delay: 120, duration: 280, easing: "ease-out", fill: "both" }) : arriving.animate(
        [{ transform: `perspective(950px) rotateX(${direction * 78}deg)`, opacity: 0 }, { transform: flat, opacity: 1 }],
        { delay: 150, duration: 225, easing: "cubic-bezier(.18,.61,.26,1)", fill: "both" }
      );
      const reduce = host.matchMedia("(prefers-reduced-motion: reduce)");
      const clear = () => {
        if (turns.get(frame) !== clear) return;
        turns.delete(frame);
        reduce.removeEventListener("change", clear);
        into.cancel();
        out.cancel();
        leaving.remove();
      };
      turns.set(frame, clear);
      reduce.addEventListener("change", clear);
      into.finished.then(clear, clear);
    };
  }

  function openProjectPlate(button, onOpen, host = globalThis.window) {
    if (projectPresses.has(button)) return;
    button.focus({ preventScroll: true });
    const plate = button.parentElement;
    if (!plate?.animate || !motionAllowed(host)) { onOpen(); return; }
    projectPresses.add(button);
    const press = plate.animate([
      { transform: "scale(1)" },
      { transform: "scale(.993)", offset: .58 },
      { transform: "scale(.995)" }
    ], { duration: 210, easing: "ease-in-out" });
    press.finished.then(() => {
      projectPresses.delete(button);
      if (button.isConnected && host.document.activeElement === button) onOpen();
    }, () => projectPresses.delete(button));
  }

  function bindProjectSwipe(section, onStep, host = globalThis.window) {
    if (!section) return () => {};
    const handheld = host.matchMedia("(max-width: 760px)");
    let gesture, suppressClick = false;

    function start(event) {
      if (event.isPrimary) suppressClick = false;
      gesture = undefined;
      if (!handheld.matches || event.pointerType !== "touch" || !event.isPrimary || !event.target.closest?.(".project-workbench-hit")) return;
      gesture = { id: event.pointerId, x: event.clientX, y: event.clientY, axis: null };
    }
    function move(event) {
      if (gesture?.id !== event.pointerId || gesture.axis) return;
      const dx = Math.abs(event.clientX - gesture.x);
      const dy = Math.abs(event.clientY - gesture.y);
      if (Math.max(dx, dy) < 12) return;
      gesture.axis = dx > dy * 1.25 ? "inline" : "block";
      if (gesture.axis === "inline") {
        suppressClick = true;
        section.setPointerCapture(event.pointerId);
      }
    }
    function finish(event) {
      if (gesture?.id !== event.pointerId) return;
      const { x, axis } = gesture;
      gesture = undefined;
      const dx = event.clientX - x;
      if (event.type === "pointerup" && handheld.matches && axis === "inline" && Math.abs(dx) >= 42) onStep(dx < 0 ? 1 : -1);
    }
    function guardClick(event) {
      if (!suppressClick || !event.detail || !event.target.closest?.(".project-workbench-hit")) return;
      suppressClick = false;
      event.preventDefault();
      event.stopImmediatePropagation();
    }
    section.addEventListener("pointerdown", start);
    section.addEventListener("pointermove", move, { passive: true });
    section.addEventListener("pointerup", finish);
    section.addEventListener("pointercancel", finish);
    section.addEventListener("click", guardClick, true);
    return () => {
      section.removeEventListener("pointerdown", start);
      section.removeEventListener("pointermove", move);
      section.removeEventListener("pointerup", finish);
      section.removeEventListener("pointercancel", finish);
      section.removeEventListener("click", guardClick, true);
    };
  }

  function bindProjectRotation(section, onNext, host = globalThis.window) {
    if (!section) return () => {};
    const shell = section.closest(".archive-shell");
    const doc = host.document;
    const reduced = host.matchMedia("(prefers-reduced-motion: reduce)");
    const handheld = host.matchMedia("(max-width: 760px)");
    const blockers = ".has-record, .is-booting, [data-search-open], [data-nav-open], [data-nav-blocked], [data-workspace-tool-open]";
    const observed = ["class", "data-search-open", "data-nav-open", "data-nav-blocked", "data-workspace-tool-open"];
    let timer = 0;
    let bound = true;
    let hovering = Boolean(section.querySelector(".project-workbench-frame:hover")) && host.matchMedia("(any-hover: hover)").matches;
    const available = () => bound && section.isConnected && Number(section.dataset.projectCount) > 1
      && !doc.hidden && !reduced.matches && !handheld.matches
      && !hovering && !projectPresses.has(doc.activeElement)
      && !(section.contains(doc.activeElement) && doc.activeElement?.matches(":focus-visible"))
      && !shell?.matches(blockers);
    const cancel = () => { host.clearTimeout(timer); timer = 0; };
    const schedule = () => {
      if (!available()) { cancel(); return; }
      if (!timer) timer = host.setTimeout(() => {
        timer = 0;
        if (available()) onNext();
        schedule();
      }, 6600);
    };
    const track = (event) => {
      if (event.pointerType === "touch") return;
      const inside = Boolean(event.target?.closest?.(".project-workbench-frame"));
      if (inside !== hovering) { hovering = inside; schedule(); }
    };
    const leave = (event) => {
      if (event.pointerType === "touch" || event.relatedTarget?.closest?.(".project-workbench-frame")) return;
      hovering = false; schedule();
    };
    const refocus = () => host.queueMicrotask(schedule);
    const observer = typeof host.MutationObserver === "function" ? new host.MutationObserver(schedule) : null;
    observer?.observe(section, { attributes: true, attributeFilter: ["data-workbench", "data-project-count"] });
    if (shell) observer?.observe(shell, { attributes: true, attributeFilter: observed });
    section.addEventListener("pointerover", track);
    section.addEventListener("pointerout", leave);
    section.addEventListener("focusin", schedule);
    section.addEventListener("focusout", refocus);
    doc.addEventListener("visibilitychange", schedule);
    reduced.addEventListener("change", schedule);
    handheld.addEventListener("change", schedule);
    schedule();
    return () => {
      bound = false;
      observer?.disconnect();
      section.removeEventListener("pointerover", track);
      section.removeEventListener("pointerout", leave);
      section.removeEventListener("focusin", schedule);
      section.removeEventListener("focusout", refocus);
      doc.removeEventListener("visibilitychange", schedule);
      reduced.removeEventListener("change", schedule);
      handheld.removeEventListener("change", schedule);
      cancel();
    };
  }

  function bindInstrumentShelf(node, host = globalThis.window) {
    if (!node) return () => {};
    const fine = host.matchMedia("(any-hover: hover) and (any-pointer: fine)");
    const reduce = host.matchMedia("(prefers-reduced-motion: reduce)");
    const trackNode = node.parentElement;
    const edges = [trackNode?.querySelector("[data-shelf-prev]"), trackNode?.querySelector("[data-shelf-next]")];
    const past = node.dataset.mediaCabinet === "past";
    const handheld = host.matchMedia("(max-width: 760px)");
    let hovered, point, pending, drag, suppressClick, frame = 0;
    let wheelFrame = 0, wheelTime = 0, wheelGoal = null;
    function syncEdges() {
      const available = [node.scrollLeft > 1, node.scrollWidth - node.clientWidth - node.scrollLeft > 1];
      for (let i = 0; i < edges.length; i++) {
        const edge = edges[i];
        if (!edge || edge.getAttribute("aria-disabled") === String(!available[i])) continue;
        edge.setAttribute("aria-disabled", String(!available[i]));
        edge.tabIndex = available[i] ? 0 : -1;
      }
    }
    function stepShelf(event) {
      const edge = event.currentTarget;
      if (edge.getAttribute("aria-disabled") !== "false") return;
      stopWheel();
      resetHover();
      const first = node.firstElementChild;
      const second = first?.nextElementSibling;
      const stride = second ? second.offsetLeft - first.offsetLeft : node.clientWidth;
      const distance = Math.max(1, Math.floor(node.clientWidth / stride)) * stride;
      node.scrollTo({ left: node.scrollLeft + (edge === edges[0] ? -distance : distance), behavior: motionAllowed(host) ? "smooth" : "instant" });
    }
    function stopWheel() {
      if (wheelFrame) host.cancelAnimationFrame(wheelFrame);
      wheelFrame = 0;
      wheelTime = 0;
      wheelGoal = null;
    }
    function easeWheel(now) {
      wheelFrame = 0;
      const start = node.scrollLeft;
      const target = Math.min(wheelGoal, node.scrollWidth - node.clientWidth);
      const remaining = target - start;
      if (Math.abs(remaining) <= 1) {
        node.scrollLeft = target;
        stopWheel();
        return;
      }
      const elapsed = wheelTime ? Math.min(40, now - wheelTime) : 16;
      wheelTime = now;
      const distance = Math.min(Math.abs(remaining), Math.max(1, Math.abs(remaining) * (1 - Math.exp(-elapsed / 62))));
      node.scrollLeft = start + Math.sign(remaining) * distance;
      wheelFrame = host.requestAnimationFrame(easeWheel);
    }
    function driveWithWheel(event) {
      if (handheld.matches || !event.cancelable || event.ctrlKey || event.metaKey) return;
      const { deltaMode, deltaX, deltaY } = event;
      if (event.shiftKey || Math.abs(deltaY) <= Math.abs(deltaX)) { stopWheel(); return; }
      const max = node.scrollWidth - node.clientWidth;
      const start = node.scrollLeft;
      const pixels = deltaY * (deltaMode === 1 ? 16 : deltaMode === 2 ? node.clientWidth : 1);
      const direction = Math.sign(pixels);
      const goal = wheelGoal !== null && Math.sign(wheelGoal - start) === direction ? wheelGoal : start;
      const next = Math.max(0, Math.min(max, goal + pixels));
      if (Math.abs(next - start) < .5) { stopWheel(); return; }
      event.preventDefault();
      resetHover();
      if (reduce.matches) { stopWheel(); node.scrollLeft = next; }
      else {
        wheelGoal = next;
        if (!wheelFrame) wheelFrame = host.requestAnimationFrame(easeWheel);
      }
    }
    function resetHover() {
      if (frame) host.cancelAnimationFrame(frame);
      frame = 0;
      if (!hovered) return;
      hovered.removeAttribute("data-sleeve-hover");
      hovered.style.removeProperty("--sleeve-pitch");
      hovered.style.removeProperty("--sleeve-yaw");
      hovered = null;
    }
    function track(event) {
      if (event.pointerType !== "mouse" || !fine.matches || reduce.matches || pending) return;
      const target = event.target.closest?.("[data-game-sleeve]");
      if (target !== hovered) {
        resetHover();
        if (!target) return;
        hovered = target;
        target.setAttribute("data-sleeve-hover", "");
      }
      if (!hovered) return;
      point = event;
      if (frame) return;
      frame = host.requestAnimationFrame(() => {
        frame = 0;
        const box = hovered.getBoundingClientRect();
        if (!box.width) return;
        const rail = node.getBoundingClientRect();
        const canTilt = box.left - rail.left >= 5 && rail.right - box.right >= 5;
        const position = (value, start, size) => canTilt ? Math.max(-1, Math.min(1, 2 * (value - start) / size - 1)) : 0;
        hovered.style.setProperty("--sleeve-yaw", `${(6 * position(point.clientX, box.left, box.width)).toFixed(2)}deg`);
        hovered.style.setProperty("--sleeve-pitch", `${(-6 * position(point.clientY, box.top, box.height)).toFixed(2)}deg`);
      });
    }
    function startDrag(event) {
      stopWheel();
      suppressClick = false;
      if (event.pointerType !== "mouse" || event.button !== 0 || event.ctrlKey || event.metaKey || node.scrollWidth <= node.clientWidth + 1 || !event.target.closest?.("[data-game-sleeve]")) return;
      drag = { id: event.pointerId, x: event.clientX, y: event.clientY, start: node.scrollLeft, moved: false };
    }
    function move(event) {
      if (drag?.id === event.pointerId) {
        const dx = event.clientX - drag.x;
        if (!drag.moved && Math.abs(dx) >= 7 && Math.abs(dx) > Math.abs(event.clientY - drag.y)) {
          drag.moved = true;
          suppressClick = true;
          resetHover();
          stopPress();
          node.setAttribute("data-shelf-dragging", "");
          node.setPointerCapture?.(event.pointerId);
        }
        if (drag.moved) { node.scrollLeft = drag.start - dx; return; }
      }
      track(event);
    }
    function endDrag(event) {
      if (!drag || (event && drag.id !== event.pointerId)) return;
      const { id } = drag;
      drag = null;
      if (node.hasPointerCapture?.(id)) node.releasePointerCapture(id);
      node.removeAttribute("data-shelf-dragging");
    }
    function leave(event) {
      resetHover();
      if (drag && !drag.moved) endDrag(event);
    }
    function guardClick(event) {
      if (!suppressClick || event.detail === 0) return;
      suppressClick = false;
      event.preventDefault();
      event.stopImmediatePropagation();
    }
    function stepFocus(event) {
      if ((event.key !== "ArrowLeft" && event.key !== "ArrowRight") || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
      const current = event.target.closest?.("[data-game-sleeve]");
      const next = event.key === "ArrowLeft" ? current?.previousElementSibling : current?.nextElementSibling;
      if (!next?.matches("[data-game-sleeve]")) return;
      event.preventDefault();
      stopWheel();
      clearPointerFocus();
      next.focus();
    }
    function clearPointerFocus() {
      node.querySelector("[data-sleeve-pointer]")?.removeAttribute("data-sleeve-pointer");
    }
    function handleTab(event) {
      if (event.key === "Tab" && !node.closest(".has-record, [inert]")) clearPointerFocus();
    }
    function stopPress(commit = false) {
      if (!pending) return;
      const { button, animation, onOpen } = pending;
      pending = null;
      if (commit && button.isConnected && !button.closest("[inert]") && host.document.activeElement === button && button.getClientRects().length) onOpen();
      animation.cancel();
      button.removeAttribute("data-sleeve-press");
    }
    function preferenceChanged() {
      resetHover();
      if (!reduce.matches) return;
      if (wheelGoal !== null) node.scrollLeft = wheelGoal;
      stopWheel();
      for (const cover of node.querySelectorAll("[data-game-sleeve]")) cover.getAnimations?.().forEach((animation) => animation.cancel());
      stopPress(true);
    }
    function press(button, onOpen, pointer) {
      if (pending?.button === button) return;
      stopPress();
      clearPointerFocus();
      button.toggleAttribute("data-sleeve-pointer", pointer);
      button.focus({ preventScroll: true });
      const sleeve = button.querySelector(".record-sleeve-art");
      if (!sleeve?.animate || !motionAllowed(host)) { onOpen(); return; }
      const transform = host.getComputedStyle(sleeve).transform;
      button.setAttribute("data-sleeve-press", "");
      resetHover();
      const animation = sleeve.animate([{ transform }, { transform: "perspective(640px) translateY(1px) scale(.99)" }],
        { duration: 175, easing: "cubic-bezier(.36,0,.26,1)", fill: "forwards" });
      pending = { button, animation, onOpen };
      animation.finished.then(() => { if (pending?.animation === animation) stopPress(true); }, () => {});
    }
    shelves.set(node, press);
    syncEdges();
    const resize = typeof host.ResizeObserver === "function" ? new host.ResizeObserver(syncEdges) : null;
    resize?.observe(node);
    edges.forEach((edge) => edge?.addEventListener("click", stepShelf));
    node.addEventListener("scroll", syncEdges, { passive: true });
    if (past) trackNode?.addEventListener("wheel", driveWithWheel, { passive: false });
    node.addEventListener("pointerdown", startDrag);
    node.addEventListener("pointermove", move, { passive: true });
    node.addEventListener("pointerleave", leave);
    node.addEventListener("pointerup", endDrag);
    node.addEventListener("pointercancel", endDrag);
    node.addEventListener("lostpointercapture", endDrag);
    node.addEventListener("click", guardClick, true);
    node.addEventListener("keydown", stepFocus);
    host.document.addEventListener("keydown", handleTab, true);
    fine.addEventListener("change", resetHover);
    reduce.addEventListener("change", preferenceChanged);
    return () => {
      shelves.delete(node);
      resize?.disconnect();
      edges.forEach((edge) => edge?.removeEventListener("click", stepShelf));
      node.removeEventListener("scroll", syncEdges);
      if (past) trackNode?.removeEventListener("wheel", driveWithWheel);
      node.removeEventListener("pointerdown", startDrag);
      node.removeEventListener("pointermove", move);
      node.removeEventListener("pointerleave", leave);
      node.removeEventListener("pointerup", endDrag);
      node.removeEventListener("pointercancel", endDrag);
      node.removeEventListener("lostpointercapture", endDrag);
      node.removeEventListener("click", guardClick, true);
      node.removeEventListener("keydown", stepFocus);
      host.document.removeEventListener("keydown", handleTab, true);
      fine.removeEventListener("change", resetHover);
      reduce.removeEventListener("change", preferenceChanged);
      endDrag();
      resetHover();
      stopWheel();
      stopPress();
    };
  }

  function openInstrumentSleeve(button, onOpen, pointer = false) {
    const press = shelves.get(button.closest("[data-media-cabinet]"));
    if (press) press(button, onOpen, pointer);
    else { button.focus({ preventScroll: true }); onOpen(); }
  }

  function finishReveal(animations, host) {
    const active = animations.filter(Boolean);
    const reduce = host.matchMedia("(prefers-reduced-motion: reduce)");
    function cancel() {
      reduce.removeEventListener("change", cancel);
      active.forEach((animation) => animation.cancel());
    }
    reduce.addEventListener("change", cancel);
    Promise.allSettled(active.map((animation) => animation.finished)).then(() => reduce.removeEventListener("change", cancel));
    return cancel;
  }

  function revealInstrumentShelf(node, host = globalThis.window) {
    if (!node || !motionAllowed(host)) return () => {};
    const tier = node.dataset.mediaCabinet === "past" ? 180 : 0;
    const signal = node.closest(".game-shelf")?.querySelector(".game-shelf-bus i");
    const covers = [...node.querySelectorAll("[data-game-sleeve]")].slice(0, 6);
    if (!covers.length) return () => {};
    const pulse = signal?.animate?.([
      { transform: "translateX(-110%)", opacity: 0 },
      { opacity: 1, offset: .2 },
      { opacity: .75, offset: .77 },
      { transform: "translateX(330%)", opacity: 0 }
    ], { duration: 550, delay: tier });
    const wakes = covers.flatMap((cover, index) => {
      const delay = tier + 70 + index * 58;
      return [cover.animate?.([
        { transform: "translateY(8px)", opacity: .26 },
        { transform: "translateY(-1px)", opacity: 1, offset: .71 },
        { transform: "translateY(0)" }
      ], { duration: 420, delay, easing: "cubic-bezier(.19,.58,.28,1)", fill: "backwards" }),
      cover.querySelector(".game-disk-contacts")?.animate?.([
        { transform: "scaleX(.2)", opacity: .36 },
        { transform: "scaleX(1)", opacity: 1, offset: .64 },
        { opacity: .76 }
      ], { duration: 340, delay: delay + 35, fill: "backwards" })];
    });
    return finishReveal([pulse, ...wakes], host);
  }

  function revealProjectReader(frame, host = globalThis.window) {
    if (!frame || !motionAllowed(host)) return () => {};
    const plate = frame.firstElementChild;
    const register = frame.querySelector(".project-workbench-register");
    return finishReveal([
      plate?.animate?.([
        { transform: "translateY(6px)", opacity: .72 },
        { transform: "translateY(0)", opacity: 1 }
      ], { duration: 340, easing: "cubic-bezier(.18,.61,.26,1)" }),
      register?.animate?.([
        { transform: "scaleX(.08)", opacity: .24 },
        { transform: "scaleX(1)", opacity: .9, offset: .76 },
        { transform: "scaleX(1)", opacity: 0 }
      ], { duration: 1200, easing: "ease-in-out" })
    ], host);
  }

  function bindSectionStandby(section, kind, host = globalThis.window) {
    if (!section || (kind !== "games" && kind !== "projects")) return () => {};
    const shell = section.closest(".archive-shell");
    const reduced = host.matchMedia("(prefers-reduced-motion: reduce)");
    let timer = 0, pass = 0, pulses = [];
    const available = () => section.isConnected && !host.document.hidden && !reduced.matches
      && !shell?.matches(".has-record, .is-booting, [data-search-open], [data-workspace-tool-open]");
    function cancel() {
      if (timer) host.clearTimeout(timer);
      timer = 0;
      pulses.forEach((pulse) => pulse?.cancel());
      pulses = [];
    }
    function poll() {
      timer = 0;
      if (!available()) { cancel(); return; }
      pulses = [];
      if (kind === "games") {
        const shelves = Array.from(section.querySelectorAll(".game-shelf")).filter((shelf) => shelf.querySelector("[data-game-sleeve]"));
        const shelf = shelves[pass % shelves.length];
        const signal = shelf?.querySelector(".game-shelf-bus i");
        pulses.push(signal?.animate?.([
          { transform: "translateX(-100%)", opacity: 0 },
          { opacity: .88, offset: .28 },
          { transform: "translateX(325%)", opacity: 0 }
        ], { duration: 850 }));
        const rail = shelf?.querySelector("[data-media-cabinet]");
        const local = rail && Array.from(rail.children).find((disk) => disk.offsetLeft >= rail.scrollLeft + 2 && disk.offsetLeft + disk.offsetWidth <= rail.scrollLeft + rail.clientWidth);
        pulses.push(local?.querySelector(".game-disk-contacts")?.animate?.([
          { opacity: 1 }, { opacity: .36, offset: .22 }, { opacity: 1, offset: .47 }, { opacity: .55 }
        ], { duration: 420, delay: 350 }));
      } else {
        const node = section.querySelector('[data-stop="working"] .project-milestone-node');
        if (node) pulses.push(node.animate?.([
          { transform: "rotate(45deg) scale(1)", opacity: 1 },
          { transform: "rotate(45deg) scale(1.5)", opacity: .68 },
          { transform: "rotate(45deg) scale(1)", opacity: 1 }
        ], { duration: 900, easing: "ease-in-out" }));
        else pulses.push(section.querySelector(".project-workbench-register")?.animate?.([
          { transform: "scaleX(.08)", opacity: 0 },
          { opacity: .55, offset: .25 },
          { transform: "scaleX(1)", opacity: .55, offset: .77 },
          { transform: "scaleX(1)", opacity: 0 }
        ], { duration: 1450, easing: "ease-in-out" }));
      }
      pass++;
      timer = host.setTimeout(poll, pass % 2 ? 10600 : 13900);
    }
    function update() {
      if (!available()) cancel();
      else if (!timer) timer = host.setTimeout(poll, kind === "games" ? 6000 : 7800);
    }
    const observer = shell && host.MutationObserver ? new host.MutationObserver(update) : null;
    observer?.observe(shell, { attributes: true, attributeFilter: ["class", "data-search-open", "data-workspace-tool-open"] });
    host.document.addEventListener("visibilitychange", update);
    reduced.addEventListener("change", update);
    update();
    return () => {
      cancel();
      observer?.disconnect();
      host.document.removeEventListener("visibilitychange", update);
      reduced.removeEventListener("change", update);
    };
  }

  return Object.freeze({ preparePlateTurn, openProjectPlate, bindProjectSwipe, bindProjectRotation, bindInstrumentShelf, openInstrumentSleeve, revealInstrumentShelf, revealProjectReader, bindSectionStandby });
});
