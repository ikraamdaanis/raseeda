import type { Page } from "@playwright/test";
import { expect, test } from "./fixtures";
import {
  addLineItem,
  gotoEditorReady,
  pressShortcut,
  savedContains,
  setNumber
} from "./helpers";

// Per-line tax rates in the editor (issue #107): the Per line switch on the
// tax row, and each line's own rate and Exempt toggle in the Tax column. The
// sums are unit-tested in Vitest; these specs check the editor wires them up.

function modeButton(page: Page, name: "Edit" | "Preview") {
  return page
    .getByRole("group", { name: "Mode" })
    .getByRole("button", { name });
}

// The Tax column's header, a field even in Preview, where it reads the label.
function taxHeader(page: Page) {
  return page
    .getByRole("columnheader")
    .getByRole("textbox", { name: "Tax column label" });
}

// Two lines at the invoice's 20%: £100 and £50.
async function gotoTwoLineInvoice(page: Page) {
  await gotoEditorReady(page);
  await setNumber(page.getByLabel("Quantity, item 1"), "1");
  await setNumber(page.getByLabel("Unit Price, item 1"), "100");
  await addLineItem(page);
  await setNumber(page.getByLabel("Quantity, item 2"), "1");
  await setNumber(page.getByLabel("Unit Price, item 2"), "50");
  await setNumber(page.getByLabel("Tax percentage"), "20");
}

test("Per line shows an editable Tax column with the invoice rate as each placeholder", async ({
  page
}) => {
  await gotoTwoLineInvoice(page);

  await expect(page.getByLabel("Tax, item 1")).toHaveCount(0);

  await page.getByRole("button", { name: "Toggle tax per line" }).click();

  await expect(page.getByLabel("Tax, item 1")).toHaveValue("");
  await expect(page.getByLabel("Tax, item 1")).toHaveAttribute(
    "placeholder",
    "20"
  );
  await expect(page.getByLabel("Tax, item 2")).toHaveAttribute(
    "placeholder",
    "20"
  );
  await expect(page.getByTestId("tax-amount")).toHaveText("$30.00");
});

test("a line's own rate splits the totals into a row per rate", async ({
  page
}) => {
  await gotoTwoLineInvoice(page);
  await page.getByRole("button", { name: "Toggle tax per line" }).click();

  await setNumber(page.getByLabel("Tax, item 2"), "0");

  await expect(page.getByTestId("total-value")).toHaveText("$170.00 USD");

  await modeButton(page, "Preview").click();

  await expect(taxHeader(page)).toHaveValue("Tax");
  await expect(page.getByText("Tax 20% on $100.00")).toBeVisible();
  await expect(page.getByText("Tax 0% on $50.00")).toBeVisible();
});

test("the invoice's own rate stays editable while lines have their own", async ({
  page
}) => {
  await gotoTwoLineInvoice(page);
  await page.getByRole("button", { name: "Toggle tax per line" }).click();
  await setNumber(page.getByLabel("Tax, item 2"), "0");

  await setNumber(page.getByLabel("Tax percentage"), "10");

  await expect(page.getByLabel("Tax, item 1")).toHaveAttribute(
    "placeholder",
    "10"
  );
  await expect(page.getByText("Tax 10% on $100.00")).toBeVisible();
  await expect(page.getByTestId("total-value")).toHaveText("$160.00 USD");
});

test("a line's Exempt toggle hides its rate and keeps it", async ({ page }) => {
  await gotoTwoLineInvoice(page);
  await page.getByRole("button", { name: "Toggle tax per line" }).click();
  await setNumber(page.getByLabel("Tax, item 2"), "5");

  const exempt = page.getByRole("button", { name: "Toggle exempt, item 2" });

  await exempt.click();

  await expect(page.getByLabel("Tax, item 2")).toHaveCount(0);
  await expect(exempt).toHaveText("Exempt");
  await expect(page.getByText("Exempt on $50.00")).toBeVisible();

  await exempt.click();

  await expect(page.getByLabel("Tax, item 2")).toHaveValue("5");
  await expect(page.getByText("Tax 5% on $50.00")).toBeVisible();
});

