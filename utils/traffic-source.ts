import { SOURCES } from "~/consts/analytics-events";
import type { Referrer, TrafficSource } from "~/types";

type Site = Exclude<Referrer, "direct" | "internal" | "other">;

// Hosts that name a site. A host also matches by any subdomain
// (l.facebook.com, old.reddit.com), except Google: only its search pages count
// as google (GOOGLE_SEARCH), so gemini.google.com and mail.google.com don't.
// The android-app:// hosts are the referrers Android apps send.
const SITE_HOSTS: Partial<Record<string, Site>> = {
  "com.google.android.googlequicksearchbox": "google",
  "bing.com": "bing",
  "duckduckgo.com": "duckduckgo",
  "chatgpt.com": "chatgpt",
  "chat.openai.com": "chatgpt",
  "perplexity.ai": "perplexity",
  "claude.ai": "claude",
  "gemini.google.com": "gemini",
  "copilot.microsoft.com": "copilot",
  "x.com": "x",
  "twitter.com": "x",
  "t.co": "x",
  "com.twitter.android": "x",
  "linkedin.com": "linkedin",
  "lnkd.in": "linkedin",
  "com.linkedin.android": "linkedin",
  "reddit.com": "reddit",
  "com.reddit.frontpage": "reddit",
  "facebook.com": "facebook",
  "instagram.com": "instagram",
  "youtube.com": "youtube",
  "youtu.be": "youtube",
  "github.com": "github",
  "producthunt.com": "producthunt",
  "news.ycombinator.com": "hackernews"
};

// google.com and every country's Google (google.co.uk, google.ae), with or
// without www.
const GOOGLE_SEARCH = /^(www\.)?google\.[a-z]{2,3}(\.[a-z]{2})?$/;

// The site a host belongs to, or null when it isn't one of them.
function siteForHost(host: string): Site | null {
  if (GOOGLE_SEARCH.test(host)) return "google";

  const labels = host.split(".");

  for (let i = 0; i < labels.length - 1; i++) {
    const site = SITE_HOSTS[labels.slice(i).join(".")];

    if (site) return site;
  }

  return null;
}

// Reduces the page's referrer to the kind of site it is. Only the bucket is
// ever sent; the address, its path and query stay in the browser.
export function bucketReferrer(referrer: string, ownHost: string): Referrer {
  if (!referrer) return "direct";

  let url: URL;

  try {
    url = new URL(referrer);
  } catch {
    return "other";
  }

  if (url.host === ownHost) return "internal";

  return siteForHost(url.hostname.toLowerCase()) ?? "other";
}

// Reduces a landing page's `?ref=` or `utm_source` to a known source: one of
// the names we use ourselves ("newsletter", "linkedin"), or a site's host as
// some apps send it (ChatGPT adds utm_source=chatgpt.com). Anything else is
// "other", and no value at all is null.
export function bucketSource(value: string | null): TrafficSource | null {
  const source = value?.trim().toLowerCase();

  if (!source) return null;

  return (
    SOURCES.find(known => known === source) ?? siteForHost(source) ?? "other"
  );
}
