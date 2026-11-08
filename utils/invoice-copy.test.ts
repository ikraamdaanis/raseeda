import { describe, expect, it } from "vitest";
import {
  createBlankDocument,
  createBlankInvoice
} from "~/stores/invoice-store";
import type { DocumentType, Invoice } from "~/types";
import { calculateInvoiceTotals } from "~/utils/calculate-invoice-totals";
import {
  describeCopy,
  describeCopyReview,
  findDateMention,
  nextInvoiceNumber,
  prepareInvoiceCopy
} from "~/utils/invoice-copy";

function invoiceWith(overrides: Partial<Invoice>): Invoice {
  return { ...createBlankInvoice(), ...overrides };
}

function quoteWith(overrides: Partial<Invoice>): Invoice {
  return { ...createBlankDocument("quote"), ...overrides };
}

// A library entry: a document's number and type, made `daysAgo` before
// 2 November 2026.
function stored(number: string, documentType: DocumentType, daysAgo = 0) {
  return {
    number,
    documentType,
    createdAt: new Date(2026, 10, 2 - daysAgo)
  };
}

describe("nextInvoiceNumber", () => {
  it("follows the highest number in the series, keeping its padding", () => {
    expect(nextInvoiceNumber("FRL-0012", ["FRL-0014", "FRL-0009"])).toBe(
      "FRL-0015"
    );
  });

  it("ignores other series", () => {
    expect(nextInvoiceNumber("FRL-0014", ["INV-0100", "FRL-0014/A"])).toBe(
      "FRL-0015"
    );
  });

  it("matches the series regardless of case", () => {
    expect(nextInvoiceNumber("frl-0003", ["FRL-0007"])).toBe("frl-0008");
  });

  it("grows past its padding", () => {
    expect(nextInvoiceNumber("A-99", [])).toBe("A-100");
  });

  it("keeps a suffix", () => {
    expect(nextInvoiceNumber("2026-014/UK", ["2026-015/UK"])).toBe(
      "2026-016/UK"
    );
  });

  it("leaves a number with no digits alone", () => {
    expect(nextInvoiceNumber("Draft", ["Draft"])).toBe("Draft");
  });
});

