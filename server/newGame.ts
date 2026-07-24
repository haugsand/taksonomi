import type { Category } from "../src/lib/types";
import { findGameSize } from "../src/lib/sizes";
import { pickCategories } from "./pickCategories";

export type NewGameResult =
  { ok: true; categories: Category[] } | { ok: false; status: number; error: string };

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
