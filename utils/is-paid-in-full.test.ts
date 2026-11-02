import { describe, expect, it } from "vitest";
import { createBlankInvoice } from "~/stores/invoice-store";
import type { Invoice } from "~/types";
import { isPaidInFull } from "~/utils/is-paid-in-full";

function invoiceWith(overrides: Partial<Invoice>): Invoice {
  return {
    ...createBlankInvoice(),
    items: [
      { id: "a", description: "Work", quantity: 1, unit: "", unitPrice: 100 }
    ],
    tax: { percentage: 0, exempt: false, note: "" },
    fees: 0,
    discounts: 0,
    ...overrides
  };
}

describe("isPaidInFull", () => {
  it("is true when the amount paid covers the total", () => {
    expect(isPaidInFull(invoiceWith({ amountPaid: 100 }))).toBe(true);
  });

  it("is false with some left to pay", () => {
    expect(isPaidInFull(invoiceWith({ amountPaid: 40 }))).toBe(false);
  });

  it("is false with no payment recorded", () => {
    expect(isPaidInFull(invoiceWith({ amountPaid: 0 }))).toBe(false);
  });

  it("ignores a payment while its row is switched off", () => {
    const invoice = invoiceWith({ amountPaid: 100 });

    expect(
      isPaidInFull({
        ...invoice,
        sections: { ...invoice.sections, amountPaid: false }
      })
    ).toBe(false);
  });

  it("is false with nothing to pay", () => {
    expect(isPaidInFull(invoiceWith({ items: [], amountPaid: 10 }))).toBe(
      false
    );
  });
});
