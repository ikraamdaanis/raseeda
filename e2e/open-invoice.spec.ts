import type { Page } from "@playwright/test";
import { expect, test } from "./fixtures";
import {
  DB_NAME,
  clickFileMenuItem,
  gotoEditorReady,
  gotoEditorSettled,
  invoiceNameField,
  nameInvoice,
  openFileMenu,
  pressShortcut
} from "./helpers";

// Group H: the Open Invoice dialog.

test("shows an empty state when there are no saved invoices", async ({
  page
}) => {
  await gotoEditorSettled(page);

  await clickFileMenuItem(page, "Open Invoice");

  const dialog = page.getByRole("dialog", { name: "Open Invoice" });

  await expect(dialog.getByText("No saved invoices yet")).toBeVisible();
});

test("lists a saved invoice and opens it into the editor", async ({ page }) => {
  await gotoEditorReady(page, "Alpha title");
  await nameInvoice(page, "Alpha");
  await clickFileMenuItem(page, "New Invoice");

  await clickFileMenuItem(page, "Open Invoice");

  const dialog = page.getByRole("dialog", { name: "Open Invoice" });

  await dialog.getByRole("row", { name: /Alpha/ }).dblclick();
  await expect(dialog).toBeHidden();

  await expect(invoiceNameField(page)).toHaveValue("Alpha");
  await expect(page.getByLabel("Invoice title")).toHaveValue("Alpha title");
});

test("a library of invoices and quotes narrows to quotes only", async ({
  page
}) => {
  await gotoEditorReady(page, "Alpha title");
  await nameInvoice(page, "Alpha");
  await openFileMenu(page);
  await page.getByRole("menuitem", { name: "New Document" }).hover();
  await page.getByRole("menuitem", { name: "Quote", exact: true }).click();
  await expect(page.getByLabel("Invoice title")).toHaveValue("Quote");
  await nameInvoice(page, "Beta");

  await clickFileMenuItem(page, "Open Invoice");

  const dialog = page.getByRole("dialog", { name: "Open Invoice" });
  const alpha = dialog.getByRole("row", { name: /Alpha/ });
  const beta = dialog.getByRole("row", { name: /Beta/ });

  await expect(beta).toContainText("Quote");
  await expect(alpha).not.toContainText("Quote");

  await dialog.getByRole("button", { name: "View options" }).click();
  await page.locator("#library-type").selectOption({ label: "Quote" });

  await expect(beta).toBeVisible();
  await expect(alpha).toBeHidden();
});

test("an all-invoice library shows no document types", async ({ page }) => {
  await gotoEditorReady(page, "Alpha title");
  await nameInvoice(page, "Alpha");

  const panel = page.getByRole("complementary", { name: "Invoices" });

  // The meta line starts with the number, as before types were shown.
  await expect(panel.getByRole("button", { name: /^Alpha/ })).toContainText(
    /\$0\.00No\. INV-0001 · Edited/
  );

  await clickFileMenuItem(page, "Open Invoice");

  const dialog = page.getByRole("dialog", { name: "Open Invoice" });
  const alpha = dialog.getByRole("row", { name: /Alpha/ });

  await expect(alpha).toBeVisible();
  await expect(alpha).not.toContainText("Invoice");

  await dialog.getByRole("button", { name: "View options" }).click();
  await expect(page.locator("#library-date")).toBeVisible();
  await expect(page.locator("#library-type")).toHaveCount(0);
});

test("deleting the current invoice starts a new one [R]", async ({ page }) => {
  await gotoEditorReady(page, "Solo title");
  await nameInvoice(page, "Solo doc");

  await clickFileMenuItem(page, "Open Invoice");

  const dialog = page.getByRole("dialog", { name: "Open Invoice" });
  const row = dialog.getByRole("row", { name: /Solo doc/ });

  await row.click();
  await row.press("Delete");

  await dialog.getByRole("button", { name: "Delete", exact: true }).click();
  await expect(dialog.getByText("No saved invoices yet")).toBeVisible();

  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(invoiceNameField(page)).toHaveValue("INV-0001");
  await expect(page.getByLabel("Invoice title")).toHaveValue("Invoice");
});

test("a record with an invalid date does not crash the list [R]", async ({
  page
}) => {
  const pageErrors: string[] = [];

  page.on("pageerror", error => pageErrors.push(error.message));

  await gotoEditorReady(page, "Datey title");
  await nameInvoice(page, "Datey");

  // Force an Invalid Date into storage, bypassing the import coercion. The list
  // render must tolerate it (format() would otherwise throw and blank the list).
  await page.evaluate(async databaseName => {
    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.open(databaseName);

      request.onsuccess = () => {
        const db = request.result;
        const tx = db.transaction("invoices", "readwrite");
        const store = tx.objectStore("invoices");
        const getAll = store.getAll();

        getAll.onsuccess = () => {
          for (const record of getAll.result) {
            record.updatedAt = new Date("not a date");
            store.put(record);
          }
        };
        tx.oncomplete = () => {
          db.close();
          resolve();
        };
        tx.onerror = () => {
          db.close();
          reject(tx.error);
        };
      };

      request.onerror = () => reject(request.error);
    });
  }, DB_NAME);

  await clickFileMenuItem(page, "Open Invoice");

  const dialog = page.getByRole("dialog", { name: "Open Invoice" });

  await expect(dialog.getByRole("row", { name: /Datey/ })).toBeVisible();
  expect(pageErrors).toEqual([]);
});

