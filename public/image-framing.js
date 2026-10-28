(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.GestaltImageFraming = api;
})(typeof globalThis === "object" ? globalThis : this, function () {
function bounded(value, fallback, min, max) {
  if (typeof value !== "number" && !(typeof value === "string" && value.trim())) return fallback;
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(min, Math.min(max, Math.round(number))) : fallback;
}

function normalizeImageFrame(value) {
  return {
    bannerFit: value?.bannerFit === "cover" || value?.bannerFit === "contain" ? value.bannerFit : "",
    bannerZoom: bounded(value?.bannerZoom, 100, 50, 200),
    bannerX: bounded(value?.bannerX, 50, 0, 100),
    bannerY: bounded(value?.bannerY, 50, 0, 100)
  };
}

function imageFrameFields(value) {
  const frame = normalizeImageFrame(value);
  return {
    ...(frame.bannerFit ? { bannerFit: frame.bannerFit } : {}),
    ...(frame.bannerZoom !== 100 ? { bannerZoom: frame.bannerZoom } : {}),
    ...(frame.bannerX !== 50 ? { bannerX: frame.bannerX } : {}),
    ...(frame.bannerY !== 50 ? { bannerY: frame.bannerY } : {})
  };
}

function imageFrameStyle(value, defaultFit = "cover") {
  if (!Object.keys(imageFrameFields(value)).length) return undefined;
  const frame = normalizeImageFrame(value);
  const position = `${frame.bannerX}% ${frame.bannerY}%`;
  return {
    objectFit: frame.bannerFit || (defaultFit === "contain" ? "contain" : "cover"),
    objectPosition: position,
    transform: `scale(${frame.bannerZoom / 100})`,
    transformOrigin: position
  };
}

function imageFrameCss(value, defaultFit) {
  const style = imageFrameStyle(value, defaultFit);
  return style ? `object-fit:${style.objectFit};object-position:${style.objectPosition};transform:${style.transform};transform-origin:${style.transformOrigin}` : "";
}

function normalizeHeaderFrame(value) {
  return {
    headerZoom: bounded(value?.headerZoom, 100, 100, 200),
    headerX: bounded(value?.headerX, 50, 0, 100),
    headerY: bounded(value?.headerY, 50, 0, 100)
  };
}

function headerFrameFields(value) {
  const frame = normalizeHeaderFrame(value);
  return {
    ...(frame.headerZoom !== 100 ? { headerZoom: frame.headerZoom } : {}),
    ...(frame.headerX !== 50 ? { headerX: frame.headerX } : {}),
    ...(frame.headerY !== 50 ? { headerY: frame.headerY } : {})
  };
}

function headerFrameStyle(value) {
  if (!Object.keys(headerFrameFields(value)).length) return undefined;
  const frame = normalizeHeaderFrame(value);
  return {
    ...imageFrameStyle({ bannerZoom: frame.headerZoom, bannerX: frame.headerX, bannerY: frame.headerY }),
    "--header-image-scale": String(frame.headerZoom / 100)
  };
}

function headerFrameCss(value) {
  const style = headerFrameStyle(value);
  return style ? `object-fit:${style.objectFit};object-position:${style.objectPosition};transform:${style.transform};transform-origin:${style.transformOrigin};--header-image-scale:${style["--header-image-scale"]}` : "";
}
return { normalizeImageFrame, imageFrameFields, imageFrameStyle, imageFrameCss, normalizeHeaderFrame, headerFrameFields, headerFrameStyle, headerFrameCss };
});
