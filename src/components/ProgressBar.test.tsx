import { afterEach, describe, expect, it } from "vitest";
import { render } from "preact";
import { act } from "preact/test-utils";
import { ProgressBar } from "./ProgressBar";

let root: HTMLElement;

function mount(tileCount: number, groupCount = 15, wordsPerGroup = 15) {
  root = document.createElement("div");
  document.body.appendChild(root);
  act(() => {
    render(
      <ProgressBar tileCount={tileCount} groupCount={groupCount} wordsPerGroup={wordsPerGroup} />,
      root,
    );
  });
  return root.querySelector<HTMLElement>('[role="progressbar"]');
}

const value = (el: HTMLElement | null) => Number(el?.getAttribute("aria-valuenow"));

afterEach(() => {
  if (root) {
    render(null, root);
    root.remove();
  }
});

describe("ProgressBar", () => {
  it("renders nothing when there is no game", () => {
    // The regression: with tileCount 0 the ratio was (max - 0) / (max - min),
    // which is greater than 1 and clamped to 100 — a full green bar sitting
    // behind the start modal claiming the game was already won.
    expect(mount(0)).toBeNull();
    expect(root.textContent).toBe("");
  });

  it("is empty at the start of a game", () => {
    expect(value(mount(225))).toBe(0);
  });

  it("is full when every category is a single tile", () => {
    expect(value(mount(15))).toBe(100);
  });

  it("moves monotonically as tiles merge away", () => {
    const seen = [225, 180, 120, 60, 15].map((n) => value(mount(n)));
    for (let i = 1; i < seen.length; i++) {
      expect(seen[i]).toBeGreaterThan(seen[i - 1]);
    }
  });

  it("has an accessible name distinct from the header's category count", () => {
    expect(mount(100)?.getAttribute("aria-label")).toBe("Ord slått sammen");
  });

  it("stays within bounds if the tile count is somehow out of range", () => {
    expect(value(mount(1))).toBe(100);
    expect(value(mount(999))).toBe(0);
  });

  it("survives a one-word-per-group board without dividing by zero", () => {
    expect(value(mount(5, 5, 1))).toBe(0);
  });
});
