import type { Locator, Page } from "@playwright/test";
import { expect } from "@playwright/test";

// Dexie database name, mirrored from db/index.ts so the suite has no import
// dependency on app source.
export const DB_NAME = "InvoiceDatabase";

// Whether the serialized rows of an IndexedDB object store contain the given
// text. Used to wait for an edit to be saved (before reloading, so restore
// assertions test reopening rather than autosave timing).
export async function storeContains(
  page: Page,
  storeName: string,
  needle: string
): Promise<boolean> {
  return await page.evaluate(
    async ([databaseName, store, text]) => {
      return await new Promise<boolean>(resolve => {
        const request = indexedDB.open(databaseName);

        request.onsuccess = () => {
          const db = request.result;

          if (!db.objectStoreNames.contains(store)) {
            db.close();
            resolve(false);

            return;
          }

          const getAll = db
            .transaction(store, "readonly")
            .objectStore(store)
            .getAll();

          getAll.onsuccess = () => {
            db.close();
            resolve(JSON.stringify(getAll.result).includes(text));
          };
          getAll.onerror = () => {
            db.close();
            resolve(false);
          };
        };

        request.onerror = () => resolve(false);
      });
    },
    [DB_NAME, storeName, needle] as const
  );
}

// Whether a saved invoice contains the given text.
export async function savedContains(
  page: Page,
  needle: string
): Promise<boolean> {
  return await storeContains(page, "invoices", needle);
}

// How many invoices are in the library.
export async function countSavedInvoices(page: Page): Promise<number> {
  return await page.evaluate(
    async databaseName =>
      await new Promise<number>(resolve => {
        const request = indexedDB.open(databaseName);

        request.onsuccess = () => {
          const db = request.result;

          if (!db.objectStoreNames.contains("invoices")) {
            db.close();
            resolve(0);

            return;
          }

          const count = db
            .transaction("invoices", "readonly")
            .objectStore("invoices")
            .count();

          count.onsuccess = () => {
            db.close();
            resolve(count.result);
          };
          count.onerror = () => {
            db.close();
            resolve(0);
          };
        };

        request.onerror = () => resolve(0);
      }),
    DB_NAME
  );
}

// Opens the editor and sets the invoice title. The editor is gated on hydration
// (its inputs don't mount until the invoice store is hydrated), so the moment
// the title field is fillable the value is durable: no store reset can land
// afterwards to wipe it. Waits until the edit is saved, so the invoice is in
// the library before the test goes on.
export async function gotoEditorReady(page: Page, title = "Test invoice") {
  await page.goto("/create");

  const invoiceTitle = page.getByLabel("Invoice title");

  await invoiceTitle.fill(title);
  await expect(invoiceTitle).toHaveValue(title);
  await expect.poll(() => savedContains(page, title)).toBe(true);
}

// Opens the editor and waits for it to be ready without editing anything, by
// waiting for the client-stamped invoice date to populate. Use for tests that
// must not dirty the editor (e.g. empty-state and menu-only flows).
export async function gotoEditorSettled(page: Page) {
  await page.goto("/create");
  await expect(page.getByLabel("Date", { exact: true })).toHaveAttribute(
    "data-date",
    /\d{4}-\d{2}-\d{2}/
  );
}

// Opens the project menu (the logo, which holds the file commands), retrying
// until the menu content actually appears, so a bare click that occasionally
// lands on nothing can't flake the test.
export async function openFileMenu(page: Page) {
  const trigger = page.getByRole("button", { name: "Project menu" });
  const firstItem = page.getByRole("menuitem", { name: "New Invoice" });

  await expect(async () => {
    await trigger.click();
    await expect(firstItem).toBeVisible({ timeout: 1000 });
  }).toPass({ timeout: 10_000 });
}

export async function clickFileMenuItem(page: Page, name: string | RegExp) {
  await openFileMenu(page);
  await page
    .getByRole("menuitem", { name, exact: typeof name === "string" })
    .click();
}

// The open invoice's name in the top bar, which renames it.
export function invoiceNameButton(page: Page) {
  return page.getByRole("heading", { level: 1 }).getByRole("button");
}

// Names the open invoice from the top bar (a new one joins the library under
// that name) and waits until the name is saved.
export async function nameInvoice(page: Page, name: string) {
  await invoiceNameButton(page).click();

  const dialog = page.getByRole("dialog", { name: "Rename Invoice" });

  await dialog.getByRole("textbox").fill(name);
  await dialog.getByRole("button", { name: /Rename|Save/ }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByRole("heading", { name })).toBeVisible();
  await expect.poll(() => savedContains(page, name)).toBe(true);
}

// Presses one of the app's own shortcuts, written with "Mod" for ⌘ or Ctrl.
// The app picks the key from the platform the page reports, not the machine
// running the test: WebKit runs as Mac Safari even on Linux, so it listens for
// ⌘ there while Playwright's ControlOrMeta would send Ctrl.
export async function pressShortcut(page: Page, keys: string) {
  const apple = await page.evaluate(() =>
    /Mac|iPhone|iPad/i.test(`${navigator.platform} ${navigator.userAgent}`)
  );

  await page.keyboard.press(keys.replace("Mod", apple ? "Meta" : "Control"));
}

// Makes the page believe it was hidden (backgrounded, or the app switched
// away from), firing visibilitychange as the browser would.
export async function hidePage(page: Page) {
  await page.evaluate(() => {
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      get: () => "hidden"
    });
    document.dispatchEvent(new Event("visibilitychange"));
  });
}

export async function addLineItem(page: Page) {
  await page.getByRole("button", { name: "Add item" }).click();
}

// Triggers Export Data and returns the download's filename and parsed JSON.
export async function exportData(page: Page) {
  const downloadPromise = page.waitForEvent("download");

  await clickFileMenuItem(page, "Export Data");

  const download = await downloadPromise;
  const stream = await download.createReadStream();
  const chunks: Buffer[] = [];

  for await (const chunk of stream) {
    chunks.push(chunk as Buffer);
  }

  return {
    filename: download.suggestedFilename(),
    // JSON.parse returns `any`, which the import edge-case tests mutate freely.
    json: JSON.parse(Buffer.concat(chunks).toString("utf8"))
  };
}

// Opens the Import dialog and selects an in-memory JSON payload as the file.
export async function selectImportFile(page: Page, data: unknown) {
  await clickFileMenuItem(page, "Import Data");

  const dialog = page.getByRole("dialog", { name: "Import Data" });

  await dialog.locator("#import-file-input").setInputFiles({
    name: "import.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(data))
  });

  return dialog;
}

// Local yyyy-MM-dd, mirroring the app's date-fns format(now, "yyyy-MM-dd").
function localIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export function isoToday(offsetDays = 0): string {
  const date = new Date();

  date.setDate(date.getDate() + offsetDays);

  return localIsoDate(date);
}

// Sets a numeric field (quantity, unit price, tax, fees, discounts) by typing.
// These fields keep an internal editing draft that focus repopulates, so a bare
// fill() appends to the existing value instead of replacing it; selecting all
// first mirrors how a user overwrites the value. Blurs afterwards so the parsed
// value is committed for both the amount and any value assertion.
export async function setNumber(locator: Locator, value: string) {
  await locator.click();
  await locator.press("ControlOrMeta+a");
  await locator.pressSequentially(value);
  await locator.blur();
}
