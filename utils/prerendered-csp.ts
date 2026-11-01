import { createHash } from "node:crypto";

// An inline script: a <script> with no src. Its type decides whether it runs.
const INLINE_SCRIPT = /<script(\s[^>]*)?>([\s\S]*?)<\/script>/gi;

const SCRIPT_TYPE = /\btype\s*=\s*["']?([^"'\s>]+)/i;

// Script types the browser runs, and so the policy has to allow. Anything
// else, like the JSON-LD block, is data the policy never checks.
const RUNNABLE_TYPES = new Set(["", "module", "text/javascript"]);

// A script's hash in the form a Content-Security-Policy source takes.
function hashScript(body: string) {
  const digest = createHash("sha256").update(body, "utf8").digest("base64");

  return `'sha256-${digest}'`;
}

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

    hashes.add(hashScript(body));
  }

  return [...hashes];
}

/**
 * `policy` with its script-src allowing exactly the inline scripts in `html`,
 * and the `navigationScripts` other pages add on a client-side visit, by
 * hash, in place of 'unsafe-inline'. A page rendered at build time has the
 * same inline scripts on every visit, so it can name them; one rendered per
 * request (by the Worker) can't, and keeps the base policy.
 */
export function hashInlineScripts(
  policy: string,
  html: string,
  navigationScripts: string[] = []
) {
  const hashes = [
    ...new Set([
      ...getInlineScriptHashes(html),
      ...navigationScripts.map(hashScript)
    ])
  ];
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
 * replaced by `policies[path]`. Throws if a listed path has no policy line, or
 * a policy line's path isn't listed, so neither a changed `_headers` nor a new
 * pre-rendered page can silently ship the unhashed policy.
 */
export function replaceHeaderPolicies(
  headers: string,
  policies: Record<string, string>
) {
  const replaced = new Set<string>();
  const unlisted = new Set<string>();
  let currentPath: string | undefined;

  const lines = headers.split("\n").map(line => {
    if (line.trim() !== "" && !line.startsWith(" ") && !line.startsWith("#")) {
      currentPath = line.trim();

      return line;
    }

    const match = /^(\s+)Content-Security-Policy:/i.exec(line);

    if (!match || currentPath === undefined) return line;

    if (!Object.hasOwn(policies, currentPath)) {
      unlisted.add(currentPath);

      return line;
    }

    replaced.add(currentPath);

    return `${match[1]}Content-Security-Policy: ${policies[currentPath]}`;
  });

  const missing = Object.keys(policies).filter(path => !replaced.has(path));

  if (missing.length > 0) {
    throw new Error(
      `_headers has no Content-Security-Policy for ${missing.join(", ")}.`
    );
  }

  if (unlisted.size > 0) {
    throw new Error(
      `No hashed Content-Security-Policy for ${[...unlisted].join(", ")}.`
    );
  }

  return lines.join("\n");
}
