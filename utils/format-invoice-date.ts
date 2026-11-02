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
  if (dateFormat === "d MMM yyyy" || dateFormat === "MMMM d, yyyy") {
    return formatWordedRange({ from, to, dateFormat });
  }

  return `${format(from, dateFormat)} – ${format(to, dateFormat)}`;
}

// The service period always names its months in full ("1–30 September 2026"),
// whatever the date format. The format only decides the order: month first
// for the two US formats, day first for the rest.
export function formatServicePeriod(
  value: string,
  dateFormat: Invoice["dateFormat"]
): string {
  const range = parseIsoDateRange(value);

  if (!range) return value;

  const { from, to } = range;
  const isMonthFirst =
    dateFormat === "MMMM d, yyyy" || dateFormat === "MM/dd/yyyy";
  const wordedFormat = isMonthFirst ? "MMMM d, yyyy" : "d MMMM yyyy";

  if (isSameDay(from, to)) return format(from, wordedFormat);

  return formatWordedRange({ from, to, dateFormat: wordedFormat });
}

// A worded range shares what both ends have in common, the way a range is
// written by hand ("1–31 Oct 2026"); one across years prints both ends.
function formatWordedRange({
  from,
  to,
  dateFormat
}: {
  from: Date;
  to: Date;
  dateFormat: "d MMM yyyy" | "d MMMM yyyy" | "MMMM d, yyyy";
}): string {
  if (!isSameYear(from, to)) {
    return `${format(from, dateFormat)} – ${format(to, dateFormat)}`;
  }

  if (dateFormat === "MMMM d, yyyy") {
    return isSameMonth(from, to)
      ? `${format(from, "MMMM d")}–${format(to, "d, yyyy")}`
      : `${format(from, "MMMM d")} – ${format(to, dateFormat)}`;
  }

  const dayAndMonth = dateFormat === "d MMM yyyy" ? "d MMM" : "d MMMM";

  return isSameMonth(from, to)
    ? `${format(from, "d")}–${format(to, dateFormat)}`
    : `${format(from, dayAndMonth)} – ${format(to, dateFormat)}`;
}
