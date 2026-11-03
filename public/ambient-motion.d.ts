declare const ambientMotion: {
  initialize(document?: Document): void;
  watchMemory(node: HTMLElement | null, host?: Window): () => void;
};
export default ambientMotion;
