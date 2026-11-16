import { configDefaults, defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    tsconfigPaths: true
  },
  test: {
    environment: "node",
    // Installs an in-memory IndexedDB before any test module loads, so Dexie
    // (which captures globalThis.indexedDB at import) picks it up. Kept in setup
    // rather than per-file imports so import-order tooling can't reorder it
    // behind Dexie and break the db/migration tests.
    setupFiles: ["fake-indexeddb/auto"],
    include: ["**/*.test.ts"],
    // Sandcastle's worktrees are other checkouts of this repo.
    exclude: [...configDefaults.exclude, ".sandcastle/**"]
  }
});
