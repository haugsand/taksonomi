import type { Category } from "../src/lib/types";
import { CATEGORIES } from "./categories-data";

function shuffle<T>(arr: readonly T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
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
 */
export function pickCategories(groups: number, wordsPerGroup: number): Category[] {
  const g = clampInt(groups, 1, MAX_GROUPS);
  const w = clampInt(wordsPerGroup, 1, MAX_WORDS_PER_GROUP);
  return shuffle(CATEGORIES)
    .slice(0, g)
    .map((c) => ({ name: c.name, words: shuffle(c.words).slice(0, w) }));
}

function clampInt(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, Math.floor(value)));
}
