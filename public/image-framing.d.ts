export type ImageFrame = {
  bannerFit: "" | "cover" | "contain";
  bannerZoom: number;
  bannerX: number;
  bannerY: number;
};
export type HeaderFrame = {
  headerZoom: number;
  headerX: number;
  headerY: number;
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
normalizeHeaderFrame(value: unknown): HeaderFrame;
headerFrameFields(value: unknown): Partial<HeaderFrame>;
headerFrameStyle(value: unknown): (NonNullable<ReturnType<typeof imageFraming.imageFrameStyle>> & { "--header-image-scale": string }) | undefined;
headerFrameCss(value: unknown): string;
};
export default imageFraming;
