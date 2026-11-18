import { readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { CONTENT_SECURITY_POLICY } from "~/consts/content-security-policy";
import { EDITOR_THEME_SCRIPT } from "~/utils/editor-theme";
import {
  hashInlineScripts,
  replaceHeaderPolicies
} from "~/utils/prerendered-csp";

// Runs after `vite build` (the build script). Every page, the editor and the
// 404 page included, is rendered at build time, so their inline scripts are
// known: this writes their hashes into the built _headers in place of
// 'unsafe-inline', as the one policy every static file is sent with. A page
// may then run any of the site's own inline scripts and no others.

const CLIENT_DIR = join(import.meta.dir, "..", "dist", "client");

// A link from one page opens another without loading a new document, so the
// router adds that route's head scripts under the first page's policy: every
// route's `head().scripts` with a body belongs here.
const NAVIGATION_SCRIPTS = [EDITOR_THEME_SCRIPT];

const pages = (await readdir(CLIENT_DIR)).filter(file =>
  file.endsWith(".html")
);

if (!pages.includes("create.html") || !pages.includes("404.html")) {
  throw new Error("The editor and the 404 page weren't pre-rendered.");
}

const html = await Promise.all(
  pages.map(file => readFile(join(CLIENT_DIR, file), "utf8"))
);
const policy = hashInlineScripts(
  CONTENT_SECURITY_POLICY,
  html.join("\n"),
  NAVIGATION_SCRIPTS
);
const headersFile = join(CLIENT_DIR, "_headers");
const headers = await readFile(headersFile, "utf8");

await writeFile(headersFile, replaceHeaderPolicies(headers, { "/*": policy }));
