declare const ambientMotion: {
  initialize(document?: Document): void;
  watchMemory(node: HTMLElement | null, host?: Window): () => void;
  screenShape(ratio: number): "wide" | "tall" | null;
  screenLightColour(pixels: ArrayLike<number>): string | null;
};
export default ambientMotion;
