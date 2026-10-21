(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.GestaltXTerminal = api;
})(typeof globalThis === "object" ? globalThis : this, function () {
  function mount(root, options) {
    const doc = root.ownerDocument;
    const win = doc.defaultView;
    const url = new URL(options.embedUrl, doc.baseURI);
    const publishedHelper = url.href === "https://eightmouse.github.io/Gestalt/public/x-embed.html";
    if ((!publishedHelper && url.origin !== win.location.origin) || !url.pathname.endsWith("/x-embed.html") || url.search || url.hash || url.username || url.password) throw new Error("Invalid X terminal frame.");
    const ui = root.querySelector("[data-x-ui]");
    ui.innerHTML = `<button type="button" class="x-terminal-access" data-x-action="access"><span aria-hidden="true">&gt;_</span> Access X Terminal</button>
    <p class="x-terminal-notice" data-x-notice>External content. X may receive your IP address and cookies. <a href="https://help.x.com/en/x-for-websites-ads-info-and-privacy" target="_blank" rel="noopener noreferrer">Privacy</a></p>
    <div class="x-terminal-stage" data-x-stage hidden><div class="x-terminal-viewport" data-x-viewport></div><div class="x-terminal-accessing" aria-hidden="true"><span>ACCESSING</span><i></i></div></div>
    <div class="x-terminal-error" data-x-error hidden><p>X terminal unavailable.</p><button type="button" data-x-action="access">Try again</button>
    <a class="x-terminal-profile" data-x-profile href="https://x.com/Eitomausu" target="_blank" rel="noopener noreferrer" aria-label="Open @Eitomausu on X" title="Open @Eitomausu on X" hidden>On X &#8599;</a></div>
    <span class="sr-only" data-x-status role="status" aria-live="polite"></span>`;
    const find = (name) => ui.querySelector(`[data-x-${name}]`);
    const access = ui.querySelector('[data-x-action="access"]');
    let phase = "idle", frame = null, session = "", deadline = 0, reveal = 0, started = 0, destroyed = false;
    function setPhase(next) {
      phase = next;
      root.dataset.xState = next;
      access.hidden = next !== "idle";
      find("notice").hidden = next !== "idle";
      find("stage").hidden = next !== "accessing" && next !== "ready";
      find("error").hidden = next !== "unavailable";
      find("profile").hidden = next !== "unavailable";
      find("status").textContent = next === "ready" ? "X terminal ready." : next === "unavailable" ? "X terminal unavailable." : "";
      root.setAttribute("aria-busy", String(next === "accessing"));
      options.onPhase?.(next);
    }
    function clear() {
      win.clearTimeout(deadline);
      win.clearTimeout(reveal);
      deadline = reveal = 0;
      session = "";
      frame?.remove();
      frame = null;
    }
    function unavailable(reason) {
      if (destroyed || phase !== "accessing") return;
      root.dataset.xFailure = ["script-error", "widget-error", "empty-widget", "timeout"].includes(reason) ? reason : "unavailable";
      clear();
      setPhase("unavailable");
    }
    function start() {
      if (destroyed || phase === "accessing" || phase === "ready") return;
      clear();
      session = win.crypto.randomUUID();
      started = win.performance.now();
      root.dataset.xProgress = "script-loading";
      delete root.dataset.xFailure;
      setPhase("accessing");
      frame = doc.createElement("iframe");
      frame.title = "X terminal: posts from @Eitomausu";
      frame.setAttribute("sandbox", "allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox");
      frame.referrerPolicy = "no-referrer";
      frame.src = `${url.href}#session=${encodeURIComponent(session)}`;
      frame.addEventListener("error", unavailable, { once: true });
      find("viewport").append(frame);
      deadline = win.setTimeout(() => unavailable("timeout"), 14000);
    }
    function message(event) {
      if (destroyed || phase !== "accessing" || !frame || event.source !== frame.contentWindow || event.origin !== url.origin) return;
      const data = event.data;
      if (!data || data.type !== "gestalt-x-terminal" || data.session !== session) return;
      if (data.phase === "progress" && data.stage === "widget-loading") { root.dataset.xProgress = data.stage; return; }
      if (data.phase === "unavailable") return unavailable(data.reason);
      if (data.phase !== "ready" || reveal) return;
      win.clearTimeout(deadline);
      const duration = win.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 650;
      reveal = win.setTimeout(() => { if (!destroyed && frame && phase === "accessing") setPhase("ready"); }, Math.max(0, duration - (win.performance.now() - started)));
    }
    function click(event) {
      const action = event.target.closest?.("[data-x-action]")?.dataset.xAction;
      if (!action) return;
      event.preventDefault();
      event.stopPropagation();
      if (action === "access") start();
    }
    root.addEventListener("click", click);
    win.addEventListener("message", message);
    setPhase("idle");
    return { destroy() {
      destroyed = true;
      clear();
      root.removeEventListener("click", click);
      win.removeEventListener("message", message);
      ui.replaceChildren();
    } };
  }

  // Keep every ancestor connected: detaching/reinserting an iframe reloads it.
  function preserveRender(root, html) {
    const retained = root.querySelector("[data-x-terminal]");
    if (!retained) return false;
    const template = root.ownerDocument.createElement("template");
    template.innerHTML = html;
    const nextRetained = template.content.querySelector("[data-x-terminal]");
    if (!nextRetained) return false;
    function chain(node, ancestor) {
      const result = [];
      while (node && node !== ancestor) { result.unshift(node); node = node.parentNode; }
      return node === ancestor ? [ancestor, ...result] : [];
    }
    const current = chain(retained, root), next = chain(nextRetained, template.content);
    if (current.length !== next.length || !current.length || current.some((node, i) => i && node.nodeName !== next[i].nodeName)) return false;
    for (let i = 0; i < current.length - 1; i++) {
      const parent = current[i], fresh = next[i], keep = current[i + 1], placeholder = next[i + 1];
      if (i) {
        for (const attr of [...parent.attributes]) if (!fresh.hasAttribute(attr.name)) parent.removeAttribute(attr.name);
        for (const attr of [...fresh.attributes]) parent.setAttribute(attr.name, attr.value);
      }
      for (const node of [...parent.childNodes]) if (node !== keep) node.remove();
      let before = true;
      for (const node of [...fresh.childNodes]) {
        if (node === placeholder) before = false;
        else if (before) parent.insertBefore(node, keep);
        else parent.append(node);
      }
    }
    return true;
  }
  return { mount, preserveRender };
});
