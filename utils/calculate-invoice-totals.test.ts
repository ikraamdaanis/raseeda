import { describe, expect, it } from "vitest";
import {
  DEFAULT_CURRENCY_CONVERSION,
  DEFAULT_INVOICE_SECTIONS
} from "~/schema/invoice";
import type { Invoice, InvoiceItem } from "~/types";
import { calculateInvoiceTotals } from "~/utils/calculate-invoice-totals";

// A minimal, dependency-free invoice factory. The money math only reads
// `items`, `tax`, `fees`, and `discounts`, so the rest is filled with empty
// placeholders rather than imported from the store (keeps this suite a clean
// template for future ones).
function makeInvoice(overrides: Partial<Invoice> = {}): Invoice {
  return {
    id: "test",
    title: "Invoice",
    image: "",
    number: "1",
    poNumber: "",
    invoiceDate: "2026-01-01",
    dueDate: "2026-01-31",
    servicePeriod: "",
    supplyDate: "",
    seller: { label: "From", content: "", placeholder: "" },
    client: { label: "To", content: "", placeholder: "" },
    shipping: { label: "Ship to", content: "", placeholder: "" },
    items: [],
    tableSettings: {
      columnLabels: {
        description: "Item",
        quantity: "Quantity",
        unit: "Unit",
        unitPrice: "Unit Price",
        amount: "Amount"
      },
      backgroundColor: "#f9fafb",
      borderColor: "#e5e7eb"
    },
    labels: {
      invoiceNumber: "Invoice No.",
      invoiceDate: "Date",
      paymentDue: "Due date",
      poNumber: "PO number",
      servicePeriod: "Service period",
      supplyDate: "Date of supply",
      subtotal: "Subtotal",
      tax: "Tax",
      fees: "Fees",
      discounts: "Discounts",
      total: "Total",
      amountPaid: "Amount paid",
      balanceDue: "Balance due"
    },
    tax: { percentage: 0, exempt: false, note: "", perLine: false },
    fees: 0,
    discounts: 0,
    discountType: "fixed",
    amountPaid: 0,
    paidDate: "",
    currencyConversion: DEFAULT_CURRENCY_CONVERSION,
    terms: { label: "Terms", content: "" },
    notes: { label: "Notes", content: "" },
    latePayment: { label: "Late payment", content: "" },
    paymentDetails: {
      label: "Payment details",
      bankName: "",
      accountName: "",
      accountNumber: "",
      routingNumber: "",
      iban: "",
      bic: "",
      sortCode: "",
      terms: ""
    },
    pdfSettings: { backgroundColor: "#ffffff" },
    currency: "£",
    currencyCode: "",
    theme: {
      font: "geist",
      fontWeight: "Normal",
      size: "medium",
      accent: "#1a1a1a"
    },
    sections: { ...DEFAULT_INVOICE_SECTIONS },
    dateFormat: "yyyy-MM-dd",
    ...overrides
  };
}

function makeItem(overrides: Partial<InvoiceItem> = {}): InvoiceItem {
  return {
    id: crypto.randomUUID(),
    description: "Item",
    quantity: 1,
    unit: "",
    unitPrice: 0,
    ...overrides
  };
}

