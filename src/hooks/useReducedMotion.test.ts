import { afterEach, describe, expect, it, vi } from "vitest";
import { render } from "preact";
import { act } from "preact/test-utils";
import { h } from "preact";
import { useReducedMotion } from "./useReducedMotion";

/** A controllable stand-in for MediaQueryList. happy-dom ships matchMedia, but
 *  nothing can flip the OS preference from a test, and the live-update
 *  behaviour is the whole point of the hook. */
function stubMatchMedia(initial: boolean) {
  const listeners = new Set<() => void>();
  const mq = {
    matches: initial,
    addEventListener: (_: string, fn: () => void) => listeners.add(fn),
    removeEventListener: (_: string, fn: () => void) => listeners.delete(fn),
  };
  const spy = vi.fn(() => mq as unknown as MediaQueryList);
  vi.stubGlobal("matchMedia", spy);
  Object.defineProperty(window, "matchMedia", { value: spy, configurable: true, writable: true });
  return {
    spy,
    set(next: boolean) {
      mq.matches = next;
      for (const fn of listeners) fn();
    },
    get listenerCount() {
      return listeners.size;
    },
  };
}

function renderHook(root: HTMLElement): () => boolean {
  let latest = false;
  const Probe = () => {
    latest = useReducedMotion();
    return null;
  };
  act(() => {
    render(h(Probe, {}), root);
  });
  return () => latest;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("useReducedMotion", () => {
  it("reports the preference at first render", () => {
    stubMatchMedia(true);
    const root = document.createElement("div");
    expect(renderHook(root)()).toBe(true);
  });

  it("reports false when the preference is not set", () => {
    stubMatchMedia(false);
    const root = document.createElement("div");
    expect(renderHook(root)()).toBe(false);
  });

  it("follows a change made while the tab is open", () => {
    const mq = stubMatchMedia(false);
    const root = document.createElement("div");
    const value = renderHook(root);
    expect(value()).toBe(false);

    act(() => mq.set(true));
    expect(value()).toBe(true);

    act(() => mq.set(false));
    expect(value()).toBe(false);
  });

  it("unsubscribes on unmount", () => {
    const mq = stubMatchMedia(false);
    const root = document.createElement("div");
    renderHook(root);
    expect(mq.listenerCount).toBe(1);

    act(() => render(null, root));
    expect(mq.listenerCount).toBe(0);
  });

  it("treats a missing matchMedia as no preference rather than throwing", () => {
    Object.defineProperty(window, "matchMedia", {
      value: undefined,
      configurable: true,
      writable: true,
    });
    const root = document.createElement("div");
    expect(() => renderHook(root)).not.toThrow();
    expect(renderHook(root)()).toBe(false);
  });
});
