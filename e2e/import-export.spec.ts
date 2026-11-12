import { APP_NAME } from "../consts/app";
import { expect, test } from "./fixtures";
import {
  clickFileMenuItem,
  exportData,
  gotoEditorReady,
  invoicesPanel,
  libraryRow,
  nameInvoice,
  selectImportFile,
  storeContains
} from "./helpers";

// Group K: import / export. Export a real file, then mutate it to exercise the
// import edge cases, so the payloads always match the current export schema.

test("Export Data downloads a dated export file", async ({ page }) => {
  await gotoEditorReady(page, "Exportable");
  await nameInvoice(page, "Exportable doc");

  const { filename } = await exportData(page);

  expect(filename).toMatch(
    new RegExp(`^${APP_NAME}-export-\\d{4}-\\d{2}-\\d{2}\\.json$`)
  );
});

test("a full export/import round-trip restores the data", async ({
  page,
  resetDb
}) => {
  await gotoEditorReady(page, "Roundtrip title");
  await nameInvoice(page, "Roundtrip doc");

  const { json } = await exportData(page);

  await resetDb();
  await page.reload();
  await expect(page.getByLabel("Date", { exact: true })).toHaveAttribute(
    "data-date",
    /\d{4}-\d{2}-\d{2}/
  );

  const dialog = await selectImportFile(page, json);

  await dialog.getByRole("button", { name: "Import", exact: true }).click();
  await expect(dialog.getByText(/Successfully imported/)).toBeVisible();
  await dialog.getByRole("button", { name: "Done" }).click();

  await clickFileMenuItem(page, "Open Invoice");
  await expect(libraryRow(page, "Roundtrip doc")).toBeVisible();
});

test("importing the same file again conflict-renames duplicates", async ({
  page
}) => {
  await gotoEditorReady(page, "Dup title");
  await nameInvoice(page, "Dup doc");

  const { json } = await exportData(page);

  const dialog = await selectImportFile(page, json);

  // The preview flags the existing invoice as a rename-on-import conflict.
  await expect(dialog.getByText(/to rename/)).toBeVisible();
  await dialog.getByRole("button", { name: "Import", exact: true }).click();
  await expect(dialog.getByText(/Successfully imported/)).toBeVisible();
  await dialog.getByRole("button", { name: "Done" }).click();

  await clickFileMenuItem(page, "Open Invoice");
  await expect(invoicesPanel(page).getByText(/\(imported\)/)).toBeVisible();
});

test("importing a newer-version file shows the please-update message [R]", async ({
  page
}) => {
  await gotoEditorReady(page, "Version title");
  await nameInvoice(page, "Version doc");

  const { json } = await exportData(page);

  json.meta.version = json.meta.version + 1;

  const dialog = await selectImportFile(page, json);

  await expect(dialog.getByText(/newer version of/)).toBeVisible();
});

test("importing a record with an unparseable date does not crash [R]", async ({
  page
}) => {
  const pageErrors: string[] = [];

  page.on("pageerror", error => pageErrors.push(error.message));

  await gotoEditorReady(page, "Datey title");
  await nameInvoice(page, "Datey doc");

  const { json } = await exportData(page);

  json.invoices[0].updatedAt = "definitely not a date";

  const dialog = await selectImportFile(page, json);

  await dialog.getByRole("button", { name: "Import", exact: true }).click();
  await expect(dialog.getByText(/Successfully imported/)).toBeVisible();
  await dialog.getByRole("button", { name: "Done" }).click();

  // The invoices panel still lists the imported record (a conflict-renamed
  // copy sits alongside the original) without throwing.
  await clickFileMenuItem(page, "Open Invoice");
  await expect(libraryRow(page, "Datey doc").first()).toBeVisible();
  expect(pageErrors).toEqual([]);
});

test("importing an invoice with a null line item drops only that item [R]", async ({
  page
}) => {
  await gotoEditorReady(page, "Nullitem title");
  await page.getByLabel("Item, item 1").fill("Kept item");
  await nameInvoice(page, "Nullitem doc");

  const { json } = await exportData(page);

  json.invoices[0].invoiceData.items.push(null);

  const dialog = await selectImportFile(page, json);

  await dialog.getByRole("button", { name: "Import", exact: true }).click();
  await expect(dialog.getByText(/Successfully imported/)).toBeVisible();

  expect(await storeContains(page, "invoices", "Kept item")).toBe(true);
});

