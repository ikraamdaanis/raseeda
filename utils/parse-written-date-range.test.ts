import { format } from "date-fns";
import { describe, expect, it } from "vitest";
import { parseWrittenDateRange } from "~/utils/parse-written-date-range";

function readRange(value: string): string | null {
  const range = parseWrittenDateRange(value);

  if (!range) return null;

  return `${format(range.from, "yyyy-MM-dd")}/${format(range.to, "yyyy-MM-dd")}`;
}

describe("written date ranges", () => {
  it("reads a range within a month, however it's dashed", () => {
    expect(readRange("1-30 September 2026")).toBe("2026-09-01/2026-09-30");
    expect(readRange("1–30 September 2026")).toBe("2026-09-01/2026-09-30");
    expect(readRange("1 - 30 Sep 2026")).toBe("2026-09-01/2026-09-30");
    expect(readRange("September 1–30, 2026")).toBe("2026-09-01/2026-09-30");
    expect(readRange("Oct 1–31, 2026")).toBe("2026-10-01/2026-10-31");
  });

  it("reads a range across months and years", () => {
    expect(readRange("28 Sep – 3 Oct 2026")).toBe("2026-09-28/2026-10-03");
    expect(readRange("September 28 – October 3, 2026")).toBe(
      "2026-09-28/2026-10-03"
    );
    expect(readRange("1 December 2026 – 5 January 2027")).toBe(
      "2026-12-01/2027-01-05"
    );
    expect(readRange("1 Dec – 5 Jan 2027")).toBe("2026-12-01/2027-01-05");
    expect(readRange("1 Dec 2026 to 5 Jan 2027")).toBe("2026-12-01/2027-01-05");
  });

  it("reads a single written date as a one-day range", () => {
    expect(readRange("30 September 2026")).toBe("2026-09-30/2026-09-30");
  });

  it("leaves anything else unread", () => {
    expect(readRange("Q3 2026")).toBeNull();
    expect(readRange("Jan 2026")).toBeNull();
    expect(readRange("30-1 September 2026")).toBeNull();
    expect(readRange("31 September 2026")).toBeNull();
    expect(readRange("")).toBeNull();
  });
});
