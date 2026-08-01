import { beforeEach, describe, expect, it } from "vitest";
import { clearGame, loadGame, migrateLegacyStorage, saveGame, type SavedGame } from "./storage";
import { IDLE_TIMER } from "./timer";

beforeEach(() => localStorage.clear());

const KEY = "taksonomi:state:v4";

const free: SavedGame = {
  mode: "free",
  groups: 2,
  wordsPerGroup: 2,
  activeCategories: [
    { name: "A", words: ["a1", "a2"] },
    { name: "B", words: ["b1", "b2"] },
  ],
  tiles: [{ id: "A::a1", words: ["a1"], categoryName: "A" }],
};

const daily: SavedGame = {
  ...free,
  mode: "daily",
  date: "2026-07-30",
  timer: { accumulatedMs: 4000, runningSince: null },
};

describe("saved game", () => {
  it("returns null when nothing is stored", () => {
    expect(loadGame()).toBeNull();
  });

  it("round-trips a free game", () => {
    saveGame(free);
    expect(loadGame()).toEqual(free);
  });

  it("round-trips a daily game with its date and clock", () => {
    saveGame(daily);
    expect(loadGame()).toEqual(daily);
  });

  it("clears", () => {
    saveGame(free);
    clearGame();
    expect(loadGame()).toBeNull();
  });

  it("banks a running clock before writing, so a closed tab costs nothing", () => {
    // Storing runningSince as-is would count every minute the tab spent shut:
    // reopening tomorrow would show an hours-long run. What lands in storage is
    // always paused, holding only time that was actually played.
    const running = { ...daily, timer: { accumulatedMs: 1000, runningSince: Date.now() - 5000 } };
    saveGame(running);

    const loaded = loadGame();
    expect(loaded?.timer?.runningSince).toBeNull();
    expect(loaded?.timer?.accumulatedMs).toBeGreaterThanOrEqual(6000);
  });

  describe("rejects anything the board could not render", () => {
    it("drops malformed JSON", () => {
      localStorage.setItem(KEY, "{not json");
      expect(loadGame()).toBeNull();
      expect(localStorage.getItem(KEY)).toBeNull();
    });

    it("drops an unknown mode", () => {
      localStorage.setItem(KEY, JSON.stringify({ ...free, mode: "weekly" }));
      expect(loadGame()).toBeNull();
    });

    it("drops a daily game missing its date", () => {
      const { date: _date, ...noDate } = daily;
      localStorage.setItem(KEY, JSON.stringify(noDate));
      expect(loadGame()).toBeNull();
    });

    it("drops a daily game missing its clock", () => {
      const { timer: _timer, ...noTimer } = daily;
      localStorage.setItem(KEY, JSON.stringify(noTimer));
      expect(loadGame()).toBeNull();
    });

    it("drops a tile that is missing fields Tile.tsx reads", () => {
      localStorage.setItem(KEY, JSON.stringify({ ...free, tiles: [{ id: "x" }] }));
      expect(loadGame()).toBeNull();
    });

    it("never throws, whatever is in there", () => {
      for (const raw of ["null", "[]", '"a string"', "42", JSON.stringify({ mode: "free" })]) {
        localStorage.setItem(KEY, raw);
        expect(() => loadGame()).not.toThrow();
        expect(loadGame()).toBeNull();
      }
    });
  });

  it("accepts a daily game whose clock has never been started", () => {
    saveGame({ ...daily, timer: IDLE_TIMER });
    expect(loadGame()?.timer).toEqual(IDLE_TIMER);
  });
});

describe("migration from before the daily challenge", () => {
  const V3 = "taksonomi:state:v3";
  const V1_SIZE = "taksonomi:size:v1";

  /** The shape as it was: no mode, no date, no clock. */
  const legacy = {
    groups: 2,
    wordsPerGroup: 2,
    activeCategories: free.activeCategories,
    tiles: free.tiles,
  };

  it("carries an unfinished game over as a free game", () => {
    // Every game from before the upgrade predates the daily challenge, so
    // there is only one mode it can have been.
    localStorage.setItem(V3, JSON.stringify(legacy));
    migrateLegacyStorage();

    expect(loadGame()).toEqual({ ...legacy, mode: "free" });
    expect(localStorage.getItem(V3)).toBeNull();
  });

  it("runs from loadGame, so it cannot be skipped by forgetting to call it", () => {
    localStorage.setItem(V3, JSON.stringify(legacy));
    expect(loadGame()?.mode).toBe("free");
  });

  it("keeps a newer game and discards the old one", () => {
    // Someone who has already played since the upgrade has a current game;
    // reviving a months-old board over it would be worse than losing it.
    saveGame(daily);
    localStorage.setItem(V3, JSON.stringify(legacy));
    migrateLegacyStorage();

    expect(loadGame()).toEqual(daily);
    expect(localStorage.getItem(V3)).toBeNull();
  });

  it("discards a malformed old game without writing anything", () => {
    localStorage.setItem(V3, "{not json");
    migrateLegacyStorage();

    expect(loadGame()).toBeNull();
    expect(localStorage.getItem(V3)).toBeNull();
  });

  it("removes the remembered size, which nothing reads any more", () => {
    localStorage.setItem(V1_SIZE, JSON.stringify({ groups: 25, wordsPerGroup: 25 }));
    migrateLegacyStorage();
    expect(localStorage.getItem(V1_SIZE)).toBeNull();
  });

  it("does nothing when there is nothing left behind", () => {
    saveGame(free);
    migrateLegacyStorage();
    expect(loadGame()).toEqual(free);
  });

  it("is safe to run repeatedly", () => {
    localStorage.setItem(V3, JSON.stringify(legacy));
    migrateLegacyStorage();
    migrateLegacyStorage();
    expect(loadGame()).toEqual({ ...legacy, mode: "free" });
  });

  it("never throws, whatever the old entry holds", () => {
    for (const raw of ["null", "[]", "42", '"x"', JSON.stringify({ groups: "two" })]) {
      localStorage.setItem(V3, raw);
      expect(() => migrateLegacyStorage()).not.toThrow();
    }
  });
});
