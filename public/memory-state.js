(function (root, factory) {
  const api = root.GestaltMemoryState || factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.GestaltMemoryState = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  const limit = 32, key = "gestalt.memory-state", sessions = new WeakMap();
  const sections = ["system", "projects", "games", "logs", "setup", "archive"];
  const views = ["overview", "notes", "technical", "samples", "recommendation", "attachments", "hardware", "changelog"];
  function normalizeMode(value) { return value === "legacy" ? "legacy" : "trace"; }
  function readMode(storage) {
    try {
      const local = storage || globalThis.localStorage;
      return local.getItem("gestalt.local-memory") === "granted" ? normalizeMode(local.getItem(key)) : "trace";
    } catch { return "trace"; }
  }
  function saveMode(value, storage) {
    try {
      const local = storage || globalThis.localStorage;
      if (local.getItem("gestalt.local-memory") !== "granted") return false;
      local.setItem(key, normalizeMode(value));
      return true;
    } catch { return false; }
  }
  function session(host) {
    if (!host?.document) return null;
    let state = sessions.get(host.document);
    if (!state) { state = { entries: [], listeners: new Set(), sequence: 0, ready: false }; sessions.set(host.document, state); }
    return state;
  }
  // Only fixed event names and enum/numeric fields can enter the session buffer.
  function detailFor(name, fields = {}) {
    if (name === "workspace.ready") return "state=ready";
    if (name === "section.enter") return sections.includes(fields.section) ? `target=${fields.section}` : null;
    if (name === "record.open") return sections.includes(fields.section) ? `section=${fields.section}` : null;
    if (["record.close", "record.minimize", "record.restore"].includes(name)) return "target=record";
    if (name === "record.resize") return ["maximized", "normal"].includes(fields.state) ? `state=${fields.state}` : null;
    if (name === "content.select") return views.includes(fields.view) ? `view=${fields.view}` : null;
    if (name === "note.expand") return Number.isInteger(fields.index) && fields.index > 0 && fields.index <= 9999 ? `index=${String(fields.index).padStart(2, "0")}` : null;
    if (name === "terminal.open") return ["keyboard", "pointer", "restore"].includes(fields.source) ? `source=${fields.source}` : null;
    if (["terminal.close", "terminal.minimize"].includes(name)) return "target=directory";
    return null;
  }
  function record(name, fields, host = globalThis.window) {
    const state = session(host);
    let detail;
    try { detail = detailFor(name, fields && typeof fields === "object" ? fields : {}); } catch { return; }
    if (!state || detail === null || name === "workspace.ready" && state.ready) return;
    if (name === "workspace.ready") state.ready = true;
    const now = new Date();
    const time = [now.getHours(), now.getMinutes(), now.getSeconds()].map((value) => String(value).padStart(2, "0")).join(":");
    state.entries.push(Object.freeze({ id: ++state.sequence, time, name, detail }));
    if (state.entries.length > limit) state.entries.shift();
    for (const listener of state.listeners) {
      try { listener(); } catch { state.listeners.delete(listener); }
    }
  }
  function entries(host = globalThis.window) { return [...(session(host)?.entries || [])]; }
  // Display templates only: never evaluate these lines or interpolate visitor text.
  function codeFor(entry) {
    const value = entry.detail.split("=")[1];
    if (entry.name === "workspace.ready") return ['const workspace = gestalt.surface();', 'await workspace.ready();', 'yield workspace.compose();'];
    if (entry.name === "section.enter") return [`await workspace.route("${value}");`, 'yield workspace.compose();'];
    if (entry.name === "record.open") return [`const record = archive.open("${value}");`, 'await record.reveal();'];
    if (entry.name === "record.close") return ['await record.dissolve();', 'workspace.focus();'];
    if (entry.name === "record.minimize") return ['record.suspend();', 'yield workspace.resume();'];
    if (entry.name === "record.restore") return ['await record.restore();', 'record.focus();'];
    if (entry.name === "record.resize") return [`record.frame("${value}");`, 'yield record.compose();'];
    if (entry.name === "content.select") return [`await record.view("${value}");`, 'yield record.compose();'];
    if (entry.name === "note.expand") return [`const note = record.notes.at(${Number(value) - 1});`, 'await note.unfold();'];
    if (entry.name === "terminal.open") return ['const terminal = workspace.directory();', `terminal.input("${value}");`, 'await terminal.reveal();'];
    if (entry.name === "terminal.minimize") return ['terminal.suspend();', 'workspace.focus();'];
    return ['await terminal.dismiss();', 'workspace.focus();'];
  }
  const idlePassages = [
    ['// between signals', 'for (const layer of workspace) {', '  yield layer.compose();', '}', 'await signal.next();'],
    ['// a quiet surface', 'const frame = workspace.snapshot();', 'yield frame.hold();', 'await signal.next();'],
    ['// fragments at rest', 'for (const fragment of archive) {', '  yield fragment.retain();', '}', 'await signal.next();'],
    ['// waiting at the edge', 'const next = await signal.next();', 'yield workspace.resolve(next);']
  ];
  function renderShell() {
    return '<header class="memory-trace-header"><span>workspace.gs</span></header><ol class="memory-trace-lines" aria-label="Workspace code stream" aria-live="off"></ol>';
  }
  function watchTrace(node, host = globalThis.window) {
    const state = session(host);
    if (!node || !state) return () => {};
    const doc = host.document, list = node.querySelector(".memory-trace-lines"), shell = node.closest?.(".archive-shell");
    if (!list) return () => {};
    list.textContent = "";
    const motion = host.matchMedia?.("(prefers-reduced-motion: reduce)");
    const lineLimit = 60, queueLimit = 4;
    let visible = true, disposed = false, hydrated = false, available = false;
    let timer = null, current = null, queue = [], lastId = 0, serial = 0, passage = -1;
    const random = (min, max) => Math.floor(min + Math.random() * (max - min + 1));
    const active = () => !disposed && visible && !doc.hidden && node.isConnected &&
      !shell?.matches(".has-record, .is-booting, [data-nav-blocked], [data-nav-open], [data-search-open], [data-workspace-tool-open]");
    function cancel() {
      if (timer !== null) host.clearTimeout(timer);
      timer = null;
      if (current?.row) delete current.row.dataset.writing;
    }
    // A single cancellable deadline handles short writing bursts and long idle rests.
    function schedule(fn, delay) {
      cancel();
      if (!active() || motion?.matches || !host.setTimeout) return;
      timer = host.setTimeout(() => { timer = null; if (active()) fn(); }, delay);
    }
    function follow() {
      list.scrollTop = list.scrollHeight;
      const top = list.getBoundingClientRect().top;
      // Read the clipped rows together, then discard them without renumbering survivors.
      const expired = [...list.children].slice(0, -1).filter((row) => row.getBoundingClientRect().bottom <= top);
      for (const row of expired) row.remove();
      if (expired.length) list.scrollTop = list.scrollHeight;
    }
    function appendLine(text, first) {
      const row = doc.createElement("li"), number = doc.createElement("span"), code = doc.createElement("code");
      row.dataset.line = String(++serial);
      if (first) row.className = "memory-code-block";
      number.className = "memory-code-number";
      number.setAttribute("aria-hidden", "true");
      number.textContent = String(serial).padStart(3, "0");
      code.textContent = text;
      row.append(number, code); list.append(row);
      while (list.children.length > lineLimit) list.children[0].remove();
      return { row, code };
    }
    function highlight(code, text) {
      code.textContent = "";
      for (const part of text.split(/(\/\/.*|"[^"]*"|\b(?:const|await|yield|for|of)\b)/g)) {
        if (!part) continue;
        const token = doc.createElement("span");
        token.className = part.startsWith("//") ? "memory-code-comment" : part.startsWith('"') ? "memory-code-string" : /^(const|await|yield|for|of)$/.test(part) ? "memory-code-keyword" : "";
        token.textContent = part; code.append(token);
      }
    }
    function appendBlock(lines) {
      lines.forEach((text, index) => { const { code } = appendLine(text, index === 0); highlight(code, text); });
    }
    function finishCurrent() {
      if (!current) return;
      if (current.row) {
        delete current.row.dataset.writing;
        highlight(current.code, current.lines[current.line]);
        current.line++;
      }
      for (; current.line < current.lines.length; current.line++) {
        const { code } = appendLine(current.lines[current.line], current.line === 0);
        highlight(code, current.lines[current.line]);
      }
      current = null;
    }
    function rest(first = false) {
      schedule(() => {
        const next = (passage + random(1, idlePassages.length - 1)) % idlePassages.length;
        passage = next;
        current = { lines: idlePassages[next], line: 0, offset: 0, row: null, code: null };
        write();
      }, first ? random(1200, 2200) : random(6500, 13000));
    }
    function advance() {
      if (!active() || motion?.matches) return;
      if (current) { write(); return; }
      if (!queue.length) { rest(); return; }
      current = { lines: queue.shift(), line: 0, offset: 0, row: null, code: null };
      write();
    }
    function write() {
      if (!active() || !current) return;
      const text = current.lines[current.line];
      if (!current.row) Object.assign(current, appendLine("", current.line === 0));
      current.row.dataset.writing = "";
      current.offset = Math.min(text.length, current.offset + random(2, 5));
      current.code.textContent = text.slice(0, current.offset);
      follow();
      if (current.offset < text.length) { schedule(write, random(45, 105)); current.row.dataset.writing = ""; return; }
      highlight(current.code, text);
      delete current.row.dataset.writing;
      current.line++; current.offset = 0; current.row = null; current.code = null;
      if (current.line === current.lines.length) { current = null; schedule(advance, random(600, 1100)); }
      else schedule(write, random(160, 380));
    }
    function refresh(animate = false) {
      if (!active()) { cancel(); return; }
      const fresh = state.entries.filter((entry) => entry.id > lastId);
      if (fresh.length) {
        lastId = fresh.at(-1).id;
        if (!hydrated || !animate || motion?.matches) {
          cancel(); finishCurrent(); queue = [];
          // Catch up with a small snapshot, never replay an invisible backlog.
          for (const entry of fresh.slice(-queueLimit)) appendBlock(codeFor(entry));
          follow();
        } else {
          queue.push(...fresh.map(codeFor)); queue = queue.slice(-queueLimit);
          if (!current) { cancel(); advance(); }
        }
      }
      const first = !hydrated; hydrated = true;
      if (motion?.matches) {
        cancel(); finishCurrent();
        for (const lines of queue) appendBlock(lines);
        queue = []; follow();
      } else if (timer === null) { if (current || queue.length) advance(); else rest(first); }
    }
    function availability() {
      const next = active();
      if (next === available) return;
      available = next;
      if (next) refresh(); else cancel();
    }
    const update = () => refresh(true);
    const observer = host.IntersectionObserver ? new host.IntersectionObserver(([entry]) => { visible = entry.isIntersecting; availability(); }) : null;
    observer?.observe(node);
    const coverObserver = host.MutationObserver && shell ? new host.MutationObserver(availability) : null;
    coverObserver?.observe(shell, { attributes: true, attributeFilter: ["class", "data-nav-blocked", "data-nav-open", "data-search-open", "data-workspace-tool-open"] });
    const resizeObserver = host.ResizeObserver ? new host.ResizeObserver(() => { if (active()) follow(); }) : null;
    resizeObserver?.observe(list);
    state.listeners.add(update);
    const onMotion = () => refresh();
    doc.addEventListener("visibilitychange", availability);
    motion?.addEventListener("change", onMotion);
    availability();
    return () => {
      disposed = true; cancel(); queue = []; current = null;
      state.listeners.delete(update); observer?.disconnect(); coverObserver?.disconnect(); resizeObserver?.disconnect();
      doc.removeEventListener("visibilitychange", availability);
      motion?.removeEventListener("change", onMotion);
    };
  }
  return Object.freeze({ limit, normalizeMode, readMode, saveMode, record, entries, renderShell, watchTrace });
});
