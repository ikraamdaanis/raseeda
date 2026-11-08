import type { Invoice } from "~/types";
import { calculateInvoiceTotals } from "~/utils/calculate-invoice-totals";

// Whether the invoice records a payment that leaves nothing to pay, for the
// PAID stamp. Only what's on the invoice counts (a receipt with no amount
// typed is paid in full); raseeda doesn't track payments.
export function isPaidInFull(
  invoice: Pick<
    Invoice,
    | "documentType"
    | "items"
    | "tax"
    | "fees"
    | "discounts"
    | "discountType"
    | "amountPaid"
    | "currency"
    | "currencyCode"
  > & { sections: Invoice["sections"] }
): boolean {
  const { total, amountPaid, balanceDue } = calculateInvoiceTotals(invoice);

  return amountPaid > 0 && total > 0 && balanceDue <= 0;
}
