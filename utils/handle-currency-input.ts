import type { InvoiceNumberFormat } from "~/types";
import { toPlainDecimal } from "~/utils/decimal-input";

/**
 * Takes a string value and returns a formatted currency string.
 * Handles inputs like $124.34, 002343, etc.
 * Returns a valid number string 0 or greater without leading zeros, or "" for
 * a cleared field, which reads 0 once it loses focus.
 *
 * The value is read in the invoice's number format: on a 1.234,56 invoice
 * "12,50" is twelve and a half. A currency with no decimals takes none.
 *
 * Pass `currencySymbol` when the value is prefixed with the symbol so it can be
 * stripped before sanitising. This matters for symbols that contain a literal
 * dot (the dirham "د.إ"), which would otherwise survive as a stray decimal
 * point and corrupt the amount.
 */
export function handleCurrencyInput(
  value: string,
  {
    currencySymbol,
    numberFormat,
    decimals
  }: {
    currencySymbol?: string;
    numberFormat: InvoiceNumberFormat;
    decimals: number;
  }
) {
  const withoutSymbol = currencySymbol
    ? value.replace(currencySymbol, "")
    : value;

  // Read the invoice's separators, then drop the grouping, spaces and any
  // other non-numeric characters
  let numericValue = toPlainDecimal(withoutSymbol, {
    numberFormat,
    decimals
  }).replace(/[^0-9.]/g, "");

  // Prevent multiple decimal points
  const decimalCount = numericValue.split(".").length - 1;

  if (decimalCount > 1) {
    numericValue = numericValue.replace(/\./g, (match, offset) =>
      offset === numericValue.indexOf(".") ? match : ""
    );
  }

  // Handle decimal places
  if (numericValue.includes(".")) {
    const [whole, decimal] = numericValue.split(".");
    // Limit decimal places to the currency's
    numericValue = `${whole}.${decimal.slice(0, decimals)}`;
  }

  if (!numericValue) return "";

  // Handle leading zeros and edge cases
  if (numericValue === "." || /^0+$/.test(numericValue)) {
    return "0";
  }

  // Remove leading zeros for whole numbers
  if (numericValue.startsWith("0") && numericValue.length > 1) {
    if (numericValue[1] === ".") {
      // Keep the zero for decimal numbers less than 1 (e.g., 0.42)
      return numericValue;
    } else {
      // Remove leading zeros for numbers like 0123
      return numericValue.replace(/^0+/, "");
    }
  }

  return numericValue;
}
