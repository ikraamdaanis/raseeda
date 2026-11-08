import { formatCurrency, getMoneyFormat } from "~/consts/currencies";
import { DOCUMENT_TYPE_ROWS } from "~/consts/document-types";
import type {
  CurrencyConversion,
  DocumentType,
  Invoice,
  InvoiceDetailRow,
  InvoiceItem,
  InvoiceLabels,
  InvoiceLineItemRow,
  InvoiceSections,
  InvoiceSummaryRow,
  InvoiceTaxGroup,
  InvoiceViewModel,
  MoneyFormat
} from "~/types";
import {
  calculateInvoiceTotals,
  calculateLineAmount,
  getLineTax
} from "~/utils/calculate-invoice-totals";
import {
  calculateConvertedTotals,
  formatConvertedAmount,
  formatDeduction,
  formatInvoiceTotal,
  getCurrencyConversion,
  withConvertedAmount
} from "~/utils/currency-conversion";
import { getTypeSections } from "~/utils/document-type";
import {
  formatInvoiceDate,
  formatServicePeriod
} from "~/utils/format-invoice-date";
import { formatPlainNumber } from "~/utils/format-number";
import { getPrintedSections } from "~/utils/section-visibility";

// Maps an invoice to an ordered, fully-formatted view-model so the HTML canvas
// and the PDF render from one source instead of duplicating ordering,
// conditional logic, and currency formatting across two trees. The smaller
// builders are exported so the canvas (which only has a slice of the store, not
// the whole Invoice) can derive the same rows without subscribing to everything.

// Optional rows (PO number, date of supply, service period) whose section is
// switched off are left out altogether; switched-on ones are marked optional
// so the PDF skips them while empty. A credit note names the invoice it
// refers to under its number (optional too) and has no due date row.
export function buildDetailRows(input: {
  documentType: DocumentType;
  labels: InvoiceLabels;
  number: string;
  refersTo: string;
  poNumber: string;
  invoiceDate: string;
  supplyDate: string;
  dueDate: string;
  servicePeriod: string;
  sections: Pick<InvoiceSections, "poNumber" | "supplyDate" | "servicePeriod">;
  dateFormat: Invoice["dateFormat"];
}): InvoiceDetailRow[] {
  const typeRows = DOCUMENT_TYPE_ROWS[input.documentType];
  const rows: InvoiceDetailRow[] = [
    {
      id: "number",
      labelKey: "invoiceNumber",
      label: input.labels.invoiceNumber,
      value: input.number,
      isOptional: false
    },
    {
      id: "refersTo",
      labelKey: "refersTo",
      label: input.labels.refersTo,
      value: input.refersTo,
      isOptional: true
    },
    {
      id: "poNumber",
      labelKey: "poNumber",
      label: input.labels.poNumber,
      value: input.poNumber,
      isOptional: true
    },
    {
      id: "invoiceDate",
      labelKey: "invoiceDate",
      label: input.labels.invoiceDate,
      value: formatInvoiceDate(input.invoiceDate, input.dateFormat),
      isOptional: false
    },
    {
      id: "supplyDate",
      labelKey: "supplyDate",
      label: input.labels.supplyDate,
      value: formatInvoiceDate(input.supplyDate, input.dateFormat),
      isOptional: true
    },
    {
      id: "dueDate",
      labelKey: "paymentDue",
      label: input.labels.paymentDue,
      value: formatInvoiceDate(input.dueDate, input.dateFormat),
      isOptional: false
    },
    {
      id: "servicePeriod",
      labelKey: "servicePeriod",
      label: input.labels.servicePeriod,
      value: formatServicePeriod(input.servicePeriod, input.dateFormat),
      isOptional: true
    }
  ];

  return rows.filter(
    row =>
      (row.id !== "refersTo" || typeRows.refersTo) &&
      (row.id !== "dueDate" || typeRows.dueDate) &&
      (row.id !== "poNumber" || input.sections.poNumber) &&
      (row.id !== "supplyDate" || input.sections.supplyDate) &&
      (row.id !== "servicePeriod" || input.sections.servicePeriod)
  );
}

