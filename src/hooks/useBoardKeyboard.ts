import { useCallback, useLayoutEffect, useRef, useState } from "preact/hooks";
import type { JSX } from "preact";
import type { TileData } from "@/lib/types";
import { clampPos, findPos, isNavKey, nextPos, type Pos } from "@/lib/boardNav";

type Options = {
  rows: TileData[][];
  /** Clears the current selection, so Escape can back out of a half-made move. */
  onEscape: () => void;
  /**
   * A tile the cursor should jump to — the result of a merge. Both tiles the
   * player combined disappear, so without this the cursor clamps to the old
   * coordinates and lands one slot past the tile they just made.
   */
  cursorTileId?: string | null;
};

/**
 * Keyboard navigation for the tile board, as a roving tabindex.
 *
 * The board is one tab stop, not one per tile. That is the whole point: at
 * 40 × 40 the old markup put 1600 buttons in the tab order with no way past
 * them, so reaching the header meant 1600 presses. Now Tab enters and leaves
 * the board, and the arrow keys move within it.
 *
 * Enter and Space are left to the buttons themselves — selecting and merging
 * already work through the click handler.
 */
export function useBoardKeyboard({ rows, onEscape, cursorTileId = null }: Options) {
  const [activeId, setActiveId] = useState<string | null>(null);
  /** Live map of rendered tiles, so focus can be moved without putting an
   *  identifying attribute in the DOM (tile ids contain the category name). */
  const elements = useRef(new Map<string, HTMLButtonElement>());
  /** Where the cursor last was, so it can settle nearby when tiles vanish. */
  const lastPos = useRef<Pos>({ row: 0, col: 0 });
  /** Why focus should move, or null when it should stay put — never on mount or
   *  an incidental re-render, which would steal focus from the header. The two
   *  reasons want opposite scroll behaviour; see the effect that reads it. */
  const focusWanted = useRef<"key" | "merge" | null>(null);

  const registerTile = useCallback((id: string, el: HTMLButtonElement | null) => {
    if (el) elements.current.set(id, el);
    else elements.current.delete(id);
  }, []);

  const rowLengths = rows.map((r) => r.length);

  // Follow a merge to the tile it produced.
  useLayoutEffect(() => {
    if (cursorTileId === null) return;
    const pos = findPos(rows, cursorTileId);
    if (!pos) return;
    lastPos.current = pos;
    setActiveId(cursorTileId);
    // Removing the merged-away tiles orphans focus onto <body>. Reclaim it, but
    // only then — if focus sits anywhere else the player has moved on, and
    // yanking it back to the board would be worse than leaving it.
    if (document.activeElement === document.body) focusWanted.current = "merge";
  }, [cursorTileId, rows]);

  // Keep the cursor on a tile that exists. Tiles leave the board whenever a
  // category is solved, and a cursor pointing at a removed tile would silently
  // stop responding to the arrow keys.
  useLayoutEffect(() => {
    const stillThere = activeId !== null && findPos(rows, activeId) !== null;
    if (stillThere) return;
    const fallback = clampPos(rowLengths, lastPos.current);
    setActiveId(fallback ? (rows[fallback.row]?.[fallback.col]?.id ?? null) : null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, activeId]);

  // Move focus after the cursor, but only when a keypress or a merge put it
  // there — and scroll only for the keypress.
  //
  // Arrowing off the visible edge has to scroll, or the cursor walks somewhere
  // the player cannot see. A merge is the opposite: the player just clicked the
  // spot, so they are already looking at it, and the tile the merge produces is
  // wider than either tile it replaced. Click a group near the edge of a board
  // that runs off to the right and the merged tile lands mostly outside it — a
  // bare focus() then scrolls the board out from under the player.
  useLayoutEffect(() => {
    const reason = focusWanted.current;
    if (reason === null || activeId === null) return;
    focusWanted.current = null;
    elements.current.get(activeId)?.focus({ preventScroll: reason === "merge" });
  }, [activeId]);

  const xCenter = useCallback(
    (pos: Pos): number | undefined => {
      const id = rows[pos.row]?.[pos.col]?.id;
      const el = id ? elements.current.get(id) : undefined;
      if (!el) return undefined;
      const rect = el.getBoundingClientRect();
      return rect.left + rect.width / 2;
    },
    [rows],
  );

  const onKeyDown = useCallback(
    (e: JSX.TargetedKeyboardEvent<HTMLElement>) => {
      if (e.key === "Escape") {
        onEscape();
        return;
      }
      if (!isNavKey(e.key)) return;

      const from =
        activeId === null ? lastPos.current : (findPos(rows, activeId) ?? lastPos.current);
      const to = nextPos(rowLengths, from, e.key, {
        jumpToBoard: e.ctrlKey || e.metaKey,
        xCenter,
      });
      if (!to) return;

      // Only now, once the move is real: leaving the board's edges to the
      // browser would scroll the page instead.
      e.preventDefault();
      lastPos.current = to;
      focusWanted.current = "key";
      setActiveId(rows[to.row][to.col].id);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rows, activeId, onEscape, xCenter],
  );

  /** Records where the cursor is when the player clicks, so switching between
   *  mouse and keyboard mid-game does not jump. */
  const onTileFocus = useCallback(
    (id: string) => {
      const pos = findPos(rows, id);
      if (pos) lastPos.current = pos;
      setActiveId(id);
    },
    [rows],
  );

  // Exactly one tile is tabbable. Falling back to the first tile keeps the
  // board reachable before the cursor has been placed.
  const firstId = rows.find((r) => r.length > 0)?.[0]?.id ?? null;
  const tabbableId = activeId ?? firstId;

  return { tabbableId, registerTile, onKeyDown, onTileFocus, setActiveId };
}
