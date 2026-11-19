declare const sectionMotion: {
  preparePlateTurn(node: HTMLElement | null, direction: -1 | 1, host?: Window): () => void;
  openProjectPlate(node: HTMLButtonElement, onOpen: () => void, host?: Window): void;
  bindProjectSwipe(node: HTMLElement | null, onStep: (direction: -1 | 1) => void, host?: Window): () => void;
  bindProjectRotation(node: HTMLElement | null, onNext: () => void, host?: Window): () => void;
  bindInstrumentShelf(node: HTMLElement | null, host?: Window): () => void;
  revealInstrumentShelf(node: HTMLElement | null, host?: Window): () => void;
  revealProjectReader(node: HTMLElement | null, host?: Window): () => void;
  bindSectionStandby(node: HTMLElement | null, kind: "games" | "projects", host?: Window): () => void;
  openInstrumentSleeve(node: HTMLButtonElement, onOpen: () => void, pointer?: boolean): void;
};
export default sectionMotion;
