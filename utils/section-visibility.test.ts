import { describe, expect, it } from "vitest";
import { DEFAULT_INVOICE_SECTIONS } from "~/schema/invoice";
import { createBlankInvoice } from "~/stores/invoice-store";
import type { Invoice } from "~/types";
import { buildInvoiceViewModel } from "~/utils/build-invoice-view-model";
import { calculateInvoiceTotals } from "~/utils/calculate-invoice-totals";
import { getPrintedSections } from "~/utils/section-visibility";

function makeInvoice(overrides: Partial<Invoice> = {}): Invoice {
  return {
    ...createBlankInvoice(),
    items: [
      { id: "a", description: "Design", quantity: 2, unit: "", unitPrice: 50 }
    ],
    ...overrides
  };
}

describe("printed sections", () => {
  it("prints a switched-on section only when it has something in it", () => {
    const printed = getPrintedSections(
      makeInvoice({
        sections: { ...DEFAULT_INVOICE_SECTIONS, notes: true, terms: true },
        notes: { label: "Notes", content: "Thanks" },
        terms: { label: "Terms", content: "  " }
      })
    );

    expect(printed.notes).toBe(true);
    expect(printed.terms).toBe(false);
  });

  it("prints switched-on tax even at 0%", () => {
    const printed = getPrintedSections(
      makeInvoice({
        tax: { percentage: 0, exempt: false, note: "", perLine: false }
      })
    );

    expect(printed.tax).toBe(true);
  });

  it("never prints a switched-off section, even with content", () => {
    const printed = getPrintedSections(
      makeInvoice({
        sections: { ...DEFAULT_INVOICE_SECTIONS, logo: false, fees: false },
        image: "logo-id",
        fees: 10
      })
    );

    expect(printed.logo).toBe(false);
    expect(printed.fees).toBe(false);
  });

  it("prints a signature while switched on, and keeps it while off", () => {
    const signature = { image: "signature-id", caption: "Jane Doe" };
    const on = makeInvoice({
      sections: { ...DEFAULT_INVOICE_SECTIONS, signature: true },
      signature
    });
    const off = makeInvoice({ signature });
    const empty = makeInvoice({
      sections: { ...DEFAULT_INVOICE_SECTIONS, signature: true }
    });

    expect(DEFAULT_INVOICE_SECTIONS.signature).toBe(false);
    expect(getPrintedSections(on).signature).toBe(true);
    expect(getPrintedSections(off).signature).toBe(false);
    expect(off.signature).toEqual(signature);
    expect(getPrintedSections(empty).signature).toBe(false);
  });

  it("prints the payment QR code once switched on with a SEPA transfer", () => {
    const blank = makeInvoice();
    const invoice = makeInvoice({
      currency: "€",
      currencyCode: "EUR",
      sections: { ...DEFAULT_INVOICE_SECTIONS, paymentQrCode: true },
      paymentDetails: {
        ...blank.paymentDetails,
        accountName: "Acme Studio",
        iban: "DE89 3704 0044 0532 0130 00"
      }
    });

    expect(DEFAULT_INVOICE_SECTIONS.paymentQrCode).toBe(false);
    expect(getPrintedSections(invoice).paymentQrCode).toBe(true);
    expect(
      getPrintedSections({
        ...invoice,
        sections: { ...invoice.sections, paymentQrCode: false }
      }).paymentQrCode
    ).toBe(false);
    expect(
      getPrintedSections({ ...invoice, currency: "$", currencyCode: "USD" })
        .paymentQrCode
    ).toBe(false);
    expect(
      getPrintedSections({ ...invoice, documentType: "receipt" }).paymentQrCode
    ).toBe(false);
  });

  it("never prints switched-off tax", () => {
    const printed = getPrintedSections(
      makeInvoice({
        sections: { ...DEFAULT_INVOICE_SECTIONS, tax: false },
        tax: { percentage: 20, exempt: false, note: "", perLine: false }
      })
    );

    expect(printed.tax).toBe(false);
  });
});

describe("switched-off pricing", () => {
  it("leaves switched-off rows out of the totals", () => {
    const invoice = makeInvoice({
      sections: {
        ...DEFAULT_INVOICE_SECTIONS,
        discounts: false,
        tax: false,
        fees: false,
        amountPaid: false
      },
      discounts: 10,
      tax: { percentage: 20, exempt: false, note: "", perLine: false },
      fees: 5,
      amountPaid: 30
    });
    const totals = calculateInvoiceTotals(invoice);

    expect(totals.discountAmount).toBe(0);
    expect(totals.taxAmount).toBe(0);
    expect(totals.total).toBe(100);
    expect(totals.balanceDue).toBe(100);
  });

  it("hides switched-off rows from the PDF summary and details", () => {
    const viewModel = buildInvoiceViewModel(
      makeInvoice({
        sections: {
          ...DEFAULT_INVOICE_SECTIONS,
          poNumber: false,
          fees: false,
          amountPaid: false
        },
        poNumber: "PO-7",
        fees: 5,
        amountPaid: 30
      })
    );
    const visible = viewModel.summaryRows
      .filter(row => row.isVisible)
      .map(row => row.id);

    expect(viewModel.detailRows.map(row => row.id)).not.toContain("poNumber");
    expect(visible).not.toContain("fees");
    expect(visible).not.toContain("amountPaid");
    expect(visible).not.toContain("balanceDue");
  });
});

describe("printed payment details", () => {
  function withPayment(
    paymentDetails: Partial<Invoice["paymentDetails"]>
  ): Invoice {
    const invoice = makeInvoice();

    return {
      ...invoice,
      sections: { ...invoice.sections, paymentDetails: true },
      paymentDetails: { ...invoice.paymentDetails, ...paymentDetails }
    };
  }

  it("prints a section holding only another way to pay", () => {
    const printed = getPrintedSections(
      withPayment({
        methods: [{ id: "m1", name: "Venmo", detail: "@jane-designs" }]
      })
    );

    expect(printed.paymentDetails).toBe(true);
  });

  it("leaves out a section whose only way to pay has no detail", () => {
    const printed = getPrintedSections(
      withPayment({ methods: [{ id: "m1", name: "Venmo", detail: "" }] })
    );

    expect(printed.paymentDetails).toBe(false);
  });
});
