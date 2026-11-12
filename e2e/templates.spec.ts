import { expect, test } from "./fixtures";
import {
  clickFileMenuItem,
  countSavedInvoices,
  gotoEditorReady,
  invoiceNameField,
  invoicesPanel,
  libraryRow,
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

  await expect(libraryRow(page, "My template")).toBeVisible();
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
  await libraryRow(page, "Reusable").click();

  // The template's content starts a new invoice with an automatic name; "Base
  // doc" stays as it was, and the new one joins the library once it's edited.
  await expect(page.getByLabel("From details")).toHaveValue("Template seller");
  await expect(invoiceNameField(page)).toHaveValue("INV-0001");
  expect(await countSavedInvoices(page)).toBe(1);

  await page.getByLabel("Invoice title").fill("From the template");

  await expect.poll(() => countSavedInvoices(page)).toBe(2);
  expect(await savedContains(page, "Base title")).toBe(true);
});

test("templates can be renamed and deleted from the panel", async ({
  page,
  seedTemplate
}) => {
  await gotoEditorReady(page, "For templating");
  await nameInvoice(page, "Templating doc");
  await seedTemplate({ name: "First template" });

  await clickFileMenuItem(page, "Open Template");

  const panel = invoicesPanel(page);
  const rename = page.getByRole("dialog", { name: "Rename Template" });

  await panel
    .getByRole("button", { name: "Actions for First template" })
    .click();
  await page.getByRole("menuitem", { name: "Rename…" }).click();
  await rename.getByRole("textbox").fill("Renamed template");
  await rename.getByRole("textbox").press("Enter");
  await expect(rename).toBeHidden();
  await expect(libraryRow(page, "Renamed template")).toBeVisible();

  await libraryRow(page, "Renamed template").click({ button: "right" });
  await page.getByRole("menuitem", { name: "Delete…" }).click();

  const confirm = page.getByRole("dialog", { name: "Delete this template?" });

  await confirm.getByRole("button", { name: "Delete template" }).click();
  await expect(confirm).toBeHidden();

  await expect(panel.getByText("No templates yet.")).toBeVisible();
});
