import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { CONTENT_SECURITY_POLICY } from "~/consts/content-security-policy";
import {
  getInlineScriptHashes,
  hashInlineScripts,
  replaceHeaderPolicies
} from "~/utils/prerendered-csp";

function hashOf(body: string) {
  return `'sha256-${createHash("sha256").update(body).digest("base64")}'`;
}

describe("getInlineScriptHashes", () => {
  it("hashes the inline scripts the browser runs and skips the rest", () => {
    const html = [
      `<script>var a = 1;</script>`,
      `<script data-tsr-stream-part="">var b = 2;</script>`,
      `<script type="module">import("/x.js");</script>`,
      `<script type="application/ld+json">{"@type":"WebSite"}</script>`,
      `<script type="module" async="" src="/assets/index.js"></script>`
    ].join("");

    expect(getInlineScriptHashes(html)).toEqual([
      hashOf("var a = 1;"),
      hashOf("var b = 2;"),
      hashOf(`import("/x.js");`)
    ]);
  });
});

describe("hashInlineScripts", () => {
  it("swaps 'unsafe-inline' in script-src for the page's hashes", () => {
    const policy = hashInlineScripts(
      CONTENT_SECURITY_POLICY,
      "<script>run();</script>"
    );

    expect(policy).toContain(
      `script-src 'self' 'wasm-unsafe-eval' ${hashOf("run();")}`
    );
    expect(policy).toContain("style-src 'self' 'unsafe-inline'");
    expect(policy).not.toMatch(/script-src[^;]*'unsafe-inline'/);
  });
});

describe("replaceHeaderPolicies", () => {
  const headers = [
    "# Comment",
    "/*",
    "  X-Content-Type-Options: nosniff",
    "/",
    "  Content-Security-Policy: old",
    "/privacy",
    "  Content-Security-Policy: old",
    ""
  ].join("\n");

  it("replaces each listed path's policy and nothing else", () => {
    const result = replaceHeaderPolicies(headers, { "/": "new" });

    expect(result).toBe(
      headers.replace(
        "/\n  Content-Security-Policy: old",
        "/\n  Content-Security-Policy: new"
      )
    );
  });

  it("throws when a listed path has no policy line", () => {
    expect(() => replaceHeaderPolicies(headers, { "/missing": "new" })).toThrow(
      "/missing"
    );
  });
});
