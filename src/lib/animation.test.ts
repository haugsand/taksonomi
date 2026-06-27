import { describe, expect, it } from "vitest";
import { staggerDelays } from "./animation";

const ids = (n: number) => Array.from({ length: n }, (_, i) => `id-${i}`);

describe("staggerDelays", () => {
  it("assigns one delay per id", () => {
    const { delays } = staggerDelays(ids(5), { windowMs: 700, maxStep: 22, tailMs: 400 });
    expect(delays.size).toBe(5);
    for (const id of ids(5)) expect(delays.has(id)).toBe(true);
  });

  it("produces evenly spaced delays from 0 to (n-1)*step", () => {
    // 700 / 5 = 140 > 22, so step is capped at maxStep (22).
    const { delays } = staggerDelays(ids(5), { windowMs: 700, maxStep: 22, tailMs: 400 });
    const sorted = [...delays.values()].sort((a, b) => a - b);
    expect(sorted).toEqual([0, 22, 44, 66, 88]);
  });

  it("shrinks the step to fit the window when there are many ids", () => {
    // 100 / 50 = 2 < 22, so step is windowMs / n.
    const { delays } = staggerDelays(ids(50), { windowMs: 100, maxStep: 22, tailMs: 400 });
    const sorted = [...delays.values()].sort((a, b) => a - b);
    expect(sorted[1] - sorted[0]).toBe(2);
    expect(sorted.at(-1)).toBe(49 * 2);
  });

  it("computes totalMs as last delay plus the tail", () => {
    const { totalMs } = staggerDelays(ids(5), { windowMs: 700, maxStep: 22, tailMs: 400 });
    expect(totalMs).toBe(88 + 400);
  });

  it("returns an empty map for no ids", () => {
    const { delays } = staggerDelays([], { windowMs: 700, maxStep: 22, tailMs: 400 });
    expect(delays.size).toBe(0);
  });
});
