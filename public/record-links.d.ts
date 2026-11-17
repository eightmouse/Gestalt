declare const recordLinks: {
  isRecordLink(hash: string): boolean;
  recordId(hash: string): string | null;
  traceId(id: string, section: string): string;
  target(hash: string): { recordId: string; noteId?: string } | null;
  shareUrl(href: string, id: string, noteId?: string): string | null;
  open(browser: Window, id: string, noteId?: string): void;
  close(browser: Window): void;
  copyFromControl(button: HTMLButtonElement, id: string, noteId?: string): Promise<void>;
};

export default recordLinks;
