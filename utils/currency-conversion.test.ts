import { describe, expect, it } from "vitest";
import { invoiceDefault } from "~/stores/invoice-store";
import {
  getCurrencyConversion,
  isSameCurrency
} from "~/utils/currency-conversion";

function conversionFor({
  currency,
  currencyCode,
  second
}: {
  currency: string;
  currencyCode: string;
  second: { currency: string; currencyCode: string };
}) {
  return getCurrencyConversion({
    sections: { ...invoiceDefault.sections, currencyConversion: true },
    currency,
    currencyCode,
    currencyConversion: { ...invoiceDefault.currencyConversion, ...second }
  });
}

describe("getCurrencyConversion", () => {
  it("names each currency by its code", () => {
    const conversion = conversionFor({
      currency: "£",
      currencyCode: "GBP",
      second: { currency: "$", currencyCode: "USD" }
    });

    expect(conversion).toMatchObject({ fromCode: "GBP", toCode: "USD" });
  });

  it("names a preset saved without a code by the preset's code", () => {
    const conversion = conversionFor({
      currency: "£",
      currencyCode: "",
      second: { currency: "$", currencyCode: "" }
    });

    expect(conversion).toMatchObject({ fromCode: "GBP", toCode: "USD" });
  });

  it("names a custom currency without a code by its symbol", () => {
    const conversion = conversionFor({
      currency: "£",
      currencyCode: "GBP",
      second: { currency: "Rs", currencyCode: "" }
    });

    expect(conversion).toMatchObject({ fromCode: "GBP", toCode: "Rs" });
  });
});

describe("isSameCurrency", () => {
  it("reads a preset saved without a code as the preset's currency", () => {
    expect(
      isSameCurrency(
        { currency: "£", currencyCode: "" },
        { currency: "£", currencyCode: "GBP" }
      )
    ).toBe(true);
    expect(
      isSameCurrency(
        { currency: "$", currencyCode: "" },
        { currency: "$", currencyCode: "CAD" }
      )
    ).toBe(false);
  });
});
