import { describe, expect, it } from "vitest";
import {
  formatCurrency,
  getCurrencyMarker,
  normalizeCurrency
} from "~/consts/currencies";

describe("getCurrencyMarker", () => {
  it("returns the symbol unchanged for latin-glyph currencies", () => {
    expect(getCurrencyMarker("£")).toBe("£");
    expect(getCurrencyMarker("$")).toBe("$");
    expect(getCurrencyMarker("€")).toBe("€");
    expect(getCurrencyMarker("¥")).toBe("¥");
    expect(getCurrencyMarker("CHF")).toBe("CHF");
  });

  it("swaps the tofu-prone Riyal and Dirham symbols for ASCII codes", () => {
    expect(getCurrencyMarker("⃁")).toBe("SAR");
    expect(getCurrencyMarker("د.إ")).toBe("AED");
  });

  it("resolves legacy currency codes before choosing the marker", () => {
    expect(getCurrencyMarker("SAR")).toBe("SAR");
    expect(getCurrencyMarker("AED")).toBe("AED");
    expect(getCurrencyMarker("GBP")).toBe("£");
  });

  it("passes through a custom symbol untouched", () => {
    expect(getCurrencyMarker("₹")).toBe("₹");
  });
});

describe("formatCurrency", () => {
  it("prefixes the amount with the resolved marker", () => {
    expect(formatCurrency(1234.5, "£")).toBe("£1,234.50");
    expect(formatCurrency(9, "CHF")).toBe("CHF9.00");
  });

  it("renders Riyal and Dirham amounts with legible ASCII markers", () => {
    expect(formatCurrency(1234.5, "⃁")).toBe("SAR1,234.50");
    expect(formatCurrency(10, "د.إ")).toBe("AED10.00");
  });

  it("puts the minus sign of a negative amount before the marker", () => {
    expect(formatCurrency(-100, "£")).toBe("-£100.00");
    expect(formatCurrency(-1234.5, "CHF")).toBe("-CHF1,234.50");
    expect(formatCurrency(-0, "£")).toBe("£0.00");
  });
});

describe("normalizeCurrency", () => {
  it("keeps the stored symbol so the picker selection still matches", () => {
    expect(normalizeCurrency("⃁")).toBe("⃁");
    expect(normalizeCurrency("د.إ")).toBe("د.إ");
    expect(normalizeCurrency("SAR")).toBe("⃁");
  });
});
