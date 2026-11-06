import { afterEach, describe, expect, it, vi } from "vitest";
import { STORED_INVOICE_THEME_FALLBACK } from "~/schema/invoice";
import { createBlankInvoice, invoiceDefault } from "~/stores/invoice-store";
import { isBlankInvoice, isLargeRemoval } from "~/utils/invoice-content";
import { getLocaleDefaults } from "~/utils/locale-defaults";

describe("isBlankInvoice", () => {
  it("treats a new invoice as blank whatever day it was made", () => {
    expect(isBlankInvoice(createBlankInvoice())).toBe(true);
    expect(
      isBlankInvoice({ ...createBlankInvoice(), invoiceDate: "2020-01-01" })
    ).toBe(true);
  });

  it("notices any edit", () => {
    expect(isBlankInvoice({ ...createBlankInvoice(), title: "Quote" })).toBe(
      false
    );
    expect(
      isBlankInvoice({
        ...createBlankInvoice(),
        theme: { ...invoiceDefault.theme, font: "lora" }
      })
    ).toBe(false);
  });

  describe("in an American browser", () => {
    afterEach(() => {
      vi.unstubAllGlobals();
    });

    it("keeps a switch to A4, though A4 is what stored invoices default to", () => {
      vi.stubGlobal("navigator", { language: "en-US" });

      expect(isBlankInvoice(createBlankInvoice())).toBe(true);
      expect(isBlankInvoice({ ...createBlankInvoice(), paperSize: "A4" })).toBe(
        false
      );
    });
  });

  describe("in a German browser", () => {
    afterEach(() => {
      vi.unstubAllGlobals();
    });

    it("treats the formats the language picked as filled in for you", () => {
      vi.stubGlobal("navigator", { language: "de-DE" });

      expect(
        isBlankInvoice(createBlankInvoice(getLocaleDefaults("de-DE")))
      ).toBe(true);
      expect(isBlankInvoice(createBlankInvoice())).toBe(true);
    });

    it("keeps a format someone chose", () => {
      vi.stubGlobal("navigator", { language: "de-DE" });

      expect(
        isBlankInvoice({
          ...createBlankInvoice(getLocaleDefaults("de-DE")),
          currencyPosition: "before"
        })
      ).toBe(false);
      expect(
        isBlankInvoice({ ...createBlankInvoice(), numberFormat: "space-comma" })
      ).toBe(false);
      expect(
        isBlankInvoice({
          ...createBlankInvoice(),
          numberFormat: "comma-dot",
          currencyPosition: "before"
        })
      ).toBe(false);
    });
  });

  it("still treats a blank from before the default font changed as blank", () => {
    expect(
      isBlankInvoice({
        ...createBlankInvoice(),
        theme: STORED_INVOICE_THEME_FALLBACK
      })
    ).toBe(true);
    expect(
      isBlankInvoice({
        ...createBlankInvoice(),
        title: "Quote",
        theme: STORED_INVOICE_THEME_FALLBACK
      })
    ).toBe(false);
  });
});

describe("isLargeRemoval", () => {
  const written = {
    ...createBlankInvoice(),
    client: {
      ...invoiceDefault.client,
      content: "Acme Ltd\n1 High Street\nLondon\nUnited Kingdom"
    },
    notes: { ...invoiceDefault.notes, content: "Thanks for your business." }
  };

  it("spots a change that throws most of the content away", () => {
    expect(
      isLargeRemoval(written, {
        ...written,
        client: { ...written.client, content: "" },
        notes: { ...written.notes, content: "" }
      })
    ).toBe(true);
  });

  it("counts the ways to pay", () => {
    const withMethods = {
      ...createBlankInvoice(),
      paymentDetails: {
        ...invoiceDefault.paymentDetails,
        methods: [
          { id: "venmo", name: "Venmo", detail: "@jane-designs-studio" },
          { id: "pix", name: "Pix", detail: "jane@example.com" }
        ]
      }
    };

    expect(
      isLargeRemoval(withMethods, {
        ...withMethods,
        paymentDetails: { ...withMethods.paymentDetails, methods: [] }
      })
    ).toBe(true);
  });

  it("ignores small edits and nearly empty invoices", () => {
    expect(
      isLargeRemoval(written, {
        ...written,
        notes: { ...written.notes, content: "" }
      })
    ).toBe(false);
    expect(isLargeRemoval(createBlankInvoice(), createBlankInvoice())).toBe(
      false
    );
  });
});
