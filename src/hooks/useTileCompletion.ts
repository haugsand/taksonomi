import { useState } from "preact/hooks";
import { POP_ANIM_MS, TILE_FADEOUT_MS } from "@/lib/constants";

const setWith = (set: Set<string>, id: string): Set<string> => new Set(set).add(id);
const setWithout = (set: Set<string>, id: string): Set<string> => {
  const next = new Set(set);
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
 * Owns the post-merge tile animation lifecycle. A merge that doesn't complete a
 * category pops. A completed category skips the pop and instead fades out in
 * place while growing (see Tile.css), staying in the flex flow — so its slot is
 * held until the fade finishes, then released when it hides. State is keyed by
 * tile id so several categories completing within the same window each run an
 * independent sequence.
 */
export function useTileCompletion({ onHide, onFinal }: Callbacks) {
  // Tiles currently playing the merge "pop".
  const [justMergedIds, setJustMergedIds] = useState<Set<string>>(new Set());
  // Completed tiles currently fading out (and growing) in place.
  const [fadingOutIds, setFadingOutIds] = useState<Set<string>>(new Set());

  /** A merge that did not complete a category: just play the pop. */
  function popMerged(id: string) {
    setJustMergedIds((s) => setWith(s, id));
    setTimeout(() => setJustMergedIds((s) => setWithout(s, id)), POP_ANIM_MS);
  }

  /** A merge that completed a category: immediately fade out while growing in
   *  place, then hide (releasing its slot). No pop. */
  function completeCategory(id: string, isFinal: boolean) {
    setFadingOutIds((s) => setWith(s, id));
    setTimeout(() => {
      setFadingOutIds((s) => setWithout(s, id));
      onHide(id);
      if (isFinal) onFinal();
    }, TILE_FADEOUT_MS);
  }

  function reset() {
    setJustMergedIds(new Set());
    setFadingOutIds(new Set());
  }

  return { justMergedIds, fadingOutIds, popMerged, completeCategory, reset };
}
