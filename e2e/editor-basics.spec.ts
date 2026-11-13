import { expect, test } from "./fixtures";
import { addLineItem, gotoEditorReady, isoToday, setNumber } from "./helpers";

// Group B: editor basics. The editor is a live WYSIWYG surface, so "reflects in
// the preview" means the edited value is held by the on-canvas field.

test("blank invoice is dated today and due 30 days out", async ({ page }) => {
  await page.goto("/create");

  // Dates are stamped client-side on first mount, so assert with retry rather
  // than requiring an edit first.
  // The page shows dates in the invoice's format and keeps the stored
  // yyyy-MM-dd value on the picker as data-date.
  await expect(page.getByLabel("Date", { exact: true })).toHaveAttribute(
    "data-date",
    isoToday()
  );
  await expect(page.getByLabel("Due date", { exact: true })).toHaveAttribute(
    "data-date",
    isoToday(30)
  );
});

test("editing identity fields holds their values", async ({ page }) => {
  await gotoEditorReady(page, "Website redesign");

  await page.getByLabel("From details").fill("Acme Studio\nhello@acme.test");
  await page.getByLabel("To details").fill("Globex Corp\nbilling@globex.test");
  await page.getByLabel("Invoice No.", { exact: true }).fill("INV-2026-014");

  await expect(page.getByLabel("Invoice title")).toHaveValue(
    "Website redesign"
  );
  await expect(page.getByLabel("From details")).toHaveValue(
    "Acme Studio\nhello@acme.test"
  );
  await expect(page.getByLabel("To details")).toHaveValue(
    "Globex Corp\nbilling@globex.test"
  );
  await expect(page.getByLabel("Invoice No.", { exact: true })).toHaveValue(
    "INV-2026-014"
  );
});

test("changing currency updates the symbol across totals and line items", async ({
  page
}) => {
  await gotoEditorReady(page);

  await setNumber(page.getByLabel("Quantity, item 1"), "1");
  await setNumber(page.getByLabel("Unit Price, item 1"), "100");
  await expect(page.getByTestId("subtotal-value")).toHaveText("$100.00");

  await page.getByRole("button", { name: "Change currency" }).click();
  await page
    .getByRole("combobox", { name: "Currency", exact: true })
    .selectOption("€");

  await expect(page.getByTestId("subtotal-value")).toHaveText("€100.00");
  await expect(page.getByLabel("Amount, item 1")).toHaveText("€100.00");
});

test("section and column labels are editable", async ({ page }) => {
  await gotoEditorReady(page);

  await page.getByLabel("Seller section label").fill("Billed by");
  await page.getByLabel("Client section label").fill("Billed to");
  await page.getByLabel("Description column label").fill("Service");

  await expect(page.getByLabel("Seller section label")).toHaveValue(
    "Billed by"
  );
  await expect(page.getByLabel("Client section label")).toHaveValue(
    "Billed to"
  );
  await expect(page.getByLabel("Description column label")).toHaveValue(
    "Service"
  );

  // The renamed column label flows into the per-cell accessible name.
  await addLineItem(page);
  await expect(page.getByLabel("Service, item 1")).toBeVisible();
});
