import { useState } from "preact/hooks";
import type { Timings } from "@/lib/constants";

const setWith = (set: Set<string>, id: string): Set<string> => new Set(set).add(id);
const setWithout = (set: Set<string>, id: string): Set<string> => {
  const next = new Set(set);
  next.delete(id);
  return next;
};

type Callbacks = {
  /** Hide a tile once it has finished collapsing (it stays "solved"). */
  onHide: (id: string) => void;
  /** Fired when the final category's animation completes. */
  onFinal: () => void;
  /** Animation timings for the current motion preference. These drive the
   *  setTimeouts below, so the JS waits exactly as long as the CSS animates —
   *  under reduced motion that is 200ms, not 3s. See constants.ts. */
  timings: Timings;
};

/**
 * Owns the post-merge tile animation lifecycle. A merge that doesn't complete a
 * category pops in. A completed category skips the pop and instead shrinks into
 * its centre point (see Tile.css), staying in the flex flow — so its slot is
 * held until the collapse finishes, then released when it hides. State is keyed
 * by tile id so several categories completing within the same window each run an
 * independent sequence.
 */
export function useTileCompletion({ onHide, onFinal, timings }: Callbacks) {
  // Tiles currently playing the merge "pop".
  const [justMergedIds, setJustMergedIds] = useState<Set<string>>(new Set());
  // Completed tiles currently collapsing into their centre point.
  const [fadingOutIds, setFadingOutIds] = useState<Set<string>>(new Set());

  /** A merge that did not complete a category: just play the pop. */
  function popMerged(id: string) {
    setJustMergedIds((s) => setWith(s, id));
    setTimeout(() => setJustMergedIds((s) => setWithout(s, id)), timings.pop);
  }

  /** A merge that completed a category: immediately collapse into its centre
   *  point, then hide (releasing its slot). No pop. */
  function completeCategory(id: string, isFinal: boolean) {
    setFadingOutIds((s) => setWith(s, id));
    setTimeout(() => {
      setFadingOutIds((s) => setWithout(s, id));
      onHide(id);
      if (isFinal) onFinal();
    }, timings.fadeout);
  }

  function reset() {
    setJustMergedIds(new Set());
    setFadingOutIds(new Set());
  }

  return { justMergedIds, fadingOutIds, popMerged, completeCategory, reset };
}
