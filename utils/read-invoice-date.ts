import { isSameDay } from "date-fns";
import { parseIsoDateRange } from "~/utils/parse-iso-date";
import { parseWrittenDateRange } from "~/utils/parse-written-date-range";

// Reads a date field's value: a date or range picked from a calendar
// (yyyy-MM-dd, yyyy-MM-dd/yyyy-MM-dd), or one typed by hand before the field
// had a calendar ("31 October 2026", "1-30 Sep 2026"). Anything else is null,
// so it is shown as typed.
export function readInvoiceDateRange(
  value: string
): { from: Date; to: Date } | null {
  return parseIsoDateRange(value) ?? parseWrittenDateRange(value);
}

// The same for a field that holds one date; a range there is null.
export function readInvoiceDate(value: string): Date | null {
  const range = readInvoiceDateRange(value);

  return range && isSameDay(range.from, range.to) ? range.from : null;
}
