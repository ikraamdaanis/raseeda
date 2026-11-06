import { getCurrencyDecimals } from "~/consts/currencies";
import type {
  Invoice,
  InvoiceItem,
  InvoiceItemTax,
  InvoiceItemWithAmount,
  InvoiceSections,
  InvoiceTaxGroup,
  InvoiceTotals
} from "~/types";
import { roundToDecimals } from "~/utils/format-number";

// Rounds a single line amount to the currency's decimals (two, or none for
// yen), coercing non-numeric quantity/price to zero. Shared by the totals
// calculator and the view-model so a line's amount is computed one way
// everywhere. Halves round away from zero, so a credit rounds the same way as
// the sale it reverses (-5.005 to -5.01, as 5.005 to 5.01).
export function calculateLineAmount(
  quantity: number,
  unitPrice: number,
  decimals: number
): number {
  const safeQuantity = Number(quantity) || 0;
  const safeUnitPrice = Number(unitPrice) || 0;

  return roundToDecimals(safeQuantity * safeUnitPrice, decimals);
}

// The rate a line is taxed at: its own while the invoice's tax is per line
// and it has one, otherwise the invoice's. An exempt line's rate reads 0, since
// the one stored is ignored.
export function getLineTax(
  item: Pick<InvoiceItem, "tax">,
  tax: Pick<Invoice["tax"], "percentage" | "exempt" | "perLine">
): InvoiceItemTax {
  const source = tax.perLine && item.tax ? item.tax : tax;

  if (source.exempt) return { percentage: 0, exempt: true };

  return { percentage: Number(source.percentage) || 0, exempt: false };
}

// Exempt is a group of its own, apart from 0%, as VAT returns report them.
function getTaxKey(lineTax: InvoiceItemTax): string {
  return lineTax.exempt ? "exempt" : String(lineTax.percentage);
}

// The lines sharing a rate, added up: highest rate first, then 0%, then
// exempt. A line with no amount (a blank row) joins no group.
function groupLinesByTax(
  items: InvoiceItemWithAmount[],
  tax: Invoice["tax"],
  round: (value: number) => number
): (InvoiceItemTax & { subtotal: number })[] {
  const groups = new Map<string, InvoiceItemTax & { subtotal: number }>();

  for (const item of items) {
    if (item.amount === 0) continue;

    const lineTax = getLineTax(item, tax);
    const key = getTaxKey(lineTax);
    const group = groups.get(key);

    if (group) {
      group.subtotal += item.amount;
    } else {
      groups.set(key, { ...lineTax, subtotal: item.amount });
    }
  }

  return [...groups.values()]
    .map(group => ({ ...group, subtotal: round(group.subtotal) }))
    .sort(
      (a, b) =>
        Number(a.exempt) - Number(b.exempt) || b.percentage - a.percentage
    );
}

// Splits the discount across the groups that net positive, in proportion to
// their subtotals, each share rounded to the currency's smallest unit. A
// group that nets negative (a credit at its own rate) takes none. The rounded
// shares can miss the discount by a cent or so; the largest group takes the
// difference, so they always add up to it exactly.
function splitDiscount(
  subtotals: number[],
  discount: number,
  round: (value: number) => number
): number[] {
  const positiveTotal = subtotals.reduce(
    (sum, subtotal) => (subtotal > 0 ? sum + subtotal : sum),
    0
  );

  if (discount === 0 || positiveTotal <= 0) return subtotals.map(() => 0);

  const shares = subtotals.map(subtotal =>
    subtotal > 0 ? round((discount * subtotal) / positiveTotal) : 0
  );
  const leftover = round(
    discount - shares.reduce((sum, share) => sum + share, 0)
  );
  const largest = subtotals.indexOf(Math.max(...subtotals));

  shares[largest] = round(shares[largest] + leftover);

  return shares;
}

