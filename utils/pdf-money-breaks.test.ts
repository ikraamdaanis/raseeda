import { describe, expect, it } from "vitest";
import { breakBeforeCurrency } from "~/utils/pdf-money-breaks";

describe("breakBeforeCurrency", () => {
  it("lets a figure and its currency part at a plain space, never mid-figure", () => {
    expect(breakBeforeCurrency("98 765,43 zł")).toEqual([
      "98 765,43",
      " ",
      "zł"
    ]);
    expect(breakBeforeCurrency("-CHF 12.50")).toEqual(["-CHF", " ", "12.50"]);
    expect(breakBeforeCurrency("-12,5 €")).toEqual(["-12,5", " ", "€"]);
  });

  it("parts a figure from a currency react-pdf has already cut off", () => {
    // A currency in letters ("zł", "CHF") is a run of its own, so the figure
    // reaches the callback with only the space.
    expect(breakBeforeCurrency("98\u00a0765,43\u00a0")).toEqual([
      "98\u00a0765,43",
      " "
    ]);
    expect(breakBeforeCurrency("CHF\u00a0")).toEqual(["CHF", " "]);
  });

  it("keeps a figure with no space beside its currency whole", () => {
    expect(breakBeforeCurrency("£1,250.00")).toEqual(["£1,250.00"]);
    expect(breakBeforeCurrency("1 234 567,89")).toEqual(["1 234 567,89"]);
    expect(breakBeforeCurrency("7,5%")).toEqual(["7,5%"]);
  });
});
