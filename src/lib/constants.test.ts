import { describe, expect, it } from "vitest";
import { animationVars, timings, type Timings } from "./constants";

/** Every duration in a Timings profile (i.e. all of it except the unitless
 *  scale factor). Written as a Timings-keyed record so adding a field to the
 *  type forces a decision here rather than silently escaping the checks. */
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
  fadeScale: false,
  reveal: true,
};

const durations = (t: Timings) =>
  (Object.keys(DURATION_KEYS) as (keyof Timings)[])
    .filter((k) => DURATION_KEYS[k])
    .map((k) => [k, t[k]] as const);

describe("timings", () => {
  it("keeps the full profile's staged animations", () => {
    const t = timings(false);
    expect(t.fadeout).toBe(3000);
    expect(t.enterWindow).toBeGreaterThan(0);
    expect(t.fadeScale).toBeGreaterThan(1);
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

  it("cancels the grow-while-fading, which is the motion part", () => {
    expect(timings(true).fadeScale).toBe(1);
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
      "--tile-enter-duration",
      "--tile-fade-scale",
      "--tile-fadeout-duration",
      "--tile-leave-duration",
      "--tile-pop-duration",
      "--tile-shake-duration",
    ]);
  });

  it("differs between the two profiles, so the CSS actually follows", () => {
    // If these ever matched, the stylesheet would be animating at full length
    // while the JS timers ran short — the two halves of the same bug.
    expect(animationVars(timings(true))).not.toEqual(animationVars(timings(false)));
  });

  it("emits ms units for durations and a bare number for the scale", () => {
    const vars = animationVars(timings(true));
    for (const [name, value] of Object.entries(vars)) {
      if (name === "--tile-fade-scale") expect(value).toMatch(/^[\d.]+$/);
      else expect(value, name).toMatch(/^\d+ms$/);
    }
  });
});
