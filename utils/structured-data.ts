import { APP_NAME } from "~/consts/app";
import { INVOICE_FONTS } from "~/consts/invoice-fonts";
import {
  MAKER_NAME,
  MAKER_URL,
  SITE_DESCRIPTION,
  SITE_OG_IMAGE,
  SITE_TITLE,
  SITE_URL,
  SOURCE_URL,
  absoluteUrl
} from "~/utils/site-meta";

// What search engines and AI answer engines read about the app: who makes it,
// the site, the homepage, the app and its source, linked by `@id`. Only facts
// the page itself states; no ratings or reviews, since the app collects none.
// It is a data block the browser never runs, so the CSP is unaffected.
export const HOME_STRUCTURED_DATA = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Person",
      "@id": `${SITE_URL}/#maker`,
      name: MAKER_NAME,
      url: MAKER_URL,
      sameAs: [MAKER_URL]
    },
    {
      "@type": "Organization",
      "@id": `${SITE_URL}/#organization`,
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
      "@id": `${SITE_URL}/#website`,
      url: absoluteUrl("/"),
      name: APP_NAME,
      description: SITE_DESCRIPTION,
      inLanguage: "en",
      publisher: { "@id": `${SITE_URL}/#organization` }
    },
    {
      "@type": "WebPage",
      "@id": `${SITE_URL}/#webpage`,
      url: absoluteUrl("/"),
      name: SITE_TITLE,
      description: SITE_DESCRIPTION,
      inLanguage: "en",
      isPartOf: { "@id": `${SITE_URL}/#website` },
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
        "Download or print an A4 PDF invoice",
        `Upload your logo and choose from ${INVOICE_FONTS.length} fonts at three sizes`,
        "Any currency, with custom symbols",
        "VAT or sales tax, fees, and fixed or percentage discounts",
        "Payment details: bank name, account and routing numbers, IBAN, BIC / SWIFT and sort code",
        "Templates for repeat clients",
        "Import and export backups",
        "No account, no uploads, no tracking cookies"
      ],
      author: { "@id": `${SITE_URL}/#maker` },
      publisher: { "@id": `${SITE_URL}/#organization` }
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
