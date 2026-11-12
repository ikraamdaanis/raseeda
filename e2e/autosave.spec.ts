import { APP_NAME } from "../consts/app";
import { expect, test } from "./fixtures";
import {
  DB_NAME,
  clickFileMenuItem,
  countSavedInvoices,
  gotoEditorReady,
  gotoEditorSettled,
  hidePage,
  invoiceNameField,
  nameInvoice,
  openFileMenu,
  pressShortcut,
  savedContains
} from "./helpers";

// Every invoice saves itself as it's edited: no Save step, no unsaved-changes
// prompts. These guard the autosave model end to end.

test("a new invoice joins the library on its first edit, not before", async ({
  page
}) => {
  await gotoEditorSettled(page);
  await page.waitForTimeout(1000);

  expect(await countSavedInvoices(page)).toBe(0);
  await expect(invoiceNameField(page)).toHaveValue("INV-0001");

  await page.getByLabel("Invoice No.", { exact: true }).fill("INV-0042");
  await page.getByLabel("To details").fill("Acme Ltd\n1 High Street");

  await expect.poll(() => countSavedInvoices(page)).toBe(1);
  await expect(invoiceNameField(page)).toHaveValue("INV-0042 · Acme Ltd");
  await expect
    .poll(() => savedContains(page, "INV-0042 · Acme Ltd"))
    .toBe(true);
});

test("nothing shows while saving works", async ({ page }) => {
  await gotoEditorSettled(page);
  await page.getByLabel("Invoice title").pressSequentially("Quote", {
    delay: 50
  });

  await expect(page.getByText(/saving|unsaved|saved/i)).toHaveCount(0);
  await expect(page.getByRole("alert")).toHaveCount(0);
  // Safari's one-off backup suggestion is the only message allowed.
  await expect(
    page
      .getByRole("status")
      .filter({ hasNotText: "of your invoices to keep them" })
  ).toHaveCount(0);
  await expect.poll(() => savedContains(page, "Quote")).toBe(true);
});

test("edits typed straight away on load are kept", async ({ page }) => {
  await page.goto("/create");

  const title = page.getByLabel("Invoice title");

  await title.fill("Typed immediately");

  await expect.poll(() => savedContains(page, "Typed immediately")).toBe(true);
  await expect(title).toHaveValue("Typed immediately");
});

test("an edit survives a reload", async ({ page }) => {
  await gotoEditorReady(page, "Restored title");
  await page.getByLabel("From details").fill("Persisted seller");
  await expect.poll(() => savedContains(page, "Persisted seller")).toBe(true);

  await page.reload();

  await expect(page.getByLabel("Invoice title")).toHaveValue("Restored title");
  await expect(page.getByLabel("From details")).toHaveValue("Persisted seller");
});

test("a reload inside the save delay asks first, and staying writes the edit", async ({
  page
}) => {
  await gotoEditorReady(page, "Before the reload");

  // No waiting for the write: the browser asks while it's pending.
  await page
    .getByLabel("From details")
    .pressSequentially("Typed just before reloading");

  const asked = new Promise<string>(resolve => {
    page.once("dialog", dialog => {
      resolve(dialog.type());
      void dialog.dismiss();
    });
  });

  // Staying cancels the reload.
  await page.reload({ timeout: 3000 }).catch(() => {});

  expect(await asked).toBe("beforeunload");
  await expect
    .poll(() => savedContains(page, "Typed just before reloading"))
    .toBe(true);

  // Written, so the next reload goes without asking.
  let askedAgain = false;

  page.on("dialog", dialog => {
    askedAgain = true;
    void dialog.accept();
  });
  await page.reload();

  expect(askedAgain).toBe(false);

  await expect(page.getByLabel("From details")).toHaveValue(
    "Typed just before reloading"
  );
});

