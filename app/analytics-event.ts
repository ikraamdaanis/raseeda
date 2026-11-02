import type { env } from "cloudflare:workers";
import {
  ANALYTICS_EVENTS,
  CURRENCIES,
  DISPLAY_MODES,
  EVENT_FIELDS,
  LANGUAGES,
  LIBRARY_SIZES,
  PAGE_VIEW_PATHS,
  REFERRERS,
  SECTION_BITS,
  SOURCES
} from "~/consts/analytics-events";
import type { AnalyticsEvent } from "~/types";
import { bucketUserAgent, isBotUserAgent } from "~/utils/user-agent";

// The longest body an event can have is 89 bytes ("pdf_downloaded
// r=producthunt s=producthunt l=other d=standalone c=other n=unknown
// x=32767"). A longer one isn't an event, so it's dropped without being read in full.
const MAX_BODY_BYTES = 128;

// The values each field may take. Anything else drops the event, so nothing
// typed (a URL, a custom currency code) can reach the dataset.
const FIELD_VALUES: Partial<Record<string, readonly string[]>> = {
  r: REFERRERS,
  s: [...SOURCES, "-"],
  l: LANGUAGES,
  d: DISPLAY_MODES,
  c: CURRENCIES,
  n: LIBRARY_SIZES
};

// The printed sections arrive as a bitmask, one bit per SECTION_BITS entry.
const MAX_SECTION_MASK = 2 ** SECTION_BITS.length - 1;

// POST /api/event: one anonymous count. The body is an event name from
// consts/analytics-events.ts (a page view adds its route pattern), then the
// event's fields as `key=value` words (EVENT_FIELDS), each from a fixed list.
// It answers 204 whatever happens, so a dropped event looks the same as a
// counted one, and nothing here is logged: not the IP, the User-Agent or the
// body.
//
// The data point's fields are positional, so their order is fixed and only
// ever appended to: the index and blob1 are the event, then country, browser,
// OS, device, the page view's path, referrer, source, language, currency,
// display mode and library size. double1 is the count; a PDF's printed
// sections follow as double2 onwards, 1 when printed, in SECTION_BITS order.
export async function handleAnalyticsEvent(
  request: Request,
  dataset: typeof env.ANALYTICS | undefined
): Promise<Response> {
  if (request.method !== "POST") {
    return new Response(null, { status: 405, headers: { Allow: "POST" } });
  }

  const event = dataset ? await readEvent(request) : null;

  if (dataset && event) {
    const { browser, os, device } = bucketUserAgent(
      request.headers.get("User-Agent") ?? ""
    );

    try {
      dataset.writeDataPoint({
        indexes: [event.name],
        blobs: [
          event.name,
          requestCountry(request),
          browser,
          os,
          device,
          event.path,
          event.fields.r ?? "",
          event.fields.s === "-" ? "" : (event.fields.s ?? ""),
          event.fields.l ?? "",
          event.fields.c ?? "",
          event.fields.d ?? "",
          event.fields.n ?? ""
        ],
        doubles: [1, ...sectionDoubles(event.fields.x)]
      });
    } catch {
      // A count that can't be written is skipped; the page never hears of it.
    }
  }

  return new Response(null, { status: 204 });
}

// The event the request carries, or null when it isn't one to count: sent
// from another site, by a bot, under Global Privacy Control, or with a body
// that isn't a known event.
async function readEvent(request: Request): Promise<{
  name: AnalyticsEvent;
  path: string;
  fields: Partial<Record<string, string>>;
} | null> {
  const userAgent = request.headers.get("User-Agent") ?? "";

  if (request.headers.get("Sec-Fetch-Site") !== "same-origin") return null;
  if (request.headers.get("Sec-GPC") === "1") return null;
  if (!userAgent || isBotUserAgent(userAgent)) return null;

  let body: string | null;

  try {
    body = await readBody(request);
  } catch {
    return null;
  }

  if (!body) return null;

  const [eventName, ...rest] = body.split(" ");
  const name = ANALYTICS_EVENTS.find(known => known === eventName);

  if (!name) return null;

  let path = "";

  if (name === "page_view") {
    const known = PAGE_VIEW_PATHS.find(pagePath => pagePath === rest[0]);

    if (!known) return null;

    path = known;
    rest.shift();
  }

  // A tab still running the page from before the fields were added sends the
  // bare event; it's counted with the new columns empty.
  if (rest.length === 0) return { name, path, fields: {} };

  const fields = readFields(rest, EVENT_FIELDS[name]);

  return fields ? { name, path, fields } : null;
}

// The words as fields, or null unless there is exactly one of each expected
// key and every value is one the key allows.
function readFields(words: string[], expected: readonly string[]) {
  if (words.length !== expected.length) return null;

  const fields: Record<string, string> = {};

  for (const word of words) {
    const [key = "", value = "", ...extra] = word.split("=");

    if (extra.length || !expected.includes(key) || key in fields) return null;
    if (!isAllowedValue(key, value)) return null;

    fields[key] = value;
  }

  return fields;
}

function isAllowedValue(key: string, value: string) {
  if (key === "x") {
    return /^\d{1,5}$/.test(value) && Number(value) <= MAX_SECTION_MASK;
  }

  return FIELD_VALUES[key]?.includes(value) ?? false;
}

// The printed sections as one double each, or none when the event has no
// sections field.
function sectionDoubles(mask: string | undefined) {
  if (mask === undefined) return [];

  const bits = Number(mask);

  return SECTION_BITS.map((_section, bit) => (bits >> bit) & 1);
}

// The body as text, or null when it's longer than an event can be. A declared
// Content-Length turns a long body away unread; without one (the edge doesn't
// promise to pass it on), reading stops as soon as the body passes the cap.
async function readBody(request: Request) {
  const declared = request.headers.get("Content-Length");

  if (declared !== null && !(Number(declared) <= MAX_BODY_BYTES)) return null;
  if (!request.body) return null;

  const reader = request.body.getReader();
  const decoder = new TextDecoder();
  let size = 0;
  let body = "";

  for (;;) {
    const { done, value } = await reader.read();

    if (done) return body + decoder.decode();

    size += value.byteLength;

    if (size > MAX_BODY_BYTES) {
      await reader.cancel();

      return null;
    }

    body += decoder.decode(value, { stream: true });
  }
}

// Cloudflare attaches `cf` to the requests a Worker receives (the DOM's
// Request type doesn't know it). Only its country is read; the region, city,
// postcode and coordinates beside it are not.
function requestCountry(request: Request) {
  const cf: { country?: unknown } | undefined = Reflect.get(request, "cf");
  const country = cf?.country;

  return typeof country === "string" && /^[A-Z0-9]{2}$/.test(country)
    ? country
    : "XX";
}
