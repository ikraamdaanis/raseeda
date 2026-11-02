import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { CONTENT_SECURITY_POLICY } from "~/consts/content-security-policy";
import { SECURITY_HEADERS } from "~/consts/security-headers";

// The pre-rendered pages are static files, so their headers come from
// public/_headers rather than the Worker; the two copies must match.
function readHeaderRules() {
  const rules = new Map<string, Map<string, string>>();
  let currentHeaders: Map<string, string> | undefined;

  for (const line of readFileSync("public/_headers", "utf8").split("\n")) {
    if (line.trim() === "" || line.trimStart().startsWith("#")) continue;

    if (!line.startsWith(" ")) {
      currentHeaders = new Map();
      rules.set(line.trim(), currentHeaders);
      continue;
    }

    const separator = line.indexOf(":");

    currentHeaders?.set(
      line.slice(0, separator).trim().toLowerCase(),
      line.slice(separator + 1).trim()
    );
  }

  return rules;
}

describe("Content-Security-Policy", () => {
  const rules = readHeaderRules();

  it.each([
    "/",
    "/index.html",
    "/invoice-template",
    "/invoice-template.html",
    "/privacy",
    "/privacy.html"
  ])("public/_headers sends the Worker's policy for %s", path => {
    expect(rules.get(path)?.get("content-security-policy")).toBe(
      CONTENT_SECURITY_POLICY
    );
  });

  // Other sites get no Referer; the site's own pages keep it, so a page loaded
  // from another of its pages counts as a move within the site (utils/track.ts)
  // rather than a new visit.
  it("sends a Referer only within the site", () => {
    expect(SECURITY_HEADERS["Referrer-Policy"]).toBe("same-origin");
  });

  it.each(Object.entries(SECURITY_HEADERS))(
    "public/_headers sends the Worker's %s on every static file",
    (name, value) => {
      expect(rules.get("/*")?.get(name.toLowerCase())).toBe(value);
    }
  );
});
