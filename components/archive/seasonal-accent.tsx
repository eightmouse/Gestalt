"use client";

import { useEffect, useRef } from "react";
import seasonal, { type SeasonalMode } from "@/public/seasonal.js";

export function SeasonalAccent({ now, mode }: { now: Date | null; mode: SeasonalMode }) {
  const detail = seasonal.seasonFor(now, mode);
  const layerRef = useRef<HTMLDivElement>(null);
  const active = Boolean(detail?.decorations.length);
  useEffect(() => {
    if (!active) return;
    const updateVisibility = () => layerRef.current?.toggleAttribute("data-paused", document.hidden);
    updateVisibility();
    document.addEventListener("visibilitychange", updateVisibility);
    return () => document.removeEventListener("visibilitychange", updateVisibility);
  }, [active]);

  return <div ref={layerRef} className="seasonal-accent" data-seasonal-accent aria-hidden="true" hidden={!active} data-season={detail?.id ?? ""}>
    {detail?.decorations.map((decoration) => <span className="seasonal-decoration" data-placement={decoration.placement} key={decoration.placement}>
      <img src={decoration.image.replace(/^public\//, "/")} alt="" decoding="async" draggable={false} />
      {decoration.glowImage ? <img className="seasonal-glow" src={decoration.glowImage.replace(/^public\//, "/")} alt="" decoding="async" draggable={false} /> : null}
    </span>)}
  </div>;
}
