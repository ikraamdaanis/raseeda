import type {
  CurrencyPosition,
  InvoiceFont,
  InvoiceNumberFormat,
  InvoiceTheme,
  MoneyFormat
} from "~/types";
import { fontHasCharacters } from "~/utils/font-coverage";
import { formatNumber } from "~/utils/format-number";

/**
 * The invoice stores a currency symbol directly, deduped by symbol so the
 * various dollar/yen currencies collapse to a single entry. Each preset carries
 * a default ISO code (the most common currency for that symbol) so a bare, and
 * possibly ambiguous, symbol like "$" is still stored with an explicit code the
 * user can adjust. Anything outside this list is entered through the
 * custom-symbol modal.
 */
export const currencyOptions: {
  symbol: string;
  code: string;
  label: string;
}[] = [
  { symbol: "$", code: "USD", label: "Dollar" },
  { symbol: "£", code: "GBP", label: "Pound" },
  { symbol: "€", code: "EUR", label: "Euro" },
  { symbol: "¥", code: "JPY", label: "Yen" },
  { symbol: "CHF", code: "CHF", label: "Franc" },
  { symbol: "⃁", code: "SAR", label: "Riyal" },
  { symbol: "د.إ", code: "AED", label: "Dirham" }
];

/**
 * The default ISO code for a preset symbol, or "" for a custom/unknown symbol.
 * Used when a preset currency is chosen so the stored code stays in sync.
 */
export function getCurrencyCodeForSymbol(symbol: string): string {
  return currencyOptions.find(option => option.symbol === symbol)?.code ?? "";
}

/**
 * Older invoices stored a currency code (e.g. "GBP"). Map those to the deduped
 * symbol so previously saved documents keep rendering correctly.
 */
const LEGACY_CODE_TO_SYMBOL: Record<string, string> = {
  GBP: "£",
  USD: "$",
  AUD: "$",
  CAD: "$",
  HKD: "$",
  SGD: "$",
  EUR: "€",
  JPY: "¥",
  CNY: "¥",
  CHF: "CHF",
  SAR: "⃁",
  AED: "د.إ"
};

export function normalizeCurrency(currency: string): string {
  return LEGACY_CODE_TO_SYMBOL[currency] ?? currency;
}

// The ISO code a currency is printed with: the one stored, or a preset's own
// when none is (an invoice saved before codes were, or imported without one,
// still has "£" as GBP, as the currency picker shows it). A custom symbol may
// have none.
export function resolveCurrencyCode({
  currency,
  currencyCode
}: {
  currency: string;
  currencyCode: string;
}): string {
  return (
    currencyCode.trim().toUpperCase() ||
    getCurrencyCodeForSymbol(normalizeCurrency(currency))
  );
}

/**
 * The marker shown with amounts. It's the currency's symbol when the invoice's
 * font draws every character in it, and its ISO code otherwise, so a symbol
 * the font lacks (the Riyal sign, the Arabic-script Dirham, "₹" in Lora)
 * prints as "SAR", "AED" or "INR" rather than a box. The editor and the PDF
 * read the same coverage table, so they always agree. A custom symbol with no
 * code is printed as typed. Legacy codes are normalised to their symbol
 * first; the stored currency itself is left untouched.
 */
export function getCurrencyMarker({
  currency,
  currencyCode,
  font
}: {
  currency: string;
  currencyCode: string;
  font: InvoiceFont;
}): string {
  const symbol = normalizeCurrency(currency);

  if (fontHasCharacters(font, symbol)) return symbol;

  return resolveCurrencyCode({ currency, currencyCode }) || symbol;
}

// ISO 4217's currencies with no minor unit. Their amounts print, and add up,
// in whole units: ¥1,235, not ¥1,235.00. Three-decimal currencies (BHD, KWD,
// OMR, JOD, TND) keep two for now.
export const ZERO_DECIMAL_CURRENCIES = new Set([
  "BIF",
  "CLP",
  "DJF",
  "GNF",
  "ISK",
  "JPY",
  "KMF",
  "KRW",
  "PYG",
  "RWF",
  "UGX",
  "UYI",
  "VND",
  "VUV",
  "XAF",
  "XOF",
  "XPF"
]);

// A currency's decimals, from its ISO code: 0 for the zero-decimal currencies,
// 2 for everything else, a custom currency with no code included.
export function getCurrencyDecimals(currency: {
  currency: string;
  currencyCode: string;
}): number {
  return ZERO_DECIMAL_CURRENCIES.has(resolveCurrencyCode(currency)) ? 0 : 2;
}

// How an invoice writes its amounts, from its currency, font, number format
// and currency position.
export function getMoneyFormat(invoice: {
  currency: string;
  currencyCode: string;
  theme: Pick<InvoiceTheme, "font">;
  numberFormat: InvoiceNumberFormat;
  currencyPosition: CurrencyPosition;
}): MoneyFormat {
  return {
    marker: getCurrencyMarker({
      currency: invoice.currency,
      currencyCode: invoice.currencyCode,
      font: invoice.theme.font
    }),
    numberFormat: invoice.numberFormat,
    position: invoice.currencyPosition,
    decimals: getCurrencyDecimals(invoice)
  };
}

// Puts the marker beside a figure. After it, the marker is spaced with a
// no-break space ("1.234,56 €", "1 234,56 zł"). Before it, a marker that ends
// in a letter is spaced ("CHF 1’234.50"), a symbol sits against the figure
// ("$1,234.56"). The sign of a negative amount comes first either way
// ("-1.234,56 €", "-$6.25").
export function placeMarker({
  sign,
  figure,
  marker,
  position
}: {
  sign: string;
  figure: string;
  marker: string;
  position: CurrencyPosition;
}): string {
  if (!marker) return `${sign}${figure}`;
  if (position === "after") return `${sign}${figure}\u00a0${marker}`;

  return /\p{L}$/u.test(marker)
    ? `${sign}${marker}\u00a0${figure}`
    : `${sign}${marker}${figure}`;
}

// A negative amount (a credit line, its tax) reads "-£100.00", the sign ahead
// of the marker. One that rounds to nothing has no sign.
export function formatCurrency(amount: number, money: MoneyFormat): string {
  const figure = formatNumber(amount, money);

  return placeMarker({
    sign: negativeSign(amount, figure),
    figure,
    marker: money.marker,
    position: money.position
  });
}

export function negativeSign(amount: number, formatted: string): string {
  return amount < 0 && /[1-9]/.test(formatted) ? "-" : "";
}

/**
 * Formats an amount with the ISO code appended (e.g. "£115.50 GBP") so a bare,
 * ambiguous symbol like "$" is disambiguated on the document. The suffix is
 * skipped when no code is set, and when the marker already is the code (CHF,
 * and a symbol the font can't draw), which would otherwise repeat it:
 * "CHF115.50 CHF".
 */
export function formatCurrencyWithCode(
  amount: number,
  money: MoneyFormat,
  currencyCode: string
): string {
  const formatted = formatCurrency(amount, money);
  const code = currencyCode.trim().toUpperCase();

  if (!code || money.marker === code) return formatted;

  return `${formatted} ${code}`;
}
