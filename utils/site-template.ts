import {
  createBlankDocument,
  createBlankInvoice
} from "~/stores/invoice-store";
import type { Invoice, InvoiceItem, SiteTemplateId } from "~/types";

function lines(
  rows: [description: string, quantity: number, unit: string][]
): InvoiceItem[] {
  return rows.map(([description, quantity, unit]) => ({
    id: crypto.randomUUID(),
    description,
    quantity,
    unit,
    unitPrice: 0
  }));
}

/**
 * What a site template page opens in the editor (consts/site-templates.ts): a
 * blank of a document type, or a new invoice laid out for a trade. Dates and
 * formats come from the blank, so a template is dated today. Prices and tax
 * rates stay at 0 and the parties stay empty, because a sample figure or name
 * left in by accident would print on a real invoice; the page's picture is
 * where a finished example belongs.
 */
export function createSiteTemplateInvoice(id: SiteTemplateId): Invoice {
  if (id === "freelance") return freelanceInvoice();
  if (id === "contractor") return contractorInvoice();
  if (id === "retail") return retailInvoice();

  return createBlankDocument(id);
}

function freelanceInvoice(): Invoice {
  const blank = createBlankInvoice();

  return {
    ...blank,
    theme: { ...blank.theme, font: "dm-sans" },
    tableSettings: {
      ...blank.tableSettings,
      columnLabels: {
        ...blank.tableSettings.columnLabels,
        quantity: "Hours",
        unitPrice: "Rate"
      }
    },
    items: lines([
      ["Project work", 8, "hrs"],
      ["Meetings and calls", 2, "hrs"],
      ["Revisions", 2, "hrs"]
    ])
  };
}

function contractorInvoice(): Invoice {
  const blank = createBlankInvoice();

  return {
    ...blank,
    theme: { ...blank.theme, font: "ibm-plex-sans" },
    sections: { ...blank.sections, shipping: true },
    shipping: { ...blank.shipping, label: "Job site" },
    labels: { ...blank.labels, amountPaid: "Deposit paid" },
    items: lines([
      ["Labour", 8, "hrs"],
      ["Materials", 1, "ea"],
      ["Disposal and site clean-up", 1, "ea"]
    ])
  };
}

function retailInvoice(): Invoice {
  const blank = createBlankInvoice();
  const [standard, reduced, exempt] = lines([
    ["Standard-rate product", 1, "ea"],
    ["Reduced-rate product", 1, "ea"],
    ["Tax-free product", 1, "ea"]
  ]);

  return {
    ...blank,
    theme: { ...blank.theme, font: "geist" },
    sections: { ...blank.sections, tax: true },
    tax: { ...blank.tax, perLine: true },
    labels: { ...blank.labels, fees: "Delivery" },
    items: [
      { ...standard, tax: { percentage: 0, exempt: false } },
      { ...reduced, tax: { percentage: 0, exempt: false } },
      { ...exempt, tax: { percentage: 0, exempt: true } }
    ]
  };
}
