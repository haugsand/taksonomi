import type { Category } from "../src/lib/types";
import { CATEGORIES } from "./categories-data";

function shuffle<T>(arr: readonly T[], rng: () => number): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Largest game the data can support, used to clamp incoming parameters. */
export const MAX_GROUPS = CATEGORIES.length;
export const MAX_WORDS_PER_GROUP = Math.min(...CATEGORIES.map((c) => c.words.length));

/**
 * Pick `groups` random categories and, within each, `wordsPerGroup` random
 * words. The returned word order is the random pick order and is treated as
 * canonical by the client when ordering merged tiles.
 *
 * `rng` defaults to `Math.random` — a fresh board every call. The daily
 * challenge passes a seeded generator instead, which is the whole mechanism
 * behind "same board for everyone": same seed in, same categories and same
 * words out, on every machine that runs this.
 */
export function pickCategories(
  groups: number,
  wordsPerGroup: number,
  rng: () => number = Math.random,
): Category[] {
  const g = clampInt(groups, 1, MAX_GROUPS);
  const w = clampInt(wordsPerGroup, 1, MAX_WORDS_PER_GROUP);
  return shuffle(CATEGORIES, rng)
    .slice(0, g)
    .map((c) => ({ name: c.name, slug: c.slug, words: shuffle(c.words, rng).slice(0, w) }));
}

function clampInt(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, Math.floor(value)));
}
