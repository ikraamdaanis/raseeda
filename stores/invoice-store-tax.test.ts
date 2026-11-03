import { beforeEach, describe, expect, it } from "vitest";
import { createBlankInvoice, useInvoiceStore } from "~/stores/invoice-store";

function store() {
  return useInvoiceStore.getState();
}

// An invoice at 20% with Per line on and two lines on the invoice's rate.
beforeEach(() => {
  store().setInvoice({
    ...createBlankInvoice(),
    tax: { percentage: 20, exempt: false, note: "", perLine: true },
    items: [
      { id: "a", description: "Design", quantity: 1, unit: "", unitPrice: 100 },
      { id: "b", description: "Books", quantity: 1, unit: "", unitPrice: 50 }
    ]
  });
});

describe("setItemTax", () => {
  it("gives a line a rate of its own", () => {
    store().setItemTax("b", { percentage: 0, exempt: false });

    expect(store().items[1].tax).toEqual({ percentage: 0, exempt: false });
    expect(store().items[0].tax).toBeUndefined();
  });

  it("puts a line back on the invoice's rate when given none", () => {
    store().setItemTax("b", { percentage: 5, exempt: true });
    store().setItemTax("b", undefined);

    expect(store().items[1]).not.toHaveProperty("tax");
  });

  it("leaves the invoice alone for a line that has gone", () => {
    const before = store().items;

    store().setItemTax("gone", { percentage: 5, exempt: false });

    expect(store().items).toBe(before);
  });
});

describe("setItemAmount", () => {
  it("makes a line one at the amount typed", () => {
    store().updateItem(0, "quantity", 3);
    store().setItemAmount("a", 250);

    expect(store().items[0]).toMatchObject({ quantity: 1, unitPrice: 250 });
    expect(store().items[1]).toMatchObject({ quantity: 1, unitPrice: 50 });
  });

  it("leaves the invoice alone for a line that has gone", () => {
    const before = store().items;

    store().setItemAmount("gone", 5);

    expect(store().items).toBe(before);
  });
});
