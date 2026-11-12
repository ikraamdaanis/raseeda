import { expect, test } from "./fixtures";
import {
  clickFileMenuItem,
  gotoEditorReady,
  invoicesPanel,
  libraryRow,
  nameInvoice,
  savedContains
} from "./helpers";

// Two pages in one browser context share IndexedDB and Web Locks, as two tabs
// do. One tab edits an invoice at a time; the other follows it read-only.

test("a second tab on the same invoice follows it read-only", async ({
  page
}) => {
  await gotoEditorReady(page, "Shared title");

  const second = await page.context().newPage();

  await second.goto("/create");

  await expect(second.getByText("Open in another tab")).toBeVisible();
  await expect(second.getByLabel("Invoice title")).toHaveValue("Shared title");
  await expect(second.getByLabel("Invoice title")).toHaveAttribute(
    "readonly",
    ""
  );

  await page.bringToFront();
  await page.getByLabel("Invoice title").fill("Edited in the first tab");

  await expect(second.getByLabel("Invoice title")).toHaveValue(
    "Edited in the first tab"
  );
});

test("Edit here takes the invoice over and the first tab follows", async ({
  page
}) => {
  await gotoEditorReady(page, "Shared title");

  const second = await page.context().newPage();

  await second.goto("/create");
  await second.getByRole("button", { name: "Edit here" }).click();

  await expect(second.getByRole("button", { name: "Edit here" })).toHaveCount(
    0
  );
  await expect(page.getByText("Open in another tab")).toBeVisible();

  await second.getByLabel("Invoice title").fill("Now the second tab's");

  await expect(page.getByLabel("Invoice title")).toHaveValue(
    "Now the second tab's"
  );
  await expect
    .poll(() => savedContains(second, "Now the second tab's"))
    .toBe(true);
});

test("two tabs never overwrite each other", async ({ page }) => {
  await gotoEditorReady(page, "Round one");

  const second = await page.context().newPage();

  await second.goto("/create");

  for (const [tab, other, text] of [
    [second, page, "From the second tab"],
    [page, second, "From the first tab"],
    [second, page, "Second tab again"]
  ] as const) {
    await tab.bringToFront();
    await tab.getByRole("button", { name: "Edit here" }).click();
    await tab.getByLabel("From details").fill(text);
    await expect(other.getByLabel("From details")).toHaveValue(text);
  }

  await expect.poll(() => savedContains(page, "Second tab again")).toBe(true);
  expect(await savedContains(page, "From the first tab")).toBe(false);
});

test("the read-only tab edits once the editing tab moves on", async ({
  page
}) => {
  await gotoEditorReady(page, "Handed on");

  const second = await page.context().newPage();

  await second.goto("/create");
  await expect(second.getByRole("button", { name: "Edit here" })).toBeVisible();

  await page.bringToFront();
  await clickFileMenuItem(page, "New Invoice");

  await expect(second.getByRole("button", { name: "Edit here" })).toHaveCount(
    0
  );
  await second.getByLabel("Invoice title").fill("Edited after the hand-on");
  await expect
    .poll(() => savedContains(second, "Edited after the hand-on"))
    .toBe(true);
});

test("deleting the open invoice in another tab stops this tab writing it", async ({
  page
}) => {
  await gotoEditorReady(page, "To be deleted");
  await nameInvoice(page, "Doomed invoice");

  const second = await page.context().newPage();

  // The second tab opens the same invoice, read-only; it moves to a new one.
  await second.goto("/create");
  await expect(second.getByRole("button", { name: "Edit here" })).toBeVisible();
  await clickFileMenuItem(second, "New Invoice");
  await clickFileMenuItem(second, "Open Invoice");
  await invoicesPanel(second)
    .getByRole("button", { name: "Actions for Doomed invoice" })
    .click();
  await second.getByRole("menuitem", { name: "Delete…" }).click();
  await second
    .getByRole("dialog", { name: "Delete this invoice?" })
    .getByRole("button", { name: "Delete invoice" })
    .click();
  await expect(libraryRow(second, "Doomed invoice")).toHaveCount(0);

  await page.bringToFront();
  await expect(page.getByText("Deleted in another tab")).toBeVisible();
  await page.waitForTimeout(1500);

  expect(await savedContains(page, "Doomed invoice")).toBe(false);

  await page.getByRole("button", { name: "Keep a copy" }).click();

  await expect.poll(() => savedContains(page, "To be deleted")).toBe(true);
});

test("a second tab sees an invoice named in the first", async ({ page }) => {
  await gotoEditorReady(page, "Shared title");
  await nameInvoice(page, "Shared doc");

  const second = await page.context().newPage();

  // The second tab opens the same invoice, read-only; it moves to a new one.
  await second.goto("/create");
  await expect(second.getByRole("button", { name: "Edit here" })).toBeVisible();
  await clickFileMenuItem(second, "New Invoice");
  await clickFileMenuItem(second, "Open Invoice");

  await expect(libraryRow(second, "Shared doc")).toBeVisible();
});
