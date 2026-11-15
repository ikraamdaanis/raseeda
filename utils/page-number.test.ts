import { describe, expect, it } from "vitest";
import { getPageNumberLabel } from "~/utils/page-number";

describe("getPageNumberLabel", () => {
  it("numbers each page of a longer PDF against the total", () => {
    expect(getPageNumberLabel({ pageNumber: 1, totalPages: 2 })).toBe("1 / 2");
    expect(getPageNumberLabel({ pageNumber: 3, totalPages: 3 })).toBe("3 / 3");
  });

  it("prints no number on a one-page PDF", () => {
    expect(getPageNumberLabel({ pageNumber: 1, totalPages: 1 })).toBe("");
  });
});
