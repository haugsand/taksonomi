import { defineConfig } from "vitest/config";
import type { Connect, Plugin } from "vite";
import preact from "@preact/preset-vite";
import path from "node:path";
import { dailyGame, newGame } from "./server/newGame";
import { memoryBoardStore } from "./server/boardStore";

/**
 * Serves /api/new-game and /api/daily during `vite dev` and `vite preview`
 * through the same functions the Worker uses, so the category data stays
 * server-only (it never enters the client bundle) and dev matches production
 * down to the validation.
 */
function gameApi(): Plugin {
  // Stands in for KV, so dev exercises the freeze rather than a path around it.
  const store = memoryBoardStore();

  const handler: Connect.NextHandleFunction = (req, res, next) => {
    const url = new URL(req.url ?? "", "http://localhost");
    const daily = url.pathname === "/api/daily";
    if (!daily && url.pathname !== "/api/new-game") return next();
    res.setHeader("Content-Type", "application/json");

    if (daily) {
      dailyGame(url.searchParams, { store }).then(
        (result) => {
          if (!result.ok) {
            res.statusCode = result.status;
            res.end(JSON.stringify({ error: result.error }));
            return;
          }
          res.end(JSON.stringify({ date: result.date, categories: result.categories }));
        },
        // dailyGame swallows storage failures, so reaching here means a real
        // bug rather than a flaky store — surface it instead of hanging the
        // request until the dev server is restarted.
        (error: unknown) => {
          res.statusCode = 500;
          res.end(JSON.stringify({ error: String(error) }));
        },
      );
      return;
    }

    const result = newGame(url.searchParams);
    if (!result.ok) {
      res.statusCode = result.status;
      res.end(JSON.stringify({ error: result.error }));
      return;
    }
    res.end(JSON.stringify({ categories: result.categories }));
  };
  return {
    name: "game-api",
    configureServer(server) {
      server.middlewares.use(handler);
    },
    configurePreviewServer(server) {
      server.middlewares.use(handler);
    },
  };
}

export default defineConfig({
  plugins: [preact(), gameApi()],
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
  server: { host: "::", port: 8080, strictPort: true },
  // Vite 8's default production CSS minifier is Lightning CSS, which *lowers*
  // native `light-dark()` into a `@media (prefers-color-scheme)` custom-property
  // toggle (--lightningcss-light/-dark). That toggle keys off the OS media query
  // only and ignores the `color-scheme` CSS property — but our theme switch in
  // useTheme.ts works by setting `document.documentElement.style.colorScheme`.
  // Under Lightning CSS the manual light/dark toggle would silently do nothing in
  // the production build (it works in dev, where light-dark() is native). Using
  // esbuild's minifier keeps `light-dark()` intact so the toggle behaves the same
  // in dev and prod. See theme-light-dark-mechanism.
  build: { cssMinify: "esbuild" },
  test: {
    environment: "happy-dom",
    include: ["src/**/*.test.ts", "src/**/*.test.tsx", "server/**/*.test.ts"],
    // happy-dom under Vitest doesn't expose localStorage as a global; the setup
    // installs an in-memory Storage so storage.ts is testable. See test-setup.ts.
    setupFiles: ["./src/test-setup.ts"],
  },
});
