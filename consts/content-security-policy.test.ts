import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { CONTENT_SECURITY_POLICY } from "~/consts/content-security-policy";
import { SECURITY_HEADERS } from "~/consts/security-headers";

// Every page is a static file, so its headers come from public/_headers
// rather than the Worker; the two copies must match.
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

  // The build hashes the inline scripts into this one line, so no other rule
  // may send a policy of its own: the browser would enforce both.
  it("public/_headers sends the Worker's policy on every static file, once", () => {
    expect(rules.get("/*")?.get("content-security-policy")).toBe(
      CONTENT_SECURITY_POLICY
    );
    expect(
      [...rules.values()].filter(headers =>
        headers.has("content-security-policy")
      )
    ).toHaveLength(1);
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
