import { describe, expect, it } from "vitest";
import type { InvoiceNumberFormat } from "~/types";
import {
  formatNumber,
  formatPlainNumber,
  roundToDecimals
} from "~/utils/format-number";

describe("formatNumber", () => {
  it("groups and separates as each format does", () => {
    const format = (numberFormat: InvoiceNumberFormat) =>
      formatNumber(1234567.891, { numberFormat, decimals: 2 });

    expect(format("comma-dot")).toBe("1,234,567.89");
    expect(format("dot-comma")).toBe("1.234.567,89");
    expect(format("space-comma")).toBe("1 234 567,89");
    expect(format("apostrophe-dot")).toBe("1’234’567.89");
    expect(format("indian")).toBe("12,34,567.89");
  });

  it("groups Indian amounts in pairs above the last three digits", () => {
    const indian = (value: number) =>
      formatNumber(value, { numberFormat: "indian", decimals: 0 });

    expect(indian(999)).toBe("999");
    expect(indian(1000)).toBe("1,000");
    expect(indian(100000)).toBe("1,00,000");
    expect(indian(123456789)).toBe("12,34,56,789");
  });

  it("writes the figure without its sign", () => {
    expect(formatNumber(-5.5, { numberFormat: "comma-dot", decimals: 2 })).toBe(
      "5.50"
    );
  });

  it("writes whole units for a zero-decimal currency", () => {
    expect(
      formatNumber(1234.5, { numberFormat: "dot-comma", decimals: 0 })
    ).toBe("1.235");
  });
});

describe("formatPlainNumber", () => {
  it("writes a quantity or rate with the format's decimal separator only", () => {
    expect(formatPlainNumber(1.5, "dot-comma")).toBe("1,5");
    expect(formatPlainNumber(1234.5, "space-comma")).toBe("1234,5");
    expect(formatPlainNumber(17.5, "comma-dot")).toBe("17.5");
    expect(formatPlainNumber("12.50", "dot-comma")).toBe("12,50");
  });
});

describe("roundToDecimals", () => {
  it("rounds halves away from zero, past floating-point error", () => {
    expect(roundToDecimals(1.005, 2)).toBe(1.01);
    expect(roundToDecimals(-1.005, 2)).toBe(-1.01);
    expect(roundToDecimals(2.5, 0)).toBe(3);
    expect(roundToDecimals(-2.5, 0)).toBe(-3);
    expect(roundToDecimals(0.1 + 0.2, 2)).toBe(0.3);
  });
});
