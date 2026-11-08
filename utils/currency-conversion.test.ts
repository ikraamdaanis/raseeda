import { describe, expect, it } from "vitest";
import { invoiceDefault } from "~/stores/invoice-store";
import { calculateInvoiceTotals } from "~/utils/calculate-invoice-totals";
import {
  calculateConvertedTotals,
  convertAmount,
  formatConvertedAmount,
  formatExchangeRate,
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
    currencyConversion: { ...invoiceDefault.currencyConversion, ...second },
    theme: { font: "inter" }
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

describe("formatConvertedAmount", () => {
  const conversion = {
    rate: 1.25,
    fromCode: "GBP",
    toCurrency: "$",
    toCode: "USD",
    toMarker: "$",
    toDecimals: 2
  };
  const money = {
    marker: "£",
    numberFormat: "comma-dot",
    position: "before",
    decimals: 2
  } as const;

  it("puts the minus sign of a negative amount before the marker", () => {
    expect(formatConvertedAmount(-5, conversion, money)).toBe("-$6.25");
    expect(
      formatConvertedAmount(
        -5,
        { ...conversion, toCurrency: "CHF", toMarker: "CHF" },
        money
      )
    ).toBe("-CHF\u00a06.25");
  });

  it("writes the second currency in the invoice's number format", () => {
    expect(
      formatConvertedAmount(1234.5, conversion, {
        ...money,
        numberFormat: "dot-comma",
        position: "after"
      })
    ).toBe("1.543,13\u00a0$");
  });

  it("rounds to the second currency's own decimals", () => {
    expect(
      formatConvertedAmount(
        10,
        {
          ...conversion,
          rate: 187.456,
          toCurrency: "¥",
          toCode: "JPY",
          toMarker: "¥",
          toDecimals: 0
        },
        money
      )
    ).toBe("¥1,875");
  });
});

describe("calculateConvertedTotals", () => {
  // £1,070.00 of lines at 20%, 5% and exempt, less £50, plus £25 in fees,
  // £500 paid, at 1.1734. Converting the total on its own gives €1,452.70,
  // a cent short of the converted rows above it.
  const totals = calculateInvoiceTotals({
    documentType: "invoice",
    items: [
      { id: "a", description: "", unit: "", quantity: 3, unitPrice: 333.33 },
      {
        id: "b",
        description: "",
        unit: "",
        quantity: 1,
        unitPrice: 49.99,
        tax: { percentage: 5, exempt: false }
      },
      {
        id: "c",
        description: "",
        unit: "",
        quantity: 2,
        unitPrice: 10.01,
        tax: { percentage: 0, exempt: true }
      }
    ],
    tax: { percentage: 20, exempt: false, note: "", perLine: true },
    discounts: 50,
    discountType: "fixed",
    fees: 25,
    amountPaid: 500,
    currency: "£",
    currencyCode: "GBP"
  });

  it("adds each sum up from the converted rows above it", () => {
    expect(
      calculateConvertedTotals({
        totals,
        conversion: { rate: 1.1734, toDecimals: 2 }
      })
    ).toEqual({
      subtotal: 1255.54,
      total: 1452.71,
      balanceDue: 866.01
    });
  });

  it("reads zero at a rate of zero", () => {
    expect(
      calculateConvertedTotals({
        totals,
        conversion: { rate: 0, toDecimals: 2 }
      })
    ).toEqual({
      subtotal: 0,
      total: 0,
      balanceDue: 0
    });
  });

  it("reads zero without a conversion", () => {
    expect(calculateConvertedTotals({ totals, conversion: null })).toEqual({
      subtotal: 0,
      total: 0,
      balanceDue: 0
    });
  });

  it("adds a zero-decimal second currency up in whole units", () => {
    const converted = calculateConvertedTotals({
      totals,
      conversion: { rate: 187.456, toDecimals: 0 }
    });
    const lines = totals.items.reduce(
      (sum, item) =>
        sum + convertAmount(item.amount, { rate: 187.456, toDecimals: 0 }),
      0
    );

    expect(Number.isInteger(converted.total)).toBe(true);
    expect(converted.subtotal).toBe(lines);
  });

  it("never reads a negative balance", () => {
    expect(
      calculateConvertedTotals({
        totals: { ...totals, amountPaid: 5000 },
        conversion: { rate: 1.1734, toDecimals: 2 }
      }).balanceDue
    ).toBe(0);
  });
});

describe("the second currency's column", () => {
  // A seeded generator, so a failure always reproduces.
  function createRandom(seed: number) {
    let state = seed;

    return () => {
      state = (state * 1664525 + 1013904223) % 4294967296;

      return state / 4294967296;
    };
  }

  it("adds up, row by row, for any lines, rates, discount, fees and payment", () => {
    const random = createRandom(107);
    const pick = <T>(values: T[]) =>
      values[Math.floor(random() * values.length)];

    for (let run = 0; run < 2000; run++) {
      const rate = Number((random() * 200).toFixed(pick([2, 4, 6])));
      const totals = calculateInvoiceTotals({
        documentType: "invoice",
        items: Array.from(
          { length: 1 + Math.floor(random() * 6) },
          (_, index) => ({
            id: String(index),
            description: "",
            unit: "",
            quantity: pick([1, 2, 3, 0.5, 1.5, 7]),
            unitPrice: Number((random() * 5000).toFixed(2)),
            tax: pick([
              undefined,
              { percentage: 5, exempt: false },
              { percentage: 0, exempt: false },
              { percentage: 17.5, exempt: false },
              { percentage: 0, exempt: true }
            ])
          })
        ),
        tax: { percentage: 20, exempt: false, note: "", perLine: true },
        discounts: pick([0, 10, 99.99, 12.5]),
        discountType: pick(["fixed", "percentage"] as const),
        fees: pick([0, 25, 3.33]),
        amountPaid: pick([0, 100, 999.99]),
        currency: "£",
        currencyCode: "GBP"
      });
      const converted = calculateConvertedTotals({
        totals,
        conversion: { rate, toDecimals: 2 }
      });
      const toCents = (amount: number) => Math.round(amount * 100);
      const convertedCents = (amount: number) =>
        toCents(convertAmount(amount, { rate, toDecimals: 2 }));
      const lines = totals.items.reduce(
        (sum, item) => sum + convertedCents(item.amount),
        0
      );
      const tax = totals.taxGroups.reduce(
        (sum, group) => sum + convertedCents(group.taxAmount),
        0
      );

      expect(toCents(converted.subtotal)).toBe(lines);
      expect(toCents(converted.total)).toBe(
        Math.max(
          0,
          lines -
            convertedCents(totals.discountAmount) +
            tax +
            convertedCents(totals.fees)
        )
      );
      expect(toCents(converted.balanceDue)).toBe(
        Math.max(
          0,
          toCents(converted.total) - convertedCents(totals.amountPaid)
        )
      );
    }
  });
});

describe("formatExchangeRate", () => {
  it("writes the rate in the invoice's decimal separator, trailing zeros off", () => {
    expect(formatExchangeRate(1.2875, "comma-dot")).toBe("1.2875");
    expect(formatExchangeRate(1.2875, "dot-comma")).toBe("1,2875");
    expect(formatExchangeRate(1.2, "space-comma")).toBe("1,20");
    expect(formatExchangeRate(187.4561234, "comma-dot")).toBe("187.456123");
    expect(formatExchangeRate(2, "dot-comma")).toBe("2,00");
  });
});
