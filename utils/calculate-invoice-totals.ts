import type { Invoice, InvoiceSections, InvoiceTotals } from "~/types";

// Rounds to whole cents, half up. The product is first trimmed to 15
// significant digits, so binary float noise can't round a half cent the wrong
// way (1.005 * 100 is 100.49999999999999 in floating point).
export function roundCents(value: number): number {
  return Math.round(Number((value * 100).toPrecision(15))) / 100;
}

// Rounds a single line amount to two decimal places, coercing non-numeric
// quantity/price to zero. Shared by the totals calculator and the view-model so
// a line's amount is computed one way everywhere.
export function calculateLineAmount(
  quantity: number,
  unitPrice: number
): number {
  const safeQuantity = Number(quantity) || 0;
  const safeUnitPrice = Number(unitPrice) || 0;

  return roundCents(safeQuantity * safeUnitPrice);
}

// Derives the money totals from an invoice's inputs (items, tax, fees,
// discount, amount paid). Nothing here is persisted: totals are recomputed
// wherever the invoice is rendered, so stored or imported data can never carry
// stale numbers. A pricing row whose section is switched off counts as zero,
// so what the totals add up always matches the rows on the page.
export function calculateInvoiceTotals(
  invoice: Pick<
    Invoice,
    "items" | "tax" | "fees" | "discounts" | "discountType" | "amountPaid"
  > & {
    sections?: Pick<
      InvoiceSections,
      "discounts" | "tax" | "fees" | "amountPaid"
    >;
  }
): InvoiceTotals {
  const sections = invoice.sections;
  const items = invoice.items.map(item => ({
    ...item,
    amount: calculateLineAmount(item.quantity, item.unitPrice)
  }));

  // Sum is rounded explicitly so floating-point drift from summing per-item
  // amounts never leaks into the subtotal.
  const subtotal = roundCents(
    items.reduce((sum, item) => sum + item.amount, 0)
  );

  // A percentage discount is taken off the subtotal; a fixed discount is the
  // entered amount. Either way it comes off the goods and services, so it is
  // clamped to the subtotal: it can never discount fees or tax, or push the
  // total negative.
  const discountValue =
    sections?.discounts === false ? 0 : Number(invoice.discounts) || 0;
  const rawDiscount =
    invoice.discountType === "percentage"
      ? roundCents((subtotal * discountValue) / 100)
      : discountValue;
  const discountAmount = Math.min(Math.max(rawDiscount, 0), subtotal);

  // Tax is charged on the discounted amount, as VAT and sales tax are. A
  // tax-exempt invoice charges no tax regardless of the stored rate, so a
  // reverse-charge or zero-rated invoice reads zero while keeping the rate the
  // user last entered.
  const taxableAmount = roundCents(subtotal - discountAmount);
  const taxAmount =
    invoice.tax.exempt || sections?.tax === false
      ? 0
      : roundCents(
          (taxableAmount * (Number(invoice.tax.percentage) || 0)) / 100
        );

  const fees = sections?.fees === false ? 0 : Number(invoice.fees) || 0;

  const total = Math.max(0, roundCents(taxableAmount + taxAmount + fees));

  // The balance due nets off any recorded payment/deposit. An overpayment
  // reads as a zero balance rather than a negative one.
  const amountPaid =
    sections?.amountPaid === false
      ? 0
      : Math.max(0, Number(invoice.amountPaid) || 0);
  const balanceDue = Math.max(0, roundCents(total - amountPaid));

  return { items, subtotal, taxAmount, discountAmount, total, balanceDue };
}
