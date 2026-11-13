import { describe, expect, it } from "vitest";
import { DOCUMENT_TYPE_DEFAULTS } from "~/consts/document-types";
import { DOCUMENT_TYPES } from "~/schema/invoice";
import {
  createBlankDocument,
  createBlankInvoice
} from "~/stores/invoice-store";
import type { DocumentType, Invoice } from "~/types";
import { applyDocumentType, readDocumentType } from "~/utils/document-type";
import { applyLabelPreset } from "~/utils/label-preset";

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
      expect(next.number).toBe(expected.number);
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
        number: "2026-017",
        labels: {
          ...blankOf(from).labels,
          invoiceNumber: "Ref.",
          paymentDue: "Pay by",
          total: "Amount owed"
        }
      };
      const next = applyDocumentType(renamed, to);

      expect(next.title).toBe("Statement of work");
      expect(next.number).toBe("2026-017");
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

  it("gives each type its own sample number", () => {
    expect(createBlankInvoice().number).toBe("INV-0001");
    expect(blankOf("quote").number).toBe("QUO-0001");
    expect(blankOf("proforma-invoice").number).toBe("PRO-0001");
    expect(blankOf("receipt").number).toBe("REC-0001");
    expect(blankOf("credit-note").number).toBe("CN-0001");
  });

  it("keeps a number typed to match another type's sample", () => {
    const quote = { ...blankOf("quote"), number: "INV-0001" };

    expect(applyDocumentType(quote, "receipt").number).toBe("INV-0001");
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

  it("swaps defaults in the language the labels are in", () => {
    const german = applyLabelPreset(createBlankInvoice(), "de");
    const quote = applyDocumentType(german, "quote");

    expect(quote.title).toBe("Angebot");
    expect(quote.labels).toMatchObject({
      invoiceNumber: "Angebotsnummer",
      invoiceDate: "Angebotsdatum",
      paymentDue: "Gültig bis",
      total: "Gesamtbetrag",
      subtotal: "Zwischensumme"
    });
    expect(applyDocumentType(quote, "invoice")).toEqual(german);
  });

  it("reads a label two languages share as the invoice's language", () => {
    // "Total" is the invoice's total in English and in French.
    const french = applyLabelPreset(createBlankInvoice(), "fr");

    expect(applyDocumentType(french, "credit-note").labels.total).toBe(
      "Total de l'avoir"
    );
    expect(
      applyDocumentType(createBlankInvoice(), "credit-note").labels.total
    ).toBe("Total credit");
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

describe("createBlankDocument", () => {
  it("starts a receipt's date paid on its issue date", () => {
    const receipt = createBlankDocument("receipt");

    expect(receipt.labels.paymentDue).toBe("Date paid");
    expect(receipt.dueDate).toBe(receipt.invoiceDate);
  });

  it("gives the other types 30 days, as an invoice has", () => {
    const quote = createBlankDocument("quote");

    expect(quote.dueDate).toBe(createBlankInvoice().dueDate);
    expect(quote.title).toBe("Quote");
  });
});
