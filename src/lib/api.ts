import type { Category } from "./types";

export async function fetchNewGame(groups: number, wordsPerGroup: number): Promise<Category[]> {
  const res = await fetch(`/api/new-game?groups=${groups}&words=${wordsPerGroup}`);
  if (!res.ok) {
    throw new Error(`Kunne ikke hente nytt spill (${res.status})`);
  }
  const data = (await res.json()) as { categories: Category[] };
  return data.categories;
}
