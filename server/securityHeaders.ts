/**
 * Security headers applied to every response the Worker returns.
 *
 * The app pulls in no third-party resources at runtime (the font is
 * self-hosted), so `default-src 'self'` costs nothing here and keeps any future
 * XSS from reaching a network sink. Two carve-outs are unavoidable:
 *
 *   - `script-src` needs a hash for the inline theme script in index.html,
 *     which has to run before first paint (an external file would flash). The
 *     hash is re-derived from index.html in securityHeaders.test.ts, so editing
 *     that script without updating the hash fails the test rather than the
 *     deployed site.
 *   - `style-src` needs 'unsafe-inline' because the board sets per-tile values
 *     (animation delays, --group-hue, --header-height) as style attributes.
 *     CSP offers no hash or nonce for style *attributes*; `style-src-attr`
 *     would be more precise but is not reliably supported in Safari, where
 *     falling back to a bare `style-src 'self'` would break the board.
 */

/** sha256 of the inline theme script in index.html, base64, as CSP spells it. */
export const THEME_SCRIPT_HASH = "sha256-qlOgOBYZZS/qRhK9/BsxlICJmFTn9Qj+zSRqm6dQaow=";

const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  `script-src 'self' '${THEME_SCRIPT_HASH}'`,
  "style-src 'self' 'unsafe-inline'",
  // data: covers the inline SVG arrow in PosterModal.css.
  "img-src 'self' data:",
  "font-src 'self'",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'none'",
  "frame-ancestors 'none'",
].join("; ");

export const SECURITY_HEADERS: Record<string, string> = {
  "Content-Security-Policy": CONTENT_SECURITY_POLICY,
  "X-Content-Type-Options": "nosniff",
  // frame-ancestors already covers this in modern browsers; kept for old ones.
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  // The site is HTTPS-only behind Cloudflare and has no subdomain serving plain
  // HTTP. Not preloaded — that is a separate, hard-to-reverse commitment.
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
  "Permissions-Policy": "geolocation=(), camera=(), microphone=()",
};

/**
 * Copies `res` with the security headers applied. Responses from the ASSETS
 * binding have immutable headers, so setting them in place is not an option.
 */
export function withSecurityHeaders(res: Response): Response {
  const out = new Response(res.body, res);
  for (const [name, value] of Object.entries(SECURITY_HEADERS)) out.headers.set(name, value);
  return out;
}
