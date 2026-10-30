import type { Page } from "@playwright/test";
import { expect, test } from "./fixtures";
import {
  addLineItem,
  gotoEditorReady,
  gotoEditorSettled,
  openFileMenu,
  pressShortcut,
  savedContains
} from "./helpers";

// Undo and redo for the whole invoice: ⌘Z and ⇧⌘Z (Ctrl+Z, Ctrl+Y elsewhere)
// inside fields and out, one step per field and pause, with focus and the
// caret back where the change was.

const UNDO = "Mod+z";
const REDO = "Mod+Shift+z";

// A 1x1 transparent PNG.
const PNG_BYTES = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M8AAAMBAQDJ/pLvAAAAAElFTkSuQmCC",
  "base64"
);

async function selection(page: Page) {
  return await page.evaluate(() => {
    const element = document.activeElement;

    return element instanceof HTMLInputElement ||
      element instanceof HTMLTextAreaElement
      ? [element.selectionStart, element.selectionEnd]
      : null;
  });
}

test("⌘Z inside a field undoes typing a pause at a time, caret and all", async ({
  page
}) => {
  await gotoEditorSettled(page);

  const title = page.getByLabel("Invoice title");

  await title.click();
  await title.press("ControlOrMeta+a");
  await title.pressSequentially("Hello", { delay: 30 });
  // A pause longer than 500ms ends the step.
  await page.waitForTimeout(700);
  await title.pressSequentially(" world", { delay: 30 });

  await pressShortcut(page, UNDO);

  await expect(title).toHaveValue("Hello");
  await expect(title).toBeFocused();
  expect(await selection(page)).toEqual([5, 5]);

  await pressShortcut(page, UNDO);

  await expect(title).toHaveValue("Invoice");
  // The caret goes back to before the step: the whole title was selected.
  expect(await selection(page)).toEqual([0, 7]);

  await pressShortcut(page, REDO);

  await expect(title).toHaveValue("Hello");
  expect(await selection(page)).toEqual([5, 5]);
});

test("focus moving to another field ends the step", async ({ page }) => {
  await gotoEditorSettled(page);
  await page.getByLabel("Invoice title").fill("Quote");
  await page.getByLabel("From details").fill("Acme Inc.");
  await page.getByLabel("Invoice title").fill("Quote 2");

  await pressShortcut(page, UNDO);
  await expect(page.getByLabel("Invoice title")).toHaveValue("Quote");
  await pressShortcut(page, UNDO);
  await expect(page.getByLabel("From details")).toHaveValue("");
  await expect(page.getByLabel("From details")).toBeFocused();
});

test("undo works outside fields and puts focus back on what changed", async ({
  page
}) => {
  await gotoEditorSettled(page);
  await page.getByLabel("Invoice title").fill("Changed");
  await page.locator("main").click({ position: { x: 4, y: 4 } });

  await expect(page.getByLabel("Invoice title")).not.toBeFocused();

  await pressShortcut(page, UNDO);

  await expect(page.getByLabel("Invoice title")).toHaveValue("Invoice");
  await expect(page.getByLabel("Invoice title")).toBeFocused();
});

test("a removed row comes back, and the table flashes", async ({ page }) => {
  await gotoEditorReady(page);
  await addLineItem(page);
  await page.getByLabel("Item, item 2").fill("Second row");
  await page.getByRole("button", { name: "Remove item 2" }).click();

  await expect(page.getByLabel("Item, item 2")).toHaveCount(0);

  await pressShortcut(page, UNDO);

  await expect(page.getByLabel("Item, item 2")).toHaveValue("Second row");
  await expect(page.locator('[data-field-area="items"]')).toHaveAttribute(
    "data-history-flash",
    ""
  );
});

test("a section switch flips back with undo", async ({ page }) => {
  await gotoEditorReady(page);

  const notes = page.getByRole("switch", { name: "Notes" });

  await notes.click();
  await expect(page.getByLabel("Notes content")).toBeVisible();

  await pressShortcut(page, UNDO);

  await expect(page.getByLabel("Notes content")).toHaveCount(0);
  await expect(notes).not.toBeChecked();

  await pressShortcut(page, REDO);

  await expect(page.getByLabel("Notes content")).toBeVisible();
});

