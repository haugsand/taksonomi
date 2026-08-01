import type { Category, TileData } from "./types";
import { STATE_KEY } from "./constants";
import { isTimer, pauseTimer, type Timer } from "./timer";

export type Mode = "free" | "daily";
export type Size = { groups: number; wordsPerGroup: number };

/**
 * The single game in progress.
 *
 * There is deliberately only one. Starting anything from the menu ends what was
 * running — the menu says so before you do it — so a second slot would only be
 * state that can disagree with the screen.
 */
export type SavedGame = Size & {
  mode: Mode;
  activeCategories: Category[];
  tiles: TileData[];
  /** Daily only: the Oslo day this board belongs to. */
  date?: string;
  /** Daily only: the clock, always stored paused. See `saveGame`. */
  timer?: Timer;
};

function parse(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    return undefined;
  }
}

/** The raw entry, or null when absent — or unreadable, e.g. storage disabled. */
function readRaw(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function isStringArray(v: unknown): v is string[] {
  return Array.isArray(v) && v.every((s) => typeof s === "string");
}

function isCategory(v: unknown): v is Category {
  if (typeof v !== "object" || v === null) return false;
  const c = v as Record<string, unknown>;
  return typeof c.name === "string" && isStringArray(c.words);
}

/**
 * Every field the board reads while rendering. A tile that passes here cannot
 * throw in Tile.tsx — and since the state is only replaced, never re-validated,
 * a malformed one would otherwise break the game on every reload.
 */
function isTileData(v: unknown): v is TileData {
  if (typeof v !== "object" || v === null) return false;
  const t = v as Record<string, unknown>;
  return (
    typeof t.id === "string" &&
    typeof t.categoryName === "string" &&
    isStringArray(t.words) &&
    (t.hue === undefined || typeof t.hue === "number") &&
    (t.row === undefined || typeof t.row === "number") &&
    (t.hidden === undefined || typeof t.hidden === "boolean")
  );
}

function isSavedGame(v: unknown): v is SavedGame {
  if (typeof v !== "object" || v === null) return false;
  const s = v as Record<string, unknown>;
  if (s.mode !== "free" && s.mode !== "daily") return false;
  if (typeof s.groups !== "number" || typeof s.wordsPerGroup !== "number") return false;
  if (!Array.isArray(s.activeCategories) || !s.activeCategories.every(isCategory)) return false;
  if (!Array.isArray(s.tiles) || !s.tiles.every(isTileData)) return false;
  // A daily game missing its date or its clock cannot be resumed as one.
  if (s.mode === "daily" && (typeof s.date !== "string" || !isTimer(s.timer))) return false;
  return true;
}

/**
 * The saved game, or null when there is none.
 *
 * Nothing here may throw. A restore that throws is the one failure the player
 * cannot get out of on their own: the same stored value is read again on every
 * reload, so the game would be permanently dead. Anything unexpected therefore
 * drops the entry and starts fresh — ErrorBoundary is the backstop, not the
 * plan.
 */
export function loadGame(): SavedGame | null {
  try {
    const raw = readRaw(STATE_KEY);
    if (raw === null) return null;

    const parsed = parse(raw);
    if (!isSavedGame(parsed)) {
      // Unparseable, the wrong shape, or written by an older version — drop it
      // rather than leave a value behind that fails the same way every load.
      clearGame();
      return null;
    }
    return parsed;
  } catch {
    clearGame();
    return null;
  }
}

/**
 * Persists the game. A running clock is banked first, so what lands in storage
 * is always a paused timer holding real elapsed milliseconds.
 *
 * That choice is what makes a reload safe. Storing `runningSince` as-is would
 * count every minute the tab spent closed, so shutting the laptop mid-board
 * would ruin the run. The cost is the opposite one — the seconds between the
 * last save and the tab closing are forgiven — and for an honour-system puzzle
 * that is the right way round.
 */
export function saveGame(game: SavedGame): void {
  try {
    const timer = game.timer ? pauseTimer(game.timer) : undefined;
    localStorage.setItem(STATE_KEY, JSON.stringify({ ...game, timer }));
  } catch {
    // ignore
  }
}

export function clearGame(): void {
  try {
    localStorage.removeItem(STATE_KEY);
  } catch {
    // ignore
  }
}