test("clearing a line's rate puts it back on the invoice's", async ({
  page
}) => {
  await gotoTwoLineInvoice(page);
  await page.getByRole("button", { name: "Toggle tax per line" }).click();
  await setNumber(page.getByLabel("Tax, item 2"), "0");
  await expect(page.getByTestId("total-value")).toHaveText("$170.00 USD");

  const cell = page.getByLabel("Tax, item 2");

  await cell.click();
  await cell.press("ControlOrMeta+a");
  await cell.press("Backspace");
  await cell.blur();

  await expect(cell).toHaveValue("");
  await expect(page.getByTestId("total-value")).toHaveText("$180.00 USD");
});

test("Per line off returns to one rate, and back on restores the lines' rates", async ({
  page
}) => {
  await gotoTwoLineInvoice(page);

  const perLine = page.getByRole("button", { name: "Toggle tax per line" });

  await perLine.click();
  await setNumber(page.getByLabel("Tax, item 2"), "0");
  await perLine.click();

  await expect(page.getByLabel("Tax, item 2")).toHaveCount(0);
  await expect(page.getByTestId("total-value")).toHaveText("$180.00 USD");

  await modeButton(page, "Preview").click();

  await expect(taxHeader(page)).toHaveCount(0);

  await modeButton(page, "Edit").click();
  await perLine.click();

  await expect(page.getByLabel("Tax, item 2")).toHaveValue("0");
  await expect(page.getByTestId("total-value")).toHaveText("$170.00 USD");
});

test("undo and redo step through line rates, which autosave", async ({
  page
}) => {
  await gotoTwoLineInvoice(page);
  await page.getByRole("button", { name: "Toggle tax per line" }).click();
  await setNumber(page.getByLabel("Tax, item 2"), "7");

  await expect
    .poll(() => savedContains(page, '"tax":{"percentage":7,"exempt":false}'))
    .toBe(true);

  await pressShortcut(page, "Mod+z");

  await expect(page.getByLabel("Tax, item 2")).toHaveValue("");
  await expect(page.getByTestId("total-value")).toHaveText("$180.00 USD");

  await pressShortcut(page, "Mod+Shift+z");

  await expect(page.getByLabel("Tax, item 2")).toHaveValue("7");
  await expect(page.getByTestId("total-value")).toHaveText("$173.50 USD");
});

test("on an exempt invoice a line can take a rate, and the note moves to the Exempt row", async ({
  page
}) => {
  await gotoTwoLineInvoice(page);
  await page.getByRole("button", { name: "Toggle tax per line" }).click();
  await page.getByRole("button", { name: "Toggle tax exempt" }).click();

  await expect(page.getByLabel("Tax, item 1")).toHaveAttribute(
    "placeholder",
    "Exempt"
  );
  await expect(
    page.getByRole("button", { name: "Toggle exempt, item 1" })
  ).toHaveCount(0);

  await setNumber(page.getByLabel("Tax, item 1"), "20");

  await expect(
    page.locator("[data-paper]").getByText("Exempt by default")
  ).toBeVisible();
  await expect(page.getByText("Tax 20% on $100.00")).toBeVisible();
  await expect(page.getByText("Exempt on $50.00")).toBeVisible();
  await expect(page.getByTestId("total-value")).toHaveText("$170.00 USD");

  await page.getByLabel("Tax exempt note").fill("Reverse charge");
  await modeButton(page, "Preview").click();

  await expect(
    page.locator("[data-paper]").getByText("Reverse charge")
  ).toBeVisible();
  await expect(
    page.locator("[data-paper]").getByText("Exempt by default")
  ).toHaveCount(0);
});

test("a rate typed from a leading dot is a fraction", async ({ page }) => {
  await gotoTwoLineInvoice(page);
  await page.getByRole("button", { name: "Toggle tax per line" }).click();

  await setNumber(page.getByLabel("Tax, item 2"), ".5");

  await expect(page.getByLabel("Tax, item 2")).toHaveValue("0.5");
  await expect(page.getByTestId("total-value")).toHaveText("$170.25 USD");
});

test("the tax row's % toggle is always shown and explains itself", async ({
  page
}) => {
  await gotoTwoLineInvoice(page);

  const toggle = page.getByRole("button", { name: "Toggle tax exempt" });

  await page.mouse.move(0, 0);

  await expect(toggle).toHaveCSS("opacity", "1");

  await toggle.hover();

  await expect(page.getByText("Tax is charged at this rate.")).toBeVisible();

  await toggle.click();

  await expect(toggle).toHaveText("Exempt");
  await expect(toggle).toHaveAttribute("aria-pressed", "true");

  await toggle.click();

  await expect(toggle).toHaveText("%");
});
