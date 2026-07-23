import { describe, expect, it } from "vitest";
import { CATEGORIES } from "./categories-data";
import { MAX_GROUPS, MAX_WORDS_PER_GROUP, pickCategories } from "./pickCategories";

const wordsByCategory = new Map(CATEGORIES.map((c) => [c.name, new Set(c.words)]));

describe("pickCategories", () => {
  it("returns the requested number of categories and words", () => {
    const picked = pickCategories(8, 6);
    expect(picked).toHaveLength(8);
    for (const cat of picked) expect(cat.words).toHaveLength(6);
  });

  it("returns distinct categories, each a real category with a distinct subset of its words", () => {
    const picked = pickCategories(20, 10);
    expect(new Set(picked.map((c) => c.name)).size).toBe(picked.length);
    for (const cat of picked) {
      const known = wordsByCategory.get(cat.name);
      expect(known).toBeDefined();
      expect(new Set(cat.words).size).toBe(cat.words.length);
      for (const word of cat.words) expect(known!.has(word)).toBe(true);
    }
  });

  it("clamps counts above the data's maximum down to the maximum", () => {
    const picked = pickCategories(MAX_GROUPS + 50, MAX_WORDS_PER_GROUP + 50);
    expect(picked).toHaveLength(MAX_GROUPS);
    for (const cat of picked) expect(cat.words).toHaveLength(MAX_WORDS_PER_GROUP);
  });

  it("clamps counts below one up to one", () => {
    for (const n of [0, -5]) {
      const picked = pickCategories(n, n);
      expect(picked).toHaveLength(1);
      expect(picked[0].words).toHaveLength(1);
    }
  });

  it("falls back to the minimum for non-finite counts", () => {
    // Infinity is not finite, so it falls back to the minimum (1) — it is not
    // treated as "very large" and clamped to the max.
    const picked = pickCategories(Number.NaN, Number.POSITIVE_INFINITY);
    expect(picked).toHaveLength(1);
    expect(picked[0].words).toHaveLength(1);
  });

  it("floors fractional counts", () => {
    const picked = pickCategories(3.9, 4.9);
    expect(picked).toHaveLength(3);
    for (const cat of picked) expect(cat.words).toHaveLength(4);
  });
});
