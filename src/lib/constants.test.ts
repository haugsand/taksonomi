import { describe, expect, it } from "vitest";
import { animationVars, timings, type Timings } from "./constants";

/** Every duration in a Timings profile. Written as a Timings-keyed record so
 *  adding a field to the type forces a decision here rather than silently
 *  escaping the checks. Every field is a duration today; a future unitless one
 *  would be added as `false`. */
const DURATION_KEYS: Record<keyof Timings, boolean> = {
  enterWindow: true,
  enterMaxStep: true,
  enterAnim: true,
  leaveWindow: true,
  leaveMaxStep: true,
  leaveAnim: true,
  pop: true,
  shake: true,
  fadeout: true,
  shift: true,
  shiftStep: true,
  rowShift: true,
  rowShiftStep: true,
  rowShiftDelay: true,
  reveal: true,
};

const durations = (t: Timings) =>
  (Object.keys(DURATION_KEYS) as (keyof Timings)[])
    .filter((k) => DURATION_KEYS[k])
    .map((k) => [k, t[k]] as const);

describe("timings", () => {
  it("keeps the full profile's staged animations", () => {
    const full = timings(false);
    const reduced = timings(true);
    expect(full.enterWindow).toBeGreaterThan(0);
    expect(full.enterMaxStep).toBeGreaterThan(0);
    // The staged animations are the ones reduced motion collapses; under full
    // motion each must still have room to play.
    expect(full.fadeout).toBeGreaterThan(reduced.fadeout);
    expect(full.pop).toBeGreaterThan(reduced.pop);
  });

  it("collapses the long waits under reduced motion", () => {
    const t = timings(true);
    // The bug this guards: the JS waited TILE_FADEOUT_MS (3s) before hiding the
    // tile and firing onFinal, while CSS had already cut the fade to nothing —
    // three seconds of frozen board per completed category.
    expect(t.fadeout).toBeLessThan(500);
    expect(t.enterWindow).toBe(0);
    expect(t.leaveWindow).toBe(0);
  });

  it("keeps the mismatch cue long enough to notice", () => {
    // Under reduced motion the shake becomes a colour flash (Tile.css), which
    // still needs a duration — zeroing it would remove the only on-board
    // signal that two words don't belong together.
    expect(timings(true).shake).toBeGreaterThanOrEqual(200);
  });

  it("never returns a negative or non-finite duration", () => {
    for (const reduced of [false, true]) {
      for (const [key, value] of durations(timings(reduced))) {
        expect(Number.isFinite(value), `${key} (reduced=${reduced})`).toBe(true);
        expect(value, `${key} (reduced=${reduced})`).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it("does not shorten anything when motion is allowed", () => {
    const full = timings(false);
    const reduced = timings(true);
    for (const [key, value] of durations(reduced)) {
      expect(value, key).toBeLessThanOrEqual(full[key]);
    }
  });
});

describe("animationVars", () => {
  it("exposes every timing the stylesheet reads", () => {
    const vars = animationVars(timings(false));
    expect(Object.keys(vars).sort()).toEqual([
      "--reveal-duration",
      "--row-shift-delay",
      "--row-shift-duration",
      "--row-shift-step",
      "--tile-enter-duration",
      "--tile-fadeout-duration",
      "--tile-leave-duration",
      "--tile-pop-duration",
      "--tile-shake-duration",
      "--tile-shift-duration",
      "--tile-shift-step",
    ]);
  });

  it("differs between the two profiles, so the CSS actually follows", () => {
    // If these ever matched, the stylesheet would be animating at full length
    // while the JS timers ran short — the two halves of the same bug.
    expect(animationVars(timings(true))).not.toEqual(animationVars(timings(false)));
  });

  it("emits ms units on every duration", () => {
    const vars = animationVars(timings(true));
    for (const [name, value] of Object.entries(vars)) {
      expect(value, name).toMatch(/^\d+ms$/);
    }
  });
});
