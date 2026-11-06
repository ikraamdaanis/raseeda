import { describe, expect, it } from "vitest";
import {
  formatCurrency,
  formatCurrencyWithCode,
  getCurrencyDecimals,
  getCurrencyMarker,
  getMoneyFormat,
  normalizeCurrency,
  resolveCurrencyCode
} from "~/consts/currencies";
import { INVOICE_FONTS } from "~/consts/invoice-fonts";
import type { InvoiceFont, MoneyFormat } from "~/types";

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
  return getMoneyFormat({
    currency,
    currencyCode,
    theme: { font },
    numberFormat: "comma-dot",
    currencyPosition: "before"
  });
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
    expect(formatCurrency(9, money("CHF", "CHF"))).toBe("CHF\u00a09.00");
  });

  it("renders Riyal and Dirham amounts with legible ASCII markers", () => {
    expect(formatCurrency(1234.5, money("⃁", "SAR"))).toBe("SAR\u00a01,234.50");
    expect(formatCurrency(10, money("د.إ", "AED"))).toBe("AED\u00a010.00");
  });

  it("writes a rupee the font can't draw as INR", () => {
    expect(formatCurrency(1500, money("₹", "INR", "inter"))).toBe("₹1,500.00");
    expect(formatCurrency(1500, money("₹", "INR", "lora"))).toBe(
      "INR\u00a01,500.00"
    );
  });

  it("puts the minus sign of a negative amount before the marker", () => {
    expect(formatCurrency(-100, money("£"))).toBe("-£100.00");
    expect(formatCurrency(-1234.5, money("CHF"))).toBe("-CHF\u00a01,234.50");
    expect(formatCurrency(-0, money("£"))).toBe("£0.00");
  });
});

describe("formatCurrencyWithCode", () => {
  it("doesn't repeat a code the marker already is", () => {
    expect(formatCurrencyWithCode(10, money("₹", "INR", "inter"), "INR")).toBe(
      "₹10.00 INR"
    );
    expect(formatCurrencyWithCode(10, money("₹", "INR", "lora"), "INR")).toBe(
      "INR\u00a010.00"
    );
  });

  it("reads a lower-case stored code as the code it is", () => {
    expect(formatCurrencyWithCode(10, money("₹", "inr", "lora"), "inr")).toBe(
      "INR\u00a010.00"
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

describe("formatCurrency in every number format", () => {
  function format(amount: number, overrides: Partial<MoneyFormat> = {}) {
    return formatCurrency(amount, {
      marker: "€",
      numberFormat: "comma-dot",
      position: "before",
      decimals: 2,
      ...overrides
    });
  }

  it("groups and separates as each format does", () => {
    expect(format(1234567.891, { marker: "$" })).toBe("$1,234,567.89");
    expect(format(1234567.891, { numberFormat: "dot-comma" })).toBe(
      "€1.234.567,89"
    );
    expect(format(1234567.891, { numberFormat: "space-comma" })).toBe(
      "€1\u00a0234\u00a0567,89"
    );
    expect(
      format(1234567.891, { marker: "CHF", numberFormat: "apostrophe-dot" })
    ).toBe("CHF\u00a01’234’567.89");
    expect(format(1234567.891, { marker: "₹", numberFormat: "indian" })).toBe(
      "₹12,34,567.89"
    );
    expect(format(123, { marker: "₹", numberFormat: "indian" })).toBe(
      "₹123.00"
    );
    expect(format(1234, { marker: "₹", numberFormat: "indian" })).toBe(
      "₹1,234.00"
    );
  });

  it("never writes the narrow no-break space", () => {
    expect(format(1234567, { numberFormat: "space-comma" })).not.toContain(
      "\u202f"
    );
  });

  it("puts the marker after the figure with a no-break space", () => {
    expect(
      format(1234.56, { numberFormat: "dot-comma", position: "after" })
    ).toBe("1.234,56\u00a0€");
    expect(
      format(1234.56, {
        marker: "zł",
        numberFormat: "space-comma",
        position: "after"
      })
    ).toBe("1\u00a0234,56\u00a0zł");
  });

  it("spaces a marker ending in a letter before the figure, not a symbol", () => {
    expect(
      format(1234.5, { marker: "CHF", numberFormat: "apostrophe-dot" })
    ).toBe("CHF\u00a01’234.50");
    expect(format(1234.56, { marker: "$" })).toBe("$1,234.56");
    expect(format(5, { marker: "R$", numberFormat: "dot-comma" })).toBe(
      "R$5,00"
    );
  });

  it("keeps the sign first in both positions", () => {
    expect(
      format(-1234.56, { numberFormat: "dot-comma", position: "after" })
    ).toBe("-1.234,56\u00a0€");
    expect(format(-6.25, { marker: "$" })).toBe("-$6.25");
    expect(format(-0.001, { marker: "$" })).toBe("$0.00");
  });

  it("writes a zero-decimal currency in whole units", () => {
    expect(format(1234.5, { marker: "¥", decimals: 0 })).toBe("¥1,235");
    expect(
      format(1234.5, {
        marker: "₫",
        numberFormat: "dot-comma",
        position: "after",
        decimals: 0
      })
    ).toBe("1.235\u00a0₫");
  });

  it("writes an empty marker as the bare figure", () => {
    expect(format(5, { marker: "", position: "after" })).toBe("5.00");
  });
});

describe("getCurrencyDecimals", () => {
  it("reads a legacy stored code as that currency, not its symbol's first preset", () => {
    expect(getCurrencyDecimals({ currency: "CNY", currencyCode: "" })).toBe(2);
    expect(getCurrencyDecimals({ currency: "JPY", currencyCode: "" })).toBe(0);
    expect(resolveCurrencyCode({ currency: "CNY", currencyCode: "" })).toBe(
      "CNY"
    );
    expect(resolveCurrencyCode({ currency: "AUD", currencyCode: "" })).toBe(
      "AUD"
    );
  });

  it("is 0 for ISO 4217's zero-decimal currencies, 2 otherwise", () => {
    expect(getCurrencyDecimals({ currency: "¥", currencyCode: "JPY" })).toBe(0);
    expect(getCurrencyDecimals({ currency: "¥", currencyCode: "" })).toBe(0);
    expect(getCurrencyDecimals({ currency: "¥", currencyCode: "CNY" })).toBe(2);
    expect(getCurrencyDecimals({ currency: "₩", currencyCode: "krw" })).toBe(0);
    expect(getCurrencyDecimals({ currency: "€", currencyCode: "EUR" })).toBe(2);
    expect(getCurrencyDecimals({ currency: "BD", currencyCode: "BHD" })).toBe(
      2
    );
    expect(getCurrencyDecimals({ currency: "Rs", currencyCode: "" })).toBe(2);
  });
});
