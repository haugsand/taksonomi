import { FREEZE_TTL_SECONDS, dailyGame, newGame } from "./newGame";
import { kvBoardStore, type KVLike } from "./boardStore";
import { secondsUntilNextDay } from "../src/lib/daily";
import { withSecurityHeaders } from "./securityHeaders";

interface Env {
  ASSETS: Fetcher;
  /**
   * Holds the decided daily boards — see boardStore.ts. Optional so that a
   * deploy with the binding missing degrades to recomputing each time (which
   * still works, and is what the app did before) rather than serving 500s.
   */
  BOARDS?: KVLike;
}

/**
 * Cloudflare Worker entry point. Serves /api/new-game, redirects www to the
 * apex domain, and otherwise falls through to static asset serving. Every
 * response leaves through a single point so the security headers can't be
 * forgotten on a new branch.
 */
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    return withSecurityHeaders(await route(request, env));
  },
};

async function route(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);

  if (url.hostname.startsWith("www.")) {
    url.hostname = url.hostname.slice(4);
    return Response.redirect(url.toString(), 301);
  }

  if (url.pathname === "/api/new-game") {
    const result = newGame(url.searchParams);
    if (!result.ok) {
      return Response.json({ error: result.error }, { status: result.status });
    }
    return Response.json(
      { categories: result.categories },
      { headers: { "Cache-Control": "no-store" } },
    );
  }

  if (url.pathname === "/api/daily") {
    const store = env.BOARDS ? kvBoardStore(env.BOARDS, FREEZE_TTL_SECONDS) : undefined;
    const result = await dailyGame(url.searchParams, { store });
    if (!result.ok) {
      return Response.json({ error: result.error }, { status: result.status });
    }
    // Unlike /api/new-game, this response is identical for every caller until
    // midnight in Oslo, so it can be cached at the edge for exactly that long.
    // The board is not secret — it is the same one everyone is playing — so
    // there is nothing to leak by holding it in a shared cache.
    return Response.json(
      { date: result.date, categories: result.categories },
      { headers: { "Cache-Control": `public, s-maxage=${secondsUntilNextDay()}` } },
    );
  }

  return env.ASSETS.fetch(request);
}
