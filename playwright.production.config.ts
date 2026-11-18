import { defineConfig, devices } from "@playwright/test";

// The checks only the production build can answer: the service worker, the
// prerendered pages and the headers they're served with. Built once, then
// served by `vite preview`, which runs the Worker as Cloudflare does.
// `bun run test:e2e:production` runs them.
const port = Number(process.env.E2E_PRODUCTION_PORT ?? 4319);

export default defineConfig({
  testDir: "./e2e/production",
  testMatch: "**/*.spec.ts",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [["github"], ["list"]] : [["list"]],
  use: {
    baseURL: `http://localhost:${port}`,
    screenshot: "only-on-failure"
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: `bun run build && bun run serve --port ${port} --strictPort`,
    url: `http://localhost:${port}`,
    reuseExistingServer: !process.env.CI,
    timeout: 300_000
  }
});
