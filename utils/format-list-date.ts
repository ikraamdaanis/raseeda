import { format } from "date-fns";

// The whole timestamp, as the version history spells it out. Guards against an
// Invalid Date, which date-fns format() throws a RangeError on, so a corrupt
// record shows a placeholder instead of crashing the list.
export function formatFullDate(value: Date | string | number): string {
  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? "–" : format(date, "d MMM yyyy, HH:mm");
}
