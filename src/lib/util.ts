export const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

/** Returns a new array with the elements of `arr` in random order (Fisher–Yates). */
export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
