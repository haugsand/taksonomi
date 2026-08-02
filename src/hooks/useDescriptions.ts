import { useCallback, useRef, useState } from "preact/hooks";
import { fetchDescriptions, type Descriptions } from "@/lib/api";

/**
 * Loads word descriptions per category, on demand and at most once each.
 *
 * The shape here follows from one rule: opening a finished category must stay
 * instant. So `get` never returns a promise and never blocks — it hands back
 * whatever has arrived, and the modal renders the words with or without it.
 * `load` is fired on hover and focus as well as on the click, which is usually
 * enough for the descriptions to be there before the modal is.
 *
 * A failed fetch is swallowed: the words are the content, the descriptions are
 * a bonus, and an error message in their place would be worse than nothing.
 * Nothing caches the failure either, so the next hover simply tries again.
 */
export function useDescriptions() {
  const cache = useRef(new Map<string, Descriptions>());
  const inFlight = useRef(new Set<string>());
  // Cache lives in a ref so a load doesn't re-render every chip; this forces the
  // one re-render that matters, when new descriptions actually land.
  const [, setArrivals] = useState(0);

  const load = useCallback((slug: string | undefined) => {
    if (!slug || cache.current.has(slug) || inFlight.current.has(slug)) return;
    inFlight.current.add(slug);
    fetchDescriptions(slug).then(
      (descriptions) => {
        inFlight.current.delete(slug);
        cache.current.set(slug, descriptions);
        setArrivals((n) => n + 1);
      },
      () => {
        inFlight.current.delete(slug);
      },
    );
  }, []);

  const get = useCallback(
    (slug: string | undefined): Descriptions | undefined =>
      slug ? cache.current.get(slug) : undefined,
    [],
  );

  return { load, get };
}
