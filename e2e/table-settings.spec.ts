import type { Page } from "@playwright/test";
import { expect, test } from "./fixtures";
import {
  addLineItem,
  gotoEditorReady,
  pressShortcut,
  savedContains,
  setNumber
} from "./helpers";

// The Table section of the inspector: the optional columns, their labels
// (the Tax column's following the tax row's until it has its own) and the
// table's colours.

function modeButton(page: Page, name: "Edit" | "Preview") {
  return page
    .getByRole("group", { name: "Mode" })
    .getByRole("button", { name });
}

function columnHeaders(page: Page) {
  return page
    .getByRole("table", { name: "Invoice line items" })
    .getByRole("columnheader");
}

// Two lines at the invoice's 20%: 3 × £100 and £50.
async function gotoTwoLineInvoice(page: Page) {
  await gotoEditorReady(page);
  await setNumber(page.getByLabel("Quantity, item 1"), "3");
  await setNumber(page.getByLabel("Unit Price, item 1"), "100");
  await addLineItem(page);
  await setNumber(page.getByLabel("Quantity, item 2"), "1");
  await setNumber(page.getByLabel("Unit Price, item 2"), "50");
  await setNumber(page.getByLabel("Tax percentage"), "20");
}

test("the Tax header follows the tax row until it's given a label of its own", async ({
  page
}) => {
  await gotoTwoLineInvoice(page);
  await page.getByRole("switch", { name: "Tax per line" }).click();

  const header = page
    .getByRole("columnheader")
    .getByRole("textbox", { name: "Tax column label" });

  await expect(header).toHaveValue("");
  await expect(header).toHaveAttribute("placeholder", "Tax");

  await page.getByLabel("Tax label").fill("VAT");

  await expect(header).toHaveAttribute("placeholder", "VAT");
  await expect(page.getByLabel("VAT, item 1")).toBeVisible();

  await header.fill("Rate");

  await expect(
    page.getByRole("textbox", { name: "Tax column", exact: true })
  ).toHaveValue("Rate");

  await setNumber(page.getByLabel("Rate, item 2"), "0");
  await modeButton(page, "Preview").click();

  await expect(header).toHaveValue("Rate");

  await modeButton(page, "Edit").click();
  await header.fill("");
  await modeButton(page, "Preview").click();

  await expect(header).toHaveValue("VAT");
});

test("the Amount header reads Net amount while tax is on, until it's given a label", async ({
  page
}) => {
  await gotoTwoLineInvoice(page);

  const header = page
    .getByRole("columnheader")
    .getByRole("textbox", { name: "Amount column label" });

  await expect(header).toHaveValue("");
  await expect(header).toHaveAttribute("placeholder", "Net amount");
  await expect(page.getByLabel("Net amount, item 1")).toBeVisible();

  await page.getByRole("switch", { name: "Tax", exact: true }).click();

  await expect(header).toHaveAttribute("placeholder", "Amount");

  await page.getByRole("switch", { name: "Tax", exact: true }).click();
  await header.fill("Total");
  await modeButton(page, "Preview").click();

  await expect(header).toHaveValue("Total");
  await expect.poll(() => savedContains(page, '"amount":"Total"')).toBe(true);
});

test("with quantity and price off, a line's amount is typed in", async ({
  page
}) => {
  await gotoTwoLineInvoice(page);

  await page.getByRole("switch", { name: "Quantity and price" }).click();

  await expect(page.getByLabel("Quantity, item 1")).toHaveCount(0);
  await expect(page.getByLabel("Unit, item 1")).toHaveCount(0);
  await expect(page.getByLabel("Unit Price, item 1")).toHaveCount(0);
  await expect(page.getByRole("switch", { name: "Unit" })).toHaveCount(0);

  const amount = page.getByLabel("Amount, item 1");

  await expect(amount).toHaveValue("$300.00");

  await setNumber(amount, "250.5");

  await expect(amount).toHaveValue("$250.50");
  await expect(page.getByTestId("total-value")).toHaveText("$360.60 USD");
  await expect
    .poll(() => savedContains(page, '"quantity":1,"unit":"","unitPrice":250.5'))
    .toBe(true);

  await pressShortcut(page, "Mod+z");

  // Undo puts focus back in the field, which shows the bare figure.
  await expect(amount).toBeFocused();
  await expect(amount).toHaveValue("$300");
  await expect(page.getByTestId("total-value")).toHaveText("$420.00 USD");

  await page.getByRole("switch", { name: "Quantity and price" }).click();

  await expect(page.getByLabel("Quantity, item 1")).toHaveValue("3");
  await expect(page.getByLabel("Unit Price, item 1")).toHaveValue("$100.00");
});

test("the Unit switch hides the unit column while editing", async ({
  page
}) => {
  await gotoTwoLineInvoice(page);

  await expect(page.getByLabel("Unit, item 1")).toBeVisible();

  await page.getByRole("switch", { name: "Unit" }).click();

  await expect(page.getByLabel("Unit, item 1")).toHaveCount(0);
  await expect(columnHeaders(page)).toHaveCount(4);
});

test("a colour typed in the panel colours the table's header, and resets", async ({
  page
}) => {
  await gotoTwoLineInvoice(page);

  const code = page.getByRole("textbox", { name: "Header colour code" });

  await code.fill("#fde68a");
  await code.blur();

  await expect(
    page
      .getByRole("table", { name: "Invoice line items" })
      .getByRole("row")
      .first()
  ).toHaveCSS("background-color", "rgb(253, 230, 138)");

  await code.fill("#fde6");
  await code.blur();

  await expect(code).toHaveValue("#fde68a");

  const reset = page.getByRole("button", { name: "Reset colours" });

  await reset.click();

  await expect(code).toHaveValue("#f9fafb");
  await expect(
    page
      .getByRole("table", { name: "Invoice line items" })
      .getByRole("row")
      .first()
  ).toHaveCSS("background-color", "rgb(249, 250, 251)");
  await expect(reset).toHaveCount(0);
});