describe("calculateInvoiceTotals", () => {
  it("sums item amounts into the subtotal and total", () => {
    const totals = calculateInvoiceTotals(
      makeInvoice({
        items: [
          makeItem({ quantity: 2, unitPrice: 50 }),
          makeItem({ quantity: 3, unitPrice: 10 })
        ]
      })
    );

    expect(totals.items[0].amount).toBe(100);
    expect(totals.items[1].amount).toBe(30);
    expect(totals.subtotal).toBe(130);
    expect(totals.total).toBe(130);
  });

  it("computes the line amount for a fractional quantity", () => {
    const totals = calculateInvoiceTotals(
      makeInvoice({ items: [makeItem({ quantity: 1.5, unitPrice: 40 })] })
    );

    expect(totals.items[0].amount).toBe(60);
    expect(totals.subtotal).toBe(60);
    expect(totals.total).toBe(60);
  });

  it("returns zeros for an invoice with no items", () => {
    const totals = calculateInvoiceTotals(makeInvoice({ items: [] }));

    expect(totals.subtotal).toBe(0);
    expect(totals.taxAmount).toBe(0);
    expect(totals.total).toBe(0);
  });

  it("rounds each item amount to two decimal places", () => {
    const totals = calculateInvoiceTotals(
      makeInvoice({ items: [makeItem({ quantity: 3, unitPrice: 0.335 })] })
    );

    expect(totals.items[0].amount).toBe(1.01);
    expect(totals.subtotal).toBe(1.01);
  });

  it("rounds the subtotal explicitly, absorbing per-item float drift", () => {
    const totals = calculateInvoiceTotals(
      makeInvoice({
        items: [
          makeItem({ quantity: 1, unitPrice: 0.1 }),
          makeItem({ quantity: 1, unitPrice: 0.2 })
        ]
      })
    );

    expect(totals.subtotal).toBe(0.3);
  });

  it("applies a whole-number tax percentage to the subtotal", () => {
    const totals = calculateInvoiceTotals(
      makeInvoice({
        items: [makeItem({ quantity: 1, unitPrice: 100 })],
        tax: { percentage: 20, exempt: false, note: "", perLine: false }
      })
    );

    expect(totals.subtotal).toBe(100);
    expect(totals.taxAmount).toBe(20);
    expect(totals.total).toBe(120);
  });

  it("rounds fractional tax to two decimal places", () => {
    const totals = calculateInvoiceTotals(
      makeInvoice({
        items: [makeItem({ quantity: 1, unitPrice: 99.99 })],
        tax: { percentage: 7.5, exempt: false, note: "", perLine: false }
      })
    );

    expect(totals.subtotal).toBe(99.99);
    expect(totals.taxAmount).toBe(7.5);
    expect(totals.total).toBe(107.49);
  });

  it("adds fees on top of the subtotal and tax", () => {
    const totals = calculateInvoiceTotals(
      makeInvoice({
        items: [makeItem({ quantity: 1, unitPrice: 100 })],
        tax: { percentage: 10, exempt: false, note: "", perLine: false },
        fees: 15
      })
    );

    expect(totals.total).toBe(125);
  });

  it("subtracts discounts from the total", () => {
    const totals = calculateInvoiceTotals(
      makeInvoice({
        items: [makeItem({ quantity: 1, unitPrice: 100 })],
        discounts: 30
      })
    );

    expect(totals.total).toBe(70);
  });

  it("coerces string-typed quantities, prices, tax, fees, and discounts", () => {
    const totals = calculateInvoiceTotals(
      makeInvoice({
        items: [
          makeItem({
            quantity: "2" as unknown as number,
            unitPrice: "49.5" as unknown as number
          })
        ],
        tax: {
          percentage: "10" as unknown as number,
          exempt: false,
          note: "",
          perLine: false
        },
        fees: "5" as unknown as number,
        discounts: "4" as unknown as number
      })
    );

    expect(totals.items[0].amount).toBe(99);
    expect(totals.subtotal).toBe(99);
    expect(totals.taxAmount).toBe(9.5);
    expect(totals.total).toBe(109.5);
  });

  it("treats non-numeric strings as zero", () => {
    const totals = calculateInvoiceTotals(
      makeInvoice({
        items: [
          makeItem({
            quantity: "abc" as unknown as number,
            unitPrice: "xyz" as unknown as number
          })
        ]
      })
    );

    expect(totals.items[0].amount).toBe(0);
    expect(totals.subtotal).toBe(0);
    expect(totals.total).toBe(0);
  });

  it("charges tax on the discounted amount", () => {
    const totals = calculateInvoiceTotals(
      makeInvoice({
        items: [makeItem({ quantity: 1, unitPrice: 1000 })],
        tax: { percentage: 20, exempt: false, note: "", perLine: false },
        discounts: 10,
        discountType: "percentage"
      })
    );

    expect(totals.discountAmount).toBe(100);
    expect(totals.taxAmount).toBe(180);
    expect(totals.total).toBe(1080);
  });

  it("caps the discount at the subtotal, leaving fees still due", () => {
    const totals = calculateInvoiceTotals(
      makeInvoice({
        items: [makeItem({ quantity: 1, unitPrice: 100 })],
        tax: { percentage: 10, exempt: false, note: "", perLine: false },
        fees: 5,
        discounts: 1000
      })
    );

    expect(totals.subtotal).toBe(100);
    expect(totals.discountAmount).toBe(100);
    expect(totals.taxAmount).toBe(0);
    expect(totals.total).toBe(5);
  });

  it("clamps to zero exactly when the discount equals the subtotal", () => {
    const totals = calculateInvoiceTotals(
      makeInvoice({
        items: [makeItem({ quantity: 1, unitPrice: 100 })],
        discounts: 100
      })
    );

    expect(totals.total).toBe(0);
  });

  it("charges no tax when the invoice is tax exempt", () => {
    const totals = calculateInvoiceTotals(
      makeInvoice({
        items: [makeItem({ quantity: 1, unitPrice: 100 })],
        tax: {
          percentage: 20,
          exempt: true,
          note: "Reverse charge",
          perLine: false
        }
      })
    );

    expect(totals.taxAmount).toBe(0);
    expect(totals.total).toBe(100);
  });

  it("applies a percentage discount to the subtotal", () => {
    const totals = calculateInvoiceTotals(
      makeInvoice({
        items: [makeItem({ quantity: 1, unitPrice: 200 })],
        discounts: 10,
        discountType: "percentage"
      })
    );

    expect(totals.discountAmount).toBe(20);
    expect(totals.total).toBe(180);
  });

  it("reports a fixed discount amount and clamps it to the subtotal", () => {
    const totals = calculateInvoiceTotals(
      makeInvoice({
        items: [makeItem({ quantity: 1, unitPrice: 100 })],
        discounts: 250
      })
    );

    expect(totals.discountAmount).toBe(100);
    expect(totals.total).toBe(0);
  });

  it("nets the amount paid off the total to derive the balance due", () => {
    const totals = calculateInvoiceTotals(
      makeInvoice({
        items: [makeItem({ quantity: 1, unitPrice: 100 })],
        amountPaid: 30
      })
    );

    expect(totals.total).toBe(100);
    expect(totals.balanceDue).toBe(70);
  });

  it("clamps the balance due at zero when the payment exceeds the total", () => {
    const totals = calculateInvoiceTotals(
      makeInvoice({
        items: [makeItem({ quantity: 1, unitPrice: 100 })],
        amountPaid: 150
      })
    );

    expect(totals.balanceDue).toBe(0);
  });

  it("rounds a half cent up despite floating-point noise", () => {
    const totals = calculateInvoiceTotals(
      makeInvoice({ items: [makeItem({ quantity: 1, unitPrice: 1.005 })] })
    );

    expect(totals.subtotal).toBe(1.01);
    expect(totals.total).toBe(1.01);
  });
});

