import { describe, expect, it } from "vitest";
import { migrateInvoiceData } from "~/schema/migrations";
import { createBlankInvoice } from "~/stores/invoice-store";
import { applyDocumentType } from "~/utils/document-type";

// An invoice as stored before document types: no type at all.
function storedBeforeTypes() {
  const { documentType: _documentType, ...invoice } = createBlankInvoice();

  return invoice;
}

describe("document type migration (v3 -> v4)", () => {
  it("reads an invoice stored before types as an invoice, unchanged", () => {
    const stored = storedBeforeTypes();
    const invoice = migrateInvoiceData(stored, 3);

    expect(invoice.documentType).toBe("invoice");
    expect(invoice).toEqual({ ...stored, documentType: "invoice" });
  });

  it("keeps an old invoice's labels, even ones that match a quote's", () => {
    const stored = {
      ...storedBeforeTypes(),
      title: "Quote",
      labels: { ...storedBeforeTypes().labels, paymentDue: "Valid until" }
    };
    const invoice = migrateInvoiceData(stored, 3);

    expect(invoice.documentType).toBe("invoice");
    expect(invoice.title).toBe("Quote");
    expect(invoice.labels.paymentDue).toBe("Valid until");
  });

  it("keeps the type of a current document", () => {
    const quote = applyDocumentType(createBlankInvoice(), "quote");

    expect(migrateInvoiceData(quote, 4)).toEqual(quote);
  });

  it("reads an unknown type as an invoice", () => {
    const invoice = migrateInvoiceData(
      { ...createBlankInvoice(), documentType: "estimate" },
      4
    );

    expect(invoice.documentType).toBe("invoice");
  });

  it("reads data with no version at all as an invoice", () => {
    expect(migrateInvoiceData({}, 0).documentType).toBe("invoice");
  });
});
