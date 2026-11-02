import { addDays, differenceInCalendarDays, format } from "date-fns";
import { readInvoiceDate } from "~/utils/read-invoice-date";

// Payment terms aren't stored: they're read off the gap between the invoice
// date and the due date, and choosing one writes the due date. Any other gap
// shows as Custom, so a hand-typed due date is never overwritten silently.
export const PAYMENT_TERMS: { days: number; label: string }[] = [
  { days: 0, label: "Due on receipt" },
  { days: 7, label: "Net 7" },
  { days: 14, label: "Net 14" },
  { days: 30, label: "Net 30" },
  { days: 60, label: "Net 60" }
];

const ISO_DATE_FORMAT = "yyyy-MM-dd";

// The preset matching the two dates, or null when they match none of them (or
// either isn't a date).
export function getPaymentTermsDays(
  invoiceDate: string,
  dueDate: string
): number | null {
  const start = readInvoiceDate(invoiceDate);
  const end = readInvoiceDate(dueDate);

  if (!start || !end) return null;

  const days = differenceInCalendarDays(end, start);

  return PAYMENT_TERMS.some(term => term.days === days) ? days : null;
}

// The due date to go with a new invoice date: a preset gap (Net 30 and so on)
// moves with it; a custom due date stays put (null means leave it).
export function dueDateForNewInvoiceDate({
  invoiceDate,
  dueDate,
  nextInvoiceDate
}: {
  invoiceDate: string;
  dueDate: string;
  nextInvoiceDate: string;
}): string | null {
  const termsDays = getPaymentTermsDays(invoiceDate, dueDate);

  return termsDays === null
    ? null
    : addDaysToIsoDate(nextInvoiceDate, termsDays);
}

// The yyyy-MM-dd date `days` after `isoDate`, or null if it isn't a date.
export function addDaysToIsoDate(isoDate: string, days: number): string | null {
  const date = readInvoiceDate(isoDate);

  return date ? format(addDays(date, days), ISO_DATE_FORMAT) : null;
}
