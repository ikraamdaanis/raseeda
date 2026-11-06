import type { InvoiceNumberFormat } from "~/types";

// Each format's grouping and decimal separators. The space is U+00A0 and the
// apostrophe U+2019, which every invoice font has; Intl's French output groups
// with U+202F, which none has, so the PDF would print a box in every amount.
const SEPARATORS: Record<
  InvoiceNumberFormat,
  { group: string; decimal: "." | "," }
> = {
  "comma-dot": { group: ",", decimal: "." },
  "dot-comma": { group: ".", decimal: "," },
  "space-comma": { group: " ", decimal: "," },
  "apostrophe-dot": { group: "’", decimal: "." },
  indian: { group: ",", decimal: "." }
};

export function getDecimalSeparator(numberFormat: InvoiceNumberFormat) {
  return SEPARATORS[numberFormat].decimal;
}

// Groups the digits of a whole number: in threes, or for the Indian format
// the last three and then in twos (12,34,567).
function groupDigits(digits: string, numberFormat: InvoiceNumberFormat) {
  const { group } = SEPARATORS[numberFormat];

  if (numberFormat === "indian" && digits.length > 3) {
    const head = digits.slice(0, -3);
    const tail = digits.slice(-3);

    return `${head.replace(/\B(?=(\d{2})+$)/g, group)}${group}${tail}`;
  }

  return digits.replace(/\B(?=(\d{3})+$)/g, group);
}

// Rounds to a number of decimals, a half away from zero. The scaled value is
// first trimmed to 15 significant digits, so binary float noise can't round a
// half the wrong way (1.005 * 100 is 100.49999999999999 in floating point).
export function roundToDecimals(value: number, decimals: number): number {
  const scale = 10 ** decimals;
  const scaled = Number((Math.abs(value) * scale).toPrecision(15));

  return (Math.sign(value) * Math.round(scaled)) / scale;
}

// A figure with grouped digits and a fixed number of decimals, without a sign:
// "1.234,56" or "1,235". Callers place the sign and the currency.
export function formatNumber(
  value: number,
  {
    numberFormat,
    decimals
  }: { numberFormat: InvoiceNumberFormat; decimals: number }
): string {
  const [whole, fraction] = roundToDecimals(Math.abs(value), decimals)
    .toFixed(decimals)
    .split(".");
  const grouped = groupDigits(whole, numberFormat);

  return fraction
    ? `${grouped}${SEPARATORS[numberFormat].decimal}${fraction}`
    : grouped;
}

// A number as it was entered, with the format's decimal separator and no
// grouping: a quantity ("1,5"), a tax rate ("7,5") or an exchange rate.
export function formatPlainNumber(
  value: number | string,
  numberFormat: InvoiceNumberFormat
): string {
  return String(value).replace(".", SEPARATORS[numberFormat].decimal);
}
