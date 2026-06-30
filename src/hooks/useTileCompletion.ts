import { useLayoutEffect, useState } from "preact/hooks";
import type { RefObject } from "preact";
import type { Rect } from "@/components/Tile";
import { POP_ANIM_MS, TILE_FADEOUT_MS } from "@/lib/constants";

const setWith = (set: Set<string>, id: string): Set<string> => new Set(set).add(id);
const setWithout = (set: Set<string>, id: string): Set<string> => {
  const next = new Set(set);
  next.delete(id);
  return next;
};
const mapWithout = <V>(map: Map<string, V>, id: string): Map<string, V> => {
  const next = new Map(map);
  next.delete(id);
  return next;
};

type Callbacks = {
  /** Hide a tile once its fade-out has finished (it stays "solved"). */
  onHide: (id: string) => void;
  /** Fired when the final category's animation completes. */
  onFinal: () => void;
};

/**
 * Owns the post-merge tile animation lifecycle. Every merge pops; a completed
 * category additionally pins itself out of the flex flow (so it can grow
 * without disturbing the board) and fades out scaling up. State is keyed by
 * tile id so several categories completing within the same animation window
 * each run an independent sequence.
 */
export function useTileCompletion(gameRef: RefObject<HTMLElement>, { onHide, onFinal }: Callbacks) {
  // Tiles currently playing the merge "pop".
  const [justMergedIds, setJustMergedIds] = useState<Set<string>>(new Set());
  // Completed tiles currently fading out.
  const [fadingOutIds, setFadingOutIds] = useState<Set<string>>(new Set());
  // Completed tiles detached from the flow, awaiting/holding a measured rect.
  const [completingIds, setCompletingIds] = useState<Set<string>>(new Set());
  const [completingRects, setCompletingRects] = useState<Map<string, Rect>>(new Map());

  // Measure any newly-completing tiles' current (still in-flow) box relative to
  // .game, then pin each there via position: absolute — same spot, so the
  // switch out of the flex flow is invisible. Runs before paint; each tile is
  // measured only once.
  useLayoutEffect(() => {
    const gameEl = gameRef.current;
    if (!gameEl || completingIds.size === 0) return;
    setCompletingRects((prevRects) => {
      const pending = [...completingIds].filter((id) => !prevRects.has(id));
      if (pending.length === 0) return prevRects;
      const gameBox = gameEl.getBoundingClientRect();
      const elementsById = new Map(
        Array.from(gameEl.querySelectorAll<HTMLElement>("[data-tile-id]")).map((el) => [
          el.dataset.tileId,
          el,
        ]),
      );
      const next = new Map(prevRects);
      for (const id of pending) {
        const tileEl = elementsById.get(id);
        if (!tileEl) continue;
        const tileBox = tileEl.getBoundingClientRect();
        next.set(id, {
          top: tileBox.top - gameBox.top,
          left: tileBox.left - gameBox.left,
          width: tileBox.width,
          height: tileBox.height,
        });
      }
      return next;
    });
  }, [completingIds, gameRef]);

  /** A merge that did not complete a category: just play the pop. */
  function popMerged(id: string) {
    setJustMergedIds((s) => setWith(s, id));
    setTimeout(() => setJustMergedIds((s) => setWithout(s, id)), POP_ANIM_MS);
  }

  /** A merge that completed a category: pop, pin, then fade out scaling up. */
  function completeCategory(id: string, isFinal: boolean) {
    setJustMergedIds((s) => setWith(s, id));
    setCompletingIds((s) => setWith(s, id));
    setTimeout(() => {
      setJustMergedIds((s) => setWithout(s, id));
      setFadingOutIds((s) => setWith(s, id));
      setTimeout(() => {
        setFadingOutIds((s) => setWithout(s, id));
        setCompletingIds((s) => setWithout(s, id));
        setCompletingRects((m) => mapWithout(m, id));
        onHide(id);
        if (isFinal) onFinal();
      }, TILE_FADEOUT_MS);
    }, POP_ANIM_MS);
  }

  function reset() {
    setJustMergedIds(new Set());
    setFadingOutIds(new Set());
    setCompletingIds(new Set());
    setCompletingRects(new Map());
  }

  return { justMergedIds, fadingOutIds, completingRects, popMerged, completeCategory, reset };
}
