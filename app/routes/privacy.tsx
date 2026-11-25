import { createFileRoute } from "@tanstack/react-router";
import {
  POLICY_LINK,
  POLICY_PROSE,
  PolicyExternalLink,
  PolicyPage,
  PolicySection
} from "~/components/policy/policy-page";
import { APP_NAME } from "~/consts/app";
import {
  canonicalLink,
  MAKER_COUNTRY,
  MAKER_PERSON_NAME,
  PAGE_META,
  PRIVACY_EMAIL,
  SITE_HOST,
  siteMeta,
  SOURCE_URL
} from "~/utils/site-meta";
import { jsonLdScript, policyStructuredData } from "~/utils/structured-data";

export const Route = createFileRoute("/privacy")({
  component: PrivacyPage,
  head: () => ({
    meta: siteMeta(PAGE_META.privacy),
    links: [canonicalLink(PAGE_META.privacy.path)],
    scripts: [
      jsonLdScript(policyStructuredData(PAGE_META.privacy, LAST_UPDATED))
    ]
  })
});

// The date the policy last changed in substance (YYYY-MM-DD); update it with
// the copy. The page shows it written out, and the structured data carries it
// as is.
const LAST_UPDATED = "2026-11-24";

// The short version, read before the detail below it.
const SUMMARY = [
  "Your invoices, logos and settings are stored only in this browser, on this device.",
  `Nothing you type into an invoice is sent to ${APP_NAME} or anyone else.`,
  `${APP_NAME} counts anonymous events, such as a PDF being made, with no names, amounts or identifiers.`,
  `There are no accounts, ads or tracking, and ${APP_NAME} sets no cookies.`
];

