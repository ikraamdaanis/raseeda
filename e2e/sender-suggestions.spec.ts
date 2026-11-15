import type { Page } from "@playwright/test";
import { expect, test } from "./fixtures";
import {
  clickFileMenuItem,
  gotoEditorReady,
  pressShortcut,
  savedContains
} from "./helpers";

// The user's own From details from past invoices are offered while the From
// block is filled in (issue #207), with the payment details printed alongside
// them.

function suggestionList(page: Page) {
  return page.getByRole("listbox", { name: "Your details from past invoices" });
}

function bankField(page: Page, name: string) {
  return page.getByRole("textbox", { name, exact: true });
}

// A past invoice from Jane Doe, paid into her IBAN under a renamed label.
async function sendPastInvoice(page: Page) {
  await gotoEditorReady(page, "Past invoice");
  await page.getByLabel("From details").fill("Jane Doe\n1 High Street");
  await page.getByLabel("IBAN label").fill("Konto");
  await bankField(page, "Konto").fill("GB29 NWBK 6016 1331 9268 19");
  await expect.poll(() => savedContains(page, "GB29 NWBK")).toBe(true);
  await expect.poll(() => savedContains(page, "1 High Street")).toBe(true);
  await clickFileMenuItem(page, "New Invoice");
  await expect(page.getByLabel("Invoice title")).toHaveValue("Invoice");
}

test("picks your details and payment details as one undo step", async ({
  page
}) => {
  await sendPastInvoice(page);

  const from = page.getByLabel("From details");

  await from.fill("ja");
  await expect(suggestionList(page).getByRole("option")).toHaveText([
    /Jane Doe.*1 High Street/
  ]);

  await from.press("ArrowDown");
  await expect(
    suggestionList(page).getByRole("option", { selected: true })
  ).toContainText("Jane Doe");
  await from.press("Enter");

  await expect(suggestionList(page)).toHaveCount(0);
  await expect(from).toHaveValue("Jane Doe\n1 High Street");
  await expect(bankField(page, "Konto")).toHaveValue(
    "GB29 NWBK 6016 1331 9268 19"
  );

  await pressShortcut(page, "Mod+z");

  await expect(from).toHaveValue("ja");
  await expect(page.getByLabel("IBAN label")).toHaveValue("IBAN");
  await expect(bankField(page, "IBAN")).toHaveValue("");
});

test("never overwrites payment details already typed", async ({ page }) => {
  await sendPastInvoice(page);
  await bankField(page, "Bank name").fill("Acme Bank");

  const from = page.getByLabel("From details");

  await from.fill("Jane");
  await suggestionList(page)
    .getByRole("option", { name: /Jane Doe/ })
    .click();

  await expect(from).toHaveValue("Jane Doe\n1 High Street");
  await expect(bankField(page, "Bank name")).toHaveValue("Acme Bank");
  await expect(bankField(page, "IBAN")).toHaveValue("");
});

test("brings the payment details switch with it", async ({ page }) => {
  await gotoEditorReady(page, "Past invoice");
  await page.getByLabel("From details").fill("Jane Doe");
  await page.getByRole("button", { name: "Hide payment details" }).click();
  await expect
    .poll(() => savedContains(page, '"paymentDetails":false'))
    .toBe(true);
  await clickFileMenuItem(page, "New Invoice");
  await expect(page.getByLabel("Invoice title")).toHaveValue("Invoice");
  await expect(page.getByLabel("Payment details section label")).toBeVisible();

  await page.getByLabel("From details").fill("Jane");
  await suggestionList(page)
    .getByRole("option", { name: /Jane Doe/ })
    .click();

  await expect(page.getByLabel("Payment details section label")).toHaveCount(0);
});

test("Escape closes the list; a second line and Preview offer nothing", async ({
  page
}) => {
  await sendPastInvoice(page);

  const from = page.getByLabel("From details");

  await from.fill("Jane");
  await expect(suggestionList(page)).toBeVisible();
  await from.press("Escape");
  await expect(suggestionList(page)).toHaveCount(0);
  await expect(from).toBeFocused();

  await from.fill("Jane\n");
  await expect(suggestionList(page)).toHaveCount(0);

  await page
    .getByRole("group", { name: "Mode" })
    .getByRole("button", { name: "Preview" })
    .click();
  await from.focus();
  await expect(from).toBeFocused();
  await expect(suggestionList(page)).toHaveCount(0);
  await page
    .getByRole("group", { name: "Mode" })
    .getByRole("button", { name: "Edit" })
    .click();
});

test("never suggests the open invoice itself", async ({ page }) => {
  await gotoEditorReady(page, "Only invoice");

  const from = page.getByLabel("From details");

  await from.fill("Jane Doe\n1 High Street");
  await expect.poll(() => savedContains(page, "1 High Street")).toBe(true);
  await page.getByLabel("Invoice title").focus();
  await from.focus();
  await from.fill("Jane");
  await expect(suggestionList(page)).toHaveCount(0);
});

test.describe("on a phone", () => {
  test.use({
    viewport: { width: 390, height: 664 },
    hasTouch: true,
    isMobile: true
  });

  test("a suggestion can be tapped", async ({ page }) => {
    const title = page.getByRole("textbox", { name: "Invoice title" });
    const from = page.getByRole("textbox", { name: "From details" });

    await page.goto("/create");
    await title.fill("Past invoice");
    await from.fill("Jane Doe\n1 High Street");
    await expect.poll(() => savedContains(page, "1 High Street")).toBe(true);
    await clickFileMenuItem(page, "New Invoice");
    await expect(title).toHaveValue("Invoice");

    await from.tap();
    await from.fill("ja");
    await suggestionList(page)
      .getByRole("option", { name: /Jane Doe/ })
      .tap();

    await expect(from).toHaveValue("Jane Doe\n1 High Street");
  });
});
