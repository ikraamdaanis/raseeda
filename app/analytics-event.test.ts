import type { env } from "cloudflare:workers";
import { describe, expect, it, vi } from "vitest";
import { handleAnalyticsEvent } from "~/app/analytics-event";
import { SECTION_BITS } from "~/consts/analytics-events";

const SAFARI_IPHONE =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.6 Mobile/15E148 Safari/604.1";

// A request as sendBeacon sends it from one of the site's own pages, with
// the `cf` object Cloudflare attaches to every request a Worker receives.
function eventRequest({
  body = "pdf_opened",
  method = "POST",
  headers = {},
  cf = { country: "GB", city: "London", latitude: "51.5", postalCode: "EC1" }
}: {
  body?: string;
  method?: string;
  headers?: Record<string, string>;
  cf?: Record<string, unknown> | null;
} = {}) {
  const request = new Request("https://raseeda.com/api/event", {
    method,
    body: method === "POST" ? body : undefined,
    headers: {
      "Content-Type": "text/plain;charset=UTF-8",
      "Content-Length": String(new TextEncoder().encode(body).length),
      "Sec-Fetch-Site": "same-origin",
      "User-Agent": SAFARI_IPHONE,
      ...headers
    }
  });

  if (cf) Object.defineProperty(request, "cf", { value: cf });

  return request;
}

function fakeDataset() {
  const writeDataPoint = vi.fn<(typeof env.ANALYTICS)["writeDataPoint"]>();

  return { dataset: { writeDataPoint }, writeDataPoint };
}

