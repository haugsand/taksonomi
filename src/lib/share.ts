import { formatDayShort } from "./daily";
import { formatDuration } from "./timer";

/**
 * The shared result.
 *
 * One rule, and it is the same one that governs announce.ts: **the text must
 * never name a category or a word.** Whoever shares first would otherwise
 * spoil the day for everyone who reads it. That is why this takes only the
 * size, the date and the time — it is not given the board at all, so it cannot
 * leak it.
 */
export function shareText(groups: number, wordsPerGroup: number, date: string, ms: number): string {
  return [
    `Taksonomi ${groups}×${wordsPerGroup} · ${formatDayShort(date)}`,
    `⏱ ${formatDuration(ms)}`,
    "taksonomi.app",
  ].join("\n");
}

export type ShareOutcome = "shared" | "copied" | "failed";

/**
 * Hands the text to the OS share sheet where there is one (phones), and falls
 * back to the clipboard. The caller needs to know which happened: the share
 * sheet confirms itself, a silent clipboard write does not.
 */
export async function shareResult(text: string): Promise<ShareOutcome> {
  if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
    try {
      await navigator.share({ text });
      return "shared";
    } catch (e) {
      // A cancelled share sheet is a choice, not a failure — don't then paste
      // the result into the player's clipboard behind their back.
      if (e instanceof Error && e.name === "AbortError") return "failed";
    }
  }
  try {
    await navigator.clipboard.writeText(text);
    return "copied";
  } catch {
    return "failed";
  }
}
