import { describe, expect, it } from "vitest";
import { formatFullDate } from "~/utils/format-list-date";

describe("formatFullDate", () => {
  it("spells out the date and time", () => {
    expect(formatFullDate(new Date(2026, 4, 31, 2, 32))).toBe(
      "31 May 2026, 02:32"
    );
  });

  it("returns a placeholder for an Invalid Date", () => {
    expect(formatFullDate("not a date")).toBe("–");
  });
});
