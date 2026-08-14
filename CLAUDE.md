# CLAUDE.md

Taksonomi — ordspill i Preact + Vite, hostet som én Cloudflare Worker på
taksonomi.app. Grensesnitt, dokumentasjon og commitmeldinger er på norsk
bokmål; kode og kodekommentarer er på engelsk.

Begrunnelsene bak enkeltvalg står i doc-kommentarene i den filen valget gjelder.
Denne filen dekker det som ikke står i noen enkeltfil.

## Kommandoer

```bash
npm run dev        # Vite på :8080, /api/* servert av samme kode som Workeren
npm run cf:dev     # wrangler dev — den ekte Workeren, med headere og www-redirect
npm test           # Vitest. Validerer også kategoridataene
npm run lint
npx tsc --noEmit   # se fallgruven under — dekker ikke alt
```

Deploy skjer av seg selv: Cloudflare Workers Builds bygger og deployer hver push
til `main`. `npm run deploy` er den manuelle overstyringen for noe som _ikke_
ligger på `main` — ikke den vanlige veien. Ikke be brukeren kjøre den etter en
push.

## Fallgruvene der landminen ligger i en annen fil enn den du redigerer

**`npx tsc --noEmit` dekker ikke `server/worker.ts` og
`server/securityHeaders.ts`.** `tsconfig.json` inkluderer bare `src/**` (pluss
vite.config.ts og eslint.config.js), så server-filer typesjekkes kun i den grad
`vite.config.ts` importerer dem — og worker.ts importeres ikke av noe. ESLint
kjører uten type-aware regler, og wrangler bruker esbuild, som stripper typer
uten å sjekke dem. En typefeil i de to filene fanges altså ingen steder. Les dem
tilsvarende nøye. (Samme årsak til at `KVLike` i boardStore.ts er skrevet ut
strukturelt: Workers-typene er ikke i scope der.)

**Rører du temaskriptet i `index.html`, ryker CSP-en.** Hashen står i
`server/securityHeaders.ts`, og `securityHeaders.test.ts` re-utleder den fra
index.html — så `npm test` sier fra, men ingenting i index.html gjør det.

**Rører du farger, må `build.cssMinify: "esbuild"` i vite.config.ts stå.**
Lightning CSS lowerer `light-dark()` til en `prefers-color-scheme`-toggle som
ignorerer `color-scheme`-egenskapen, og da gjør temabryteren ingenting i
prod-bygget mens den virker fint i dev. Verifiser et prod-bygg med
`grep -c 'light-dark(' dist/assets/*.css` (skal være > 0) og `lightningcss-light`
(skal være 0). `getComputedStyle` er ubrukelig som prøve her — den lowerede
formen gir transparent.

**Varigheter bor bare i `src/lib/constants.ts`.** Et stilark skal aldri
overstyre en varighet, heller ikke i en `prefers-reduced-motion`-blokk: JS-timerne
leser de samme tallene, og da låser brettet seg i tre sekunder mens animasjonen
er ferdig på 200 ms. CSS bestemmer _hvilken_ animasjon som spilles, constants.ts
bestemmer _hvor lenge_.

## Prinsipper som begrenser hva som kan foreslås

- **Brikker flytter seg aldri mellom rader.** Rader tildeles ved nytt spill og
  ved endret radantall, aldri ved sammenslåing eller fullføring. Spillerens
  romlige hukommelse er hele navigasjonen. Utelukker f.eks. «samle fullførte
  grupper nederst» — det ville flyttet uløste ord.
- **Brettet renner ut til høyre med vilje.** Horisontal scrolling er del av
  konseptet, ikke en layoutbug. Scroll-containeren er `.game`; måler du på
  `document.documentElement` ser det feilaktig ut som innholdet er klippet.
- **Ingen retensjonsmekanikk.** Streaks, bomtelling og personlige rekorder er
  vurdert og valgt bort — spillet skal være grunnen til å komme tilbake.
  Trenger noe vekt, bruk hierarki og luft, ikke en score.
- **Ingenting røper en uløst kategori.** Gjelder delingsteksten (share.ts),
  annonseringene (announce.ts), aria-labels og DOM-attributter. `tile.id`
  inneholder kategorinavnet og skal derfor aldri rendres.

## Hvor ting hører hjemme

