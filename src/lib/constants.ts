/** App-wide constants. Values tied to a specific type or already living in a
 *  dedicated config module (e.g. GAME_SIZES in sizes.ts) stay there. */

// Animation durations (ms) — the single source of truth for both the JS timing
// (stagger windows and setTimeouts in Game.tsx) and the CSS animations. The CSS
// side never hardcodes a duration: it reads these via the custom properties in
// `animationVars` below, applied to the .game root. Change a value here only.

/** Total time window over which all tiles stagger in on a new game. */
export const ENTER_WINDOW_MS = 700;
/** Largest delay added between consecutive tile entrances. */
export const ENTER_MAX_STEP_MS = 22;
/** Duration of a single tile's enter animation. */
export const ENTER_ANIM_MS = 300;
/** Time window over which the previous game's tiles stagger out. */
export const LEAVE_WINDOW_MS = 350;
/** Largest delay added between consecutive tile exits. */
export const LEAVE_MAX_STEP_MS = 16;
/** Duration of a single tile's leave animation. */
export const LEAVE_ANIM_MS = 250;
/** Duration of the merge "pop"; Game.tsx also waits this long before clearing
 *  the merged state and starting the completed-tile fade. */
export const POP_ANIM_MS = 550;
/** Duration of the mismatch "shake". */
export const SHAKE_ANIM_MS = 400;
/** Duration of the tile fade-out for completed categories. */
export const TILE_FADEOUT_MS = 5000;
/** Delay after a new game before refilling the prefetch cache. */
export const PREFETCH_REFILL_MS = 800;

/** Animation durations as CSS custom properties. Spread onto the .game root's
 *  `style` so Tile.css can read each duration via var() — keeping the values
 *  defined only here, never duplicated in the stylesheet. */
export const animationVars = {
  "--tile-enter-duration": `${ENTER_ANIM_MS}ms`,
  "--tile-leave-duration": `${LEAVE_ANIM_MS}ms`,
  "--tile-pop-duration": `${POP_ANIM_MS}ms`,
  "--tile-shake-duration": `${SHAKE_ANIM_MS}ms`,
  "--tile-fadeout-duration": `${TILE_FADEOUT_MS}ms`,
} as const;

// localStorage keys. Bump the version suffix when the stored shape changes.

export const STATE_KEY = "taksonomi:state:v3";
export const SIZE_KEY = "taksonomi:size:v1";
/** Must match the key used by the pre-paint script in index.html. */
export const THEME_KEY = "taksonomi:theme:v1";

// Palette

/** Number of evenly spaced hues used for group tiles. */
export const HUE_COUNT = 45;
