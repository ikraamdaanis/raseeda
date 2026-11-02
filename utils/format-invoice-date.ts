import { format, isSameDay, isSameMonth, isSameYear } from "date-fns";
import type { Invoice } from "~/types";
import { parseIsoDateRange } from "~/utils/parse-iso-date";

// Writes a stored yyyy-MM-dd date, or a yyyy-MM-dd/yyyy-MM-dd range, the way
// the invoice asks. Anything that isn't a valid date (a half-typed or legacy
// value) is shown as it is.
export function formatInvoiceDate(
  value: string,
  dateFormat: Invoice["dateFormat"]
): string {
  const range = parseIsoDateRange(value);

  if (!range) return value;

  const { from, to } = range;

  if (isSameDay(from, to)) return format(from, dateFormat);

  // The worded formats share what both ends have in common, the way a range
  // is written by hand ("1–31 Oct 2026"); the numeric ones print both ends.
  if (dateFormat === "d MMM yyyy" && isSameYear(from, to)) {
    return isSameMonth(from, to)
      ? `${format(from, "d")}–${format(to, dateFormat)}`
      : `${format(from, "d MMM")} – ${format(to, dateFormat)}`;
  }

  if (dateFormat === "MMMM d, yyyy" && isSameYear(from, to)) {
    return isSameMonth(from, to)
      ? `${format(from, "MMMM d")}–${format(to, "d, yyyy")}`
      : `${format(from, "MMMM d")} – ${format(to, dateFormat)}`;
  }

  return `${format(from, dateFormat)} – ${format(to, dateFormat)}`;
}
