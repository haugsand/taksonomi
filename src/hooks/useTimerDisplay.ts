import { useEffect, useState } from "preact/hooks";
import { elapsedMs, type Timer } from "@/lib/timer";

/**
 * Elapsed milliseconds for a timer, re-rendered while it runs.
 *
 * Ticks four times a second rather than once: at 1 Hz the displayed second
 * changes up to a full second late, which is visible when the clock stops and
 * the completion sheet shows a different number than the header did.
 *
 * The value is derived, never stored — so this hook can be dropped anywhere
 * without becoming a second source of truth for how long the game has taken.
 */
export function useTimerDisplay(timer: Timer | null): number {
  const [, setTick] = useState(0);

  useEffect(() => {
    if (!timer || timer.runningSince === null) return;
    const id = setInterval(() => setTick((n) => n + 1), 250);
    return () => clearInterval(id);
  }, [timer]);

  return timer ? elapsedMs(timer) : 0;
}
