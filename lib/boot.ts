import type { StartupMode } from "@/public/os-behaviour.js";

export function scheduleBootCompletion(onComplete: () => void, elapsed = 0, mode: StartupMode = "full") {
  const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
  let timer = 0;
  let active = true;
  const stop = () => {
    active = false;
    window.clearTimeout(timer);
    motion.removeEventListener("change", onMotionChange);
  };
  const finish = () => {
    if (!active) return;
    stop();
    onComplete();
  };
  const onMotionChange = () => {
    if (motion.matches) finish();
  };
  motion.addEventListener("change", onMotionChange);
  if (motion.matches) finish();
  // Matches the power-on timeline in globals.css: the last screen flare settles by 2.98s (quick 1.54s).
  else timer = window.setTimeout(finish, Math.max(0, (mode === "quick" ? 1600 : 3000) - elapsed));
  return stop;
}
