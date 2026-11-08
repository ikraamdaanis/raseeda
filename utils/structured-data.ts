import { INVOICE_TEMPLATES } from "~/components/templates/invoice-templates";
import { APP_NAME } from "~/consts/app";
import { INVOICE_FONTS } from "~/consts/invoice-fonts";
import { SITE_TEMPLATES } from "~/consts/site-templates";
import type { SiteTemplateId } from "~/types";
import {
  MAKER_PERSON_NAME,
  MAKER_URL,
  PAGE_META,
  SITE_DESCRIPTION,
  SITE_HOST,
  SITE_OG_IMAGE,
  SITE_TITLE,
  SITE_URL,
  SOURCE_URL,
  absoluteUrl
} from "~/utils/site-meta";

// The `@id`s the homepage's graph defines; the other pages point at them
// rather than repeat the nodes.
const WEBSITE_ID = `${SITE_URL}/#website`;

const ORGANIZATION_ID = `${SITE_URL}/#organization`;

// A page's JSON-LD as a `head().scripts` entry. JSON-LD is data, never run,
// so the CSP is unaffected. Escaping "<" keeps any text in it from closing
// the script tag early.
export function jsonLdScript(data: object) {
  return {
    type: "application/ld+json",
    children: JSON.stringify(data).replace(/</g, "\\u003c")
  };
}

// What search engines and AI answer engines read about the app: who makes it,
// the site, the homepage, the app and its source, linked by `@id`. Only facts
// the page itself states; no ratings or reviews, since the app collects none.
// Google reads the site's name from the WebSite node, which must be on the
// homepage; `alternateName` offers the domain as a fallback.
export const HOME_STRUCTURED_DATA = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Person",
      "@id": `${SITE_URL}/#maker`,
      name: MAKER_PERSON_NAME,
      url: MAKER_URL,
      sameAs: [MAKER_URL]
    },
    {
      "@type": "Organization",
      "@id": ORGANIZATION_ID,
      name: APP_NAME,
      url: absoluteUrl("/"),
      logo: {
        "@type": "ImageObject",
        url: absoluteUrl("/logo.png"),
        width: 1500,
        height: 1500
      },
      founder: { "@id": `${SITE_URL}/#maker` },
      sameAs: [SOURCE_URL]
    },
    {
      "@type": "WebSite",
      "@id": WEBSITE_ID,
      url: absoluteUrl("/"),
      name: APP_NAME,
      alternateName: SITE_HOST,
      description: SITE_DESCRIPTION,
      inLanguage: "en",
      publisher: { "@id": ORGANIZATION_ID }
    },
    {
      "@type": "WebPage",
      "@id": `${SITE_URL}/#webpage`,
      url: absoluteUrl("/"),
      name: SITE_TITLE,
      description: SITE_DESCRIPTION,
      inLanguage: "en",
      isPartOf: { "@id": WEBSITE_ID },
      about: { "@id": `${SITE_URL}/#app` },
      primaryImageOfPage: {
        "@type": "ImageObject",
        url: SITE_OG_IMAGE,
        width: 1200,
        height: 630
      }
    },
    {
      "@type": "WebApplication",
      "@id": `${SITE_URL}/#app`,
      name: APP_NAME,
      url: absoluteUrl("/create"),
      description:
        "A free invoice generator that runs in your browser. No account and no uploads: invoices are saved in your browser on your device, and the PDF is made on your device too.",
      applicationCategory: "BusinessApplication",
      operatingSystem: "Any",
      browserRequirements:
        "Requires JavaScript and a browser that allows site storage (IndexedDB).",
      inLanguage: "en",
      isAccessibleForFree: true,
      license: "https://opensource.org/license/mit",
      image: SITE_OG_IMAGE,
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "USD",
        availability: "https://schema.org/InStock",
        url: absoluteUrl("/create")
      },
      featureList: [
        "Download or print an A4 or Letter PDF invoice",
        `Upload your logo and choose from ${INVOICE_FONTS.length} fonts at three sizes`,
        "Any currency, with custom symbols",
        "VAT or sales tax, fees, and fixed or percentage discounts",
        "Payment details: bank name, account and routing numbers, IBAN, BIC / SWIFT and sort code, plus other ways to pay such as PayPal, Venmo, Pix or UPI",
        "Templates for repeat clients",
        "Import and export backups",
        "No account, no uploads, no tracking cookies"
      ],
      author: { "@id": `${SITE_URL}/#maker` },
      publisher: { "@id": ORGANIZATION_ID }
    },
    {
      "@type": "SoftwareSourceCode",
      "@id": `${SITE_URL}/#source`,
      name: `${APP_NAME} source code`,
      codeRepository: SOURCE_URL,
      programmingLanguage: "TypeScript",
      license: "https://opensource.org/license/mit",
      author: { "@id": `${SITE_URL}/#maker` },
      targetProduct: { "@id": `${SITE_URL}/#app` }
    }
  ]
};

