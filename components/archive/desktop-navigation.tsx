"use client";

import { useEffect, useRef, type RefObject } from "react";
import navigation, { type DesktopNavigationController, type DesktopNavigationMode } from "@/public/desktop-navigation.js";

export function useDesktopNavigation(shellRef: RefObject<HTMLElement | null>, mode: DesktopNavigationMode, ready: boolean, busy: boolean, palette: boolean) {
  const controller = useRef<DesktopNavigationController | null>(null);
  useEffect(() => {
    controller.current = navigation.createController();
    return () => { controller.current?.destroy(); controller.current = null; };
  }, []);
  useEffect(() => { controller.current?.attach(shellRef.current, { mode, ready, busy, palette }); }, [shellRef, mode, ready, busy, palette]);
}

export function DesktopNavigationChrome() {
  return <>
    <button className="desktop-nav-edge" data-desktop-nav-toggle type="button" aria-label="Open archive navigation" title="Open archive navigation" aria-controls="desktop-archive-sidebar" aria-expanded="false">
      <span className="archive-menu-glyph" aria-hidden="true"><i /></span>
    </button>
    <button className="desktop-nav-backdrop" data-desktop-nav-dismiss type="button" aria-label="Close archive navigation" tabIndex={-1} />
    <div className="desktop-nav-shutter" aria-hidden="true" />
  </>;
}
