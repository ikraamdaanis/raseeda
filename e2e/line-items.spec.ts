import { expect, test } from "./fixtures";
import { addLineItem, gotoEditorReady, setNumber } from "./helpers";

// Group C: line items. The numeric fields coerce input (strip non-digits and
// signs, tolerate fractions) and the amount recomputes live, so these are the
// most defect-prone cells in the editor.

test("adds and removes line items", async ({ page }) => {
  await gotoEditorReady(page);

  await expect(page.getByLabel("Item, item 1")).toBeVisible();
  await expect(page.getByLabel("Item, item 2")).toHaveCount(0);

  await addLineItem(page);
  await expect(page.getByLabel("Item, item 2")).toBeVisible();

  await addLineItem(page);
  await expect(page.getByLabel("Item, item 3")).toBeVisible();

  await page.getByRole("button", { name: "Remove item 3" }).click();
  await expect(page.getByLabel("Item, item 3")).toHaveCount(0);

  await page.getByRole("button", { name: "Remove item 2" }).click();
  await expect(page.getByLabel("Item, item 2")).toHaveCount(0);

  // The last remaining item cannot be removed, so its remove button is gone.
  await expect(page.getByRole("button", { name: "Remove item 1" })).toHaveCount(
    0
  );
});

test("amount recomputes live as quantity and price change", async ({
  page
}) => {
  await gotoEditorReady(page);

  const quantity = page.getByLabel("Quantity, item 1");
  const unitPrice = page.getByLabel("Unit Price, item 1");
  const amount = page.getByLabel("Amount, item 1");

  await setNumber(quantity, "3");
  await setNumber(unitPrice, "100");
  await expect(amount).toHaveText("$300.00");

  await setNumber(quantity, "4");
  await expect(amount).toHaveText("$400.00");

  await setNumber(unitPrice, "2.5");
  await expect(amount).toHaveText("$10.00");
});

test("accepts fractional quantities", async ({ page }) => {
  await gotoEditorReady(page);

  await setNumber(page.getByLabel("Quantity, item 1"), "2.5");
  await setNumber(page.getByLabel("Unit Price, item 1"), "4");
  await expect(page.getByLabel("Amount, item 1")).toHaveText("$10.00");
});

test("coerces non-numeric input to zero, never NaN", async ({ page }) => {
  await gotoEditorReady(page);

  const quantity = page.getByLabel("Quantity, item 1");
  const amount = page.getByLabel("Amount, item 1");

  await setNumber(page.getByLabel("Unit Price, item 1"), "50");
  await setNumber(quantity, "3");
  await expect(amount).toHaveText("$150.00");

  await setNumber(quantity, "abc");
  await expect(amount).toHaveText("$0.00");
  await expect(amount).not.toContainText("NaN");
});

test("keeps a leading minus, so a line can be a credit", async ({ page }) => {
  await gotoEditorReady(page);

  const quantity = page.getByLabel("Quantity, item 1");

  await setNumber(quantity, "-5");
  await expect(quantity).toHaveValue("-5");

  await setNumber(page.getByLabel("Unit Price, item 1"), "10");
  await expect(page.getByLabel("Amount, item 1")).toHaveText("-$50.00");

  await setNumber(quantity, "5-");
  await expect(quantity).toHaveValue("5");
});

test("handles many items without losing rows", async ({ page }) => {
  await gotoEditorReady(page);

  for (let index = 0; index < 5; index++) {
    await addLineItem(page);
  }

  await expect(page.getByLabel("Item, item 6")).toBeVisible();

  await page.getByLabel("Item, item 6").fill("Sixth item");
  await expect(page.getByLabel("Item, item 6")).toHaveValue("Sixth item");
});
