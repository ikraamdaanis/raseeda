import type { Page } from "@playwright/test";
import { expect, test } from "./fixtures";
import {
  DB_NAME,
  clickFileMenuItem,
  gotoEditorReady,
  gotoEditorSettled,
  invoiceNameField,
  invoicesPanel,
  libraryRow,
  nameInvoice,
  openFileMenu,
  pressShortcut
} from "./helpers";

// Group H: the invoices panel, the editor's one library view.

// Opens the invoices panel from the project menu, as Open Invoice does.
async function openLibrary(page: Page) {
  await clickFileMenuItem(page, "Open Invoice");

  const panel = invoicesPanel(page);

  await expect(panel.getByRole("searchbox")).toBeFocused();

  return panel;
}

test("shows an empty state when there are no saved invoices", async ({
  page
}) => {
  await gotoEditorSettled(page);

  const panel = await openLibrary(page);

  await expect(panel.getByText("No invoices yet.")).toBeVisible();
});

test("lists a saved invoice and opens it into the editor", async ({ page }) => {
  await gotoEditorReady(page, "Alpha title");
  await nameInvoice(page, "Alpha");
  await clickFileMenuItem(page, "New Invoice");
  await expect(page.getByLabel("Invoice title")).toHaveValue("Invoice");

  await openLibrary(page);
  await libraryRow(page, "Alpha").click();

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

  const panel = await openLibrary(page);
  const alpha = libraryRow(page, "Alpha");
  const beta = libraryRow(page, "Beta");

  await expect(beta).toContainText("Quote");
  await expect(alpha).not.toContainText("Quote");

  await panel.getByRole("button", { name: "View options" }).click();
  await page.locator("#library-type").selectOption({ label: "Quote" });

  await expect(beta).toBeVisible();
  await expect(alpha).toBeHidden();
});

test("an all-invoice library shows no document types", async ({ page }) => {
  await gotoEditorReady(page, "Alpha title");
  await nameInvoice(page, "Alpha");

  const panel = await openLibrary(page);

  // The meta line starts with the number, as before types were shown.
  await expect(libraryRow(page, "Alpha")).toContainText(
    /\$0\.00No\. INV-0001 · Edited/
  );

  await panel.getByRole("button", { name: "View options" }).click();
  await expect(page.locator("#library-date")).toBeVisible();
  await expect(page.locator("#library-type")).toHaveCount(0);
});

test("deleting the current invoice starts a new one [R]", async ({ page }) => {
  await gotoEditorReady(page, "Solo title");
  await nameInvoice(page, "Solo doc");

  const panel = await openLibrary(page);

  await panel.getByRole("button", { name: "Actions for Solo doc" }).click();
  await page.getByRole("menuitem", { name: "Delete…" }).click();

  const confirm = page.getByRole("dialog", { name: "Delete this invoice?" });

  await confirm.getByRole("button", { name: "Delete invoice" }).click();
  await expect(confirm).toBeHidden();

  await expect(panel.getByText("No invoices yet.")).toBeVisible();
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

  await page.reload();
  await openLibrary(page);

  await expect(libraryRow(page, "Datey")).toBeVisible();
  expect(pageErrors).toEqual([]);
});

test("renaming from the panel updates the toolbar title", async ({ page }) => {
  await gotoEditorReady(page, "Renamable");
  await nameInvoice(page, "Old name");

  const panel = await openLibrary(page);
  const rename = page.getByRole("dialog", { name: "Rename Invoice" });

  await panel.getByRole("button", { name: "Actions for Old name" }).click();
  await page.getByRole("menuitem", { name: "Rename…" }).click();
  await rename.getByRole("textbox").fill("New name");
  await rename.getByRole("textbox").press("Enter");
  await expect(rename).toBeHidden();

  await expect(libraryRow(page, "New name")).toBeVisible();
  await expect(invoiceNameField(page)).toHaveValue("New name");
});

// Saves three invoices and opens the invoices panel on them.
async function openLibraryWithThreeInvoices(page: Page) {
  await gotoEditorReady(page, "Library");

  for (const name of ["Alpha", "Bravo", "Charlie"]) {
    await nameInvoice(page, name);
    await clickFileMenuItem(page, "New Invoice");
    await expect(invoiceNameField(page)).not.toHaveValue(name);
  }

  return openLibrary(page);
}