test("renaming from the dialog updates the toolbar title", async ({ page }) => {
  await gotoEditorReady(page, "Renamable");
  await nameInvoice(page, "Old name");

  await clickFileMenuItem(page, "Open Invoice");

  const dialog = page.getByRole("dialog", { name: "Open Invoice" });
  const row = dialog.getByRole("row", { name: /Old name/ });

  await row.press("F2");
  await dialog.getByLabel("Invoice name").fill("New name");
  await dialog.getByLabel("Invoice name").press("Enter");

  await expect(dialog.getByRole("row", { name: /New name/ })).toBeVisible();

  await page.keyboard.press("Escape");
  await expect(invoiceNameField(page)).toHaveValue("New name");
});

// Saves three invoices and opens the Open Invoice dialog on them.
async function openDialogWithThreeInvoices(page: Page) {
  await gotoEditorReady(page, "Library");

  for (const name of ["Alpha", "Bravo", "Charlie"]) {
    await nameInvoice(page, name);
    await clickFileMenuItem(page, "New Invoice");
  }

  await clickFileMenuItem(page, "Open Invoice");

  return page.getByRole("dialog", { name: "Open Invoice" });
}

test("deleting a selection skips invoices the search has hidden", async ({
  page
}) => {
  const dialog = await openDialogWithThreeInvoices(page);

  await dialog.getByRole("row", { name: /Alpha/ }).click();
  await dialog
    .getByRole("row", { name: /Bravo/ })
    .click({ modifiers: ["ControlOrMeta"] });
  await dialog.getByRole("searchbox").fill("Alpha");
  await dialog.getByRole("row", { name: /Alpha/ }).press("Delete");

  await expect(dialog.getByText("Delete “Alpha”?")).toBeVisible();
  await dialog.getByRole("button", { name: "Delete", exact: true }).click();
  await dialog.getByRole("searchbox").fill("");

  await expect(dialog.getByRole("row", { name: /Alpha/ })).toHaveCount(0);
  await expect(dialog.getByRole("row", { name: /Bravo/ })).toBeVisible();
  await expect(dialog.getByRole("row", { name: /Charlie/ })).toBeVisible();
});

test("a row's right-click and ⋯ menus offer the same actions", async ({
  page
}) => {
  const dialog = await openDialogWithThreeInvoices(page);
  const row = dialog.getByRole("row", { name: /Bravo/ });
  const actions = ["Open", "Rename", "Duplicate", "Delete"];

  await row.click({ button: "right" });
  await expect(page.getByRole("menuitem")).toHaveText(actions);
  await page.keyboard.press("Escape");

  await row.getByRole("button", { name: "Actions for Bravo" }).click();
  await expect(page.getByRole("menuitem")).toHaveText(actions);
});

test("the sorted column says which way it sorts", async ({ page }) => {
  const dialog = await openDialogWithThreeInvoices(page);
  const nameHeader = dialog.getByRole("columnheader", { name: "Name" });

  await expect(
    dialog.getByRole("columnheader", { name: "Modified" })
  ).toHaveAttribute("aria-sort", "descending");
  await expect(nameHeader).toHaveAttribute("aria-sort", "none");

  await nameHeader.getByRole("button").click();

  await expect(nameHeader).toHaveAttribute("aria-sort", "ascending");
});

test("the Rename dialog starts from the name of the invoice it renames", async ({
  page
}) => {
  const dialog = await openDialogWithThreeInvoices(page);

  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();

  const panel = page.getByRole("complementary", { name: "Invoices" });
  const rename = page.getByRole("dialog", { name: "Rename Invoice" });

  await panel.getByRole("button", { name: "Actions for Alpha" }).click();
  await page.getByRole("menuitem", { name: "Rename…" }).click();
  await expect(rename.getByRole("textbox")).toHaveValue("Alpha");
  await rename.getByRole("textbox").fill("Alpha renamed");
  await rename.getByRole("button", { name: "Rename" }).click();
  await expect(rename).toBeHidden();

  // Straight away, before the old dialog's reset could have run.
  await panel.getByRole("button", { name: "Actions for Bravo" }).click();
  await page.getByRole("menuitem", { name: "Rename…" }).click();
  await expect(rename.getByRole("textbox")).toHaveValue("Bravo");
  await expect(rename.getByRole("button", { name: "Rename" })).toBeEnabled();

  await rename.getByRole("button", { name: "Cancel" }).click();
  await expect(rename).toBeHidden();
  await expect(
    panel.getByRole("button", { name: /^Alpha renamed/ })
  ).toBeVisible();
});

test("Cmd/Ctrl+O opens the Open Invoice dialog and traps focus", async ({
  page
}) => {
  await gotoEditorReady(page, "Shortcut open");

  await pressShortcut(page, "Mod+o");

  const dialog = page.getByRole("dialog", { name: "Open Invoice" });

  await expect(dialog).toBeVisible();
  await expect(dialog.locator(":focus")).toHaveCount(1);

  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await page.getByLabel("Invoice title").click();
  await expect(page.getByLabel("Invoice title")).toBeFocused();
});
