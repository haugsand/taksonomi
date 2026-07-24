// Builds server/categories-data.ts from the raw batch files in scripts/data/.
//
// Invariants enforced (the script refuses to write on any violation):
//   - category names are unique
//   - no word appears in more than one category (global, keep-first)
//   - no word is repeated within a category
//   - every category has at least TARGET_WORDS words AFTER global dedup
//   - there are exactly TARGET_CATEGORIES categories
//
// Run:  node scripts/build-categories.mjs           (strict: must hit targets)
//       node scripts/build-categories.mjs --report  (lenient: print progress)

import { readdir } from "node:fs/promises";
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const TARGET_CATEGORIES = 172;
// Each raw category lists words from easiest-to-guess to hardest; we keep the
// first 40 so the 10 most obscure (listed last) are dropped.
const TARGET_WORDS = 40;

// Categories excluded from the build to trim 250 -> 160. The raw data files are
// kept intact, so removing a name here re-includes that category.
const EXCLUDE = new Set([
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

const here = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(here, "data");
const outFile = path.join(here, "..", "server", "categories-data.ts");
const report = process.argv.includes("--report");

const norm = (w) => w.trim().toLowerCase();

const files = (await readdir(dataDir)).filter((f) => f.endsWith(".mjs")).sort();

/** @type {{name: string, words: string[]}[]} */
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
      const owner = seenWords.get(key);
      if (owner) {
        // cross-category collision: keep first, drop here
        continue;
      }
      seenInCat.add(key);
      seenWords.set(key, name);
      words.push(w.trim());
    }
    categories.push({ name, words });
  }
}

// Validation report
const short = categories.filter((c) => c.words.length < TARGET_WORDS);
for (const c of short) {
  problems.push(`For få ord etter dedup: "${c.name}" har ${c.words.length}/${TARGET_WORDS}`);
}

const totalWords = categories.reduce((n, c) => n + c.words.length, 0);
console.log(`Kategorier: ${categories.length}/${TARGET_CATEGORIES}`);
console.log(`Unike ord totalt: ${totalWords}`);
console.log(`Korte kategorier (<${TARGET_WORDS}): ${short.length}`);
if (short.length) {
  console.log(short.map((c) => `   - ${c.name}: ${c.words.length}`).join("\n"));
}

const hitTargets =
  categories.length === TARGET_CATEGORIES && short.length === 0;

if (problems.length && !report) {
  console.error(`\n❌ ${problems.length} problem(er):`);
  console.error(problems.slice(0, 40).join("\n"));
}

if (!report && (!hitTargets || problems.length)) {
  console.error("\nSkriver IKKE filen (kjør med --report for å se status uten å feile).");
  process.exit(1);
}

// Emit, trimming every category to exactly TARGET_WORDS when we have the full set.
const emit = categories.map((c) => ({
  name: c.name,
  words: hitTargets ? c.words.slice(0, TARGET_WORDS) : c.words,
}));

const body = emit
  .map(
    (c) =>
      `  {\n    name: ${JSON.stringify(c.name)},\n    words: [\n${c.words
        .map((w) => `      ${JSON.stringify(w)},`)
        .join("\n")}\n    ],\n  },`,
  )
  .join("\n");

const out = `// AUTO-GENERATED by scripts/build-categories.mjs — do not edit by hand.
// Source of truth: scripts/data/*.mjs
import type { Category } from "../src/lib/types";

export const CATEGORIES: Category[] = [
${body}
];
`;

writeFileSync(outFile, out);
console.log(`\n✅ Skrev ${outFile} (${emit.length} kategorier)`);
