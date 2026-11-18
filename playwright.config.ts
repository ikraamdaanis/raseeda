import { defineConfig, devices } from "@playwright/test";

// E2E suite lives in ./e2e and uses *.spec.ts so it never collides with the
// Vitest suite (which owns **/*.test.ts). testMatch is pinned to *.spec.ts for
// the same reason: Playwright's default testMatch would otherwise sweep up the
// Vitest files.
// Another checkout's dev server may already hold the default port; E2E_PORT
// runs this one's on its own.
const port = Number(process.env.E2E_PORT ?? 3000);

export default defineConfig({
  testDir: "./e2e",
  testMatch: "**/*.spec.ts",
  // Run against the production build by playwright.production.config.ts.
  testIgnore: "production/**",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? [["html"], ["github"], ["list"]] : [["list"]],
  use: {
    baseURL: `http://localhost:${port}`,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure"
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] }
    },
    // Safari is where storage is most fragile (it clears storage after a week
    // unused, and writes during page exit are least reliable), so autosave,
    // multi-tab and undo also run in WebKit.
    {
      name: "webkit",
      use: { ...devices["Desktop Safari"] },
      testMatch: ["autosave.spec.ts", "multitab.spec.ts", "undo.spec.ts"]
    }
  ],
  webServer: {
    command: `bun run dev --port ${port} --strictPort`,
    url: `http://localhost:${port}`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000
  }
});
