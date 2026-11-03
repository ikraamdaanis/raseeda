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

/**
 * Some currency symbols have no glyph in the latin-subset webfonts used for PDF
 * generation, and are missing from most OS fonts too, so they render as a tofu
 * box in both the PDF and the editor preview. The Riyal sign (U+20C1) and the
 * Arabic-script Dirham symbol fall in this bucket. We show a legible ASCII code
 * for them instead, so money stays readable everywhere it is formatted.
 */
const SYMBOL_TO_DISPLAY_MARKER: Record<string, string> = {
  "⃁": "SAR",
  "د.إ": "AED"
};

/**
 * Resolves the stored currency to the marker shown before amounts. Legacy codes
 * are normalised to their symbol first, then any tofu-prone symbol is swapped
 * for its ASCII code. The stored currency value itself is left untouched, so the
 * picker selection and saved invoices keep working.
 */
export function getCurrencyMarker(currency: string): string {
  const symbol = normalizeCurrency(currency);

  return SYMBOL_TO_DISPLAY_MARKER[symbol] ?? symbol;
}

// A negative amount (a credit line, its tax) reads "-£100.00", the sign ahead
// of the marker. One that rounds to nothing has no sign.
export function formatCurrency(amount: number, currency: string): string {
  const formatted = Math.abs(amount).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });

  return `${negativeSign(amount, formatted)}${getCurrencyMarker(currency)}${formatted}`;
}

export function negativeSign(amount: number, formatted: string): string {
  return amount < 0 && /[1-9]/.test(formatted) ? "-" : "";
}

/**
 * Formats an amount with the ISO code appended (e.g. "£115.50 GBP") so a bare,
 * ambiguous symbol like "$" is disambiguated on the document. The suffix is
 * skipped when no code is set, and when the rendered marker already is the code
 * (CHF, and the SAR/AED tofu-replacement markers), which would otherwise repeat
 * it: "CHF115.50 CHF".
 */
export function formatCurrencyWithCode(
  amount: number,
  currency: string,
  currencyCode: string
): string {
  const formatted = formatCurrency(amount, currency);
  const code = currencyCode.trim();
  if (!code || getCurrencyMarker(currency) === code) return formatted;

  return `${formatted} ${code}`;
}
