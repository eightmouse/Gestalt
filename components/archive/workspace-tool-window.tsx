"use client";

import { useEffect, useRef } from "react";
import tools from "@/public/workspace-tools.js";

export function WorkspaceToolWindow({ mode, remember, onClose }: { mode: "search" | "connections"; remember: boolean; onClose: () => void }) {
  const callback = useRef(onClose);
  callback.current = onClose;
  useEffect(() => {
    const controller = tools.createController();
    controller.open({ mode, remember, onClose: () => callback.current() });
    return () => controller.destroy();
  }, [mode, remember]);
  return null;
}
