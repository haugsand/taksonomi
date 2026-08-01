import { beforeEach, describe, expect, it } from "vitest";
import { clearGame, loadGame, saveGame, type SavedGame } from "./storage";
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