describe("prepareInvoiceCopy", () => {
  it("numbers, dates and clears the payment of the copy", () => {
    const copy = prepareInvoiceCopy({
      invoice: invoiceWith({
        number: "FRL-0014",
        invoiceDate: "2026-10-01",
        dueDate: "2026-10-31",
        amountPaid: 500
      }),
      documentType: "invoice",
      library: [stored("FRL-0014", "invoice")],
      today: new Date(2026, 10, 2)
    });

    expect(copy.number).toBe("FRL-0015");
    expect(copy.invoiceDate).toBe("2026-11-02");
    expect(copy.dueDate).toBe("2026-12-02");
    expect(copy.amountPaid).toBe(0);
  });

  it("keeps a due date it can't read", () => {
    const copy = prepareInvoiceCopy({
      invoice: invoiceWith({ invoiceDate: "2026-10-01", dueDate: "" }),
      documentType: "invoice",
      library: [],
      today: new Date(2026, 10, 2)
    });

    expect(copy.dueDate).toBe("");
  });

  it("makes a quote into an invoice with the same content and invoice labels", () => {
    const quote = quoteWith({
      number: "QUO-0007",
      client: { ...createBlankDocument("quote").client, content: "Acme Ltd" },
      items: [
        {
          id: "line",
          description: "Website",
          quantity: 2,
          unit: "",
          unitPrice: 450
        }
      ]
    });
    const copy = prepareInvoiceCopy({
      invoice: quote,
      documentType: "invoice",
      library: [stored("QUO-0007", "quote")],
      today: new Date(2026, 10, 2)
    });

    expect(copy).toMatchObject({
      documentType: "invoice",
      title: "Invoice",
      client: quote.client,
      items: quote.items
    });
    expect(calculateInvoiceTotals(copy).total).toBe(900);
    expect(calculateInvoiceTotals(copy)).toEqual(calculateInvoiceTotals(quote));
    expect(copy.labels).toMatchObject({
      invoiceNumber: "Invoice No.",
      paymentDue: "Due date",
      total: "Total"
    });
  });

  it("keeps a renamed title and label on a copy of another type", () => {
    const quote = quoteWith({
      title: "Estimate",
      labels: { ...createBlankDocument("quote").labels, paymentDue: "Expires" }
    });
    const copy = prepareInvoiceCopy({
      invoice: quote,
      documentType: "invoice",
      library: [],
      today: new Date(2026, 10, 2)
    });

    expect(copy.title).toBe("Estimate");
    expect(copy.labels.paymentDue).toBe("Expires");
    expect(copy.labels.invoiceNumber).toBe("Invoice No.");
  });

  it("numbers a copy of another type after the newest document of that type", () => {
    const copy = prepareInvoiceCopy({
      invoice: quoteWith({ number: "QUO-0007" }),
      documentType: "invoice",
      library: [
        stored("QUO-0007", "quote"),
        stored("OLD-0099", "invoice", 300),
        stored("FRL-0013", "invoice", 20),
        stored("FRL-0014", "invoice", 5)
      ],
      today: new Date(2026, 10, 2)
    });

    expect(copy.number).toBe("FRL-0015");
  });

  it("skips numbers another type already took in a shared series", () => {
    const copy = prepareInvoiceCopy({
      invoice: quoteWith({ number: "2026-015" }),
      documentType: "invoice",
      library: [stored("2026-014", "invoice", 3), stored("2026-015", "quote")],
      today: new Date(2026, 10, 2)
    });

    expect(copy.number).toBe("2026-016");
  });

  it("starts the type's sample series when there's none of that type yet", () => {
    const copy = prepareInvoiceCopy({
      invoice: quoteWith({ number: "QUO-0007" }),
      documentType: "invoice",
      library: [stored("QUO-0007", "quote")],
      today: new Date(2026, 10, 2)
    });

    expect(copy.number).toBe("INV-0001");
  });

  it("moves the sample number on when it's already taken", () => {
    const copy = prepareInvoiceCopy({
      invoice: quoteWith({ number: "QUO-0007" }),
      documentType: "invoice",
      library: [stored("QUO-0007", "quote"), stored("inv-0001", "receipt")],
      today: new Date(2026, 10, 2)
    });

    expect(copy.number).toBe("INV-0002");
  });

  it("keeps the due date's span between types whose due date means the same", () => {
    const copy = prepareInvoiceCopy({
      invoice: {
        ...createBlankDocument("proforma-invoice"),
        invoiceDate: "2026-10-01",
        dueDate: "2026-10-15"
      },
      documentType: "invoice",
      library: [],
      today: new Date(2026, 10, 2)
    });

    expect(copy.dueDate).toBe("2026-11-16");
  });

  it("starts the due date as the new type's when it means something else", () => {
    const quote = quoteWith({
      invoiceDate: "2026-10-01",
      dueDate: "2026-10-15"
    });
    const today = new Date(2026, 10, 2);

    expect(
      prepareInvoiceCopy({
        invoice: quote,
        documentType: "receipt",
        library: [],
        today
      }).dueDate
    ).toBe("2026-11-02");
    expect(
      prepareInvoiceCopy({
        invoice: quote,
        documentType: "invoice",
        library: [],
        today
      }).dueDate
    ).toBe("2026-12-02");
  });

  it("names the invoice a credit note made from it refers to by number and date", () => {
    const copy = prepareInvoiceCopy({
      invoice: invoiceWith({
        number: " INV-0042 ",
        invoiceDate: "2026-10-03",
        dateFormat: "d MMM yyyy"
      }),
      documentType: "credit-note",
      library: [],
      today: new Date(2026, 10, 2)
    });

    expect(copy.refersTo).toBe("INV-0042, 3 Oct 2026");
    expect(copy.labels.total).toBe("Total credit");
  });

  it("names the invoice by number alone when it has no date, and not at all without a number", () => {
    const today = new Date(2026, 10, 2);

    expect(
      prepareInvoiceCopy({
        invoice: invoiceWith({ number: "INV-0042", invoiceDate: "" }),
        documentType: "credit-note",
        library: [],
        today
      }).refersTo
    ).toBe("INV-0042");
    expect(
      prepareInvoiceCopy({
        invoice: invoiceWith({ number: " ", invoiceDate: "2026-10-03" }),
        documentType: "credit-note",
        library: [],
        today
      }).refersTo
    ).toBe("");
  });

  it("names no invoice on a credit note made from a quote", () => {
    const copy = prepareInvoiceCopy({
      invoice: quoteWith({ number: "QUO-0007", refersTo: "INV-0040" }),
      documentType: "credit-note",
      library: [],
      today: new Date(2026, 10, 2)
    });

    expect(copy.refersTo).toBe("");
  });

  it("keeps what a credit note refers to on a copy of it", () => {
    const copy = prepareInvoiceCopy({
      invoice: {
        ...createBlankDocument("credit-note"),
        number: "CN-0003",
        refersTo: "INV-0040"
      },
      documentType: "credit-note",
      library: [],
      today: new Date(2026, 10, 2)
    });

    expect(copy.refersTo).toBe("INV-0040");
  });

  it("names the invoice it's made from over a hidden one an earlier credit note left", () => {
    const copy = prepareInvoiceCopy({
      invoice: invoiceWith({
        number: "INV-0010",
        invoiceDate: "2026-10-03",
        dateFormat: "d MMM yyyy",
        refersTo: "INV-0003, 1 Oct 2026"
      }),
      documentType: "credit-note",
      library: [],
      today: new Date(2026, 10, 2)
    });

    expect(copy.refersTo).toBe("INV-0010, 3 Oct 2026");
  });

  it("clears a hidden Paid by when a receipt is made from another type", () => {
    const copy = prepareInvoiceCopy({
      invoice: invoiceWith({ paidBy: "Card" }),
      documentType: "receipt",
      library: [],
      today: new Date(2026, 10, 2)
    });

    expect(copy.paidBy).toBe("");
  });

  it("restarts the due date from a credit note, which has no due date row", () => {
    const copy = prepareInvoiceCopy({
      invoice: {
        ...createBlankDocument("credit-note"),
        invoiceDate: "2026-10-01",
        dueDate: ""
      },
      documentType: "invoice",
      library: [],
      today: new Date(2026, 10, 2)
    });

    expect(copy.dueDate).toBe("2026-12-02");
  });

  it("keeps a credit note's due date span on a copy of the same type", () => {
    const copy = prepareInvoiceCopy({
      invoice: {
        ...createBlankDocument("credit-note"),
        invoiceDate: "2026-10-01",
        dueDate: "2026-10-15"
      },
      documentType: "credit-note",
      library: [],
      today: new Date(2026, 10, 8)
    });

    expect(copy.dueDate).toBe("2026-11-22");
  });

  it("prefers the type's own series over the original's when both hold that type", () => {
    const copy = prepareInvoiceCopy({
      invoice: quoteWith({ number: "QUO-0006" }),
      documentType: "invoice",
      library: [
        stored("QUO-0006", "quote", 1),
        stored("INV-0010", "invoice", 9),
        stored("QUO-0007", "invoice")
      ],
      today: new Date(2026, 10, 2)
    });

    expect(copy.number).toBe("INV-0011");
  });

  it("passes over a number left in another type's sample series", () => {
    const copy = prepareInvoiceCopy({
      invoice: quoteWith({ number: "QUO-0005" }),
      documentType: "invoice",
      library: [
        stored("QUO-0005", "quote", 1),
        stored("INV-0009", "invoice", 40),
        stored("PRO-0003", "invoice", 30)
      ],
      today: new Date(2026, 10, 2)
    });

    expect(copy.number).toBe("INV-0010");
  });

  it("starts the sample series rather than repeat a number with no digits", () => {
    const copy = prepareInvoiceCopy({
      invoice: quoteWith({ number: "QUO-0007" }),
      documentType: "invoice",
      library: [stored("QUO-0007", "quote"), stored("ACME", "invoice")],
      today: new Date(2026, 10, 2)
    });

    expect(copy.number).toBe("INV-0001");
  });

  it("doesn't change the document it copies", () => {
    const quote = quoteWith({ number: "QUO-0007" });
    const before = structuredClone(quote);

    prepareInvoiceCopy({
      invoice: quote,
      documentType: "invoice",
      library: [],
      today: new Date(2026, 10, 2)
    });

    expect(quote).toEqual(before);
  });
});

