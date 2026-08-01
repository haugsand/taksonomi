import { afterEach, describe, expect, it, vi } from "vitest";
import { render } from "preact";
import { act } from "preact/test-utils";
import { Header } from "./Header";

let root: HTMLElement;

function mount(props: { elapsedMs?: number } = {}) {
  const onOpenMenu = vi.fn();
  root = document.createElement("div");
  document.body.appendChild(root);
  act(() => {
    render(
      <Header
        groupCount={15}
        wordsPerGroup={15}
        completedCount={3}
        tileCount={225}
        onOpenMenu={onOpenMenu}
        {...props}
      />,
      root,
    );
  });
  return { onOpenMenu };
}

const button = () => root.querySelector<HTMLButtonElement>(".header__button")!;
const clock = () => root.querySelector(".header__clock");

afterEach(() => {
  if (root) {
    render(null, root);
    root.remove();
  }
  document.body.innerHTML = "";
});

describe("Header", () => {
  it("opens the menu instead of a dropdown under itself", () => {
    // The popover this replaces listed all eight sizes in a 5rem column and
    // hand-rolled focus handling it never finished. The sheet owns that list
    // now, and <dialog> owns the focus.
    const { onOpenMenu } = mount();
    expect(button().textContent).toBe("Nytt spill");
    act(() => button().click());
    expect(onOpenMenu).toHaveBeenCalledOnce();
  });

  it("shows no clock during free play", () => {
    mount();
    expect(clock()).toBeNull();
  });

  it("shows the clock during a daily challenge", () => {
    // The clock's presence is the only thing marking the mode — free play has
    // none — so a missing clock here means the player cannot tell which game
    // they are in.
    mount({ elapsedMs: 401_000 });
    expect(clock()!.textContent).toContain("6:41");
  });

  it("names the clock for a screen reader without announcing it", () => {
    // Not a live region on purpose: a clock that speaks every second makes the
    // board unusable. It still has to be readable on demand.
    mount({ elapsedMs: 401_000 });
    expect(clock()!.querySelector(".sr-only")!.textContent).toBe("Tid: ");
    expect(clock()!.getAttribute("aria-live")).toBeNull();
  });

  it("keeps a level-1 heading in the document once the sheet is gone", () => {
    mount();
    expect(root.querySelector("h1.sr-only")!.textContent).toBe("Taksonomi");
  });
});
