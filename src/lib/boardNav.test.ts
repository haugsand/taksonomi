import { describe, expect, it } from "vitest";
import { clampPos, findPos, isNavKey, nextPos, type Pos } from "./boardNav";

const at = (row: number, col: number): Pos => ({ row, col });

describe("isNavKey", () => {
  it("recognises the keys the board handles", () => {
    expect(isNavKey("ArrowLeft")).toBe(true);
    expect(isNavKey("End")).toBe(true);
  });

  it("leaves everything else alone", () => {
    // Enter and Space must reach the button, and Tab must still move out of
    // the board entirely.
    for (const key of ["Enter", " ", "Tab", "a", "Escape"]) {
      expect(isNavKey(key), key).toBe(false);
    }
  });
});

describe("nextPos horizontal", () => {
  const rows = [3, 2, 4];

  it("steps within a row", () => {
    expect(nextPos(rows, at(0, 0), "ArrowRight")).toEqual(at(0, 1));
    expect(nextPos(rows, at(0, 2), "ArrowLeft")).toEqual(at(0, 1));
  });

  it("continues into the next row instead of stopping at the edge", () => {
    // Holding Right should walk the whole board in reading order — the only
    // practical way through 1600 tiles.
    expect(nextPos(rows, at(0, 2), "ArrowRight")).toEqual(at(1, 0));
    expect(nextPos(rows, at(1, 0), "ArrowLeft")).toEqual(at(0, 2));
  });

  it("returns null at the very ends of the board", () => {
    expect(nextPos(rows, at(0, 0), "ArrowLeft")).toBeNull();
    expect(nextPos(rows, at(2, 3), "ArrowRight")).toBeNull();
  });

  it("skips rows that have emptied out", () => {
    expect(nextPos([2, 0, 0, 3], at(0, 1), "ArrowRight")).toEqual(at(3, 0));
    expect(nextPos([2, 0, 0, 3], at(3, 0), "ArrowLeft")).toEqual(at(0, 1));
  });
});

describe("nextPos vertical", () => {
  it("clamps the column when no geometry is available", () => {
    expect(nextPos([4, 2], at(0, 3), "ArrowDown")).toEqual(at(1, 1));
  });

  it("picks the tile actually above or below, by x-centre", () => {
    // Row 0: three wide tiles. Row 1: eight narrow ones. Column index alone
    // would send the cursor to the far left; the player expects the tile they
    // can see under the cursor.
    const centers: Record<number, number[]> = {
      0: [50, 200, 400],
      1: [20, 60, 100, 190, 260, 330, 400, 470],
    };
    const xCenter = ({ row, col }: Pos) => centers[row]?.[col];

    expect(nextPos([3, 8], at(0, 1), "ArrowDown", { xCenter })).toEqual(at(1, 3));
    expect(nextPos([3, 8], at(0, 2), "ArrowDown", { xCenter })).toEqual(at(1, 6));
    expect(nextPos([3, 8], at(1, 7), "ArrowUp", { xCenter })).toEqual(at(0, 2));
  });

  it("returns null past the top and bottom rows", () => {
    expect(nextPos([3, 3], at(0, 1), "ArrowUp")).toBeNull();
    expect(nextPos([3, 3], at(1, 1), "ArrowDown")).toBeNull();
  });

  it("jumps over empty rows", () => {
    expect(nextPos([3, 0, 3], at(0, 1), "ArrowDown")).toEqual(at(2, 1));
  });
});

describe("nextPos Home and End", () => {
  const rows = [3, 5, 2];

  it("moves within the row by default", () => {
    expect(nextPos(rows, at(1, 3), "Home")).toEqual(at(1, 0));
    expect(nextPos(rows, at(1, 3), "End")).toEqual(at(1, 4));
  });

  it("moves to the whole board with the modifier", () => {
    expect(nextPos(rows, at(1, 3), "Home", { jumpToBoard: true })).toEqual(at(0, 0));
    expect(nextPos(rows, at(1, 3), "End", { jumpToBoard: true })).toEqual(at(2, 1));
  });

  it("ignores empty rows when jumping to the board", () => {
    expect(nextPos([0, 4, 0], at(1, 1), "Home", { jumpToBoard: true })).toEqual(at(1, 0));
    expect(nextPos([0, 4, 0], at(1, 1), "End", { jumpToBoard: true })).toEqual(at(1, 3));
  });
});

describe("nextPos guards", () => {
  it("returns null for an empty board", () => {
    expect(nextPos([], at(0, 0), "ArrowRight")).toBeNull();
  });

  it("returns null when the cursor is already off the board", () => {
    expect(nextPos([2, 2], at(5, 0), "ArrowLeft")).toBeNull();
    expect(nextPos([2, 2], at(0, 9), "ArrowRight")).toBeNull();
  });
});

describe("findPos", () => {
  const rows = [[{ id: "a" }, { id: "b" }], [{ id: "c" }]];

  it("locates a tile", () => {
    expect(findPos(rows, "c")).toEqual(at(1, 0));
  });

  it("returns null for a tile that has left the board", () => {
    expect(findPos(rows, "gone")).toBeNull();
  });
});

describe("clampPos", () => {
  it("keeps a position that is still valid", () => {
    expect(clampPos([3, 3], at(1, 2))).toEqual(at(1, 2));
  });

  it("pulls an out-of-range column back into the row", () => {
    // Tiles vanish as categories are solved; the cursor should settle beside
    // where it was, not get thrown back to the first tile on the board.
    expect(clampPos([3, 1], at(1, 2))).toEqual(at(1, 0));
  });

  it("finds the nearest row that still has tiles", () => {
    expect(clampPos([2, 0, 2], at(1, 0))).toEqual(at(0, 0));
    expect(clampPos([0, 0, 2], at(1, 1))).toEqual(at(2, 1));
  });

  it("returns null when the board is empty", () => {
    expect(clampPos([], at(0, 0))).toBeNull();
    expect(clampPos([0, 0], at(0, 0))).toBeNull();
  });
});
