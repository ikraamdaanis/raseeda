import { describe, expect, it } from "vitest";
import type { MoneyFormat } from "~/types";
import {
  formatDecimalDraft,
  normalizeDecimalInput,
  parseDecimalDraft
} from "~/utils/decimal-input";

const COMMA_DOT = { numberFormat: "comma-dot", decimals: 2 } as const;
const DOT_COMMA = { numberFormat: "dot-comma", decimals: 2 } as const;
const SPACE_COMMA = { numberFormat: "space-comma", decimals: 2 } as const;

function money(marker: string, overrides: Partial<MoneyFormat> = {}) {
  return {
    marker,
    numberFormat: "comma-dot",
    position: "before",
    decimals: 2,
    ...overrides
  } satisfies MoneyFormat;
}

describe("normalizeDecimalInput", () => {
  it("keeps digits and the first dot, to two places", () => {
    expect(normalizeDecimalInput("1,250.505", COMMA_DOT)).toBe("1250.50");
    expect(normalizeDecimalInput("1.2.3", COMMA_DOT)).toBe("1.23");
    expect(normalizeDecimalInput("007", COMMA_DOT)).toBe("7");
  });

  it("keeps a minus typed before the figure, so a credit stays a credit", () => {
    expect(normalizeDecimalInput("-150", COMMA_DOT)).toBe("-150");
    expect(normalizeDecimalInput("-15", COMMA_DOT)).toBe("-15");
    expect(normalizeDecimalInput("-", COMMA_DOT)).toBe("-");
    expect(normalizeDecimalInput("-.5", COMMA_DOT)).toBe("-.5");
    expect(normalizeDecimalInput("--5", COMMA_DOT)).toBe("-5");
  });

  it("drops a minus typed after the figure has started", () => {
    expect(normalizeDecimalInput("15-", COMMA_DOT)).toBe("15");
    expect(normalizeDecimalInput("1-5", COMMA_DOT)).toBe("15");
  });
});

describe("parseDecimalDraft", () => {
  it("reads a draft with no figure yet as 0", () => {
    expect(parseDecimalDraft("")).toBe(0);
    expect(parseDecimalDraft(".")).toBe(0);
    expect(parseDecimalDraft("-")).toBe(0);
    expect(parseDecimalDraft("-.")).toBe(0);
    expect(Object.is(parseDecimalDraft("-0"), 0)).toBe(true);
  });

  it("reads a negative draft", () => {
    expect(parseDecimalDraft("-150")).toBe(-150);
    expect(parseDecimalDraft("-.5")).toBe(-0.5);
  });
});

describe("formatDecimalDraft", () => {
  it("puts the sign before the currency, as the figure reads at rest", () => {
    expect(formatDecimalDraft("-150", money("£"))).toBe("-£150");
    expect(formatDecimalDraft("150", money("£"))).toBe("£150");
  });

  it("reads back through normalizeDecimalInput once the currency's gone", () => {
    const shown = formatDecimalDraft("-150", money("Rs."));

    expect(normalizeDecimalInput(shown.replace("Rs.", ""), COMMA_DOT)).toBe(
      "-150"
    );
  });
});

describe("normalizeDecimalInput in the invoice's number format", () => {
  it("reads a comma as the decimal point on a 1.234,56 invoice", () => {
    expect(normalizeDecimalInput("12,50", DOT_COMMA)).toBe("12.50");
    expect(normalizeDecimalInput("1.250", DOT_COMMA)).toBe("1250");
    expect(normalizeDecimalInput("1.234,567", DOT_COMMA)).toBe("1234.56");
    expect(normalizeDecimalInput("-12,5", DOT_COMMA)).toBe("-12.5");
  });

  it("ignores spaces and dots on a 1 234,56 invoice", () => {
    expect(normalizeDecimalInput("12,50", SPACE_COMMA)).toBe("12.50");
    expect(normalizeDecimalInput("1 250,5", SPACE_COMMA)).toBe("1250.5");
    expect(normalizeDecimalInput("1\u00a0250", SPACE_COMMA)).toBe("1250");
    expect(normalizeDecimalInput("1.250", SPACE_COMMA)).toBe("1250");
  });

  it("ignores apostrophes and commas on a Swiss invoice", () => {
    const swiss = { numberFormat: "apostrophe-dot", decimals: 2 } as const;

    expect(normalizeDecimalInput("1’250.50", swiss)).toBe("1250.50");
    expect(normalizeDecimalInput("1'250", swiss)).toBe("1250");
  });

  it("reads the Indian format's commas as grouping", () => {
    const indian = { numberFormat: "indian", decimals: 2 } as const;

    expect(normalizeDecimalInput("12,34,567.89", indian)).toBe("1234567.89");
  });

  it("takes no decimal separator for a zero-decimal currency", () => {
    expect(
      normalizeDecimalInput("1,235.5", {
        numberFormat: "comma-dot",
        decimals: 0
      })
    ).toBe("12355");
    expect(
      normalizeDecimalInput("1.235", { numberFormat: "dot-comma", decimals: 0 })
    ).toBe("1235");
  });
});

describe("formatDecimalDraft in the invoice's format", () => {
  it("shows the invoice's decimal separator and puts the currency after", () => {
    expect(
      formatDecimalDraft(
        "12.5",
        money("€", { numberFormat: "dot-comma", position: "after" })
      )
    ).toBe("12,5\u00a0€");
    expect(
      formatDecimalDraft(
        "-12.5",
        money("€", { numberFormat: "dot-comma", position: "after" })
      )
    ).toBe("-12,5\u00a0€");
  });

  it("reads back through normalizeDecimalInput once the currency's gone", () => {
    const shown = formatDecimalDraft(
      "12.5",
      money("zł", { numberFormat: "space-comma", position: "after" })
    );

    expect(normalizeDecimalInput(shown.replace("zł", ""), SPACE_COMMA)).toBe(
      "12.5"
    );
  });
});
