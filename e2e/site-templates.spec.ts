import { expect, test } from "./fixtures";
import {
  countSavedInvoices,
  gotoEditorSettled,
  savedContains
} from "./helpers";

// The pages that open the editor ready for one job (issue #131).

const DOCUMENT_PAGES = [
  ["/quote-template", "Start a quote", "Quote"],
  [
    "/proforma-invoice-template",
    "Start a proforma invoice",
    "Proforma invoice"
  ],
  ["/receipt-template", "Start a receipt", "Receipt"],
  ["/credit-note-template", "Start a credit note", "Credit note"]
] as const;

for (const [path, startLabel, title] of DOCUMENT_PAGES) {
  test(`${path} opens the editor with that type ready`, async ({ page }) => {
    await page.goto(path);

    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      "template"
    );
    await page
      .getByRole("main")
      .getByRole("link", { name: startLabel, exact: true })
      .click();

    await expect(page).toHaveURL("/create");
    await expect(page.getByLabel("Invoice title")).toHaveValue(title);
  });
}

const TRADE_PAGES = [
  ["/freelance-invoice-template", "Start a freelance invoice", "Project work"],
  ["/contractor-invoice-template", "Start a contractor invoice", "Labour"],
  [
    "/retail-invoice-template",
    "Start a retail invoice",
    "Standard-rate product"
  ]
] as const;

for (const [path, startLabel, firstLine] of TRADE_PAGES) {
  test(`${path} opens the editor filled in`, async ({ page }) => {
    await page.goto(path);
    await page
      .getByRole("main")
      .getByRole("link", { name: startLabel, exact: true })
      .click();

    await expect(page).toHaveURL("/create");
    await expect(page.getByLabel("Item, item 1")).toHaveValue(firstLine);
    await expect(page.getByLabel("Invoice title")).toHaveValue("Invoice");
  });
}

test("a template saves as a new invoice on its first edit, and not before", async ({
  page
}) => {
  await page.goto("/contractor-invoice-template");
  await page
    .getByRole("main")
    .getByRole("link", { name: "Start a contractor invoice", exact: true })
    .click();

  const firstLine = page.getByLabel("Item, item 1");

  await expect(firstLine).toHaveValue("Labour");
  // Longer than the save delay and its maximum wait.
  await page.waitForTimeout(2500);
  expect(await countSavedInvoices(page)).toBe(0);

  await firstLine.fill("Labour, first fix");
  await expect.poll(() => countSavedInvoices(page)).toBe(1);
  await expect.poll(() => savedContains(page, "Labour, first fix")).toBe(true);

  await page.reload();
  await expect(page.getByLabel("Item, item 1")).toHaveValue(
    "Labour, first fix"
  );
  expect(await countSavedInvoices(page)).toBe(1);
});

test("a template leaves work in progress in the library", async ({ page }) => {
  await gotoEditorSettled(page);
  await page.getByLabel("Invoice title").fill("Half-finished invoice");
  await expect
    .poll(() => savedContains(page, "Half-finished invoice"))
    .toBe(true);

  await page.goto("/receipt-template");
  await page
    .getByRole("main")
    .getByRole("link", { name: "Start a receipt", exact: true })
    .click();

  await expect(page.getByLabel("Invoice title")).toHaveValue("Receipt");
  expect(await savedContains(page, "Half-finished invoice")).toBe(true);
});

test("an unknown template opens the editor as usual", async ({ page }) => {
  await page.goto("/create?template=nonsense");

  await expect(page.getByLabel("Invoice title")).toHaveValue("Invoice");
  await expect(page.getByLabel("Item, item 1")).toHaveValue("Item 1");
});

test("the gallery links to each template page", async ({ page }) => {
  await page.goto("/invoice-template");

  await page
    .getByRole("main")
    .getByRole("link", { name: "Credit note template", exact: true })
    .click();

  await expect(page).toHaveURL("/credit-note-template");
  await expect(
    page.getByRole("heading", { name: "Free credit note template", level: 1 })
  ).toBeVisible();

  await page
    .getByRole("main")
    .getByRole("link", { name: "Invoice templates", exact: true })
    .click();

  await expect(page).toHaveURL("/invoice-template");
});
