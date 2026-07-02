import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "preact/hooks";
import type { RefObject } from "preact";
import { measureRowCount } from "@/lib/layout";

/**
 * Tracks how many tile rows fit in the board. By design the row count is only
 * recomputed when a new game starts (via `deps`) and when the screen
 * orientation changes — deliberately NOT on ordinary viewport resizes (mobile
 * URL-bar show/hide, on-screen keyboard, window drags), so tiles don't reflow
 * out from under the player while a game is in progress.
 */
export function useRowCount(deps: unknown[]): {
  boardRef: RefObject<HTMLDivElement>;
  rowCount: number;
} {
  const boardRef = useRef<HTMLDivElement>(null);
  const [rowCount, setRowCount] = useState(10);

  const recompute = useCallback(() => {
    const el = boardRef.current;
    if (el) setRowCount(measureRowCount(el));
  }, []);

  useLayoutEffect(() => {
    recompute();
    // Belt-and-braces for orientation changes: some mobile browsers report
    // stale innerHeight/visualViewport dimensions for a moment right after
    // rotation, so re-measure again shortly after the change settles.
    const onOrientationChange = () => setTimeout(recompute, 100);
    window.addEventListener("orientationchange", onOrientationChange);
    return () => {
      window.removeEventListener("orientationchange", onOrientationChange);
    };
  }, [recompute]);

  useEffect(() => {
    // Recompute after tiles render so we can measure the actual row height.
    // Driven by `deps`, which change on a new game (never on viewport resize).
    const id = requestAnimationFrame(recompute);
    return () => cancelAnimationFrame(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { boardRef, rowCount };
}
