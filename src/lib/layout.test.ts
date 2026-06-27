import { describe, expect, it } from "vitest";
import type { TileData } from "./types";
import { assignRows, groupIntoRows } from "./layout";

const tiles = (n: number): TileData[] =>
  Array.from({ length: n }, (_, i) => ({ id: `t${i}`, words: [`w${i}`], categoryName: "c" }));

describe("assignRows", () => {
  it("front-loads the remainder across rows", () => {
    // 10 tiles over 3 rows -> 4, 3, 3
    const result = assignRows(tiles(10), 3);
    const counts = [0, 1, 2].map((r) => result.filter((t) => t.row === r).length);
    expect(counts).toEqual([4, 3, 3]);
  });

  it("preserves tile order", () => {
    const result = assignRows(tiles(6), 2);
    expect(result.map((t) => t.id)).toEqual(["t0", "t1", "t2", "t3", "t4", "t5"]);
  });

  it("never uses more rows than tiles", () => {
    const result = assignRows(tiles(3), 10);
    expect(new Set(result.map((t) => t.row)).size).toBe(3);
  });

  it("does not mutate the input tiles", () => {
    const input = tiles(4);
    assignRows(input, 2);
    expect(input.every((t) => t.row === undefined)).toBe(true);
  });
});

describe("groupIntoRows", () => {
  it("groups tiles by row, ordered by row index", () => {
    const input: TileData[] = [
      { id: "a", words: ["a"], categoryName: "c", row: 1 },
      { id: "b", words: ["b"], categoryName: "c", row: 0 },
      { id: "c", words: ["c"], categoryName: "c", row: 1 },
    ];
    const rows = groupIntoRows(input);
    expect(rows.map((r) => r.map((t) => t.id))).toEqual([["b"], ["a", "c"]]);
  });

  it("treats tiles without a row as row 0", () => {
    const input: TileData[] = [{ id: "a", words: ["a"], categoryName: "c" }];
    expect(groupIntoRows(input)).toEqual([[input[0]]]);
  });
});
