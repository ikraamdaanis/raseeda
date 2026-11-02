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
    tax: { percentage: 0, exempt: false, note: "" },
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
        tax: { percentage: 20, exempt: false, note: "" }
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
        tax: { percentage: 7.5, exempt: false, note: "" }
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
        tax: { percentage: 10, exempt: false, note: "" },
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
        tax: { percentage: "10" as unknown as number, exempt: false, note: "" },
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
        tax: { percentage: 20, exempt: false, note: "" },
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
        tax: { percentage: 10, exempt: false, note: "" },
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
        tax: { percentage: 20, exempt: true, note: "Reverse charge" }
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
