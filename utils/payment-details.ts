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
// way to pay that has a detail, in the order they were put in, then the
// payment link, which carries the address the PDF links it to.
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
  const rows: { id: string; label: string; value: string; href?: string }[] = [
    ...bankRows,
    ...methodRows
  ];
  const link = paymentDetails.paymentLink.trim();

  if (link) {
    rows.push({
      id: "paymentLink",
      label:
        paymentDetails.labels.paymentLink.trim() ||
        DEFAULT_PAYMENT_LABELS.paymentLink,
      value: link,
      href: getPaymentLinkHref(link)
    });
  }

  return rows;
}

// The web address a typed payment link opens, or undefined when it isn't one.
// "paypal.me/acme" is read as https; any scheme but http and https (such as
// javascript:) prints as text without a link.
export function getPaymentLinkHref(link: string) {
  const trimmed = link.trim();

  if (!trimmed || /\s/.test(trimmed)) return undefined;

  const hasScheme = /^[a-z][a-z\d+.-]*:/i.test(trimmed);
  const isHostAndPort = /^[^/:]+:\d+(\/|$)/.test(trimmed);
  const address = hasScheme && !isHostAndPort ? trimmed : `https://${trimmed}`;

  try {
    const url = new URL(address);

    if (url.protocol !== "https:" && url.protocol !== "http:") return undefined;
    if (!url.hostname.includes(".")) return undefined;

    return url.href;
  } catch {
    return undefined;
  }
}
