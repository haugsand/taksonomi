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
  /** Merge "pop-in" played when a merge does not complete a category;
   *  useTileCompletion waits this long before clearing the merged state. */
  pop: number;
  /** Mismatch feedback: a damped wobble, or a colour flash under reduced
   *  motion. Both profiles share the value — see REDUCED below. */
  shake: number;
  /** Collapse of a completed category's tile into its centre point. */
  fadeout: number;
  /** How long a tile takes to slide into the gap a departed neighbour left. */
  shift: number;
  /** Added to that slide per tile along the row, so it closes as a ripple
   *  rather than as one block. Capped in Tile.css — see .tile--shift. */
  shiftStep: number;
  /** How long the rows below a vanished row take to rise into its place. */
  rowShift: number;
  /** Held before they start, so the row finishes emptying first. */
  rowShiftDelay: number;
  /** Pause between the result appearing and the solved categories filling in
   *  under it, and the duration of their fade. One value for both, so the JS
   *  timer that schedules the reveal and the CSS that animates it agree. */
  reveal: number;
};

const FULL: Timings = {
  enterWindow: 700,
  enterMaxStep: 22,
  enterAnim: 300,
  leaveWindow: 350,
  leaveMaxStep: 16,
  leaveAnim: 250,
  pop: 450,
  shake: 380,
  fadeout: 450,
  shift: 350,
  shiftStep: 20,
  rowShift: 350,
  rowShiftDelay: 0,
  reveal: 350,
};

/**
 * Reduced motion: no travel and no staggering, but not simply zero.
 *
 *  - `fadeout: 200` keeps a solved category on screen a beat before it goes.
 *    That is a pause, not motion — and the collapse-to-nothing it would
 *    otherwise animate is swapped for a plain fade in Tile.css.
 *  - `shake` matches the full profile: the mismatch animation becomes a colour
 *    flash (Tile.css), which still needs its duration. Removing it outright
 *    would leave reduced-motion players with no mismatch feedback at all beyond
 *    the live region. Keep the two in step — a reduced value longer than the
 *    full one is nonsense, and the flash wants the full window to be read.
 *  - `shift`/`rowShift` at 1ms with no step or delay snaps the board shut
 *    instead of sliding it. The FLIP in useBoardReflow still runs; it just
 *    lands within a frame.
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
  shake: 380,
  fadeout: 200,
  shift: 1,
  shiftStep: 0,
  rowShift: 1,
  rowShiftDelay: 0,
  reveal: 200,
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
    "--tile-shift-duration": `${t.shift}ms`,
    "--tile-shift-step": `${t.shiftStep}ms`,
    "--row-shift-duration": `${t.rowShift}ms`,
    "--row-shift-delay": `${t.rowShiftDelay}ms`,
    "--reveal-duration": `${t.reveal}ms`,
  };
}

/** Delay after a new game before refilling the prefetch cache. Not a motion
 *  value — unaffected by the motion preference. */
export const PREFETCH_REFILL_MS = 800;

// localStorage keys. Bump the version suffix when the stored shape changes.

/** The one game in progress, free or daily. v4 added `mode`, `date` and `timer`. */
export const STATE_KEY = "taksonomi:state:v4";
/** Today's finished daily challenges, by size. */
export const DAILY_KEY = "taksonomi:daily:v1";
/** Must match the key used by the pre-paint script in index.html. */
export const THEME_KEY = "taksonomi:theme:v1";

// Palette

/** Number of evenly spaced hues used for group tiles. */
export const HUE_COUNT = 45;
