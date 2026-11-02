/**
 * Takes a string value and returns a formatted currency string.
 * Handles inputs like $124.34, 002343, etc.
 * Returns a valid number string 0 or greater without leading zeros, or "" for
 * a cleared field, which reads 0 once it loses focus.
 *
 * Pass `currencySymbol` when the value is prefixed with the symbol so it can be
 * stripped before sanitising. This matters for symbols that contain a literal
 * dot (the dirham "د.إ"), which would otherwise survive as a stray decimal
 * point and corrupt the amount.
 */
export function handleCurrencyInput(value: string, currencySymbol?: string) {
  const withoutSymbol = currencySymbol
    ? value.replace(currencySymbol, "")
    : value;

  // Remove commas and any other non-numeric characters
  let numericValue = withoutSymbol.replace(/[^0-9.]/g, "");

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
    // Limit decimal places to 2
    numericValue = `${whole}.${decimal.slice(0, 2)}`;
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
