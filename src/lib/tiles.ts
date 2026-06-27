import type { Category, TileData } from "./types";
import { randomHue } from "./palette";

/** Explodes categories into one single-word tile each. */
export function buildInitialTiles(categories: Category[]): TileData[] {
  return categories.flatMap((c) =>
    c.words.map((w) => ({ id: `${c.name}::${w}`, words: [w], categoryName: c.name })),
  );
}

/** Number of tiles that fully cover their category. */
export function countCompleted(tiles: TileData[], catByName: Map<string, Category>): number {
  let n = 0;
  for (const t of tiles) {
    const cat = catByName.get(t.categoryName);
    if (cat && t.words.length === cat.words.length) n++;
  }
  return n;
}

export type CombineOutcome =
  | { kind: "merged"; tiles: TileData[]; mergedId: string }
  | { kind: "mismatch"; ids: [string, string] }
  | { kind: "noop" };

/**
 * Pure attempt to merge tile `aId` into `bId`. Returns the resulting tile array
 * and the new tile's id on success, the two ids to shake on a category
 * mismatch, or `noop` when the move is invalid. Performs no side effects.
 */
export function combineTiles(
  tiles: TileData[],
  aId: string,
  bId: string,
  catByName: Map<string, Category>,
): CombineOutcome {
  if (aId === bId) return { kind: "noop" };
  const a = tiles.find((t) => t.id === aId);
  const b = tiles.find((t) => t.id === bId);
  if (!a || !b) return { kind: "noop" };
  if (a.categoryName !== b.categoryName) return { kind: "mismatch", ids: [a.id, b.id] };
  const cat = catByName.get(a.categoryName);
  if (!cat) return { kind: "noop" };

  const mergedSet = new Set([...a.words, ...b.words]);
  const ordered = cat.words.filter((w) => mergedSet.has(w));
  const mergedId = `group-${a.categoryName}-${ordered.length}-${Date.now()}`;
  const newTile: TileData = {
    id: mergedId,
    words: ordered,
    categoryName: a.categoryName,
    hue: b.hue ?? a.hue ?? randomHue(),
    row: b.row,
  };

  const idxA = tiles.findIndex((t) => t.id === a.id);
  const idxB = tiles.findIndex((t) => t.id === b.id);
  const next = tiles.filter((t) => t.id !== a.id && t.id !== b.id);
  next.splice(idxA < idxB ? idxB - 1 : idxB, 0, newTile);
  return { kind: "merged", tiles: next, mergedId };
}
