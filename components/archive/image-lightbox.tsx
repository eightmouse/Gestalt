"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";

export function ImageLightbox({ image, label, onClose }: {
  image: { src: string; alt: string };
  label: string;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement | null>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const trigger = document.activeElement;
    dialog.showModal();
    return () => {
      if (dialog.open) dialog.close();
      if (trigger instanceof HTMLElement && trigger.isConnected) trigger.focus({ preventScroll: true });
    };
  }, []);

  if (typeof document === "undefined") return null;

  return createPortal(
    <dialog
      ref={dialogRef}
      className="note-image-dialog"
      aria-label={image.alt || "Expanded image"}
      onKeyDown={(event) => event.stopPropagation()}
      onCancel={(event) => { event.preventDefault(); event.stopPropagation(); onClose(); }}
    >
      <button className="note-image-lightbox" type="button" aria-label={label} onClick={(event) => { event.stopPropagation(); onClose(); }}>
        <img src={image.src} alt={image.alt} decoding="async" />
      </button>
    </dialog>,
    document.body
  );
}
