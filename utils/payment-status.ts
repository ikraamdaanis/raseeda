import { differenceInCalendarDays } from "date-fns";
import type { Invoice, InvoicePaymentStatus } from "~/types";
import { calculateInvoiceTotals } from "~/utils/calculate-invoice-totals";
import { readInvoiceDate } from "~/utils/read-invoice-date";

// Where an invoice stands with its payment, worked out from its amount paid
// (while that row is switched on) and its due date:
// - paid: something was paid and nothing is left to pay
// - overdue: something is left to pay and the due date has passed
// - partPaid: some of it is paid and it isn't due yet
// - unpaid: nothing paid and not due yet, or nothing to pay at all
export function getPaymentStatus(
  invoice: Pick<
    Invoice,
    | "items"
    | "tax"
    | "fees"
    | "discounts"
    | "discountType"
    | "amountPaid"
    | "dueDate"
    | "sections"
  >,
  today: Date
): InvoicePaymentStatus {
  const { total, balanceDue } = calculateInvoiceTotals(invoice);
  const paid = invoice.sections.amountPaid ? invoice.amountPaid : 0;
  const dueDate = readInvoiceDate(invoice.dueDate);
  const isPastDue = !!dueDate && differenceInCalendarDays(today, dueDate) > 0;

  if (total > 0 && paid > 0 && balanceDue <= 0) return "paid";
  if (balanceDue > 0 && isPastDue) return "overdue";
  if (paid > 0 && balanceDue > 0) return "partPaid";

  return "unpaid";
}

export const PAYMENT_STATUS_LABELS: Record<InvoicePaymentStatus, string> = {
  paid: "Paid",
  partPaid: "Part paid",
  overdue: "Overdue",
  unpaid: "Unpaid"
};
