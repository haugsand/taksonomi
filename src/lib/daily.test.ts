import { describe, expect, it } from "vitest";
import {
  boardRng,
  dailySeed,
  dayKey,
  formatDayLong,
  formatDayShort,
  layoutRng,
  secondsUntilNextDay,
} from "./daily";
import { rngFor } from "./rng";

const at = (iso: string) => new Date(iso);

describe("dayKey", () => {
  it("formats as YYYY-MM-DD", () => {
    expect(dayKey(at("2026-07-30T10:00:00Z"))).toBe("2026-07-30");
  });

  it("turns over at midnight in Oslo, not UTC (summer, UTC+2)", () => {
    expect(dayKey(at("2026-07-30T21:59:00Z"))).toBe("2026-07-30"); // 23:59 Oslo
    expect(dayKey(at("2026-07-30T22:00:00Z"))).toBe("2026-07-31"); // 00:00 Oslo
  });

  it("turns over at midnight in Oslo in winter too (UTC+1)", () => {
    expect(dayKey(at("2026-01-15T22:59:00Z"))).toBe("2026-01-15");
    expect(dayKey(at("2026-01-15T23:00:00Z"))).toBe("2026-01-16");
  });

  it("keeps a UTC-morning instant on the same Oslo day", () => {
    // A player in Oslo at 01:30 is on the new day; the UTC date agrees here,
    // but the point is that the zone decides, not the server's locale.
    expect(dayKey(at("2026-07-31T00:30:00Z"))).toBe("2026-07-31");
  });
});

describe("secondsUntilNextDay", () => {
  it("counts down to the next Oslo midnight", () => {
    expect(secondsUntilNextDay(at("2026-07-30T22:00:00Z"))).toBe(86400); // just turned over
    expect(secondsUntilNextDay(at("2026-07-30T21:59:00Z"))).toBe(60); // one minute left
  });

  it("stays within a day, so nothing is cached past its board", () => {
    for (const hour of [0, 5, 11, 17, 23]) {
      const value = secondsUntilNextDay(at(`2026-03-12T${String(hour).padStart(2, "0")}:00:00Z`));
      expect(value).toBeGreaterThan(0);
      expect(value).toBeLessThanOrEqual(86400);
    }
  });
});

describe("seeded generators", () => {
  it("gives the same sequence for the same day and size", () => {
    const a = boardRng("2026-07-30", 15, 15);
    const b = boardRng("2026-07-30", 15, 15);
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
  });

  it("gives a different sequence on a different day", () => {
    const a = boardRng("2026-07-30", 15, 15);
    const b = boardRng("2026-07-31", 15, 15);
    expect(a()).not.toBe(b());
  });

  it("gives a different sequence at a different size", () => {
    const a = boardRng("2026-07-30", 15, 15);
    const b = boardRng("2026-07-30", 20, 20);
    expect(a()).not.toBe(b());
  });

  it("keeps the board draw and the opening layout on separate streams", () => {
    // The client never runs the board draw, so a shared stream would leave the
    // two sides at different positions in it and the layout would not match.
    const board = boardRng("2026-07-30", 15, 15);
    const layout = layoutRng("2026-07-30", 15, 15);
    expect(board()).not.toBe(layout());
  });

  it("produces values in [0, 1)", () => {
    const rng = boardRng("2026-07-30", 25, 25);
    for (let i = 0; i < 500; i++) {
      const value = rng();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });

  it("still produces exactly these numbers", () => {
    // A canary, not a behaviour. Changing the generator would silently hand
    // every player a different board from the one their friends are playing —
    // and mid-day, a different board from the one they started. If this fails,
    // that is what happened.
    const rng = rngFor(dailySeed("2026-07-30", 15, 15));
    expect([rng(), rng(), rng()]).toEqual([
      0.04271047166548669, 0.6453401274047792, 0.16284445277415216,
    ]);
  });
});

describe("formatting", () => {
  it("writes the long form the daily block is headed with", () => {
    expect(formatDayLong("2026-07-30")).toBe("Torsdag 30. juli");
  });

  it("capitalises the weekday, which nb-NO does not", () => {
    expect(formatDayLong("2026-01-05")).toBe("Mandag 5. januar");
  });

  it("writes the short form used in the shared result", () => {
    expect(formatDayShort("2026-07-30")).toBe("30.07");
    expect(formatDayShort("2026-01-05")).toBe("05.01");
  });
});
