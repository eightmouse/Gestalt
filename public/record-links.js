(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.GestaltRecordLinks = factory();
})(globalThis, function () {
  const prefix = "#record=";
  const frame = "gestaltRecordFrame";
  const validId = (id) => typeof id === "string" && /^[a-z0-9][a-z0-9-]{0,79}$/.test(id);
  const isRecordLink = (hash) => hash.startsWith(prefix);
  const feedbackTimers = new WeakMap();

  function target(hash) {
    const match = /^#record=([a-z0-9][a-z0-9-]{0,79})(?:&note=(main|n-[a-f0-9]{32}))?$/.exec(hash);
    return match ? { recordId: match[1], noteId: match[2] } : null;
  }

  const recordId = (hash) => target(hash)?.recordId ?? null;
  const recordHash = (id, noteId) => prefix + id + (noteId && /^(?:main|n-[a-f0-9]{32})$/.test(noteId) ? `&note=${noteId}` : "");

  function traceId(id, section) {
    // FNV-1a keeps the display label compact and independent of title, dates, and sort priority.
    let hash = 0x811c9dc5;
    for (let index = 0; index < id.length; index++) hash = Math.imul(hash ^ id.charCodeAt(index), 0x01000193);
    return `#${section.slice(0, 3).toUpperCase()}-${(hash >>> 0).toString(36).toUpperCase().padStart(7, "0")}`;
  }

  function shareUrl(href, id, noteId) {
    if (!validId(id)) return null;
    const url = new URL(href);
    if (!/^https?:$/.test(url.protocol) || url.username || url.password) return null;
    url.search = "";
    url.pathname = url.pathname.replace(/\/index\.html$/, "/");
    url.hash = recordHash(id, noteId);
    return url.href;
  }

  function writeAddress(history, method, state, url) {
    try { history[method](state, "", url); } catch { /* The reader still works when history is unavailable. */ }
  }

  function open(browser, id, noteId) {
    if (!validId(id)) return;
    const { history, location } = browser;
    const previousId = recordId(location.hash);
    const hash = recordHash(id, noteId);
    if (location.hash === hash) return;
    const replacing = isRecordLink(location.hash);
    const url = new URL(location.href);
    url.hash = hash;
    const state = { ...history.state };
    if (!replacing || (previousId && state[frame] === previousId)) state[frame] = id;
    else delete state[frame];
    writeAddress(history, replacing ? "replaceState" : "pushState", state, url);
  }

  function close(browser) {
    const { history, location } = browser;
    if (!isRecordLink(location.hash)) return;
    const id = recordId(location.hash);
    // A pasted link may have arrived from another site. Only pop frames we added.
    if (id && history.state?.[frame] === id) {
      history.back();
      return;
    }
    const url = new URL(location.href);
    url.hash = "";
    const state = { ...history.state };
    delete state[frame];
    writeAddress(history, "replaceState", state, url);
  }

  async function copyFromControl(button, id, noteId) {
    const container = button.closest(".note-link-tools") || button.closest(".record-window");
    const feedback = container?.querySelector(".record-link-feedback");
    const status = feedback?.querySelector("[data-record-copy-status]");
    const input = feedback?.querySelector("input");
    if (!feedback || !status || !input) return;
    const browser = button.ownerDocument.defaultView;
    const url = shareUrl(browser.location.href, id, noteId);
    const subject = noteId ? "Note" : "Record";
    browser.clearTimeout(feedbackTimers.get(feedback));
    input.hidden = true;
    if (url) {
      try {
        await browser.navigator.clipboard.writeText(url);
        status.textContent = `${subject} link copied.`;
      } catch {
        status.textContent = `Copy the ${subject.toLowerCase()} link:`;
        input.value = url;
        input.hidden = false;
        input.focus({ preventScroll: true });
        input.select();
        return;
      }
    } else status.textContent = "Open the hosted archive to copy a link.";
    feedbackTimers.set(feedback, browser.setTimeout(() => { status.textContent = ""; }, 2600));
  }

  return Object.freeze({ isRecordLink, recordId, traceId, target, shareUrl, open, close, copyFromControl });
});
