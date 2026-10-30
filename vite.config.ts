import { cloudflare } from "@cloudflare/vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import type { Plugin } from "vite";
import { defineConfig } from "vite";

// Writes the service worker (scripts/service-worker.js) into the client build
// as /sw.js, headed by the files it saves on install: every script and style,
// and each font's latin subset. The version names its cache, so a build with
// any changed file installs fresh.
function serviceWorker(): Plugin {
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
        .update(files.join("\n"))
        .update(template)
        .digest("hex")
        .slice(0, 12);

      this.emitFile({
        type: "asset",
        fileName: "sw.js",
        source: `const BUILD = ${JSON.stringify({ version, files })};\n\n${template}`
      });
    }
  };
}

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
    // The homepage and the privacy page are the same for every visitor, so
    // they are rendered once at build time and served as static files instead
    // of by the Worker on each request. Their security headers then come from
    // public/_headers. The privacy page is written as privacy.html, not
    // privacy/index.html, so it is served at /privacy with no redirect to a
    // trailing slash. Every page listed here goes into the generated
    // sitemap.xml; the editor is listed but rendered by the Worker.
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
        host: "https://billsend.io"
      },
      pages: [
        { path: "/", prerender: { enabled: true } },
        { path: "/create", prerender: { enabled: false } },
        {
          path: "/privacy",
          prerender: { enabled: true, autoSubfolderIndex: false }
        }
      ]
    }),
    viteReact(),
    serviceWorker()
  ]
});