const TEMPLATES_URL = absoluteUrl(PAGE_META.templates.path);

// The template gallery: the page, the six templates on it in order (each
// pointing at its card's anchor, as Google asks of a list whose items are all
// on one page), and the trail back to the homepage.
export const TEMPLATES_STRUCTURED_DATA = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "CollectionPage",
      "@id": `${TEMPLATES_URL}#webpage`,
      url: TEMPLATES_URL,
      name: PAGE_META.templates.title,
      description: PAGE_META.templates.description,
      inLanguage: "en",
      isPartOf: { "@id": WEBSITE_ID },
      publisher: { "@id": ORGANIZATION_ID },
      breadcrumb: { "@id": `${TEMPLATES_URL}#breadcrumb` },
      primaryImageOfPage: {
        "@type": "ImageObject",
        url: PAGE_META.templates.image,
        width: 1200,
        height: 630
      },
      mainEntity: {
        "@type": "ItemList",
        numberOfItems: INVOICE_TEMPLATES.length,
        itemListElement: INVOICE_TEMPLATES.map((template, index) => ({
          "@type": "ListItem",
          position: index + 1,
          item: {
            "@type": "CreativeWork",
            url: `${TEMPLATES_URL}#${template.id}`,
            name: `${template.name} invoice template`,
            description: template.description,
            image: absoluteUrl(template.src)
          }
        }))
      }
    },
    {
      "@type": "BreadcrumbList",
      "@id": `${TEMPLATES_URL}#breadcrumb`,
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: "Home",
          item: absoluteUrl("/")
        },
        {
          "@type": "ListItem",
          position: 2,
          name: "Invoice templates",
          item: TEMPLATES_URL
        }
      ]
    }
  ] as const
};

// A site template page (consts/site-templates.ts): the page, what it offers,
// and the trail through the template gallery to it.
export function siteTemplateStructuredData(id: SiteTemplateId) {
  const meta = PAGE_META[id];
  const url = absoluteUrl(meta.path);
  const template = SITE_TEMPLATES.find(siteTemplate => siteTemplate.id === id);

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": `${url}#webpage`,
        url,
        name: meta.title,
        description: meta.description,
        inLanguage: "en",
        isPartOf: { "@id": WEBSITE_ID },
        publisher: { "@id": ORGANIZATION_ID },
        breadcrumb: { "@id": `${url}#breadcrumb` },
        primaryImageOfPage: {
          "@type": "ImageObject",
          url: meta.image,
          width: 1200,
          height: 630
        },
        mainEntity: {
          "@type": "CreativeWork",
          name: template?.name,
          description: template?.summary,
          image: template && absoluteUrl(template.src)
        }
      },
      {
        "@type": "BreadcrumbList",
        "@id": `${url}#breadcrumb`,
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: "Home",
            item: absoluteUrl("/")
          },
          {
            "@type": "ListItem",
            position: 2,
            name: "Invoice templates",
            item: TEMPLATES_URL
          },
          {
            "@type": "ListItem",
            position: 3,
            name: template?.name,
            item: url
          }
        ]
      }
    ]
  };
}

const PRIVACY_URL = absoluteUrl(PAGE_META.privacy.path);

// The privacy policy, as a page of the site, dated by its last change in
// substance (an ISO date, `YYYY-MM-DD`).
export function privacyStructuredData(dateModified: string) {
  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "@id": `${PRIVACY_URL}#webpage`,
    url: PRIVACY_URL,
    name: PAGE_META.privacy.title,
    description: PAGE_META.privacy.description,
    inLanguage: "en",
    dateModified,
    isPartOf: { "@id": WEBSITE_ID },
    publisher: { "@id": ORGANIZATION_ID }
  };
}
