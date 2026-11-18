import type { Page } from "@playwright/test";
import { expect, test } from "./fixtures";
import {
  clickFileMenuItem,
  newInvoiceOnPhone,
  pressShortcut,
  savedContains,
  setNumber
} from "./helpers";

// Items billed on past invoices are offered while a line's description is
// typed (issue #205), as clients are in the "To" block.

async function billWebsiteDesign(page: Page) {
  const title = page.getByRole("textbox", { name: "Invoice title" });

  await page.goto("/create");
  await title.fill("Past invoice");
  await expect.poll(() => savedContains(page, "Past invoice")).toBe(true);
  await page.getByLabel("Item, item 1").fill("Website design");
  await page.getByLabel("Unit, item 1").fill("hrs");
  await setNumber(page.getByLabel("Quantity, item 1"), "3");
  await setNumber(page.getByLabel("Unit Price, item 1"), "95");
  await expect.poll(() => savedContains(page, "Website design")).toBe(true);
  await expect.poll(() => savedContains(page, '"unitPrice":95')).toBe(true);
  await clickFileMenuItem(page, "New Invoice");
  await expect(title).toHaveValue("Invoice");
}

function suggestionList(page: Page) {
  return page.getByRole("listbox", { name: "Items from past invoices" });
}

test("picks an item from a past invoice, keeping the quantity, as one undo step", async ({
  page
}) => {
  await billWebsiteDesign(page);
  await setNumber(page.getByLabel("Quantity, item 1"), "2");

  const description = page.getByLabel("Item, item 1");

  await description.fill("web");
  await expect(suggestionList(page).getByRole("option")).toHaveText([
    /Website design.*\$95\.00 \/ hrs/
  ]);

  await description.press("ArrowDown");
  await expect(
    suggestionList(page).getByRole("option", { selected: true })
  ).toContainText("Website design");
  await description.press("Enter");

  await expect(suggestionList(page)).toHaveCount(0);
  await expect(description).toHaveValue("Website design");
  await expect(page.getByLabel("Unit, item 1")).toHaveValue("hrs");
  await expect(page.getByLabel("Amount, item 1")).toHaveText("$190.00");

  await pressShortcut(page, "Mod+z");

  await expect(description).toHaveValue("web");
  await expect(page.getByLabel("Unit, item 1")).toHaveValue("");
  await expect(page.getByLabel("Amount, item 1")).toHaveText("$0.00");
});

test("Escape closes the list", async ({ page }) => {
  await billWebsiteDesign(page);

  const description = page.getByLabel("Item, item 1");

  await description.fill("Web");
  await expect(suggestionList(page)).toBeVisible();
  await description.press("Escape");
  await expect(suggestionList(page)).toHaveCount(0);
  await expect(description).toBeFocused();
});

test("offers nothing from another currency or in Preview", async ({ page }) => {
  await billWebsiteDesign(page);

  const description = page.getByLabel("Item, item 1");

  await description.fill("web");
  await expect(suggestionList(page)).toBeVisible();

  await page
    .getByRole("group", { name: "Mode" })
    .getByRole("button", { name: "Preview" })
    .click();
  await description.focus();
  await expect(description).toBeFocused();
  await expect(suggestionList(page)).toHaveCount(0);
  await page
    .getByRole("group", { name: "Mode" })
    .getByRole("button", { name: "Edit" })
    .click();

  await page.getByRole("button", { name: "Change currency" }).click();
  await page
    .getByRole("combobox", { name: "Currency", exact: true })
    .selectOption("€");
  await page.keyboard.press("Escape");
  await description.fill("webs");
  await expect(suggestionList(page)).toHaveCount(0);
});

test.describe("on a phone", () => {
  test.use({
    viewport: { width: 390, height: 664 },
    hasTouch: true,
    isMobile: true
  });

  test("a suggestion can be tapped", async ({ page }) => {
    const title = page.getByRole("textbox", { name: "Invoice title" });
    const description = page.getByRole("textbox", { name: "Item, item 1" });
    const unit = page.getByRole("textbox", { name: "Unit, item 1" });

    await page.goto("/create");
    await title.fill("Past invoice");
    await description.fill("Website design");
    await unit.fill("hrs");
    await expect.poll(() => savedContains(page, '"unit":"hrs"')).toBe(true);
    await newInvoiceOnPhone(page);
    await expect(title).toHaveValue("Invoice");

    await description.tap();
    await description.fill("web");
    await suggestionList(page)
      .getByRole("option", { name: /Website design/ })
      .tap();

    await expect(description).toHaveValue("Website design");
    await expect(unit).toHaveValue("hrs");
  });
});
