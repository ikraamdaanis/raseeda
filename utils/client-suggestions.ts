import type { InvoiceDocument } from "~/types";

// Clients from past invoices to fill the "To" block with (issue #130). Each
// client shows once, matched on its first line (the name), as its most
// recently edited invoice wrote it, so a changed address replaces the old one.
// Nothing is stored apart from the invoices: a client whose invoices are
// deleted stops being suggested. Once a second line is typed the block is
// being written by hand, so nothing is suggested.
export function getClientSuggestions({
  documents,
  typed,
  excludeId,
  limit = 5
}: {
  documents: InvoiceDocument[];
  typed: string;
  excludeId: string | null;
  limit?: number;
}) {
  if (typed.includes("\n")) return [];

  const query = typed.trim();
  const words = toMatchable(query).split(/\s+/).filter(Boolean);
  const newestFirst = [...documents].sort(
    (a, b) => b.updatedAt.getTime() - a.updatedAt.getTime()
  );
  const seen = new Set<string>();
  const suggestions: { name: string; content: string }[] = [];

  for (const invoiceDocument of newestFirst) {
    if (suggestions.length === limit) break;
    if (invoiceDocument.id === excludeId) continue;

    const content = invoiceDocument.invoiceData.client.content.trim();
    const name = getFirstLine(content);

    if (!name) continue;

    const key = toMatchable(name);

    if (seen.has(key)) continue;

    seen.add(key);

    if (content === query) continue;
    if (!matchesWords(key, words)) continue;

    suggestions.push({ name, content });
  }

  return suggestions;
}

function getFirstLine(content: string) {
  return (
    content
      .split("\n")
      .map(line => line.trim())
      .find(Boolean) ?? ""
  );
}

// A name as it's compared: lower case, without accents, so "cafe" finds
// "Café", a pasted decomposed "Café" is the same client, and "ist" finds
// "İstanbul".
function toMatchable(text: string) {
  return text.normalize("NFKD").replace(/\p{M}/gu, "").toLocaleLowerCase();
}

// Every typed word starts one of the name's words, so "ac" finds "Acme Ltd"
// and "Black Acme", and "acme l" finds "Acme Ltd".
function matchesWords(name: string, typedWords: string[]) {
  const nameWords = name.split(/\s+/);

  return typedWords.every(typedWord =>
    nameWords.some(nameWord => nameWord.startsWith(typedWord))
  );
}
