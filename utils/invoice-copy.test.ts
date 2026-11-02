import { describe, expect, it } from "vitest";
import { createBlankInvoice } from "~/stores/invoice-store";
import type { Invoice } from "~/types";
import {
  describeCopyReview,
  findDateMention,
  nextInvoiceNumber,
  prepareInvoiceCopy
} from "~/utils/invoice-copy";

function invoiceWith(overrides: Partial<Invoice>): Invoice {
  return { ...createBlankInvoice(), ...overrides };
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
      takenNumbers: ["FRL-0014"],
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
      takenNumbers: [],
      today: new Date(2026, 10, 2)
    });

    expect(copy.dueDate).toBe("");
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
