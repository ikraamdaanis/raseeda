// Coerce raw input into a decimal draft string: drop everything that is not a
// digit or a dot (this also strips any currency symbol), keep only the first
// dot, cap at two decimal places, and remove leading zeros. A minus typed
// before the figure stays, so a credit keeps its sign while it's edited.
export function normalizeDecimalInput(value: string): string {
  const firstDigit = value.search(/[0-9.]/);
  const isNegative = value
    .slice(0, firstDigit === -1 ? value.length : firstDigit)
    .includes("-");
  let numericValue = value.replace(/[^0-9.]/g, "");
  const firstDot = numericValue.indexOf(".");

  if (firstDot !== -1) {
    const wholePart = numericValue.slice(0, firstDot);
    const decimalPart = numericValue
      .slice(firstDot + 1)
      .replace(/\./g, "")
      .slice(0, 2);

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

// A draft as its field shows it, with the currency: "-£150", the sign first,
// as the figure reads at rest.
export function formatDecimalDraft(draft: string, currencySymbol: string) {
  return draft.startsWith("-")
    ? `-${currencySymbol}${draft.slice(1)}`
    : `${currencySymbol}${draft}`;
}
