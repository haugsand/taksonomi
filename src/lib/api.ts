import type { Category } from "./types";

export async function fetchNewGame(groups: number, wordsPerGroup: number): Promise<Category[]> {
  const res = await fetch(`/api/new-game?groups=${groups}&words=${wordsPerGroup}`);
  if (!res.ok) {
    throw new Error(`Kunne ikke hente nytt spill (${res.status})`);
  }
  const data = (await res.json()) as { categories: Category[] };
  return data.categories;
}

/** Short explanations of a category's words, keyed by word. */
export type Descriptions = Record<string, string>;

/**
 * A category's description bundle — a static asset, not an API call.
 *
 * The bundles are emitted by scripts/build-categories.mjs and never change for
 * a given slug, so they are cheap to fetch on demand and free on every fetch
 * after the first. Keeping them out of the board payload matters: an XXXL board
 * is 1600 words, and inlining their descriptions would multiply a `no-store`
 * response that every new game pays for.
 */
export async function fetchDescriptions(slug: string): Promise<Descriptions> {
  const res = await fetch(`/descriptions/${encodeURIComponent(slug)}.json`);
  if (!res.ok) {
    throw new Error(`Kunne ikke hente beskrivelser (${res.status})`);
  }
  return (await res.json()) as Descriptions;
}

export type DailyGame = { date: string; categories: Category[] };

/**
 * Today's board. The date comes back from the server rather than being asked
 * for: the client's clock is not the authority on which day it is, and the
 * date is what seeds the layout, so both sides must agree on it exactly.
 */
export async function fetchDailyGame(groups: number, wordsPerGroup: number): Promise<DailyGame> {
  const res = await fetch(`/api/daily?groups=${groups}&words=${wordsPerGroup}`);
  if (!res.ok) {
    throw new Error(`Kunne ikke hente dagens utfordring (${res.status})`);
  }
  return (await res.json()) as DailyGame;
}
