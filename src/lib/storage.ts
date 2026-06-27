import type { Category, TileData } from "./types";

const THEME_KEY = "taksonomi:theme:v1";
const STATE_KEY = "taksonomi:state:v3";
const SIZE_KEY = "taksonomi:size:v1";

export type Theme = "dark" | "light";
export type Size = { groups: number; wordsPerGroup: number };
export type GameState = Size & { activeCategories: Category[]; tiles: TileData[] };

export const DEFAULT_SIZE: Size = { groups: 15, wordsPerGroup: 15 };

export function loadSize(): Size {
  if (typeof window === "undefined") return DEFAULT_SIZE;
  try {
    const raw = localStorage.getItem(SIZE_KEY);
    if (raw) {
      const p = JSON.parse(raw);
      if (typeof p?.groups === "number" && typeof p?.wordsPerGroup === "number") {
        return { groups: p.groups, wordsPerGroup: p.wordsPerGroup };
      }
    }
  } catch {
    // ignore
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

export function loadTheme(): Theme | null {
  try {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved === "light" || saved === "dark") return saved;
  } catch {
    // ignore
  }
  return null;
}

export function saveTheme(theme: Theme): void {
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch {
    // ignore
  }
}

/** Returns a saved game only when it matches the requested size, else null. */
export function loadGameState(size: Size): GameState | null {
  try {
    const raw = localStorage.getItem(STATE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<GameState>;
    const cats = parsed.activeCategories;
    if (
      Array.isArray(cats) &&
      cats.length === size.groups &&
      cats.every((c) => c.words?.length === size.wordsPerGroup) &&
      Array.isArray(parsed.tiles)
    ) {
      return { ...size, activeCategories: cats, tiles: parsed.tiles };
    }
  } catch {
    // ignore
  }
  return null;
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
