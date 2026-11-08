import { describe, expect, it } from "vitest";
import { DOCUMENT_TYPE_DEFAULTS } from "~/consts/document-types";
import { DOCUMENT_TYPES } from "~/schema/invoice";
import { createBlankInvoice } from "~/stores/invoice-store";
import type { DocumentType, Invoice } from "~/types";
import { applyDocumentType, readDocumentType } from "~/utils/document-type";

// A blank document of the type given, with that type's title and labels.
function blankOf(documentType: DocumentType): Invoice {
  return applyDocumentType(createBlankInvoice(), documentType);
}

const TYPE_PAIRS = DOCUMENT_TYPES.flatMap(from =>
  DOCUMENT_TYPES.map(to => ({ from, to }))
);

describe("applyDocumentType", () => {
  it("gives each type its own title and labels", () => {
    expect(blankOf("quote").title).toBe("Quote");
    expect(blankOf("quote").labels.paymentDue).toBe("Valid until");
    expect(blankOf("proforma-invoice").title).toBe("Proforma invoice");
    expect(blankOf("receipt").title).toBe("Receipt");
    expect(blankOf("receipt").labels.paymentDue).toBe("Date paid");
    expect(blankOf("credit-note").title).toBe("Credit note");
    expect(blankOf("credit-note").labels.total).toBe("Total credit");
  });

  it("starts an invoice on the invoice labels it always had", () => {
    const invoice = createBlankInvoice();

    expect(applyDocumentType(invoice, "invoice")).toEqual(invoice);
  });

  it.each(TYPE_PAIRS)(
    "moves the defaults from $from to $to",
    ({ from, to }) => {
      const next = applyDocumentType(blankOf(from), to);
      const expected = DOCUMENT_TYPE_DEFAULTS[to];

      expect(next.documentType).toBe(to);
      expect(next.title).toBe(expected.title);
      expect(next.labels).toEqual({
        ...createBlankInvoice().labels,
        ...expected.labels
      });
    }
  );

  it.each(TYPE_PAIRS)(
    "keeps renamed labels from $from to $to",
    ({ from, to }) => {
      const renamed = {
        ...blankOf(from),
        title: "Statement of work",
        labels: {
          ...blankOf(from).labels,
          invoiceNumber: "Ref.",
          paymentDue: "Pay by",
          total: "Amount owed"
        }
      };
      const next = applyDocumentType(renamed, to);

      expect(next.title).toBe("Statement of work");
      expect(next.labels.invoiceNumber).toBe("Ref.");
      expect(next.labels.paymentDue).toBe("Pay by");
      expect(next.labels.total).toBe("Amount owed");
    }
  );

  it("swaps a default and keeps a renamed one in the same change", () => {
    const quote = {
      ...blankOf("quote"),
      labels: { ...blankOf("quote").labels, paymentDue: "Offer ends" }
    };
    const receipt = applyDocumentType(quote, "receipt");

    expect(receipt.title).toBe("Receipt");
    expect(receipt.labels.invoiceNumber).toBe("Receipt No.");
    expect(receipt.labels.paymentDue).toBe("Offer ends");
  });

  it("compares with the old type's defaults, not the invoice's", () => {
    // "Due date" is the invoice's default but was typed on this receipt.
    const receipt = {
      ...blankOf("receipt"),
      labels: { ...blankOf("receipt").labels, paymentDue: "Due date" }
    };

    expect(applyDocumentType(receipt, "quote").labels.paymentDue).toBe(
      "Due date"
    );
  });

  it("keeps a title typed to match another type's default", () => {
    const invoice = { ...createBlankInvoice(), title: "Quote" };

    expect(applyDocumentType(invoice, "receipt").title).toBe("Quote");
  });

  it("keeps an emptied label empty", () => {
    const quote = { ...blankOf("quote"), title: "" };

    expect(applyDocumentType(quote, "invoice").title).toBe("");
  });

  it("leaves every other label alone", () => {
    const invoice = {
      ...createBlankInvoice(),
      labels: { ...createBlankInvoice().labels, subtotal: "Net" }
    };

    expect(applyDocumentType(invoice, "credit-note").labels.subtotal).toBe(
      "Net"
    );
  });

  it("comes back to the same document after a round trip", () => {
    const invoice = createBlankInvoice();

    for (const documentType of DOCUMENT_TYPES) {
      expect(
        applyDocumentType(applyDocumentType(invoice, documentType), "invoice")
      ).toEqual(invoice);
    }
  });
});

describe("readDocumentType", () => {
  it("reads a known type and calls anything else an invoice", () => {
    expect(readDocumentType("credit-note")).toBe("credit-note");
    expect(readDocumentType("Credit note")).toBe("invoice");
    expect(readDocumentType(undefined)).toBe("invoice");
    expect(readDocumentType(3)).toBe("invoice");
  });
});
