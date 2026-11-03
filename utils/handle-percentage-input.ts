/**
 * Takes a string value and returns a formatted percentage string.
 * Allows up to 2 decimal places. The whole-number part is limited to two
 * digits, so an overshoot like "400" is truncated to "40" rather than
 * clamped to 100. An exact "100" is the single allowed three-digit value so
 * the full 0-100 range stays reachable. A cleared field stays empty while
 * typing; it reads 0 once it loses focus.
 */
export function handlePercentageInput(value: string) {
  let numericValue = value.replace(/[^0-9.]/g, "");

  if (numericValue === "") return "";
  // A leading dot starts a fraction, so the next digit makes "0.5", not "5".
  if (numericValue === ".") return "0.";

  // Collapse multiple decimal points down to the first one.
  const firstDotIndex = numericValue.indexOf(".");

  if (firstDotIndex !== -1) {
    numericValue =
      numericValue.slice(0, firstDotIndex + 1) +
      numericValue.slice(firstDotIndex + 1).replace(/\./g, "");
  }

  const hasDecimal = numericValue.includes(".");
  let [wholePart, decimalPart = ""] = numericValue.split(".");

  // Strip leading zeros, keeping a single "0".
  if (wholePart.length > 1) {
    wholePart = wholePart.replace(/^0+/, "") || "0";
  }

  // Limit the whole-number part to two digits (truncate the overshoot),
  // except for an exact "100".
  if (wholePart.length > 2) {
    if (wholePart.startsWith("100")) {
      return "100";
    }

    wholePart = wholePart.slice(0, 2);
  }

  // Limit decimal places to 2.
  decimalPart = decimalPart.slice(0, 2);

  return hasDecimal ? `${wholePart}.${decimalPart}` : wholePart;
}
