import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render } from "preact";
import { act } from "preact/test-utils";
import { STATE_KEY } from "@/lib/constants";
import { ErrorBoundary } from "./ErrorBoundary";

let root: HTMLElement;
let shouldThrow = true;

function Boom() {
  if (shouldThrow) throw new Error("brettet eksploderte");
  return <p>brettet</p>;
}

function mount() {
  root = document.createElement("div");
  document.body.appendChild(root);
  act(() => {
    render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>,
      root,
    );
  });
}

const buttonWith = (text: string) =>
  [...root.querySelectorAll("button")].find((b) => b.textContent?.includes(text));

beforeEach(() => {
  shouldThrow = true;
  localStorage.clear();
  // The boundary logs the error on purpose; keep the test output readable.
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
  if (root) {
    render(null, root);
    root.remove();
  }
});

describe("ErrorBoundary", () => {
  it("renders children while nothing is wrong", () => {
    shouldThrow = false;
    mount();
    expect(root.textContent).toContain("brettet");
  });

  it("shows a recovery screen instead of a blank page when a child throws", () => {
    mount();
    expect(root.querySelector('[role="alert"]')).not.toBeNull();
    expect(root.textContent).toContain("Noe gikk galt");
    expect(buttonWith("Prøv igjen")).toBeDefined();
    expect(buttonWith("Start på nytt")).toBeDefined();
  });

  it("logs the original error so a bug report has something to go on", () => {
    mount();
    expect(console.error).toHaveBeenCalled();
    const logged = vi.mocked(console.error).mock.calls[0];
    expect(String(logged)).toContain("brettet eksploderte");
  });

  it("re-renders the children when 'Prøv igjen' is pressed", () => {
    mount();
    shouldThrow = false;
    act(() => buttonWith("Prøv igjen")!.click());
    expect(root.textContent).toContain("brettet");
  });

  it("clears the saved game before reloading on 'Start på nytt'", () => {
    // The poison-pill case: a stored state that throws on restore would throw
    // again on every reload, so the escape hatch has to remove it. It must not
    // route through the crashed tree to do so.
    localStorage.setItem(STATE_KEY, '{"gift":true}');
    const reload = vi.fn();
    vi.spyOn(window, "location", "get").mockReturnValue({
      ...window.location,
      reload,
    } as unknown as Location);

    mount();
    act(() => buttonWith("Start på nytt")!.click());

    expect(localStorage.getItem(STATE_KEY)).toBeNull();
    expect(reload).toHaveBeenCalledTimes(1);
  });
});
