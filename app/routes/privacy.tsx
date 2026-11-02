import { createFileRoute } from "@tanstack/react-router";
import { format, parseISO } from "date-fns";
import type { ReactNode } from "react";
import {
  CONTAINER,
  FOCUS_RING,
  PageHeader,
  SiteFooter
} from "~/components/home/site-chrome";
import { APP_NAME } from "~/consts/app";
import { typeClass } from "~/lib/type-scale";
import { cn } from "~/lib/utils";
import {
  canonicalLink,
  PAGE_META,
  SITE_HOST,
  siteMeta,
  SOURCE_URL
} from "~/utils/site-meta";
import { jsonLdScript, privacyStructuredData } from "~/utils/structured-data";

export const Route = createFileRoute("/privacy")({
  component: PrivacyPage,
  head: () => ({
    meta: siteMeta(PAGE_META.privacy),
    links: [canonicalLink(PAGE_META.privacy.path)],
    scripts: [jsonLdScript(privacyStructuredData(LAST_UPDATED))]
  })
});

// The date the policy last changed in substance (YYYY-MM-DD); update it with
// the copy. The page shows it written out, and the structured data carries it
// as is.
const LAST_UPDATED = "2026-11-02";

const HEADING = "font-medium tracking-[-0.035em] text-balance";

const PROSE = cn("text-pretty text-zinc-600", typeClass("body"));

const INLINE_LINK = cn(
  "text-ink hover:text-brand-600 rounded-sm font-medium underline decoration-zinc-950/20 underline-offset-4",
  FOCUS_RING
);

