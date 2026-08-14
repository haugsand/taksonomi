# Taksonomi

Et norsk ordspill. Brettet fylles med løse ord, og du slår sammen dem som hører
til samme kategori — to ord blir til en gruppe, gruppen tar imot flere, og når
alle ordene i kategorien er samlet forsvinner den fra brettet.

Live: [taksonomi.app](https://taksonomi.app)

## Hva spillet gjør

- **Dagens utfordring.** Ett brett per størrelse per dag, likt for alle
  spillere, med klokke som går. Klokka pauser når fanen skjules eller menyen
  åpnes. Resultatet kan deles — men delingsteksten inneholder bare størrelse,
  dato og tid, aldri noe fra brettet.
- **Fritt spill.** Et tilfeldig brett når som helst, uten klokke og uten noe å
  sammenligne.
- **Åtte størrelser**, fra 5×5 til 40×40 (kategorier × ord per kategori).
- **184 kategorier og 7 360 ord**, fra kjemiske grunnstoffer til skiutstyr.
  Intet ord hører til to kategorier, så to brikker som kunne passet begge steder
  kan ikke havne på samme brett.
- **Ordforklaringer.** En løst kategori kan åpnes, og hvert ord har en kort
  forklaring av hva det er.
- **Lyst og mørkt tema.** Følger systemet til du velger selv.
- **Tastatur og skjermleser.** Brettet er én tab-stopp med pilnavigasjon, og alt
  som skjer på brettet sies også i en live-region. Med «redusert bevegelse»
  byttes animasjonene ut, ikke bare kortes ned.
- **Spillet lagres.** Et påbegynt brett ligger der når du kommer tilbake — men
  gårsdagens utfordring kan ikke fullføres i dag.
- Legges siden til på hjemskjermen, kjører den i fullskjerm.

## Kom i gang

```bash
npm install
npm run dev
```

Vite på http://localhost:8080. Dev-serveren serverer `/api/new-game` og
`/api/daily` gjennom nøyaktig samme kode som Workeren bruker i prod, så
oppførselen matcher ned til valideringen — og kategoridataene holder seg
server-side, utenfor klient-bundelen.

```bash
npm test             # Vitest (happy-dom). Validerer også kategoridataene
npm run test:watch
npm run lint
npm run format
```

## Bygg og deploy

**Push til `main` er deployen.** Cloudflare Workers Builds er koblet til
GitHub-repoet og bygger og deployer automatisk. Det finnes ingen kommando å
kjøre etterpå.

```bash
npm run build        # produksjonsbygg til dist/
npm run build:dev    # samme bygg, i development-modus
npm run preview      # forhåndsvis bygget (serverer også API-et)
npm run cf:dev       # wrangler dev — den ekte Workeren lokalt
npm run deploy       # vite build && wrangler deploy — manuell overstyring
```

`npm run cf:dev` er den eneste måten å se sikkerhetsheaderne og
www→apex-redirecten på: begge bor i Workeren og finnes ikke i Vite-middlewaren.
`npm run deploy` er for å få ut noe som ikke ligger på `main`.

## Slik henger det sammen

Preact + Vite på klienten. I prod er alt én Cloudflare Worker
([server/worker.ts](server/worker.ts)) som serverer de statiske filene og to
endepunkter:

- `/api/new-game` — tilfeldige kategorier og ord, `no-store`.
- `/api/daily` — dagens brett, seedet fra datoen (Europa/Oslo, avgjort på
  serveren) slik at alle får det samme. Brettet fryses i Cloudflare KV første
  gang noen ber om det, så en deploy av kategoridataene midt på dagen ikke
  splitter spillerne i før og etter.

Hele kategorilisten ligger i `server/categories-data.ts` og importeres bare av
server-kode; klienten får kun de kategoriene ett brett trenger. Ordforklaringene
er statiske JSON-filer under `public/descriptions/`, hentet per kategori i det
den løses.

Begrunnelsene bak enkeltvalgene står i doc-kommentarene i filene de gjelder.
Konvensjoner, fallgruver og reglene for kategoridataene står i
[CLAUDE.md](CLAUDE.md).

## Arkiv

Oppsett som allerede er gjort, og som ikke skal gjøres om igjen:

- **Netlify → Cloudflare Workers** (juli 2026). Netlify-funksjonen ble til
  `server/worker.ts`, og `netlify-cli` forsvant sammen med `.npmrc`-en og
  `legacy-peer-deps` den krevde. Vanlig `npm install` holder nå.
- **KV-namespacet `BOARDS`** er opprettet, og id-en står i
  [wrangler.jsonc](wrangler.jsonc). Id-en er kontospesifikk — bare på en ny
  konto trengs `npx wrangler kv namespace create BOARDS` og en ny id inn i fila.
- **Byggesteget for kategoridata er fjernet** (august 2026). `scripts/` med
  rådata og en LLM-generator produserte de to datakildene fram til alle
  kategoriene var komplette; nå redigeres begge for hånd, og invariantene
  håndheves av `server/categories-data.test.ts` på hver `npm test`. Rådataene og
  generatoren ligger i historikken fram til `6a31b56`.
- **Fonten selvhostes** fra `src/fonts/` i stedet for Google Fonts. Vite
  fingeravtrykker og emitterer den, så appen henter ingenting fra tredjepart —
  det er også forutsetningen for `default-src 'self'` i CSP-en.
