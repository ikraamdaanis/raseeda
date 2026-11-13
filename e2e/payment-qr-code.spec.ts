import { expect, test } from "./fixtures";
import { gotoEditorReady, savedContains, setNumber } from "./helpers";

// The payment QR code (issues #137, #138): switched on under the payment
// details, drawn on the device beside the bank rows, encoding a SEPA transfer,
// a UPI payment or the payment link, and left out with a note until the
// invoice has all it needs.

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

  const qrSwitch = page.getByRole("switch", {
    name: "Print a payment QR code"
  });

  await qrSwitch.click();
  await expect(qrSwitch).toBeChecked();
  await expect
    .poll(() => savedContains(page, '"paymentQrCode":true'))
    .toBe(true);
  await expect(
    page.getByText("A SEPA code prints on invoices in euros")
  ).toBeVisible();

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
  await page.getByRole("switch", { name: "Print a payment QR code" }).click();

  await page
    .getByRole("group", { name: "Mode" })
    .getByRole("button", { name: "Preview" })
    .click();

  await expect(page.getByTestId("payment-qr-code")).toHaveCount(0);
  await expect(page.getByText("The QR code is left out")).toHaveCount(0);
});

test("prints a UPI code from a UPI ID on an invoice in rupees", async ({
  page
}) => {
  await gotoEditorReady(page);
  await setNumber(page.getByLabel("Quantity, item 1"), "1");
  await setNumber(page.getByLabel("Unit Price, item 1"), "1500");
  await page.getByRole("switch", { name: "Print a payment QR code" }).click();

  const upiId = page.getByRole("textbox", { name: "UPI ID", exact: true });

  await expect(upiId).toHaveCount(0);
  await page
    .getByRole("combobox", { name: "Encodes", exact: true })
    .selectOption("upi");
  await expect(
    page.getByText("A UPI code prints on invoices in rupees")
  ).toBeVisible();

  await page.getByRole("button", { name: "Change currency" }).click();
  await page
    .getByRole("combobox", { name: "Currency", exact: true })
    .selectOption("__custom");

  const dialog = page.getByRole("dialog", { name: "Custom currency" });

  await dialog.getByLabel("Currency symbol").fill("₹");
  await dialog.getByLabel("Currency ISO code").fill("INR");
  await dialog.getByRole("button", { name: "Save" }).click();
  await expect(dialog).toHaveCount(0);
  await page.keyboard.press("Escape");
  await expect(page.getByText("Add a valid UPI ID")).toBeVisible();

  await upiId.fill("acme@okaxis");
  await expect(page.getByText("Add the account name")).toBeVisible();
  await page
    .getByRole("textbox", { name: "Account name", exact: true })
    .fill("Acme Studio");
  await expect(page.getByText("The QR code is left out")).toHaveCount(0);
  await expect(
    page.getByRole("img", { name: "Payment QR code" })
  ).toBeVisible();
  await expect
    .poll(() =>
      savedContains(page, '"qrCodeContent":"upi","upiId":"acme@okaxis"')
    )
    .toBe(true);

  await page
    .getByRole("group", { name: "Mode" })
    .getByRole("button", { name: "Preview" })
    .click();
  await expect(upiId).toHaveCount(0);
  await expect(
    page.getByRole("img", { name: "Payment QR code" })
  ).toBeVisible();
});

test("prints a code of the payment link once it's a web address", async ({
  page
}) => {
  await gotoEditorReady(page);
  await page.getByRole("switch", { name: "Print a payment QR code" }).click();
  await page
    .getByRole("combobox", { name: "Encodes", exact: true })
    .selectOption("paymentLink");
  await expect(page.getByText("Add a payment link")).toBeVisible();

  const link = page.getByRole("textbox", { name: "Pay online", exact: true });

  await link.fill("jane@example.com");
  await expect(page.getByText("Add a payment link")).toBeVisible();
  await link.fill("https://buy.stripe.com/acme");
  await expect(page.getByText("The QR code is left out")).toHaveCount(0);
  await expect(
    page.getByRole("img", { name: "Payment QR code" })
  ).toBeVisible();
});
