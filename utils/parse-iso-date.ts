import { isValid, parse } from "date-fns";

// Reads a stored yyyy-MM-dd date as local midnight. Anything else (a cleared
// field, free text from before dates were picked from a calendar, a full
// timestamp) is null rather than a guess, so it is shown as typed and never
// shifted a day by a time zone.
export function parseIsoDate(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;

  const date = parse(value, "yyyy-MM-dd", new Date());

  return isValid(date) ? date : null;
}

// Reads a stored date range, written as an ISO 8601 interval
// (yyyy-MM-dd/yyyy-MM-dd), or a single date as a one-day range. Anything else
// is null, so it is shown as typed.
export function parseIsoDateRange(
  value: string
): { from: Date; to: Date } | null {
  const [fromValue, toValue = fromValue, ...rest] = value.split("/");

  if (rest.length > 0) return null;

  const from = parseIsoDate(fromValue);
  const to = parseIsoDate(toValue);

  if (!from || !to || to < from) return null;

  return { from, to };
}
