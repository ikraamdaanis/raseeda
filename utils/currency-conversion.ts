import {
  currencyOptions,
  getCurrencyMarker,
  normalizeCurrency
} from "~/consts/currencies";
import type { CurrencyConversion, Invoice } from "~/types";
import { roundCents } from "~/utils/calculate-invoice-totals";
import { formatInvoiceDate } from "~/utils/format-invoice-date";

type CurrencyPair = { currency: string; currencyCode: string };

// The code that names a currency on the page ("GBP"), or its marker when no
// code is set.
function currencyLabel({ currency, currencyCode }: CurrencyPair) {
  return currencyCode.trim().toUpperCase() || getCurrencyMarker(currency);
}

// Two currencies are the same when their codes match. A "$" in USD and a "$"
// in CAD differ; without codes, the symbols decide.
export function isSameCurrency(first: CurrencyPair, second: CurrencyPair) {
  const firstCode = first.currencyCode.trim().toUpperCase();
  const secondCode = second.currencyCode.trim().toUpperCase();

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

// A marker that ends in a letter ("CHF", a custom "Rs") is spaced from the
// figure, so it reads "CHF 6,292.00"; a symbol sits against it, "$9,205.63".
export function formatConvertedAmount(
  amount: number,
  conversion: CurrencyConversion
): string {
  const marker = getCurrencyMarker(conversion.toCurrency);
  const formatted = convertAmount(amount, conversion.rate).toLocaleString(
    "en-US",
    { minimumFractionDigits: 2, maximumFractionDigits: 2 }
  );

  return /\p{L}$/u.test(marker)
    ? `${marker} ${formatted}`
    : `${marker}${formatted}`;
}

// A total in both currencies, "£7,150.00 / $9,205.63".
export function withConvertedAmount(
  value: string,
  amount: number,
  conversion: CurrencyConversion | null
): string {
  if (!conversion) return value;

  return `${value} / ${formatConvertedAmount(amount, conversion)}`;
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
