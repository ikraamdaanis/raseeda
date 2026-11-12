import { cloudflare } from "@cloudflare/vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import type { Plugin } from "vite";
import { defineConfig } from "vite";
import { SITE_TEMPLATES } from "./consts/site-templates.ts";

// Writes the service worker (scripts/service-worker.js) into the client build
// as /sw.js, headed by what it saves on install: the pages, every script and
// style, and each font's latin subset. The version names its cache, so a build
// with any changed page list or file installs fresh.
function serviceWorker(pages: string[]): Plugin {
  return {
    name: "service-worker",
    applyToEnvironment: environment => environment.name === "client",
    generateBundle(_options, bundle) {
      const files = Object.keys(bundle)
        .filter(
          fileName =>
            /\.(js|css)$/.test(fileName) ||
            /-latin-(?!ext)[^/]*\.woff2$/.test(fileName)
        )
        .sort()
        .map(fileName => `/${fileName}`);
      const template = readFileSync(
        new URL("scripts/service-worker.js", import.meta.url),
        "utf8"
      );
      const version = createHash("sha256")
        .update(pages.join("\n"))
        .update(files.join("\n"))
        .update(template)
        .digest("hex")
        .slice(0, 12);

      this.emitFile({
        type: "asset",
        fileName: "sw.js",
        source: `const BUILD = ${JSON.stringify({ version, pages, files })};\n\n${template}`
      });
    }
  };
}

function git(args: string[]) {
  return execFileSync("git", args, { encoding: "utf8" }).trim();
}

// A shallow clone's history stops at its latest commit, which would date every
// page to it. Workers Builds, which deploys the site, clones shallow
// (WORKERS_CI is set there), so it fetches the rest of the history first.
// Anywhere else a shallow clone is left as it is.
function makeHistoryComplete() {
  if (git(["rev-parse", "--is-shallow-repository"]) !== "true") return;
  if (process.env.WORKERS_CI !== "1") throw new Error("the clone is shallow");

  git(["fetch", "--quiet", "--unshallow"]);
}

// When any of a page's files last changed, from the last commit that touched
// them, for its sitemap lastmod. Google uses lastmod only while it matches the
// page's real changes, and TanStack writes the build date when it's unset, so
// every page would claim a change on every deploy. Without the history (no
// git, or a shallow clone) this warns and leaves lastmod unset.
function lastChanged(paths: string[]) {
  try {
    makeHistoryComplete();

    const date = git(["log", "-1", "--format=%cI", "--", ...paths]);

    if (!date) throw new Error(`no commit touches ${paths.join(", ")}`);

    return date;
  } catch (error) {
    console.warn(
      `[sitemap] No lastmod from git, so the build date stands in: ${error instanceof Error ? error.message : String(error)}`
    );

    return undefined;
  }
}

// Each page's files: what changes its content, structured data or links.
const PAGE_FILES = {
  home: [
    "app/routes/index.tsx",
    "components/home",
    "public/home",
    "utils/structured-data.ts"
  ],
  templates: [
    "app/routes/invoice-template.tsx",
    "components/templates",
    "components/home/site-chrome.tsx",
    "public/templates",
    "utils/structured-data.ts"
  ],
  siteTemplates: [
    "app/routes/$templatePage.tsx",
    "components/templates",
    "consts/site-templates.ts",
    "components/home/site-chrome.tsx",
    "public/templates",
    "utils/structured-data.ts"
  ],
  privacy: [
    "app/routes/privacy.tsx",
    "components/home/site-chrome.tsx",
    "utils/structured-data.ts"
  ]
};

// The pages the service worker serves from its cache, so they open offline.
const CACHED_PAGES = [
  "/",
  "/invoice-template",
  ...SITE_TEMPLATES.map(template => template.path),
  "/privacy",
  "/create"
];

export default defineConfig({
  server: {
    port: Number(process.env.PORT) || 3000
  },
  resolve: {
    tsconfigPaths: true
  },
  plugins: [
    cloudflare({ viteEnvironment: { name: "ssr" } }),
    tailwindcss(),
    // The homepage, the template pages and the privacy page are the same
    // for every visitor, so they are rendered once at build time and served as
    // static files instead of by the Worker on each request. Their security
    // headers then come from public/_headers. The other pages are written as
    // privacy.html and the like, not privacy/index.html, so each is served at
    // its path with no redirect to a trailing slash. Every page listed here
    // goes into the generated sitemap.xml, dated by its own files, except the
    // editor: it is rendered by the Worker and kept out of search results
    // (PAGE_META in utils/site-meta.ts). Google ignores priority and
    // changefreq, so they're left out.
    tanstackStart({
      srcDirectory: "./app",
      router: {
        routesDirectory: "./routes"
      },
      prerender: {
        enabled: true,
        autoStaticPathsDiscovery: false,
        crawlLinks: false
      },
      sitemap: {
        host: "https://raseeda.com"
      },
      pages: [
        {
          path: "/",
          prerender: { enabled: true },
          sitemap: { lastmod: lastChanged(PAGE_FILES.home) }
        },
        {
          path: "/create",
          prerender: { enabled: false },
          sitemap: { exclude: true }
        },
        {
          path: "/invoice-template",
          prerender: { enabled: true, autoSubfolderIndex: false },
          sitemap: { lastmod: lastChanged(PAGE_FILES.templates) }
        },
        ...SITE_TEMPLATES.map(template => ({
          path: template.path,
          prerender: { enabled: true, autoSubfolderIndex: false },
          sitemap: { lastmod: lastChanged(PAGE_FILES.siteTemplates) }
        })),
        {
          path: "/privacy",
          prerender: { enabled: true, autoSubfolderIndex: false },
          sitemap: { lastmod: lastChanged(PAGE_FILES.privacy) }
        }
      ]
    }),
    viteReact(),
    serviceWorker(CACHED_PAGES)
  ]
});
