import { defineConfig } from "vitest/config";
import type { Connect, Plugin } from "vite";
import preact from "@preact/preset-vite";
import path from "node:path";
import { pickCategories } from "./server/pickCategories";

/**
 * Serves /api/new-game during `vite dev` and `vite preview` using the same
 * logic as the production Netlify Function, so the category data stays
 * server-only and never enters the client bundle.
 */
function newGameApi(): Plugin {
  const handler: Connect.NextHandleFunction = (req, res, next) => {
    const url = new URL(req.url ?? "", "http://localhost");
    if (url.pathname !== "/api/new-game") return next();
    const groups = Number(url.searchParams.get("groups"));
    const wordsPerGroup = Number(url.searchParams.get("words"));
    res.setHeader("Content-Type", "application/json");
    if (!Number.isFinite(groups) || !Number.isFinite(wordsPerGroup)) {
      res.statusCode = 400;
      res.end(JSON.stringify({ error: "groups and words must be numbers" }));
      return;
    }
    res.end(JSON.stringify({ categories: pickCategories(groups, wordsPerGroup) }));
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
    include: ["src/**/*.test.ts", "server/**/*.test.ts"],
    // happy-dom under Vitest doesn't expose localStorage as a global; the setup
    // installs an in-memory Storage so storage.ts is testable. See test-setup.ts.
    setupFiles: ["./src/test-setup.ts"],
  },
});
