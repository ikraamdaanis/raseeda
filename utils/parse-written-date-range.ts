import { isValid, parse, subYears } from "date-fns";

const FULL_DATE_FORMATS = [
  "d MMMM yyyy",
  "d MMM yyyy",
  "MMMM d, yyyy",
  "MMM d, yyyy",
  "MMMM d yyyy",
  "MMM d yyyy"
];
const DAY_AND_MONTH_FORMATS = ["d MMMM", "d MMM", "MMMM d", "MMM d"];

function parseWithFormats(
  text: string,
  formats: string[],
  referenceDate: Date
): Date | null {
  for (const dateFormat of formats) {
    const date = parse(text, dateFormat, referenceDate);

    if (isValid(date)) return date;
  }

  return null;
}

// Reads a range written by hand, from before the service period was picked
// from a calendar: "1-30 September 2026", "28 Sep – 3 Oct 2026",
// "September 1–30, 2026", "1 Dec 2026 to 5 Jan 2027", or a single date. The
// start borrows whatever it leaves out (month, year) from the end. Anything
// else is null.
export function parseWrittenDateRange(
  value: string
): { from: Date; to: Date } | null {
  const parts = value.trim().split(/\s*(?:[-–—]|\bto\b)\s*/);

  if (parts.length > 2 || !parts[0]) return null;

  const [fromText, endText = fromText] = parts;
  // "September 1–30, 2026": the end is only a day and year, so it takes the
  // start's month.
  const toText = /^\d{1,2},? \d{4}$/.test(endText)
    ? `${fromText.replace(/\s*\d{1,2}$/, "")} ${endText}`
    : endText;
  const to = parseWithFormats(toText, FULL_DATE_FORMATS, new Date());

  if (!to) return null;

  const fullFrom = parseWithFormats(fromText, FULL_DATE_FORMATS, to);
  const dayAndMonthFrom = fullFrom
    ? null
    : parseWithFormats(fromText, DAY_AND_MONTH_FORMATS, to);
  // "1 Dec – 5 Jan 2027" starts in the year before the one it names.
  const from =
    fullFrom ??
    (dayAndMonthFrom && dayAndMonthFrom > to
      ? subYears(dayAndMonthFrom, 1)
      : dayAndMonthFrom) ??
    parseWithFormats(fromText, ["d"], to);

  if (!from) return null;

  return from <= to ? { from, to } : null;
}
