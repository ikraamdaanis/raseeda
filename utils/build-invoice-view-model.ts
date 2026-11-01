import { formatCurrency, formatCurrencyWithCode } from "~/consts/currencies";
import type {
  Invoice,
  InvoiceDetailRow,
  InvoiceItem,
  InvoiceLabels,
  InvoiceLineItemRow,
  InvoiceSections,
  InvoiceSummaryRow,
  InvoiceViewModel
} from "~/types";
import {
  calculateInvoiceTotals,
  calculateLineAmount
} from "~/utils/calculate-invoice-totals";
import { formatInvoiceDate } from "~/utils/format-invoice-date";

// Maps an invoice to an ordered, fully-formatted view-model so the HTML canvas
// and the PDF render from one source instead of duplicating ordering,
// conditional logic, and currency formatting across two trees. The smaller
// builders are exported so the canvas (which only has a slice of the store, not
// the whole Invoice) can derive the same rows without subscribing to everything.

// Optional rows (PO number, service period) whose section is switched off are
// left out altogether; switched-on ones are marked optional so the PDF skips
// them while empty.
export function buildDetailRows(input: {
  labels: InvoiceLabels;
  number: string;
  poNumber: string;
  invoiceDate: string;
  dueDate: string;
  servicePeriod: string;
  sections: Pick<InvoiceSections, "poNumber" | "servicePeriod">;
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
      value: input.servicePeriod,
      isOptional: true
    }
  ];

  return rows.filter(
    row =>
      (row.id !== "poNumber" || input.sections.poNumber) &&
      (row.id !== "servicePeriod" || input.sections.servicePeriod)
  );
}

export function buildLineItemRow(
  item: InvoiceItem,
  currency: string
): InvoiceLineItemRow {
  return {
    id: item.id,
    description: item.description,
    quantity: item.quantity,
    unit: item.unit,
    unitPrice: formatCurrency(item.unitPrice, currency),
    amount: formatCurrency(
      calculateLineAmount(item.quantity, item.unitPrice),
      currency
    )
  };
}

function buildSummaryRows(input: {
  labels: InvoiceLabels;
  subtotal: number;
  tax: { percentage: number; amount: number; exempt: boolean; note: string };
  fees: number;
  discountAmount: number;
  discountType: Invoice["discountType"];
  discountValue: number;
  total: number;
  amountPaid: number;
  balanceDue: number;
  currency: string;
  currencyCode: string;
  sections: Pick<InvoiceSections, "discounts" | "tax" | "fees" | "amountPaid">;
}): InvoiceSummaryRow[] {
  const { labels, currency, sections } = input;
  const hasPayment = sections.amountPaid && input.amountPaid > 0;

  return [
    {
      id: "subtotal",
      label: labels.subtotal,
      value: formatCurrency(input.subtotal, currency),
      isVisible: true,
      isTotal: false
    },
    // The discount comes before tax because tax is charged on the discounted
    // amount, so the rows read in the order the sums are done.
    {
      id: "discounts",
      label: labels.discounts,
      value: `-${formatCurrency(input.discountAmount, currency)}`,
      percentage:
        input.discountType === "percentage" ? input.discountValue : undefined,
      isVisible: sections.discounts && input.discountValue > 0,
      isTotal: false
    },
    {
      id: "tax",
      label: labels.tax,
      value: input.tax.exempt
        ? input.tax.note.trim() || "Exempt"
        : formatCurrency(input.tax.amount, currency),
      percentage: input.tax.exempt ? undefined : input.tax.percentage,
      note: input.tax.exempt ? input.tax.note.trim() : undefined,
      isVisible: sections.tax,
      isTotal: false
    },
    {
      id: "fees",
      label: labels.fees,
      value: formatCurrency(input.fees, currency),
      isVisible: sections.fees && input.fees > 0,
      isTotal: false
    },
    {
      id: "total",
      label: labels.total,
      value: formatCurrencyWithCode(input.total, currency, input.currencyCode),
      // Without a recorded payment the grand total is the final figure; with a
      // payment the balance-due row below becomes the emphasised total instead.
      isVisible: true,
      isTotal: !hasPayment
    },
    {
      id: "amountPaid",
      label: labels.amountPaid,
      value: `-${formatCurrency(input.amountPaid, currency)}`,
      isVisible: hasPayment,
      isTotal: false
    },
    {
      id: "balanceDue",
      label: labels.balanceDue,
      value: formatCurrencyWithCode(
        input.balanceDue,
        currency,
        input.currencyCode
      ),
      isVisible: hasPayment,
      isTotal: hasPayment
    }
  ];
}

export function buildInvoiceViewModel(invoice: Invoice): InvoiceViewModel {
  const totals = calculateInvoiceTotals(invoice);

  return {
    detailRows: buildDetailRows(invoice),
    lineItems: invoice.items.map(item =>
      buildLineItemRow(item, invoice.currency)
    ),
    summaryRows: buildSummaryRows({
      labels: invoice.labels,
      subtotal: totals.subtotal,
      tax: {
        percentage: invoice.tax.percentage,
        amount: totals.taxAmount,
        exempt: invoice.tax.exempt,
        note: invoice.tax.note
      },
      fees: invoice.fees,
      discountAmount: totals.discountAmount,
      discountType: invoice.discountType,
      discountValue: invoice.discounts,
      total: totals.total,
      amountPaid: invoice.amountPaid,
      balanceDue: totals.balanceDue,
      currency: invoice.currency,
      currencyCode: invoice.currencyCode,
      sections: invoice.sections
    })
  };
}