// With a conversion, the line's converted amount is its own amount times the
// rate, so each line reads on its own.
export function buildLineItemRow({
  item,
  money,
  conversion,
  tax
}: {
  item: InvoiceItem;
  money: MoneyFormat;
  conversion: CurrencyConversion | null;
  tax: Invoice["tax"];
}): InvoiceLineItemRow {
  const amount = calculateLineAmount(
    item.quantity,
    item.unitPrice,
    money.decimals
  );
  const lineTax = getLineTax(item, tax);

  return {
    id: item.id,
    description: item.description,
    quantity: formatPlainNumber(item.quantity, money.numberFormat),
    unit: item.unit,
    unitPrice: formatCurrency(item.unitPrice, money),
    amount: formatCurrency(amount, money),
    convertedAmount: conversion
      ? formatConvertedAmount(amount, conversion, money)
      : undefined,
    tax: lineTax.exempt
      ? "Exempt"
      : `${formatPlainNumber(lineTax.percentage, money.numberFormat)}%`
  };
}

// Whether the line items show a Tax column: whenever tax is on and charged per
// line, even when every line shares one rate, since Per line is a column
// switch and some invoices must state each line's rate.
export function showsTaxColumn({
  tax,
  sections
}: {
  tax: Pick<Invoice["tax"], "perLine">;
  sections: Pick<InvoiceSections, "tax">;
}): boolean {
  return sections.tax && tax.perLine;
}

// The tax rows: with one rate, the single row it's always been ("VAT 20%",
// or the exempt note). With several, a row per rate, highest first, then 0%,
// then exempt, each naming what it's charged on after the discount, in the
// invoice's own currency: "VAT 20% on £1,000.00". Exempt lines share the
// invoice's note.
export function buildTaxRows({
  label,
  tax,
  taxGroups,
  taxAmount,
  money,
  conversion,
  isVisible
}: {
  label: string;
  tax: Invoice["tax"];
  taxGroups: InvoiceTaxGroup[];
  taxAmount: number;
  money: MoneyFormat;
  conversion: CurrencyConversion | null;
  isVisible: boolean;
}): InvoiceSummaryRow[] {
  const note = tax.note.trim();
  const exemptValue = note || "Exempt";

  if (taxGroups.length <= 1) {
    const group = taxGroups.at(0);
    const exempt = group ? group.exempt : tax.exempt;

    return [
      {
        id: "tax",
        label,
        value: exempt
          ? exemptValue
          : withConvertedAmount({
              value: formatCurrency(taxAmount, money),
              amount: taxAmount,
              conversion,
              money
            }),
        percentage: exempt ? undefined : (group?.percentage ?? tax.percentage),
        note: exempt ? note : undefined,
        isVisible,
        isTotal: false
      }
    ];
  }

  return taxGroups.map(group => {
    const base = formatCurrency(group.taxableAmount, money);

    return {
      id: "tax",
      label: group.exempt
        ? `Exempt on ${base}`
        : `${label} ${formatPlainNumber(group.percentage, money.numberFormat)}% on ${base}`,
      value: group.exempt
        ? exemptValue
        : withConvertedAmount({
            value: formatCurrency(group.taxAmount, money),
            amount: group.taxAmount,
            conversion,
            money
          }),
      note: group.exempt ? note : undefined,
      isVisible,
      isTotal: false
    };
  });
}

