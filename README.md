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
per kategori. Samme logikk kjører to steder, via delt kode:

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

`server/categories-data.ts` er **auto-generert og skal ikke redigeres for
hånd.** Kilden er `scripts/data/batch*.mjs`:

```bash
node scripts/build-categories.mjs
```

```bash
node scripts/build-categories.mjs --report
```

Den første er streng og må treffe målene; den andre skriver bare ut status.
Skriptet nekter å skrive filen ved brudd på invariantene som gjør spillet
entydig:

- kategorinavn er unike
- ingen ord forekommer i mer enn én kategori (globalt, første vinner)
- ingen ord gjentas innenfor en kategori
- hver kategori har minst `TARGET_WORDS` ord **etter** global dedup
- det er nøyaktig `TARGET_CATEGORIES` kategorier

Hver rå kategori lister ord fra lettest til vanskeligst å gjette; de første 40
beholdes, så de mest obskure faller bort. `EXCLUDE` i skriptet trimmer vekk
kategorier uten å røre rådatafilene — fjern et navn derfra for å ta kategorien
inn igjen.

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
