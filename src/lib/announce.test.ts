import { describe, expect, it } from "vitest";
import { MISMATCH, categoryCompleted, completedTileLabel, merged, tileLabel } from "./announce";

const CATEGORY = "Kjemiske grunnstoffer";

describe("announce", () => {
  it("states the group's progress after a merge", () => {
    expect(merged(3, 15)).toBe("Slått sammen. Gruppen har nå 3 av 15 ord.");
  });

  it("states both the category and the overall progress on completion", () => {
    expect(categoryCompleted(CATEGORY, 4, 15)).toBe(
      `Kategorien ${CATEGORY} er fullført. 4 av 15 kategorier.`,
    );
  });

  it("has a mismatch message at all", () => {
    // Under reduced motion the shake is replaced by a colour flash, and for a
    // screen-reader user neither exists — this string is the only signal.
    expect(MISMATCH.length).toBeGreaterThan(0);
  });
});

describe("tileLabel", () => {
  it("leaves a single word to its own visible text", () => {
    expect(tileLabel(["hydrogen"], 15, false)).toBeNull();
  });

  it("spells out a group's progress instead of the '3/15' badge", () => {
    expect(tileLabel(["hydrogen", "helium", "litium"], 15, false)).toBe(
      "hydrogen, helium, litium. Gruppe med 3 av 15 ord.",
    );
  });

  it("never leaks the category of an unsolved tile", () => {
    // The whole point: a label that named the category would hand a
    // screen-reader user the answer the sighted player has to work out.
    const label = tileLabel(["hydrogen", "helium"], 15, false);
    expect(label).not.toContain(CATEGORY);
  });

  it("defers to completedTileLabel once solved", () => {
    expect(tileLabel(["hydrogen", "helium"], 2, true)).toBeNull();
  });
});

describe("completedTileLabel", () => {
  it("may name the category, because the player already found it", () => {
    expect(completedTileLabel(CATEGORY, ["hydrogen", "helium"])).toBe(
      `${CATEGORY}, fullført: hydrogen, helium.`,
    );
  });
});
