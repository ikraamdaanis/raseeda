import type { Invoice } from "~/types";

// Gives each row without an id, or repeating an earlier row's, one taken from
// its place in the list. The same rows get the same ids every time, so opening
// an invoice that was stored without them doesn't read as a change.
function withOwnIds<TRow extends { id: string }>(
  rows: TRow[],
  prefix: string
): TRow[] {
  const taken = new Set(rows.map(row => row.id));
  const seen = new Set<string>();

  return rows.map((row, index) => {
    if (row.id && !seen.has(row.id)) {
      seen.add(row.id);

      return row;
    }

    let id = `${prefix}-${index + 1}`;
    for (let n = 2; taken.has(id); n++) id = `${prefix}-${index + 1}-${n}`;
    taken.add(id);
    seen.add(id);

    return { ...row, id };
  });
}

// Each line item and way to pay is found by its id while editing, so rows from
// a script, an import or a template that left ids out, or repeated one, get
// their own before they're opened. Otherwise editing one row would edit every
// row sharing its id.
export function ensureRowIds(invoice: Invoice): Invoice {
  const items = withOwnIds(invoice.items, "item");
  const methods = withOwnIds(invoice.paymentDetails.methods, "method");
  const isUnchanged =
    items.every((item, index) => item === invoice.items[index]) &&
    methods.every(
      (method, index) => method === invoice.paymentDetails.methods[index]
    );

  if (isUnchanged) return invoice;

  return {
    ...invoice,
    items,
    paymentDetails: { ...invoice.paymentDetails, methods }
  };
}
