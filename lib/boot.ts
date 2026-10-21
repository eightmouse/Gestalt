export function scheduleBootCompletion(onComplete: () => void, elapsed = 0) {
  const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
  let timer = 0;
  const stop = () => {
    window.clearTimeout(timer);
    motion.removeEventListener("change", onMotionChange);
  };
  const finish = () => {
    stop();
    onComplete();
  };
  const onMotionChange = () => {
    if (motion.matches) finish();
  };
  motion.addEventListener("change", onMotionChange);
  if (motion.matches) finish();
  else timer = window.setTimeout(finish, Math.max(0, 2800 - elapsed));
  return stop;
}
