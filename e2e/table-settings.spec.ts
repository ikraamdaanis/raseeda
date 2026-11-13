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

// Adds an invoice through the automation API, found by what it does rather
// than the app's name, and opens it.
async function createAndOpenInvoice(page: Page, invoice: unknown) {
  await page.evaluate(async data => {
    // Typed as Window[], which the guard below can't narrow from.
    const api = (Object.values(window) as unknown[]).find(
      (
        value: unknown
      ): value is {
        createInvoice: (data: unknown) => Promise<string>;
        openInvoice: (id: string) => Promise<void>;
      } =>
        typeof value === "object" &&
        value !== null &&
        "createInvoice" in value &&
        typeof value.createInvoice === "function"
    );

    if (!api) throw new Error("The automation API isn't on the page");

    await api.openInvoice(await api.createInvoice(data));
  }, invoice);
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

  await page.getByRole("button", { name: "Hide tax" }).click();

  await expect(header).toHaveAttribute("placeholder", "Amount");

  await page.getByRole("button", { name: "Add tax" }).click();
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

test("the Tax column's label shows in the panel only while lines can have rates", async ({
  page
}) => {
  await gotoTwoLineInvoice(page);

  const label = page.getByRole("textbox", { name: "Tax column", exact: true });

  await expect(label).toHaveCount(0);

  await page.getByRole("switch", { name: "Tax per line" }).click();

  await expect(label).toBeVisible();
});

test("a header colour stored as a name shows as that colour in its swatch", async ({
  page
}) => {
  await gotoEditorReady(page);
  await createAndOpenInvoice(page, {
    tableSettings: {
      backgroundColor: "white",
      borderColor: "rgba(255, 0, 0, 0.5)"
    }
  });

  await expect(
    page.getByRole("textbox", { name: "Header colour code" })
  ).toHaveValue("white");
  await expect(page.getByLabel("Header colour", { exact: true })).toHaveValue(
    "#ffffff"
  );
  await expect(page.getByLabel("Borders colour", { exact: true })).toHaveValue(
    "#ff0000"
  );
});

test("the picker's colour undoes in one step, from the picker", async ({
  page
}) => {
  await gotoTwoLineInvoice(page);

  const picker = page.getByLabel("Header colour", { exact: true });
  const code = page.getByRole("textbox", { name: "Header colour code" });

  await picker.fill("#ff0000");
  await picker.fill("#ee1100");
  await picker.fill("#dd2200");
  await expect(code).toHaveValue("#dd2200");

  await pressShortcut(page, "Mod+z");

  await expect(code).toHaveValue("#f9fafb");
  await expect(picker).toBeFocused();
});

test("a typed colour undone from its field shows the colour it goes back to", async ({
  page
}) => {
  await gotoTwoLineInvoice(page);

  const code = page.getByRole("textbox", { name: "Header colour code" });

  await code.fill("#fde68a");
  await expect(
    page
      .getByRole("table", { name: "Invoice line items" })
      .getByRole("row")
      .first()
  ).toHaveCSS("background-color", "rgb(253, 230, 138)");

  await pressShortcut(page, "Mod+z");

  await expect(code).toBeFocused();
  await expect(code).toHaveValue("#f9fafb");
});

test("a credit keeps its minus, tabbed through or typed", async ({ page }) => {
  await gotoEditorReady(page);
  await createAndOpenInvoice(page, {
    currency: "£",
    currencyCode: "GBP",
    items: [
      { id: "a", description: "Work", quantity: 1, unit: "", unitPrice: 300 },
      { id: "b", description: "Credit", quantity: 1, unit: "", unitPrice: -150 }
    ]
  });

  const price = page.getByLabel("Unit Price, item 2");

  await expect(price).toHaveValue("-£150.00");
  await price.focus();
  await expect(price).toHaveValue("-£150");
  await price.press("Tab");
  await expect(price).toHaveValue("-£150.00");

  await page.getByRole("switch", { name: "Quantity and price" }).click();

  const amount = page.getByLabel("Net amount, item 1");

  await setNumber(amount, "-75");

  await expect(amount).toHaveValue("-£75.00");
  await expect.poll(() => savedContains(page, '"unitPrice":-75')).toBe(true);
});

test("a long figure takes room from the description rather than being cut off", async ({
  page
}) => {
  await gotoEditorReady(page);
  await createAndOpenInvoice(page, {
    currency: "£",
    currencyCode: "GBP",
    theme: { font: "jetbrains-mono", size: "large" },
    sections: { tax: true, currencyConversion: true },
    currencyConversion: {
      currency: "¥",
      currencyCode: "JPY",
      rate: 191.37,
      date: "2026-11-04",
      source: "ECB",
      showRate: true
    },
    tax: { percentage: 20, exempt: false, note: "", perLine: true },
    items: [
      {
        id: "a",
        description: "Website redesign",
        quantity: 40,
        unit: "hours",
        unitPrice: 1250,
        tax: { percentage: 17.25, exempt: false }
      },
      {
        id: "b",
        description: "Hosting",
        quantity: 12,
        unit: "months",
        unitPrice: 85.5
      }
    ]
  });

  const header = page
    .getByRole("table", { name: "Invoice line items" })
    .getByRole("row")
    .first();

  await expect(header.getByRole("columnheader")).toHaveCount(7);
  expect(
    await header.evaluate(row => row.scrollWidth - row.clientWidth)
  ).toBeLessThanOrEqual(0);

  // Nor does any figure get cut off inside its own cell.
  const clipped = await page
    .getByRole("table", { name: "Invoice line items" })
    .locator("input")
    .evaluateAll(fields =>
      fields
        .filter(field => field.scrollWidth > field.clientWidth)
        .map(field => field.getAttribute("aria-label"))
    );

  expect(clipped).toEqual([]);
});

test("tabbing through a yen price keeps the fraction it was stored with", async ({
  page
}) => {
  await gotoEditorReady(page);
  await createAndOpenInvoice(page, {
    currency: "¥",
    currencyCode: "JPY",
    items: [
      {
        id: "a",
        description: "Prints",
        quantity: 3,
        unit: "",
        unitPrice: 10.5
      }
    ]
  });

  const price = page.getByLabel("Unit Price, item 1");
  const amount = page.getByLabel("Net amount, item 1");

  await expect(amount).toHaveText("¥32");
  await price.focus();
  await price.press("Tab");
  await expect(amount).toHaveText("¥32");
  await expect.poll(() => savedContains(page, '"unitPrice":10.5')).toBe(true);
});