test("a number field shows the stored number after undo, never a stale draft", async ({
  page
}) => {
  await gotoEditorReady(page);

  const quantity = page.getByLabel("Quantity, item 1");
  const price = page.getByLabel("Unit Price, item 1");

  await price.click();
  await price.press("ControlOrMeta+a");
  await price.pressSequentially("100");
  await quantity.click();
  await quantity.press("ControlOrMeta+a");
  await quantity.pressSequentially("35");

  await expect(page.getByLabel("Amount, item 1")).toContainText("3,500");

  // Still focused, still holding the typed draft.
  await pressShortcut(page, UNDO);

  await expect(quantity).toBeFocused();
  await expect(quantity).toHaveValue("1");
  await expect(page.getByLabel("Amount, item 1")).toContainText("100.00");

  await pressShortcut(page, UNDO);

  await expect(price).toBeFocused();
  await expect(price).toHaveValue("$0");
  await expect(page.getByLabel("Amount, item 1")).toContainText("0.00");

  await pressShortcut(page, REDO);
  await pressShortcut(page, REDO);

  await expect(quantity).toHaveValue("35");
  await quantity.blur();
  await expect(page.getByLabel("Amount, item 1")).toContainText("3,500");
});

test("a pricing field follows undo while focused", async ({ page }) => {
  await gotoEditorReady(page);

  const tax = page.getByLabel("Tax percentage");

  await tax.click();
  await tax.press("ControlOrMeta+a");
  await tax.pressSequentially("20");

  await pressShortcut(page, UNDO);

  await expect(tax).toBeFocused();
  await expect(tax).toHaveValue("0");
});

test("undoing a logo removal brings the logo back, even after a reload", async ({
  page
}) => {
  await gotoEditorReady(page);
  await page.locator('input[type="file"]').setInputFiles({
    name: "logo.png",
    mimeType: "image/png",
    buffer: PNG_BYTES
  });

  const logo = page.getByRole("img", { name: "Invoice logo" });

  await expect(logo).toBeVisible();

  await page.getByRole("button", { name: "Remove invoice logo" }).click();
  await expect(logo).toHaveCount(0);

  await pressShortcut(page, UNDO);

  await expect(logo).toBeVisible();
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          document.querySelector<HTMLImageElement>("img[alt='Invoice logo']")
            ?.complete
      )
    )
    .toBe(true);

  await page.waitForTimeout(800);
  await page.reload();

  await expect(page.getByRole("img", { name: "Invoice logo" })).toBeVisible();
});

test("undo and redo sit in the project menu, naming the change", async ({
  page
}) => {
  await gotoEditorSettled(page);
  await openFileMenu(page);

  await expect(page.getByRole("menuitem", { name: /^Undo/ })).toBeDisabled();
  await page.keyboard.press("Escape");

  await page.getByLabel("Invoice title").fill("Named change");
  await openFileMenu(page);

  const undo = page.getByRole("menuitem", {
    name: /Undo change to Invoice title/
  });

  await expect(undo).toBeEnabled();
  await expect(page.getByRole("menuitem", { name: /^Redo/ })).toBeDisabled();
  await undo.click();

  await expect(page.getByLabel("Invoice title")).toHaveValue("Invoice");
});

test("quick actions offer undo and redo", async ({ page }) => {
  await gotoEditorSettled(page);
  await page.getByLabel("Invoice title").fill("From the palette");
  await page.getByLabel("Invoice title").blur();
  await pressShortcut(page, "Mod+k");

  const palette = page.getByRole("dialog", { name: "Quick actions" });

  await palette
    .getByRole("option", { name: /Undo change to Invoice title/ })
    .click();

  await expect(page.getByLabel("Invoice title")).toHaveValue("Invoice");
});

