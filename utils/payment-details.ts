import { DEFAULT_PAYMENT_LABELS } from "~/schema/invoice";
import type { InvoicePaymentDetails } from "~/types";

// The bank fields, in the order they print.
export const PAYMENT_BANK_FIELDS = [
  "bankName",
  "accountName",
  "accountNumber",
  "routingNumber",
  "iban",
  "bic",
  "sortCode"
] as const;

// The label and value rows the payment details print: each filled-in bank
// field under its label (the default one when it was cleared), then each other
// way to pay that has a detail, in the order they were put in.
export function getPaymentRows(paymentDetails: InvoicePaymentDetails) {
  const bankRows = PAYMENT_BANK_FIELDS.filter(field =>
    paymentDetails[field].trim()
  ).map(field => ({
    id: field,
    label: paymentDetails.labels[field].trim() || DEFAULT_PAYMENT_LABELS[field],
    value: paymentDetails[field]
  }));
  const methodRows = paymentDetails.methods
    .filter(method => method.detail.trim())
    .map(method => ({
      id: method.id,
      label: method.name.trim(),
      value: method.detail
    }));

  return [...bankRows, ...methodRows];
}
