# Taksonomi

Et ordspill hvor du kombinerer ord som hører til samme kategori, bygget med
Preact + Vite. Kategoridataene serveres fra et endepunkt (`/api/new-game`) slik
at den store ordlisten holdes utenfor klient-bundelen.

## Utvikling

```bash
npm install
npm run dev          # Vite på http://localhost:8080 (vanlig utvikling)
```

`npm run dev` kjører Vite med et innebygd middleware som serverer `/api/new-game`
lokalt — rask HMR, ingen Netlify CLI nødvendig.

### Teste Netlify-funksjonen lokalt

```bash
npm run dev:netlify  # Netlify dev på http://localhost:8888
```

Dette kjører den ekte Netlify-funksjonen ([netlify/functions/new-game.mts](netlify/functions/new-game.mts))
og redirect-reglene fra [netlify.toml](netlify.toml), slik prod fungerer. Bruk
dette når du vil verifisere selve funksjonen før deploy.

## Bygg

```bash
npm run build        # produksjonsbygg til dist/
npm run preview      # forhåndsvis bygget (serverer også /api/new-game)
npm run lint
npm run format
```

## Arkitektur

- **`/api/new-game?groups=&words=`** velger tilfeldige kategorier og tilfeldige
  ord per kategori. Samme logikk kjører tre steder via delt kode:
  - prod: Netlify Function (`netlify/functions/new-game.mts`)
  - dev/preview: Vite-middleware i `vite.config.ts`
  - begge kaller `server/pickCategories.ts`
- **`server/categories-data.ts`** holder hele kategorilisten og importeres kun av
  server-kode, så den havner aldri i klient-bundelen.
- **Klienten** ([src/lib/api.ts](src/lib/api.ts), [src/components/game/Game.tsx](src/components/game/Game.tsx))
  henter kun de kategoriene et spill trenger og lagrer dem i `localStorage`.
