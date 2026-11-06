import { describe, expect, it } from "vitest";
import { invoiceDefault } from "~/stores/invoice-store";
import type { Invoice } from "~/types";
import { ensureRowIds } from "~/utils/ensure-row-ids";

function withMethods(methods: Invoice["paymentDetails"]["methods"]): Invoice {
  return {
    ...invoiceDefault,
    paymentDetails: { ...invoiceDefault.paymentDetails, methods }
  };
}

describe("ensureRowIds", () => {
  it("gives each line item without an id one", () => {
    const invoice = ensureRowIds({
      ...invoiceDefault,
      items: [
        { id: "", description: "A", quantity: 1, unit: "", unitPrice: 1 },
        { id: "b", description: "B", quantity: 1, unit: "", unitPrice: 1 }
      ]
    });

    expect(invoice.items[0].id).not.toBe("");
    expect(invoice.items[1].id).toBe("b");
  });

  it("gives ways to pay sent without ids, or with the same one, ids of their own", () => {
    const invoice = ensureRowIds(
      withMethods([
        { id: "", name: "Venmo", detail: "@jane" },
        { id: "", name: "Pix", detail: "jane@example.com" },
        { id: "a", name: "Wise", detail: "jane" },
        { id: "a", name: "UPI", detail: "jane@okicici" }
      ])
    );
    const ids = invoice.paymentDetails.methods.map(method => method.id);

    expect(new Set(ids).size).toBe(4);
    expect(ids).not.toContain("");
    expect(ids[2]).toBe("a");
    expect(invoice.paymentDetails.methods.map(method => method.detail)).toEqual(
      ["@jane", "jane@example.com", "jane", "jane@okicici"]
    );
  });

  it("gives line items sharing an id ids of their own", () => {
    const invoice = ensureRowIds({
      ...invoiceDefault,
      items: [
        { id: "1", description: "A", quantity: 1, unit: "", unitPrice: 1 },
        { id: "1", description: "B", quantity: 1, unit: "", unitPrice: 1 }
      ]
    });

    expect(invoice.items[0].id).toBe("1");
    expect(invoice.items[1].id).not.toBe("1");
    expect(invoice.items[1].id).not.toBe("");
  });

  it("gives the same rows the same ids each time, so reopening changes nothing", () => {
    const methods = [
      { id: "", name: "Venmo", detail: "@jane" },
      { id: "", name: "Pix", detail: "jane@example.com" }
    ];

    expect(ensureRowIds(withMethods(methods))).toEqual(
      ensureRowIds(withMethods(methods))
    );
  });

  it("leaves an invoice whose rows all have their own ids as it is", () => {
    const invoice = withMethods([{ id: "a", name: "Venmo", detail: "@jane" }]);

    expect(ensureRowIds(invoice)).toBe(invoice);
  });
});
