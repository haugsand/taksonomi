import { pickCategories } from "./pickCategories";

interface Env {
  ASSETS: Fetcher;
}

/**
 * Cloudflare Worker entry point. Mirrors the old Netlify Function
 * (netlify/functions/new-game.mts) for /api/new-game, redirects www to the
 * apex domain, and otherwise falls through to static asset serving.
 */
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.hostname.startsWith("www.")) {
      url.hostname = url.hostname.slice(4);
      return Response.redirect(url.toString(), 301);
    }

    if (url.pathname === "/api/new-game") {
      const groups = Number(url.searchParams.get("groups"));
      const wordsPerGroup = Number(url.searchParams.get("words"));

      if (!Number.isFinite(groups) || !Number.isFinite(wordsPerGroup)) {
        return Response.json({ error: "groups and words must be numbers" }, { status: 400 });
      }

      const categories = pickCategories(groups, wordsPerGroup);
      return Response.json({ categories }, { headers: { "Cache-Control": "no-store" } });
    }

    return env.ASSETS.fetch(request);
  },
};
