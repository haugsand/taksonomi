import { afterEach, describe, expect, it, vi } from "vitest";
import { createRef, render } from "preact";
import { act } from "preact/test-utils";
import type { Category, TileData } from "@/lib/types";
import { TileGrid } from "./TileGrid";

const CATS: Category[] = [
  { name: "Dyr", words: ["hund", "katt", "hest", "ku", "sau", "geit"] },
  { name: "Farger", words: ["rød", "blå", "grønn"] },
];
const catByName = new Map(CATS.map((c) => [c.name, c]));

/** Three rows: 3 tiles, 2 tiles, 4 tiles. */
const ROWS: TileData[][] = [
  [
    { id: "a1", words: ["hund"], categoryName: "Dyr", row: 0 },
    { id: "a2", words: ["katt"], categoryName: "Dyr", row: 0 },
    { id: "a3", words: ["hest"], categoryName: "Dyr", row: 0 },
  ],
  [
    { id: "b1", words: ["rød"], categoryName: "Farger", row: 1 },
    { id: "b2", words: ["blå"], categoryName: "Farger", row: 1 },
  ],
  [
    { id: "c1", words: ["ku"], categoryName: "Dyr", row: 2 },
    { id: "c2", words: ["sau"], categoryName: "Dyr", row: 2 },
    { id: "c3", words: ["geit"], categoryName: "Dyr", row: 2 },
    { id: "c4", words: ["grønn"], categoryName: "Farger", row: 2 },
  ],
];

let root: HTMLElement;

function mount(rows: TileData[][] = ROWS, overrides: Record<string, unknown> = {}) {
  root = document.createElement("div");
  document.body.appendChild(root);
  const handlers = {
    onTileClick: vi.fn(),
    onCombine: vi.fn(),
    onClearSelection: vi.fn(),
  };
  const rerender = (nextRows: TileData[][], extra: Record<string, unknown> = {}) =>
    act(() => {
      render(
        <TileGrid
          rows={nextRows}
          catByName={catByName}
          boardRef={createRef()}
          selectedId={null}
          shakeIds={[]}
          justMergedIds={new Set()}
          fadingOutIds={new Set()}
          expandedIds={new Set()}
          enterDelays={null}
          leavingDelays={null}
          done={false}
          loading={false}
          mergedTileId={null}
          {...handlers}
          {...overrides}
          {...extra}
        />,
        root,
      );
    });
  rerender(rows);
  return { ...handlers, rerender };
}

const tiles = () => [...root.querySelectorAll<HTMLButtonElement>(".tile")];
const tileByText = (text: string) => tiles().find((t) => t.textContent?.trim() === text)!;
const tabbable = () => tiles().filter((t) => t.tabIndex === 0);
const focusedText = () => (document.activeElement as HTMLElement | null)?.textContent?.trim();

function press(key: string, init: KeyboardEventInit = {}) {
  act(() => {
    (document.activeElement ?? root).dispatchEvent(
      new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true, ...init }),
    );
  });
}

afterEach(() => {
  if (root) {
    render(null, root);
    root.remove();
  }
  document.body.innerHTML = "";
});

describe("TileGrid roving tabindex", () => {
  it("puts the whole board in the tab order exactly once", () => {
    // The regression this replaces: every tile was tabbable, so a 40 × 40 game
    // put 1600 stops between the board and the header.
    mount();
    expect(tiles()).toHaveLength(9);
    expect(tabbable()).toHaveLength(1);
  });

  it("starts with the first tile tabbable", () => {
    mount();
    expect(tabbable()[0].textContent?.trim()).toBe("hund");
  });

  it("moves the tab stop to whichever tile was last focused", () => {
    mount();
    act(() => tileByText("blå").focus());
    expect(tabbable()).toHaveLength(1);
    expect(tabbable()[0].textContent?.trim()).toBe("blå");
  });
});

