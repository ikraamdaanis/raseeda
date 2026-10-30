import type { Page } from "@playwright/test";
import { expect, test } from "./fixtures";
import { gotoEditorSettled, nameInvoice, savedContains } from "./helpers";

// Group A: home / landing page.

function headerCta(page: Page) {
  return page
    .getByRole("banner")
    .getByRole("link", { name: "Open the editor", exact: true });
}

function heroCta(page: Page) {
  return page
    .getByRole("main")
    .getByRole("link", { name: "Create invoice", exact: true })
    .first();
}

test("home renders the hero and header CTAs", async ({ page }) => {
  await page.goto("/");

  await expect(heroCta(page)).toBeVisible();
  await expect(headerCta(page)).toBeVisible();
});

test("the header CTA navigates to the editor", async ({ page }) => {
  await page.goto("/");

  await headerCta(page).click();
  await expect(page).toHaveURL("/create");
});

test("the hero CTA navigates to the editor", async ({ page }) => {
  await page.goto("/");

  await heroCta(page).click();
  await expect(page).toHaveURL("/create");
});

test("in-page anchor links scroll to their sections", async ({ page }) => {
  await page.goto("/");

  const nav = page.getByRole("navigation");

  await nav.getByRole("link", { name: "Features" }).click();
  await expect(page.locator("#features")).toBeInViewport();

  await nav.getByRole("link", { name: "Questions" }).click();
  await expect(page.locator("#questions")).toBeInViewport();

  await nav.getByRole("link", { name: "Compare" }).click();
  await expect(page.locator("#compare")).toBeInViewport();
});

test("the header CTA is a single link, not a nested button [R]", async ({
  page
}) => {
  await page.goto("/");

  // Guards the <a><button> nesting from the audit: the CTA renders as one link
  // (one tab stop), with no nested button element.
  const cta = headerCta(page);

  await expect(cta).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Open the editor", exact: true })
  ).toHaveCount(0);

  await cta.focus();
  await expect(cta).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL("/create");
});

test("the open=invoices hand-off opens the saved-invoice list", async ({
  page
}) => {
  await gotoEditorSettled(page);
  await nameInvoice(page, "Returning client");

  await page.goto("/create?open=invoices");

  await expect(
    page.getByRole("dialog", { name: "Open Invoice" })
  ).toBeVisible();
  await expect(page).toHaveURL("/create");
});

test("a font hand-off never restyles work in progress", async ({ page }) => {
  await gotoEditorSettled(page);
  await page.getByLabel("Invoice title").fill("Half-finished invoice");
  await expect
    .poll(() => savedContains(page, "Half-finished invoice"))
    .toBe(true);

  await page.goto("/create?font=lora");

  await expect(page.getByLabel("Invoice title")).toHaveValue(
    "Half-finished invoice"
  );
  await expect(page.locator(".bg-paper").first()).not.toHaveCSS(
    "font-family",
    /Lora/
  );
});

test("the homepage makes no requests to other websites", async ({ page }) => {
  const requested: string[] = [];

  page.on("request", request => requested.push(request.url()));

  await page.goto("/");
  await page
    .getByRole("heading", { name: "Your next invoice starts here." })
    .scrollIntoViewIfNeeded();
  await page.waitForLoadState("networkidle");

  const homeOrigin = new URL(page.url()).origin;
  const elsewhere = requested.filter(requestUrl => {
    const url = new URL(requestUrl);

    return url.protocol.startsWith("http") && url.origin !== homeOrigin;
  });

  expect(requested.length).toBeGreaterThan(0);
  expect(elsewhere).toEqual([]);
});

test("the header offers Create invoice once the hero scrolls away", async ({
  page
}) => {
  await page.goto("/");

  const banner = page.getByRole("banner");
  const headerPill = banner.getByRole("link", {
    name: "Create invoice",
    exact: true
  });

  await expect(headerPill).toHaveCount(0);

  await page.locator("#privacy").scrollIntoViewIfNeeded();
  await expect(headerPill).toBeVisible();
  await expect(banner).toBeInViewport();

  await headerPill.click();
  await expect(page).toHaveURL("/create");
});
