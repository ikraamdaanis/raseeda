import { format } from "date-fns";
import { describe, expect, it } from "vitest";
import {
  readInvoiceDate,
  readInvoiceDateRange
} from "~/utils/read-invoice-date";

describe("reading a date field", () => {
  it("reads a picked date, and one typed by hand, as the same day", () => {
    for (const value of ["2026-09-30", "30 September 2026", "Sep 30, 2026"]) {
      const date = readInvoiceDate(value);

      expect(date && format(date, "yyyy-MM-dd")).toBe("2026-09-30");
    }
  });

  it("reads a picked range, and one typed by hand, as the same range", () => {
    for (const value of ["2026-09-01/2026-09-30", "1-30 September 2026"]) {
      const range = readInvoiceDateRange(value);

      expect(range && format(range.from, "yyyy-MM-dd")).toBe("2026-09-01");
      expect(range && format(range.to, "yyyy-MM-dd")).toBe("2026-09-30");
    }
  });

  it("doesn't read a range as a single date", () => {
    expect(readInvoiceDate("2026-09-01/2026-09-30")).toBeNull();
    expect(readInvoiceDate("1-30 September 2026")).toBeNull();
  });

  it("leaves text and timestamps unread", () => {
    expect(readInvoiceDate("next Tuesday")).toBeNull();
    expect(readInvoiceDate("2026-10-07T00:00:00.000Z")).toBeNull();
    expect(readInvoiceDateRange("")).toBeNull();
  });
});
