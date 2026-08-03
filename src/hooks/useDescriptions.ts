import { useCallback, useEffect, useState } from "preact/hooks";
import { fetchDescriptions, type Descriptions } from "@/lib/api";

/**
 * Word descriptions, fetched per category and kept for the rest of the session.
 *
 * The store is module-level rather than hook-local because the fetch and the
 * read happen in two components that never exist at the same time: Game primes
 * a category the moment it is solved, CompletedBoard reads it after the last
 * one falls. A cache owned by CompletedBoard would be created exactly when it
 * has stopped being useful.
 *
 * Descriptions are immutable static files keyed by a globally unique slug, so
 * one shared map is the whole of the cache invalidation story.
 */
const cache = new Map<string, Descriptions>();
const inFlight = new Set<string>();
const subscribers = new Set<() => void>();

/**
 * Starts loading one category's descriptions, at most once per slug.
 *
 * Safe to call the instant a category is solved. The player has just seen every
 * word in it, so the request reveals nothing they do not already have — and it
 * buys the whole rest of the game as head start, instead of racing a modal that
 * is already opening. A missing slug is a no-op, so callers need not check.
 */
export function prefetchDescriptions(slug: string | undefined): void {
  if (!slug || cache.has(slug) || inFlight.has(slug)) return;
  inFlight.add(slug);
  fetchDescriptions(slug).then(
    (descriptions) => {
      inFlight.delete(slug);
      cache.set(slug, descriptions);
      for (const notify of subscribers) notify();
    },
    () => {
      // Swallowed on purpose: the words are the content and the descriptions a
      // bonus, so an error message in their place would be worse than nothing.
      // The failure is not cached either, so a later hover simply tries again.
      inFlight.delete(slug);
    },
  );
}

/** Drops everything. Only for tests, which must not inherit each other's cache. */
export function resetDescriptions(): void {
  cache.clear();
  inFlight.clear();
}

/**
 * Reads the cache, and re-renders when a late arrival lands.
 *
 * `get` never returns a promise and never blocks: opening a finished category
 * must stay instant, so the modal renders the words with or without their
 * descriptions. After the prefetch above they are normally already here.
 */
export function useDescriptions() {
  // The cache is a plain module map, so nothing about writing to it would
  // re-render this component. This subscription is what forces the one render
  // that matters, when descriptions arrive while the modal is already open.
  const [, setArrivals] = useState(0);
  useEffect(() => {
    const notify = () => setArrivals((n) => n + 1);
    subscribers.add(notify);
    return () => {
      subscribers.delete(notify);
    };
  }, []);

  const get = useCallback(
    (slug: string | undefined): Descriptions | undefined => (slug ? cache.get(slug) : undefined),
    [],
  );

  return { load: prefetchDescriptions, get };
}
