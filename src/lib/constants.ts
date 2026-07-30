/** App-wide constants. Values tied to a specific type or already living in a
 *  dedicated config module (e.g. GAME_SIZES in sizes.ts) stay there. */

/**
 * Animation timings (ms). These are the single source of truth for *both* the
 * JS timing (stagger windows and setTimeouts in Game.tsx) and the CSS
 * animations: the CSS never hardcodes a duration, it reads each one through the
 * custom properties `animationVars()` puts on the .game root.
 *
 * Crucially, that includes the reduced-motion case. An earlier version squashed
 * the durations with a `@media (prefers-reduced-motion: reduce)` block in
 * Tile.css, which the JS knew nothing about: the tile vanished instantly while
 * `setTimeout(..., TILE_FADEOUT_MS)` still held the board frozen for three
 * seconds per completed category, and delayed the win modal by the same. So the
 * preference is resolved in JS (see useReducedMotion) and picks a whole profile
 * here — the stylesheet must never override a *duration* again.
 *
 * CSS may still switch *which* animation plays (see .tile--shake, which becomes
 * a colour flash under reduced motion). The division is: CSS decides what, this
 * file decides how long.
 */
export type Timings = {
  /** Total window over which all tiles stagger in on a new game. */
  enterWindow: number;
  /** Largest delay added between consecutive tile entrances. */
  enterMaxStep: number;
  /** Duration of a single tile's enter animation. */
  enterAnim: number;
  /** Window over which the previous game's tiles stagger out. */
  leaveWindow: number;
  /** Largest delay added between consecutive tile exits. */
  leaveMaxStep: number;
  /** Duration of a single tile's leave animation. */
  leaveAnim: number;
  /** Merge "pop" played when a merge does not complete a category;
   *  useTileCompletion waits this long before clearing the merged state. */
  pop: number;
  /** Mismatch feedback: a shake, or a colour flash under reduced motion. */
  shake: number;
  /** Fade-out of a completed category's tile. */
  fadeout: number;
  /** Scale a completed tile grows to while it fades out, in place. */
  fadeScale: number;
};

const FULL: Timings = {
  enterWindow: 700,
  enterMaxStep: 22,
  enterAnim: 300,
  leaveWindow: 350,
  leaveMaxStep: 16,
  leaveAnim: 250,
  pop: 550,
  shake: 400,
  fadeout: 3000,
  fadeScale: 5,
};

/**
 * Reduced motion: no travel and no staggering, but not simply zero.
 *
 *  - `fadeout: 200` keeps a completed category on screen just long enough to
 *    read what you solved. That is a pause, not motion.
 *  - `shake: 400` is unchanged: the mismatch animation becomes a colour flash
 *    (Tile.css), which still needs its duration. Removing it outright would
 *    leave reduced-motion players with no mismatch feedback at all beyond the
 *    live region.
 *  - `fadeScale: 1` cancels the grow-while-fading, which is the motion part.
 *  - 1ms rather than 0 for the animations, so `animation-fill-mode: both`
 *    still resolves to the end state.
 */
const REDUCED: Timings = {
  enterWindow: 0,
  enterMaxStep: 0,
  enterAnim: 1,
  leaveWindow: 0,
  leaveMaxStep: 0,
  leaveAnim: 1,
  pop: 1,
  shake: 400,
  fadeout: 200,
  fadeScale: 1,
};

/** The timing profile for the given motion preference. */
export function timings(reducedMotion: boolean): Timings {
  return reducedMotion ? REDUCED : FULL;
}

/** Timings as CSS custom properties, spread onto the .game root's `style` so
 *  Tile.css can read each one via var(). */
export function animationVars(t: Timings): Record<string, string> {
  return {
    "--tile-enter-duration": `${t.enterAnim}ms`,
    "--tile-leave-duration": `${t.leaveAnim}ms`,
    "--tile-pop-duration": `${t.pop}ms`,
    "--tile-shake-duration": `${t.shake}ms`,
    "--tile-fadeout-duration": `${t.fadeout}ms`,
    "--tile-fade-scale": `${t.fadeScale}`,
  };
}

/** Delay after a new game before refilling the prefetch cache. Not a motion
 *  value — unaffected by the motion preference. */
export const PREFETCH_REFILL_MS = 800;

// localStorage keys. Bump the version suffix when the stored shape changes.

export const STATE_KEY = "taksonomi:state:v3";
export const SIZE_KEY = "taksonomi:size:v1";
/** Must match the key used by the pre-paint script in index.html. */
export const THEME_KEY = "taksonomi:theme:v1";

// Palette

/** Number of evenly spaced hues used for group tiles. */
export const HUE_COUNT = 45;