// The same words as the homepage's promise, said once in full: where the
// data lives, what leaves, what the app never does, and what the host sees.
function PrivacyPage() {
  return (
    <div className="home-type selection:bg-brand-100 bg-canvas text-ink font-home isolate min-h-svh antialiased">
      <PageHeader />
      <main className={cn(CONTAINER, "pt-12 pb-16 sm:pt-20 sm:pb-24")}>
        <article className="flex max-w-[64ch] flex-col gap-12">
          <div className="flex flex-col gap-6">
            <h1 className={cn(HEADING, typeClass("title"))}>Privacy</h1>
            <p className={cn(PROSE, "text-lg/7")}>
              {APP_NAME} is built so that your invoices never reach us. This
              page says what is stored, where it is stored, and what the site’s
              host can see.
            </p>
            <p className={cn(typeClass("caption"), "text-zinc-500")}>
              Last updated{" "}
              <time dateTime={LAST_UPDATED}>
                {format(parseISO(LAST_UPDATED), "d MMMM yyyy")}
              </time>
            </p>
          </div>
          <PolicySection title="What stays on your device">
            <p className={PROSE}>
              Everything you type into an invoice, your logo, the invoices and
              templates you save, and the draft the editor keeps as you work are
              stored in this browser’s storage (IndexedDB), on this device.
            </p>
            <p className={PROSE}>
              The PDF is made in your browser too. Your invoices aren’t
              uploaded; besides loading the site, the only thing your browser
              sends {APP_NAME} is the anonymous usage counts described below.
            </p>
            <p className={PROSE}>
              Other browsers and devices can’t see your invoices. Clearing this
              browser’s site data for {SITE_HOST} deletes them.
            </p>
          </PolicySection>
          <PolicySection title="What leaves your device">
            <p className={PROSE}>
              The files you choose to save: the PDF you download, and the backup
              file from Export Data in the editor’s File menu. The backup
              includes your bank details, so keep it somewhere safe.
            </p>
            <p className={PROSE}>
              And the anonymous usage counts below, which never include your
              names, amounts or the text of your invoices.
            </p>
          </PolicySection>
          <PolicySection title="Anonymous usage counts">
            <p className={PROSE}>
              To see roughly how {APP_NAME} is used, your browser tells{" "}
              {SITE_HOST} when one of these happens: a page is viewed, the
              editor opens, a PDF is made, an invoice or template is first
              saved, or data is exported or imported. With the event, {APP_NAME}{" "}
              keeps the country the request came from, the browser family,
              operating system and type of device (such as Safari, iOS, mobile),
              your browser’s language (such as English), and whether {APP_NAME}{" "}
              is open in a browser tab or installed as an app.
            </p>
            <p className={PROSE}>
              A page view also says which page. The first page you open says
              what kind of site you came from (such as a search engine, an AI
              assistant or a social network, never its address), or the name in
              a link {APP_NAME} shared (such as ?ref=newsletter). A PDF or a
              first save says the same, to show which of them lead to invoices.
            </p>
            <p className={PROSE}>
              Opening the editor, making a PDF and first saving an invoice also
              say roughly how many invoices this browser has saved (none, one,
              two to five, or more), so first visits can be told from returning
              ones. A PDF and a first save say the invoice’s currency code when
              it’s one of a fixed list of common currencies (such as GBP or
              AED), and a PDF says which optional parts it includes (such as tax
              or notes).
            </p>
            <p className={PROSE}>
              That is all. The counts never include your names, amounts, the
              text of your invoices or anything about them not listed here.{" "}
              {APP_NAME} doesn’t keep your IP address, your city, your full
              browser details, the address of the site you came from or any
              identifier, and saves nothing on your device for the counts, so
              visits can’t be linked together.
            </p>
            <p className={PROSE}>
              If your browser sends Global Privacy Control, nothing is counted.
              The counts are kept for 3 months.
            </p>
          </PolicySection>
          <PolicySection title={`What ${APP_NAME} doesn’t do`}>
            <p className={PROSE}>
              {APP_NAME} has no accounts, no ads, no third-party analytics and
              no tracking of individuals, and sets no cookies.
            </p>
            <p className={PROSE}>
              Every page is sent with a Content Security Policy that only lets
              it connect to {SITE_HOST} itself, so your browser blocks any
              attempt to send data anywhere else, including from {APP_NAME}’s
              own code. You can read the policy in your browser’s developer
              tools, or in the{" "}
              <a
                href={`${SOURCE_URL}/blob/main/consts/content-security-policy.ts`}
                target="_blank"
                rel="noopener noreferrer"
                className={INLINE_LINK}
              >
                source on GitHub
                <span className="sr-only"> (opens in a new tab)</span>
              </a>
              .
            </p>
          </PolicySection>
          <PolicySection title="Hosting">
            <p className={PROSE}>
              {SITE_HOST} is served by Cloudflare. Like any web host, Cloudflare
              receives the technical details of each request your browser makes
              to load the site, such as your IP address and browser type, in
              order to deliver it and protect it from abuse, and it may set a
              strictly necessary security cookie for that purpose. Those
              requests never contain your invoices. The country and browser
              details of the usage-count requests are also used, in aggregate,
              for the counts above. Cloudflare’s handling is covered by its{" "}
              <a
                href="https://www.cloudflare.com/privacypolicy/"
                target="_blank"
                rel="noopener noreferrer"
                className={INLINE_LINK}
              >
                privacy policy
                <span className="sr-only"> (opens in a new tab)</span>
              </a>
              .
            </p>
            <p className={PROSE}>
              Within a tab, the site remembers how far down each page you were
              (in session storage), so the Back button returns you to the same
              place. It is cleared when the tab closes.
            </p>
          </PolicySection>
          <PolicySection title="Checking for yourself">
            <p className={PROSE}>
              The code is public on GitHub under the MIT licence, so anyone can
              check what {APP_NAME} does with your data. Questions, or found
              something that doesn’t match this page?{" "}
              <a
                href={`${SOURCE_URL}/issues`}
                target="_blank"
                rel="noopener noreferrer"
                className={INLINE_LINK}
              >
                Open an issue on GitHub
                <span className="sr-only"> (opens in a new tab)</span>
              </a>
              .
            </p>
          </PolicySection>
        </article>
      </main>
      <SiteFooter />
    </div>
  );
}

function PolicySection({
  title,
  children
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-4">
      <h2 className={cn(HEADING, typeClass("subtitle"))}>{title}</h2>
      {children}
    </section>
  );
}