- **Endepunktslogikk i `server/newGame.ts`**, ikke i `server/worker.ts`.
  Workeren og Vite-middlewaren (`gameApi()` i vite.config.ts) kaller den samme
  funksjonen nettopp for at dev og prod ikke skal drive fra hverandre; legger du
  logikk i worker.ts, finnes den ikke i dev.
- **`server/categories-data.ts` importeres kun av server-kode.** Kommer den inn
  i klientgrafen, følger hele ordlista med i bundelen.
- **Nye brettstørrelser: `GAME_SIZES` i `src/lib/sizes.ts`.** API-et godtar bare
  parene som står der, så det er det eneste stedet som må endres.
- **Stilark følger flate, ikke komponent.** `Sheet.css`, `CompletedView.css` osv.
  eies av komponenten som utgjør flaten, og små barn (SizeChips, ThemeToggle,
  WordSample, ShareButton) legger klassene sine der. Bare en komponent som eier
  en flate importerer et stilark.
- **localStorage-nøkler er versjonerte konstanter i `constants.ts`.** En bump
  krever en migrering i `storage.ts` som også fjerner den døde nøkkelen — et
  etterlatt 40×40-brett blir liggende hos hver returnerende spiller for alltid.

## Kategoridataene

To håndredigerte kilder: `server/categories-data.ts` (navn, slug og 40 ord per
kategori) og `public/descriptions/<slug>.json` (én forklaring per ord). 184
kategorier, 7 360 ord.

Slik legger du til en kategori: skriv navn, `slugify`-et slug og 40 ord i
categories-data.ts, skriv beskrivelsesbunten, kjør `npm test`. Testen
(`server/categories-data.test.ts`) er fasiten — den navngir hvert ord som
kolliderer med en kategori som allerede finnes. Ordene trenger ingen bestemt
rekkefølge; brettet trekker et tilfeldig utvalg.

Testen sammenligner strenger, og fanger derfor ikke:

- **synonymer i samme kategori** (yatzy/yahtzee, pils/pilsner, lær/skinn) — to
  brikker som betyr det samme gjør brettet uløselig uten at spilleren kan vite
  hvilken som er ment
- **samme sak i to former** — «kokt» i Smaker og «koke» i Matlagingsteknikker er
  ulike strenger og samme handling
- **forvekslbare ord innenfor én kategori** — «skiheis» mot «skitrekk» mot
  «stolheis» har ikke noe prinsipielt svar
- **kategorier som blander to slags ting** — et navn som lover fagtermer og
  leverer titler

Dette må leses for hånd, og har vært kilden til de fleste funnene i tidligere
opprydninger.

Beskrivelsene:

- Norsk bokmål, én setning, maks 90 tegn. Hard grense, håndhevet av testen.
- Si det som skiller nettopp dette ordet fra de andre i kategorien. Ikke gjenta
  kategorinavnet — spilleren ser det rett over.
- Begynn ikke med ordet selv, og ikke med «En», «Et» eller «Den».
- Vær konkret: et tall, et sted, en funksjon, et årstall. Ikke «kjent for å være
  populær».
- Skriv bare det du er trygg på. Er du usikker på en detalj, ta med det generelle
  framfor å gjette på det spesifikke. En vag beskrivelse er grei; en feil er det
  ikke.

Nøkkelen må staves nøyaktig som ordet. `CompletedBoard` slår opp med
`descriptions[word]`, så én stor bokstav for mye gir ingen forklaring i det hele
tatt — derfor er testens sammenligning eksakt og ikke normalisert.

## Å holde CLAUDE.md og README.md i takt

Oppdater **CLAUDE.md** når et npm-script kommer til eller endrer betydning; når
tsconfig eller eslint-konfigen endrer hva som faktisk sjekkes; når reglene for
kategoridata eller beskrivelser endres; når et prinsipp over blir omgjort; eller
når en av fallgruvene over viser seg å ikke gjelde lenger — da skal linjen bort,
ikke få et forbehold.

Oppdater **README.md** når en spillfunksjon kommer til eller forsvinner; når
dev-porten, oppstartskommandoene eller deploy-veien endres; når tallet på
kategorier og ord endres; eller når et engangsoppsett blir gjort — det skal ned i
Arkiv-seksjonen, ikke stå øverst som om det er neste steg.
