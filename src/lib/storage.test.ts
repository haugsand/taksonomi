import { beforeEach, describe, expect, it } from "vitest";
import {
  DEFAULT_SIZE,
  clearGameState,
  loadGameState,
  loadSize,
  saveGameState,
  saveSize,
  type GameState,
} from "./storage";

beforeEach(() => localStorage.clear());

describe("size", () => {
  it("returns the default when nothing is stored", () => {
    expect(loadSize()).toEqual(DEFAULT_SIZE);
  });

  it("round-trips a saved size", () => {
    saveSize({ groups: 20, wordsPerGroup: 25 });
    expect(loadSize()).toEqual({ groups: 20, wordsPerGroup: 25 });
  });

  it("falls back to the default for malformed data", () => {
    localStorage.setItem("taksonomi:size:v1", "{not json");
    expect(loadSize()).toEqual(DEFAULT_SIZE);
  });

  it("falls back to the default for the wrong shape", () => {
    localStorage.setItem("taksonomi:size:v1", JSON.stringify({ groups: "a" }));
    expect(loadSize()).toEqual(DEFAULT_SIZE);
  });
});

describe("game state", () => {
  const state: GameState = {
    groups: 2,
    wordsPerGroup: 2,
    activeCategories: [
      { name: "a", words: ["a1", "a2"] },
      { name: "b", words: ["b1", "b2"] },
    ],
    tiles: [{ id: "t", words: ["a1"], categoryName: "a" }],
  };

  it("round-trips when the size matches", () => {
    saveGameState(state);
    expect(loadGameState({ groups: 2, wordsPerGroup: 2 })).toEqual(state);
  });

  it("returns null when the requested size differs", () => {
    saveGameState(state);
    expect(loadGameState({ groups: 3, wordsPerGroup: 2 })).toBeNull();
    expect(loadGameState({ groups: 2, wordsPerGroup: 5 })).toBeNull();
  });

  it("returns null when nothing is saved", () => {
    expect(loadGameState({ groups: 2, wordsPerGroup: 2 })).toBeNull();
  });

  it("clears a saved game", () => {
    saveGameState(state);
    clearGameState();
    expect(loadGameState({ groups: 2, wordsPerGroup: 2 })).toBeNull();
  });
});