test("closing the tab while a write is pending asks first, and hiding writes it", async ({
  page
}) => {
  const context = page.context();

  await gotoEditorReady(page, "Closing soon");
  await page.getByLabel("From details").pressSequentially("Last keystroke");

  const asked = new Promise<string>(resolve => {
    page.once("dialog", dialog => {
      resolve(dialog.type());
      void dialog.dismiss();
    });
  });

  await page.close({ runBeforeUnload: true });

  expect(await asked).toBe("beforeunload");
  expect(page.isClosed()).toBe(false);

  // Hiding the page, as switching away before closing does, writes the next
  // edit at once, so the tab then closes without asking.
  await page.getByLabel("From details").pressSequentially(", then hidden");
  await hidePage(page);
  await expect
    .poll(() => savedContains(page, "Last keystroke, then hidden"), {
      timeout: 400
    })
    .toBe(true);

  let askedAgain = false;

  page.on("dialog", dialog => {
    askedAgain = true;
    void dialog.accept();
  });
  const closed = page.waitForEvent("close");

  await page.close({ runBeforeUnload: true });
  await closed;

  expect(askedAgain).toBe(false);

  const reopened = await context.newPage();

  await reopened.goto("/create");

  await expect(reopened.getByLabel("From details")).toHaveValue(
    "Last keystroke, then hidden"
  );
});

test("closing the tab a second after typing keeps the edit, without asking", async ({
  page
}) => {
  const context = page.context();
  let asked = false;

  page.on("dialog", dialog => {
    asked = true;
    void dialog.accept();
  });

  await gotoEditorReady(page, "Closing soon");
  await page.getByLabel("From details").pressSequentially("Typed a second ago");
  await page.waitForTimeout(1000);
  await page.close({ runBeforeUnload: true });

  expect(asked).toBe(false);

  const reopened = await context.newPage();

  await reopened.goto("/create");

  await expect(reopened.getByLabel("From details")).toHaveValue(
    "Typed a second ago"
  );
});

test("backgrounding writes an edit made inside the save delay", async ({
  page
}) => {
  await gotoEditorReady(page, "Backgrounded");
  await page.getByLabel("From details").fill("Last-moment edit");
  await hidePage(page);

  // Written at once, well inside the 500ms the debounce would have waited.
  await expect
    .poll(() => savedContains(page, "Last-moment edit"), { timeout: 400 })
    .toBe(true);
});

test("switching invoices mid-debounce keeps the edit in its own invoice", async ({
  page
}) => {
  await gotoEditorReady(page, "First title");
  await nameInvoice(page, "First invoice");
  await clickFileMenuItem(page, "New Invoice");
  await page.getByLabel("Invoice title").fill("Second title");
  await nameInvoice(page, "Second invoice");

  const library = page.getByRole("complementary", { name: "Invoices" });

  await library.getByRole("button", { name: /^First invoice/ }).click();
  await expect(page.getByLabel("Invoice title")).toHaveValue("First title");

  // Edit, then switch straight away, well before the write would have fired.
  await page.getByLabel("From details").fill("Belongs to the first");
  await library.getByRole("button", { name: /^Second invoice/ }).click();

  await expect(page.getByLabel("Invoice title")).toHaveValue("Second title");
  await expect(page.getByLabel("From details")).toHaveValue("");

  await library.getByRole("button", { name: /^First invoice/ }).click();

  await expect(page.getByLabel("From details")).toHaveValue(
    "Belongs to the first"
  );
});

test("New, Open and templates never ask about unsaved changes", async ({
  page
}) => {
  await gotoEditorReady(page, "Edited");
  await page.getByLabel("From details").fill("Still typing");

  await clickFileMenuItem(page, "New Invoice");

  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByLabel("Invoice title")).toHaveValue("Invoice");
  await expect.poll(() => savedContains(page, "Still typing")).toBe(true);
});

