import type { InvoiceDocument, InvoiceItem } from "~/types";
import { isSameCurrency } from "~/utils/currency-conversion";
import { matchesWords, toMatchable, toTypedWords } from "~/utils/match-words";

type ItemFill = Pick<InvoiceItem, "description" | "unit" | "unitPrice">;

// Items billed on past invoices to fill a line with (issue #205), matched on
// the description as client suggestions are (`getClientSuggestions`). Each
// item shows once, as its most recently edited invoice had it, so a changed
// price replaces the old one. Only invoices in the open invoice's currency
// are read, so a price is never offered in another currency. Nothing is
// stored apart from the invoices: an item only on deleted invoices stops
// being suggested.
export function getLineItemSuggestions({
  documents,
  item,
  currency,
  excludeId,
  limit = 5
}: {
  documents: InvoiceDocument[];
  item: ItemFill;
  currency: { currency: string; currencyCode: string };
  excludeId: string | null;
  limit?: number;
}) {
  const words = toTypedWords(item.description);
  const newestFirst = [...documents].sort(
    (a, b) => b.updatedAt.getTime() - a.updatedAt.getTime()
  );
  const seen = new Set<string>();
  const suggestions: ItemFill[] = [];

  for (const invoiceDocument of newestFirst) {
    if (suggestions.length === limit) break;
    if (invoiceDocument.id === excludeId) continue;
    if (!isSameCurrency(invoiceDocument.invoiceData, currency)) continue;

    for (const pastItem of invoiceDocument.invoiceData.items) {
      if (suggestions.length === limit) break;

      const description = pastItem.description.trim();

      if (!description) continue;

      const key = toMatchable(description);

      if (seen.has(key)) continue;

      seen.add(key);

      const suggestion: ItemFill = {
        description,
        unit: pastItem.unit.trim(),
        unitPrice: pastItem.unitPrice
      };

      if (isFilledWith(item, suggestion)) continue;
      if (!matchesWords(key, words)) continue;

      suggestions.push(suggestion);
    }
  }

  return suggestions;
}

// The line already reads as the suggestion, so picking it would change
// nothing.
function isFilledWith(item: ItemFill, suggestion: ItemFill) {
  return (
    item.description.trim() === suggestion.description &&
    item.unit.trim() === suggestion.unit &&
    item.unitPrice === suggestion.unitPrice
  );
}
