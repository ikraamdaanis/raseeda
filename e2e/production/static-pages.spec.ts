import type { Page } from "@playwright/test";
import { expect, test } from "@playwright/test";
import { APP_NAME } from "../../consts/app";

// Every page, the editor and the 404 page included, is a static file sent
// with a policy that names the site's inline scripts by hash, and only
// /api/* runs the Worker (issue #237).

test.beforeEach(async ({ context }) => {
  // Keeps the tests out of the usage counts.
  await context.route("**/api/event", route => route.abort());
});

// Collects what the policy blocks, which the browser reports on the console.
function watchPolicy(page: Page) {
  const blocked: string[] = [];

  page.on("console", message => {
    if (message.text().includes("Content Security Policy")) {
      blocked.push(message.text());
    }
  });

  return blocked;
}

function scriptSources(policy: string | undefined) {
  return (
    policy
      ?.split("; ")
      .find(directive => directive.startsWith("script-src "))
      ?.split(" ") ?? []
  );
}

test("the editor is a static page whose policy allows no other inline script", async ({
  page
}) => {
  const blocked = watchPolicy(page);
  const response = await page.goto("/create");
  const sources = scriptSources(response?.headers()["content-security-policy"]);

  expect(response?.status()).toBe(200);
  expect(sources).not.toContain("'unsafe-inline'");
  expect(sources.some(source => source.startsWith("'sha256-"))).toBe(true);
  await expect(page.getByLabel("Invoice title")).toHaveValue("Invoice");
  expect(blocked).toEqual([]);
});

test("the editor still reads what the address asks for", async ({ page }) => {
  await page.goto("/create?template=quote");

  await expect(page.getByLabel("Invoice title")).toHaveValue("Quote");
});

for (const path of ["/no-such-page", "/a/b/c"]) {
  test(`${path} gets the static 404 page`, async ({ page }) => {
    const blocked = watchPolicy(page);
    const response = await page.goto(path);

    expect(response?.status()).toBe(404);
    expect(
      scriptSources(response?.headers()["content-security-policy"])
    ).not.toContain("'unsafe-inline'");
    await expect(page).toHaveTitle(`Page not found | ${APP_NAME}`);
    await expect(
      page.getByRole("heading", { name: "This page isn’t here." })
    ).toBeVisible();

    await page.getByRole("link", { name: "Back to home" }).click();
    await expect(page).toHaveURL("/");
    expect(blocked).toEqual([]);
  });
}

test("the homepage runs under the same policy", async ({ page }) => {
  const blocked = watchPolicy(page);

  await page.goto("/");
  await page.getByRole("heading", { level: 1 }).waitFor();
  expect(blocked).toEqual([]);
});

test("the usage events still reach the Worker", async ({ request }) => {
  const response = await request.get("/api/event");

  expect(response.status()).toBe(405);
});
