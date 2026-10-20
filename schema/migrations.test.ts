import { describe, expect, it } from "vitest";
import {
  DEFAULT_INVOICE_THEME,
  STORED_INVOICE_THEME_FALLBACK
} from "~/schema/invoice";
import {
  CURRENT_INVOICE_SCHEMA_VERSION,
  migrateInvoiceData
} from "~/schema/migrations";

// A current-shape raw record. Tests strip or swap fields to recreate the legacy,
// partial, and corrupt shapes migrateInvoiceData has to absorb.
function currentRaw(): Record<string, unknown> {
  return {
    id: "abc",
    title: "Invoice",
    image: "",
    number: "42",
    invoiceDate: "2026-01-01",
    dueDate: "2026-01-31",
    seller: { label: "From", content: "Acme", placeholder: "" },
    client: { label: "To", content: "Client", placeholder: "" },
    items: [{ id: "i1", description: "Work", quantity: 1, unitPrice: 100 }],
    tableSettings: {
      columnLabels: {
        description: "Item",
        quantity: "Quantity",
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
      subtotal: "Subtotal",
      tax: "Tax",
      fees: "Fees",
      discounts: "Discounts",
      total: "Total"
    },
    tax: { percentage: 0 },
    fees: 0,
    discounts: 0,
    terms: { label: "Terms", content: "" },
    paymentDetails: {
      label: "Payment details",
      bankName: "Acme Bank",
      accountNumber: "12345678",
      iban: "",
      sortCode: "",
      terms: ""
    },
    pdfSettings: { backgroundColor: "#ffffff" },
    currency: "£",
    theme: { font: "lora", fontWeight: "Bold", size: "large", accent: "#123" }
  };
}

describe("migrateInvoiceData", () => {
  it("produces a valid invoice from an empty object", () => {
    const invoice = migrateInvoiceData({});

    expect(invoice.items).toEqual([]);
    expect(invoice.tax).toEqual({ percentage: 0, exempt: false, note: "" });
    expect(invoice.theme).toEqual(STORED_INVOICE_THEME_FALLBACK);
    expect(invoice.currency).toBe("$");
  });

  it("repairs a non-object input into a blank invoice (never throws)", () => {
    expect(() => migrateInvoiceData(null)).not.toThrow();
    expect(migrateInvoiceData("garbage").labels.subtotal).toBe("Subtotal");
  });

  it("is idempotent on a current-shape invoice", () => {
    const once = migrateInvoiceData(currentRaw());
    const twice = migrateInvoiceData(once);

    expect(twice).toEqual(once);
  });

  it("fills a missing theme with Geist, the font it was drawn in", () => {
    const { theme: _theme, ...withoutTheme } = currentRaw();

    expect(migrateInvoiceData(withoutTheme).theme).toEqual(
      STORED_INVOICE_THEME_FALLBACK
    );
    expect(STORED_INVOICE_THEME_FALLBACK.font).toBe("geist");
    expect(DEFAULT_INVOICE_THEME.font).toBe("schibsted-grotesk");
  });

  it("maps the legacy textFont onto the new theme font", () => {
    const raw = { ...currentRaw(), theme: { textFont: "inter" } };
    const normalized = migrateInvoiceData(raw);

    expect(normalized.theme.font).toBe("inter");
    expect(normalized.theme.size).toBe(DEFAULT_INVOICE_THEME.size);
  });

  it("falls back to the default weight when the stored weight is invalid", () => {
    const raw = {
      ...currentRaw(),
      theme: { font: "geist", fontWeight: "Heavy" }
    };

    expect(migrateInvoiceData(raw).theme.fontWeight).toBe(
      DEFAULT_INVOICE_THEME.fontWeight
    );
  });

  it("collapses legacy per-column header settings into column labels", () => {
    const raw = {
      ...currentRaw(),
      tableSettings: {
        descriptionHeaderSettings: { label: "Service" },
        quantityHeaderSettings: { label: "Hours" },
        unitPriceHeaderSettings: { label: "Rate" },
        amountHeaderSettings: { label: "Total" },
        backgroundColor: "#fef2f2",
        borderColor: "#fecaca"
      }
    };
    const normalized = migrateInvoiceData(raw);

    expect(normalized.tableSettings.columnLabels).toEqual({
      description: "Service",
      quantity: "Hours",
      unit: "Unit",
      unitPrice: "Rate",
      amount: "Total"
    });
    expect(normalized.tableSettings.backgroundColor).toBe("#fef2f2");
  });

  it("supplies default table colours when none are stored", () => {
    const { tableSettings: _tableSettings, ...withoutTable } = currentRaw();
    const normalized = migrateInvoiceData(withoutTable);

    expect(normalized.tableSettings.backgroundColor).toBe("#f9fafb");
    expect(normalized.tableSettings.columnLabels.description).toBe("Item");
  });

  it("merges partial labels over the defaults", () => {
    const raw = { ...currentRaw(), labels: { total: "Grand Total" } };
    const normalized = migrateInvoiceData(raw);

    expect(normalized.labels.total).toBe("Grand Total");
    expect(normalized.labels.subtotal).toBe("Subtotal");
  });

  it("strips derived money fields and per-item amounts", () => {
    const raw = {
      ...currentRaw(),
      subtotal: 100,
      total: 100,
      tax: { percentage: 20, amount: 20 },
      items: [
        {
          id: "i1",
          description: "Work",
          quantity: 1,
          unitPrice: 100,
          amount: 100
        }
      ]
    };
    const normalized = migrateInvoiceData(raw);

    expect(normalized).not.toHaveProperty("subtotal");
    expect(normalized).not.toHaveProperty("total");
    expect(normalized.tax).toEqual({ percentage: 20, exempt: false, note: "" });
    expect(normalized.items[0]).not.toHaveProperty("amount");
  });

  it("coerces a string-typed quantity to a number", () => {
    const raw = {
      ...currentRaw(),
      items: [{ id: "i1", description: "Work", quantity: "3", unitPrice: 10 }]
    };

    expect(migrateInvoiceData(raw).items[0].quantity).toBe(3);
  });

  it("adds an empty payment details section to a legacy invoice without one", () => {
    const { paymentDetails: _paymentDetails, ...legacy } = currentRaw();
    const normalized = migrateInvoiceData(legacy);

    expect(normalized.paymentDetails).toEqual({
      label: "Payment details",
      bankName: "",
      accountNumber: "",
      routingNumber: "",
      iban: "",
      bic: "",
      sortCode: "",
      terms: ""
    });
  });

  it("preserves stored payment details without data loss", () => {
    const normalized = migrateInvoiceData(currentRaw());

    expect(normalized.paymentDetails.bankName).toBe("Acme Bank");
    expect(normalized.paymentDetails.accountNumber).toBe("12345678");
  });

  it("skips the v0->v1 reshape when already at the current version", () => {
    const raw = { ...currentRaw(), theme: { textFont: "inter" } };
    const normalized = migrateInvoiceData(raw, CURRENT_INVOICE_SCHEMA_VERSION);

    expect(normalized.theme.font).toBe(STORED_INVOICE_THEME_FALLBACK.font);
  });
});
