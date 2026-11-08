import { describe, expect, it } from "vitest";
import { DOCUMENT_TYPE_DEFAULTS } from "~/consts/document-types";
import { SITE_TEMPLATES } from "~/consts/site-templates";
import { invoiceSchema } from "~/schema/invoice";
import { calculateInvoiceTotals } from "~/utils/calculate-invoice-totals";
import { isBlankInvoice } from "~/utils/invoice-content";
import { createSiteTemplateInvoice } from "~/utils/site-template";

describe("createSiteTemplateInvoice", () => {
  it.each(["quote", "proforma-invoice", "receipt", "credit-note"] as const)(
    "starts the %s page's template as a blank of that type",
    documentType => {
      const invoice = createSiteTemplateInvoice(documentType);

      expect(invoice.documentType).toBe(documentType);
      expect(invoice.title).toBe(DOCUMENT_TYPE_DEFAULTS[documentType].title);
      expect(isBlankInvoice(invoice)).toBe(true);
    }
  );

  it("bills a freelancer's lines by the hour", () => {
    const invoice = createSiteTemplateInvoice("freelance");

    expect(invoice.documentType).toBe("invoice");
    expect(invoice.tableSettings.columnLabels.quantity).toBe("Hours");
    expect(invoice.tableSettings.columnLabels.unitPrice).toBe("Rate");
    expect(invoice.items.length).toBeGreaterThan(1);
    expect(invoice.items.every(item => item.unit === "hrs")).toBe(true);
  });

  it("gives a contractor labour, materials, a job site and a deposit", () => {
    const invoice = createSiteTemplateInvoice("contractor");
    const units = invoice.items.map(item => item.unit);

    expect(invoice.sections.shipping).toBe(true);
    expect(invoice.shipping.label).toBe("Job site");
    expect(invoice.labels.amountPaid).toBe("Deposit paid");
    expect(units).toContain("hrs");
    expect(units.some(unit => unit !== "hrs")).toBe(true);
    expect(invoice.items.map(item => item.description).join(" ")).toMatch(
      /Labour[\s\S]*Materials/
    );
  });

  it("gives every retail line its own tax rate", () => {
    const invoice = createSiteTemplateInvoice("retail");

    expect(invoice.sections.tax).toBe(true);
    expect(invoice.tax.perLine).toBe(true);
    expect(invoice.labels.fees).toBe("Delivery");
    expect(invoice.items.every(item => item.tax !== undefined)).toBe(true);
  });

  it.each(SITE_TEMPLATES.map(template => template.id))(
    "keeps %s valid, unpriced and free of anyone's details",
    id => {
      const invoice = createSiteTemplateInvoice(id);

      expect(invoiceSchema.safeParse(invoice).success).toBe(true);
      expect(invoice.seller.content).toBe("");
      expect(invoice.client.content).toBe("");
      expect(calculateInvoiceTotals(invoice).total).toBe(0);
    }
  );

  it("gives each new invoice its own line ids", () => {
    const first = createSiteTemplateInvoice("contractor");
    const second = createSiteTemplateInvoice("contractor");
    const ids = [...first.items, ...second.items].map(item => item.id);

    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.every(Boolean)).toBe(true);
  });

  it("marks trade templates as more than a blank", () => {
    for (const id of ["freelance", "contractor", "retail"] as const) {
      expect(isBlankInvoice(createSiteTemplateInvoice(id))).toBe(false);
    }
  });
});
