import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { SECURITY_HEADERS, THEME_SCRIPT_HASH, withSecurityHeaders } from "./securityHeaders";

// Not import.meta.url: under the happy-dom environment that is an http URL.
const html = readFileSync(path.join(process.cwd(), "index.html"), "utf8");
const inlineScripts = [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)].map(
  (m) => m[1],
);

describe("CSP script hashes", () => {
  it("covers every inline script in index.html", () => {
    // Vite copies inline (non-module) scripts into dist/index.html verbatim, so
    // hashing the source is equivalent to hashing what ships. Editing the theme
    // script fails here instead of silently blocking it in production.
    expect(inlineScripts).toHaveLength(1);
    const hash = createHash("sha256").update(inlineScripts[0], "utf8").digest("base64");
    expect(THEME_SCRIPT_HASH).toBe(`sha256-${hash}`);
    expect(SECURITY_HEADERS["Content-Security-Policy"]).toContain(`'${THEME_SCRIPT_HASH}'`);
  });
});

describe("withSecurityHeaders", () => {
  it("adds the headers while preserving status, body and existing headers", async () => {
    const res = await withSecurityHeaders(
      Response.json({ ok: 1 }, { headers: { "Cache-Control": "no-store" } }),
    );
    expect(res.status).toBe(200);
    expect(res.headers.get("Cache-Control")).toBe("no-store");
    expect(res.headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(res.headers.get("Content-Security-Policy")).toContain("frame-ancestors 'none'");
    expect(await res.json()).toEqual({ ok: 1 });
  });

  it("works on a response with immutable headers, as the ASSETS binding returns", () => {
    // Response.redirect() and asset responses both come back header-immutable;
    // setting headers in place on those throws.
    const res = withSecurityHeaders(Response.redirect("https://taksonomi.app/", 301));
    expect(res.status).toBe(301);
    expect(res.headers.get("Location")).toBe("https://taksonomi.app/");
    expect(res.headers.get("Strict-Transport-Security")).toContain("max-age=31536000");
  });
});