test("deleting a selection skips invoices the search has hidden", async ({
  page
}) => {
  const panel = await openLibraryWithThreeInvoices(page);

  await libraryRow(page, "Alpha").click({ modifiers: ["ControlOrMeta"] });
  await libraryRow(page, "Bravo").click({ modifiers: ["ControlOrMeta"] });
  await expect(panel.getByText("2 selected")).toBeVisible();
  await panel.getByRole("searchbox").fill("Alpha");
  await expect(panel.getByText("1 selected")).toBeVisible();
  await panel.getByRole("button", { name: "Delete…" }).click();

  const confirm = page.getByRole("dialog", { name: "Delete this invoice?" });

  await expect(confirm.getByText("“Alpha” will be removed")).toBeVisible();
  await confirm.getByRole("button", { name: "Delete invoice" }).click();
  await expect(confirm).toBeHidden();
  await panel.getByRole("searchbox").fill("");

  await expect(libraryRow(page, "Alpha")).toHaveCount(0);
  await expect(libraryRow(page, "Bravo")).toBeVisible();
  await expect(libraryRow(page, "Charlie")).toBeVisible();
});

test("Shift-click selects a range and Escape clears it", async ({ page }) => {
  const panel = await openLibraryWithThreeInvoices(page);

  await libraryRow(page, "Charlie").click({ modifiers: ["ControlOrMeta"] });
  await libraryRow(page, "Alpha").click({ modifiers: ["Shift"] });
  await expect(panel.getByText("3 selected")).toBeVisible();

  await libraryRow(page, "Bravo").click({ button: "right" });
  await expect(page.getByRole("menuitem")).toHaveText(["Delete 3 invoices…"]);
  await page.keyboard.press("Escape");
  await expect(page.getByRole("menu")).toHaveCount(0);
  await expect(panel.getByText("3 selected")).toBeVisible();

  await page.keyboard.press("Escape");
  await expect(panel.getByText(/selected/)).toHaveCount(0);
});

test("a row's right-click and ⋯ menus offer the same actions", async ({
  page
}) => {
  const panel = await openLibraryWithThreeInvoices(page);
  const actions = ["Open", "Rename…", "Duplicate", "Duplicate As", "Delete…"];

  await libraryRow(page, "Bravo").click({ button: "right" });
  await expect(page.getByRole("menuitem")).toHaveText(actions);
  await page.keyboard.press("Escape");
  await expect(page.getByRole("menu")).toHaveCount(0);

  await panel.getByRole("button", { name: "Actions for Bravo" }).click();
  await expect(page.getByRole("menuitem")).toHaveText(actions);
});

test("Cmd/Ctrl+O opens the panel on its invoices with focus in its search", async ({
  page
}) => {
  await gotoEditorReady(page, "Shortcut open");

  const panel = invoicesPanel(page);

  await panel.getByRole("button", { name: "Templates" }).click();
  await page.getByRole("button", { name: "Hide invoices panel" }).click();
  await page.getByLabel("Invoice title").click();
  await pressShortcut(page, "Mod+o");

  await expect(
    panel.getByRole("searchbox", { name: "Search invoices" })
  ).toBeFocused();
  await expect(
    page.getByRole("button", { name: "Hide invoices panel" })
  ).toBeVisible();
});

test("the command palette's Open invoice focuses the panel's search", async ({
  page
}) => {
  await gotoEditorReady(page, "Palette open");
  await pressShortcut(page, "Mod+k");
  await page.getByRole("option", { name: /Open invoice…/ }).click();

  await expect(
    invoicesPanel(page).getByRole("searchbox", { name: "Search invoices" })
  ).toBeFocused();
});

test("Open Template opens the panel on its Templates tab", async ({
  page,
  seedTemplate
}) => {
  await gotoEditorReady(page, "Templatable");
  await seedTemplate({ name: "My template" });

  await clickFileMenuItem(page, "Open Template");

  const panel = invoicesPanel(page);

  await expect(
    panel.getByRole("searchbox", { name: "Search templates" })
  ).toBeFocused();
  await expect(libraryRow(page, "My template")).toBeVisible();
});

test("the Rename dialog starts from the name of the invoice it renames", async ({
  page
}) => {
  const panel = await openLibraryWithThreeInvoices(page);
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
  await expect(libraryRow(page, "Alpha renamed")).toBeVisible();
});
