import { afterEach, describe, expect, it, vi } from "vitest";
import { render } from "preact";
import { act } from "preact/test-utils";
import { GAME_SIZES } from "@/lib/sizes";
import { Header } from "./Header";

let root: HTMLElement;

function mount(onNewGame = vi.fn()) {
  root = document.createElement("div");
  document.body.appendChild(root);
  act(() => {
    render(
      <Header
        groupCount={15}
        wordsPerGroup={15}
        completedCount={0}
        tileCount={225}
        theme="light"
        onThemeChange={() => {}}
        onNewGame={onNewGame}
      />,
      root,
    );
  });
  return { onNewGame };
}

const trigger = () => root.querySelector<HTMLButtonElement>(".header__button")!;
const menu = () => root.querySelector(".header__menu");
const items = () => [...root.querySelectorAll<HTMLButtonElement>(".header__menu-item")];

afterEach(() => {
  if (root) {
    render(null, root);
    root.remove();
  }
  document.body.innerHTML = "";
});

describe("Header size popover", () => {
  it("starts closed and reports that on the trigger", () => {
    mount();
    expect(menu()).toBeNull();
    expect(trigger().getAttribute("aria-expanded")).toBe("false");
  });

  it("opens on click and offers every size", () => {
    mount();
    act(() => trigger().click());
    expect(trigger().getAttribute("aria-expanded")).toBe("true");
    expect(items()).toHaveLength(GAME_SIZES.length);
  });

  it("does not claim ARIA menu semantics it has not implemented", () => {
    // role="menu"/"menuitem" obliges arrow-key navigation, Home/End and
    // typeahead. This is a plain button group, so it must not say otherwise —
    // a screen reader would tell the user to use arrow keys that do nothing.
    mount();
    act(() => trigger().click());
    expect(menu()!.getAttribute("role")).toBeNull();
    expect(items().every((b) => !b.hasAttribute("role"))).toBe(true);
    expect(trigger().hasAttribute("aria-haspopup")).toBe(false);
  });

  it("starts the chosen size and closes", () => {
    const { onNewGame } = mount();
    act(() => trigger().click());
    act(() => items()[2].click());
    expect(onNewGame).toHaveBeenCalledWith(GAME_SIZES[2]);
    expect(menu()).toBeNull();
  });

  it("closes on Escape and hands focus back to the trigger", () => {
    mount();
    act(() => trigger().click());
    act(() => items()[0].focus());

    act(() => {
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    });

    expect(menu()).toBeNull();
    expect(document.activeElement).toBe(trigger());
  });

  it("closes when focus leaves it entirely", () => {
    // Tabbing past the last item used to leave the popover open behind the
    // page: the old handler listened for mousedown only, which never fires for
    // a keyboard user.
    mount();
    const outside = document.createElement("button");
    document.body.appendChild(outside);

    act(() => trigger().click());
    act(() => items()[0].focus());
    act(() => {
      items()[0].dispatchEvent(
        new FocusEvent("focusout", { bubbles: true, relatedTarget: outside }),
      );
    });

    expect(menu()).toBeNull();
  });

  it("stays open while focus moves between its own items", () => {
    mount();
    act(() => trigger().click());
    act(() => {
      items()[0].dispatchEvent(
        new FocusEvent("focusout", { bubbles: true, relatedTarget: items()[1] }),
      );
    });
    expect(menu()).not.toBeNull();
  });
});
