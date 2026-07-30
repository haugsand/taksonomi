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
    saveSize({ groups: 25, wordsPerGroup: 25 });
    expect(loadSize()).toEqual({ groups: 25, wordsPerGroup: 25 });
  });

  it("falls back to the default for malformed data", () => {
    localStorage.setItem("taksonomi:size:v1", "{not json");
    expect(loadSize()).toEqual(DEFAULT_SIZE);
  });

  it("falls back to the default for the wrong shape", () => {
    localStorage.setItem("taksonomi:size:v1", JSON.stringify({ groups: "a" }));
    expect(loadSize()).toEqual(DEFAULT_SIZE);
  });

  it("falls back to the default for a size the UI does not offer", () => {
    // The API only accepts GAME_SIZES, so restoring 20x25 would leave the game
    // stuck on an error it could never retry out of.
    localStorage.setItem("taksonomi:size:v1", JSON.stringify({ groups: 20, wordsPerGroup: 25 }));
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

  it("keeps a game of another size so switching back restores it", () => {
    saveGameState(state);
    expect(loadGameState({ groups: 3, wordsPerGroup: 2 })).toBeNull();
    expect(loadGameState({ groups: 2, wordsPerGroup: 2 })).toEqual(state);
  });

  it("rejects and discards a malformed state instead of returning it", () => {
    // Each of these renders fine in the old shape check but throws in Tile.tsx,
    // and would keep throwing on every reload while it stayed in storage.
    const malformed = [
      { ...state, tiles: [{ id: "t", categoryName: "a" }] }, // no words
      { ...state, tiles: [{ id: "t", categoryName: "a", words: "a1" }] }, // words not an array
      { ...state, tiles: [{ id: "t", categoryName: "a", words: [1, 2] }] }, // words not strings
      { ...state, tiles: [null] },
      { ...state, activeCategories: [{ name: "a" }, { name: "b" }] }, // no words
      { ...state, activeCategories: "nope" },
      "{not json",
    ];

    for (const bad of malformed) {
      localStorage.setItem(
        "taksonomi:state:v3",
        typeof bad === "string" ? bad : JSON.stringify(bad),
      );
      expect(loadGameState({ groups: 2, wordsPerGroup: 2 })).toBeNull();
      expect(localStorage.getItem("taksonomi:state:v3")).toBeNull();
    }
  });

  it("survives a storage backend that throws on read", () => {
    // A restore that throws is the one failure a player cannot escape: the same
    // value is read again on every reload, so the game stays dead. Safari in
    // private mode and a disabled-storage profile both throw from getItem.
    const getItem = localStorage.getItem.bind(localStorage);
    localStorage.getItem = () => {
      throw new Error("storage exploded mid-read");
    };

    try {
      expect(() => loadGameState({ groups: 2, wordsPerGroup: 2 })).not.toThrow();
      expect(loadGameState({ groups: 2, wordsPerGroup: 2 })).toBeNull();
    } finally {
      localStorage.getItem = getItem;
    }
  });
});