describe("describeCopy", () => {
  it("says the copy is dated today when nothing needs checking", () => {
    expect(describeCopy({ original: "FRL-0014", copy: invoiceWith({}) })).toBe(
      "Copied from FRL-0014 and dated today."
    );
  });

  it("names the type a copy of another type was made as", () => {
    expect(
      describeCopy({
        original: "QUO-0007",
        copy: invoiceWith({}),
        originalType: "quote"
      })
    ).toBe("Copied from QUO-0007 as an invoice and dated today.");
    expect(
      describeCopy({
        original: "INV-0042",
        copy: createBlankDocument("credit-note"),
        originalType: "invoice"
      })
    ).toBe("Copied from INV-0042 as a credit note and dated today.");
  });

  it("says what to check", () => {
    expect(
      describeCopy({
        original: "QUO-0007",
        copy: invoiceWith({
          servicePeriod: "October 2026",
          sections: { ...createBlankInvoice().sections, servicePeriod: true }
        }),
        originalType: "quote"
      })
    ).toBe("Copied from QUO-0007 as an invoice. Check the service period.");
  });
});

describe("findDateMention", () => {
  it.each([
    ["Retainer, October 2026", "October 2026"],
    ["Support for Sept 2026", "Sept 2026"],
    ["Work done 3 March", "3 March"],
    ["Hosting Q4 2026", "Q4 2026"],
    ["Delivered 2026-10-01", "2026-10-01"],
    ["Visit on 01/10/2026", "01/10/2026"],
    ["Delivered 1 May 2026", "1 May 2026"],
    ["Due March 3, 2027", "March 3"]
  ])("finds the date in %j", (text, mention) => {
    expect(findDateMention(text)).toBe(mention);
  });

  it.each([
    "Design work",
    "May include travel",
    "Version 2.1",
    "Phase 2 may change",
    "Item 3 may vary",
    "Prices may 10% rise",
    "Jan 5 hours of support"
  ])("finds nothing in %j", text => {
    expect(findDateMention(text)).toBeNull();
  });
});

describe("describeCopyReview", () => {
  const base = createBlankInvoice();

  it("names the service period and the line items that mention a month", () => {
    const invoice = invoiceWith({
      servicePeriod: "1 October 2026 – 31 October 2026",
      items: [
        { ...base.items[0], description: "Retainer, October 2026" },
        { ...base.items[0], id: "b", description: "Hosting October 2026" },
        { ...base.items[0], id: "c", description: "Setup" }
      ]
    });

    expect(describeCopyReview(invoice)).toBe(
      "the service period and 2 line items that mention October 2026"
    );
  });

  it("says a date when the mentions differ", () => {
    const invoice = invoiceWith({
      servicePeriod: "",
      items: [
        { ...base.items[0], description: "Retainer, October 2026" },
        { ...base.items[0], id: "b", description: "Hosting Q3 2026" }
      ]
    });

    expect(describeCopyReview(invoice)).toBe(
      "2 line items that mention a date"
    );
  });

  it("is null when nothing mentions a date", () => {
    const invoice = invoiceWith({
      servicePeriod: "",
      items: [{ ...base.items[0], description: "Design work" }]
    });

    expect(describeCopyReview(invoice)).toBeNull();
  });
});
