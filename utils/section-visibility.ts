import type { Invoice, InvoiceSectionKey } from "~/types";
import { getCurrencyConversion } from "~/utils/currency-conversion";

export function hasText(value: string): boolean {
  return value.trim().length > 0;
}

const PAYMENT_DETAIL_FIELDS = [
  "bankName",
  "accountName",
  "accountNumber",
  "routingNumber",
  "iban",
  "bic",
  "sortCode",
  "terms"
] as const;

// Whether each optional part of the invoice is printed: switched on, and with
// something in it. The PDF and the editor's Preview both read this, so Preview
// shows exactly what the PDF will. (While editing, a switched-on section shows
// even when empty, so there's somewhere to type.)
export function getPrintedSections(
  invoice: Pick<
    Invoice,
    | "sections"
    | "image"
    | "poNumber"
    | "servicePeriod"
    | "supplyDate"
    | "shipping"
    | "discounts"
    | "tax"
    | "fees"
    | "amountPaid"
    | "currency"
    | "currencyCode"
    | "currencyConversion"
    | "paymentDetails"
    | "notes"
    | "terms"
    | "latePayment"
  >
): Record<InvoiceSectionKey, boolean> {
  const { sections } = invoice;
  const conversion = getCurrencyConversion(invoice);

  return {
    logo: sections.logo && invoice.image !== "",
    poNumber: sections.poNumber && hasText(invoice.poNumber),
    servicePeriod: sections.servicePeriod && hasText(invoice.servicePeriod),
    supplyDate: sections.supplyDate && hasText(invoice.supplyDate),
    shipping: sections.shipping && hasText(invoice.shipping.content),
    discounts: sections.discounts && invoice.discounts > 0,
    tax: sections.tax,
    fees: sections.fees && invoice.fees > 0,
    amountPaid: sections.amountPaid && invoice.amountPaid > 0,
    // Not in that currency already, and with a rate to convert at.
    currencyConversion: conversion !== null && conversion.rate > 0,
    paymentDetails:
      sections.paymentDetails &&
      PAYMENT_DETAIL_FIELDS.some(field =>
        hasText(invoice.paymentDetails[field])
      ),
    notes: sections.notes && hasText(invoice.notes.content),
    terms: sections.terms && hasText(invoice.terms.content),
    latePayment: sections.latePayment && hasText(invoice.latePayment.content)
  };
}
