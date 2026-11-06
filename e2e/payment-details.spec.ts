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
  await page.getByLabel("Way to pay 1 name").selectOption("Venmo");
  await page.getByLabel("Venmo detail").fill("@jane-designs");

  await page.getByRole("button", { name: "Add a way to pay" }).click();
  await page.getByLabel("Way to pay 2 name").selectOption("Pix");
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
  await page.getByLabel("Way to pay 1 name").selectOption("Zelle");
  await page.getByRole("button", { name: "Add a way to pay" }).click();
  await page.getByLabel("Way to pay 2 name").selectOption("Venmo");
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

test("moves a way to pay down twice from the keyboard", async ({ page }) => {
  await gotoEditorReady(page);

  for (const [index, name] of ["Venmo", "Pix", "Wise"].entries()) {
    await page.getByRole("button", { name: "Add a way to pay" }).click();
    await page.getByLabel(`Way to pay ${index + 1} name`).selectOption(name);
  }

  const moveDown = page.getByRole("button", { name: "Move Venmo down" });

  await moveDown.focus();
  await page.keyboard.press("Enter");
  await expect(moveDown).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.getByLabel("Way to pay 3 name")).toHaveValue("Venmo");
});

test("names a way to pay that isn't in the list", async ({ page }) => {
  await gotoEditorReady(page);

  await page.getByRole("button", { name: "Add a way to pay" }).click();
  await page.getByLabel("Way to pay 1 name").selectOption("Other…");

  const name = page.getByRole("textbox", { name: "Way to pay 1 name" });

  await expect(name).toBeFocused();
  await page.keyboard.type("Lydia");
  await page.getByLabel("Lydia detail").fill("+33 6 12 34 56 78");
  await expect(
    page.getByRole("combobox", { name: "Way to pay 1 name" })
  ).toHaveValue("Lydia");
  await expect
    .poll(() =>
      savedContains(page, '"name":"Lydia","detail":"+33 6 12 34 56 78"')
    )
    .toBe(true);
});
