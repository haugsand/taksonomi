import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { h, render } from "preact";
import { act } from "preact/test-utils";
import { useTileCompletion } from "./useTileCompletion";
import { timings } from "@/lib/constants";

type Api = ReturnType<typeof useTileCompletion>;

function mount(reducedMotion: boolean) {
  const onHide = vi.fn();
  const onFinal = vi.fn();
  const root = document.createElement("div");
  let api!: Api;
  const Probe = () => {
    api = useTileCompletion({ onHide, onFinal, timings: timings(reducedMotion) });
    return null;
  };
  act(() => {
    render(h(Probe, {}), root);
  });
  return {
    onHide,
    onFinal,
    get api() {
      return api;
    },
    unmount: () => render(null, root),
  };
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe("useTileCompletion", () => {
  it("holds the completed tile for the full fade, then hides it", () => {
    const c = mount(false);
    act(() => c.api.completeCategory("cat-1", false));

    expect(c.api.fadingOutIds.has("cat-1")).toBe(true);
    expect(c.onHide).not.toHaveBeenCalled();

    act(() => void vi.advanceTimersByTime(timings(false).fadeout - 1));
    expect(c.onHide).not.toHaveBeenCalled();

    act(() => void vi.advanceTimersByTime(1));
    expect(c.onHide).toHaveBeenCalledWith("cat-1");
    expect(c.api.fadingOutIds.has("cat-1")).toBe(false);
  });

  it("fires onFinal only for the last category", () => {
    const c = mount(false);
    act(() => c.api.completeCategory("cat-1", false));
    act(() => void vi.advanceTimersByTime(timings(false).fadeout));
    expect(c.onFinal).not.toHaveBeenCalled();

    act(() => c.api.completeCategory("cat-2", true));
    act(() => void vi.advanceTimersByTime(timings(false).fadeout));
    expect(c.onFinal).toHaveBeenCalledTimes(1);
  });

  it("does not strand the player for 3s under reduced motion", () => {
    // The regression: the JS waited the full-motion fade regardless of the
    // preference, so the tile vanished instantly (CSS) and the board then sat
    // frozen for three seconds — and the win modal was three seconds late.
    const c = mount(true);
    act(() => c.api.completeCategory("cat-1", true));

    act(() => void vi.advanceTimersByTime(timings(true).fadeout));
    expect(c.onHide).toHaveBeenCalledWith("cat-1");
    expect(c.onFinal).toHaveBeenCalledTimes(1);

    // Well short of the full-motion duration, which is what used to be waited.
    expect(timings(true).fadeout).toBeLessThan(timings(false).fadeout);
  });

  it("runs several categories completing at once as independent sequences", () => {
    const c = mount(false);
    const { fadeout } = timings(false);

    act(() => c.api.completeCategory("cat-1", false));
    act(() => void vi.advanceTimersByTime(fadeout / 2));
    act(() => c.api.completeCategory("cat-2", false));

    expect(c.api.fadingOutIds.has("cat-1")).toBe(true);
    expect(c.api.fadingOutIds.has("cat-2")).toBe(true);

    act(() => void vi.advanceTimersByTime(fadeout / 2));
    expect(c.onHide).toHaveBeenCalledWith("cat-1");
    expect(c.api.fadingOutIds.has("cat-2")).toBe(true);

    act(() => void vi.advanceTimersByTime(fadeout / 2));
    expect(c.onHide).toHaveBeenCalledWith("cat-2");
  });

  it("clears the merge pop after the pop duration", () => {
    const c = mount(false);
    act(() => c.api.popMerged("m1"));
    expect(c.api.justMergedIds.has("m1")).toBe(true);

    act(() => void vi.advanceTimersByTime(timings(false).pop));
    expect(c.api.justMergedIds.has("m1")).toBe(false);
  });

  it("reset() drops all in-flight animation state", () => {
    const c = mount(false);
    act(() => c.api.popMerged("m1"));
    act(() => c.api.completeCategory("cat-1", false));

    act(() => c.api.reset());
    expect(c.api.justMergedIds.size).toBe(0);
    expect(c.api.fadingOutIds.size).toBe(0);
  });
});
