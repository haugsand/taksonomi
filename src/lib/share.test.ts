import { describe, expect, it } from "vitest";
import { shareText } from "./share";

describe("shareText", () => {
  it("reads as the result of a specific board on a specific day", () => {
    expect(shareText(15, 15, "2026-07-30", 401_000)).toBe(
      "Taksonomi 15×15 · 30.07\n⏱ 6:41\ntaksonomi.app",
    );
  });

  it("cannot leak the board, because it is never given it", () => {
    // The signature is the safeguard: no categories and no words are in scope
    // here, so no future edit can put one in the text by accident. Whoever
    // shares first would otherwise spoil the day for everyone reading.
    const text = shareText(40, 40, "2026-07-30", 3_852_000);
    expect(text).toBe("Taksonomi 40×40 · 30.07\n⏱ 1:04:12\ntaksonomi.app");
    expect(shareText.length).toBe(4);
  });
});
