"use client";

import { RotateCcw } from "lucide-react";
import imageFraming, { type ImageFrame } from "@/public/image-framing.js";
import { steamBannerImage } from "@/public/steam-display.mjs";

export function ArtworkFraming({ banner, frame, onChange }: {
  banner: string;
  frame: ImageFrame;
  onChange: (frame: ImageFrame) => void;
}) {
  if (!banner) return null;
  const steamBanner = steamBannerImage(banner);
  return (
    <details className="studio-artwork-framing">
      <summary title="Adjusts the overview image, not the background behind the entry title">Frame overview artwork</summary>
      <div className={steamBanner ? "banner-frame banner-frame--steam" : "banner-frame"}>
        <img key={steamBanner || banner} src={steamBanner || banner} alt="Artwork framing preview" style={imageFraming.imageFrameStyle(frame, steamBanner ? "contain" : "cover")} onError={(event) => {
          if (!steamBanner || event.currentTarget.dataset.coverFallback) return;
          event.currentTarget.dataset.coverFallback = "true";
          event.currentTarget.src = banner;
        }} />
      </div>
      <div className="studio-artwork-fit" role="group" aria-label="Artwork fit">
        {([["", "Automatic"], ["contain", "Fit"], ["cover", "Fill"]] as const).map(([value, label]) => (
          <button key={value} type="button" aria-pressed={frame.bannerFit === value} onClick={() => onChange({ ...frame, bannerFit: value })}>{label}</button>
        ))}
      </div>
      {([["bannerZoom", "Zoom", 50, 200], ["bannerX", "Horizontal position", 0, 100], ["bannerY", "Vertical position", 0, 100]] as const).map(([key, label, min, max]) => (
        <label className="studio-artwork-slider" key={key}>
          <span>{label}</span>
          <input type="range" min={min} max={max} value={frame[key]} onChange={(event) => onChange({ ...frame, [key]: Number(event.target.value) })} />
          <output>{frame[key]}%</output>
        </label>
      ))}
      <button className="studio-artwork-reset" type="button" onClick={() => onChange(imageFraming.normalizeImageFrame(null))}>
        <RotateCcw size={14} aria-hidden="true" /> Reset framing
      </button>
    </details>
  );
}
