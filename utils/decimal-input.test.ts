import { describe, expect, it } from "vitest";
import {
  formatDecimalDraft,
  normalizeDecimalInput,
  parseDecimalDraft
} from "~/utils/decimal-input";

describe("normalizeDecimalInput", () => {
  it("keeps digits and the first dot, to two places", () => {
    expect(normalizeDecimalInput("1,250.505")).toBe("1250.50");
    expect(normalizeDecimalInput("1.2.3")).toBe("1.23");
    expect(normalizeDecimalInput("007")).toBe("7");
  });

  it("keeps a minus typed before the figure, so a credit stays a credit", () => {
    expect(normalizeDecimalInput("-150")).toBe("-150");
    expect(normalizeDecimalInput("-15")).toBe("-15");
    expect(normalizeDecimalInput("-")).toBe("-");
    expect(normalizeDecimalInput("-.5")).toBe("-.5");
    expect(normalizeDecimalInput("--5")).toBe("-5");
  });

  it("drops a minus typed after the figure has started", () => {
    expect(normalizeDecimalInput("15-")).toBe("15");
    expect(normalizeDecimalInput("1-5")).toBe("15");
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
    expect(formatDecimalDraft("-150", "£")).toBe("-£150");
    expect(formatDecimalDraft("150", "£")).toBe("£150");
  });

  it("reads back through normalizeDecimalInput once the currency's gone", () => {
    const shown = formatDecimalDraft("-150", "Rs.");

    expect(normalizeDecimalInput(shown.replace("Rs.", ""))).toBe("-150");
  });
});