describe("handleAnalyticsEvent", () => {
  it("writes the event with the country and User-Agent buckets", async () => {
    const { dataset, writeDataPoint } = fakeDataset();
    const response = await handleAnalyticsEvent(
      eventRequest({ body: "data_exported l=en d=browser" }),
      dataset
    );

    expect(response.status).toBe(204);
    expect(writeDataPoint).toHaveBeenCalledExactlyOnceWith({
      indexes: ["data_exported"],
      blobs: [
        "data_exported",
        "GB",
        "safari",
        "ios",
        "mobile",
        "",
        "",
        "",
        "en",
        "",
        "browser",
        ""
      ],
      doubles: [1]
    });
  });

  it("stores a page view's route pattern and where it came from", async () => {
    const { dataset, writeDataPoint } = fakeDataset();

    await handleAnalyticsEvent(
      eventRequest({
        body: "page_view /create r=google s=newsletter l=ar d=standalone"
      }),
      dataset
    );

    expect(writeDataPoint).toHaveBeenCalledExactlyOnceWith({
      indexes: ["page_view"],
      blobs: [
        "page_view",
        "GB",
        "safari",
        "ios",
        "mobile",
        "/create",
        "google",
        "newsletter",
        "ar",
        "",
        "standalone",
        ""
      ],
      doubles: [1]
    });
  });

  it("stores no source as empty", async () => {
    const { dataset, writeDataPoint } = fakeDataset();

    await handleAnalyticsEvent(
      eventRequest({ body: "page_view / r=direct s=- l=en d=browser" }),
      dataset
    );

    expect(writeDataPoint.mock.calls[0]?.[0]?.blobs?.slice(6, 8)).toEqual([
      "direct",
      ""
    ]);
  });

  it("stores a saved invoice's channel, currency and library size", async () => {
    const { dataset, writeDataPoint } = fakeDataset();

    await handleAnalyticsEvent(
      eventRequest({
        body: "invoice_saved r=chatgpt s=- l=en d=browser c=AED n=2-5"
      }),
      dataset
    );

    expect(writeDataPoint).toHaveBeenCalledExactlyOnceWith({
      indexes: ["invoice_saved"],
      blobs: [
        "invoice_saved",
        "GB",
        "safari",
        "ios",
        "mobile",
        "",
        "chatgpt",
        "",
        "en",
        "AED",
        "browser",
        "2-5"
      ],
      doubles: [1]
    });
  });

  it("stores a PDF's printed sections as one double each", async () => {
    const { dataset, writeDataPoint } = fakeDataset();
    const tax = SECTION_BITS.indexOf("tax");
    const conversion = SECTION_BITS.indexOf("currencyConversion");
    const mask = (1 << tax) | (1 << conversion);

    await handleAnalyticsEvent(
      eventRequest({
        body: `pdf_opened r=google s=- l=en d=browser c=GBP n=1 x=${mask}`
      }),
      dataset
    );

    const point = writeDataPoint.mock.calls[0]?.[0];
    const expected = SECTION_BITS.map(section =>
      section === "tax" || section === "currencyConversion" ? 1 : 0
    );

    expect(point?.doubles).toEqual([1, ...expected]);
    expect(point?.blobs?.slice(6)).toEqual([
      "google",
      "",
      "en",
      "GBP",
      "browser",
      "1"
    ]);
  });

  it("takes the fields in any order", async () => {
    const { dataset, writeDataPoint } = fakeDataset();

    await handleAnalyticsEvent(
      eventRequest({ body: "editor_opened n=0 d=browser l=fr" }),
      dataset
    );

    expect(writeDataPoint.mock.calls[0]?.[0]?.blobs?.slice(8)).toEqual([
      "fr",
      "",
      "browser",
      "0"
    ]);
  });

  it.each([
    ["an event", "pdf_opened", "", "pdf_opened"],
    ["a page view", "page_view /create", "/create", "page_view"]
  ])(
    "counts %s from a tab opened before the fields were added",
    async (_case, body, path, name) => {
      const { dataset, writeDataPoint } = fakeDataset();

      await handleAnalyticsEvent(eventRequest({ body }), dataset);

      expect(writeDataPoint).toHaveBeenCalledExactlyOnceWith({
        indexes: [name],
        blobs: [
          name,
          "GB",
          "safari",
          "ios",
          "mobile",
          path,
          "",
          "",
          "",
          "",
          "",
          ""
        ],
        doubles: [1]
      });
    }
  );

  it("stores only the country from Cloudflare's request details", async () => {
    const { dataset, writeDataPoint } = fakeDataset();

    await handleAnalyticsEvent(eventRequest(), dataset);

    const stored = JSON.stringify(writeDataPoint.mock.calls);

    expect(stored).not.toContain("London");
    expect(stored).not.toContain("EC1");
    expect(stored).not.toContain("51.5");
    expect(stored).not.toContain("iPhone OS");
  });

  it.each([
    ["no cf object", null],
    ["no country", {}],
    ["a null country", { country: null }],
    ["a country that isn't a code", { country: "United Kingdom" }]
  ])("records the country as XX for %s", async (_case, cf) => {
    const { dataset, writeDataPoint } = fakeDataset();

    await handleAnalyticsEvent(eventRequest({ cf }), dataset);

    expect(writeDataPoint.mock.calls[0]?.[0]?.blobs?.[1]).toBe("XX");
  });

  it.each([
    ["an unknown event", { body: "invoice_paid" }],
    ["an empty body", { body: "" }],
    ["junk", { body: "<script>alert(1)</script>" }],
    ["a page view with no path", { body: "page_view" }],
    ["a page view of an unknown path", { body: "page_view /admin" }],
    [
      "a page view with a query string",
      { body: "page_view /create?font=lora" }
    ],
    ["a path on another event", { body: "pdf_opened /create" }],
    ["extra words", { body: "page_view / extra" }],
    ["a cross-site request", { headers: { "Sec-Fetch-Site": "cross-site" } }],
    ["a same-site request", { headers: { "Sec-Fetch-Site": "same-site" } }],
    [
      "a request typed into the address bar",
      { headers: { "Sec-Fetch-Site": "none" } }
    ],
    ["Global Privacy Control", { headers: { "Sec-GPC": "1" } }],
    [
      "a bot",
      { headers: { "User-Agent": "Mozilla/5.0 (compatible; Googlebot/2.1)" } }
    ],
    [
      "a headless browser",
      { headers: { "User-Agent": "HeadlessChrome/141.0.0.0" } }
    ],
    ["no User-Agent", { headers: { "User-Agent": "" } }],
    [
      "an unknown referrer",
      { body: "page_view / r=example.com s=- l=en d=browser" }
    ],
    [
      "a full referrer URL",
      { body: "page_view / r=https://www.google.com/ s=- l=en d=browser" }
    ],
    [
      "an unknown source",
      { body: "page_view / r=direct s=friend l=en d=browser" }
    ],
    [
      "direct as a source",
      { body: "page_view / r=direct s=direct l=en d=browser" }
    ],
    [
      "an unknown language",
      { body: "page_view / r=direct s=- l=zh d=browser" }
    ],
    ["an unknown display mode", { body: "page_view / r=direct s=- l=en d=tv" }],
    [
      "a typed currency code",
      { body: "invoice_saved r=direct s=- l=en d=browser c=XYZ n=1" }
    ],
    [
      "an exact library count",
      { body: "invoice_saved r=direct s=- l=en d=browser c=USD n=17" }
    ],
    [
      "sections out of range",
      { body: "pdf_opened r=direct s=- l=en d=browser c=USD n=1 x=131072" }
    ],
    [
      "sections that aren't a number",
      { body: "pdf_opened r=direct s=- l=en d=browser c=USD n=1 x=-1" }
    ],
    ["a missing field", { body: "page_view / r=direct l=en d=browser" }],
    [
      "an extra field",
      { body: "page_view / r=direct s=- l=en d=browser c=USD" }
    ],
    [
      "a field another event carries",
      { body: "data_exported l=en d=browser n=0" }
    ],
    ["a repeated field", { body: "data_exported l=en l=en" }],
    ["a field with two values", { body: "data_exported l=en=fr d=browser" }],
    ["a field without a value", { body: "data_exported l d=browser" }],
    ["a doubled space", { body: "data_exported  l=en d=browser" }],
    [
      "fields on a page view with no path",
      { body: "page_view r=direct s=- l=en d=browser" }
    ]
  ])("drops %s and still answers 204", async (_case, options) => {
    const { dataset, writeDataPoint } = fakeDataset();
    const response = await handleAnalyticsEvent(eventRequest(options), dataset);

    expect(response.status).toBe(204);
    expect(writeDataPoint).not.toHaveBeenCalled();
  });

  it("drops a body declared too long to be an event without reading it", async () => {
    const { dataset, writeDataPoint } = fakeDataset();
    const request = eventRequest({ body: "x".repeat(200) });
    const getReader = vi.spyOn(ReadableStream.prototype, "getReader");

    await handleAnalyticsEvent(request, dataset);

    expect(getReader).not.toHaveBeenCalled();
    expect(writeDataPoint).not.toHaveBeenCalled();

    getReader.mockRestore();
  });

  it("counts an event sent without a Content-Length", async () => {
    const { dataset, writeDataPoint } = fakeDataset();
    const request = eventRequest({ body: "page_view /create" });

    request.headers.delete("Content-Length");

    await handleAnalyticsEvent(request, dataset);

    expect(writeDataPoint.mock.calls[0]?.[0]?.blobs?.[5]).toBe("/create");
  });

  it("stops reading a long body sent without a Content-Length", async () => {
    const { dataset, writeDataPoint } = fakeDataset();
    const request = eventRequest({ body: "x".repeat(200) });
    const cancel = vi.spyOn(ReadableStreamDefaultReader.prototype, "cancel");

    request.headers.delete("Content-Length");

    const response = await handleAnalyticsEvent(request, dataset);

    expect(response.status).toBe(204);
    expect(cancel).toHaveBeenCalledOnce();
    expect(writeDataPoint).not.toHaveBeenCalled();

    cancel.mockRestore();
  });

  it("drops a request with no Sec-Fetch-Site header", async () => {
    const { dataset, writeDataPoint } = fakeDataset();
    const request = eventRequest();

    request.headers.delete("Sec-Fetch-Site");

    await handleAnalyticsEvent(request, dataset);

    expect(writeDataPoint).not.toHaveBeenCalled();
  });

  it("answers 204 without the dataset binding", async () => {
    const response = await handleAnalyticsEvent(eventRequest(), undefined);

    expect(response.status).toBe(204);
  });

  it("answers 204 when the write throws", async () => {
    const { dataset, writeDataPoint } = fakeDataset();

    writeDataPoint.mockImplementation(() => {
      throw new Error("Dataset unavailable");
    });

    const response = await handleAnalyticsEvent(eventRequest(), dataset);

    expect(response.status).toBe(204);
  });

  it("refuses methods other than POST", async () => {
    const { dataset, writeDataPoint } = fakeDataset();
    const response = await handleAnalyticsEvent(
      eventRequest({ method: "GET" }),
      dataset
    );

    expect(response.status).toBe(405);
    expect(response.headers.get("Allow")).toBe("POST");
    expect(writeDataPoint).not.toHaveBeenCalled();
  });

  it("logs nothing", async () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const { dataset } = fakeDataset();

    await handleAnalyticsEvent(eventRequest(), dataset);
    await handleAnalyticsEvent(eventRequest({ body: "junk" }), dataset);

    expect(log).not.toHaveBeenCalled();
    expect(warn).not.toHaveBeenCalled();
    expect(error).not.toHaveBeenCalled();

    vi.restoreAllMocks();
  });
});
