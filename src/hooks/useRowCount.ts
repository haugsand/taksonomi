import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "preact/hooks";
import type { RefObject } from "preact";
import { measureRowCount } from "@/lib/layout";

/**
 * Tracks how many tile rows fit in the board, recomputing on resize and
 * whenever `deps` change (e.g. after new tiles render and can be measured).
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
    window.addEventListener("resize", recompute);
    window.visualViewport?.addEventListener("resize", recompute);
    return () => {
      window.removeEventListener("resize", recompute);
      window.visualViewport?.removeEventListener("resize", recompute);
    };
  }, [recompute]);

  useEffect(() => {
    // Recompute after tiles render so we can measure the actual row height.
    const id = requestAnimationFrame(recompute);
    return () => cancelAnimationFrame(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { boardRef, rowCount };
}
