/**
 * The daily challenge clock.
 *
 * Kept as a plain value plus pure functions rather than a ticking counter, so
 * it survives being serialised into localStorage and can be asserted without
 * fake timers. Nothing here reads the clock unless you hand it a `now`.
 */

export type Timer = {
  /** Milliseconds banked from previous running stretches. */
  accumulatedMs: number;
  /** Epoch ms the current stretch began, or null when paused. */
  runningSince: number | null;
};

export const IDLE_TIMER: Timer = { accumulatedMs: 0, runningSince: null };

export function startTimer(timer: Timer, now: number = Date.now()): Timer {
  if (timer.runningSince !== null) return timer;
  return { accumulatedMs: timer.accumulatedMs, runningSince: now };
}

export function pauseTimer(timer: Timer, now: number = Date.now()): Timer {
  if (timer.runningSince === null) return timer;
  return { accumulatedMs: timer.accumulatedMs + (now - timer.runningSince), runningSince: null };
}

export function elapsedMs(timer: Timer, now: number = Date.now()): number {
  const live = timer.runningSince === null ? 0 : now - timer.runningSince;
  return timer.accumulatedMs + live;
}

/** Shape check for a value read back out of localStorage. */
export function isTimer(value: unknown): value is Timer {
  if (typeof value !== "object" || value === null) return false;
  const t = value as Record<string, unknown>;
  return (
    typeof t.accumulatedMs === "number" &&
    Number.isFinite(t.accumulatedMs) &&
    (t.runningSince === null || typeof t.runningSince === "number")
  );
}

/** "4:12", or "1:04:12" once a board takes more than an hour — and 40×40 can. */
export function formatDuration(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const seconds = total % 60;
  const minutes = Math.floor(total / 60) % 60;
  const hours = Math.floor(total / 3600);
  const pad = (n: number) => String(n).padStart(2, "0");
  return hours > 0 ? `${hours}:${pad(minutes)}:${pad(seconds)}` : `${minutes}:${pad(seconds)}`;
}
