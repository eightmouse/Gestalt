"use client";

import { useEffect, useRef } from "react";
import behaviour, { type PreferenceHandlers, type PreferenceValues } from "@/public/os-behaviour.js";

export function OsBehaviourWindow({ values, remember, onChange, onClose }: PreferenceHandlers & { values: PreferenceValues; remember: boolean }) {
  const handlers = useRef({ onChange, onClose });
  handlers.current = { onChange, onClose };
  const initial = useRef({ values, remember });
  const controller = useRef<ReturnType<typeof behaviour.createController> | null>(null);
  useEffect(() => {
    const dialog = behaviour.createController();
    controller.current = dialog;
    dialog.open(initial.current.values, { onChange: (key, value) => handlers.current.onChange(key, value), onClose: () => handlers.current.onClose() }, initial.current.remember);
    return () => { dialog.destroy(); controller.current = null; };
  }, []);
  useEffect(() => { controller.current?.update(values, remember); }, [values, remember]);
  return null;
}
