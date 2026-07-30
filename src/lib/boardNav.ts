/**
 * Where the keyboard cursor goes next on the tile board.
 *
 * Pure and DOM-free so the movement rules can be tested directly: the board is
 * described by nothing more than how many tiles sit in each row, plus an
 * optional way to ask where a tile is horizontally.
 */

export type Pos = { row: number; col: number };

export const NAV_KEYS = ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End"] as const;
export type NavKey = (typeof NAV_KEYS)[number];

export function isNavKey(key: string): key is NavKey {
  return (NAV_KEYS as readonly string[]).includes(key);
}

type Options = {
  /** Ctrl/Cmd held: Home/End jump to the whole board rather than the row. */
  jumpToBoard?: boolean;
  /**
   * Horizontal centre of a tile, in pixels. Used to pick the vertical
   * neighbour that actually sits above or below the cursor. Rows hold
   * different numbers of tiles at different widths, so matching by column
   * index instead makes Up/Down feel like it lands at random. Omit it and the
   * column index is clamped, which is the sensible headless fallback.
   */
  xCenter?: (pos: Pos) => number | undefined;
};

/**
 * The position `key` moves to, or null when the move runs off the board.
 *
 * Left/Right continue into the neighbouring row rather than stopping at the
 * edge, so holding one of them walks the whole board in reading order — the
 * behaviour that matters when a 40 × 40 game has 1600 tiles.
 */
export function nextPos(
  rowLengths: number[],
  from: Pos,
  key: NavKey,
  { jumpToBoard = false, xCenter }: Options = {},
): Pos | null {
  const rows = rowLengths.length;
  if (rows === 0) return null;
  if (!isInside(rowLengths, from)) return null;

  switch (key) {
    case "ArrowLeft":
      if (from.col > 0) return { row: from.row, col: from.col - 1 };
      return lastOfPreviousRow(rowLengths, from.row);

    case "ArrowRight":
      if (from.col < rowLengths[from.row] - 1) return { row: from.row, col: from.col + 1 };
      return firstOfNextRow(rowLengths, from.row);

    case "ArrowUp":
      return verticalNeighbour(rowLengths, from, -1, xCenter);

    case "ArrowDown":
      return verticalNeighbour(rowLengths, from, +1, xCenter);

    case "Home":
      return jumpToBoard ? firstNonEmpty(rowLengths) : { row: from.row, col: 0 };

    case "End":
      return jumpToBoard
        ? lastNonEmpty(rowLengths)
        : { row: from.row, col: rowLengths[from.row] - 1 };
  }
}

function isInside(rowLengths: number[], pos: Pos): boolean {
  const len = rowLengths[pos.row];
  return len !== undefined && pos.col >= 0 && pos.col < len;
}

function lastOfPreviousRow(rowLengths: number[], row: number): Pos | null {
  for (let r = row - 1; r >= 0; r--) {
    if (rowLengths[r] > 0) return { row: r, col: rowLengths[r] - 1 };
  }
  return null;
}

function firstOfNextRow(rowLengths: number[], row: number): Pos | null {
  for (let r = row + 1; r < rowLengths.length; r++) {
    if (rowLengths[r] > 0) return { row: r, col: 0 };
  }
  return null;
}

function firstNonEmpty(rowLengths: number[]): Pos | null {
  const row = rowLengths.findIndex((n) => n > 0);
  return row === -1 ? null : { row, col: 0 };
}

function lastNonEmpty(rowLengths: number[]): Pos | null {
  for (let r = rowLengths.length - 1; r >= 0; r--) {
    if (rowLengths[r] > 0) return { row: r, col: rowLengths[r] - 1 };
  }
  return null;
}

/** Nearest tile in the next non-empty row in `direction`, by x-centre when
 *  available and by clamped column index otherwise. */
function verticalNeighbour(
  rowLengths: number[],
  from: Pos,
  direction: -1 | 1,
  xCenter?: Options["xCenter"],
): Pos | null {
  let row = from.row + direction;
  while (row >= 0 && row < rowLengths.length && rowLengths[row] === 0) row += direction;
  if (row < 0 || row >= rowLengths.length) return null;

  const target = xCenter?.(from);
  if (!xCenter || target === undefined) {
    return { row, col: Math.min(from.col, rowLengths[row] - 1) };
  }

  let best = 0;
  let bestDistance = Infinity;
  for (let col = 0; col < rowLengths[row]; col++) {
    const candidate = xCenter({ row, col });
    if (candidate === undefined) continue;
    const distance = Math.abs(candidate - target);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = col;
    }
  }
  return { row, col: best };
}

/** Position of `id` in `rows`, or null when it is no longer on the board. */
export function findPos(rows: { id: string }[][], id: string): Pos | null {
  for (let row = 0; row < rows.length; row++) {
    const col = rows[row].findIndex((t) => t.id === id);
    if (col !== -1) return { row, col };
  }
  return null;
}

/**
 * The tile a vanished cursor should fall back to: the same slot if it still
 * exists, otherwise the closest one still on the board. Tiles disappear
 * whenever a category is solved, and dumping focus back to the first tile each
 * time would throw a keyboard player across the board mid-game.
 */
export function clampPos(rowLengths: number[], pos: Pos): Pos | null {
  if (rowLengths.length === 0) return null;
  let row = Math.min(Math.max(pos.row, 0), rowLengths.length - 1);
  if (rowLengths[row] === 0) {
    // Walk outwards for the nearest row that still holds tiles.
    let offset = 1;
    let found = -1;
    while (offset < rowLengths.length) {
      if (row - offset >= 0 && rowLengths[row - offset] > 0) {
        found = row - offset;
        break;
      }
      if (row + offset < rowLengths.length && rowLengths[row + offset] > 0) {
        found = row + offset;
        break;
      }
      offset++;
    }
    if (found === -1) return null;
    row = found;
  }
  return { row, col: Math.min(Math.max(pos.col, 0), rowLengths[row] - 1) };
}
