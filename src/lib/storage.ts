import type { Category, TileData } from "./types";
import { SIZE_KEY, STATE_KEY } from "./constants";
import { findGameSize } from "./sizes";

export type Size = { groups: number; wordsPerGroup: number };
export type GameState = Size & { activeCategories: Category[]; tiles: TileData[] };

export const DEFAULT_SIZE: Size = { groups: 15, wordsPerGroup: 15 };

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

export function loadSize(): Size {
  if (typeof window === "undefined") return DEFAULT_SIZE;
  const raw = readRaw(SIZE_KEY);
  const p = (raw === null ? undefined : parse(raw)) as Partial<Size> | undefined;
  // Only sizes the UI offers are accepted: the API rejects anything else, so a
  // stale or hand-edited value would otherwise leave the game unable to start
  // until localStorage is cleared by hand.
  if (
    typeof p?.groups === "number" &&
    typeof p?.wordsPerGroup === "number" &&
    findGameSize(p.groups, p.wordsPerGroup)
  ) {
    return { groups: p.groups, wordsPerGroup: p.wordsPerGroup };
  }
  return DEFAULT_SIZE;
}

export function saveSize(size: Size): void {
  try {
    localStorage.setItem(SIZE_KEY, JSON.stringify(size));
  } catch {
    // ignore
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

function isGameState(v: unknown): v is GameState {
  if (typeof v !== "object" || v === null) return false;
  const s = v as Record<string, unknown>;
  return (
    Array.isArray(s.activeCategories) &&
    s.activeCategories.every(isCategory) &&
    Array.isArray(s.tiles) &&
    s.tiles.every(isTileData)
  );
}

/**
 * Returns a saved game only when it matches the requested size, else null.
 *
 * Nothing here may throw. A restore that throws is the one failure the player
 * cannot get out of on their own: the same stored value is read again on every
 * reload, so the game would be permanently dead. Anything unexpected therefore
 * drops the entry and starts fresh — ErrorBoundary is the backstop, not the
 * plan.
 */
export function loadGameState(size: Size): GameState | null {
  try {
    const raw = readRaw(STATE_KEY);
    if (raw === null) return null;

    const parsed = parse(raw);
    if (!isGameState(parsed)) {
      // Unparseable or the wrong shape — drop it rather than leave a value
      // behind that fails the same way on every later load.
      clearGameState();
      return null;
    }

    // A game of a different size is still valid; it is kept so switching back
    // to that size restores it.
    const fitsSize =
      parsed.activeCategories.length === size.groups &&
      parsed.activeCategories.every((c) => c.words.length === size.wordsPerGroup);
    if (!fitsSize) return null;

    return { ...size, activeCategories: parsed.activeCategories, tiles: parsed.tiles };
  } catch {
    clearGameState();
    return null;
  }
}

export function saveGameState(state: GameState): void {
  try {
    localStorage.setItem(STATE_KEY, JSON.stringify(state));
  } catch {
    // ignore
  }
}

export function clearGameState(): void {
  try {
    localStorage.removeItem(STATE_KEY);
  } catch {
    // ignore
  }
}
