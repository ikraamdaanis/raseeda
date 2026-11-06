import { describe, expect, it } from "vitest";
import { invoiceSchema } from "~/schema/invoice";
import { invoiceDefault } from "~/stores/invoice-store";

describe("invoiceSchema line-item resilience", () => {
  // The regression guard for the "one bad item wipes them all" bug: resilience
  // is on each element, so an unparseable entry drops only itself.
  it("drops only the unparseable line items, keeping the valid ones", () => {
    const input: unknown = {
      ...invoiceDefault,
      items: [
        { id: "a", description: "Design", quantity: 2, unitPrice: 100 },
        null,
        "garbage",
        42,
        { id: "b", description: "Dev", quantity: 1, unitPrice: 50 }
      ]
    };

    const parsed = invoiceSchema.parse(input);

    expect(parsed.items).toHaveLength(2);
    expect(parsed.items.map(item => item.description)).toEqual([
      "Design",
      "Dev"
    ]);
  });

  it("repairs a partial item rather than dropping it", () => {
    const input: unknown = {
      ...invoiceDefault,
      items: [{ description: "Only a description" }]
    };

    const parsed = invoiceSchema.parse(input);

    expect(parsed.items).toHaveLength(1);
    expect(parsed.items[0].description).toBe("Only a description");
    expect(parsed.items[0].quantity).toBe(0);
    expect(parsed.items[0].unitPrice).toBe(0);
  });

  it("recovers to an empty list when items is not an array", () => {
    const input: unknown = { ...invoiceDefault, items: "not an array" };

    const parsed = invoiceSchema.parse(input);

    expect(parsed.items).toEqual([]);
  });
});

describe("invoiceSchema number format and currency position", () => {
  it("reads an invoice saved before them as 1,234.56 with the symbol first", () => {
    const {
      numberFormat: _numberFormat,
      currencyPosition: _position,
      ...old
    } = invoiceDefault;
    const parsed = invoiceSchema.parse(old);

    expect(parsed.numberFormat).toBe("comma-dot");
    expect(parsed.currencyPosition).toBe("before");
  });

  it("replaces an unknown value with the default", () => {
    const parsed = invoiceSchema.parse({
      ...invoiceDefault,
      numberFormat: "comma-comma",
      currencyPosition: "middle"
    });

    expect(parsed.numberFormat).toBe("comma-dot");
    expect(parsed.currencyPosition).toBe("before");
  });

  it("keeps a valid value", () => {
    const parsed = invoiceSchema.parse({
      ...invoiceDefault,
      numberFormat: "indian",
      currencyPosition: "after"
    });

    expect(parsed.numberFormat).toBe("indian");
    expect(parsed.currencyPosition).toBe("after");
  });
});

describe("invoiceSchema paper size", () => {
  it("reads an invoice saved before it, or a bad value, as A4", () => {
    const { paperSize: _paperSize, ...old } = invoiceDefault;

    expect(invoiceSchema.parse(old).paperSize).toBe("A4");
    expect(
      invoiceSchema.parse({ ...invoiceDefault, paperSize: "A5" }).paperSize
    ).toBe("A4");
    expect(
      invoiceSchema.parse({ ...invoiceDefault, paperSize: "Letter" }).paperSize
    ).toBe("Letter");
  });
});

describe("invoiceSchema payment methods and labels", () => {
  it("reads an invoice saved before them with no methods and the old labels", () => {
    const {
      labels: _labels,
      methods: _methods,
      ...old
    } = invoiceDefault.paymentDetails;
    const parsed = invoiceSchema.parse({
      ...invoiceDefault,
      paymentDetails: old
    });

    expect(parsed.paymentDetails.methods).toEqual([]);
    expect(parsed.paymentDetails.labels).toEqual({
      bankName: "Bank name",
      accountName: "Account name",
      accountNumber: "Account number",
      routingNumber: "Routing number",
      iban: "IBAN",
      bic: "BIC / SWIFT",
      sortCode: "Sort code"
    });
  });

  it("keeps a renamed label and fills in a missing one", () => {
    const parsed = invoiceSchema.parse({
      ...invoiceDefault,
      paymentDetails: {
        ...invoiceDefault.paymentDetails,
        labels: { routingNumber: "BSB", iban: 4 }
      }
    });

    expect(parsed.paymentDetails.labels.routingNumber).toBe("BSB");
    expect(parsed.paymentDetails.labels.iban).toBe("IBAN");
    expect(parsed.paymentDetails.labels.bankName).toBe("Bank name");
  });

  it("drops only the unreadable methods and repairs a partial one", () => {
    const parsed = invoiceSchema.parse({
      ...invoiceDefault,
      paymentDetails: {
        ...invoiceDefault.paymentDetails,
        methods: [
          { id: "a", name: "Venmo", detail: "@jane-designs" },
          null,
          "PayPal",
          { name: "Pix" }
        ]
      }
    });

    expect(parsed.paymentDetails.methods).toEqual([
      { id: "a", name: "Venmo", detail: "@jane-designs" },
      { id: "", name: "Pix", detail: "" }
    ]);
  });

  it("recovers to no methods when methods isn't a list", () => {
    const parsed = invoiceSchema.parse({
      ...invoiceDefault,
      paymentDetails: { ...invoiceDefault.paymentDetails, methods: "PayPal" }
    });

    expect(parsed.paymentDetails.methods).toEqual([]);
  });
});
