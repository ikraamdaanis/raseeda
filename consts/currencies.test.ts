import { describe, expect, it } from "vitest";
import {
  formatCurrency,
  formatCurrencyWithCode,
  getCurrencyMarker,
  getMoneyFormat,
  normalizeCurrency
} from "~/consts/currencies";
import { INVOICE_FONTS } from "~/consts/invoice-fonts";
import type { InvoiceFont } from "~/types";

function marker(
  currency: string,
  currencyCode = "",
  font: InvoiceFont = "inter"
) {
  return getCurrencyMarker({ currency, currencyCode, font });
}

function money(
  currency: string,
  currencyCode = "",
  font: InvoiceFont = "inter"
) {
  return getMoneyFormat({ currency, currencyCode, theme: { font } });
}

describe("getCurrencyMarker", () => {
  it("returns the symbol when the font draws it", () => {
    for (const font of INVOICE_FONTS) {
      expect(marker("£", "GBP", font.id)).toBe("£");
      expect(marker("$", "USD", font.id)).toBe("$");
      expect(marker("€", "EUR", font.id)).toBe("€");
      expect(marker("¥", "JPY", font.id)).toBe("¥");
      expect(marker("CHF", "CHF", font.id)).toBe("CHF");
    }
  });

  it("prints the code for a symbol no invoice font has", () => {
    for (const font of INVOICE_FONTS) {
      expect(marker("⃁", "SAR", font.id)).toBe("SAR");
      expect(marker("د.إ", "AED", font.id)).toBe("AED");
    }
  });

  it("prints the code only in the fonts that lack the symbol", () => {
    expect(marker("₹", "INR", "inter")).toBe("₹");
    expect(marker("₹", "INR", "lora")).toBe("INR");
    expect(marker("₹", "INR", "libre-baskerville")).toBe("INR");
    expect(marker("₹", "INR", "jetbrains-mono")).toBe("INR");
    expect(marker("₪", "ILS", "inter")).toBe("₪");
    expect(marker("₪", "ILS", "lora")).toBe("ILS");
  });

  it("checks every character of a custom symbol", () => {
    expect(marker("zł", "PLN", "inter")).toBe("zł");
    expect(marker("zł", "PLN", "lora")).toBe("zł");
  });

  it("uses a preset's own code when none is stored", () => {
    expect(marker("⃁")).toBe("SAR");
    expect(marker("د.إ")).toBe("AED");
  });

  it("prints a custom symbol with no code as typed", () => {
    expect(marker("₹", "", "lora")).toBe("₹");
    expect(marker("Rs")).toBe("Rs");
  });

  it("resolves legacy currency codes before choosing the marker", () => {
    expect(marker("SAR")).toBe("SAR");
    expect(marker("AED")).toBe("AED");
    expect(marker("GBP")).toBe("£");
  });
});

describe("formatCurrency", () => {
  it("prefixes the amount with the resolved marker", () => {
    expect(formatCurrency(1234.5, money("£", "GBP"))).toBe("£1,234.50");
    expect(formatCurrency(9, money("CHF", "CHF"))).toBe("CHF9.00");
  });

  it("renders Riyal and Dirham amounts with legible ASCII markers", () => {
    expect(formatCurrency(1234.5, money("⃁", "SAR"))).toBe("SAR1,234.50");
    expect(formatCurrency(10, money("د.إ", "AED"))).toBe("AED10.00");
  });

  it("writes a rupee the font can't draw as INR", () => {
    expect(formatCurrency(1500, money("₹", "INR", "inter"))).toBe("₹1,500.00");
    expect(formatCurrency(1500, money("₹", "INR", "lora"))).toBe("INR1,500.00");
  });

  it("puts the minus sign of a negative amount before the marker", () => {
    expect(formatCurrency(-100, money("£"))).toBe("-£100.00");
    expect(formatCurrency(-1234.5, money("CHF"))).toBe("-CHF1,234.50");
    expect(formatCurrency(-0, money("£"))).toBe("£0.00");
  });
});

describe("formatCurrencyWithCode", () => {
  it("doesn't repeat a code the marker already is", () => {
    expect(formatCurrencyWithCode(10, money("₹", "INR", "inter"), "INR")).toBe(
      "₹10.00 INR"
    );
    expect(formatCurrencyWithCode(10, money("₹", "INR", "lora"), "INR")).toBe(
      "INR10.00"
    );
  });

  it("reads a lower-case stored code as the code it is", () => {
    expect(formatCurrencyWithCode(10, money("₹", "inr", "lora"), "inr")).toBe(
      "INR10.00"
    );
    expect(formatCurrencyWithCode(10, money("₹", "inr", "inter"), "inr")).toBe(
      "₹10.00 INR"
    );
  });
});

describe("normalizeCurrency", () => {
  it("keeps the stored symbol so the picker selection still matches", () => {
    expect(normalizeCurrency("⃁")).toBe("⃁");
    expect(normalizeCurrency("د.إ")).toBe("د.إ");
    expect(normalizeCurrency("SAR")).toBe("⃁");
  });
});
