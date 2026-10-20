import { createHash } from "node:crypto";

// An inline script: a <script> with no src. Its type decides whether it runs.
const INLINE_SCRIPT = /<script(\s[^>]*)?>([\s\S]*?)<\/script>/gi;

const SCRIPT_TYPE = /\btype\s*=\s*["']?([^"'\s>]+)/i;

// Script types the browser runs, and so the policy has to allow. Anything
// else, like the JSON-LD block, is data the policy never checks.
const RUNNABLE_TYPES = new Set(["", "module", "text/javascript"]);

/**
 * The hash of every inline script in `html` that the browser would run, in
 * the form a Content-Security-Policy source takes ('sha256-...').
 */
export function getInlineScriptHashes(html: string) {
  const hashes = new Set<string>();

  for (const [, attributes = "", body] of html.matchAll(INLINE_SCRIPT)) {
    if (/\bsrc\s*=/i.test(attributes)) continue;

    const type = SCRIPT_TYPE.exec(attributes)?.[1]?.toLowerCase() ?? "";

    if (!RUNNABLE_TYPES.has(type)) continue;

    const digest = createHash("sha256").update(body, "utf8").digest("base64");

    hashes.add(`'sha256-${digest}'`);
  }

  return [...hashes];
}

/**
 * `policy` with its script-src allowing exactly the inline scripts in `html`
 * by hash, in place of 'unsafe-inline'. A page rendered at build time has the
 * same inline scripts on every visit, so it can name them; one rendered per
 * request (by the Worker) can't, and keeps the base policy.
 */
export function hashInlineScripts(policy: string, html: string) {
  const hashes = getInlineScriptHashes(html);
  const directives = policy.split("; ");
  const scriptIndex = directives.findIndex(directive =>
    directive.startsWith("script-src ")
  );

  if (scriptIndex === -1) throw new Error("The policy has no script-src.");

  const sources = directives[scriptIndex]
    .split(" ")
    .slice(1)
    .filter(source => source !== "'unsafe-inline'");

  directives[scriptIndex] = ["script-src", ...sources, ...hashes].join(" ");

  return directives.join("; ");
}

/**
 * The build's `_headers` with each listed path's Content-Security-Policy
 * replaced by `policies[path]`. Throws if a path has no policy line, so a
 * changed `_headers` can't silently ship the unhashed policy.
 */
export function replaceHeaderPolicies(
  headers: string,
  policies: Record<string, string>
) {
  const replaced = new Set<string>();
  let currentPath: string | undefined;

  const lines = headers.split("\n").map(line => {
    if (line.trim() !== "" && !line.startsWith(" ") && !line.startsWith("#")) {
      currentPath = line.trim();

      return line;
    }

    const policy =
      currentPath === undefined ? undefined : policies[currentPath];
    const match = /^(\s+)Content-Security-Policy:/i.exec(line);

    if (!match || policy === undefined || currentPath === undefined) {
      return line;
    }

    replaced.add(currentPath);

    return `${match[1]}Content-Security-Policy: ${policy}`;
  });

  const missing = Object.keys(policies).filter(path => !replaced.has(path));

  if (missing.length > 0) {
    throw new Error(
      `_headers has no Content-Security-Policy for ${missing.join(", ")}.`
    );
  }

  return lines.join("\n");
}
