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
return { normalizeImageFrame, imageFrameFields, imageFrameStyle, imageFrameCss };
});
