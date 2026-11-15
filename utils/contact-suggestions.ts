import type { InvoiceDocument } from "~/types";
import { matchesWords, toMatchable, toTypedWords } from "~/utils/match-words";

// Contacts from past invoices to fill a block with: clients in the "To" block
// (issue #130), the user's own details in the "From" block (issue #207). Each
// contact shows once, matched on its first line (the name), as its most
// recently edited invoice wrote it, so a changed address replaces the old one;
// that invoice comes with it, for what else a pick copies. Nothing is stored
// apart from the invoices: a contact whose invoices are deleted stops being
// suggested. Once a second line is typed the block is being written by hand,
// so nothing is suggested.
export function getContactSuggestions({
  documents,
  contact,
  typed,
  excludeId,
  limit = 5
}: {
  documents: InvoiceDocument[];
  contact: "client" | "seller";
  typed: string;
  excludeId: string | null;
  limit?: number;
}) {
  if (typed.includes("\n")) return [];

  const query = typed.trim();
  const words = toTypedWords(query);
  const newestFirst = [...documents].sort(
    (a, b) => b.updatedAt.getTime() - a.updatedAt.getTime()
  );
  const seen = new Set<string>();
  const suggestions: {
    name: string;
    content: string;
    invoiceDocument: InvoiceDocument;
  }[] = [];

  for (const invoiceDocument of newestFirst) {
    if (suggestions.length === limit) break;
    if (invoiceDocument.id === excludeId) continue;

    const content = invoiceDocument.invoiceData[contact].content.trim();
    const name = getFirstLine(content);

    if (!name) continue;

    const key = toMatchable(name);

    if (seen.has(key)) continue;

    seen.add(key);

    if (content === query) continue;
    if (!matchesWords(key, words)) continue;

    suggestions.push({ name, content, invoiceDocument });
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
