import { calculateInvoiceTotals } from "~/utils/calculate-invoice-totals";
import { getPaymentLinkHref } from "~/utils/payment-details";
import { getSepaQrCode } from "~/utils/sepa-qr-code";

// A UPI ID (virtual payment address): a handle, "@" and the bank's handle.
const UPI_ID_PATTERN = /^[a-z\d._-]{2,256}@[a-z][a-z\d.-]{1,63}$/;

function readUpiId(value: string) {
  const upiId = value.trim().toLowerCase();

  return UPI_ID_PATTERN.test(upiId) ? upiId : null;
}

function toUpiText(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

/**
 * A UPI payment URI (`upi://pay`), which UPI apps in India scan to fill in a
 * payment: the UPI ID (`pa`), the payee's name (`pn`), the amount in rupees
 * (`am`, "1500.00", `cu=INR`) and the invoice number as the note (`tn`, left
 * out when empty). The name and note are percent-encoded as UTF-8. Null when
 * the UPI ID isn't one, there's no name, or nothing to pay.
 */
export function buildUpiUri({
  upiId,
  name,
  amount,
  reference
}: {
  upiId: string;
  name: string;
  amount: number;
  reference: string;
}): string | null {
  const payeeId = readUpiId(upiId);
  const payeeName = toUpiText(name);
  const note = toUpiText(reference);

  if (!payeeId || !payeeName) return null;
  if (!(amount >= 0.01)) return null;

  const params = [
    `pa=${payeeId}`,
    `pn=${encodeURIComponent(payeeName)}`,
    `am=${amount.toFixed(2)}`,
    "cu=INR"
  ];

  if (note) params.push(`tn=${encodeURIComponent(note)}`);

  return `upi://pay?${params.join("&")}`;
}

function getUpiQrCode(
  invoice: Parameters<typeof getSepaQrCode>[0]
):
  | { payload: string }
  | { missing: "upiCurrency" | "upiId" | "upiName" | "nothingDue" } {
  const { paymentDetails } = invoice;

  if (invoice.currencyCode !== "INR") return { missing: "upiCurrency" };
  if (!readUpiId(paymentDetails.upiId)) return { missing: "upiId" };
  if (!toUpiText(paymentDetails.accountName)) return { missing: "upiName" };

  const { balanceDue } = calculateInvoiceTotals(invoice);
  const payload = buildUpiUri({
    upiId: paymentDetails.upiId,
    name: paymentDetails.accountName,
    amount: balanceDue,
    reference: invoice.number
  });

  if (!payload) return { missing: "nothingDue" };

  return { payload };
}

/**
 * The payment QR code an invoice prints, encoding what
 * `paymentDetails.qrCodeContent` picks: a SEPA transfer (`getSepaQrCode`), a
 * UPI payment of the balance due to the UPI ID, with the account name as the
 * payee, or the payment link as the web address it opens. Else what it's
 * missing.
 */
export function getPaymentQrCode(invoice: Parameters<typeof getSepaQrCode>[0]):
  | { payload: string }
  | {
      missing:
        | "currency"
        | "iban"
        | "name"
        | "nothingDue"
        | "amount"
        | "upiCurrency"
        | "upiId"
        | "upiName"
        | "paymentLink";
    } {
  const { paymentDetails } = invoice;

  switch (paymentDetails.qrCodeContent) {
    case "upi":
      return getUpiQrCode(invoice);
    case "paymentLink": {
      const href = getPaymentLinkHref(paymentDetails.paymentLink);

      return href ? { payload: href } : { missing: "paymentLink" };
    }
    default:
      return getSepaQrCode(invoice);
  }
}
