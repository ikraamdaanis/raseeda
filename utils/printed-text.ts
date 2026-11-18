import { PRINTED_WORDS } from "~/consts/label-presets";
import type { Invoice } from "~/types";
import { buildInvoiceViewModel } from "~/utils/build-invoice-view-model";
import { buildExchangeRateLine } from "~/utils/currency-conversion";
import { getPrintedLanguage } from "~/utils/label-preset";
import { getPaymentRows } from "~/utils/payment-details";
import { getPrintedSections } from "~/utils/section-visibility";
import { getTaxColumnLabel } from "~/utils/table-columns";

// Every piece of text the PDF prints, in one string, from the same pieces the
// PDF's parts read (components/pdf/), so a check of what the invoice's font
// can draw covers what prints and nothing that doesn't.
export function getPrintedText(invoice: Invoice): string {
  const printed = getPrintedSections(invoice);
  const { detailRows, lineItems, summaryRows, conversion } =
    buildInvoiceViewModel(invoice);
  const language = getPrintedLanguage(invoice);
  const columnLabels = invoice.tableSettings.columnLabels;
  const pieces = [
    invoice.title,
    invoice.seller.label,
    invoice.seller.content,
    invoice.client.label,
    invoice.client.content,
    ...(printed.shipping
      ? [invoice.shipping.label, invoice.shipping.content]
      : []),
    ...detailRows.flatMap(row => [row.label, row.value]),
    columnLabels.description,
    columnLabels.quantity,
    columnLabels.unit,
    columnLabels.unitPrice,
    columnLabels.amount,
    getTaxColumnLabel(columnLabels, invoice.labels),
    ...lineItems.flatMap(row => [
      row.description,
      row.quantity,
      row.unit,
      row.unitPrice,
      row.tax,
      row.amount,
      row.convertedAmount ?? ""
    ]),
    ...summaryRows
      .filter(row => row.isVisible)
      .flatMap(row => [row.label, row.value, row.note ?? ""]),
    conversion && invoice.currencyConversion.showRate
      ? buildExchangeRateLine({
          conversion,
          currencyConversion: invoice.currencyConversion,
          dateFormat: invoice.dateFormat,
          numberFormat: invoice.numberFormat,
          language
        })
      : "",
    ...(printed.paymentDetails
      ? [
          invoice.paymentDetails.label,
          ...getPaymentRows(
            invoice.paymentDetails,
            invoice.currencyCode
          ).flatMap(row => [row.label, row.value]),
          invoice.paymentDetails.terms
        ]
      : []),
    ...(printed.notes ? [invoice.notes.label, invoice.notes.content] : []),
    ...(printed.terms ? [invoice.terms.label, invoice.terms.content] : []),
    ...(printed.latePayment
      ? [invoice.latePayment.label, invoice.latePayment.content]
      : []),
    printed.signature ? invoice.signature.caption : "",
    ...Object.values(PRINTED_WORDS).map(word => word[language])
  ];

  return pieces.join("\n");
}
