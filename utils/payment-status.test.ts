import { describe, expect, it } from "vitest";
import { createBlankInvoice } from "~/stores/invoice-store";
import type { Invoice } from "~/types";
import { getPaymentStatus } from "~/utils/payment-status";

const today = new Date(2026, 10, 2);

function invoiceWith(overrides: Partial<Invoice>): Invoice {
  const blank = createBlankInvoice();

  return {
    ...blank,
    items: [
      { id: "a", description: "Work", quantity: 1, unit: "", unitPrice: 100 }
    ],
    tax: { percentage: 0, exempt: false, note: "" },
    fees: 0,
    discounts: 0,
    dueDate: "2026-11-30",
    ...overrides
  };
}

describe("getPaymentStatus", () => {
  it("is paid when nothing is left to pay", () => {
    expect(getPaymentStatus(invoiceWith({ amountPaid: 100 }), today)).toBe(
      "paid"
    );
  });

  it("is part paid when some is left and it isn't due", () => {
    expect(getPaymentStatus(invoiceWith({ amountPaid: 40 }), today)).toBe(
      "partPaid"
    );
  });

  it("is overdue once the due date has passed with something left", () => {
    expect(
      getPaymentStatus(
        invoiceWith({ amountPaid: 40, dueDate: "2026-11-01" }),
        today
      )
    ).toBe("overdue");
  });

  it("isn't overdue on its due date", () => {
    expect(
      getPaymentStatus(invoiceWith({ dueDate: "2026-11-02" }), today)
    ).toBe("unpaid");
  });

  it("ignores a payment while its row is switched off", () => {
    const invoice = invoiceWith({ amountPaid: 100 });

    expect(
      getPaymentStatus(
        { ...invoice, sections: { ...invoice.sections, amountPaid: false } },
        today
      )
    ).toBe("unpaid");
  });

  it("is unpaid with nothing to pay", () => {
    expect(getPaymentStatus(invoiceWith({ items: [] }), today)).toBe("unpaid");
  });
});
