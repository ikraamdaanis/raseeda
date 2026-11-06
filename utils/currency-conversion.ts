import { sumBy } from "lodash-es";
import {
  currencyOptions,
  formatCurrency,
  formatCurrencyWithCode,
  getCurrencyDecimals,
  getCurrencyMarker,
  normalizeCurrency,
  resolveCurrencyCode
} from "~/consts/currencies";
import type {
  CurrencyConversion,
  Invoice,
  InvoiceNumberFormat,
  InvoiceTotals,
  MoneyFormat
} from "~/types";
import { formatInvoiceDate } from "~/utils/format-invoice-date";
import { formatPlainNumber, roundToDecimals } from "~/utils/format-number";

type CurrencyPair = { currency: string; currencyCode: string };

// The code that names a currency on the page ("GBP"), or its symbol when it
// has no code.
function currencyLabel(pair: CurrencyPair) {
  return resolveCurrencyCode(pair) || normalizeCurrency(pair.currency);
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
  > & { theme: Pick<Invoice["theme"], "font"> }
): CurrencyConversion | null {
  const target = invoice.currencyConversion;

  if (!invoice.sections.currencyConversion) return null;
  if (isSameCurrency(invoice, target)) return null;

  return {
    rate: Math.max(0, Number(target.rate) || 0),
    fromCode: currencyLabel(invoice),
    toCurrency: target.currency,
    toCode: currencyLabel(target),
    toMarker: getCurrencyMarker({
      currency: target.currency,
      currencyCode: target.currencyCode,
      font: invoice.theme.font
    }),
    toDecimals: getCurrencyDecimals(target)
  };
}

// An amount in the other currency: the amount times the rate, rounded to that
// currency's decimals.
export function convertAmount(
  amount: number,
  conversion: Pick<CurrencyConversion, "rate" | "toDecimals">
): number {
  return roundToDecimals(amount * conversion.rate, conversion.toDecimals);
}

const NO_CONVERTED_TOTALS = { subtotal: 0, total: 0, balanceDue: 0 };

// The second currency's sums, each added up from the converted figures above
// it, so its column adds up on the page the way the first currency's does.
// Converting a sum on its own, like every other figure, can leave it a cent
// from its rows. All 0 without a conversion.
export function calculateConvertedTotals({
  totals,
  conversion
}: {
  totals: InvoiceTotals;
  conversion: Pick<CurrencyConversion, "rate" | "toDecimals"> | null;
}) {
  if (!conversion) return NO_CONVERTED_TOTALS;

  const round = (value: number) =>
    roundToDecimals(value, conversion.toDecimals);
  const convert = (amount: number) => convertAmount(amount, conversion);
  const subtotal = round(sumBy(totals.items, item => convert(item.amount)));
  const taxAmount = round(
    sumBy(totals.taxGroups, group => convert(group.taxAmount))
  );
  const total = Math.max(
    0,
    round(
      subtotal -
        convert(totals.discountAmount) +
        taxAmount +
        convert(totals.fees)
    )
  );
  const balanceDue = Math.max(0, round(total - convert(totals.amountPaid)));

  return { subtotal, total, balanceDue };
}

// The second currency's amounts are written in the invoice's number format and
// currency position, with that currency's own marker and decimals.
function secondCurrencyFormat(
  conversion: CurrencyConversion,
  money: MoneyFormat
): MoneyFormat {
  return {
    marker: conversion.toMarker,
    numberFormat: money.numberFormat,
    position: money.position,
    decimals: conversion.toDecimals
  };
}

// An amount converted and written in the second currency: "$9,205.63",
// "CHF 6,292.00", "-$6.25".
export function formatConvertedAmount(
  amount: number,
  conversion: CurrencyConversion,
  money: MoneyFormat
): string {
  return formatCurrency(
    convertAmount(amount, conversion),
    secondCurrencyFormat(conversion, money)
  );
}

// A total in both currencies, "£7,150.00 / $9,205.63". A sum passes its
// converted figure from calculateConvertedTotals, which adds up its rows.
export function withConvertedAmount({
  value,
  amount,
  conversion,
  money,
  convertedAmount
}: {
  value: string;
  amount: number;
  conversion: CurrencyConversion | null;
  money: MoneyFormat;
  convertedAmount?: number;
}): string {
  if (!conversion) return value;

  const converted = convertedAmount ?? convertAmount(amount, conversion);

  return `${value} / ${formatCurrency(converted, secondCurrencyFormat(conversion, money))}`;
}

// A deduction (a discount, a payment), in both currencies beside a second
// one: "-£500.00 / -$643.75".
export function formatDeduction({
  amount,
  money,
  conversion
}: {
  amount: number;
  money: MoneyFormat;
  conversion: CurrencyConversion | null;
}): string {
  const value = `-${formatCurrency(amount, money)}`;

  if (!conversion) return value;

  return `${value} / -${formatConvertedAmount(amount, conversion, money)}`;
}

// The grand total, and the balance due that takes its place once a payment is
// recorded. On its own it carries its code, "£7,150.00 GBP", since a
// symbol like "$" can stand for several currencies. Beside a second currency
// it doesn't, "£7,150.00 / $9,205.63": the column headers and the rate line
// already name both.
export function formatInvoiceTotal({
  amount,
  convertedAmount,
  money,
  currencyCode,
  conversion
}: {
  amount: number;
  // The total in the second currency, from calculateConvertedTotals.
  convertedAmount: number;
  money: MoneyFormat;
  currencyCode: string;
  conversion: CurrencyConversion | null;
}): string {
  if (!conversion) return formatCurrencyWithCode(amount, money, currencyCode);

  return withConvertedAmount({
    value: formatCurrency(amount, money),
    amount,
    conversion,
    money,
    convertedAmount
  });
}

// A rate as it's typed and printed: up to six decimals, no grouping, in the
// invoice's decimal separator ("1,2875" on a 1.234,56 invoice).
export function formatExchangeRate(
  rate: number,
  numberFormat: InvoiceNumberFormat
): string {
  const digits = roundToDecimals(rate, 6)
    .toFixed(6)
    .replace(/(\.\d\d\d*?)0+$/, "$1");

  return formatPlainNumber(digits, numberFormat);
}

// The line under the totals: "Exchange rate: 1 GBP = 1.2875 USD (Bank of
// England rate, 30 Oct 2026)".
export function buildExchangeRateLine({
  conversion,
  currencyConversion,
  dateFormat,
  numberFormat
}: {
  conversion: CurrencyConversion;
  currencyConversion: Invoice["currencyConversion"];
  dateFormat: Invoice["dateFormat"];
  numberFormat: InvoiceNumberFormat;
}): string {
  const source = currencyConversion.source.trim();
  const date = currencyConversion.date
    ? formatInvoiceDate(currencyConversion.date, dateFormat)
    : "";
  const details = [source, date].filter(Boolean);
  const rate = `Exchange rate: 1 ${conversion.fromCode} = ${formatExchangeRate(conversion.rate, numberFormat)} ${conversion.toCode}`;

  return details.length > 0 ? `${rate} (${details.join(", ")})` : rate;
}