// Derives the money totals from an invoice's inputs (items, tax, fees,
// discount, amount paid). Nothing here is persisted: totals are recomputed
// wherever the invoice is rendered, so stored or imported data can never carry
// stale numbers. A pricing row whose section is switched off counts as zero,
// so what the totals add up always matches the rows on the page.
// Sums round to the currency's decimals, so a yen invoice's lines add up to
// its printed total in whole yen.
export function calculateInvoiceTotals(
  invoice: Pick<
    Invoice,
    | "items"
    | "tax"
    | "fees"
    | "discounts"
    | "discountType"
    | "amountPaid"
    | "currency"
    | "currencyCode"
  > & {
    sections?: Pick<
      InvoiceSections,
      "discounts" | "tax" | "fees" | "amountPaid"
    >;
  }
): InvoiceTotals {
  const sections = invoice.sections;
  const decimals = getCurrencyDecimals(invoice);
  const round = (value: number) => roundToDecimals(value, decimals);
  const items = invoice.items.map(item => ({
    ...item,
    amount: calculateLineAmount(item.quantity, item.unitPrice, decimals)
  }));

  // Sum is rounded explicitly so floating-point drift from summing per-item
  // amounts never leaks into the subtotal.
  const subtotal = round(items.reduce((sum, item) => sum + item.amount, 0));

  // A percentage discount is taken off the subtotal; a fixed discount is the
  // entered amount. Either way it comes off the goods and services, so it is
  // clamped to the subtotal: it can never discount fees or tax, or push the
  // total negative. A subtotal that nets negative (all credit) takes none.
  const discountValue =
    sections?.discounts === false ? 0 : Number(invoice.discounts) || 0;
  const rawDiscount =
    invoice.discountType === "percentage"
      ? round((subtotal * discountValue) / 100)
      : round(discountValue);
  const discountAmount = Math.min(
    Math.max(rawDiscount, 0),
    Math.max(subtotal, 0)
  );

  // Tax is charged on the discounted amount, as VAT and sales tax are, one
  // rate at a time: each group of lines sharing a rate takes its share of the
  // discount and is taxed, and rounded, as a whole. With one rate that's
  // exactly the subtotal less the discount, taxed once. An exempt group
  // charges no tax whatever rate is stored, so a reverse-charge or zero-rated
  // invoice reads zero while keeping the rate the user last entered.
  const taxableAmount = round(subtotal - discountAmount);
  const lineGroups = groupLinesByTax(items, invoice.tax, round);
  const discountShares = splitDiscount(
    lineGroups.map(group => group.subtotal),
    discountAmount,
    round
  );
  const taxGroups: InvoiceTaxGroup[] = lineGroups.map((group, index) => {
    const groupTaxable = round(group.subtotal - discountShares[index]);

    return {
      percentage: group.percentage,
      exempt: group.exempt,
      taxableAmount: groupTaxable,
      taxAmount:
        group.exempt || sections?.tax === false
          ? 0
          : round((groupTaxable * group.percentage) / 100)
    };
  });
  const taxAmount = round(
    taxGroups.reduce((sum, group) => sum + group.taxAmount, 0)
  );

  // Typed amounts are rounded as they print, so a fee of 10.5 on a yen
  // invoice adds what its row shows, ¥11.
  const fees = sections?.fees === false ? 0 : round(Number(invoice.fees) || 0);

  const total = Math.max(0, round(taxableAmount + taxAmount + fees));

  // The balance due nets off any recorded payment/deposit. An overpayment
  // reads as a zero balance rather than a negative one.
  const amountPaid =
    sections?.amountPaid === false
      ? 0
      : Math.max(0, round(Number(invoice.amountPaid) || 0));
  const balanceDue = Math.max(0, round(total - amountPaid));

  return {
    items,
    subtotal,
    taxGroups,
    taxAmount,
    discountAmount,
    fees,
    amountPaid,
    total,
    balanceDue
  };
}
