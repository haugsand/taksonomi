/**
 * The Norwegian strings the board announces to assistive tech, kept as pure
 * functions so they can be asserted without rendering.
 *
 * One rule governs everything here: **an announcement must never name the
 * category of a tile that is not yet solved.** The category is the answer, and
 * a screen-reader label is as much a spoiler as printing it on screen. Only
 * `completedTileLabel` and `categoryCompleted` — both reached after the player
 * has already solved the group — are allowed to say the name.
 */

/** Feedback when two selected words do not belong to the same category. */
export const MISMATCH = "Nei — de hører ikke sammen.";

/** Feedback for a merge that grew a group without finishing it. */
export function merged(wordsInGroup: number, categorySize: number): string {
  return `Slått sammen. Gruppen har nå ${wordsInGroup} av ${categorySize} ord.`;
}

/** Feedback for a merge that solved a whole category. */
export function categoryCompleted(
  categoryName: string,
  completedCount: number,
  categoryCount: number,
): string {
  return `Kategorien ${categoryName} er fullført. ${completedCount} av ${categoryCount} kategorier.`;
}

/**
 * Accessible name for a tile.
 *
 * A single-word tile returns null: its visible text is already a perfect label,
 * and an aria-label would only risk drifting from it.
 *
 * A group tile needs one because the visible "3/15" badge reads as "3 slash 15"
 * and the words run together with it. It deliberately omits the category name.
 */
export function tileLabel(
  words: string[],
  categorySize: number,
  isComplete: boolean,
): string | null {
  if (isComplete) return null; // handled by completedTileLabel, which has the name
  if (words.length < 2) return null;
  return `${words.join(", ")}. Gruppe med ${words.length} av ${categorySize} ord.`;
}

/** Accessible name for a solved tile — the only tile label that may name the
 *  category, because the player has already found it. */
export function completedTileLabel(categoryName: string, words: string[]): string {
  return `${categoryName}, fullført: ${words.join(", ")}.`;
}
