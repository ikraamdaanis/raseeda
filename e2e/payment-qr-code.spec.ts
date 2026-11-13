import { expect, test } from "./fixtures";
import { gotoEditorReady, savedContains, setNumber } from "./helpers";

// The SEPA payment QR code (issue #137): switched on under the payment
// details, drawn on the device beside the bank rows, and left out with a note
// until the invoice has all a SEPA transfer needs.

test("prints a SEPA code once the invoice is in euros with an IBAN and payee", async ({
  page,
  baseURL
}) => {
  // Nothing is fetched to draw the code: no request leaves the app's origin.
  const appOrigin = new URL(baseURL ?? "http://localhost:3000").origin;
  const outsideRequests: string[] = [];

  page.on("request", request => {
    const url = new URL(request.url());

    if (url.protocol.startsWith("http") && url.origin !== appOrigin) {
      outsideRequests.push(request.url());
    }
  });

  await gotoEditorReady(page);
  await setNumber(page.getByLabel("Quantity, item 1"), "1");
  await setNumber(page.getByLabel("Unit Price, item 1"), "100");

  const qrSwitch = page.getByRole("switch", { name: "Print a SEPA QR code" });

  await qrSwitch.click();
  await expect(qrSwitch).toBeChecked();
  await expect
    .poll(() => savedContains(page, '"paymentQrCode":true'))
    .toBe(true);
  await expect(page.getByText("Prints on invoices in euros")).toBeVisible();

  await page.getByRole("button", { name: "Change currency" }).click();
  await page
    .getByRole("combobox", { name: "Currency", exact: true })
    .selectOption("€");
  await page.keyboard.press("Escape");
  await expect(page.getByText("Add a valid IBAN")).toBeVisible();

  await page
    .getByRole("textbox", { name: "IBAN", exact: true })
    .fill("DE89 3704 0044 0532 0130 00");
  await expect(page.getByText("Add the account name")).toBeVisible();
  await expect(page.getByTestId("payment-qr-code")).toHaveCount(0);

  await page
    .getByRole("textbox", { name: "Account name", exact: true })
    .fill("Acme Studio");
  await expect(page.getByText("The QR code is left out")).toHaveCount(0);

  const code = page.getByRole("img", { name: "Payment QR code" });

  await expect(code).toBeVisible();
  await expect(page.getByTestId("payment-qr-code")).toContainText(
    "Scan to pay"
  );

  await page
    .getByRole("group", { name: "Mode" })
    .getByRole("button", { name: "Preview" })
    .click();
  await expect(code).toBeVisible();
  await expect(qrSwitch).toHaveCount(0);
  expect(outsideRequests).toEqual([]);
});

test("Preview leaves out a code that can't print", async ({ page }) => {
  await gotoEditorReady(page);
  await page
    .getByRole("textbox", { name: "Account name", exact: true })
    .fill("Acme Studio");
  await page.getByRole("switch", { name: "Print a SEPA QR code" }).click();

  await page
    .getByRole("group", { name: "Mode" })
    .getByRole("button", { name: "Preview" })
    .click();

  await expect(page.getByTestId("payment-qr-code")).toHaveCount(0);
  await expect(page.getByText("The QR code is left out")).toHaveCount(0);
});
