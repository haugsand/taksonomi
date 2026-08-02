import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createRef, render } from "preact";
import { act } from "preact/test-utils";
import type { Category } from "@/lib/types";
import { CompletedBoard } from "./CompletedBoard";

const DESCRIBED: Category = {
  name: "Kjemiske grunnstoffer",
  slug: "kjemiske-grunnstoffer",
  words: ["jern", "kobber"],
};

/** No slug: descriptions have not been written for it yet. */
const PLAIN: Category = { name: "Bilmerker", words: ["Volvo", "Toyota"] };

const BUNDLE = {
  jern: "Symbol Fe, utgjør jordas kjerne og bærer oksygen i blodet.",
  kobber: "Symbol Cu, leder strøm nesten like godt som sølv.",
};

let root: HTMLElement;

function mount(categories: Category[]) {
  root = document.createElement("div");
  document.body.appendChild(root);
  act(() => {
    render(<CompletedBoard categories={categories} rowCount={1} boardRef={createRef()} />, root);
  });
}

/** Lets the fetch -> json -> setState chain run to completion. */
async function settle() {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

/** Clicks a category chip and lets the description fetch settle. */
async function open(name: string) {
  const chip = [...root.querySelectorAll("button.completed-category")].find(
    (b) => b.textContent === name,
  ) as HTMLButtonElement;
  await act(async () => {
    chip.click();
  });
  await settle();
}

function pairs(): [string, string | undefined][] {
  return [...document.querySelectorAll(".completed-category-modal__word")].map((row) => [
    row.querySelector("dt")!.textContent!,
    row.querySelector("dd")?.textContent ?? undefined,
  ]);
}

describe("CompletedBoard", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify(BUNDLE), { status: 200 })),
    );
  });

  afterEach(() => {
    act(() => render(null, root));
    root.remove();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("shows each word with its description", async () => {
    mount([DESCRIBED]);
    await open("Kjemiske grunnstoffer");

    expect(pairs()).toEqual([
      ["jern", BUNDLE.jern],
      ["kobber", BUNDLE.kobber],
    ]);
  });

  it("shows the words alone for a category with no descriptions", async () => {
    mount([PLAIN]);
    await open("Bilmerker");

    expect(pairs()).toEqual([
      ["Volvo", undefined],
      ["Toyota", undefined],
    ]);
    // A category without a slug has no bundle to ask for, so asking would be a
    // guaranteed 404 on every click.
    expect(fetch).not.toHaveBeenCalled();
  });

  it("fetches a category's descriptions at most once", async () => {
    mount([DESCRIBED]);
    // Hover primes the fetch; the click that follows must not repeat it, and
    // neither must reopening the category later.
    const chip = root.querySelector("button.completed-category") as HTMLButtonElement;
    await act(async () => {
      chip.dispatchEvent(new MouseEvent("mouseover", { bubbles: true }));
    });
    await open("Kjemiske grunnstoffer");
    await open("Kjemiske grunnstoffer");

    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("still lists the words when the descriptions fail to load", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("nope", { status: 500 })),
    );
    mount([DESCRIBED]);
    await open("Kjemiske grunnstoffer");

    expect(pairs()).toEqual([
      ["jern", undefined],
      ["kobber", undefined],
    ]);
  });
});
