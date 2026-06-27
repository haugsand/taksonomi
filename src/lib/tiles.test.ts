import { describe, expect, it } from "vitest";
import type { Category, TileData } from "./types";
import { buildInitialTiles, combineTiles, countCompleted } from "./tiles";

const cats: Category[] = [
  { name: "frukt", words: ["eple", "pære", "banan"] },
  { name: "dyr", words: ["hund", "katt"] },
];
const byName = new Map(cats.map((c) => [c.name, c]));

const tile = (id: string, categoryName: string, words: string[]): TileData => ({
  id,
  words,
  categoryName,
});

describe("buildInitialTiles", () => {
  it("creates one single-word tile per word", () => {
    const tiles = buildInitialTiles(cats);
    expect(tiles).toHaveLength(5);
    expect(tiles[0]).toEqual({ id: "frukt::eple", words: ["eple"], categoryName: "frukt" });
    expect(tiles.every((t) => t.words.length === 1)).toBe(true);
  });
});

describe("countCompleted", () => {
  it("counts tiles that fully cover their category", () => {
    const tiles = [
      tile("a", "frukt", ["eple", "pære", "banan"]), // complete
      tile("b", "dyr", ["hund"]), // partial
      tile("c", "dyr", ["hund", "katt"]), // complete
    ];
    expect(countCompleted(tiles, byName)).toBe(2);
  });

  it("ignores tiles whose category is unknown", () => {
    const tiles = [tile("x", "ukjent", ["noe"])];
    expect(countCompleted(tiles, byName)).toBe(0);
  });
});

describe("combineTiles", () => {
  it("merges two tiles of the same category", () => {
    const tiles = [
      tile("a", "frukt", ["eple"]),
      tile("b", "dyr", ["hund"]),
      tile("c", "frukt", ["banan"]),
    ];
    const result = combineTiles(tiles, "a", "c", byName);
    expect(result.kind).toBe("merged");
    if (result.kind !== "merged") return;
    const merged = result.tiles.find((t) => t.categoryName === "frukt")!;
    // Words come back in category order, not click order.
    expect(merged.words).toEqual(["eple", "banan"]);
    expect(result.mergedId).toMatch(/^group-frukt-2-/);
    // The two originals are gone, the untouched tile remains.
    expect(result.tiles).toHaveLength(2);
    expect(result.tiles.some((t) => t.id === "b")).toBe(true);
  });

  it("inherits hue and row from the drop target (b)", () => {
    const tiles = [
      { ...tile("a", "frukt", ["eple"]), hue: 5, row: 0 },
      { ...tile("c", "frukt", ["banan"]), hue: 99, row: 3 },
    ];
    const result = combineTiles(tiles, "a", "c", byName);
    if (result.kind !== "merged") throw new Error("expected merge");
    expect(result.tiles[result.tiles.length - 1].hue).toBe(99);
    expect(result.tiles[result.tiles.length - 1].row).toBe(3);
  });

  it("reports a mismatch for different categories", () => {
    const tiles = [tile("a", "frukt", ["eple"]), tile("b", "dyr", ["hund"])];
    const result = combineTiles(tiles, "a", "b", byName);
    expect(result).toEqual({ kind: "mismatch", ids: ["a", "b"] });
  });

  it("is a no-op when combining a tile with itself", () => {
    const tiles = [tile("a", "frukt", ["eple"])];
    expect(combineTiles(tiles, "a", "a", byName)).toEqual({ kind: "noop" });
  });

  it("is a no-op when a tile id is missing", () => {
    const tiles = [tile("a", "frukt", ["eple"])];
    expect(combineTiles(tiles, "a", "zzz", byName)).toEqual({ kind: "noop" });
  });
});
