import { expect, test } from "@playwright/test";

// Once the editor has loaded, the service worker holds everything a PDF needs,
// so one can be made with no network (issue #228).

test.beforeEach(async ({ context }) => {
  // Keeps the tests out of the usage counts.
  await context.route("**/api/event", route => route.abort());
});

test("a PDF downloads offline once the editor has loaded", async ({
  page,
  context
}) => {
  await page.goto("/create");
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null);
  await context.setOffline(true);

  await page.getByLabel("Invoice title").fill("Offline invoice");

  const downloadPromise = page.waitForEvent("download");

  await page.getByRole("button", { name: "Download", exact: true }).click();
  await page.getByRole("button", { name: "Download PDF" }).click();

  expect((await downloadPromise).suggestedFilename()).toMatch(/\.pdf$/);
});
