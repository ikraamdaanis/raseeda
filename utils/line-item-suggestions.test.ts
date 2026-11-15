import { describe, expect, it } from "vitest";
import { createBlankInvoice } from "~/stores/invoice-store";
import type { InvoiceDocument, InvoiceItem } from "~/types";
import { getLineItemSuggestions } from "~/utils/line-item-suggestions";

function libraryDocument({
  id,
  items,
  updatedAt,
  currency = { currency: "$", currencyCode: "USD" }
}: {
  id: string;
  items: Omit<InvoiceItem, "id" | "quantity">[];
  updatedAt: string;
  currency?: { currency: string; currencyCode: string };
}): InvoiceDocument {
  return {
    id,
    name: id,
    nameSource: "auto",
    invoiceData: {
      ...createBlankInvoice(),
      ...currency,
      items: items.map((item, index) => ({
        id: `${id}-${index}`,
        quantity: 3,
        ...item
      }))
    },
    templateId: null,
    rev: 1,
    createdAt: new Date(updatedAt),
    updatedAt: new Date(updatedAt)
  };
}

const USD = { currency: "$", currencyCode: "USD" };

const library = [
  libraryDocument({
    id: "a",
    updatedAt: "2026-01-10",
    items: [
      { description: "Website design", unit: "hrs", unitPrice: 80 },
      { description: "Hosting", unit: "month", unitPrice: 20 }
    ]
  }),
  libraryDocument({
    id: "b",
    updatedAt: "2026-03-01",
    items: [
      { description: "Website design", unit: "hrs", unitPrice: 95 },
      { description: "", unit: "", unitPrice: 0 }
    ]
  }),
  libraryDocument({
    id: "c",
    updatedAt: "2026-02-01",
    items: [{ description: "Logo design", unit: "", unitPrice: 400 }]
  }),
  libraryDocument({
    id: "d",
    updatedAt: "2026-04-01",
    currency: { currency: "€", currencyCode: "EUR" },
    items: [{ description: "Website audit", unit: "", unitPrice: 300 }]
  })
];

function suggest(
  description: string,
  {
    documents = library,
    excludeId = null,
    currency = USD
  }: {
    documents?: InvoiceDocument[];
    excludeId?: string | null;
    currency?: { currency: string; currencyCode: string };
  } = {}
) {
  return getLineItemSuggestions({
    documents,
    item: { description, unit: "", unitPrice: 0 },
    currency,
    excludeId
  });
}

describe("getLineItemSuggestions", () => {
  it("suggests each item once, as its newest invoice had it", () => {
    expect(suggest("des")).toEqual([
      { description: "Website design", unit: "hrs", unitPrice: 95 },
      { description: "Logo design", unit: "", unitPrice: 400 }
    ]);
  });

  it("matches the start of each typed word", () => {
    const descriptions = (typed: string) =>
      suggest(typed).map(suggestion => suggestion.description);

    expect(descriptions("web d")).toEqual(["Website design"]);
    expect(descriptions("esign")).toEqual([]);
    expect(descriptions("host")).toEqual(["Hosting"]);
  });

  it("only reads invoices in the open invoice's currency", () => {
    expect(
      suggest("web", { currency: { currency: "€", currencyCode: "EUR" } })
    ).toEqual([{ description: "Website audit", unit: "", unitPrice: 300 }]);
    expect(
      suggest("web", { currency: { currency: "$", currencyCode: "CAD" } })
    ).toEqual([]);
  });

  it("leaves out the open invoice", () => {
    expect(suggest("website", { excludeId: "b" })).toEqual([
      { description: "Website design", unit: "hrs", unitPrice: 80 }
    ]);
  });

  it("leaves out a line already filled with the item", () => {
    expect(
      getLineItemSuggestions({
        documents: library,
        item: { description: "Hosting", unit: "month", unitPrice: 20 },
        currency: USD,
        excludeId: null
      })
    ).toEqual([]);
    expect(suggest("Hosting")).toEqual([
      { description: "Hosting", unit: "month", unitPrice: 20 }
    ]);
  });

  it("lists recent items, newest first, up to five, while the cell is empty", () => {
    const many = libraryDocument({
      id: "e",
      updatedAt: "2026-05-01",
      items: ["One", "Two", "Three", "Four", "Five", "Six"].map(
        description => ({ description, unit: "", unitPrice: 1 })
      )
    });

    expect(
      suggest("", { documents: [...library, many] }).map(
        suggestion => suggestion.description
      )
    ).toEqual(["One", "Two", "Three", "Four", "Five"]);
  });

  it("matches without case or accents", () => {
    const accented = [
      libraryDocument({
        id: "f",
        updatedAt: "2026-05-01",
        items: [{ description: "Café catering", unit: "", unitPrice: 50 }]
      }),
      libraryDocument({
        id: "g",
        updatedAt: "2026-04-01",
        items: [{ description: "Café catering", unit: "", unitPrice: 40 }]
      })
    ];

    expect(suggest("CAFE", { documents: accented })).toEqual([
      { description: "Café catering", unit: "", unitPrice: 50 }
    ]);
  });
});
