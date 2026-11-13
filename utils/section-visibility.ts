import type { Invoice, InvoiceSectionKey } from "~/types";
import { calculateInvoiceTotals } from "~/utils/calculate-invoice-totals";
import { getCurrencyConversion } from "~/utils/currency-conversion";
import { getTypeSections } from "~/utils/document-type";
import { isPaidInFull } from "~/utils/is-paid-in-full";
import { getPaymentRows } from "~/utils/payment-details";

export function hasText(value: string): boolean {
  return value.trim().length > 0;
}

// Whether each optional part of the invoice is printed: switched on, and with
// something in it. The PDF and the editor's Preview both read this, so Preview
// shows exactly what the PDF will. (While editing, a switched-on section shows
// even when empty, so there's somewhere to type.) The switches a document's
// type settles are read as it says: a quote prints no payment or stamp.
export function getPrintedSections(
  invoice: Pick<
    Invoice,
    | "documentType"
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
    | "items"
    | "discountType"
    | "currency"
    | "currencyCode"
    | "currencyConversion"
    | "paymentDetails"
    | "notes"
    | "terms"
    | "latePayment"
    | "signature"
    | "theme"
  >
): Record<InvoiceSectionKey, boolean> {
  const sections = getTypeSections(invoice.sections, invoice.documentType);
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
    amountPaid:
      sections.amountPaid && calculateInvoiceTotals(invoice).amountPaid > 0,
    // The stamp only says PAID when nothing is left to pay.
    paidStamp: sections.paidStamp && isPaidInFull(invoice),
    // Not in that currency already, and with a rate to convert at.
    currencyConversion: conversion !== null && conversion.rate > 0,
    paymentDetails:
      sections.paymentDetails &&
      (getPaymentRows(invoice.paymentDetails).length > 0 ||
        hasText(invoice.paymentDetails.terms)),
    notes: sections.notes && hasText(invoice.notes.content),
    terms: sections.terms && hasText(invoice.terms.content),
    latePayment: sections.latePayment && hasText(invoice.latePayment.content),
    signature: sections.signature && invoice.signature.image !== ""
  };
}
