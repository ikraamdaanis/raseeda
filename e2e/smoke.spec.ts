import { expect, test } from "./fixtures";
import {
  addLineItem,
  clickFileMenuItem,
  gotoEditorReady,
  invoiceNameField,
  nameInvoice
} from "./helpers";

// P0 smoke path: the single happy path that exercises the create -> edit ->
// add line item -> name -> leave -> return -> download chain end to end. This
// alone would have caught the #78 detach bug, where returning to the editor
// dropped the saved document's identity.
test("create, edit, name, leave, return, and download an invoice", async ({
  page
}) => {
  const context = page.context();

  await gotoEditorReady(page, "Acme Consulting");

  await addLineItem(page);

  const description = page.getByLabel("Item, item 1");

  await description.fill("Consulting work");
  await page.getByLabel("Quantity, item 1").fill("3");
  await page.getByLabel("Unit Price, item 1").fill("100");

  await expect(page.getByLabel("Amount, item 1")).toContainText("300");

  await nameInvoice(page, "Acme Invoice");

  await expect(invoiceNameField(page)).toHaveValue("Acme Invoice");

  // Every edit saves itself, so leaving goes straight home without asking.
  await clickFileMenuItem(page, "Back to homepage");

  await expect(page).toHaveURL("/");
  await page
    .getByRole("banner")
    .getByRole("link", { name: "Open the editor", exact: true })
    .click();

  await expect(page).toHaveURL("/create");
  await expect(invoiceNameField(page)).toHaveValue("Acme Invoice");
  await expect(page.getByLabel("Invoice title")).toHaveValue("Acme Consulting");
  await expect(description).toHaveValue("Consulting work");

  // Download opens a summary popover; its Open in a new tab button opens the
  // PDF in a new viewer tab. Asserting that the tab opens is
  // the stable P0 signal (the issue's "assert ... the new viewer tab" option):
  // @react-pdf's blob generation does not complete under the headless dev server,
  // so the deeper /Title-filename and blob-content checks live in the later
  // P2 "PDF download" group, which can target the production build.
  const pdfPagePromise = context.waitForEvent("page");

  await page.getByRole("button", { name: "Download", exact: true }).click();
  await page.getByRole("button", { name: "Open in a new tab" }).click();

  const pdfPage = await pdfPagePromise;

  expect(pdfPage).toBeTruthy();
  expect(pdfPage.isClosed()).toBe(false);
});
