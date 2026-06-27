import { shuffle } from "./util";

export type Stagger = {
  /** Per-id animation delay in ms. */
  delays: Map<string, number>;
  /** Total time (ms) until the last animation finishes. */
  totalMs: number;
};

/**
 * Assigns each id a staggered animation delay (ms) in random order, capped at
 * `maxStep` per item so large boards still finish within roughly `windowMs`.
 * `tailMs` is the duration of a single item's animation, added to `totalMs`.
 */
export function staggerDelays(
  ids: string[],
  { windowMs, maxStep, tailMs }: { windowMs: number; maxStep: number; tailMs: number },
): Stagger {
  const n = ids.length;
  const step = Math.min(maxStep, windowMs / Math.max(1, n));
  const ranks = shuffle([...Array(n).keys()]);
  const delays = new Map<string, number>();
  ids.forEach((id, i) => delays.set(id, ranks[i] * step));
  return { delays, totalMs: (n - 1) * step + tailMs };
}
