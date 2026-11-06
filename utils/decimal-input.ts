import { placeMarker } from "~/consts/currencies";
import type { InvoiceNumberFormat, MoneyFormat } from "~/types";
import {
  formatPlainNumber,
  getDecimalSeparator,
  roundToDecimals
} from "~/utils/format-number";

// Reads a typed figure in the invoice's number format as a plain decimal with
// a dot: the format's decimal separator is the decimal point, and its
// grouping separator is dropped, so on a 1.234,56 invoice "12,50" reads
// "12.50" and "1.250" reads "1250". On a 1,234.56 invoice that's a comma
// dropped, as always. A currency with no decimals ends the figure at its
// decimal separator, so a pasted "10.5" on a yen invoice reads 10, never 105.
// Spaces, apostrophes and anything else are left for the caller to strip.
export function toPlainDecimal(
  value: string,
  {
    numberFormat,
    decimals
  }: { numberFormat: InvoiceNumberFormat; decimals: number }
): string {
  const isDecimalComma = getDecimalSeparator(numberFormat) === ",";
  const plain = isDecimalComma
    ? value.replace(/\./g, "").replace(/,/g, ".")
    : value.replace(/,/g, "");

  return decimals === 0 ? plain.split(".")[0] : plain;
}

// Coerce raw input into a decimal draft string: read it in the invoice's
// number format, drop everything that is not a digit or a dot (this also
// strips any currency symbol), keep only the first dot, cap at the currency's
// decimal places, and remove leading zeros. A minus typed before the figure
// stays, so a credit keeps its sign while it's edited.
export function normalizeDecimalInput(
  value: string,
  format: { numberFormat: InvoiceNumberFormat; decimals: number }
): string {
  const plain = toPlainDecimal(value, format);
  const firstDigit = plain.search(/[0-9.]/);
  const isNegative = plain
    .slice(0, firstDigit === -1 ? plain.length : firstDigit)
    .includes("-");
  let numericValue = plain.replace(/[^0-9.]/g, "");
  const firstDot = numericValue.indexOf(".");

  if (firstDot !== -1) {
    const wholePart = numericValue.slice(0, firstDot);
    const decimalPart = numericValue
      .slice(firstDot + 1)
      .replace(/\./g, "")
      .slice(0, format.decimals);

    numericValue = `${wholePart}.${decimalPart}`;
  }

  if (
    numericValue.length > 1 &&
    numericValue.startsWith("0") &&
    !numericValue.startsWith("0.")
  ) {
    numericValue = numericValue.replace(/^0+/, "");
  }

  return isNegative ? `-${numericValue}` : numericValue;
}

// An in-progress draft like "", "." or "-" has no numeric value yet, so it
// commits as 0, and so does "-0", rather than a negative zero.
export function parseDecimalDraft(draft: string): number {
  const number = Number(draft);

  return Number.isNaN(number) || number === 0 ? 0 : number;
}

// A draft as its field shows it, with the currency on its side and the
// invoice's decimal separator: "-£150", "12,5 €", the sign first, as the
// figure reads at rest.
export function formatDecimalDraft(draft: string, money: MoneyFormat) {
  const isNegative = draft.startsWith("-");
  // A zero-decimal invoice's stored amount can still have a fraction (a price
  // set before the currency changed to yen), which it prints whole.
  const shown =
    money.decimals === 0 && draft.includes(".")
      ? String(roundToDecimals(Math.abs(Number(draft)) || 0, 0))
      : isNegative
        ? draft.slice(1)
        : draft;

  return placeMarker({
    sign: isNegative ? "-" : "",
    figure: formatPlainNumber(shown, money.numberFormat),
    marker: money.marker,
    position: money.position
  });
}
