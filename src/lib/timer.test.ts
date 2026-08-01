import { describe, expect, it } from "vitest";
import { elapsedMs, formatDuration, IDLE_TIMER, isTimer, pauseTimer, startTimer } from "./timer";

describe("timer", () => {
  it("counts nothing until started", () => {
    expect(elapsedMs(IDLE_TIMER, 10_000)).toBe(0);
  });

  it("counts from the moment it started", () => {
    const t = startTimer(IDLE_TIMER, 1000);
    expect(elapsedMs(t, 4000)).toBe(3000);
  });

  it("banks the running stretch when paused, then holds still", () => {
    const t = pauseTimer(startTimer(IDLE_TIMER, 1000), 4000);
    expect(elapsedMs(t, 9999)).toBe(3000);
  });

  it("adds stretches across pauses — the menu can be opened repeatedly", () => {
    let t = startTimer(IDLE_TIMER, 0);
    t = pauseTimer(t, 2000);
    t = startTimer(t, 10_000);
    t = pauseTimer(t, 11_000);
    expect(elapsedMs(t, 50_000)).toBe(3000);
  });

  it("ignores a second start and a second pause", () => {
    const running = startTimer(IDLE_TIMER, 1000);
    expect(startTimer(running, 5000)).toBe(running);
    const paused = pauseTimer(running, 3000);
    expect(pauseTimer(paused, 9000)).toBe(paused);
  });

  describe("isTimer", () => {
    it("accepts both states", () => {
      expect(isTimer({ accumulatedMs: 0, runningSince: null })).toBe(true);
      expect(isTimer({ accumulatedMs: 5, runningSince: 1 })).toBe(true);
    });

    it("rejects what would break the arithmetic", () => {
      for (const bad of [
        null,
        undefined,
        {},
        { accumulatedMs: "0", runningSince: null },
        { accumulatedMs: Number.NaN, runningSince: null },
        { accumulatedMs: 0 },
        { accumulatedMs: 0, runningSince: "now" },
      ]) {
        expect(isTimer(bad)).toBe(false);
      }
    });
  });

  describe("formatDuration", () => {
    it("uses m:ss under an hour", () => {
      expect(formatDuration(0)).toBe("0:00");
      expect(formatDuration(9000)).toBe("0:09");
      expect(formatDuration(401_000)).toBe("6:41");
      expect(formatDuration(3_599_000)).toBe("59:59");
    });

    it("adds hours only once there are some — 40×40 can take that long", () => {
      expect(formatDuration(3_600_000)).toBe("1:00:00");
      expect(formatDuration(3_852_000)).toBe("1:04:12");
    });

    it("never renders a negative clock", () => {
      expect(formatDuration(-5000)).toBe("0:00");
    });
  });
});
