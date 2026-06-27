import { useCallback, useRef } from "preact/hooks";
import type { Category } from "@/lib/types";
import { fetchNewGame } from "@/lib/api";
import { GAME_SIZES } from "@/lib/sizes";

/**
 * Fetches games with a prefetch cache keyed by size, so a "new game" is usually
 * instant and the cache is topped back up for next time.
 */
export function useGameSource() {
  const cache = useRef(new Map<string, Category[] | Promise<Category[]>>());

  const prefetch = useCallback((g: number, w: number) => {
    const key = `${g}:${w}`;
    if (cache.current.has(key)) return;
    const p = fetchNewGame(g, w);
    cache.current.set(key, p);
    p.then(
      (cats) => {
        if (cache.current.get(key) === p) cache.current.set(key, cats);
      },
      () => {
        if (cache.current.get(key) === p) cache.current.delete(key);
      },
    );
  }, []);

  /** Returns a game for the size, from cache when available, and refills it. */
  const getGame = useCallback(
    (g: number, w: number): Promise<Category[]> => {
      const key = `${g}:${w}`;
      const entry = cache.current.get(key);
      cache.current.delete(key);
      const result = entry ? Promise.resolve(entry) : fetchNewGame(g, w);
      prefetch(g, w);
      return result;
    },
    [prefetch],
  );

  /** Warms the cache with a game of every available size. */
  const prefetchAll = useCallback(() => {
    for (const s of GAME_SIZES) prefetch(s.groups, s.wordsPerGroup);
  }, [prefetch]);

  return { getGame, prefetchAll };
}
