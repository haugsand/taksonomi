import { useEffect, useState } from "preact/hooks";

const QUERY = "(prefers-reduced-motion: reduce)";

/**
 * Tracks the user's motion preference, live. Subscribing to `change` matters:
 * the preference is an OS setting a player can flip while the tab is open (and
 * some assistive setups toggle it mid-session), and everything downstream — the
 * JS timers as well as the CSS — reads from this one value. See `timings()` in
 * constants.ts for why the preference is resolved here rather than in CSS.
 */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(() => matchMediaSafe()?.matches ?? false);

  useEffect(() => {
    const mq = matchMediaSafe();
    if (!mq) return;
    const onChange = () => setReduced(mq.matches);
    // Re-read on subscribe: the preference can change between the initial
    // render and this effect.
    onChange();
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  return reduced;
}

/** matchMedia is missing in non-browser environments; treat that as "no
 *  preference" rather than throwing during render. */
function matchMediaSafe(): MediaQueryList | null {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return null;
  return window.matchMedia(QUERY);
}