describe("TileGrid arrow keys", () => {
  it("moves along a row", () => {
    mount();
    act(() => tileByText("hund").focus());
    press("ArrowRight");
    expect(focusedText()).toBe("katt");
    press("ArrowLeft");
    expect(focusedText()).toBe("hund");
  });

  it("continues into the next row at the end of one", () => {
    mount();
    act(() => tileByText("hest").focus());
    press("ArrowRight");
    expect(focusedText()).toBe("rød");
  });

  it("moves between rows", () => {
    mount();
    act(() => tileByText("rød").focus());
    press("ArrowDown");
    expect(focusedText()).toBe("ku");
    press("ArrowUp");
    expect(focusedText()).toBe("rød");
  });

  it("stays put at the board's edges", () => {
    mount();
    act(() => tileByText("hund").focus());
    press("ArrowLeft");
    expect(focusedText()).toBe("hund");
    press("ArrowUp");
    expect(focusedText()).toBe("hund");
  });

  it("jumps to the row's ends with Home and End", () => {
    mount();
    act(() => tileByText("sau").focus());
    press("End");
    expect(focusedText()).toBe("grønn");
    press("Home");
    expect(focusedText()).toBe("ku");
  });

  it("jumps to the board's ends with the modifier", () => {
    mount();
    act(() => tileByText("blå").focus());
    press("End", { ctrlKey: true });
    expect(focusedText()).toBe("grønn");
    press("Home", { ctrlKey: true });
    expect(focusedText()).toBe("hund");
  });

  it("prevents the page from scrolling on a real move", () => {
    mount();
    act(() => tileByText("hund").focus());
    const e = new KeyboardEvent("keydown", {
      key: "ArrowRight",
      bubbles: true,
      cancelable: true,
    });
    act(() => void document.activeElement!.dispatchEvent(e));
    expect(e.defaultPrevented).toBe(true);
  });

  it("leaves Tab and Enter to the browser and the button", () => {
    mount();
    act(() => tileByText("hund").focus());
    for (const key of ["Tab", "Enter", " "]) {
      const e = new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true });
      act(() => void document.activeElement!.dispatchEvent(e));
      expect(e.defaultPrevented, key).toBe(false);
    }
  });

  it("clears a half-made selection on Escape", () => {
    const { onClearSelection } = mount();
    act(() => tileByText("hund").focus());
    press("Escape");
    expect(onClearSelection).toHaveBeenCalledTimes(1);
  });
});

describe("TileGrid cursor survival", () => {
  it("settles beside the cursor when its tile leaves the board", () => {
    // Solving a category removes its tiles. Throwing focus back to the first
    // tile every time would fling a keyboard player across the board mid-game.
    const { rerender } = mount();
    act(() => tileByText("sau").focus());

    const withoutRow2Start = [ROWS[0], ROWS[1], [ROWS[2][2], ROWS[2][3]]];
    rerender(withoutRow2Start);

    expect(tabbable()).toHaveLength(1);
    expect(tabbable()[0].textContent?.trim()).toBe("grønn");
  });

  it("keeps the board reachable when a whole row empties", () => {
    const { rerender } = mount();
    act(() => tileByText("rød").focus());

    rerender([ROWS[0], [], ROWS[2]]);
    expect(tabbable()).toHaveLength(1);
  });

  it("follows a merge to the tile it produced", () => {
    // Both combined tiles vanish, so clamping to the old coordinates lands one
    // slot past the new group. The cursor should be on what the player made.
    const { rerender } = mount();
    act(() => tileByText("katt").focus());

    const merged: TileData = { id: "m1", words: ["hund", "katt"], categoryName: "Dyr", row: 0 };
    rerender([[merged, ROWS[0][2]], ROWS[1], ROWS[2]], { mergedTileId: "m1" });

    expect(tabbable()).toHaveLength(1);
    expect(tabbable()[0].textContent?.trim()).toContain("hund");
    expect(focusedText()).toContain("hund");
  });

  it("does not yank focus back to the board if the player moved on", () => {
    const { rerender } = mount();
    const outside = document.createElement("button");
    document.body.appendChild(outside);
    outside.focus();

    const merged: TileData = { id: "m1", words: ["hund", "katt"], categoryName: "Dyr", row: 0 };
    rerender([[merged, ROWS[0][2]], ROWS[1], ROWS[2]], { mergedTileId: "m1" });

    expect(document.activeElement).toBe(outside);
  });

  it("does not steal focus when tiles change without a keypress", () => {
    const { rerender } = mount();
    const outside = document.createElement("button");
    document.body.appendChild(outside);
    outside.focus();

    rerender([ROWS[0], ROWS[1], [ROWS[2][0]]]);

    expect(document.activeElement).toBe(outside);
  });
});
