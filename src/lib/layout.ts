import type { TileData } from "./types";

/** Measures how many tile rows fit in the board's visible viewport. */
export function measureRowCount(el: HTMLElement): number {
  const styles = getComputedStyle(el);
  const padY = parseFloat(styles.paddingTop) + parseFloat(styles.paddingBottom);
  const rowGap = parseFloat(getComputedStyle(el.firstElementChild ?? el).rowGap || "6") || 6;

  // Measure an actual rendered row when possible; fall back to an estimate.
  const sampleRow = el.querySelector<HTMLElement>(".board__row");
  let rowHeight = sampleRow?.getBoundingClientRect().height ?? 0;
  if (!rowHeight) {
    const fontPx = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
    rowHeight = Math.round(fontPx * 2.1); // tile padding + line-height ≈ 2.1rem
  }

  // Prefer the visual viewport on mobile (excludes browser chrome).
  const viewportH = window.visualViewport?.height ?? window.innerHeight;
  const top = el.getBoundingClientRect().top;
  // Small safety margin to absorb sub-pixel rounding and avoid scrollbars.
  const SAFETY = 4;
  const available = viewportH - top - padY - SAFETY;
  return Math.max(1, Math.floor((available + rowGap) / (rowHeight + rowGap)));
}

/** Distributes tiles across `rowCount` rows as evenly as possible, setting `row`. */
export function assignRows(tiles: TileData[], rowCount: number): TileData[] {
  const n = tiles.length;
  const r = Math.max(1, Math.min(rowCount, n));
  const base = Math.floor(n / r);
  const rem = n % r;
  const next: TileData[] = new Array(n);
  let i = 0;
  for (let k = 0; k < r; k++) {
    const size = base + (k < rem ? 1 : 0);
    for (let j = 0; j < size; j++) {
      next[i] = { ...tiles[i], row: k };
      i++;
    }
  }
  return next;
}

/** Groups tiles into row arrays, ordered by row index. */
export function groupIntoRows(tiles: TileData[]): TileData[][] {
  const map = new Map<number, TileData[]>();
  for (const t of tiles) {
    const r = t.row ?? 0;
    const arr = map.get(r) ?? [];
    arr.push(t);
    map.set(r, arr);
  }
  return [...map.entries()].sort((a, b) => a[0] - b[0]).map(([, v]) => v);
}
