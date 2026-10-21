export type ImageFrame = {
  bannerFit: "" | "cover" | "contain";
  bannerZoom: number;
  bannerX: number;
  bannerY: number;
};
declare const imageFraming: {
normalizeImageFrame(value: unknown): ImageFrame;
imageFrameFields(value: unknown): Partial<ImageFrame>;
imageFrameStyle(value: unknown, defaultFit?: "cover" | "contain"): {
  objectFit: "cover" | "contain";
  objectPosition: string;
  transform: string;
  transformOrigin: string;
} | undefined;
imageFrameCss(value: unknown, defaultFit?: "cover" | "contain"): string;
};
export default imageFraming;