function buildSummaryRows(input: {
  labels: InvoiceLabels;
  subtotal: number;
  taxRows: InvoiceSummaryRow[];
  fees: number;
  discountAmount: number;
  discountType: Invoice["discountType"];
  discountValue: number;
  total: number;
  amountPaid: number;
  paidDate: string;
  dateFormat: Invoice["dateFormat"];
  balanceDue: number;
  // The subtotal, total, amount paid and balance due in the second
  // currency, added up from its rows.
  converted: {
    subtotal: number;
    total: number;
    amountPaid: number;
    balanceDue: number;
  };
  money: MoneyFormat;
  currencyCode: string;
  sections: Pick<InvoiceSections, "discounts" | "tax" | "fees" | "amountPaid">;
  conversion: CurrencyConversion | null;
}): InvoiceSummaryRow[] {
  const { labels, money, sections, conversion } = input;
  const hasPayment = sections.amountPaid && input.amountPaid > 0;

  return [
    {
      id: "subtotal",
      label: labels.subtotal,
      value: withConvertedAmount({
        value: formatCurrency(input.subtotal, money),
        amount: input.subtotal,
        conversion,
        money,
        convertedAmount: input.converted.subtotal
      }),
      isVisible: true,
      isTotal: false
    },
    // The discount comes before tax because tax is charged on the discounted
    // amount, so the rows read in the order the sums are done.
    {
      id: "discounts",
      label: labels.discounts,
      value: formatDeduction({
        amount: input.discountAmount,
        money,
        conversion
      }),
      percentage:
        input.discountType === "percentage" ? input.discountValue : undefined,
      isVisible: sections.discounts && input.discountValue > 0,
      isTotal: false
    },
    ...input.taxRows,
    {
      id: "fees",
      label: labels.fees,
      value: withConvertedAmount({
        value: formatCurrency(input.fees, money),
        amount: input.fees,
        conversion,
        money
      }),
      isVisible: sections.fees && input.fees > 0,
      isTotal: false
    },
    {
      id: "total",
      label: labels.total,
      value: formatInvoiceTotal({
        amount: input.total,
        convertedAmount: input.converted.total,
        money,
        currencyCode: input.currencyCode,
        conversion
      }),
      // Without a recorded payment the grand total is the final figure; with a
      // payment the balance-due row below becomes the emphasised total instead.
      isVisible: true,
      isTotal: !hasPayment
    },
    {
      id: "amountPaid",
      label: input.paidDate
        ? `${labels.amountPaid} (${formatInvoiceDate(input.paidDate, input.dateFormat)})`
        : labels.amountPaid,
      value: formatDeduction({
        amount: input.amountPaid,
        money,
        conversion,
        convertedAmount: input.converted.amountPaid
      }),
      isVisible: hasPayment,
      isTotal: false
    },
    {
      id: "balanceDue",
      label: labels.balanceDue,
      value: formatInvoiceTotal({
        amount: input.balanceDue,
        convertedAmount: input.converted.balanceDue,
        money,
        currencyCode: input.currencyCode,
        conversion
      }),
      isVisible: hasPayment,
      isTotal: hasPayment
    }
  ];
}

export function buildInvoiceViewModel(invoice: Invoice): InvoiceViewModel {
  const totals = calculateInvoiceTotals(invoice);
  // As the document's type reads them, so a quote's amount paid stays off.
  const sections = getTypeSections(invoice.sections, invoice.documentType);
  const conversion = getPrintedSections(invoice).currencyConversion
    ? getCurrencyConversion(invoice)
    : null;
  const money = getMoneyFormat(invoice);

  return {
    detailRows: buildDetailRows(invoice),
    lineItems: invoice.items.map(item =>
      buildLineItemRow({
        item,
        money,
        conversion,
        tax: invoice.tax
      })
    ),
    summaryRows: buildSummaryRows({
      labels: invoice.labels,
      subtotal: totals.subtotal,
      taxRows: buildTaxRows({
        label: invoice.labels.tax,
        tax: invoice.tax,
        taxGroups: totals.taxGroups,
        taxAmount: totals.taxAmount,
        money,
        conversion,
        isVisible: invoice.sections.tax
      }),
      fees: totals.fees,
      discountAmount: totals.discountAmount,
      discountType: invoice.discountType,
      discountValue: invoice.discounts,
      total: totals.total,
      amountPaid: totals.amountPaid,
      paidDate: invoice.paidDate,
      dateFormat: invoice.dateFormat,
      balanceDue: totals.balanceDue,
      converted: calculateConvertedTotals({
        totals,
        conversion
      }),
      money,
      currencyCode: invoice.currencyCode,
      sections,
      conversion
    }),
    conversion,
    hasTaxColumn: showsTaxColumn({
      tax: invoice.tax,
      sections: invoice.sections
    })
  };
}
