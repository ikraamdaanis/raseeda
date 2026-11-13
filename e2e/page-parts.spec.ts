import type { Page } from "@playwright/test";
import { expect, test } from "./fixtures";
import { gotoEditorReady, isoToday, setNumber } from "./helpers";

// Every value and every optional part is changed on the page; the inspector
// only holds how the invoice looks and reads.

function modeButton(page: Page, name: "Edit" | "Preview") {
  return page
    .getByRole("group", { name: "Mode" })
    .getByRole("button", { name });
}

test("the inspector holds looks and formats, not values or sections", async ({
  page
}) => {
  await gotoEditorReady(page);

  const inspector = page.getByRole("complementary", { name: "Inspector" });

  await expect(
    inspector.getByRole("button", { name: "Format", exact: true })
  ).toBeVisible();
  await expect(
    inspector.getByRole("button", { name: "Sections", exact: true })
  ).toHaveCount(0);
  await expect(inspector.getByLabel("Currency", { exact: true })).toHaveCount(
    0
  );
  await expect(inspector.getByLabel("Issue date")).toHaveCount(0);
  await expect(inspector.getByLabel("Payment terms")).toHaveCount(0);
});

test("a part that's off is added from its slot and hidden with its ×", async ({
  page
}) => {
  await gotoEditorReady(page);

  const footerSlot = page.getByRole("button", { name: "Add to the footer" });

  await footerSlot.click();

  const menu = page.getByRole("menu");

  await expect(menu.getByRole("menuitem")).toHaveText([
    "Notes",
    "Terms",
    "Late payment fee",
    "Signature"
  ]);

  await menu.getByRole("menuitem", { name: "Terms" }).click();

  await expect(page.getByLabel("Terms and conditions content")).toBeVisible();

  await footerSlot.click();

  await expect(page.getByRole("menu").getByRole("menuitem")).toHaveText([
    "Notes",
    "Late payment fee",
    "Signature"
  ]);

  await expect(page.getByRole("menu")).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("menu")).toHaveCount(0);
  await page.getByRole("button", { name: "Hide terms" }).click();

  await expect(page.getByLabel("Terms and conditions content")).toHaveCount(0);

  await page.getByRole("button", { name: "Hide PO number" }).click();

  await expect(page.getByLabel("PO number", { exact: true })).toHaveCount(0);

  await page.getByRole("button", { name: "Add to the details" }).click();
  await page.getByRole("menuitem", { name: "PO number" }).click();

  await expect(page.getByLabel("PO number", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Add shipping" }).click();

  await expect(page.getByLabel("Shipping section label")).toBeVisible();

  await page.getByRole("button", { name: "Hide discounts" }).click();

  await expect(page.getByLabel("Discounts label")).toHaveCount(0);

  await modeButton(page, "Preview").click();

  await expect(page.getByRole("button", { name: /^Add / })).toHaveCount(0);

  await modeButton(page, "Edit").click();
  await page.getByRole("button", { name: "Add discounts" }).click();

  await expect(page.getByLabel("Discounts label")).toBeVisible();
});

test("the logo hides with its × and comes back from its slot", async ({
  page
}) => {
  await gotoEditorReady(page);

  await page.getByRole("button", { name: "Hide logo" }).click();

  await expect(page.getByRole("button", { name: /invoice logo/ })).toHaveCount(
    0
  );

  await page.getByRole("button", { name: "Add logo" }).click();

  await expect(
    page.getByRole("button", { name: /Upload invoice logo/ })
  ).toBeVisible();
});

test("the paid stamp is switched on beside the amount paid", async ({
  page
}) => {
  await gotoEditorReady(page);

  await setNumber(page.getByLabel("Quantity, item 1"), "1");
  await setNumber(page.getByLabel("Unit Price, item 1"), "100");
  await setNumber(page.getByLabel("Amount paid", { exact: true }), "100");

  const stamp = page.getByRole("button", { name: "Toggle paid stamp" });

  await expect(stamp).toHaveAttribute("aria-pressed", "false");
  await expect(page.getByText("PAID", { exact: true })).toHaveCount(1);

  await stamp.click();

  await expect(stamp).toHaveAttribute("aria-pressed", "true");
  await expect(
    page.locator('[data-field-area="title"]').getByText("PAID")
  ).toBeVisible();
});

test("payment terms set the due date from its calendar and follow the issue date", async ({
  page
}) => {
  await gotoEditorReady(page);

  const dueDate = page.getByLabel("Due date", { exact: true });

  await dueDate.click();

  const terms = page.getByRole("group", { name: "Payment terms" });

  await expect(terms.getByRole("button", { name: "Net 30" })).toHaveAttribute(
    "aria-pressed",
    "true"
  );

  await terms.getByRole("button", { name: "Net 14" }).click();

  await expect(dueDate).toHaveAttribute("data-date", isoToday(14));

  // A day in the month the calendar opens on, so it's always in view.
  const nextDay = await page.evaluate(() => {
    const date = new Date();
    const offset = date.getDate() === 1 ? 1 : -1;

    date.setDate(date.getDate() + offset);

    return { offset, day: date.toLocaleDateString() };
  });

  await page.getByLabel("Date", { exact: true }).click();
  await page.locator(`[data-day="${nextDay.day}"]`).click();

  await expect(page.getByLabel("Date", { exact: true })).toHaveAttribute(
    "data-date",
    isoToday(nextDay.offset)
  );
  await expect(dueDate).toHaveAttribute(
    "data-date",
    isoToday(nextDay.offset + 14)
  );
});

test("the total opens the currency and the second currency", async ({
  page
}) => {
  await gotoEditorReady(page);

  await setNumber(page.getByLabel("Quantity, item 1"), "1");
  await setNumber(page.getByLabel("Unit Price, item 1"), "100");

  await page.getByRole("button", { name: "Change currency" }).click();
  await page
    .getByRole("combobox", { name: "Currency", exact: true })
    .selectOption("£");

  await expect(page.getByTestId("total-value")).toHaveText("£100.00 GBP");

  await page.getByRole("button", { name: "Add second currency" }).click();

  await expect(
    page.getByRole("combobox", { name: "Also show in" })
  ).toBeFocused();

  await page.keyboard.press("Escape");

  const rate = page.getByLabel(/^Exchange rate, /);

  await expect(rate).toBeVisible();

  await page.getByRole("button", { name: "Hide exchange rate" }).click();

  await expect(rate).toHaveCount(0);

  await page.getByRole("button", { name: "Add exchange rate" }).click();

  await expect(rate).toBeVisible();

  await modeButton(page, "Preview").click();

  await expect(
    page.getByRole("button", { name: "Change currency" })
  ).toHaveCount(0);
  await expect(page.getByTestId("total-value")).toHaveText("£100.00 GBP");
});
