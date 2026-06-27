import { afterEach, describe, expect, it, vi } from "vitest";
import { shuffle, sleep } from "./util";

describe("shuffle", () => {
  it("keeps the same elements", () => {
    const input = [1, 2, 3, 4, 5];
    const result = shuffle(input);
    expect([...result].sort((a, b) => a - b)).toEqual(input);
  });

  it("does not mutate the input", () => {
    const input = [1, 2, 3];
    const copy = [...input];
    shuffle(input);
    expect(input).toEqual(copy);
  });

  it("returns a new array", () => {
    const input = [1, 2, 3];
    expect(shuffle(input)).not.toBe(input);
  });

  it("handles empty arrays", () => {
    expect(shuffle([])).toEqual([]);
  });
});

describe("sleep", () => {
  afterEach(() => vi.useRealTimers());

  it("resolves after the given delay", async () => {
    vi.useFakeTimers();
    let resolved = false;
    const p = sleep(100).then(() => {
      resolved = true;
    });
    await vi.advanceTimersByTimeAsync(99);
    expect(resolved).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    await p;
    expect(resolved).toBe(true);
  });
});