test("an undo is saved like any edit", async ({ page }) => {
  await gotoEditorReady(page, "Saved title");
  await page.getByLabel("Invoice title").fill("Then undone");
  await expect.poll(() => savedContains(page, "Then undone")).toBe(true);

  await pressShortcut(page, UNDO);

  await expect.poll(() => savedContains(page, "Then undone")).toBe(false);
  expect(await savedContains(page, "Saved title")).toBe(true);
});

test("the browser's Edit menu undo goes through the app's history", async ({
  page
}) => {
  await gotoEditorSettled(page);

  const title = page.getByLabel("Invoice title");

  await title.fill("From the menu");

  // Edit > Undo, the context menu and iOS's shake send this with no key.
  await title.evaluate(field => {
    field.dispatchEvent(
      new InputEvent("beforeinput", {
        inputType: "historyUndo",
        bubbles: true,
        cancelable: true
      })
    );
  });

  await expect(title).toHaveValue("Invoice");
});

test("dialogs and the library search keep their own undo", async ({ page }) => {
  await gotoEditorSettled(page);
  await page.getByLabel("Invoice title").fill("Untouched by dialogs");

  const search = page.getByPlaceholder("Search invoices");

  // Typed for real: WebKit keeps one undo stack for the whole page, so the
  // field's own typing has to be on top of it. These fields use the browser's
  // own undo, so its key is the one for the machine the browser runs on.
  if (await search.isVisible()) {
    await search.pressSequentially("abc");
    await search.press("ControlOrMeta+z");

    await expect(search).toHaveValue("");

    await expect(page.getByLabel("Invoice title")).toHaveValue(
      "Untouched by dialogs"
    );
  }

  await pressShortcut(page, "Mod+k");
  await page
    .getByPlaceholder("Type a command or search")
    .pressSequentially("zoom");
  await page.keyboard.press("ControlOrMeta+z");
  await page.keyboard.press("Escape");

  await expect(page.getByLabel("Invoice title")).toHaveValue(
    "Untouched by dialogs"
  );
});

test.describe("on Windows and Linux", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(navigator, "platform", { get: () => "Win32" });
      Object.defineProperty(navigator, "userAgent", {
        get: () =>
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36"
      });
    });
  });

  test("Ctrl+Z undoes, and Ctrl+Y and Ctrl+Shift+Z redo", async ({ page }) => {
    await gotoEditorSettled(page);

    const title = page.getByLabel("Invoice title");

    await title.fill("Windows edit");
    await page.keyboard.press("Control+z");
    await expect(title).toHaveValue("Invoice");
    await page.keyboard.press("Control+y");
    await expect(title).toHaveValue("Windows edit");
    await page.keyboard.press("Control+z");
    await page.keyboard.press("Control+Shift+z");
    await expect(title).toHaveValue("Windows edit");
  });
});

test.describe("on a phone", () => {
  test.use({
    viewport: { width: 390, height: 664 },
    hasTouch: true,
    isMobile: true
  });

  test("undo and redo sit in the top bar, off with nothing to undo", async ({
    page
  }) => {
    await gotoEditorSettled(page);

    const undo = page.getByRole("button", { name: /^Undo/ });
    const redo = page.getByRole("button", { name: /^Redo/ });

    await expect(undo).toBeVisible();
    await expect(undo).toBeDisabled();
    await expect(redo).toBeDisabled();

    await page
      .getByRole("textbox", { name: "Invoice title" })
      .fill("Phone edit");
    await page.getByRole("button", { name: "Done" }).click();

    await expect(
      page.getByRole("button", { name: "Undo change to Invoice title" })
    ).toBeEnabled();

    await undo.click();

    await expect(
      page.getByRole("textbox", { name: "Invoice title" })
    ).toHaveValue("Invoice");
    await expect(redo).toBeEnabled();

    await redo.click();

    await expect(
      page.getByRole("textbox", { name: "Invoice title" })
    ).toHaveValue("Phone edit");
  });
});
