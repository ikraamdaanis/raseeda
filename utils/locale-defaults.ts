import { STORED_INVOICE_FORMATS } from "~/schema/invoice";
import type {
  CurrencyPosition,
  InvoiceNumberFormat,
  InvoicePaperSize
} from "~/types";

// Where Letter is the paper size, as CLDR's paper-size territories have it.
// Everywhere else is A4. Intl has nothing for paper, so this stays a list.
const LETTER_REGIONS = new Set([
  "BZ",
  "CA",
  "CL",
  "CO",
  "CR",
  "GT",
  "MX",
  "NI",
  "PA",
  "PH",
  "PR",
  "SV",
  "US",
  "VE"
]);

// Big enough for every grouping to show: 1,234,567.89 or 12,34,567.89.
const SAMPLE_AMOUNT = 1234567.89;

// Browsers differ in which space (U+0020, U+00A0, U+202F) and which
// apostrophe (U+0027, U+2019) a locale groups with, so match the kind.
function getSeparatorKind(separator: string) {
  if (separator === "," || separator === ".") return separator;
  if (/^\s$/.test(separator)) return "space";
  if (separator === "'" || separator === "’") return "apostrophe";

  return null;
}

function getNumberFormat(
  parts: Intl.NumberFormatPart[]
): InvoiceNumberFormat | null {
  const group = parts.find(part => part.type === "group")?.value ?? "";
  const decimal = parts.find(part => part.type === "decimal")?.value ?? "";
  const integers = parts.filter(part => part.type === "integer");
  const groupKind = getSeparatorKind(group);
  const decimalKind = getSeparatorKind(decimal);

  if (groupKind === "," && decimalKind === ".") {
    return integers.length > 2 && integers[1]?.value.length === 2
      ? "indian"
      : "comma-dot";
  }

  if (groupKind === "." && decimalKind === ",") return "dot-comma";
  if (groupKind === "space" && decimalKind === ",") return "space-comma";
  if (groupKind === "apostrophe" && decimalKind === ".") {
    return "apostrophe-dot";
  }

  return null;
}

function getCurrencyPosition(
  parts: Intl.NumberFormatPart[]
): CurrencyPosition | null {
  const currencyIndex = parts.findIndex(part => part.type === "currency");
  const integerIndex = parts.findIndex(part => part.type === "integer");

  if (currencyIndex === -1 || integerIndex === -1) return null;

  return currencyIndex < integerIndex ? "before" : "after";
}

// The locale the browser's language names, or none when it isn't a valid
// tag or Intl has no data for it ("xx").
function getLocale(tag: string) {
  try {
    const locale = new Intl.Locale(tag.replaceAll("_", "-"));

    if (Intl.NumberFormat.supportedLocalesOf(locale.baseName).length === 0) {
      return null;
    }

    return locale;
  } catch {
    return null;
  }
}

// A new blank invoice's number format, currency position and paper size,
// from the browser's language as Intl writes an amount in it: someone in
// Berlin starts on 1.234,56 € and A4, someone in Chicago on $1,234.56 and
// Letter. A bare language takes its most common region ("de" is Germany).
// Whatever Intl can't answer gets the stored-invoice defaults.
export function getLocaleDefaults(tag: string | undefined): {
  numberFormat: InvoiceNumberFormat;
  currencyPosition: CurrencyPosition;
  paperSize: InvoicePaperSize;
} {
  const locale = tag ? getLocale(tag) : null;

  if (!locale) return { ...STORED_INVOICE_FORMATS };

  const region = locale.maximize().region;
  // Where the currency sits doesn't depend on which currency it is, so any
  // one does.
  const parts = new Intl.NumberFormat(locale.baseName, {
    style: "currency",
    currency: "EUR"
  }).formatToParts(SAMPLE_AMOUNT);

  return {
    numberFormat: getNumberFormat(parts) ?? STORED_INVOICE_FORMATS.numberFormat,
    currencyPosition:
      getCurrencyPosition(parts) ?? STORED_INVOICE_FORMATS.currencyPosition,
    paperSize:
      region && LETTER_REGIONS.has(region)
        ? "Letter"
        : STORED_INVOICE_FORMATS.paperSize
  };
}

// The browser's language, or none where there's no browser (the server
// render, a script).
export function getBrowserLanguage(): string | undefined {
  return typeof navigator === "undefined" ? undefined : navigator.language;
}
