import { describe, expect, it } from "vitest";
import { createBlankInvoice } from "~/stores/invoice-store";
import type { InvoiceDocument } from "~/types";
import { getContactSuggestions } from "~/utils/contact-suggestions";

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

// What the client block shows of each suggestion.
function clientSuggestions(
  options: Omit<Parameters<typeof getContactSuggestions>[0], "contact">
) {
  return getContactSuggestions({ ...options, contact: "client" }).map(
    ({ name, content }) => ({ name, content })
  );
}

const library = [
  libraryDocument("a", "Acme Ltd\n1 Old Road\nLondon", "2026-01-10"),
  libraryDocument("b", "Acme Ltd\n2 New Street\nLondon", "2026-03-01"),
  libraryDocument("c", "Black Acme GmbH\nBerlin", "2026-02-01"),
  libraryDocument("d", "Zenith Studio", "2026-02-15"),
  libraryDocument("e", "", "2026-04-01")
];

describe("getContactSuggestions", () => {
  it("suggests each client once, with its newest address", () => {
    const suggestions = clientSuggestions({
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
      clientSuggestions({ documents: library, typed, excludeId: null }).map(
        suggestion => suggestion.name
      );

    expect(names("acme l")).toEqual(["Acme Ltd"]);
    expect(names("cme")).toEqual([]);
    expect(names("zen")).toEqual(["Zenith Studio"]);
  });

  it("lists recent clients, newest first, while the block is empty", () => {
    const suggestions = clientSuggestions({
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
      clientSuggestions({
        documents: library,
        typed: "Zenith",
        excludeId: "d"
      })
    ).toEqual([]);
    expect(
      clientSuggestions({
        documents: library,
        typed: "Zenith Studio",
        excludeId: null
      })
    ).toEqual([]);
  });

  it("suggests nothing once a second line is started", () => {
    for (const typed of ["Acme Ltd\n1", "Acme Ltd\n", "\n\nAc"]) {
      expect(
        clientSuggestions({ documents: library, typed, excludeId: null })
      ).toEqual([]);
    }
  });

  it("matches without case or accents", () => {
    const accented = [
      libraryDocument("f", "Café Noir\nParis", "2026-05-01"),
      libraryDocument("g", "Cafe\u0301 Noir\nLyon", "2026-04-01"),
      libraryDocument("h", "İstanbul Tekstil", "2026-03-01")
    ];
    const names = (typed: string) =>
      clientSuggestions({ documents: accented, typed, excludeId: null }).map(
        suggestion => suggestion.name
      );

    expect(names("cafe")).toEqual(["Café Noir"]);
    expect(names("ist")).toEqual(["İstanbul Tekstil"]);
  });

  it("suggests nothing from an empty library", () => {
    expect(
      clientSuggestions({ documents: [], typed: "", excludeId: null })
    ).toEqual([]);
  });

  it("suggests senders from the From block, with their invoice", () => {
    const invoiceData = createBlankInvoice();
    const older = libraryDocument("s1", "", "2026-01-01");
    const newer = libraryDocument("s2", "", "2026-02-01");

    older.invoiceData = {
      ...invoiceData,
      seller: { ...invoiceData.seller, content: "Jane Doe\nOld Lane" }
    };
    newer.invoiceData = {
      ...invoiceData,
      seller: { ...invoiceData.seller, content: "Jane Doe\nNew Lane" }
    };

    const suggestions = getContactSuggestions({
      documents: [...library, older, newer],
      contact: "seller",
      typed: "jan",
      excludeId: null
    });

    expect(suggestions).toEqual([
      {
        name: "Jane Doe",
        content: "Jane Doe\nNew Lane",
        invoiceDocument: newer
      }
    ]);
  });
});
