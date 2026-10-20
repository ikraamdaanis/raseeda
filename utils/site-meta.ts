import { APP_NAME } from "~/consts/app";

export const SITE_URL = "https://billsend.io";

export const SITE_TITLE = `${APP_NAME}: Free, Private Invoice Generator`;

export const SITE_DESCRIPTION =
  "Free invoice generator that runs in your browser. Add your details, download a PDF, send it. No account, and your invoices never leave your device.";

export const SITE_OG_IMAGE = `${SITE_URL}/og-image.jpg`;

export const SOURCE_URL = "https://github.com/ikraamdaanis/billsend";

export const MAKER_NAME = "ikraam | freelio";

export const MAKER_URL = "https://github.com/ikraamdaanis";

const SITE_OG_IMAGE_ALT = `${APP_NAME}: Make the invoice. Keep your data. A finished invoice on a pale blue sky.`;

// The absolute address of a page, the form canonicals and og:url need.
export function absoluteUrl(path: string) {
  return new URL(path, SITE_URL).href;
}

// A page's title, description and share card. The root route sets the
// homepage's as the fallback for pages without their own (404, errors); each
// page passes its own path so og:url names it rather than the homepage.
export function siteMeta({
  path = "/",
  title = SITE_TITLE,
  description = SITE_DESCRIPTION
}: {
  path?: string;
  title?: string;
  description?: string;
} = {}) {
  return [
    {
      title
    },
    {
      name: "description",
      content: description
    },
    {
      property: "og:type",
      content: "website"
    },
    {
      property: "og:site_name",
      content: APP_NAME
    },
    {
      property: "og:url",
      content: absoluteUrl(path)
    },
    {
      property: "og:title",
      content: title
    },
    {
      property: "og:description",
      content: description
    },
    {
      property: "og:image",
      content: SITE_OG_IMAGE
    },
    {
      property: "og:image:width",
      content: "1200"
    },
    {
      property: "og:image:height",
      content: "630"
    },
    {
      property: "og:image:alt",
      content: SITE_OG_IMAGE_ALT
    },
    {
      name: "twitter:card",
      content: "summary_large_image"
    },
    {
      name: "twitter:title",
      content: title
    },
    {
      name: "twitter:description",
      content: description
    },
    {
      name: "twitter:image",
      content: SITE_OG_IMAGE
    },
    {
      name: "twitter:image:alt",
      content: SITE_OG_IMAGE_ALT
    }
  ];
}

// Query strings (`?font=`, `?open=`, tracking tags) don't change a page, so
// every variant points search engines at the bare address.
export function canonicalLink(path: string) {
  return { rel: "canonical", href: absoluteUrl(path) };
}
