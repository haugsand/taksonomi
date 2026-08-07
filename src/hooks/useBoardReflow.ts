import { useCallback, useLayoutEffect, useRef } from "preact/hooks";
import type { TileData } from "@/lib/types";

/** Where an element sat last time, and under which parent. */
type Placement = { offset: number; parent: HTMLElement };
type Mover = { el: HTMLElement; delta: number; offset: number };

/**
 * Animates the board closing up after something leaves it.
 *
 * Two movements, one mechanism. A tile leaving a row lets the tiles to its
 * right slide left; a row emptying lets the rows below it slide up. Neither is
 * transitionable on its own — flex re-lays out instantly, and there is no
 * property to animate from "where it was" to "where it is now". So this is
 * FLIP: measure everything before and after the change, translate whatever
 * moved back to where it was (transitions off), then drop the translation and
 * let `.tile--shift` / `.board__row--shift` carry it home.
 *
 * Both are measured in the same layout effect on purpose: one read pass for the
 * whole board, then one write pass, rather than a layout flush per element.
 *
 * Positions are offsetLeft/offsetTop *relative to the parent*, paired with the
 * parent element itself. Layout coordinates ignore any transform still in
 * flight from an unfinished shift, and making them parent-relative means a tile
 * is measured against its own row and a row against the board — so the board
 * sliding down (a taller header, say) moves every row without any of them
 * counting as having moved. Comparing the parent by identity is what catches a
 * tile that changed rows entirely: that is a re-layout by assignRows, not a gap
 * closing, and this only animates one axis per element.
 */
export function useBoardReflow(rows: TileData[][]) {
  const tileEls = useRef(new Map<string, HTMLElement>());
  const rowEls = useRef(new Map<number, HTMLElement>());
  const prevTiles = useRef(new Map<string, Placement>());
  const prevRows = useRef(new Map<number, Placement>());

  const measureTile = useCallback((id: string, el: HTMLElement | null) => {
    if (el) tileEls.current.set(id, el);
    else tileEls.current.delete(id);
  }, []);

  const measureRow = useCallback((row: number, el: HTMLElement | null) => {
    if (el) rowEls.current.set(row, el);
    else rowEls.current.delete(row);
  }, []);

  useLayoutEffect(() => {
    const read = <K>(
      els: Map<K, HTMLElement>,
      previous: Map<K, Placement>,
      offsetOf: (el: HTMLElement, parent: HTMLElement) => number,
    ) => {
      const next = new Map<K, Placement>();
      const movers: Mover[] = [];
      els.forEach((el, key) => {
        const parent = el.parentElement;
        if (!parent) return;
        const offset = offsetOf(el, parent);
        next.set(key, { offset, parent });
        const was = previous.get(key);
        if (was && was.parent === parent && was.offset !== offset) {
          movers.push({ el, delta: was.offset - offset, offset });
        }
      });
      return { next, movers };
    };

    const tiles = read(tileEls.current, prevTiles.current, (el, p) => el.offsetLeft - p.offsetLeft);
    const rowsRead = read(rowEls.current, prevRows.current, (el, p) => el.offsetTop - p.offsetTop);
    prevTiles.current = tiles.next;
    prevRows.current = rowsRead.next;

    const all = [...tiles.movers, ...rowsRead.movers];
    if (all.length === 0) return;

    // Invert. Transitions off, so the jump back is not itself animated by
    // whatever transition the element already had.
    for (const m of tiles.movers) {
      m.el.style.transition = "none";
      m.el.style.transform = `translateX(${m.delta}px)`;
    }
    for (const m of rowsRead.movers) {
      m.el.style.transition = "none";
      m.el.style.transform = `translateY(${m.delta}px)`;
    }
    // Flush the inverted positions so the browser takes them as the start
    // state instead of coalescing them with the release below into no change.
    void all[0].el.offsetWidth;

    // Play. Tiles stagger left to right within their own row, so a row closes
    // as a ripple spreading out from the gap; rows stagger top to bottom, so
    // the board draws itself up after the row that vanished rather than
    // snapping shut in one block. Same mechanism either way — an index the
    // stylesheet turns into a delay — just a different axis to sort along.
    const byRow = new Map<HTMLElement, Mover[]>();
    for (const m of tiles.movers) {
      const parent = m.el.parentElement;
      if (!parent) continue;
      const group = byRow.get(parent) ?? [];
      group.push(m);
      byRow.set(parent, group);
    }
    for (const group of byRow.values()) {
      group.sort((a, b) => a.offset - b.offset);
      group.forEach((m, i) => {
        m.el.style.setProperty("--tile-shift-index", String(i));
        release(m.el, "tile--shift", "--tile-shift-index");
      });
    }
    // Every moving row sits below the gap it is closing, so ordering by their
    // settled position counts outwards from it — the row that lost its
    // neighbour leads and the rest follow it up.
    rowsRead.movers.sort((a, b) => a.offset - b.offset);
    rowsRead.movers.forEach((m, i) => {
      m.el.style.setProperty("--row-shift-index", String(i));
      release(m.el, "board__row--shift", "--row-shift-index");
    });
  }, [rows]);

  return { measureTile, measureRow };
}

/** Hands an inverted element back to the stylesheet and cleans up after it. */
function release(el: HTMLElement, className: string, indexProperty?: string) {
  el.style.transition = "";
  el.classList.add(className);
  el.style.transform = "";
  const done = (e: TransitionEvent) => {
    if (e.propertyName !== "transform") return;
    el.classList.remove(className);
    if (indexProperty) el.style.removeProperty(indexProperty);
    el.removeEventListener("transitionend", done);
    el.removeEventListener("transitioncancel", done);
  };
  el.addEventListener("transitionend", done);
  el.addEventListener("transitioncancel", done);
}
