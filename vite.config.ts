import { defineConfig } from "vitest/config";
import type { Connect, Plugin } from "vite";
import preact from "@preact/preset-vite";
import path from "node:path";
import { newGame } from "./server/newGame";

/**
 * Serves /api/new-game during `vite dev` and `vite preview` through the same
 * `newGame` the Worker uses, so the category data stays server-only (it never
 * enters the client bundle) and dev matches production down to the validation.
 */
function newGameApi(): Plugin {
  const handler: Connect.NextHandleFunction = (req, res, next) => {
    const url = new URL(req.url ?? "", "http://localhost");
    if (url.pathname !== "/api/new-game") return next();
    res.setHeader("Content-Type", "application/json");
    const result = newGame(url.searchParams);
    if (!result.ok) {
      res.statusCode = result.status;
      res.end(JSON.stringify({ error: result.error }));
      return;
    }
    res.end(JSON.stringify({ categories: result.categories }));
  };
  return {
    name: "new-game-api",
    configureServer(server) {
      server.middlewares.use(handler);
    },
    configurePreviewServer(server) {
      server.middlewares.use(handler);
    },
  };
}

export default defineConfig({
  plugins: [preact(), newGameApi()],
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
