import type { Invoice } from "~/types";

// Each line item and way to pay is found by its id while editing, so data from
// a script, an import or a template that left them out, or repeated one, gets
// ids of its own before it's opened. Otherwise editing one row would edit
// every row sharing its id.
export function ensureRowIds(invoice: Invoice): Invoice {
  const { methods } = invoice.paymentDetails;
  const methodIds = methods.map(method => method.id);
  const hasAllItemIds = invoice.items.every(item => item.id);
  const hasAllMethodIds =
    methodIds.every(Boolean) && new Set(methodIds).size === methodIds.length;

  if (hasAllItemIds && hasAllMethodIds) return invoice;

  return {
    ...invoice,
    items: invoice.items.map(item => ({
      ...item,
      id: item.id || crypto.randomUUID()
    })),
    paymentDetails: {
      ...invoice.paymentDetails,
      methods: methods.map((method, index) => ({
        ...method,
        id:
          method.id && methodIds.indexOf(method.id) === index
            ? method.id
            : crypto.randomUUID()
      }))
    }
  };
}
