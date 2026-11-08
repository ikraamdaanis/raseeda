import { APP_NAME } from "~/consts/app";

export const SITE_URL = "https://raseeda.com";

// The bare domain, the form copy names the site by.
export const SITE_HOST = new URL(SITE_URL).host;

// Titles lead with what people search for and end with the name: Google takes
// the site name from the homepage's WebSite structured data, not the title.
export const SITE_TITLE = `Free Invoice Generator: No Sign-Up, Private PDF | ${APP_NAME}`;

export const SITE_DESCRIPTION =
  "Free invoice generator that runs in your browser. Download a PDF with no account; your invoices never leave your device.";

export const SITE_OG_IMAGE = `${SITE_URL}/og-image.jpg`;

export const SOURCE_URL = "https://github.com/ikraamdaanis/raseeda";

export const MAKER_NAME = "ikraam | freelio";

// The maker's own name, for the structured data's Person; MAKER_NAME is the
// handle the footer shows.
export const MAKER_PERSON_NAME = "Ikraam";

export const MAKER_URL = "https://github.com/ikraamdaanis";

const SITE_OG_IMAGE_ALT = `${APP_NAME}: Make the invoice. Keep your data. A "Create an invoice" button beside a finished invoice on a pale blue sky.`;

// The language and region the copy is written in: English, with British
// spelling.
export const SITE_LOCALE = "en_GB";

// What an indexable page asks of search engines: show its pictures at full
// size in results, not as small thumbnails.
const INDEXABLE_ROBOTS = "max-image-preview:large";

// Each page's title, description and share card. The editor is left out of
// search results: the homepage is the page for making an invoice, and the
// editor's HTML is a loading screen until it runs. Every share image is
// 1200 x 630, and every description fits in the 125 characters a share
// preview shows before cutting it off.
export const PAGE_META = {
  home: {
    path: "/",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION
  },
  templates: {
    path: "/invoice-template",
    title: `Free Invoice Templates: Fill In Online, Download PDF | ${APP_NAME}`,
    description:
      "Free invoice templates for freelancers, consultants, contractors and small businesses. Fill one in online, download a PDF.",
    image: `${SITE_URL}/og-invoice-template.jpg`,
    imageAlt: `Six ${APP_NAME} invoice templates: freelance, consulting, small business, contractor, photography and web development`
  },
  quote: {
    path: "/quote-template",
    title: `Free Quote Template: Fill In Online, Download PDF | ${APP_NAME}`,
    description:
      "Free quote template with a valid-until date. Fill it in online, download a PDF, and turn it into an invoice when it's agreed.",
    image: `${SITE_URL}/og-quote-template.jpg`,
    imageAlt: `A quote made in ${APP_NAME}, on a pale blue sky`
  },
  "proforma-invoice": {
    path: "/proforma-invoice-template",
    title: `Free Proforma Invoice Template, Download PDF | ${APP_NAME}`,
    description:
      "Free proforma invoice template for payment up front or customs. Fill it in online and download a PDF, with no account.",
    image: `${SITE_URL}/og-proforma-invoice-template.jpg`,
    imageAlt: `A proforma invoice made in ${APP_NAME}, on a pale blue sky`
  },
  receipt: {
    path: "/receipt-template",
    title: `Free Receipt Template: Fill In Online, Download PDF | ${APP_NAME}`,
    description:
      "Free receipt template showing the date paid and how it was paid. Fill it in online and download a PDF, with no account.",
    image: `${SITE_URL}/og-receipt-template.jpg`,
    imageAlt: `A receipt made in ${APP_NAME}, on a pale blue sky`
  },
  "credit-note": {
    path: "/credit-note-template",
    title: `Free Credit Note Template: Fill In Online, Download PDF | ${APP_NAME}`,
    description:
      "Free credit note template that names the invoice it corrects. Fill it in online and download a PDF, with no account.",
    image: `${SITE_URL}/og-credit-note-template.jpg`,
    imageAlt: `A credit note made in ${APP_NAME}, on a pale blue sky`
  },
  freelance: {
    path: "/freelance-invoice-template",
    title: `Free Freelance Invoice Template for Hourly Work | ${APP_NAME}`,
    description:
      "Free freelance invoice template with Hours and Rate columns. Fill it in online and download a PDF, with no account.",
    image: `${SITE_URL}/og-freelance-invoice-template.jpg`,
    imageAlt: `A freelance invoice made in ${APP_NAME}, on a pale blue sky`
  },
  contractor: {
    path: "/contractor-invoice-template",
    title: `Free Contractor Invoice Template: Labour and Materials | ${APP_NAME}`,
    description:
      "Free contractor invoice template with labour, materials, a job site and a deposit. Fill it in online and download a PDF.",
    image: `${SITE_URL}/og-contractor-invoice-template.jpg`,
    imageAlt: `A contractor invoice made in ${APP_NAME}, on a pale blue sky`
  },
  retail: {
    path: "/retail-invoice-template",
    title: `Free Retail Invoice Template with Per-Line Tax | ${APP_NAME}`,
    description:
      "Free retail invoice template with a tax rate on each line. Fill it in online and download a PDF, with no account.",
    image: `${SITE_URL}/og-retail-invoice-template.jpg`,
    imageAlt: `A retail invoice made in ${APP_NAME}, on a pale blue sky`
  },
  create: {
    path: "/create",
    title: `Create an Invoice Online, Free PDF | ${APP_NAME}`,
    description:
      "Fill in your details, your client and the line items, then download a PDF. Free, no account, and it stays in this browser.",
    robots: "noindex"
  },
  privacy: {
    path: "/privacy",
    title: `Privacy: Your Invoices Stay on Your Device | ${APP_NAME}`,
    description: `${APP_NAME} keeps your invoices on your device and never uploads them. What is stored, where, and what the site's host can see.`
  }
};

// The absolute address of a page, the form canonicals and og:url need.
export function absoluteUrl(path: string) {
  return new URL(path, SITE_URL).href;
}

// A page's title, description, robots rules and share card. The root route
// sets the homepage's as the fallback for a page without its own (the
// not-found page has its own, in app/routes/__root.tsx); each page passes its
// own path so og:url names it rather than the homepage. A page's tags replace
// the root's by name or property, so a page that passes `robots` overrides
// the indexable default.
export function siteMeta({
  path = "/",
  title = SITE_TITLE,
  description = SITE_DESCRIPTION,
  robots = INDEXABLE_ROBOTS,
  image = SITE_OG_IMAGE,
  imageAlt = SITE_OG_IMAGE_ALT
}: {
  path?: string;
  title?: string;
  description?: string;
  robots?: string;
  image?: string;
  imageAlt?: string;
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
      name: "robots",
      content: robots
    },
    {
      property: "og:type",
      content: "website"
    },
    {
      property: "og:locale",
      content: SITE_LOCALE
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
      content: image
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
      content: imageAlt
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
      content: image
    },
    {
      name: "twitter:image:alt",
      content: imageAlt
    }
  ];
}

// Query strings (`?font=`, `?open=`, tracking tags) don't change a page, so
// every variant points search engines at the bare address.
export function canonicalLink(path: string) {
  return { rel: "canonical", href: absoluteUrl(path) };
}
