import { describe, expect, it } from "vitest";
import { invoiceSchema, STORED_INVOICE_FORMATS } from "~/schema/invoice";
import { createBlankDocument } from "~/stores/invoice-store";
import type { DocumentType, Invoice } from "~/types";
import { buildInvoiceViewModel } from "~/utils/build-invoice-view-model";
import { calculateInvoiceTotals } from "~/utils/calculate-invoice-totals";
import { applyDocumentType, getTypeSections } from "~/utils/document-type";
import { isPaidInFull } from "~/utils/is-paid-in-full";
import { getPrintedSections } from "~/utils/section-visibility";

// A document of the type for $100, with `amountPaid` typed and the amount
// paid row and the paid stamp switched on.
function documentOf(
  documentType: DocumentType,
  overrides: Partial<Invoice> = {}
): Invoice {
  const blank = createBlankDocument(documentType, STORED_INVOICE_FORMATS);

  return {
    ...blank,
    items: [{ ...blank.items[0], quantity: 1, unitPrice: 100 }],
    sections: { ...blank.sections, amountPaid: true, paidStamp: true },
    ...overrides
  };
}

function visibleSummaryIds(invoice: Invoice) {
  return buildInvoiceViewModel(invoice)
    .summaryRows.filter(row => row.isVisible)
    .map(row => row.id);
}

describe("getTypeSections", () => {
  it("settles a quote's payment rows and leaves the rest as chosen", () => {
    const sections = documentOf("quote").sections;

    expect(getTypeSections(sections, "quote")).toEqual({
      ...sections,
      amountPaid: false,
      paidStamp: false
    });
  });

  it("turns a receipt's amount paid on even when it's switched off", () => {
    const sections = { ...documentOf("receipt").sections, amountPaid: false };

    expect(getTypeSections(sections, "receipt").amountPaid).toBe(true);
  });

  it("never changes the switches it's given", () => {
    const sections = documentOf("quote").sections;

    getTypeSections(sections, "quote");

    expect(sections.amountPaid).toBe(true);
  });

  it("adds no switch a partial set doesn't have", () => {
    expect(getTypeSections({ tax: true }, "quote")).toEqual({ tax: true });
  });
});

describe("totals by document type", () => {
  it("counts no payment on a quote", () => {
    const totals = calculateInvoiceTotals(
      documentOf("quote", { amountPaid: 40 })
    );

    expect(totals.amountPaid).toBe(0);
    expect(totals.balanceDue).toBe(100);
  });

  it("keeps a deposit on a proforma invoice", () => {
    const totals = calculateInvoiceTotals(
      documentOf("proforma-invoice", { amountPaid: 40 })
    );

    expect(totals.amountPaid).toBe(40);
    expect(totals.balanceDue).toBe(60);
  });

  it("pays a receipt's total until an amount is typed", () => {
    const receipt = documentOf("receipt", {
      sections: { ...documentOf("receipt").sections, amountPaid: false }
    });
    const totals = calculateInvoiceTotals(receipt);

    expect(totals.amountPaid).toBe(100);
    expect(totals.balanceDue).toBe(0);
  });

  it("uses the amount typed on a receipt", () => {
    const totals = calculateInvoiceTotals(
      documentOf("receipt", { amountPaid: 40 })
    );

    expect(totals.amountPaid).toBe(40);
    expect(totals.balanceDue).toBe(60);
  });

  it("follows the receipt's total as lines change", () => {
    const receipt = documentOf("receipt");
    const totals = calculateInvoiceTotals({
      ...receipt,
      items: [{ ...receipt.items[0], quantity: 3, unitPrice: 50 }]
    });

    expect(totals.amountPaid).toBe(150);
    expect(totals.balanceDue).toBe(0);
  });

  it("counts a credit note's payment as an invoice's", () => {
    const totals = calculateInvoiceTotals(
      documentOf("credit-note", { amountPaid: 40 })
    );

    expect(totals.amountPaid).toBe(40);
    expect(totals.balanceDue).toBe(60);
  });
});

describe("printed sections by document type", () => {
  it("prints no payment or stamp on a quote paid in full", () => {
    const printed = getPrintedSections(
      documentOf("quote", { amountPaid: 100 })
    );

    expect(printed.amountPaid).toBe(false);
    expect(printed.paidStamp).toBe(false);
    expect(isPaidInFull(documentOf("quote", { amountPaid: 100 }))).toBe(false);
  });

  it("prints a proforma invoice's deposit but never its stamp", () => {
    const printed = getPrintedSections(
      documentOf("proforma-invoice", { amountPaid: 100 })
    );

    expect(printed.amountPaid).toBe(true);
    expect(printed.paidStamp).toBe(false);
  });

  it("prints a receipt with nothing typed as paid in full", () => {
    const receipt = documentOf("receipt");

    expect(getPrintedSections(receipt).amountPaid).toBe(true);
    expect(getPrintedSections(receipt).paidStamp).toBe(true);
    expect(isPaidInFull(receipt)).toBe(true);
  });

  it("prints no payment on an empty receipt", () => {
    const printed = getPrintedSections(documentOf("receipt", { items: [] }));

    expect(printed.amountPaid).toBe(false);
    expect(printed.paidStamp).toBe(false);
  });

  it("prints a credit note's payment and stamp as an invoice's", () => {
    const printed = getPrintedSections(
      documentOf("credit-note", { amountPaid: 100 })
    );

    expect(printed.amountPaid).toBe(true);
    expect(printed.paidStamp).toBe(true);
  });

  it("prints an invoice's stamp as before", () => {
    const printed = getPrintedSections(
      documentOf("invoice", { amountPaid: 100 })
    );

    expect(printed.amountPaid).toBe(true);
    expect(printed.paidStamp).toBe(true);
  });
});

