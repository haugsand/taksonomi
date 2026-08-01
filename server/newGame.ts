import type { Category } from "../src/lib/types";
import { findGameSize } from "../src/lib/sizes";
import { boardRng, dayKey } from "../src/lib/daily";
import { pickCategories } from "./pickCategories";
import type { BoardStore } from "./boardStore";

/** How long a decided board is kept. Two days, so it comfortably outlives the
 *  day it belongs to without the store accumulating history nothing reads. */
export const FREEZE_TTL_SECONDS = 60 * 60 * 48;

/** Storage key for one day's board at one size. */
export function dailyKey(date: string, groups: number, wordsPerGroup: number): string {
  return `daily:${date}:${groups}x${wordsPerGroup}`;
}

export type NewGameResult =
  { ok: true; categories: Category[] } | { ok: false; status: number; error: string };

export type DailyGameResult =
  { ok: true; date: string; categories: Category[] } | { ok: false; status: number; error: string };

/**
 * Resolves /api/new-game for both the Worker and the dev server, so the two
 * cannot drift apart.
 *
 * Only the sizes the UI actually offers are accepted. Clamping arbitrary
 * numbers to the data's maximum instead (what pickCategories does internally)
 * let a single request ask for every category and word — an ~80 KB response,
 * far larger than any real game, from an endpoint that must not be cached.
 */
export function newGame(params: URLSearchParams): NewGameResult {
  // Number(null) is 0, so missing parameters fall through the size lookup like
  // any other unsupported pair rather than passing a bare isFinite check.
  const groups = Number(params.get("groups"));
  const wordsPerGroup = Number(params.get("words"));

  const size = findGameSize(groups, wordsPerGroup);
  if (!size) {
    return { ok: false, status: 400, error: "unsupported game size" };
  }

  return { ok: true, categories: pickCategories(size.groups, size.wordsPerGroup) };
}

/**
 * Resolves /api/daily — today's board at the requested size, the same board for
 * every caller.
 *
 * The date is decided here and is never taken from the request. A `date`
 * parameter would let anyone fetch tomorrow's board and turn up in the morning
 * with the answers.
 */
export async function dailyGame(
  params: URLSearchParams,
  options: { now?: Date; store?: BoardStore } = {},
): Promise<DailyGameResult> {
  const { now = new Date(), store } = options;
  const groups = Number(params.get("groups"));
  const wordsPerGroup = Number(params.get("words"));

  const size = findGameSize(groups, wordsPerGroup);
  if (!size) {
    return { ok: false, status: 400, error: "unsupported game size" };
  }

  const date = dayKey(now);
  const key = dailyKey(date, size.groups, size.wordsPerGroup);

  // Whatever was written first for this day and size is the board, full stop.
  const frozen = store ? await readFrozen(store, key) : null;
  if (frozen) return { ok: true, date, categories: frozen };

  const categories = pickCategories(
    size.groups,
    size.wordsPerGroup,
    boardRng(date, size.groups, size.wordsPerGroup),
  );

  // Two requests racing to be first both compute *the same* board — same seed,
  // same data, milliseconds apart — so the duplicate write is harmless. The
  // same reasoning covers KV's eventual consistency: a PoP that has not seen
  // the write yet computes an identical board rather than a different one.
  if (store) await writeFrozen(store, key, categories);

  return { ok: true, date, categories };
}

/**
 * Storage failures are swallowed on purpose: serving a board beats serving an
 * error, and the freeze is a consistency guarantee rather than something the
 * response depends on. The cost is that the guarantee degrades silently — if
 * this is ever suspected, the thing to check is whether the KV binding exists.
 */
async function readFrozen(store: BoardStore, key: string): Promise<Category[] | null> {
  try {
    return await store.get(key);
  } catch {
    return null;
  }
}

async function writeFrozen(store: BoardStore, key: string, board: Category[]): Promise<void> {
  try {
    await store.put(key, board);
  } catch {
    // ignore — the caller still gets this board, it just is not frozen yet
  }
}
