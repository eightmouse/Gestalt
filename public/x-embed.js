(function () {
  const session = new URLSearchParams(window.location.hash.slice(1)).get("session");
  if (window.parent === window || !session || !/^[a-zA-Z0-9-]{1,80}$/.test(session)) return;
  const send = (phase, extra = {}) => window.parent.postMessage({ type: "gestalt-x-terminal", session, phase, ...extra }, "*");
  let widget = null;
  function size() {
    if (widget) {
      widget.style.height = `${Math.max(1, window.innerHeight)}px`;
      widget.style.minHeight = "0";
    }
  }
  const script = document.createElement("script");
  script.src = "https://platform.twitter.com/widgets.js";
  script.async = true;
  script.referrerPolicy = "no-referrer";
  script.onerror = () => send("unavailable", { reason: "script-error" });
  script.onload = async () => {
    try {
      if (!window.twttr?.widgets?.createTimeline) return send("unavailable", { reason: "widget-error" });
      send("progress", { stage: "widget-loading" });
      widget = await window.twttr.widgets.createTimeline(
        { sourceType: "profile", screenName: "Eitomausu" },
        document.querySelector("#x-feed"),
        { theme: "dark", height: Math.max(180, window.innerHeight), width: Math.max(180, window.innerWidth), dnt: true, chrome: "noheader nofooter noborders transparent" }
      );
      if (!widget) return send("unavailable", { reason: "empty-widget" });
      widget.title = "Posts from @Eitomausu on X";
      widget.referrerPolicy = "no-referrer";
      size();
      window.addEventListener("resize", size, { passive: true });
      send("ready");
    } catch {
      send("unavailable", { reason: "widget-error" });
    }
  };
  document.head.append(script);
})();
