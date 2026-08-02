// The single source of truth for *which* categories and words ship.
//
// Extracted from build-categories.mjs so the description generator resolves the
// exact same list. Generating a description for a word that the build later
// drops (excluded category, cross-category duplicate, trimmed past
// TARGET_WORDS) is wasted work that no player would ever see.

import { readdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

export const TARGET_CATEGORIES = 172;
// Each raw category lists words from easiest-to-guess to hardest; we keep the
// first 40 so the 10 most obscure (listed last) are dropped.
export const TARGET_WORDS = 40;

/** Longest a description may be. Two lines on a phone, and no more. */
export const MAX_DESCRIPTION_LENGTH = 90;

export const here = path.dirname(fileURLToPath(import.meta.url));
export const dataDir = path.join(here, "data");
export const descriptionsDir = path.join(dataDir, "descriptions");

// Categories excluded from the build to trim 250 -> 160. The raw data files are
// kept intact, so removing a name here re-includes that category.
export const EXCLUDE = new Set([
  // Obskure utenlandske by-lister (beholder hovedsteder + norske)
  "Tyske byer", "Franske byer", "Italienske byer", "Spanske byer",
  "Britiske byer", "Amerikanske byer", "Japanske byer", "Kinesiske byer",
  "Russiske byer", "Afrikanske byer", "Sør-amerikanske byer", "Indiske byer",
  "Australske og newzealandske byer", "Kanadiske byer", "Tyrkiske byer",
  "Polske byer", "Nederlandske byer", "Meksikanske byer", "Portugisiske byer",
  "Belgiske byer", "Skandinaviske byer", "Sør-koreanske byer",
  "Indonesiske byer", "Vietnamesiske byer", "Midtøsten-byer",
  "Thailandske byer", "Sør-afrikanske byer", "Greske byer", "Egyptiske byer",
  "Sveitsiske og østerrikske byer", "Tsjekkiske og ungarske byer",
  "Brasilianske byer", "Nigerianske byer", "Filippinske byer",
  "Pakistanske byer", "Bangladeshiske byer", "Malaysiske byer", "Irske byer",
  "Iranske byer", "Sentralasiatiske byer", "Nordafrikanske byer",
  "Ukrainske byer", "Rumenske og bulgarske byer", "Kaukasiske byer",
  "Byer i Indokina", "Karibiske byer", "Østafrikanske byer",
  "Vestafrikanske byer", "Argentinske byer", "Chilenske byer",
  "Sentralamerikanske byer", "Colombianske og venezuelanske byer",
  "Peruanske og ecuadorianske byer", "Bolivianske og paraguayanske byer",
  "Indiske byer (flere)", "Russiske byer (flere)", "Japanske byer (flere)",
  "Kinesiske byer (flere)",
  // Nisje-/spesialistlister
  "Romerske keisere", "Egyptiske og mesopotamiske guder", "Keltisk mytologi",
  "Slavisk mytologi", "Japansk folklore", "Aztekisk og mayansk mytologi",
  "Hinduistiske guder", "Greske helter og sagnfigurer", "Bibelske steder",
  "Helgener", "Psykologer", "Økonomer", "Jazzmusikere", "Berømte arkitekter",
  "Formel 1-førere", "Sjakkspillere", "Tennisspillere", "Basketballspillere",
  "Moderne statsledere", "Kryptovalutaer", "Klokkemerker",
  "Gitar- og forsterkermerker", "Sykkelmerker", "Verktøymerker",
  "Sportsklesmerker", "Sjokolademerker", "Brennevinmerker", "Flyselskaper",
  "Kjente skip", "Kjente racerbaner", "Kjente fotballstadioner",
  "Verkstedmaskiner",
]);

/** The lookup key for a word. Descriptions are keyed by this, not by spelling. */
export const norm = (w) => w.trim().toLowerCase();

/**
 * URL-safe name for a category, used as the filename of its description bundle.
 * Norwegian letters are transliterated rather than dropped so "Norske byer" and
 * "Nørske byer" could never collapse onto the same file — the build asserts
 * uniqueness anyway, but a lossy slug would make that assertion fire on names
 * that are genuinely different.
 */
export function slugify(name) {
  return name
    .toLowerCase()
    .replaceAll("æ", "ae")
    .replaceAll("ø", "o")
    .replaceAll("å", "a")
    // Strips any remaining diacritics (é, ü, ñ …) rather than turning them into
    // separators, so "Genève" slugs as "geneve" and not "gen-ve".
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Reads scripts/data/*.mjs and applies every filter the shipped data goes
 * through: exclusions, in-category dedup, cross-category dedup (keep-first).
 *
 * Words are NOT trimmed to TARGET_WORDS here — the caller decides, because the
 * build only trims when it has the full set (see build-categories.mjs).
 */
export async function loadCategories() {
  const files = (await readdir(dataDir)).filter((f) => f.endsWith(".mjs")).sort();

  /** @type {{name: string, words: string[], file: string}[]} */
  const categories = [];
  const seenNames = new Set();
  const seenWords = new Map(); // normalised word -> first category name
  const problems = [];

  for (const file of files) {
    const mod = await import(path.join(dataDir, file));
    const batch = mod.default;
    for (const [name, rawWords] of Object.entries(batch)) {
      if (EXCLUDE.has(name)) continue;
      if (seenNames.has(name)) {
        problems.push(`Duplikat kategorinavn: "${name}" (${file})`);
        continue;
      }
      seenNames.add(name);

      const words = [];
      const seenInCat = new Set();
      for (const w of rawWords) {
        const key = norm(w);
        if (seenInCat.has(key)) continue; // silent in-category dedup
        if (seenWords.has(key)) continue; // cross-category collision: keep first
        seenInCat.add(key);
        seenWords.set(key, name);
        words.push(w.trim());
      }
      categories.push({ name, words, file });
    }
  }

  return { categories, problems };
}

/**
 * loadCategories() plus the last two steps that decide what actually ships: the
 * 40-word trim and the slug.
 *
 * The trim is conditional because it always has been — a partial data set is
 * reported as-is rather than silently cut to look complete. Both the build and
 * the generator go through here, so a word the build would drop is never a word
 * the generator pays to describe.
 */
export async function loadShippedCategories() {
  const { categories, problems } = await loadCategories();
  const short = categories.filter((c) => c.words.length < TARGET_WORDS);
  const hitTargets = categories.length === TARGET_CATEGORIES && short.length === 0;

  const shipped = categories.map((c) => ({
    name: c.name,
    slug: slugify(c.name),
    words: hitTargets ? c.words.slice(0, TARGET_WORDS) : c.words,
  }));

  return { shipped, short, hitTargets, problems };
}

/**
 * Merges scripts/data/descriptions/*.mjs into one word -> description map.
 *
 * A flat map is safe precisely because loadCategories() guarantees no word
 * appears in two categories, so a word never needs its category for context.
 * Returns the map plus the per-file origin, which the generator needs to know
 * which batch a word already belongs to.
 */
export async function loadDescriptions() {
  let files = [];
  try {
    files = (await readdir(descriptionsDir)).filter((f) => f.endsWith(".mjs")).sort();
  } catch {
    return { descriptions: new Map(), origin: new Map(), problems: [] };
  }

  const descriptions = new Map(); // normalised word -> description
  const origin = new Map(); // normalised word -> file it came from
  const problems = [];

  for (const file of files) {
    const mod = await import(path.join(descriptionsDir, file));
    for (const [word, text] of Object.entries(mod.default)) {
      const key = norm(word);
      const owner = origin.get(key);
      if (owner) {
        problems.push(`Ordet "${word}" er beskrevet i både ${owner} og ${file}`);
        continue;
      }
      origin.set(key, file);
      descriptions.set(key, text.trim());
    }
  }

  return { descriptions, origin, problems };
}

/** Everything that makes a description unusable. Empty when it is fine. */
export function validateDescription(word, text) {
  const problems = [];
  if (!text) {
    problems.push(`"${word}": tom beskrivelse`);
    return problems;
  }
  if (text.length > MAX_DESCRIPTION_LENGTH) {
    problems.push(`"${word}": ${text.length} tegn (maks ${MAX_DESCRIPTION_LENGTH}) — «${text}»`);
  }
  if (norm(text).replace(/[.!?]$/, "") === norm(word)) {
    problems.push(`"${word}": beskrivelsen er bare ordet selv`);
  }
  return problems;
}
