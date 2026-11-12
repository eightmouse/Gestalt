(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.GestaltPocketIndex = api;
})(globalThis, function () {
  const directory = [
    ["projects", "02", "Projects"], ["games", "03", "Games"], ["logs", "04", "Logs"],
    ["setup", "05", "Setup"], ["archive", "06", "Field Archive"]
  ];
  const bootKey = "gestalt.handheld-boot";
  const seenKey = "gestalt.handheld-boot-seen";
  const stamp = '<span class="pocket-stamp" aria-hidden="true"><i></i><i></i><i></i></span>';
  const bootMarkup = `<div class="pocket-boot" aria-hidden="true"><div class="pocket-boot-screen"><div class="pocket-boot-panel">
    <div class="pocket-boot-ledger"><p>Checking systems...</p><dl><div><dt>Archive storage</dt><dd>Mounted</dd></div><div><dt>Server</dt><dd>Online</dd></div><div><dt>Reactor</dt><dd>Operational</dd></div></dl></div>
    <div class="pocket-boot-face"><div><strong>GESTALT</strong><span>HANDHELD FIELD MODE</span></div>${stamp}<div class="pocket-boot-meter"><i></i></div></div>
    </div></div><div class="pocket-boot-scan"></div></div>`;

  function isHandheld(host = globalThis.window) {
    return Boolean(host?.matchMedia("(max-width: 760px)").matches);
  }
  function recordPage(records, requestedPage = 0) {
    const size = 4;
    const pages = Math.max(1, Math.ceil(records.length / size));
    const page = Math.max(0, Math.min(pages - 1, Number.isInteger(requestedPage) ? requestedPage : 0));
    return { records: records.slice(page * size, (page + 1) * size), page, pages };
  }
  function normalizeBootMode(value) { return value === "always" ? "always" : "once"; }
  function readBootMode(host = globalThis.window) {
    try {
      const storage = host.localStorage;
      if (storage.getItem("gestalt.local-memory") === "granted") return normalizeBootMode(storage.getItem(bootKey));
    } catch { /* Storage is optional. */ }
    return "once";
  }
  function saveBootMode(value, host = globalThis.window) {
    try {
      const storage = host.localStorage;
      if (storage.getItem("gestalt.local-memory") !== "granted") return false;
      storage.setItem(bootKey, normalizeBootMode(value));
      return true;
    } catch { return false; }
  }
  function markBootSeen(host = globalThis.window) {
    try { host.sessionStorage.setItem(seenKey, "1"); } catch { /* Storage is optional. */ }
  }
  function shouldPlayBoot(mode, remember, host = globalThis.window) {
    if (host.matchMedia("(prefers-reduced-motion: reduce)").matches) return false;
    if (mode === "always" || !remember) return true;
    try { return host.sessionStorage.getItem(seenKey) !== "1"; } catch { return true; }
  }

  function meterFrames(random = Math.random) {
    const checkpoint = 0.3 + random() * 0.27;
    const holdAt = 0.24 + random() * 0.2;
    const holdUntil = holdAt + 0.15 + random() * 0.1;
    const finish = 0.76 + random() * 0.09;
    const frame = (offset, fill, easing = "linear") => ({ offset, transform: `scaleX(${fill})`, easing });
    return [frame(0, 0, "ease-out"), frame(holdAt, checkpoint), frame(holdUntil, checkpoint + 0.016, "ease-in-out"), frame(finish, 0.79 + random() * 0.12, "ease-out"), frame(1, 1)];
  }

  function runBoot(shell, onComplete, { mode, remember }, host = globalThis.window) {
    const boot = shell?.querySelector(".pocket-boot-screen");
    const cover = boot?.parentElement;
    if (!cover || !shouldPlayBoot(mode, remember, host)) {
      if (cover) cover.hidden = true;
      onComplete();
      return () => {};
    }
    const motion = host.matchMedia("(prefers-reduced-motion: reduce)");
    const width = host.matchMedia("(max-width: 760px)");
    let timer, meter, active = true;
    function stop() {
      active = false;
      host.clearTimeout(timer);
      meter?.cancel();
      boot.removeEventListener("animationend", onEnd);
      motion.removeEventListener("change", onChange);
      width.removeEventListener("change", onChange);
      shell.removeAttribute("data-pocket-booting");
    }
    function finish() {
      if (!active) return;
      cover.hidden = true;
      stop();
      if (remember && !motion.matches && width.matches) markBootSeen(host);
      onComplete();
    }
    function onEnd(event) { if (event.target === boot && event.animationName === "pocket-boot-wipe") finish(); }
    function onChange() { if (motion.matches || !width.matches) finish(); }
    boot.addEventListener("animationend", onEnd);
    motion.addEventListener("change", onChange);
    width.addEventListener("change", onChange);
    shell.setAttribute("data-pocket-booting", "");
    cover.hidden = false;
    meter = shell.querySelector(".pocket-boot-meter i")?.animate?.(meterFrames(), { duration: 1470, delay: 1580, fill: "both" });
    timer = host.setTimeout(finish, 4100);
    return stop;
  }

  function resolveTitle(title, host = globalThis.window) {
    if (!title?.textContent || !isHandheld(host) || host.matchMedia("(prefers-reduced-motion: reduce)").matches) return () => {};
    const parent = title.parentElement;
    if (!parent || parent.hasAttribute("data-pocket-resolving")) return () => {};
    const text = Array.from(title.textContent), glyphs = "XK72NV3M4ZT";
    const cipher = title.ownerDocument.createElement("span");
    cipher.className = `${title.className} pocket-title-cipher`;
    cipher.setAttribute("aria-hidden", "true");
    parent.setAttribute("data-pocket-resolving", "");
    parent.append(cipher);
    let timer;
    const start = host.performance.now();
    const motion = host.matchMedia("(prefers-reduced-motion: reduce)");
    function stop() {
      host.clearTimeout(timer);
      motion.removeEventListener("change", onChange);
      parent.removeAttribute("data-pocket-resolving");
      cipher.remove();
    }
    function onChange() { if (motion.matches) stop(); }
    function step() {
      const frame = Math.floor((host.performance.now() - start) / 64);
      if (frame >= 6 || !parent.isConnected) { stop(); return; }
      const settled = Math.floor(text.length * frame / 6);
      cipher.textContent = text.map((character, index) => index < settled || !/[a-z0-9]/i.test(character) ? character : glyphs[(index * 3 + frame * 2) % glyphs.length]).join("");
      timer = host.setTimeout(step, 64);
    }
    motion.addEventListener("change", onChange);
    step();
    return stop;
  }
  return { directory, stamp, bootMarkup, isHandheld, recordPage, normalizeBootMode, readBootMode, saveBootMode, markBootSeen, shouldPlayBoot, meterFrames, runBoot, resolveTitle };
});
