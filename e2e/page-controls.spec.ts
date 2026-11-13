import type { Page } from "@playwright/test";
import { expect, test } from "./fixtures";
import { gotoEditorReady, isoToday, setNumber } from "./helpers";

// Issue #123: whatever prints is changed on the page; the inspector holds how
// the invoice looks and reads.

function modeButton(page: Page, name: "Edit" | "Preview") {
  return page
    .getByRole("group", { name: "Mode" })
    .getByRole("button", { name });
}

function inspector(page: Page) {
  return page.getByRole("complementary", { name: "Inspector" });
}

test("the inspector keeps looks and format, not values or sections", async ({
  page
}) => {
  await gotoEditorReady(page);

  const panel = inspector(page);

  await expect(panel.getByRole("button", { name: "Format" })).toBeVisible();
  await expect(panel.getByRole("button", { name: "Sections" })).toHaveCount(0);
  await expect(panel.getByLabel("Issue date")).toHaveCount(0);
  await expect(panel.getByLabel("Payment terms")).toHaveCount(0);
  await expect(panel.getByLabel("Currency", { exact: true })).toHaveCount(0);
  await expect(panel.getByLabel("Number format")).toBeVisible();
  await expect(panel.getByLabel("Paper")).toBeVisible();
});

test("a footer part is added from its slot and hidden with its ×", async ({
  page
}) => {
  await gotoEditorReady(page);

  await page.getByRole("button", { name: "Add to the footer" }).click();
  await page.getByRole("menuitem", { name: "Notes" }).click();

  const notes = page.getByLabel("Notes content");

  await expect(notes).toBeVisible();

  await notes.fill("Thanks for your business");
  await modeButton(page, "Preview").click();

  await expect(
    page.getByRole("button", { name: "Add to the footer" })
  ).toHaveCount(0);

  await modeButton(page, "Edit").click();
  await page.getByLabel("Notes content").hover();
  await page.getByRole("button", { name: "Hide notes" }).click();

  await expect(page.getByLabel("Notes content")).toHaveCount(0);
});

test("an area with one part to add names it", async ({ page }) => {
  await gotoEditorReady(page);

  await page.getByRole("button", { name: "Date of supply" }).click();

  await expect(
    page.getByLabel("Date of supply", { exact: true })
  ).toBeVisible();

  await page.getByRole("button", { name: "Hide logo" }).click();
  await page.getByRole("button", { name: "Logo", exact: true }).click();

  await expect(
    page.getByRole("button", { name: /Upload invoice logo/ })
  ).toBeVisible();
});

test("a totals row hides with its × and comes back from the totals slot", async ({
  page
}) => {
  await gotoEditorReady(page);

  await setNumber(page.getByLabel("Quantity, item 1"), "1");
  await setNumber(page.getByLabel("Unit Price, item 1"), "100");
  await setNumber(page.getByLabel("Fees amount"), "20");
  await expect(page.getByTestId("total-value")).toHaveText("$120.00 USD");

  await page.getByLabel("Fees amount").hover();
  await page.getByRole("button", { name: "Hide fees" }).click();

  await expect(page.getByLabel("Fees amount")).toHaveCount(0);
  await expect(page.getByTestId("total-value")).toHaveText("$100.00 USD");

  await page.getByRole("button", { name: "Fees", exact: true }).click();

  await expect(page.getByTestId("total-value")).toHaveText("$120.00 USD");
});

test("the total opens the currency and the second currency", async ({
  page
}) => {
  await gotoEditorReady(page);

  await setNumber(page.getByLabel("Quantity, item 1"), "1");
  await setNumber(page.getByLabel("Unit Price, item 1"), "100");

  await page.getByRole("button", { name: /Change currency/ }).click();
  await page
    .getByRole("combobox", { name: "Currency", exact: true })
    .selectOption("€");

  await expect(page.getByTestId("subtotal-value")).toHaveText("€100.00");

  await page
    .getByRole("button", { name: "Also show in another currency" })
    .click();

  await expect(
    page.getByRole("combobox", { name: "Also show in" })
  ).toBeFocused();
  await expect(page.getByLabel(/Exchange rate, [A-Z]+ per EUR/)).toBeVisible();

  await page.keyboard.press("Escape");
  await modeButton(page, "Preview").click();

  await expect(
    page.getByRole("button", { name: /Change currency/ })
  ).toHaveCount(0);
});

test("the due date's calendar sets payment terms from the issue date", async ({
  page
}) => {
  await gotoEditorReady(page);

  const dueDate = page.getByLabel("Due date", { exact: true });

  await dueDate.click();
  await page
    .getByRole("group", { name: "Payment terms" })
    .getByRole("button", { name: "Net 30" })
    .click();

  await expect(dueDate).toHaveAttribute("data-date", isoToday(30));

  await dueDate.click();

  await expect(
    page
      .getByRole("group", { name: "Payment terms" })
      .getByRole("button", { name: "Net 30" })
  ).toHaveAttribute("aria-pressed", "true");
});

test("the paid stamp is switched on beside the amount paid", async ({
  page
}) => {
  await gotoEditorReady(page);

  await setNumber(page.getByLabel("Quantity, item 1"), "1");
  await setNumber(page.getByLabel("Unit Price, item 1"), "100");
  await setNumber(page.getByLabel("Tax percentage"), "0");

  const stamp = page.getByRole("button", { name: "Toggle paid stamp" });

  await expect(stamp).toHaveAttribute("aria-pressed", "false");

  await stamp.click();
  await setNumber(page.getByLabel("Amount paid", { exact: true }), "100");

  await expect(
    page.locator('[data-field-area="title"]').getByText("PAID")
  ).toBeVisible();
  await expect(stamp).toHaveAttribute("aria-pressed", "true");
});
