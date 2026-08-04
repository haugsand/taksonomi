# Taksonomi

Et ordspill hvor du kombinerer ord som hører til samme kategori, bygget med
Preact + Vite og hostet på Cloudflare Workers. Kategoridataene serveres fra et
endepunkt (`/api/new-game`) slik at den store ordlisten holdes utenfor
klient-bundelen.

Live: [taksonomi.app](https://taksonomi.app)

## Utvikling

```bash
npm install
npm run dev
```

Vite på http://localhost:8080, med et innebygd middleware som serverer
`/api/new-game` lokalt gjennom nøyaktig samme kode som Workeren bruker — rask
HMR, og dev matcher prod ned til valideringen.

```bash
npm test             # Vitest (happy-dom)
npm run test:watch
npm run lint
npm run format
```

## Bygg og deploy

```bash
npm run build        # produksjonsbygg til dist/
npm run preview      # forhåndsvis bygget (serverer også /api/new-game)
npm run cf:dev       # wrangler dev — den ekte Workeren lokalt
npm run deploy       # vite build && wrangler deploy
```

Bruk `npm run cf:dev` når du vil verifisere selve Workeren, inkludert
sikkerhetsheaderne og www-redirecten, før deploy.

## Arkitektur

### Spill-API-et

`/api/new-game?groups=&words=` velger tilfeldige kategorier og tilfeldige ord
per kategori. `/api/daily?groups=&words=` gjør det samme, men seedet — se
[Daglig utfordring](#daglig-utfordring). Samme logikk kjører to steder, via delt
kode:

- **prod:** Cloudflare Worker ([server/worker.ts](server/worker.ts))
- **dev/preview:** Vite-middleware (`newGameApi()` i [vite.config.ts](vite.config.ts))

Begge kaller [server/newGame.ts](server/newGame.ts), som validerer parameterne
og delegerer til [server/pickCategories.ts](server/pickCategories.ts) — så de to
kan ikke drive fra hverandre.

Bare størrelsene UI-et faktisk tilbyr aksepteres (se `GAME_SIZES` i
[src/lib/sizes.ts](src/lib/sizes.ts)). Å klemme vilkårlige tall mot datasettets
maksimum i stedet lot én forespørsel be om samtlige kategorier og ord — et svar
på ~80 KB fra et endepunkt som ikke kan caches.

[server/categories-data.ts](server/categories-data.ts) holder hele
kategorilisten og importeres kun av server-kode, så den havner aldri i
klient-bundelen. Klienten ([src/lib/api.ts](src/lib/api.ts)) henter kun de
kategoriene ett spill trenger, og lagrer dem i `localStorage`.

### Daglig utfordring

Ett brett per størrelse per dag, likt for alle. Det hviler på to ting, og begge
må stemme:

- **Serveren trekker seedet.** `pickCategories` tar en RNG; `/api/daily` gir den
  `boardRng(dato, groups, words)` fra [src/lib/daily.ts](src/lib/daily.ts).
  Datoen kommer aldri fra forespørselen — en `date`-parameter ville latt hvem
  som helst hente morgendagens brett.
- **Klienten stokker seedet.** `shuffle` tar også en RNG, og
  [Game.tsx](src/components/Game.tsx) gir den `layoutRng(...)`. Uten dette er
  serveren perfekt deterministisk mens hver spiller likevel åpner på sin egen
  arrangering av de samme ordene — og da er tiden ikke sammenlignbar.

Generatoren i [src/lib/rng.ts](src/lib/rng.ts) er ren 32-bits heltallsaritmetikk
nettopp fordi den må gi identisk sekvens i Workeren, i Vite-middlewaren og i alle
nettlesere. `daily.test.ts` pinner de tre første tallene den gir: endrer du
generatoren, får spillerne et annet brett enn vennene sine — og midt på dagen et
annet brett enn de startet på.

Døgnet er `Europe/Oslo`, ikke UTC og ikke brukerens sone, så alle får nytt brett
samtidig. `/api/daily` kan derfor caches på kanten fram til midnatt (`s-maxage`),
i motsetning til `/api/new-game` som må være `no-store`.

**Brettet fryses ved første forespørsel.** Seeding alene holder ikke: seeden er
den samme, men `pickCategories` stokker _den lista som finnes i øyeblikket_. Blir
`categories-data.ts` deployet kl. 14, får alle som spiller etterpå et helt annet
brett enn de som spilte før — målt på det virkelige datasettet ga én ny kategori
null treff på samme plass av 15. Edge-cachen gjør det verre, ikke bedre: den er
per PoP, så to spillere i hver sin by kunne endt med hvert sitt brett samme dag.

Derfor skrives brettet til KV første gang noen ber om det
([server/boardStore.ts](server/boardStore.ts)), og leses derfra siden. Brettet er
da ikke lenger en funksjon av dataene, men en avgjort kjensgjerning. To
forespørsler som kappløper om å være først regner ut _det samme_ brettet — samme
seed, samme data, millisekunder fra hverandre — så dobbeltskrivingen er harmløs,
og samme resonnement dekker KVs eventuelle konsistens.

Lagringsfeil svelges med vilje: å servere et brett er bedre enn å servere en
feil, og frysingen er en konsistensgaranti snarere enn noe svaret avhenger av.
Prisen er at garantien degraderer stille — mistenker du det, sjekk at
`BOARDS`-bindingen finnes. Dev-serveren bruker en minnevariant av samme
grensesnitt, så den kjører samme kodesti og ikke en snarvei rundt den.

Klokka ([src/lib/timer.ts](src/lib/timer.ts)) pauser når fanen skjules og når
startmodalen åpnes — modalens backdrop er ugjennomsiktig, så det er ingenting å
tenke på mens den er oppe. Den lagres alltid pauset: å lagre `runningSince` som
det står ville telt hvert minutt fanen var lukket.

Fullført spill er ingen modal. Det var det, og modalen gjorde to jobber på én
gang: den _markerte øyeblikket_, som er forbigående, og _huset resultatet_, som
må vare. Delingsknappen lå i den forbigående, så å lukke modalen for å se på
brettet kastet den bort for godt. Nå blir brettet til resultatet
([CompletedView](src/components/CompletedView.tsx)), og kategoriene fyller inn
under det ett slag senere — `reveal` i
[constants.ts](src/lib/constants.ts), som både JS-timeren og CSS-en leser, så de
ikke kan komme i utakt.

Uten en modal er det heller ingenting som tar fokus eller annonserer seg selv.
Derfor flyttes fokus bevisst til resultatet, og `gameCompleted` i
[announce.ts](src/lib/announce.ts) sier fra — den sier også tiden, som ingenting
gjorde før.

Delingsteksten ([src/lib/share.ts](src/lib/share.ts)) får aldri se brettet — bare
størrelse, dato og tid. Det er samme regel som styrer `announce.ts`: den som
deler først skal ikke røpe dagen for alle andre.

### Sikkerhetsheadere

[server/securityHeaders.ts](server/securityHeaders.ts) definerer CSP-en og de
øvrige headerne, og `withSecurityHeaders` pakker **hvert** svar Workeren
returnerer — også statiske assets — slik at de ikke kan glemmes på en ny gren.
Det er også grunnen til at [wrangler.jsonc](wrangler.jsonc) setter
`run_worker_first: true`.

CSP-en har en hash for det inline temaskriptet i `index.html`, som må kjøre før
første maling. Hashen re-utledes fra `index.html` i
[server/securityHeaders.test.ts](server/securityHeaders.test.ts) — endrer du det
skriptet uten å oppdatere hashen, ryker testen i stedet for det deployede
nettstedet.

### Kategoridataene

Dataene har to kilder, og begge redigeres for hånd:

- `server/categories-data.ts` — navn, slug og de 40 ordene i hver kategori.
- `public/descriptions/<slug>.json` — ordforklaringene som vises når en kategori
  er løst. Statiske assets, hentes én gang per kategori av
  [src/lib/api.ts](src/lib/api.ts).

Fram til august 2026 ble begge generert fra rådata i `scripts/data/` av
`scripts/build-categories.mjs`. Det byggesteget er fjernet: det hadde nådd
endestasjonen (172 av 172 kategorier, alle med komplette beskrivelser), og holdt
liv i ~13 600 rå ord for å produsere 6 880. Trenger du rådataene eller
LLM-generatoren tilbake, ligger de i historikken fram til `6a31b56`.

Invariantene som gjør et brett entydig ligger nå i
[server/categories-data.test.ts](server/categories-data.test.ts) og kjører på
hver `npm test` i stedet for når noen husket å kjøre bygget:

- kategorinavn og slugger er unike
- `slug` er `slugify(name)` — en slug som har drevet fra navnet sitt er en 404
- ingen ord gjentas innenfor en kategori
- **ingen ord forekommer i mer enn én kategori** — den viktigste, for et ord i to
  kategorier gjør brettet tvetydig, og det viser seg bare når begge trekkes samtidig
- hver kategori har nøyaktig 40 ord
- hver kategori har en beskrivelsesbunt, ingen bunt er foreldreløs, og nøklene i
  bunten er **eksakt** ordene kategorien sender ut. Eksakt fordi
  `CompletedBoard` slår opp med `descriptions[word]`; en nøkkel som skiller seg
  med én stor bokstav gir ingen forklaring i det hele tatt
- ingen beskrivelse er tom, over 90 tegn, eller bare ordet om igjen

#### Å legge til en kategori

Legg inn navn, `slugify`-et slug og 40 ord i `categories-data.ts`, skriv
`public/descriptions/<slug>.json`, og kjør `npm test`. Testen forteller deg
hvilke ord som kolliderer med en kategori som allerede finnes — velg andre ord.
Ordene trenger ingen bestemt rekkefølge: brettet trekker et tilfeldig utvalg.

Beskrivelsene fulgte disse reglene da de ble skrevet, og nye bør følge dem også:

- Norsk bokmål, én setning, maks 90 tegn inkludert mellomrom. Hard grense.
- Si det som skiller nettopp dette ordet fra de andre i kategorien. Ikke gjenta
  kategorinavnet — spilleren ser det rett over.
- Begynn ikke med ordet selv, og ikke med «En», «Et» eller «Den».
- Vær konkret: et tall, et sted, en funksjon, et årstall. Ikke «kjent for å være
  populær» eller annet innholdsløst fyll.
- Skriv bare det du er trygg på. Er du usikker på en detalj, ta med det generelle
  i stedet for å gjette på det spesifikke. En vag beskrivelse er grei; en feil er
  det ikke.

Riktig form:

```
hydrogen -> "Letteste grunnstoffet, nummer 1, symbol H."
Portugal -> "Ligger vest for Spania, med Lisboa som hovedstad."
Python   -> "Lansert i 1991, kjent for lesbar syntaks og innrykk som struktur."
```

### Tema

Temaet bygger på CSS `light-dark()` styrt av `color-scheme` på `<html>`, ikke et
`data-theme`-attributt. To ting er verdt å vite før du rører det: kommentaren
over `build.cssMinify` i [vite.config.ts](vite.config.ts) forklarer hvorfor
prod-bygget ikke kan bruke Lightning CSS, og
[src/hooks/useTheme.ts](src/hooks/useTheme.ts) må holdes i synk med
pre-paint-skriptet i `index.html` (samme `localStorage`-nøkkel).

### Animasjon og redusert bevegelse

Animasjonsvarigheter er definert **kun** i
[src/lib/constants.ts](src/lib/constants.ts). `timings()` velger profil ut fra
brukerens `prefers-reduced-motion`, og `animationVars()` eksporterer den som
CSS-variabler på `.game`-roten.

Stilarkene skal aldri overstyre en _varighet_ — da havner JS-timerne og CSS-en
ut av takt, slik de gjorde da en fullført kategori forsvant momentant mens
brettet sto låst i tre sekunder. CSS kan derimot fritt bytte _hvilken_
animasjon som spilles: se `.tile--shake` i
[src/components/Tile.css](src/components/Tile.css), som blir et fargeblink i
stedet for en rysting.

### Tilgjengelighet

Brettet formidler alt gjennom animasjon og farge, så det som skjer sies også
høyt: [src/lib/announce.ts](src/lib/announce.ts) holder meldingene, og
`LiveRegion` annonserer dem. Regelen som gjelder alt der inne er at **en
annonsering aldri skal navngi kategorien til en brikke som ikke er løst** —
kategorien er fasiten. Av samme grunn rendres ikke `tile.id` til DOM-en; den
inneholder kategorinavnet.
