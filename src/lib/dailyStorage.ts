import { DAILY_KEY } from "./constants";

/** Elapsed milliseconds per finished size, e.g. `{ "15x15": 401_000 }`. */
export type DailyResults = Record<string, number>;

export function sizeKey(groups: number, wordsPerGroup: number): string {
  return `${groups}x${wordsPerGroup}`;
}

type Stored = { date: string; results: DailyResults };

/**
 * Today's finished challenges.
 *
 * Only one day is kept. Nothing in the design reaches back — no streak, no
 * personal best, no history — so a growing archive would be data we never read
 * and would have to prune later. A stored entry from an earlier day simply
 * reads as "nothing done yet".
 */
export function loadDailyResults(today: string): DailyResults {
  try {
    const raw = localStorage.getItem(DAILY_KEY);
    if (raw === null) return {};
    const parsed = JSON.parse(raw) as Partial<Stored> | null;
    if (!parsed || parsed.date !== today || typeof parsed.results !== "object") return {};
    const results: DailyResults = {};
    for (const [key, value] of Object.entries(parsed.results ?? {})) {
      if (typeof value === "number" && Number.isFinite(value)) results[key] = value;
    }
    return results;
  } catch {
    return {};
  }
}

/** Records a finished challenge and returns the updated set for today. */
export function saveDailyResult(
  today: string,
  groups: number,
  wordsPerGroup: number,
  ms: number,
): DailyResults {
  const results = { ...loadDailyResults(today), [sizeKey(groups, wordsPerGroup)]: ms };
  try {
    localStorage.setItem(DAILY_KEY, JSON.stringify({ date: today, results } satisfies Stored));
  } catch {
    // ignore — the result still shows for this session
  }
  return results;
}
