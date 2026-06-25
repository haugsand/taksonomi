import { defineConfig, type Connect, type Plugin } from "vite";
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
});
