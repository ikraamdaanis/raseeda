import type { Page } from "@playwright/test";
import { expect, test } from "./fixtures";
import { gotoEditorReady, gotoEditorSettled, pressShortcut } from "./helpers";

// A language preset sets every printed label at once (issue #126); undo
// brings the old ones back in one step.

// Every value typed on the page, labels included, since the page shows them
// in fields even in Preview.
async function pageValues(page: Page) {
  return await page
    .locator("[data-paper]")
    .locator("input, textarea")
    .evaluateAll(fields =>
      fields.map(field =>
        field instanceof HTMLInputElement ||
        field instanceof HTMLTextAreaElement
          ? field.value
          : ""
      )
    );
}

function languagePicker(page: Page) {
  return page
    .getByRole("complementary", { name: "Inspector" })
    .getByLabel("Language");
}

test("picking German prints every label in German, and undo brings them back", async ({
  page
}) => {
  await gotoEditorReady(page, "Spring retainer");
  await expect(languagePicker(page)).toHaveValue("");

  await languagePicker(page).selectOption("de");

  await expect(page.getByLabel("Invoice title")).toHaveValue("Rechnung");
  await expect(languagePicker(page)).toHaveValue("de");

  await page
    .getByRole("group", { name: "Mode" })
    .getByRole("button", { name: "Preview" })
    .click();

  await expect
    .poll(() => pageValues(page))
    .toEqual(
      expect.arrayContaining([
        "Rechnung",
        "Von",
        "An",
        "Rechnungsnummer",
        "Rechnungsdatum",
        "Fälligkeitsdatum",
        "Beschreibung",
        "Menge",
        "Einzelpreis",
        "Betrag",
        "Zwischensumme",
        "MwSt.",
        "Gesamtbetrag"
      ])
    );
  expect(await pageValues(page)).not.toContain("Invoice No.");

  await page
    .getByRole("group", { name: "Mode" })
    .getByRole("button", { name: "Edit" })
    .click();
  await page.locator("body").click({ position: { x: 1, y: 1 } });
  await pressShortcut(page, "Mod+z");

  await expect(page.getByLabel("Invoice title")).toHaveValue("Spring retainer");
  await expect
    .poll(() => pageValues(page))
    .toEqual(expect.arrayContaining(["Invoice No.", "Subtotal", "Total"]));
  expect(await pageValues(page)).not.toContain("Rechnungsnummer");
});

test("a label renamed after picking a language stays as typed", async ({
  page
}) => {
  await gotoEditorSettled(page);
  await languagePicker(page).selectOption("fr");
  await expect(page.getByLabel("Invoice title")).toHaveValue("Facture");

  await page.getByLabel("Invoice title").fill("Note d'honoraires");

  await expect(page.getByLabel("Invoice title")).toHaveValue(
    "Note d'honoraires"
  );
  await expect(languagePicker(page)).toHaveValue("");
});

test.describe("in a German browser", () => {
  test.use({ locale: "de-DE" });

  test("a new invoice starts in German", async ({ page }) => {
    await page.goto("/create");

    await expect(page.getByLabel("Invoice title")).toHaveValue("Rechnung");
    await expect(languagePicker(page)).toHaveValue("de");
  });
});
