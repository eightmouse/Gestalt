declare const ambientMotion: {
  initialize(document?: Document): void;
  watchMemory(node: HTMLElement | null, host?: Window): () => void;
  screenLightColour(pixels: ArrayLike<number>): string | null;
};
export default ambientMotion;