test("a corrupt import leaves the database untouched", async ({ page }) => {
  await gotoEditorReady(page, "Safe title");
  await nameInvoice(page, "Safe doc");

  await clickFileMenuItem(page, "Import Data");

  const dialog = page.getByRole("dialog", { name: "Import Data" });

  await dialog.locator("#import-file-input").setInputFiles({
    name: "corrupt.json",
    mimeType: "application/json",
    buffer: Buffer.from("{ this is not valid json ")
  });

  // The existing invoice is still present and intact after the failed import.
  await expect(dialog.getByText("Import Data")).toBeVisible();
  expect(await storeContains(page, "invoices", "Safe doc")).toBe(true);
});

test("pasting an export's JSON imports it like a chosen file", async ({
  page,
  resetDb
}) => {
  await gotoEditorReady(page, "Pasted title");
  await nameInvoice(page, "Pasted doc");

  const { json } = await exportData(page);

  await resetDb();
  await page.reload();
  await expect(page.getByLabel("Date", { exact: true })).toHaveAttribute(
    "data-date",
    /\d{4}-\d{2}-\d{2}/
  );
  await clickFileMenuItem(page, "Import Data");

  const dialog = page.getByRole("dialog", { name: "Import Data" });
  const pasteField = dialog.getByLabel("Or paste the export's JSON");

  // A real paste event, as Cmd+V sends it, goes straight to the preview.
  await pasteField.evaluate((field, text) => {
    const clipboardData = new DataTransfer();

    clipboardData.setData("text/plain", text);
    field.dispatchEvent(
      new ClipboardEvent("paste", { clipboardData, bubbles: true })
    );
  }, JSON.stringify(json));

  await expect(dialog.getByText("Invoices", { exact: true })).toBeVisible();
  await dialog.getByRole("button", { name: "Import", exact: true }).click();
  await expect(dialog.getByText(/Successfully imported/)).toBeVisible();
  await dialog.getByRole("button", { name: "Done" }).click();

  await clickFileMenuItem(page, "Open Invoice");
  await expect(libraryRow(page, "Pasted doc")).toBeVisible();
});

test("typed JSON that isn't an export shows the error and keeps the text", async ({
  page
}) => {
  await gotoEditorReady(page, "Typed title");
  await clickFileMenuItem(page, "Import Data");

  const dialog = page.getByRole("dialog", { name: "Import Data" });
  const pasteField = dialog.getByLabel("Or paste the export's JSON");

  await pasteField.fill('{ "hello": "world" }');
  await dialog.getByRole("button", { name: "Use pasted JSON" }).click();

  await expect(dialog.getByRole("alert")).toContainText(/not a valid/);
  await expect(pasteField).toHaveValue('{ "hello": "world" }');
});

test("dropping an export file on the dialog imports it", async ({ page }) => {
  await gotoEditorReady(page, "Dropped title");
  await nameInvoice(page, "Dropped doc");

  const { json } = await exportData(page);

  await clickFileMenuItem(page, "Import Data");

  const dialog = page.getByRole("dialog", { name: "Import Data" });
  const dropZone = dialog.getByRole("region", {
    name: "Drop an export file here"
  });
  const dataTransfer = await page.evaluateHandle(text => {
    const transfer = new DataTransfer();

    transfer.items.add(new File([text], "backup.json"));

    return transfer;
  }, JSON.stringify(json));

  await dropZone.dispatchEvent("dragenter", { dataTransfer });
  await expect(dropZone).toHaveAttribute("data-dragging", "true");
  await dropZone.dispatchEvent("drop", { dataTransfer });

  await expect(dialog.getByText(/to rename/)).toBeVisible();
  await dialog.getByRole("button", { name: "Import", exact: true }).click();
  await expect(dialog.getByText(/Successfully imported/)).toBeVisible();
});

test("dropping a file that isn't JSON is rejected", async ({ page }) => {
  await gotoEditorReady(page, "Wrong file title");
  await clickFileMenuItem(page, "Import Data");

  const dialog = page.getByRole("dialog", { name: "Import Data" });
  const dataTransfer = await page.evaluateHandle(() => {
    const transfer = new DataTransfer();

    transfer.items.add(
      new File(["%PDF-1.7"], "invoice.pdf", { type: "application/pdf" })
    );

    return transfer;
  });

  await dialog
    .getByRole("region", { name: "Drop an export file here" })
    .dispatchEvent("drop", { dataTransfer });

  await expect(dialog.getByRole("alert")).toHaveText(
    '"invoice.pdf" is not a .json export file.'
  );
});
