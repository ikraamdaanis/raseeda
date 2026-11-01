import { rm } from "node:fs/promises";
import { join } from "node:path";

// Runs after `vite build` (the build script). TanStack Start writes
// pages.json, its page list and build time, beside the sitemap in the client
// build, which would publish it at /pages.json for crawlers to find. Nothing
// reads it once the build is done, so it is deleted.
await rm(join(import.meta.dir, "..", "dist", "client", "pages.json"), {
  force: true
});
