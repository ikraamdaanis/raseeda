import { expect, test } from "./fixtures";
import {
  clickFileMenuItem,
  countSavedInvoices,
  gotoEditorReady,
  invoiceNameField,
  nameInvoice,
  savedContains
} from "./helpers";

// Group I: templates.

test("saves the current invoice as a template", async ({
  page,
  seedTemplate
}) => {
  await gotoEditorReady(page, "Templatable");
  await nameInvoice(page, "Templatable doc");
  await seedTemplate({ name: "My template" });

  await clickFileMenuItem(page, "Open Template");

  const dialog = page.getByRole("dialog", { name: "Open Template" });

  await expect(dialog.getByRole("row", { name: /My template/ })).toBeVisible();
});

test("opening a template starts a new invoice from it [R]", async ({
  page,
  seedTemplate
}) => {
  await gotoEditorReady(page, "Base title");
  await page.getByLabel("From details").fill("Template seller");
  await nameInvoice(page, "Base doc");
  await seedTemplate({ name: "Reusable" });

  await clickFileMenuItem(page, "Open Template");

  const dialog = page.getByRole("dialog", { name: "Open Template" });

  await dialog.getByRole("row", { name: /Reusable/ }).dblclick();
  await expect(dialog).toBeHidden();

  // The template's content starts a new invoice with an automatic name; "Base
  // doc" stays as it was, and the new one joins the library once it's edited.
  await expect(page.getByLabel("From details")).toHaveValue("Template seller");
  await expect(invoiceNameField(page)).toHaveValue("INV-0001");
  expect(await countSavedInvoices(page)).toBe(1);

  await page.getByLabel("Invoice title").fill("From the template");

  await expect.poll(() => countSavedInvoices(page)).toBe(2);
  expect(await savedContains(page, "Base title")).toBe(true);
});

test("templates can be renamed and deleted from the dialog", async ({
  page,
  seedTemplate
}) => {
  await gotoEditorReady(page, "For templating");
  await nameInvoice(page, "Templating doc");
  await seedTemplate({ name: "First template" });

  await clickFileMenuItem(page, "Open Template");

  const dialog = page.getByRole("dialog", { name: "Open Template" });
  const row = dialog.getByRole("row", { name: /First template/ });

  await row.press("F2");
  await dialog.getByLabel("Template name").fill("Renamed template");
  await dialog.getByLabel("Template name").press("Enter");
  await expect(
    dialog.getByRole("row", { name: /Renamed template/ })
  ).toBeVisible();

  const renamedRow = dialog.getByRole("row", { name: /Renamed template/ });

  await renamedRow.click();
  await renamedRow.press("Delete");
  await dialog.getByRole("button", { name: "Delete", exact: true }).click();

  await expect(dialog.getByText("No saved templates yet")).toBeVisible();
});
