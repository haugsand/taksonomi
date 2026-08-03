import { afterEach, describe, expect, it, vi } from "vitest";
import { render } from "preact";
import { act } from "preact/test-utils";
import type { TileData } from "@/lib/types";
import { Tile } from "./Tile";

const CATEGORY = "Kjemiske grunnstoffer";

let root: HTMLElement;

function mount(tile: Partial<TileData>, props: Record<string, unknown> = {}) {
  root = document.createElement("div");
  document.body.appendChild(root);
  const full: TileData = {
    id: `${CATEGORY}::hydrogen`,
    words: ["hydrogen"],
    categoryName: CATEGORY,
    ...tile,
  };
  act(() => {
    render(
      <Tile
        tile={full}
        categoryName={CATEGORY}
        categorySize={15}
        isSelected={false}
        isShaking={false}
        isMerged={false}
        isDragging={false}
        isDragOver={false}
        disabled={false}
        onClick={() => {}}
        onDragStart={() => {}}
        onDragEnd={() => {}}
        onDragOver={() => {}}
        onDragLeave={() => {}}
        onDrop={() => {}}
        {...props}
      />,
      root,
    );
  });
  return root.querySelector("button")!;
}

afterEach(() => {
  if (root) {
    render(null, root);
    root.remove();
  }
});

describe("Tile accessibility", () => {
  it("exposes selection as a toggle state", () => {
    expect(mount({}, { isSelected: true }).getAttribute("aria-pressed")).toBe("true");
    expect(mount({}, { isSelected: false }).getAttribute("aria-pressed")).toBe("false");
  });

  it("drops aria-pressed on a solved tile, which is no longer selectable", () => {
    const el = mount({ words: ["a", "b"] }, { categorySize: 2 });
    expect(el.hasAttribute("aria-pressed")).toBe(false);
  });

  it("labels a group tile instead of reading the '3/15' badge", () => {
    const el = mount({ words: ["hydrogen", "helium", "litium"] });
    expect(el.getAttribute("aria-label")).toBe("hydrogen, helium, litium. Gruppe med 3 av 15 ord.");
  });

  it("names the category only once the tile is solved", () => {
    const solved = mount({ words: ["a", "b"] }, { categorySize: 2 });
    expect(solved.getAttribute("aria-label")).toContain(CATEGORY);
  });
});

describe("Tile spoiler safety", () => {
  it("keeps the category name out of the markup while unsolved", () => {
    // tile.id is `${categoryName}::${word}` and used to be rendered as
    // data-tile-id, read by nothing — which handed every answer to anyone who
    // opened devtools. The same reasoning bars it from aria-label.
    const el = mount({ words: ["hydrogen", "helium"] });
    expect(el.outerHTML).not.toContain(CATEGORY);
  });

  it("does not render the tile id anywhere", () => {
    const el = mount({});
    expect(el.hasAttribute("data-tile-id")).toBe(false);
  });
});

describe("Tile behaviour", () => {
  it("still fires onClick", () => {
    const onClick = vi.fn();
    const el = mount({}, { onClick });
    act(() => el.click());
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("is draggable while in play but not once solved or disabled", () => {
    // Preact omits the attribute entirely for `draggable={false}`, so presence
    // is the assertion, not the string value.
    expect(mount({}).hasAttribute("draggable")).toBe(true);
    expect(mount({ words: ["a", "b"] }, { categorySize: 2 }).hasAttribute("draggable")).toBe(false);
    expect(mount({}, { disabled: true }).hasAttribute("draggable")).toBe(false);
  });
});