test("⌘S writes at once and says Saved, without Save Page", async ({
  page
}) => {
  await gotoEditorReady(page, "Shortcut");
  await page.getByLabel("From details").fill("Saved by shortcut");
  await pressShortcut(page, "Mod+s");

  await expect(page.getByText("Saved", { exact: true })).toBeVisible();
  expect(await savedContains(page, "Saved by shortcut")).toBe(true);
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

test("⇧⌘S duplicates the open invoice and opens the copy", async ({ page }) => {
  await gotoEditorReady(page, "Original content");
  await nameInvoice(page, "Quarterly retainer");

  await pressShortcut(page, "Mod+Shift+s");

  await expect(invoiceNameField(page)).toHaveValue("Quarterly retainer copy");
  await expect(page.getByLabel("Invoice title")).toHaveValue(
    "Original content"
  );
  await expect.poll(() => countSavedInvoices(page)).toBe(2);
});

test("Duplicate As makes a quote into an invoice and leaves the quote", async ({
  page
}) => {
  await gotoEditorSettled(page);
  await openFileMenu(page);
  await page.getByRole("menuitem", { name: "New Document" }).hover();
  await page.getByRole("menuitem", { name: "Quote", exact: true }).click();
  await expect(page.getByLabel("Invoice title")).toHaveValue("Quote");
  await nameInvoice(page, "Acme website");

  await openFileMenu(page);
  await page.getByRole("menuitem", { name: "Duplicate As" }).hover();
  await page.getByRole("menuitem", { name: "Invoice", exact: true }).click();

  await expect(invoiceNameField(page)).toHaveValue("Acme website copy");
  await expect(page.getByLabel("Invoice title")).toHaveValue("Invoice");
  await expect(
    page.getByText("Copied from QUO-0001 as an invoice")
  ).toBeVisible();
  await expect.poll(() => countSavedInvoices(page)).toBe(2);
  await expect.poll(() => savedContains(page, "Quote")).toBe(true);
});

test("the project menu has no Save, Save As or unsaved prompt", async ({
  page
}) => {
  await gotoEditorReady(page, "Menu check");
  await page.getByRole("button", { name: "Project menu" }).click();

  await expect(page.getByRole("menuitem", { name: /^Save$/ })).toHaveCount(0);
  await expect(
    page.getByRole("menuitem", { name: /Save As\.\.\./ })
  ).toHaveCount(0);
  await expect(
    page.getByRole("menuitem", { name: /^Duplicate(?! As)/ })
  ).toBeVisible();
  await expect(
    page.getByRole("menuitem", { name: "Save As Template" })
  ).toBeVisible();

  await page.getByRole("menuitem", { name: "Back to homepage" }).click();

  await expect(page).toHaveURL("/");
});

test("an invoice edited back to blank is deleted when it's left", async ({
  page
}) => {
  await gotoEditorSettled(page);

  const title = page.getByLabel("Invoice title");

  await title.fill("Briefly");
  await expect.poll(() => countSavedInvoices(page)).toBe(1);

  await title.fill("Invoice");
  await clickFileMenuItem(page, "New Invoice");

  await expect.poll(() => countSavedInvoices(page)).toBe(0);
});

test("naming a new invoice adds it to the library under that name", async ({
  page
}) => {
  await gotoEditorSettled(page);
  await nameInvoice(page, "Named before editing");

  await clickFileMenuItem(page, "New Invoice");

  expect(await countSavedInvoices(page)).toBe(1);
  expect(await savedContains(page, "Named before editing")).toBe(true);
});

test("a blank name leaves the invoice's name as it was", async ({ page }) => {
  await gotoEditorReady(page, "Named doc");
  await nameInvoice(page, "Kept name");

  const field = invoiceNameField(page);

  await field.fill("   ");
  await field.press("Enter");

  await expect(field).toHaveValue("Kept name");
});

test("Escape leaves the invoice's name as it was", async ({ page }) => {
  await gotoEditorReady(page, "Named doc");
  await nameInvoice(page, "Kept name");

  const field = invoiceNameField(page);

  await field.fill("Discarded name");
  await field.press("Escape");

  await expect(field).toHaveValue("Kept name");
  await page.waitForTimeout(1000);
  expect(await savedContains(page, "Discarded name")).toBe(false);
});

test("whitespace-only names are rejected on Save As Template", async ({
  page
}) => {
  await gotoEditorReady(page, "Template source");
  await clickFileMenuItem(page, "Save As Template");

  const dialog = page.getByRole("dialog", { name: "Save as Template" });

  await dialog.getByPlaceholder("Enter template name").fill("   ");
  await dialog.getByRole("button", { name: "Create Template" }).click();

  await expect(dialog).toBeVisible();
});

test("a newer version upgrading storage in another tab asks to reload", async ({
  page
}) => {
  await gotoEditorReady(page, "Before the upgrade");

  // A newer version opening the database at a higher version, as another tab
  // running a new deploy would.
  await page.evaluate(async databaseName => {
    const current = await new Promise<number>(resolve => {
      const request = indexedDB.open(databaseName);

      request.onsuccess = () => {
        const version = request.result.version;

        request.result.close();
        resolve(version);
      };
    });

    await new Promise<void>(resolve => {
      const request = indexedDB.open(databaseName, current + 10);

      request.onsuccess = () => {
        request.result.close();
        resolve();
      };
    });
  }, DB_NAME);

  await expect(page.getByText(/was updated in another tab/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Reload" })).toBeVisible();
});

test("a failed save is announced once, kept, backed up and retried", async ({
  page
}) => {
  // Playwright's DevTools quota cap doesn't make IndexedDB refuse writes, so
  // the page's IndexedDB throws the browser's own QuotaExceededError while
  // the disk is "full".
  await page.addInitScript(() => {
    const storage = { full: false };

    Object.assign(window, { storage });

    for (const method of ["put", "add"] as const) {
      const original = IDBObjectStore.prototype[method];

      IDBObjectStore.prototype[method] = function (
        this: IDBObjectStore,
        ...args: Parameters<IDBObjectStore["put"]>
      ) {
        if (storage.full && this.name === "invoices") {
          throw new DOMException(
            "The quota has been exceeded.",
            "QuotaExceededError"
          );
        }

        return original.apply(this, args);
      };
    }
  });

  await gotoEditorReady(page, "Before the disk filled");
  await page.evaluate(() =>
    Object.assign((window as unknown as { storage: object }).storage, {
      full: true
    })
  );
  await page.getByLabel("From details").pressSequentially("Written while full");

  const alert = page.getByRole("alert");

  await expect(alert).toContainText("storage is full");
  // Retries carry on in the background without announcing again.
  await page.waitForTimeout(2500);
  await expect(alert).toHaveCount(1);
  await expect(page.getByLabel("From details")).toHaveValue(
    "Written while full"
  );
  expect(await savedContains(page, "Written while full")).toBe(false);

  // The backup has the edit storage couldn't take.
  const downloadPromise = page.waitForEvent("download");

  await alert.getByRole("button", { name: "download a backup" }).click();

  const download = await downloadPromise;
  const chunks: Buffer[] = [];

  for await (const chunk of await download.createReadStream()) {
    chunks.push(chunk as Buffer);
  }

  expect(download.suggestedFilename()).toMatch(
    new RegExp(`^${APP_NAME}-backup-`)
  );
  expect(Buffer.concat(chunks).toString("utf8")).toContain(
    "Written while full"
  );

  // Retry while still full: the same message stays, not a second one.
  await alert.getByRole("button", { name: "Retry" }).click();
  await expect(alert).toContainText("storage is full");
  await expect(page.getByRole("alert")).toHaveCount(1);

  // Retry now is disabled while a retry runs. Wait for the one above to
  // finish, so the click after storage frees up isn't dropped and left to the
  // background retry, which by now is 10 to 30 seconds away.
  const retryNow = alert.getByRole("button", { name: "Retry now" });

  await expect(retryNow).toBeEnabled();
  await page.evaluate(() =>
    Object.assign((window as unknown as { storage: object }).storage, {
      full: false
    })
  );
  // A background retry may get there first and take the message away, so
  // retry until it's gone rather than clicking once.
  await expect(async () => {
    if (await retryNow.isEnabled({ timeout: 500 }).catch(() => false)) {
      await retryNow.click({ timeout: 500 }).catch(() => {});
    }

    await expect(page.getByRole("alert")).toHaveCount(0, { timeout: 1000 });
  }).toPass({ timeout: 15_000 });
  await expect.poll(() => savedContains(page, "Written while full")).toBe(true);
});

test.describe("in Safari, when the browser won't keep storage", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(navigator, "vendor", {
        get: () => "Apple Computer, Inc."
      });
      Object.assign(navigator.storage, {
        persisted: () => Promise.resolve(false),
        persist: () => Promise.resolve(false)
      });
    });
  });

  test("a backup is suggested once, in the banner, until dismissed", async ({
    page
  }) => {
    await gotoEditorReady(page, "Kept in Safari");

    const reminder = page
      .getByRole("status")
      .filter({ hasText: "of your invoices to keep them" });

    await expect(reminder).toBeVisible();

    await reminder.getByRole("button", { name: "Dismiss" }).click();
    await expect(reminder).toHaveCount(0);

    await page.reload();
    await expect(page.getByLabel("Invoice title")).toHaveValue(
      "Kept in Safari"
    );
    await page.waitForTimeout(500);
    await expect(reminder).toHaveCount(0);
  });

  test("downloading the suggested backup puts the suggestion away", async ({
    page
  }) => {
    await gotoEditorReady(page, "Backed up");

    const reminder = page
      .getByRole("status")
      .filter({ hasText: "of your invoices to keep them" });
    const downloadPromise = page.waitForEvent("download");

    await reminder.getByRole("button", { name: "download a backup" }).click();

    expect((await downloadPromise).suggestedFilename()).toMatch(
      new RegExp(`^${APP_NAME}-backup-`)
    );
    await expect(reminder).toHaveCount(0);
  });
});
