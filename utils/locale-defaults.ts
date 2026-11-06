import { STORED_INVOICE_FORMATS } from "~/schema/invoice";
import type { CurrencyPosition, InvoiceNumberFormat } from "~/types";

// A language's most common region (CLDR's likely subtags), for a browser
// language with no region ("de" is Germany). Languages not listed fall back
// to the stored-invoice defaults.
const LIKELY_REGIONS: Partial<Record<string, string>> = {
  bg: "BG",
  bn: "BD",
  ca: "ES",
  cs: "CZ",
  da: "DK",
  de: "DE",
  el: "GR",
  en: "US",
  es: "ES",
  et: "EE",
  eu: "ES",
  fi: "FI",
  fil: "PH",
  fr: "FR",
  gl: "ES",
  hi: "IN",
  hr: "HR",
  hu: "HU",
  id: "ID",
  is: "IS",
  it: "IT",
  ja: "JP",
  ko: "KR",
  lt: "LT",
  lv: "LV",
  ms: "MY",
  nb: "NO",
  ne: "NP",
  nl: "NL",
  nn: "NO",
  no: "NO",
  pl: "PL",
  pt: "BR",
  ro: "RO",
  ru: "RU",
  sk: "SK",
  sl: "SI",
  sr: "RS",
  sv: "SE",
  th: "TH",
  tl: "PH",
  tr: "TR",
  uk: "UA",
  vi: "VN",
  zh: "CN"
};

// Where amounts are written 1.234,56.
const DOT_COMMA_REGIONS = new Set([
  "AR",
  "AT",
  "BA",
  "BO",
  "BR",
  "CL",
  "CO",
  "DE",
  "DK",
  "EC",
  "ES",
  "GR",
  "HR",
  "ID",
  "IS",
  "IT",
  "LU",
  "ME",
  "MK",
  "NL",
  "PY",
  "RO",
  "RS",
  "SI",
  "TR",
  "UY",
  "VE",
  "VN"
]);

// Where amounts are written 1 234,56.
const SPACE_COMMA_REGIONS = new Set([
  "BG",
  "BY",
  "CZ",
  "EE",
  "FI",
  "FR",
  "HU",
  "KZ",
  "LT",
  "LV",
  "MC",
  "NO",
  "PL",
  "PT",
  "RU",
  "SE",
  "SK",
  "UA",
  "ZA"
]);

const APOSTROPHE_DOT_REGIONS = new Set(["CH", "LI"]);

const INDIAN_REGIONS = new Set(["BD", "IN", "NP"]);

// Where the currency follows the amount (1.234,56 €). Elsewhere it leads.
const CURRENCY_AFTER_REGIONS = new Set([
  "BA",
  "BG",
  "BY",
  "CZ",
  "DE",
  "DK",
  "EE",
  "ES",
  "FI",
  "FR",
  "GR",
  "HR",
  "HU",
  "IS",
  "IT",
  "LT",
  "LU",
  "LV",
  "MC",
  "ME",
  "MK",
  "NO",
  "PL",
  "PT",
  "RO",
  "RS",
  "RU",
  "SE",
  "SI",
  "SK",
  "UA",
  "VN"
]);

// Bilingual countries where the language decides: French in Canada and
// Belgium writes 1 234,56 $ while English and Dutch don't.
function getLanguageOverride(
  language: string,
  region: string
): {
  numberFormat: InvoiceNumberFormat;
  currencyPosition: CurrencyPosition;
} | null {
  if (language === "fr" && (region === "CA" || region === "BE")) {
    return { numberFormat: "space-comma", currencyPosition: "after" };
  }

  if (region === "BE") {
    return { numberFormat: "dot-comma", currencyPosition: "before" };
  }

  return null;
}

function getNumberFormat(region: string): InvoiceNumberFormat {
  if (DOT_COMMA_REGIONS.has(region)) return "dot-comma";
  if (SPACE_COMMA_REGIONS.has(region)) return "space-comma";
  if (APOSTROPHE_DOT_REGIONS.has(region)) return "apostrophe-dot";
  if (INDIAN_REGIONS.has(region)) return "indian";

  return "comma-dot";
}

// The language and region of a BCP 47 tag ("de-AT", "zh-Hant-TW", "de"), the
// region filled in from the language when the tag has none.
function parseLanguageTag(tag: string) {
  const [language = "", ...subtags] = tag.toLowerCase().split(/[-_]/);
  const region =
    subtags.find(subtag => /^[a-z]{2}$|^\d{3}$/.test(subtag))?.toUpperCase() ??
    LIKELY_REGIONS[language] ??
    "";

  return { language, region };
}

// A new blank invoice's number format and currency position, from the
// browser's language: someone in Berlin starts on 1.234,56 €, someone in
// Chicago on $1,234.56. An unknown or missing tag gets the stored-invoice
// defaults.
export function getLocaleDefaults(tag: string | undefined): {
  numberFormat: InvoiceNumberFormat;
  currencyPosition: CurrencyPosition;
} {
  if (!tag) return { ...STORED_INVOICE_FORMATS };

  const { language, region } = parseLanguageTag(tag);

  if (!region) return { ...STORED_INVOICE_FORMATS };

  return (
    getLanguageOverride(language, region) ?? {
      numberFormat: getNumberFormat(region),
      currencyPosition: CURRENCY_AFTER_REGIONS.has(region) ? "after" : "before"
    }
  );
}

// The browser's language, or none where there's no browser (the server
// render, a script).
export function getBrowserLanguage(): string | undefined {
  return typeof navigator === "undefined" ? undefined : navigator.language;
}
