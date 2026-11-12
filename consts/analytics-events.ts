import { SITE_TEMPLATES } from "~/consts/site-templates";
import type { AnalyticsEvent, InvoiceSectionKey } from "~/types";

// The only events /api/event records (app/analytics-event.ts). Anything else
// is dropped, so the dataset can't be filled with made-up names. No event
// carries anything typed into an invoice.
export const ANALYTICS_EVENTS = [
  "page_view",
  "editor_opened",
  "pdf_opened",
  "pdf_downloaded",
  "invoice_saved",
  "template_saved",
  "data_exported",
  "data_imported"
] as const;

// The pages a page_view may name, each site template page by its own address.
// Any other path is dropped.
export const PAGE_VIEW_PATHS = [
  "/",
  "/create",
  "/invoice-template",
  ...SITE_TEMPLATES.map(template => template.path),
  "/privacy"
] as const;

// The kinds of site a visit can come from. The browser reduces the referrer
// to one of these (utils/traffic-source.ts); the address itself is never sent.
export const REFERRERS = [
  "direct",
  "internal",
  "google",
  "bing",
  "duckduckgo",
  "chatgpt",
  "perplexity",
  "claude",
  "gemini",
  "copilot",
  "x",
  "linkedin",
  "reddit",
  "facebook",
  "instagram",
  "youtube",
  "github",
  "producthunt",
  "hackernews",
  "other"
] as const;

// What a `?ref=` or `utm_source` on the landing page may name: the same sites
// (a visit can't be "direct" or "internal" by its own say-so), plus our own
// newsletter.
export const SOURCES = [
  "google",
  "bing",
  "duckduckgo",
  "chatgpt",
  "perplexity",
  "claude",
  "gemini",
  "copilot",
  "x",
  "linkedin",
  "reddit",
  "facebook",
  "instagram",
  "youtube",
  "github",
  "producthunt",
  "hackernews",
  "newsletter",
  "other"
] as const;

// The browser languages counted by name (ISO 639-1); any other is "other".
export const LANGUAGES = [
  "en",
  "ar",
  "fr",
  "es",
  "de",
  "pt",
  "ur",
  "hi",
  "id",
  "tr",
  "other"
] as const;

// The currency codes counted by name (ISO 4217). An invoice's code can be
// typed in the custom currency dialog, so anything not listed here, including
// no code at all, is counted as "other" and never sent as typed.
export const CURRENCIES = [
  "USD",
  "GBP",
  "EUR",
  "JPY",
  "CHF",
  "SAR",
  "AED",
  "AUD",
  "CAD",
  "HKD",
  "SGD",
  "CNY",
  "NZD",
  "INR",
  "PKR",
  "BDT",
  "EGP",
  "QAR",
  "KWD",
  "BHD",
  "OMR",
  "JOD",
  "MAD",
  "TRY",
  "ZAR",
  "NGN",
  "KES",
  "GHS",
  "MYR",
  "IDR",
  "PHP",
  "BRL",
  "MXN",
  "SEK",
  "NOK",
  "DKK",
  "PLN",
  "other"
] as const;

// Whether the page runs in a browser tab or as the installed app.
export const DISPLAY_MODES = ["browser", "standalone"] as const;

// Roughly how many invoices are saved on the device, never the count itself.
// "unknown" when the browser's storage couldn't be read.
export const LIBRARY_SIZES = ["0", "1", "2-5", "6+", "unknown"] as const;

// The order a PDF's printed sections are packed into the event's bitmask and
// stored as doubles (double2 onwards). Append only: a new section takes the
// next bit and the next double, or the stored history changes meaning.
export const SECTION_BITS = [
  "logo",
  "poNumber",
  "servicePeriod",
  "supplyDate",
  "shipping",
  "discounts",
  "tax",
  "fees",
  "amountPaid",
  "currencyConversion",
  "paymentDetails",
  "notes",
  "terms",
  "latePayment",
  "paidStamp"
] as const satisfies readonly InvoiceSectionKey[];

// The fields each event carries after its name, as `key=value` words:
// r referrer, s source ("-" for none), l language, d display mode, c currency,
// n library size, x printed sections. A page view's path comes first, bare.
export const EVENT_FIELDS = {
  page_view: ["r", "s", "l", "d"],
  editor_opened: ["l", "d", "n"],
  pdf_opened: ["r", "s", "l", "d", "c", "n", "x"],
  pdf_downloaded: ["r", "s", "l", "d", "c", "n", "x"],
  invoice_saved: ["r", "s", "l", "d", "c", "n"],
  template_saved: ["l", "d"],
  data_exported: ["l", "d"],
  data_imported: ["l", "d"]
} as const satisfies Record<AnalyticsEvent, readonly string[]>;
