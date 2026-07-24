import { newGame } from "./newGame";
import { withSecurityHeaders } from "./securityHeaders";

interface Env {
  ASSETS: Fetcher;
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

  return env.ASSETS.fetch(request);
}
