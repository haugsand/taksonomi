import { describe, expect, it } from "vitest";
import { GAME_SIZES } from "../src/lib/sizes";
import { newGame } from "./newGame";

function run(query: string) {
  return newGame(new URLSearchParams(query));
}

describe("newGame", () => {
  it("serves every size the UI offers", () => {
    for (const size of GAME_SIZES) {
      const result = run(`groups=${size.groups}&words=${size.wordsPerGroup}`);
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.categories).toHaveLength(size.groups);
      for (const cat of result.categories) expect(cat.words).toHaveLength(size.wordsPerGroup);
    }
  });

  it("rejects sizes outside the offered set", () => {
    // The last one used to return the entire data set (~80 KB) after clamping.
    for (const query of [
      "groups=20&words=25", // a valid-looking pair the UI never offers
      "groups=41&words=40",
      "groups=1e9&words=1e9",
    ]) {
      expect(run(query)).toEqual({ ok: false, status: 400, error: "unsupported game size" });
    }
  });

  it("rejects missing and non-numeric parameters", () => {
    // Number(null) is 0, which passes an isFinite check — the size lookup is
    // what actually catches an absent parameter.
    for (const query of ["", "groups=15", "words=15", "groups=abc&words=abc"]) {
      expect(run(query).ok).toBe(false);
    }
  });
});
