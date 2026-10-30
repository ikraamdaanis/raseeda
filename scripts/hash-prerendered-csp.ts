import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { CONTENT_SECURITY_POLICY } from "~/consts/content-security-policy";
import { EDITOR_THEME_SCRIPT } from "~/utils/editor-theme";
import {
  hashInlineScripts,
  replaceHeaderPolicies
} from "~/utils/prerendered-csp";

// Runs after `vite build` (the build script). The homepage and the privacy
// page are rendered at build time, so their inline scripts are known: this
// writes their hashes into the built _headers in place of 'unsafe-inline',
// so those pages run their own inline scripts and no others. public/_headers
// keeps the base policy, which the Worker's pages still use.

const CLIENT_DIR = join(import.meta.dir, "..", "dist", "client");

// A link from these pages opens the editor without loading a new document, so
// the router adds the editor route's head script under this page's policy:
// every route's `head().scripts` with a body belongs here.
const NAVIGATION_SCRIPTS = [EDITOR_THEME_SCRIPT];

// Each pre-rendered page's file, and the paths it is served at.
const PAGES = [
  { file: "index.html", paths: ["/", "/index.html"] },
  { file: "privacy.html", paths: ["/privacy", "/privacy.html"] }
];

const policies: Record<string, string> = {};

for (const page of PAGES) {
  const html = await readFile(join(CLIENT_DIR, page.file), "utf8");
  const policy = hashInlineScripts(
    CONTENT_SECURITY_POLICY,
    html,
    NAVIGATION_SCRIPTS
  );

  for (const path of page.paths) policies[path] = policy;
}

const headersFile = join(CLIENT_DIR, "_headers");
const headers = await readFile(headersFile, "utf8");

await writeFile(headersFile, replaceHeaderPolicies(headers, policies));
