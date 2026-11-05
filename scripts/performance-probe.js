// Development harness only: bounded sampling, no storage, requests or visitor content.
(() => {
  const reports = [];
  let sample, frame = 0, deadline = 0;
  const output = document.createElement("output");
  output.id = "gestalt-performance-report";
  output.style.cssText = "position:fixed;z-index:9999;left:8px;bottom:8px;max-width:560px;max-height:130px;overflow:auto;pointer-events:none;white-space:pre-wrap;background:#101310;color:#ece6d3;font:12px/1.4 monospace;padding:6px;border:1px solid #827f74";
  document.body.append(output);
  function finish() {
    if (!sample) return;
    cancelAnimationFrame(frame);
    clearTimeout(deadline);
    const gaps = sample.gaps.sort((a, b) => a - b);
    reports.push({ action: sample.label, viewport: sample.viewport, frames: gaps.length, p95: Math.round(gaps[Math.floor(gaps.length * .95)] || 0), max: Math.round(gaps.at(-1) || 0), over34ms: gaps.filter((gap) => gap > 34).length, longTasks: sample.tasks.length, longestTask: Math.round(Math.max(0, ...sample.tasks)), rootReplaced: sample.rootReplaced, addedNodes: sample.addedNodes });
    if (reports.length > 14) reports.shift();
    sample = null;
    output.textContent = JSON.stringify({ reports }, null, 1);
  }
  function tick(now) {
    if (!sample) return;
    if (sample.previous) sample.gaps.push(now - sample.previous);
    sample.previous = now;
    frame = requestAnimationFrame(tick);
  }
  function begin(label, duration = 3600) {
    finish();
    sample = { label, viewport: [innerWidth, innerHeight], gaps: [], tasks: [], previous: 0, rootReplaced: 0, addedNodes: 0 };
    frame = requestAnimationFrame(tick);
    deadline = setTimeout(finish, duration);
    output.textContent = `Sampling ${label}...`;
  }
  new MutationObserver((changes) => {
    if (!sample) return;
    for (const change of changes) {
      if (change.target.id === "root" && change.removedNodes.length) sample.rootReplaced++;
      sample.addedNodes += change.addedNodes.length;
    }
  }).observe(document.getElementById("root"), { childList: true, subtree: true });
  if (typeof PerformanceObserver === "function" && PerformanceObserver.supportedEntryTypes.includes("longtask")) {
    new PerformanceObserver((list) => { if (sample) for (const entry of list.getEntries()) sample.tasks.push(entry.duration); }).observe({ type: "longtask" });
  }
  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape" && event.target.closest?.("input,textarea,select,[contenteditable]")) return;
    if (["t", "s", "Escape", "~"].includes(event.key)) begin(`key ${event.key}`);
  }, true);
  document.addEventListener("pointerdown", (event) => {
    const control = event.target.closest?.("button,summary");
    if (control) begin(control.getAttribute("aria-label") || control.getAttribute("data-window-action") || (control.hasAttribute("data-open-record") ? "open record" : control.getAttribute("data-content-key")) || control.tagName);
  }, true);
  document.addEventListener("visibilitychange", () => { if (document.hidden) finish(); });
  begin("boot", 6500);
})();
