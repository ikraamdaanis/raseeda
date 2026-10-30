import { isEqual } from "lodash-es";
import { STORED_INVOICE_THEME_FALLBACK } from "~/schema/invoice";
import { invoiceDefault } from "~/stores/invoice-store";
import type { Invoice } from "~/types";

// The invoice with what's filled in for you (its dates and the line items'
// ids) left out, so two blanks made on different days compare equal.
function withoutAutoFilledValues(invoice: Invoice) {
  return {
    ...invoice,
    invoiceDate: "",
    dueDate: "",
    items: invoice.items.map(item => ({ ...item, id: "" }))
  };
}

// The blank a new invoice started as before Schibsted Grotesk was the default:
// the same, drawn in Geist.
const GEIST_BLANK: Invoice = {
  ...invoiceDefault,
  theme: STORED_INVOICE_THEME_FALLBACK
};

// Whether an invoice is still the blank a new one starts as, now or before
// the default font changed, so blanks saved then are still cleared up. Today's
// date is filled in for you, so it doesn't count as an edit.
export function isBlankInvoice(invoice: Invoice): boolean {
  const content = withoutAutoFilledValues(invoice);

  return [invoiceDefault, GEIST_BLANK].some(blank =>
    isEqual(content, withoutAutoFilledValues(blank))
  );
}

function textLength(...values: string[]) {
  return values.reduce((total, value) => total + value.trim().length, 0);
}

// Roughly how much someone has written into an invoice: the characters in its
// content (not its labels), plus a little for each line item and amount. Used
// to notice a single change that throws most of it away.
export function measureInvoiceContent(invoice: Invoice): number {
  const { paymentDetails } = invoice;
  const items = invoice.items.reduce(
    (total, item) =>
      total +
      textLength(item.description, item.unit) +
      (item.quantity !== 0 ? 1 : 0) +
      (item.unitPrice !== 0 ? 4 : 0) +
      4,
    0
  );

  return (
    items +
    textLength(
      invoice.number,
      invoice.poNumber,
      invoice.servicePeriod,
      invoice.seller.content,
      invoice.client.content,
      invoice.shipping.content,
      invoice.notes.content,
      invoice.terms.content,
      invoice.latePayment.content,
      invoice.tax.note,
      paymentDetails.bankName,
      paymentDetails.accountNumber,
      paymentDetails.routingNumber,
      paymentDetails.iban,
      paymentDetails.bic,
      paymentDetails.sortCode,
      paymentDetails.terms
    )
  );
}

// Below this much content a removal isn't worth keeping a version for.
const LARGE_REMOVAL_MIN_CONTENT = 40;

// Whether a change took away most of what was written, such as clearing a long
// address or removing a full line item. Before such a change the invoice is
// kept as a version, since undo only lasts while the tab is open.
export function isLargeRemoval(previous: Invoice, next: Invoice): boolean {
  const before = measureInvoiceContent(previous);

  if (before < LARGE_REMOVAL_MIN_CONTENT) return false;

  return measureInvoiceContent(next) <= before / 2;
}
