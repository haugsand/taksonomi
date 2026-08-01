import type { Category } from "./types";

export async function fetchNewGame(groups: number, wordsPerGroup: number): Promise<Category[]> {
  const res = await fetch(`/api/new-game?groups=${groups}&words=${wordsPerGroup}`);
  if (!res.ok) {
    throw new Error(`Kunne ikke hente nytt spill (${res.status})`);
  }
  const data = (await res.json()) as { categories: Category[] };
  return data.categories;
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