describe("calculateInvoiceTotals with a tax rate per line", () => {
  // An invoice at 20% whose lines may set their own rate.
  function makePerLineInvoice(overrides: Partial<Invoice> = {}): Invoice {
    return makeInvoice({
      tax: { percentage: 20, exempt: false, note: "", perLine: true },
      ...overrides
    });
  }

  it("taxes each rate's lines together and adds up the groups", () => {
    const totals = calculateInvoiceTotals(
      makePerLineInvoice({
        items: [
          makeItem({ unitPrice: 1000 }),
          makeItem({ unitPrice: 500, tax: { percentage: 0, exempt: false } })
        ]
      })
    );

    expect(totals.taxGroups).toEqual([
      { percentage: 20, exempt: false, taxableAmount: 1000, taxAmount: 200 },
      { percentage: 0, exempt: false, taxableAmount: 500, taxAmount: 0 }
    ]);
    expect(totals.taxAmount).toBe(200);
    expect(totals.total).toBe(1700);
  });

  it("splits a discount across the groups by their subtotals", () => {
    const totals = calculateInvoiceTotals(
      makePerLineInvoice({
        items: [
          makeItem({ unitPrice: 1000 }),
          makeItem({ unitPrice: 500, tax: { percentage: 0, exempt: false } })
        ],
        discounts: 150
      })
    );

    expect(totals.discountAmount).toBe(150);
    expect(totals.taxGroups.map(group => group.taxableAmount)).toEqual([
      900, 450
    ]);
    expect(totals.taxAmount).toBe(180);
    expect(totals.total).toBe(1530);
  });

  it("gives the leftover cent of a split discount to the largest group", () => {
    const totals = calculateInvoiceTotals(
      makePerLineInvoice({
        items: [
          makeItem({ unitPrice: 100, tax: { percentage: 10, exempt: false } }),
          makeItem({ unitPrice: 101 }),
          makeItem({ unitPrice: 100, tax: { percentage: 0, exempt: false } })
        ],
        discounts: 100
      })
    );

    // 33.554 + 33.223 + 33.223 round to 99.99; the 101 line takes the cent.
    expect(totals.taxGroups.map(group => group.taxableAmount)).toEqual([
      67.44, 66.78, 66.78
    ]);
    expect(totals.taxAmount).toBe(20.17);
    expect(totals.total).toBe(221.17);
  });

  it("takes back a cent the rounded shares overshoot by", () => {
    const totals = calculateInvoiceTotals(
      makePerLineInvoice({
        items: [
          makeItem({ unitPrice: 100 }),
          makeItem({ unitPrice: 100, tax: { percentage: 10, exempt: false } }),
          makeItem({ unitPrice: 100, tax: { percentage: 0, exempt: false } })
        ],
        discounts: 0.02
      })
    );
    const taxable = totals.taxGroups.reduce(
      (sum, group) => sum + group.taxableAmount,
      0
    );

    expect(Math.round(taxable * 100)).toBe(29998);
    expect(totals.discountAmount).toBe(0.02);
  });

  it("splits a percentage discount the same way", () => {
    const totals = calculateInvoiceTotals(
      makePerLineInvoice({
        items: [
          makeItem({ unitPrice: 1000 }),
          makeItem({ unitPrice: 500, tax: { percentage: 5, exempt: false } })
        ],
        discounts: 10,
        discountType: "percentage"
      })
    );

    expect(totals.discountAmount).toBe(150);
    expect(totals.taxGroups.map(group => group.taxableAmount)).toEqual([
      900, 450
    ]);
    expect(totals.taxAmount).toBe(202.5);
  });

  it("rounds each group's tax, not each line's", () => {
    const totals = calculateInvoiceTotals(
      makePerLineInvoice({
        items: [
          makeItem({ unitPrice: 0.1, tax: { percentage: 15, exempt: false } }),
          makeItem({ unitPrice: 0.1, tax: { percentage: 15, exempt: false } }),
          makeItem({ unitPrice: 100 })
        ]
      })
    );

    // Per line, 0.015 would round to 0.02 twice; the group's 0.20 owes 0.03.
    expect(totals.taxGroups).toEqual([
      { percentage: 20, exempt: false, taxableAmount: 100, taxAmount: 20 },
      { percentage: 15, exempt: false, taxableAmount: 0.2, taxAmount: 0.03 }
    ]);
    expect(totals.taxAmount).toBe(20.03);
  });

  it("keeps exempt and 0% lines in separate groups, exempt last", () => {
    const totals = calculateInvoiceTotals(
      makePerLineInvoice({
        items: [
          makeItem({ unitPrice: 300, tax: { percentage: 0, exempt: true } }),
          makeItem({ unitPrice: 200, tax: { percentage: 0, exempt: false } }),
          makeItem({ unitPrice: 100, tax: { percentage: 5, exempt: false } })
        ]
      })
    );

    expect(totals.taxGroups).toEqual([
      { percentage: 5, exempt: false, taxableAmount: 100, taxAmount: 5 },
      { percentage: 0, exempt: false, taxableAmount: 200, taxAmount: 0 },
      { percentage: 0, exempt: true, taxableAmount: 300, taxAmount: 0 }
    ]);
  });

  it("ignores the stored rate of an exempt line", () => {
    const totals = calculateInvoiceTotals(
      makePerLineInvoice({
        items: [
          makeItem({ unitPrice: 1000 }),
          makeItem({ unitPrice: 500, tax: { percentage: 20, exempt: true } })
        ]
      })
    );

    expect(totals.taxGroups).toEqual([
      { percentage: 20, exempt: false, taxableAmount: 1000, taxAmount: 200 },
      { percentage: 0, exempt: true, taxableAmount: 500, taxAmount: 0 }
    ]);
    expect(totals.taxAmount).toBe(200);
  });

  it("leaves lines with no amount out of the groups", () => {
    const totals = calculateInvoiceTotals(
      makePerLineInvoice({
        items: [
          makeItem({ unitPrice: 1000 }),
          makeItem({ unitPrice: 0, tax: { percentage: 5, exempt: false } }),
          makeItem({
            quantity: 0,
            unitPrice: 80,
            tax: { percentage: 0, exempt: true }
          })
        ]
      })
    );

    expect(totals.taxGroups).toEqual([
      { percentage: 20, exempt: false, taxableAmount: 1000, taxAmount: 200 }
    ]);
  });

  it("gives a group that nets negative no discount share and negative tax", () => {
    const totals = calculateInvoiceTotals(
      makePerLineInvoice({
        items: [
          makeItem({ unitPrice: 1000 }),
          makeItem({ unitPrice: -100, tax: { percentage: 5, exempt: false } })
        ],
        discounts: 90
      })
    );

    expect(totals.subtotal).toBe(900);
    expect(totals.discountAmount).toBe(90);
    expect(totals.taxGroups).toEqual([
      { percentage: 20, exempt: false, taxableAmount: 910, taxAmount: 182 },
      { percentage: 5, exempt: false, taxableAmount: -100, taxAmount: -5 }
    ]);
    expect(totals.taxAmount).toBe(177);
    expect(totals.total).toBe(987);
  });

  it("keeps the negative tax of an invoice that is all credit", () => {
    const totals = calculateInvoiceTotals(
      makeInvoice({
        items: [makeItem({ unitPrice: -100 })],
        tax: { percentage: 20, exempt: false, note: "", perLine: false }
      })
    );

    expect(totals.discountAmount).toBe(0);
    expect(totals.taxAmount).toBe(-20);
    expect(totals.total).toBe(0);
  });

  it("puts every line on the invoice's rate while Per line is off", () => {
    const items = [
      makeItem({ unitPrice: 1000 }),
      makeItem({ unitPrice: 500, tax: { percentage: 0, exempt: true } })
    ];
    const off = calculateInvoiceTotals(
      makeInvoice({
        items,
        tax: { percentage: 20, exempt: false, note: "", perLine: false }
      })
    );
    const on = calculateInvoiceTotals(makePerLineInvoice({ items }));

    expect(off.taxGroups).toEqual([
      { percentage: 20, exempt: false, taxableAmount: 1500, taxAmount: 300 }
    ]);
    expect(off.taxAmount).toBe(300);
    expect(on.taxGroups).toHaveLength(2);
    expect(on.taxAmount).toBe(200);
  });

  it("moves the lines without a rate of their own with the invoice's", () => {
    const totals = calculateInvoiceTotals(
      makeInvoice({
        items: [
          makeItem({ unitPrice: 1000 }),
          makeItem({ unitPrice: 500, tax: { percentage: 5, exempt: false } })
        ],
        tax: { percentage: 10, exempt: false, note: "", perLine: true }
      })
    );

    expect(totals.taxAmount).toBe(125);
  });

  it("charges a line's own rate on an invoice that is exempt by default", () => {
    const items = [
      makeItem({ unitPrice: 1000 }),
      makeItem({ unitPrice: 500, tax: { percentage: 20, exempt: false } })
    ];
    const perLine = calculateInvoiceTotals(
      makeInvoice({
        items,
        tax: { percentage: 0, exempt: true, note: "", perLine: true }
      })
    );
    const single = calculateInvoiceTotals(
      makeInvoice({
        items,
        tax: { percentage: 0, exempt: true, note: "", perLine: false }
      })
    );

    expect(perLine.taxAmount).toBe(100);
    expect(single.taxAmount).toBe(0);
  });

  it("charges no tax on any line while the tax section is off", () => {
    const totals = calculateInvoiceTotals(
      makePerLineInvoice({
        items: [
          makeItem({ unitPrice: 1000 }),
          makeItem({ unitPrice: 500, tax: { percentage: 5, exempt: false } })
        ],
        sections: { ...DEFAULT_INVOICE_SECTIONS, tax: false }
      })
    );

    expect(totals.taxAmount).toBe(0);
    expect(totals.taxGroups.every(group => group.taxAmount === 0)).toBe(true);
    expect(totals.total).toBe(1500);
  });

  it("never taxes fees", () => {
    const totals = calculateInvoiceTotals(
      makePerLineInvoice({
        items: [
          makeItem({ unitPrice: 1000 }),
          makeItem({ unitPrice: 500, tax: { percentage: 5, exempt: false } })
        ],
        fees: 40
      })
    );

    expect(totals.taxAmount).toBe(225);
    expect(totals.total).toBe(1765);
  });

  it("gives the same totals as a single rate when every line shares one", () => {
    const cases: Partial<Invoice>[] = [
      { discounts: 33.33 },
      { discounts: 12.5, discountType: "percentage" },
      { discounts: 5000, fees: 10 },
      { amountPaid: 100 }
    ];

    for (const overrides of cases) {
      const items = [
        makeItem({ quantity: 3, unitPrice: 19.99 }),
        makeItem({ quantity: 1.5, unitPrice: 333.33 }),
        makeItem({ unitPrice: 0.01 })
      ];
      const single = calculateInvoiceTotals(
        makeInvoice({
          items,
          tax: { percentage: 17.5, exempt: false, note: "", perLine: false },
          ...overrides
        })
      );
      const perLine = calculateInvoiceTotals(
        makeInvoice({
          items: items.map(item => ({
            ...item,
            tax: { percentage: 17.5, exempt: false }
          })),
          tax: { percentage: 0, exempt: true, note: "", perLine: true },
          ...overrides
        })
      );

      expect(perLine).toEqual({
        ...single,
        items: perLine.items
      });
    }
  });
});
