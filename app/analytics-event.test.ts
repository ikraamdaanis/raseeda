import type { env } from "cloudflare:workers";
import { describe, expect, it, vi } from "vitest";
import { handleAnalyticsEvent } from "~/app/analytics-event";

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
    const response = await handleAnalyticsEvent(eventRequest(), dataset);

    expect(response.status).toBe(204);
    expect(writeDataPoint).toHaveBeenCalledExactlyOnceWith({
      indexes: ["pdf_opened"],
      blobs: ["pdf_opened", "GB", "safari", "ios", "mobile", ""],
      doubles: [1]
    });
  });

  it("stores a page view's route pattern", async () => {
    const { dataset, writeDataPoint } = fakeDataset();

    await handleAnalyticsEvent(
      eventRequest({ body: "page_view /create" }),
      dataset
    );

    expect(writeDataPoint).toHaveBeenCalledExactlyOnceWith({
      indexes: ["page_view"],
      blobs: ["page_view", "GB", "safari", "ios", "mobile", "/create"],
      doubles: [1]
    });
  });

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
    ["no User-Agent", { headers: { "User-Agent": "" } }]
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
