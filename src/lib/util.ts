export const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

/**
 * Returns a new array with the elements of `arr` in random order
 * (Fisher–Yates).
 *
 * `rng` exists for the daily challenge: hand it a seeded generator and every
 * player opens the same board in the same arrangement. See lib/daily.ts.
 */
export function shuffle<T>(arr: T[], rng: () => number = Math.random): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
