import { addDays, format } from "date-fns";
import { afterEach, describe, expect, it, vi } from "vitest";
import { STORED_INVOICE_FORMATS } from "~/schema/invoice";
import {
  createBlankDocument,
  createBlankInvoice,
  invoiceDefault
} from "~/stores/invoice-store";
import { getLocaleDefaults } from "~/utils/locale-defaults";

describe("createBlankInvoice", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("stamps the invoice date at creation time, not module load", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-15T10:00:00Z"));

    const invoice = createBlankInvoice();

    expect(invoice.invoiceDate).toBe("2026-09-15");
    expect(invoice.invoiceDate).not.toBe(invoiceDefault.invoiceDate);
  });

  it("stamps the due date 30 days from creation time", () => {
    vi.useFakeTimers();
    const now = new Date("2026-09-15T10:00:00Z");
    vi.setSystemTime(now);

    const invoice = createBlankInvoice();

    expect(invoice.dueDate).toBe(format(addDays(now, 30), "yyyy-MM-dd"));
  });

  it("re-stamps the date on each call as the clock advances", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-15T10:00:00Z"));
    const first = createBlankInvoice();
    vi.setSystemTime(new Date("2026-09-17T10:00:00Z"));
    const second = createBlankInvoice();

    expect(first.invoiceDate).toBe("2026-09-15");
    expect(second.invoiceDate).toBe("2026-09-17");
  });

  it("returns a fully blank invoice", () => {
    const invoice = createBlankInvoice();

    expect(invoice.seller.content).toBe("");
    expect(invoice.image).toBe("");
    expect(invoice.paymentDetails).toEqual(invoiceDefault.paymentDetails);
    expect(invoice.title).toBe(invoiceDefault.title);
  });

  it("carries the static default invoice number", () => {
    expect(createBlankInvoice().number).toBe("INV-0001");
    expect(createBlankInvoice().number).toBe(invoiceDefault.number);
  });

  it("gives each blank invoice fresh line-item ids", () => {
    const first = createBlankInvoice();
    const second = createBlankInvoice();

    expect(first.items[0].id).not.toBe(second.items[0].id);
    expect(first.items[0].id).not.toBe(invoiceDefault.items[0].id);
    expect(first.items[0].description).toBe(
      invoiceDefault.items[0].description
    );
  });

  it("keeps the seller label and placeholder from the default", () => {
    const invoice = createBlankInvoice();

    expect(invoice.seller.label).toBe(invoiceDefault.seller.label);
    expect(invoice.seller.placeholder).toBe(invoiceDefault.seller.placeholder);
  });

  it("returns an independent invoice on each call", () => {
    const first = createBlankInvoice();

    first.seller.content = "Edited on this invoice only";

    const second = createBlankInvoice();

    expect(second.seller.content).toBe("");
  });

  it("takes the browser language's formats unless it's given some", () => {
    vi.stubGlobal("navigator", { language: "de-DE" });

    try {
      expect(createBlankInvoice()).toMatchObject({
        numberFormat: "dot-comma",
        currencyPosition: "after",
        paperSize: "A4"
      });
      expect(createBlankInvoice(getLocaleDefaults(undefined))).toMatchObject({
        numberFormat: "comma-dot",
        currencyPosition: "before",
        paperSize: "A4"
      });
      vi.stubGlobal("navigator", { language: "en-US" });
      expect(createBlankInvoice().paperSize).toBe("Letter");
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("starts the labels in the browser's language, English without a preset", () => {
    vi.stubGlobal("navigator", { language: "de-DE" });

    try {
      expect(createBlankInvoice()).toMatchObject({
        title: "Rechnung",
        labels: { invoiceDate: "Rechnungsdatum" }
      });
      expect(createBlankDocument("quote").title).toBe("Angebot");
      expect(createBlankInvoice(STORED_INVOICE_FORMATS).title).toBe("Invoice");
      vi.stubGlobal("navigator", { language: "sv-SE" });
      expect(createBlankInvoice().title).toBe("Invoice");
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
