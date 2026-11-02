import { CURRENCIES, LANGUAGES, SECTION_BITS } from "~/consts/analytics-events";
import type {
  BrowserLanguage,
  CountedCurrency,
  DisplayMode,
  Invoice,
  LibrarySize,
  PageViewPath,
  Referrer,
  TrafficSource
} from "~/types";
import { getPrintedSections } from "~/utils/section-visibility";
import { bucketReferrer, bucketSource } from "~/utils/traffic-source";

type Channel = { referrer: Referrer; source: TrafficSource | null };

// Where this page load came from, worked out once from the referrer and the
// landing address, before the router changes the address. It lives in memory
// only, so it's gone when the tab closes and nothing links two visits.
let channel: Channel | undefined;

// Whether this page load's first page view has been counted.
let landingCounted = false;

// Read as soon as the page starts, so a landing on a page that isn't counted
// (one not found) still keeps its referrer and `?ref=` for the next page.
if (typeof document !== "undefined") getChannel();

// Counts one anonymous usage event (app/analytics-event.ts). Opening the
// editor also says roughly how many invoices are saved, so first visits can be
// told from returning ones.
export function track(
  event: "editor_opened" | "template_saved" | "data_exported" | "data_imported"
) {
  if (!canSend()) return;

  if (event !== "editor_opened") {
    sendEvent(`${event} ${fields(deviceFields())}`);

    return;
  }

  void librarySize().then(size => {
    sendEvent(`${event} ${fields({ ...deviceFields(), n: size })}`);
  });
}

// Counts a PDF made (opened or downloaded) from, or an invoice first saved
// with, this invoice, with where the visit came from. Only its currency code
// (when it's one of CURRENCIES) and which optional sections it prints are read
// from it.
export function trackInvoice(
  event: "pdf_opened" | "pdf_downloaded" | "invoice_saved",
  invoice: Invoice
) {
  if (!canSend()) return;

  const { referrer, source } = getChannel();
  const invoiceFields = {
    r: referrer,
    s: source ?? "-",
    ...deviceFields(),
    c: countedCurrency(invoice.currencyCode)
  };
  const sections: Record<string, string> =
    event === "invoice_saved" ? {} : { x: String(sectionMask(invoice)) };

  void librarySize().then(size => {
    sendEvent(`${event} ${fields({ ...invoiceFields, n: size, ...sections })}`);
  });
}

// A page view names the route pattern, never the URL. Only the first page view
// of a fresh load says where the visit came from; the pages after it, and a
// reload, are moves within the site.
export function trackPageView(path: PageViewPath) {
  if (!canSend()) return;

  const landing = getChannel();
  const { referrer, source }: Channel =
    !landingCounted && isFreshLoad()
      ? landing
      : { referrer: "internal", source: null };

  landingCounted = true;
  sendEvent(
    `page_view ${path} ${fields({ r: referrer, s: source ?? "-", ...deviceFields() })}`
  );
}

function fields(values: Record<string, string>) {
  return Object.entries(values)
    .map(([key, value]) => `${key}=${value}`)
    .join(" ");
}

// The installed app opens at the address it was installed from, `?ref=`
// included, so its launches would each credit that source again; they count
// as direct.
function getChannel() {
  channel ??=
    displayMode() === "standalone"
      ? { referrer: "direct", source: null }
      : {
          referrer: bucketReferrer(document.referrer, location.host),
          source: landingSource()
        };

  return channel;
}

function landingSource() {
  const params = new URLSearchParams(location.search);

  return bucketSource(params.get("ref") ?? params.get("utm_source"));
}

// A load reached by following a link or typing the address, rather than by
// reloading or going back. Browsers without navigation timing count as fresh.
function isFreshLoad() {
  const navigation = performance.getEntriesByType("navigation").at(0);

  if (!navigation || !("type" in navigation)) return true;

  return navigation.type !== "reload" && navigation.type !== "back_forward";
}

function deviceFields() {
  return { l: browserLanguage(), d: displayMode() };
}

function browserLanguage(): BrowserLanguage {
  const [subtag] = navigator.language.toLowerCase().split("-");

  return LANGUAGES.find(known => known === subtag) ?? "other";
}

// iOS before 16.4 doesn't support the display-mode query, but says whether
// the page was opened from the home screen.
function displayMode(): DisplayMode {
  const isStandalone =
    (typeof matchMedia === "function" &&
      matchMedia("(display-mode: standalone)").matches) ||
    ("standalone" in navigator && navigator.standalone === true);

  return isStandalone ? "standalone" : "browser";
}

function countedCurrency(code: string): CountedCurrency {
  const upper = code.trim().toUpperCase();

  return CURRENCIES.find(known => known === upper) ?? "other";
}

// The printed sections as bits in SECTION_BITS order.
function sectionMask(invoice: Invoice) {
  const printed = getPrintedSections(invoice);

  return SECTION_BITS.reduce(
    (mask, section, bit) => (printed[section] ? mask | (1 << bit) : mask),
    0
  );
}

// Roughly how many invoices are saved here. Only the editor's events read it,
// where the database is open already; importing it here keeps the database
// code off the other pages, which must never open it just to count.
async function librarySize(): Promise<LibrarySize> {
  try {
    const { countInvoices } = await import("~/db");
    const count = await countInvoices();

    if (count === 0) return "0";
    if (count === 1) return "1";

    return count <= 5 ? "2-5" : "6+";
  } catch {
    return "unknown";
  }
}

// Nothing is sent in development, when the browser asks for Global Privacy
// Control, or when it has no beacon to send with.
function canSend() {
  if (import.meta.env.DEV) return false;
  if (typeof navigator === "undefined") return false;
  if (!("sendBeacon" in navigator)) return false;

  return !(
    "globalPrivacyControl" in navigator &&
    navigator.globalPrivacyControl === true
  );
}

// Fire and forget: a beacon that fails (offline, blocked) is never noticed by
// the app. Nothing is kept on the device for it, so there is no visitor id.
function sendEvent(body: string) {
  try {
    navigator.sendBeacon("/api/event", body);
  } catch {
    // Counting is never worth an error.
  }
}
