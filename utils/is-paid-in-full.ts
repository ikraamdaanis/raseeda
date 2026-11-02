import type { Invoice } from "~/types";
import { calculateInvoiceTotals } from "~/utils/calculate-invoice-totals";

// Whether the invoice records a payment that leaves nothing to pay, for the
// PAID stamp. Only what's typed on the invoice counts; raseeda doesn't track
// payments.
export function isPaidInFull(
  invoice: Pick<
    Invoice,
    "items" | "tax" | "fees" | "discounts" | "discountType" | "amountPaid"
  > & { sections: Invoice["sections"] }
): boolean {
  const { total, balanceDue } = calculateInvoiceTotals(invoice);

  return (
    invoice.sections.amountPaid &&
    invoice.amountPaid > 0 &&
    total > 0 &&
    balanceDue <= 0
  );
}