// The same words as the homepage's promise, said once in full: where the
// data lives, what leaves, what the app never does, and what the host sees.
function PrivacyPage() {
  return (
    <PolicyPage
      title="Privacy"
      intro={`${APP_NAME} is built so that your invoices never reach us. This page says what is stored, where it is stored, and what the site’s host can see.`}
      lastUpdated={LAST_UPDATED}
      summary={SUMMARY}
    >
      <PolicySection title="What stays on your device">
        <p className={POLICY_PROSE}>
          Everything you type into an invoice, your logo and signature, the
          invoices and templates you save, the earlier versions kept of each
          invoice, and which one you had open last are stored in this browser’s
          storage (IndexedDB), on this device.
        </p>
        <p className={POLICY_PROSE}>
          The editor also remembers your settings in this browser’s local
          storage, such as light or dark, the zoom, which panels are open, how
          the documents list is sorted and filtered, when you last downloaded a
          backup and when you were last reminded to. Within a tab, session
          storage remembers which document is open and how far down each page
          you were, so a reload or the Back button returns you to the same
          place; it’s cleared when the tab closes. Your browser also keeps a
          copy of the site’s own files, so it opens without a connection. None
          of this is sent anywhere.
        </p>
        <p className={POLICY_PROSE}>
          The PDF is made in your browser too. Your invoices aren’t uploaded;
          besides loading the site, the only thing your browser sends {APP_NAME}{" "}
          is the anonymous usage counts described below.
        </p>
        <p className={POLICY_PROSE}>
          Other browsers and devices can’t see your invoices. Clearing this
          browser’s site data for {SITE_HOST} deletes them, and Safari deletes a
          site’s storage on its own when you haven’t opened it for seven days,
          so keep a backup.
        </p>
      </PolicySection>
      <PolicySection title="What leaves your device">
        <p className={POLICY_PROSE}>
          The files you choose to save: the PDF you download, and the backup
          file from Export Data in the editor’s menu (or Download a backup, when
          the editor suggests one). The backup includes your bank details, so
          keep it somewhere safe.
        </p>
        <p className={POLICY_PROSE}>
          And the anonymous usage counts below, which never include your names,
          amounts or the text of your invoices.
        </p>
      </PolicySection>
      <PolicySection title="Anonymous usage counts">
        <p className={POLICY_PROSE}>
          To see roughly how {APP_NAME} is used, your browser tells {SITE_HOST}{" "}
          when one of these happens: a page is viewed, the editor opens, a PDF
          is made, an invoice or template is first saved, or data is exported or
          imported. With the event, {APP_NAME} keeps the country the request
          came from, the browser family, operating system and type of device
          (such as Safari, iOS, mobile), your browser’s language (such as
          English), and whether {APP_NAME} is open in a browser tab or installed
          as an app.
        </p>
        <p className={POLICY_PROSE}>
          A page view also says which page. The first page you open says what
          kind of site you came from (such as a search engine, an AI assistant
          or a social network, never its address), or the name in a link{" "}
          {APP_NAME} shared (such as ?ref=newsletter). A PDF or a first save
          says the same, to show which of them lead to invoices.
        </p>
        <p className={POLICY_PROSE}>
          Opening the editor, making a PDF and first saving an invoice also say
          roughly how many invoices this browser has saved (none, one, two to
          five, or more), so first visits can be told from returning ones. A PDF
          and a first save say the invoice’s currency code when it’s one of a
          fixed list of common currencies (such as GBP or AED), and a PDF says
          which optional parts it includes (such as tax or notes).
        </p>
        <p className={POLICY_PROSE}>
          That is all. The counts never include your names, amounts, the text of
          your invoices or anything about them not listed here. {APP_NAME}{" "}
          doesn’t keep your IP address, your city, your full browser details,
          the address of the site you came from or any identifier, and saves
          nothing on your device for the counts, so visits can’t be linked
          together.
        </p>
        <p className={POLICY_PROSE}>
          If your browser sends Global Privacy Control, nothing is counted. The
          counts are kept for 3 months.
        </p>
      </PolicySection>
      <PolicySection title={`What ${APP_NAME} doesn’t do`}>
        <p className={POLICY_PROSE}>
          {APP_NAME} has no accounts, no ads and no tracking of individuals, and
          sets no cookies.
        </p>
        <p className={POLICY_PROSE}>
          Every page is sent with a Content Security Policy that only lets it
          send data to {SITE_HOST} itself, so your browser blocks any attempt to
          send data anywhere else, including from {APP_NAME}’s own code. The one
          script it loads from elsewhere is Cloudflare’s page-view counter,
          described under Hosting. You can read the policy in your browser’s
          developer tools, or in the{" "}
          <PolicyExternalLink
            href={`${SOURCE_URL}/blob/main/consts/content-security-policy.ts`}
          >
            source on GitHub
          </PolicyExternalLink>
          .
        </p>
      </PolicySection>
      <PolicySection title="Hosting">
        <p className={POLICY_PROSE}>
          {SITE_HOST} is served by Cloudflare. Like any web host, Cloudflare
          receives the technical details of each request your browser makes to
          load the site, such as your IP address and browser type, in order to
          deliver it and protect it from abuse, and it may set a strictly
          necessary security cookie for that purpose. Those requests never
          contain your invoices. The country and browser details of the
          usage-count requests are also used, in aggregate, for the counts
          above. Cloudflare’s handling is covered by its{" "}
          <PolicyExternalLink href="https://www.cloudflare.com/privacypolicy/">
            privacy policy
          </PolicyExternalLink>
          . Cloudflare runs servers around the world, so a request may be
          handled outside your country, including in the United States.
        </p>
        <p className={POLICY_PROSE}>
          {SITE_HOST} also counts page views with Cloudflare Web Analytics.
          Cloudflare adds a small script to each page, loaded from
          static.cloudflareinsights.com, that reports to {SITE_HOST} which page
          was viewed and how quickly it loaded, along with the details any page
          view carries, such as your browser and the site you came from. It sets
          no cookies, and Cloudflare says it doesn’t collect or use visitors’
          personal data. It never sees your invoices.
        </p>
      </PolicySection>
      <PolicySection title="Why this is allowed">
        <p className={POLICY_PROSE}>
          {APP_NAME} never collects your invoices, so it needs no permission for
          them. For the anonymous usage counts and for the details any web host
          receives, it relies on its legitimate interest in running the site
          safely and in knowing roughly how it’s used. {APP_NAME} doesn’t use
          them to identify anyone, the counts keep no identifier, and Global
          Privacy Control turns the counts off.
        </p>
      </PolicySection>
      <PolicySection title="Your rights">
        <p className={POLICY_PROSE}>
          Your invoices are only on your device, so you can see, change or
          delete them yourself at any time, and {APP_NAME} has no copy to hand
          over. The usage counts can’t be linked to you, so there is usually
          nothing kept about you to look up or delete.
        </p>
        <p className={POLICY_PROSE}>
          You can still ask what {APP_NAME} holds, object to the counts or ask
          for anything to be deleted, by emailing{" "}
          <a href={`mailto:${PRIVACY_EMAIL}`} className={POLICY_LINK}>
            {PRIVACY_EMAIL}
          </a>
          . If you’re unhappy with the answer, you can complain to the data
          protection authority where you live, such as the ICO in the UK or your
          country’s authority in the EU, or to the UAE Data Office.
        </p>
      </PolicySection>
      <PolicySection title="Checking for yourself">
        <p className={POLICY_PROSE}>
          The code is public on GitHub under the MIT licence, so anyone can
          check what {APP_NAME} does with your data.
        </p>
      </PolicySection>
      <PolicySection title={`Who runs ${APP_NAME}`}>
        <p className={POLICY_PROSE}>
          {APP_NAME} is made and run by {MAKER_PERSON_NAME}, in {MAKER_COUNTRY}.
          For anything about your privacy, email{" "}
          <a href={`mailto:${PRIVACY_EMAIL}`} className={POLICY_LINK}>
            {PRIVACY_EMAIL}
          </a>
          . Found something that doesn’t match this page?{" "}
          <PolicyExternalLink href={`${SOURCE_URL}/issues`}>
            Open an issue on GitHub
          </PolicyExternalLink>
          .
        </p>
      </PolicySection>
    </PolicyPage>
  );
}
