import { sumBy } from "lodash-es";
import {
  currencyOptions,
  formatCurrency,
  formatCurrencyWithCode,
  getCurrencyCodeForSymbol,
  getCurrencyMarker,
  negativeSign,
  normalizeCurrency
} from "~/consts/currencies";
import type { CurrencyConversion, Invoice, InvoiceTotals } from "~/types";
import { roundCents } from "~/utils/calculate-invoice-totals";
import { formatInvoiceDate } from "~/utils/format-invoice-date";

type CurrencyPair = { currency: string; currencyCode: string };

// A currency's code: the one stored, or a preset's own when none is (an
// invoice saved before codes were, or imported without one, still has "£"
// as GBP, as the currency picker shows it). A custom symbol may have none.
function resolveCurrencyCode({ currency, currencyCode: code }: CurrencyPair) {
  return (
    code.trim().toUpperCase() ||
    getCurrencyCodeForSymbol(normalizeCurrency(currency))
  );
}

// The code that names a currency on the page ("GBP"), or its marker when it
// has no code.
function currencyLabel(pair: CurrencyPair) {
  return resolveCurrencyCode(pair) || getCurrencyMarker(pair.currency);
}

// Two currencies are the same when their codes match. A "$" in USD and a "$"
// in CAD differ; without codes, the symbols decide.
export function isSameCurrency(first: CurrencyPair, second: CurrencyPair) {
  const firstCode = resolveCurrencyCode(first);
  const secondCode = resolveCurrencyCode(second);

  if (firstCode && secondCode) return firstCode === secondCode;

  return (
    normalizeCurrency(first.currency) === normalizeCurrency(second.currency)
  );
}

// The first preset that isn't the invoice's own currency, offered when a
// second currency is added and the stored one would match the invoice's.
export function pickSecondCurrency(invoice: CurrencyPair): CurrencyPair {
  const option =
    currencyOptions.find(
      candidate =>
        !isSameCurrency(invoice, {
          currency: candidate.symbol,
          currencyCode: candidate.code
        })
    ) ?? currencyOptions[0];

  return { currency: option.symbol, currencyCode: option.code };
}

// The conversion when it's switched on and the invoice isn't already in the
// currency it converts to. The rate may still be 0 while it's being filled
// in; it only prints once set.
export function getCurrencyConversion(
  invoice: Pick<
    Invoice,
    "sections" | "currency" | "currencyCode" | "currencyConversion"
  >
): CurrencyConversion | null {
  const target = invoice.currencyConversion;

  if (!invoice.sections.currencyConversion) return null;
  if (isSameCurrency(invoice, target)) return null;

  return {
    rate: Math.max(0, Number(target.rate) || 0),
    fromCode: currencyLabel(invoice),
    toCurrency: target.currency,
    toCode: currencyLabel(target)
  };
}

// An amount in the other currency: the amount times the rate, rounded to two
// decimals.
export function convertAmount(amount: number, rate: number): number {
  return roundCents(amount * rate);
}

// The second currency's sums, each added up from the converted figures above
// it, so its column adds up on the page the way the first currency's does.
// Converting a sum on its own, like every other figure, can leave it a cent
// from its rows.
export function calculateConvertedTotals({
  totals,
  rate
}: {
  totals: InvoiceTotals;
  rate: number;
}) {
  const subtotal = roundCents(
    sumBy(totals.items, item => convertAmount(item.amount, rate))
  );
  const taxAmount = roundCents(
    sumBy(totals.taxGroups, group => convertAmount(group.taxAmount, rate))
  );
  const total = Math.max(
    0,
    roundCents(
      subtotal -
        convertAmount(totals.discountAmount, rate) +
        taxAmount +
        convertAmount(totals.fees, rate)
    )
  );
  const balanceDue = Math.max(
    0,
    roundCents(total - convertAmount(totals.amountPaid, rate))
  );

  return { subtotal, total, balanceDue };
}

// A marker that ends in a letter ("CHF", a custom "Rs") is spaced from the
// figure, so it reads "CHF 6,292.00"; a symbol sits against it, "$9,205.63".
// A negative amount has its sign first, "-$6.25".
export function formatConvertedAmount(
  amount: number,
  conversion: CurrencyConversion
): string {
  return formatInSecondCurrency(
    convertAmount(amount, conversion.rate),
    conversion
  );
}

// An amount already in the second currency, formatted as
// formatConvertedAmount does.
function formatInSecondCurrency(
  converted: number,
  conversion: CurrencyConversion
): string {
  const marker = getCurrencyMarker(conversion.toCurrency);
  const formatted = Math.abs(converted).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
  const sign = negativeSign(converted, formatted);

  return /\p{L}$/u.test(marker)
    ? `${sign}${marker} ${formatted}`
    : `${sign}${marker}${formatted}`;
}

// A total in both currencies, "£7,150.00 / $9,205.63". A sum passes its
// converted figure from calculateConvertedTotals, which adds up its rows.
export function withConvertedAmount(
  value: string,
  amount: number,
  conversion: CurrencyConversion | null,
  convertedAmount?: number
): string {
  if (!conversion) return value;

  const converted = convertedAmount ?? convertAmount(amount, conversion.rate);

  return `${value} / ${formatInSecondCurrency(converted, conversion)}`;
}

// A deduction (a discount, a payment), in both currencies beside a second
// one: "-£500.00 / -$643.75".
export function formatDeduction({
  amount,
  currency,
  conversion
}: {
  amount: number;
  currency: string;
  conversion: CurrencyConversion | null;
}): string {
  const value = `-${formatCurrency(amount, currency)}`;

  if (!conversion) return value;

  return `${value} / -${formatConvertedAmount(amount, conversion)}`;
}

// The grand total, and the balance due that takes its place once a payment is
// recorded. On its own it carries its code, "£7,150.00 GBP", since a
// symbol like "$" can stand for several currencies. Beside a second currency
// it doesn't, "£7,150.00 / $9,205.63": the column headers and the rate line
// already name both.
export function formatInvoiceTotal({
  amount,
  convertedAmount,
  currency,
  currencyCode,
  conversion
}: {
  amount: number;
  // The total in the second currency, from calculateConvertedTotals.
  convertedAmount: number;
  currency: string;
  currencyCode: string;
  conversion: CurrencyConversion | null;
}): string {
  if (!conversion)
    return formatCurrencyWithCode(amount, currency, currencyCode);

  return withConvertedAmount(
    formatCurrency(amount, currency),
    amount,
    conversion,
    convertedAmount
  );
}

export function formatExchangeRate(rate: number): string {
  return rate.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 6,
    useGrouping: false
  });
}

// The line under the totals: "Exchange rate: 1 GBP = 1.2875 USD (Bank of
// England rate, 30 Oct 2026)".
export function buildExchangeRateLine({
  conversion,
  currencyConversion,
  dateFormat
}: {
  conversion: CurrencyConversion;
  currencyConversion: Invoice["currencyConversion"];
  dateFormat: Invoice["dateFormat"];
}): string {
  const source = currencyConversion.source.trim();
  const date = currencyConversion.date
    ? formatInvoiceDate(currencyConversion.date, dateFormat)
    : "";
  const details = [source, date].filter(Boolean);
  const rate = `Exchange rate: 1 ${conversion.fromCode} = ${formatExchangeRate(conversion.rate)} ${conversion.toCode}`;

  return details.length > 0 ? `${rate} (${details.join(", ")})` : rate;
}
