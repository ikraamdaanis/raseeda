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

// Currencies paid to an IBAN, in Europe's single payments area and beside it.
const IBAN_CURRENCIES = [
  "EUR",
  "CHF",
  "SEK",
  "DKK",
  "NOK",
  "PLN",
  "CZK",
  "HUF",
  "RON",
  "BGN",
  "ISK"
];

// The bank rows a client paying in this currency usually needs: a routing
// number in the US, a sort code in the UK, an IBAN and BIC across Europe,
// else an account number and a SWIFT code for a payment from abroad.
export function getUsualBankFields(
  currencyCode: string
): (typeof PAYMENT_BANK_FIELDS)[number][] {
  if (currencyCode === "USD") {
    return ["bankName", "accountName", "accountNumber", "routingNumber"];
  }

  if (currencyCode === "GBP") {
    return ["bankName", "accountName", "accountNumber", "sortCode"];
  }

  if (IBAN_CURRENCIES.includes(currencyCode)) {
    return ["bankName", "accountName", "iban", "bic"];
  }

  return ["bankName", "accountName", "accountNumber", "bic"];
}

// Whether anything is typed into the payment details: a bank field, another
// way to pay, the payment link, a UPI ID or payment terms. Labels don't count.
export function hasPaymentDetails(paymentDetails: InvoicePaymentDetails) {
  return (
    PAYMENT_BANK_FIELDS.some(field => paymentDetails[field].trim()) ||
    paymentDetails.methods.some(
      method => method.name.trim() || method.detail.trim()
    ) ||
    [
      paymentDetails.paymentLink,
      paymentDetails.upiId,
      paymentDetails.terms
    ].some(value => value.trim())
  );
}

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
// javascript:) prints as text without a link, and so does anything without a
// real domain or with a user before the host, so an email address
// ("jane@example.com") or "e.g." never links to a site.
export function getPaymentLinkHref(link: string) {
  const trimmed = link.trim();

  if (!trimmed || /\s/.test(trimmed)) return undefined;

  const hasScheme = /^[a-z][a-z\d+.-]*:/i.test(trimmed);
  const isHostAndPort = /^[^/:]+:\d+([/?#]|$)/.test(trimmed);
  const address = hasScheme && !isHostAndPort ? trimmed : `https://${trimmed}`;

  try {
    const url = new URL(address);

    if (url.protocol !== "https:" && url.protocol !== "http:") return undefined;
    if (url.username || url.password) return undefined;
    if (!/\.([a-z]{2,63}|xn--[a-z\d-]+)$/i.test(url.hostname)) return undefined;

    return url.href;
  } catch {
    return undefined;
  }
}
