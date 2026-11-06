import { expect, test } from "./fixtures";
import { gotoEditorReady, savedContains } from "./helpers";

// The payment details: bank fields under labels that can be renamed, and other
// ways to pay, each a name and the detail to pay to.

test("renames a bank label and adds, orders and removes ways to pay", async ({
  page
}) => {
  await gotoEditorReady(page);

  await page.getByLabel("Routing number label").fill("BSB");
  await page.getByRole("textbox", { name: "BSB", exact: true }).fill("032-000");
  await expect
    .poll(() => savedContains(page, '"routingNumber":"BSB"'))
    .toBe(true);

  await page.getByRole("button", { name: "Add a way to pay" }).click();
  await expect(page.getByLabel("Way to pay 1 name")).toBeFocused();
  await page.keyboard.type("Venmo");
  await page.getByLabel("Venmo detail").fill("@jane-designs");

  await page.getByRole("button", { name: "Add a way to pay" }).click();
  await page.keyboard.type("Pix");
  await page.getByLabel("Pix detail").fill("jane@example.com");

  await page.getByRole("button", { name: "Move Pix up" }).click();
  await expect(page.getByLabel("Way to pay 1 name")).toHaveValue("Pix");
  await expect
    .poll(() =>
      savedContains(page, '"name":"Pix","detail":"jane@example.com"},{"id":')
    )
    .toBe(true);

  await page.getByRole("button", { name: "Remove Venmo" }).click();
  await expect(page.getByLabel("Venmo detail")).toHaveCount(0);
  await expect.poll(() => savedContains(page, "@jane-designs")).toBe(false);
});

test("Preview shows only the ways to pay that have a detail", async ({
  page
}) => {
  await gotoEditorReady(page);

  await page.getByRole("button", { name: "Add a way to pay" }).click();
  await page.keyboard.type("Zelle");
  await page.getByRole("button", { name: "Add a way to pay" }).click();
  await page.keyboard.type("Venmo");
  await page.getByLabel("Venmo detail").fill("@jane-designs");

  await page
    .getByRole("group", { name: "Mode" })
    .getByRole("button", { name: "Preview" })
    .click();

  await expect(page.getByLabel("Venmo detail")).toHaveValue("@jane-designs");
  await expect(page.getByLabel("Zelle detail")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Add a way to pay" })
  ).toHaveCount(0);
});
