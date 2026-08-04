import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { CATEGORIES } from "./categories-data";

// These invariants used to be enforced by scripts/build-categories.mjs, which
// refused to write categories-data.ts on a violation. The file is now edited by
// hand, so they live here instead: same rules, but checked on every `npm test`
// rather than whenever someone remembered to run the build.

/** Every category ships exactly this many words. The board picks a subset. */
const WORDS_PER_CATEGORY = 40;

/** Longest a description may be. Two lines on a phone, and no more. */
const MAX_DESCRIPTION_LENGTH = 90;

// Resolved from the project root rather than from import.meta.url: Vite rewrites
// import.meta.url to a non-file URL when it transforms this module for the test
// environment, and fileURLToPath then rejects it.
const descriptionsDir = path.join(process.cwd(), "public", "descriptions");

/** The lookup key for a word. Descriptions are keyed by this, not by spelling. */
const norm = (w: string) => w.trim().toLowerCase();

/**
 * URL-safe name for a category, used as the filename of its description bundle.
 * Norwegian letters are transliterated rather than dropped so "Norske byer" and
 * "Nørske byer" could never collapse onto the same file.
 *
 * Nothing at runtime calls this — the slug is written out in categories-data.ts.
 * It lives here so the test can re-derive the slug a name should have and catch
 * a hand-written one that drifted from its category name.
 */
function slugify(name: string): string {
  return (
    name
      .toLowerCase()
      .replaceAll("æ", "ae")
      .replaceAll("ø", "o")
      .replaceAll("å", "a")
      // Strips any remaining diacritics (é, ü, ñ …) rather than turning them into
      // separators, so "Genève" slugs as "geneve" and not "gen-ve".
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
  );
}

const bundles = new Map<string, Record<string, string>>(
  readdirSync(descriptionsDir)
    .filter((f) => f.endsWith(".json"))
    .map((f) => [
      f.replace(/\.json$/, ""),
      JSON.parse(readFileSync(`${descriptionsDir}/${f}`, "utf8")),
    ]),
);

describe("categories-data", () => {
  it("has unique category names", () => {
    const seen = new Map<string, number>();
    for (const c of CATEGORIES) seen.set(c.name, (seen.get(c.name) ?? 0) + 1);
    expect([...seen].filter(([, n]) => n > 1).map(([name]) => name)).toEqual([]);
  });

  it("gives every category a slug derived from its name", () => {
    const wrong = CATEGORIES.filter((c) => c.slug !== slugify(c.name)).map(
      (c) => `${c.name}: ${c.slug} (forventet ${slugify(c.name)})`,
    );
    expect(wrong).toEqual([]);
  });

  it("has unique slugs", () => {
    const slugs = CATEGORIES.map((c) => c.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("gives every category exactly the same number of words", () => {
    const wrong = CATEGORIES.filter((c) => c.words.length !== WORDS_PER_CATEGORY).map(
      (c) => `${c.name}: ${c.words.length}`,
    );
    expect(wrong).toEqual([]);
  });

  it("never repeats a word inside a category", () => {
    const dupes: string[] = [];
    for (const c of CATEGORIES) {
      const seen = new Set<string>();
      for (const w of c.words) {
        if (seen.has(norm(w))) dupes.push(`${c.name}: ${w}`);
        seen.add(norm(w));
      }
    }
    expect(dupes).toEqual([]);
  });

  // The one that actually decides whether a board is solvable: a word in two
  // categories makes the puzzle ambiguous, and no amount of play-testing finds
  // it reliably, because it only shows when both categories are drawn together.
  it("never uses the same word in two categories", () => {
    const owner = new Map<string, string>();
    const collisions: string[] = [];
    for (const c of CATEGORIES) {
      for (const w of c.words) {
        const first = owner.get(norm(w));
        if (first) collisions.push(`"${w}": ${first} og ${c.name}`);
        else owner.set(norm(w), c.name);
      }
    }
    expect(collisions).toEqual([]);
  });
});

describe("descriptions", () => {
  it("has a bundle for every category", () => {
    const missing = CATEGORIES.filter((c) => !bundles.has(c.slug!)).map((c) => c.slug);
    expect(missing).toEqual([]);
  });

  // A renamed category leaves its old bundle behind, served forever under a slug
  // nothing links to. The build used to wipe the directory on every run; now the
  // stale file has to be deleted by hand, so the test has to name it.
  it("has no bundle without a category", () => {
    const slugs = new Set(CATEGORIES.map((c) => c.slug));
    expect([...bundles.keys()].filter((s) => !slugs.has(s))).toEqual([]);
  });

  // Exact spelling, not normalised: CompletedBoard looks a description up as
  // `descriptions[word]`, so a bundle key that differs from the shipped word by
  // as little as a capital letter silently renders no description at all.
  it("describes exactly the words its category ships, spelled the same way", () => {
    const problems: string[] = [];
    for (const c of CATEGORIES) {
      const bundle = bundles.get(c.slug!);
      if (!bundle) continue;
      const described = new Set(Object.keys(bundle));
      for (const w of c.words) {
        if (!described.has(w)) problems.push(`${c.slug}: mangler "${w}"`);
      }
      const words = new Set(c.words);
      for (const key of Object.keys(bundle)) {
        if (!words.has(key)) problems.push(`${c.slug}: beskriver ukjent ord "${key}"`);
      }
    }
    expect(problems).toEqual([]);
  });

  it("keeps every description short, non-empty and more than the word itself", () => {
    const problems: string[] = [];
    for (const [slug, bundle] of bundles) {
      for (const [word, text] of Object.entries(bundle)) {
        if (!text) {
          problems.push(`${slug} / "${word}": tom beskrivelse`);
          continue;
        }
        if (text.length > MAX_DESCRIPTION_LENGTH) {
          problems.push(
            `${slug} / "${word}": ${text.length} tegn (maks ${MAX_DESCRIPTION_LENGTH}) — «${text}»`,
          );
        }
        if (norm(text).replace(/[.!?]$/, "") === norm(word)) {
          problems.push(`${slug} / "${word}": beskrivelsen er bare ordet selv`);
        }
      }
    }
    expect(problems).toEqual([]);
  });
});
