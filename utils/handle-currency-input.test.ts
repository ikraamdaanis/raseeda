import { describe, expect, it } from "vitest";
import { handleCurrencyInput } from "~/utils/handle-currency-input";

describe("handleCurrencyInput", () => {
  it("sanitises plain numeric strings", () => {
    expect(handleCurrencyInput("1250")).toBe("1250");
    expect(handleCurrencyInput("12.34")).toBe("12.34");
  });

  it("strips non-numeric characters", () => {
    expect(handleCurrencyInput("$1,250.00")).toBe("1250.00");
    expect(handleCurrencyInput("abc99")).toBe("99");
  });

  it("limits decimal places to two", () => {
    expect(handleCurrencyInput("12.3456")).toBe("12.34");
  });

  it("collapses multiple decimal points to the first", () => {
    expect(handleCurrencyInput("12.3.4")).toBe("12.34");
  });

  it("removes leading zeros for whole numbers", () => {
    expect(handleCurrencyInput("002343")).toBe("2343");
  });

  it("keeps a leading zero for values below one", () => {
    expect(handleCurrencyInput("0.42")).toBe("0.42");
  });

  it("returns '' for a cleared field", () => {
    expect(handleCurrencyInput("")).toBe("");
  });

  it("returns '0' for dot-only input", () => {
    expect(handleCurrencyInput(".")).toBe("0");
  });

  it("returns '0' for all-zero input including '000'", () => {
    expect(handleCurrencyInput("00")).toBe("0");
    expect(handleCurrencyInput("000")).toBe("0");
    expect(handleCurrencyInput("0000")).toBe("0");
  });

  describe("with a currency symbol prefix", () => {
    it("strips a single-character symbol before sanitising", () => {
      expect(handleCurrencyInput("$1250", "$")).toBe("1250");
      expect(handleCurrencyInput("£12.34", "£")).toBe("12.34");
    });

    it("strips a multi-character symbol", () => {
      expect(handleCurrencyInput("CHF1250", "CHF")).toBe("1250");
    });

    it("strips the dirham symbol without treating its dot as a decimal", () => {
      expect(handleCurrencyInput("د.إ1250", "د.إ")).toBe("1250");
      expect(handleCurrencyInput("د.إ12.34", "د.إ")).toBe("12.34");
      expect(handleCurrencyInput("د.إ0.42", "د.إ")).toBe("0.42");
    });

    it("returns '' when only the symbol is present", () => {
      expect(handleCurrencyInput("د.إ", "د.إ")).toBe("");
    });
  });
});
