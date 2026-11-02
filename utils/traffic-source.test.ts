import { describe, expect, it } from "vitest";
import { bucketReferrer, bucketSource } from "~/utils/traffic-source";

const OWN_HOST = "raseeda.com";

describe("bucketReferrer", () => {
  it.each([
    ["https://www.google.com/", "google"],
    ["https://google.com/", "google"],
    ["https://www.google.co.uk/", "google"],
    ["https://www.google.ae/", "google"],
    ["https://www.google.com.sa/", "google"],
    ["android-app://com.google.android.googlequicksearchbox/", "google"],
    ["https://www.bing.com/", "bing"],
    ["https://cn.bing.com/", "bing"],
    ["https://duckduckgo.com/", "duckduckgo"],
    ["https://chatgpt.com/", "chatgpt"],
    ["https://chat.openai.com/", "chatgpt"],
    ["https://www.perplexity.ai/", "perplexity"],
    ["https://claude.ai/", "claude"],
    ["https://gemini.google.com/", "gemini"],
    ["https://copilot.microsoft.com/", "copilot"],
    ["https://x.com/", "x"],
    ["https://t.co/", "x"],
    ["https://mobile.twitter.com/", "x"],
    ["https://www.linkedin.com/", "linkedin"],
    ["https://lnkd.in/", "linkedin"],
    ["https://old.reddit.com/", "reddit"],
    ["https://l.facebook.com/", "facebook"],
    ["https://m.facebook.com/", "facebook"],
    ["https://l.instagram.com/", "instagram"],
    ["https://m.youtube.com/", "youtube"],
    ["https://github.com/", "github"],
    ["https://www.producthunt.com/", "producthunt"],
    ["https://news.ycombinator.com/", "hackernews"]
  ])("buckets %s as %s", (referrer, bucket) => {
    expect(bucketReferrer(referrer, OWN_HOST)).toBe(bucket);
  });

  it.each([
    ["Google's other products", "https://mail.google.com/"],
    ["Google News", "https://news.google.com/"],
    ["a lookalike host", "https://chatgpt.com.example.net/"],
    ["a host ending in a known one", "https://notx.com/"],
    ["an unknown site", "https://blog.example.com/post?id=1"],
    ["an Android app we don't name", "android-app://com.google.android.gm/"],
    ["junk", "not a url"]
  ])("buckets %s as other", (_case, referrer) => {
    expect(bucketReferrer(referrer, OWN_HOST)).toBe("other");
  });

  it("is direct with no referrer", () => {
    expect(bucketReferrer("", OWN_HOST)).toBe("direct");
  });

  it("is internal from the site's own pages, on any host it runs on", () => {
    expect(bucketReferrer("https://raseeda.com/privacy", OWN_HOST)).toBe(
      "internal"
    );
    expect(bucketReferrer("http://localhost:4173/", "localhost:4173")).toBe(
      "internal"
    );
  });

  it("never returns any part of the address", () => {
    expect(
      bucketReferrer("https://www.google.com/search?q=acme+invoice", OWN_HOST)
    ).toBe("google");
  });
});

describe("bucketSource", () => {
  it.each([
    ["newsletter", "newsletter"],
    ["LinkedIn", "linkedin"],
    ["  producthunt ", "producthunt"],
    ["chatgpt.com", "chatgpt"],
    ["www.reddit.com", "reddit"],
    ["news.ycombinator.com", "hackernews"],
    ["my-friend", "other"],
    ["direct", "other"],
    ["internal", "other"],
    ["https://evil.example/?q=1", "other"]
  ])("buckets %s as %s", (value, bucket) => {
    expect(bucketSource(value)).toBe(bucket);
  });

  it("is null without a value", () => {
    expect(bucketSource(null)).toBeNull();
    expect(bucketSource("")).toBeNull();
    expect(bucketSource("  ")).toBeNull();
  });
});
