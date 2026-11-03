import { formatCurrency } from "~/consts/currencies";
import type {
  CurrencyConversion,
  Invoice,
  InvoiceDetailRow,
  InvoiceItem,
  InvoiceLabels,
  InvoiceLineItemRow,
  InvoiceSections,
  InvoiceSummaryRow,
  InvoiceTaxGroup,
  InvoiceViewModel
} from "~/types";
import {
  calculateInvoiceTotals,
  calculateLineAmount,
  getLineTax
} from "~/utils/calculate-invoice-totals";
import {
  formatConvertedAmount,
  formatDeduction,
  formatInvoiceTotal,
  getCurrencyConversion,
  withConvertedAmount
} from "~/utils/currency-conversion";
import {
  formatInvoiceDate,
  formatServicePeriod
} from "~/utils/format-invoice-date";
import { getPrintedSections } from "~/utils/section-visibility";

// Maps an invoice to an ordered, fully-formatted view-model so the HTML canvas
// and the PDF render from one source instead of duplicating ordering,
// conditional logic, and currency formatting across two trees. The smaller
// builders are exported so the canvas (which only has a slice of the store, not
// the whole Invoice) can derive the same rows without subscribing to everything.

// Optional rows (PO number, date of supply, service period) whose section is
// switched off are left out altogether; switched-on ones are marked optional
// so the PDF skips them while empty.
export function buildDetailRows(input: {
  labels: InvoiceLabels;
  number: string;
  poNumber: string;
  invoiceDate: string;
  supplyDate: string;
  dueDate: string;
  servicePeriod: string;
  sections: Pick<InvoiceSections, "poNumber" | "supplyDate" | "servicePeriod">;
  dateFormat: Invoice["dateFormat"];
}): InvoiceDetailRow[] {
  const rows: InvoiceDetailRow[] = [
    {
      id: "number",
      labelKey: "invoiceNumber",
      label: input.labels.invoiceNumber,
      value: input.number,
      isOptional: false
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
      (row.id !== "poNumber" || input.sections.poNumber) &&
      (row.id !== "supplyDate" || input.sections.supplyDate) &&
      (row.id !== "servicePeriod" || input.sections.servicePeriod)
  );
}

// With a conversion, the line's converted amount is its own amount times the
// rate, so each line reads on its own.
export function buildLineItemRow({
  item,
  currency,
  conversion,
  tax
}: {
  item: InvoiceItem;
  currency: string;
  conversion: CurrencyConversion | null;
  tax: Invoice["tax"];
}): InvoiceLineItemRow {
  const amount = calculateLineAmount(item.quantity, item.unitPrice);
  const lineTax = getLineTax(item, tax);

  return {
    id: item.id,
    description: item.description,
    quantity: item.quantity,
    unit: item.unit,
    unitPrice: formatCurrency(item.unitPrice, currency),
    amount: formatCurrency(amount, currency),
    convertedAmount: conversion
      ? formatConvertedAmount(amount, conversion)
      : undefined,
    tax: lineTax.exempt ? "Exempt" : `${lineTax.percentage}%`
  };
}

// Whether the line items need a Tax column: only when the lines with an
// amount are taxed at more than one rate, so an invoice with one rate keeps
// it in the totals alone.
export function hasMixedTaxRates({
  taxGroups,
  sections
}: {
  taxGroups: InvoiceTaxGroup[];
  sections: Pick<InvoiceSections, "tax">;
}): boolean {
  return sections.tax && taxGroups.length > 1;
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
  currency,
  conversion,
  isVisible
}: {
  label: string;
  tax: Invoice["tax"];
  taxGroups: InvoiceTaxGroup[];
  taxAmount: number;
  currency: string;
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
          : withConvertedAmount(
              formatCurrency(taxAmount, currency),
              taxAmount,
              conversion
            ),
        percentage: exempt ? undefined : (group?.percentage ?? tax.percentage),
        note: exempt ? note : undefined,
        isVisible,
        isTotal: false
      }
    ];
  }

  return taxGroups.map(group => {
    const base = formatCurrency(group.taxableAmount, currency);

    return {
      id: "tax",
      label: group.exempt
        ? `Exempt on ${base}`
        : `${label} ${group.percentage}% on ${base}`,
      value: group.exempt
        ? exemptValue
        : withConvertedAmount(
            formatCurrency(group.taxAmount, currency),
            group.taxAmount,
            conversion
          ),
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
  currency: string;
  currencyCode: string;
  sections: Pick<InvoiceSections, "discounts" | "tax" | "fees" | "amountPaid">;
  conversion: CurrencyConversion | null;
}): InvoiceSummaryRow[] {
  const { labels, currency, sections, conversion } = input;
  const hasPayment = sections.amountPaid && input.amountPaid > 0;

  return [
    {
      id: "subtotal",
      label: labels.subtotal,
      value: withConvertedAmount(
        formatCurrency(input.subtotal, currency),
        input.subtotal,
        conversion
      ),
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
        currency,
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
      value: withConvertedAmount(
        formatCurrency(input.fees, currency),
        input.fees,
        conversion
      ),
      isVisible: sections.fees && input.fees > 0,
      isTotal: false
    },
    {
      id: "total",
      label: labels.total,
      value: formatInvoiceTotal({
        amount: input.total,
        currency,
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
        currency,
        conversion
      }),
      isVisible: hasPayment,
      isTotal: false
    },
    {
      id: "balanceDue",
      label: labels.balanceDue,
      value: formatInvoiceTotal({
        amount: input.balanceDue,
        currency,
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
  const conversion = getPrintedSections(invoice).currencyConversion
    ? getCurrencyConversion(invoice)
    : null;

  return {
    detailRows: buildDetailRows(invoice),
    lineItems: invoice.items.map(item =>
      buildLineItemRow({
        item,
        currency: invoice.currency,
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
        currency: invoice.currency,
        conversion,
        isVisible: invoice.sections.tax
      }),
      fees: invoice.fees,
      discountAmount: totals.discountAmount,
      discountType: invoice.discountType,
      discountValue: invoice.discounts,
      total: totals.total,
      amountPaid: invoice.amountPaid,
      paidDate: invoice.paidDate,
      dateFormat: invoice.dateFormat,
      balanceDue: totals.balanceDue,
      currency: invoice.currency,
      currencyCode: invoice.currencyCode,
      sections: invoice.sections,
      conversion
    }),
    conversion,
    hasTaxColumn: hasMixedTaxRates({
      taxGroups: totals.taxGroups,
      sections: invoice.sections
    })
  };
}
