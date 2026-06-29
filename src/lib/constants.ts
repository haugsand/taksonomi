/** App-wide constants. Values tied to a specific type or already living in a
 *  dedicated config module (e.g. GAME_SIZES in sizes.ts) stay there. */

// Animation / timing (ms) — used by Game.tsx. Durations that say "matches the
// CSS" must stay in sync with the corresponding animation in Tile.css.

/** Total time window over which all tiles stagger in on a new game. */
export const ENTER_WINDOW_MS = 700;
/** Largest delay added between consecutive tile entrances. */
export const ENTER_MAX_STEP_MS = 22;
/** Duration of a single tile's enter animation (matches the CSS). */
export const ENTER_ANIM_MS = 400;
/** Time window over which the previous game's tiles stagger out. */
export const LEAVE_WINDOW_MS = 350;
/** Largest delay added between consecutive tile exits. */
export const LEAVE_MAX_STEP_MS = 16;
/** Duration of a single tile's leave animation (matches the CSS). */
export const LEAVE_ANIM_MS = 250;
/** Delay after a new game before refilling the prefetch cache. */
export const PREFETCH_REFILL_MS = 800;
/** Duration of the tile fade-out for completed categories (matches tile--fadeout in Tile.css). */
export const TILE_FADEOUT_MS = 5000;

// localStorage keys. Bump the version suffix when the stored shape changes.

export const STATE_KEY = "taksonomi:state:v3";
export const SIZE_KEY = "taksonomi:size:v1";
/** Must match the key used by the pre-paint script in index.html. */
export const THEME_KEY = "taksonomi:theme:v1";

// Palette

/** Number of evenly spaced hues used for group tiles. */
export const HUE_COUNT = 45;
