import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SECTION_BITS } from "~/consts/analytics-events";
import { DEFAULT_INVOICE_SECTIONS } from "~/schema/invoice";
import { createBlankInvoice } from "~/stores/invoice-store";
import type { Invoice } from "~/types";

const { countInvoices } = vi.hoisted(() => ({
  countInvoices: vi.fn(() => Promise.resolve(0))
}));

vi.mock("~/db", () => ({ countInvoices }));

// The module keeps the page load's channel, so each test loads it afresh, as
// a new page load would.
async function loadTrack() {
  vi.resetModules();

  return import("~/utils/track");
}

function stubPage({
  referrer = "",
  url = "https://raseeda.com/",
  navigationType = "navigate",
  navigator = {},
  standalone = false
}: {
  referrer?: string;
  url?: string;
  navigationType?: string;
  navigator?: Record<string, unknown>;
  standalone?: boolean;
} = {}) {
  const sendBeacon = vi.fn(() => true);
  const location = new URL(url);

  vi.stubGlobal("navigator", { sendBeacon, language: "en-GB", ...navigator });
  vi.stubGlobal("document", { referrer });
  vi.stubGlobal("location", location);
  vi.stubGlobal("matchMedia", () => ({ matches: standalone }));
  vi.spyOn(performance, "getEntriesByType").mockReturnValue(
    navigationType
      ? [{ type: navigationType } as unknown as PerformanceEntry]
      : []
  );

  return sendBeacon;
}

function sentBodies(sendBeacon: ReturnType<typeof stubPage>) {
  return sendBeacon.mock.calls.map(call => String(call.at(1)));
}

function invoiceWith(changes: Partial<Invoice> = {}): Invoice {
  return { ...createBlankInvoice(), ...changes };
}

