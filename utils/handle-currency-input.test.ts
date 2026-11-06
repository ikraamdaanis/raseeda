import { describe, expect, it } from "vitest";
import { handleCurrencyInput } from "~/utils/handle-currency-input";

const COMMA_DOT = { numberFormat: "comma-dot", decimals: 2 } as const;

describe("handleCurrencyInput", () => {
  it("sanitises plain numeric strings", () => {
    expect(handleCurrencyInput("1250", COMMA_DOT)).toBe("1250");
    expect(handleCurrencyInput("12.34", COMMA_DOT)).toBe("12.34");
  });

  it("strips non-numeric characters", () => {
    expect(handleCurrencyInput("$1,250.00", COMMA_DOT)).toBe("1250.00");
    expect(handleCurrencyInput("abc99", COMMA_DOT)).toBe("99");
  });

  it("limits decimal places to two", () => {
    expect(handleCurrencyInput("12.3456", COMMA_DOT)).toBe("12.34");
  });

  it("collapses multiple decimal points to the first", () => {
    expect(handleCurrencyInput("12.3.4", COMMA_DOT)).toBe("12.34");
  });

  it("removes leading zeros for whole numbers", () => {
    expect(handleCurrencyInput("002343", COMMA_DOT)).toBe("2343");
  });

  it("keeps a leading zero for values below one", () => {
    expect(handleCurrencyInput("0.42", COMMA_DOT)).toBe("0.42");
  });

  it("returns '' for a cleared field", () => {
    expect(handleCurrencyInput("", COMMA_DOT)).toBe("");
  });

  it("returns '0' for dot-only input", () => {
    expect(handleCurrencyInput(".", COMMA_DOT)).toBe("0");
  });

  it("returns '0' for all-zero input including '000'", () => {
    expect(handleCurrencyInput("00", COMMA_DOT)).toBe("0");
    expect(handleCurrencyInput("000", COMMA_DOT)).toBe("0");
    expect(handleCurrencyInput("0000", COMMA_DOT)).toBe("0");
  });

  describe("with a currency symbol prefix", () => {
    it("strips a single-character symbol before sanitising", () => {
      expect(
        handleCurrencyInput("$1250", { ...COMMA_DOT, currencySymbol: "$" })
      ).toBe("1250");
      expect(
        handleCurrencyInput("£12.34", { ...COMMA_DOT, currencySymbol: "£" })
      ).toBe("12.34");
    });

    it("strips a multi-character symbol", () => {
      expect(
        handleCurrencyInput("CHF1250", { ...COMMA_DOT, currencySymbol: "CHF" })
      ).toBe("1250");
    });

    it("strips the dirham symbol without treating its dot as a decimal", () => {
      expect(
        handleCurrencyInput("د.إ1250", { ...COMMA_DOT, currencySymbol: "د.إ" })
      ).toBe("1250");
      expect(
        handleCurrencyInput("د.إ12.34", { ...COMMA_DOT, currencySymbol: "د.إ" })
      ).toBe("12.34");
      expect(
        handleCurrencyInput("د.إ0.42", { ...COMMA_DOT, currencySymbol: "د.إ" })
      ).toBe("0.42");
    });

    it("returns '' when only the symbol is present", () => {
      expect(
        handleCurrencyInput("د.إ", { ...COMMA_DOT, currencySymbol: "د.إ" })
      ).toBe("");
    });
  });
});

describe("handleCurrencyInput in the invoice's number format", () => {
  it("reads 12,50 as twelve and a half on a 1.234,56 invoice", () => {
    const format = { numberFormat: "dot-comma", decimals: 2 } as const;

    expect(handleCurrencyInput("12,50", format)).toBe("12.50");
    expect(handleCurrencyInput("1.250", format)).toBe("1250");
    expect(
      handleCurrencyInput("€1.250,5", { ...format, currencySymbol: "€" })
    ).toBe("1250.5");
  });

  it("behaves as before on a 1,234.56 invoice", () => {
    expect(handleCurrencyInput("1,250.50", COMMA_DOT)).toBe("1250.50");
    expect(handleCurrencyInput("12,50", COMMA_DOT)).toBe("1250");
  });

  it("takes no decimals for a zero-decimal currency", () => {
    const yen = { numberFormat: "comma-dot", decimals: 0 } as const;

    expect(handleCurrencyInput("1,235", yen)).toBe("1235");
    expect(handleCurrencyInput("12.5", yen)).toBe("125");
  });
});
