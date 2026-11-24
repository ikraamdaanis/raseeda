import { createFileRoute, Link } from "@tanstack/react-router";
import {
  POLICY_LINK,
  POLICY_PROSE,
  PolicyExternalLink,
  PolicyPage,
  PolicySection
} from "~/components/home/policy-page";
import { APP_NAME } from "~/consts/app";
import {
  canonicalLink,
  CONTACT_EMAIL,
  MAKER_COUNTRY,
  MAKER_PERSON_NAME,
  PAGE_META,
  SITE_HOST,
  siteMeta,
  SOURCE_URL
} from "~/utils/site-meta";
import { jsonLdScript, policyStructuredData } from "~/utils/structured-data";

export const Route = createFileRoute("/terms")({
  component: TermsPage,
  head: () => ({
    meta: siteMeta(PAGE_META.terms),
    links: [canonicalLink(PAGE_META.terms.path)],
    scripts: [jsonLdScript(policyStructuredData(PAGE_META.terms, LAST_UPDATED))]
  })
});

// The date the terms last changed in substance (YYYY-MM-DD); update it with
// the copy.
const LAST_UPDATED = "2026-11-24";

const SUMMARY = [
  `${APP_NAME} is free, and provided as is, with no guarantee.`,
  "What goes on your invoices, and whether they meet your tax and invoicing rules, is up to you.",
  "Your invoices are stored only in your browser, so keep a backup."
];

// What using the site means for both sides. The code's own licence (MIT)
// covers copying the code; these cover using the hosted site.
function TermsPage() {
  return (
    <PolicyPage
      title="Terms of use"
      intro={`These terms cover using ${APP_NAME} at ${SITE_HOST}. They’re short, because ${APP_NAME} is a free tool that makes documents in your browser and never sees them.`}
      lastUpdated={LAST_UPDATED}
      summary={SUMMARY}
    >
      <PolicySection title={`Using ${APP_NAME}`}>
        <p className={POLICY_PROSE}>
          You can use {APP_NAME} for free, for personal or business documents,
          with no account. Don’t use it to make documents meant to deceive, such
          as a fake invoice or receipt, or for anything else unlawful, and don’t
          try to disrupt the site.
        </p>
      </PolicySection>
      <PolicySection title="Your documents">
        <p className={POLICY_PROSE}>
          What you put on a document, and whether it meets the rules where you
          and your client are (such as a tax number, VAT, or what an invoice
          must show), is up to you. {APP_NAME}’s templates, labels and wording
          are a starting point, not tax, legal or accounting advice. Check a
          document’s totals and tax before you send it.
        </p>
        <p className={POLICY_PROSE}>
          The documents you make are yours. {APP_NAME} never receives them, as
          the{" "}
          <Link to="/privacy" className={POLICY_LINK}>
            privacy policy
          </Link>{" "}
          explains.
        </p>
      </PolicySection>
      <PolicySection title="Keeping your data">
        <p className={POLICY_PROSE}>
          Your invoices are stored only in this browser, on this device.
          Clearing the browser’s site data deletes them, and Safari deletes a
          site’s storage on its own when you haven’t opened it for seven days.{" "}
          {APP_NAME} never has a copy, so it can’t get them back. Keep a backup
          with Export Data in the editor’s menu.
        </p>
      </PolicySection>
      <PolicySection title="No guarantee">
        <p className={POLICY_PROSE}>
          {APP_NAME} is provided as is and as available, without warranties of
          any kind, including that it is free of errors, always available or fit
          for a particular purpose. It may change, or stop, at any time.
        </p>
        <p className={POLICY_PROSE}>
          As far as the law allows, {MAKER_PERSON_NAME} isn’t liable for any
          loss from using {APP_NAME}, such as lost documents, lost income, or a
          mistake on a document like a wrong total or tax amount. Nothing in
          these terms limits a liability the law doesn’t allow to be limited.
        </p>
      </PolicySection>
      <PolicySection title="The code">
        <p className={POLICY_PROSE}>
          {APP_NAME}’s code is public under the{" "}
          <PolicyExternalLink href={`${SOURCE_URL}/blob/main/LICENSE`}>
            MIT licence
          </PolicyExternalLink>
          , which covers copying and changing it. These terms cover using the
          site at {SITE_HOST}.
        </p>
      </PolicySection>
      <PolicySection title="Changes and the law">
        <p className={POLICY_PROSE}>
          These terms may change; the date at the top says when they last did.
          They’re governed by the laws of {MAKER_COUNTRY}. If you use {APP_NAME}{" "}
          as a consumer, you keep any protection the law where you live gives
          you.
        </p>
      </PolicySection>
      <PolicySection title="Contact">
        <p className={POLICY_PROSE}>
          {APP_NAME} is made and run by {MAKER_PERSON_NAME}. Questions about
          these terms? Email{" "}
          <a href={`mailto:${CONTACT_EMAIL}`} className={POLICY_LINK}>
            {CONTACT_EMAIL}
          </a>
          .
        </p>
      </PolicySection>
    </PolicyPage>
  );
}