describe("track", () => {
  beforeEach(() => {
    vi.stubEnv("DEV", false);
    countInvoices.mockReset();
    countInvoices.mockResolvedValue(0);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("sends a simple event with the language and display mode", async () => {
    const sendBeacon = stubPage();
    const { track } = await loadTrack();

    track("data_exported");

    expect(sendBeacon).toHaveBeenCalledExactlyOnceWith(
      "/api/event",
      "data_exported l=en d=browser"
    );
  });

  it("sends the landing page view with where the visit came from", async () => {
    const sendBeacon = stubPage({
      referrer: "https://www.google.co.uk/",
      url: "https://raseeda.com/?ref=newsletter"
    });
    const { trackPageView } = await loadTrack();

    trackPageView("/");

    expect(sentBodies(sendBeacon)).toEqual([
      "page_view / r=google s=newsletter l=en d=browser"
    ]);
  });

  it("counts the pages after the first as internal", async () => {
    const sendBeacon = stubPage({ referrer: "https://www.google.com/" });
    const { trackPageView } = await loadTrack();

    trackPageView("/");
    trackPageView("/create");

    expect(sentBodies(sendBeacon)).toEqual([
      "page_view / r=google s=- l=en d=browser",
      "page_view /create r=internal s=- l=en d=browser"
    ]);
  });

  it.each(["reload", "back_forward"])(
    "counts a %s load as internal",
    async navigationType => {
      const sendBeacon = stubPage({
        referrer: "https://www.google.com/",
        url: "https://raseeda.com/create?ref=linkedin",
        navigationType
      });
      const { trackPageView } = await loadTrack();

      trackPageView("/create");

      expect(sentBodies(sendBeacon)).toEqual([
        "page_view /create r=internal s=- l=en d=browser"
      ]);
    }
  );

  it("treats a browser without navigation timing as a fresh load", async () => {
    const sendBeacon = stubPage({
      referrer: "https://x.com/",
      navigationType: ""
    });
    const { trackPageView } = await loadTrack();

    trackPageView("/");

    expect(sentBodies(sendBeacon)).toEqual([
      "page_view / r=x s=- l=en d=browser"
    ]);
  });

  it("reads the source from utm_source when there's no ref", async () => {
    const sendBeacon = stubPage({
      url: "https://raseeda.com/?utm_source=chatgpt.com"
    });
    const { trackPageView } = await loadTrack();

    trackPageView("/");

    expect(sentBodies(sendBeacon)).toEqual([
      "page_view / r=direct s=chatgpt l=en d=browser"
    ]);
  });

  it("keeps the landing channel for a PDF made after moving to the editor", async () => {
    const sendBeacon = stubPage({
      referrer: "https://www.bing.com/",
      url: "https://raseeda.com/?ref=reddit"
    });
    const { trackInvoice, trackPageView } = await loadTrack();

    trackPageView("/");
    // The router moves to /create; the address no longer has the ref.
    vi.stubGlobal("location", new URL("https://raseeda.com/create"));
    trackPageView("/create");
    trackInvoice("pdf_opened", invoiceWith({ currencyCode: "GBP" }));

    await vi.waitFor(() => expect(sendBeacon).toHaveBeenCalledTimes(3));

    expect(sentBodies(sendBeacon)[2]).toMatch(
      /^pdf_opened r=bing s=reddit l=en d=browser c=GBP n=0 x=\d+$/
    );
  });

  it("keeps the referrer for a save after a reload", async () => {
    const sendBeacon = stubPage({
      referrer: "https://www.google.com/",
      navigationType: "reload"
    });
    const { trackInvoice, trackPageView } = await loadTrack();

    trackPageView("/create");
    trackInvoice("invoice_saved", invoiceWith({ currencyCode: "AED" }));

    await vi.waitFor(() => expect(sendBeacon).toHaveBeenCalledTimes(2));

    expect(sentBodies(sendBeacon)).toEqual([
      "page_view /create r=internal s=- l=en d=browser",
      "invoice_saved r=google s=- l=en d=browser c=AED n=0"
    ]);
  });

  it.each([
    ["a typed code", "XYZ", "other"],
    ["no code", "", "other"],
    ["a lowercase listed code", " inr ", "INR"]
  ])("counts %s as %s", async (_case, currencyCode, counted) => {
    const sendBeacon = stubPage();
    const { trackInvoice } = await loadTrack();

    trackInvoice("invoice_saved", invoiceWith({ currencyCode }));

    await vi.waitFor(() => expect(sendBeacon).toHaveBeenCalledOnce());

    expect(sentBodies(sendBeacon)[0]).toContain(` c=${counted} `);
  });

  it.each([
    [0, "0"],
    [1, "1"],
    [2, "2-5"],
    [5, "2-5"],
    [6, "6+"],
    [240, "6+"]
  ])("buckets %i saved invoices as %s", async (count, size) => {
    countInvoices.mockResolvedValue(count);
    const sendBeacon = stubPage();
    const { track } = await loadTrack();

    track("editor_opened");

    await vi.waitFor(() => expect(sendBeacon).toHaveBeenCalledOnce());

    expect(sentBodies(sendBeacon)).toEqual([
      `editor_opened l=en d=browser n=${size}`
    ]);
  });

  it("sends unknown when the library can't be counted", async () => {
    countInvoices.mockRejectedValue(new Error("Storage blocked"));
    const sendBeacon = stubPage();
    const { track } = await loadTrack();

    track("editor_opened");

    await vi.waitFor(() => expect(sendBeacon).toHaveBeenCalledOnce());

    expect(sentBodies(sendBeacon)).toEqual([
      "editor_opened l=en d=browser n=unknown"
    ]);
  });

  it("counts the library only for the editor's events", async () => {
    stubPage();
    const { track, trackPageView } = await loadTrack();

    trackPageView("/");
    track("template_saved");
    track("data_imported");

    expect(countInvoices).not.toHaveBeenCalled();
  });

  it("packs the PDF's printed sections in SECTION_BITS order", async () => {
    const sendBeacon = stubPage();
    const { trackInvoice } = await loadTrack();
    const invoice = invoiceWith({
      sections: {
        ...Object.fromEntries(
          Object.keys(DEFAULT_INVOICE_SECTIONS).map(key => [key, false])
        ),
        tax: true,
        notes: true
      } as Invoice["sections"],
      notes: { ...createBlankInvoice().notes, content: "Thanks" }
    });

    trackInvoice("pdf_opened", invoice);

    await vi.waitFor(() => expect(sendBeacon).toHaveBeenCalledOnce());

    const mask =
      (1 << SECTION_BITS.indexOf("tax")) | (1 << SECTION_BITS.indexOf("notes"));

    expect(sentBodies(sendBeacon)[0]).toMatch(new RegExp(` x=${mask}$`));
  });

  it("sends a downloaded PDF's printed sections too", async () => {
    const sendBeacon = stubPage();
    const { trackInvoice } = await loadTrack();
    const invoice = invoiceWith({
      sections: { ...allSections(false), tax: true }
    });

    trackInvoice("pdf_downloaded", invoice);

    await vi.waitFor(() => expect(sendBeacon).toHaveBeenCalledOnce());

    expect(sentBodies(sendBeacon)[0]).toBe(
      `pdf_downloaded r=direct s=- l=en d=browser c=USD n=0 x=${1 << SECTION_BITS.indexOf("tax")}`
    );
  });

  it("leaves out a switched-on section that wouldn't print", async () => {
    const sendBeacon = stubPage();
    const { trackInvoice } = await loadTrack();
    const invoice = invoiceWith({
      sections: {
        ...Object.fromEntries(
          Object.keys(DEFAULT_INVOICE_SECTIONS).map(key => [key, false])
        ),
        currencyConversion: true
      } as Invoice["sections"]
    });

    trackInvoice("pdf_opened", invoice);

    await vi.waitFor(() => expect(sendBeacon).toHaveBeenCalledOnce());

    expect(sentBodies(sendBeacon)[0]).toMatch(/ x=0$/);
  });

  it("names every invoice section in SECTION_BITS", () => {
    expect([...SECTION_BITS].sort()).toEqual(
      Object.keys(DEFAULT_INVOICE_SECTIONS).sort()
    );
  });

  it.each([
    ["ar-AE", "ar"],
    ["fr", "fr"],
    ["zh-CN", "other"]
  ])("buckets the language %s as %s", async (language, bucket) => {
    const sendBeacon = stubPage({ navigator: { language } });
    const { track } = await loadTrack();

    track("data_exported");

    expect(sentBodies(sendBeacon)).toEqual([
      `data_exported l=${bucket} d=browser`
    ]);
  });

  it("says when it runs as the installed app", async () => {
    const sendBeacon = stubPage({ standalone: true });
    const { track } = await loadTrack();

    track("data_exported");

    expect(sentBodies(sendBeacon)).toEqual(["data_exported l=en d=standalone"]);
  });

  it("says when an older iPhone opened it from the home screen", async () => {
    const sendBeacon = stubPage({ navigator: { standalone: true } });
    const { track } = await loadTrack();

    vi.stubGlobal("matchMedia", undefined);
    track("data_exported");

    expect(sentBodies(sendBeacon)).toEqual(["data_exported l=en d=standalone"]);
  });

  it("keeps every body inside the server's limit", async () => {
    countInvoices.mockResolvedValue(3);
    const sendBeacon = stubPage({
      referrer: "https://www.producthunt.com/",
      url: "https://raseeda.com/?ref=producthunt",
      navigator: { language: "zh" },
      standalone: true
    });
    const { trackInvoice } = await loadTrack();
    const invoice = invoiceWith({
      sections: Object.fromEntries(
        Object.keys(DEFAULT_INVOICE_SECTIONS).map(key => [key, true])
      ) as Invoice["sections"]
    });

    trackInvoice("pdf_downloaded", invoice);

    await vi.waitFor(() => expect(sendBeacon).toHaveBeenCalledOnce());

    const [body = ""] = sentBodies(sendBeacon);

    expect(new TextEncoder().encode(body).length).toBeLessThanOrEqual(128);
  });

  it("sends nothing in development", async () => {
    vi.stubEnv("DEV", true);
    const sendBeacon = stubPage();
    const { track, trackInvoice, trackPageView } = await loadTrack();

    track("editor_opened");
    trackInvoice("pdf_opened", invoiceWith());
    trackPageView("/");
    await Promise.resolve();

    expect(sendBeacon).not.toHaveBeenCalled();
    expect(countInvoices).not.toHaveBeenCalled();
  });

  it("sends nothing under Global Privacy Control", async () => {
    const sendBeacon = stubPage({ navigator: { globalPrivacyControl: true } });
    const { track, trackInvoice, trackPageView } = await loadTrack();

    track("editor_opened");
    trackInvoice("invoice_saved", invoiceWith());
    trackPageView("/");
    await Promise.resolve();

    expect(sendBeacon).not.toHaveBeenCalled();
    expect(countInvoices).not.toHaveBeenCalled();
  });

  it("sends when Global Privacy Control is off", async () => {
    const sendBeacon = stubPage({ navigator: { globalPrivacyControl: false } });
    const { track } = await loadTrack();

    track("template_saved");

    expect(sendBeacon).toHaveBeenCalledOnce();
  });

  it("stays quiet when the beacon throws or doesn't exist", async () => {
    stubPage({
      navigator: {
        sendBeacon: () => {
          throw new TypeError("Blocked");
        }
      }
    });
    const { track } = await loadTrack();

    expect(() => track("data_exported")).not.toThrow();

    vi.stubGlobal("navigator", {});

    expect(() => track("data_exported")).not.toThrow();
  });
});