describe("closing rows by document type", () => {
  it("ends a quote on its total", () => {
    const ids = visibleSummaryIds(documentOf("quote", { amountPaid: 40 }));

    expect(ids.at(-1)).toBe("total");
    expect(ids).not.toContain("amountPaid");
    expect(ids).not.toContain("balanceDue");
  });

  it("shows a receipt's total as paid, with nothing due", () => {
    const rows = buildInvoiceViewModel(documentOf("receipt")).summaryRows;
    const amountPaid = rows.find(row => row.id === "amountPaid");
    const balanceDue = rows.find(row => row.id === "balanceDue");

    expect(amountPaid?.isVisible).toBe(true);
    expect(amountPaid?.value).toBe("-$100.00");
    expect(balanceDue?.isVisible).toBe(true);
    expect(balanceDue?.value).toBe("$0.00 USD");
  });

  // Three lines of £1.03 are $3.99 at 1.2875, though £3.09 on its own is
  // $3.98.
  it("pays a receipt's second currency in full too", () => {
    const receipt = documentOf("receipt", {
      currency: "£",
      currencyCode: "GBP",
      items: ["a", "b", "c"].map(id => ({
        id,
        description: "",
        unit: "",
        quantity: 1,
        unitPrice: 1.03
      })),
      sections: {
        ...documentOf("receipt").sections,
        currencyConversion: true
      },
      currencyConversion: {
        ...documentOf("receipt").currencyConversion,
        currency: "$",
        currencyCode: "USD",
        rate: 1.2875
      }
    });
    const rows = buildInvoiceViewModel(receipt).summaryRows;

    expect(rows.find(row => row.id === "total")?.value).toBe("£3.09 / $3.99");
    expect(rows.find(row => row.id === "amountPaid")?.value).toBe(
      "-£3.09 / -$3.99"
    );
    expect(rows.find(row => row.id === "balanceDue")?.value).toBe(
      "£0.00 / $0.00"
    );
  });

  it("brings a quote's payment back when it's an invoice again", () => {
    const quote = applyDocumentType(
      documentOf("invoice", { amountPaid: 40 }),
      "quote"
    );

    expect(visibleSummaryIds(quote)).not.toContain("amountPaid");
    expect(visibleSummaryIds(applyDocumentType(quote, "invoice"))).toEqual(
      expect.arrayContaining(["amountPaid", "balanceDue"])
    );
    expect(calculateInvoiceTotals(applyDocumentType(quote, "invoice"))).toEqual(
      expect.objectContaining({ amountPaid: 40, balanceDue: 60 })
    );
  });
});

describe("refers to invoice", () => {
  it("reads as empty, under its default label, on a stored invoice", () => {
    const { refersTo: _refersTo, ...stored } = documentOf("credit-note");
    const { refersTo: _label, ...labels } = stored.labels;
    const parsed = invoiceSchema.parse({ ...stored, labels });

    expect(parsed.refersTo).toBe("");
    expect(parsed.labels.refersTo).toBe("Refers to invoice");
  });
});

describe("detail rows by document type", () => {
  function detailIds(invoice: Invoice) {
    return buildInvoiceViewModel(invoice).detailRows.map(row => row.id);
  }

  it("puts a credit note's invoice under its number, with no due date", () => {
    const creditNote = documentOf("credit-note", { refersTo: "INV-0042" });
    const rows = buildInvoiceViewModel(creditNote).detailRows;

    expect(rows.map(row => row.id)).toEqual([
      "number",
      "refersTo",
      "poNumber",
      "invoiceDate",
      "servicePeriod"
    ]);
    expect(rows[1]).toEqual(
      expect.objectContaining({
        label: "Refers to invoice",
        value: "INV-0042",
        isOptional: true
      })
    );
  });

  it.each(["invoice", "quote", "proforma-invoice", "receipt"] as const)(
    "gives a %s a due date row and no invoice it refers to",
    documentType => {
      const ids = detailIds(documentOf(documentType, { refersTo: "INV-0042" }));

      expect(ids).toContain("dueDate");
      expect(ids).not.toContain("refersTo");
    }
  );
});
