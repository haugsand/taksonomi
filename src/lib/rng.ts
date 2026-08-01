/**
 * Deterministic pseudo-random numbers, seeded by a string.
 *
 * The daily challenge lives or dies on this: the same seed has to produce the
 * same sequence in the Worker, in the Vite dev middleware and in every player's
 * browser. xmur3 and mulberry32 are 32-bit integer arithmetic only — Math.imul,
 * shifts and xor — so there is no floating-point rounding that could drift
 * between JS engines. The single division at the end is by a power of two,
 * which is exact.
 */

/** Hashes a string down to a 32-bit seed (xmur3, finalised). */
function hashSeed(str: string): number {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  h = Math.imul(h ^ (h >>> 16), 2246822507);
  h = Math.imul(h ^ (h >>> 13), 3266489909);
  return (h ^ (h >>> 16)) >>> 0;
}

/**
 * A `Math.random`-shaped function: returns [0, 1), and the same seed always
 * yields the same sequence. Drop-in wherever `Math.random` is accepted.
 */
export function rngFor(seed: string): () => number {
  let a = hashSeed(seed);
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
