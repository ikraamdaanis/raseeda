import { describe, expect, it } from "vitest";
import { createBlankInvoice } from "~/stores/invoice-store";
import type { InvoiceDocument } from "~/types";
import { getClientSuggestions } from "~/utils/client-suggestions";

function libraryDocument(
  id: string,
  client: string,
  updatedAt: string
): InvoiceDocument {
  const invoiceData = createBlankInvoice();

  return {
    id,
    name: id,
    nameSource: "auto",
    invoiceData: {
      ...invoiceData,
      client: { ...invoiceData.client, content: client }
    },
    templateId: null,
    rev: 1,
    createdAt: new Date(updatedAt),
    updatedAt: new Date(updatedAt)
  };
}

const library = [
  libraryDocument("a", "Acme Ltd\n1 Old Road\nLondon", "2026-01-10"),
  libraryDocument("b", "Acme Ltd\n2 New Street\nLondon", "2026-03-01"),
  libraryDocument("c", "Black Acme GmbH\nBerlin", "2026-02-01"),
  libraryDocument("d", "Zenith Studio", "2026-02-15"),
  libraryDocument("e", "", "2026-04-01")
];

describe("getClientSuggestions", () => {
  it("suggests each client once, with its newest address", () => {
    const suggestions = getClientSuggestions({
      documents: library,
      typed: "Ac",
      excludeId: null
    });

    expect(suggestions).toEqual([
      { name: "Acme Ltd", content: "Acme Ltd\n2 New Street\nLondon" },
      { name: "Black Acme GmbH", content: "Black Acme GmbH\nBerlin" }
    ]);
  });

  it("matches the start of each typed word", () => {
    const names = (typed: string) =>
      getClientSuggestions({ documents: library, typed, excludeId: null }).map(
        suggestion => suggestion.name
      );

    expect(names("acme l")).toEqual(["Acme Ltd"]);
    expect(names("cme")).toEqual([]);
    expect(names("zen")).toEqual(["Zenith Studio"]);
  });

  it("lists recent clients, newest first, while the block is empty", () => {
    const suggestions = getClientSuggestions({
      documents: library,
      typed: "  ",
      excludeId: null,
      limit: 2
    });

    expect(suggestions.map(suggestion => suggestion.name)).toEqual([
      "Acme Ltd",
      "Zenith Studio"
    ]);
  });

  it("leaves out the open invoice and a client already filled in", () => {
    expect(
      getClientSuggestions({
        documents: library,
        typed: "Zenith",
        excludeId: "d"
      })
    ).toEqual([]);
    expect(
      getClientSuggestions({
        documents: library,
        typed: "Zenith Studio",
        excludeId: null
      })
    ).toEqual([]);
  });

  it("suggests nothing once a second line is typed", () => {
    expect(
      getClientSuggestions({
        documents: library,
        typed: "Acme Ltd\n1",
        excludeId: null
      })
    ).toEqual([]);
  });

  it("suggests nothing from an empty library", () => {
    expect(
      getClientSuggestions({ documents: [], typed: "", excludeId: null })
    ).toEqual([]);
  });
});
