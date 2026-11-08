import { IconArrowRight, IconCheck } from "@tabler/icons-react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Picture } from "~/components/home/picture";
import {
  CONTAINER,
  CreateInvoiceLink,
  FOCUS_RING,
  PageHeader,
  SiteFooter
} from "~/components/home/site-chrome";
import {
  INVOICE_TEMPLATES,
  TEMPLATE_RENDER_SIZE,
  templateSrcSet
} from "~/components/templates/invoice-templates";
import { APP_NAME } from "~/consts/app";
import { getInvoiceFontDefinition } from "~/consts/invoice-fonts";
import { SITE_TEMPLATES } from "~/consts/site-templates";
import { typeClass } from "~/lib/type-scale";
import { cn } from "~/lib/utils";
import { canonicalLink, PAGE_META, siteMeta } from "~/utils/site-meta";
import {
  jsonLdScript,
  TEMPLATES_STRUCTURED_DATA
} from "~/utils/structured-data";

export const Route = createFileRoute("/invoice-template")({
  component: InvoiceTemplatePage,
  head: () => ({
    meta: siteMeta(PAGE_META.templates),
    links: [canonicalLink(PAGE_META.templates.path)],
    scripts: [jsonLdScript(TEMPLATES_STRUCTURED_DATA)]
  })
});

const HEADING = "font-medium tracking-[-0.035em] text-balance";

const BODY_TEXT = cn("text-balance text-zinc-600", typeClass("body"));

// What the editor puts on every invoice, whichever template it starts from.
const INVOICE_PARTS = [
  "Your business and your client, plus a ship-to or job site address",
  "Invoice number, invoice and due dates, PO number and service period",
  "Line items with quantity, unit and price, totalled as you type",
  "Sales tax or VAT, discounts, fees and any amount already paid",
  "Bank details: account and routing numbers, SWIFT, IBAN or sort code",
  "Notes, terms and conditions, and late payment terms"
];

// A gallery of real PDFs from the app, one per line of work. Each opens the
// editor on a new invoice in its template's font (`?font=` with `new`), and
// an invoice already under way stays in the library. The pictures show a
// finished invoice in that style, not a form to fill.
function InvoiceTemplatePage() {
  return (
    <div className="home-type selection:bg-brand-100 bg-canvas text-ink font-home isolate min-h-svh antialiased">
      <PageHeader />
      <main>
        <div className={cn(CONTAINER, "pt-12 pb-16 sm:pt-20 sm:pb-24")}>
          <div className="flex max-w-[64ch] flex-col gap-6">
            <h1 className={cn(HEADING, typeClass("title"))}>
              Free invoice templates
            </h1>
            <p className={cn(BODY_TEXT, "text-lg/7")}>
              Six invoices made in {APP_NAME}, each for a different line of work
              and set in a different font. Pick a style to start your invoice
              in, fill in your details and download it as a PDF. Free, with no
              account.
            </p>
          </div>
          <ul className="mt-12 grid gap-x-8 gap-y-14 sm:mt-16 sm:grid-cols-2 lg:grid-cols-3">
            {INVOICE_TEMPLATES.map((template, index) => (
              <TemplateCard
                key={template.id}
                template={template}
                isAboveFold={index < 3}
                isFirst={index === 0}
              />
            ))}
          </ul>
        </div>
        <section className="bg-white py-16 sm:py-24">
          <div
            className={cn(
              CONTAINER,
              "flex flex-col gap-12 lg:flex-row lg:justify-between lg:gap-16"
            )}
          >
            <div className="flex max-w-[40ch] flex-col gap-6">
              <h2 className={cn(HEADING, typeClass("title"))}>
                Everything an invoice needs
              </h2>
              <p className={BODY_TEXT}>
                Every template has the same parts. Switch off what you don’t
                need, and change the font, currency or date format as you go.
              </p>
            </div>
            <ul className="grid max-w-2xl gap-x-10 gap-y-5 sm:grid-cols-2">
              {INVOICE_PARTS.map(part => (
                <li
                  key={part}
                  className={cn(
                    "flex gap-3 text-pretty text-zinc-700",
                    typeClass("body")
                  )}
                >
                  <IconCheck
                    className="text-brand-600 mt-1 size-4 shrink-0"
                    aria-hidden="true"
                  />
                  {part}
                </li>
              ))}
            </ul>
          </div>
        </section>
        <section
          className={cn(CONTAINER, "flex flex-col gap-8 pt-16 sm:pt-24")}
        >
          <h2 className={cn(HEADING, typeClass("title"))}>
            Other documents and trades
          </h2>
          <ul className="grid gap-x-8 gap-y-6 sm:grid-cols-2 lg:grid-cols-3">
            {SITE_TEMPLATES.map(template => (
              <li key={template.id} className="flex flex-col gap-1">
                <Link
                  to={template.path}
                  className={cn(
                    "hover:text-brand-600 w-fit rounded-sm font-medium",
                    typeClass("body"),
                    FOCUS_RING
                  )}
                >
                  {template.name}
                </Link>
                <p className={BODY_TEXT}>{template.summary}</p>
              </li>
            ))}
          </ul>
        </section>
        <section className={cn(CONTAINER, "py-16 sm:py-24")}>
          <div className="flex flex-col gap-8 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex max-w-[48ch] flex-col gap-4">
              <h2 className={cn(HEADING, typeClass("title"))}>
                Or start from a blank page
              </h2>
              <p className={BODY_TEXT}>
                Your invoices are saved in this browser, on your device, and
                never uploaded.
              </p>
            </div>
            <CreateInvoiceLink />
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}

// The width a template's page is drawn at, as `sizes`: a column of the grid
// (one, two from `sm`, three from `lg`, with 32px between) less the sheet's
// 24px padding (32px from `sm`), in a column that is at most 1152px and has
// 24px gutters (32px from `lg`).
const TEMPLATE_PAGE_SIZES = [
  "(min-width: 1152px) 278px",
  "(min-width: 1024px) calc(33.34vw - 107px)",
  "(min-width: 640px) calc(50vw - 104px)",
  "calc(100vw - 96px)"
].join(", ");

// One template: its invoice on a sheet of paper, then its name, font and use.
// The whole card is the link (its ::after covers the card); the rows line up
// across a row of cards through the list's subgrid. Its id is the anchor the
// structured data points each template at. The first card's picture is the
// page's largest paint, so it asks for high priority.
function TemplateCard({
  template,
  isAboveFold,
  isFirst
}: {
  template: (typeof INVOICE_TEMPLATES)[number];
  isAboveFold: boolean;
  isFirst: boolean;
}) {
  const fontName = getInvoiceFontDefinition(template.font).name;

  return (
    <li
      id={template.id}
      className="group relative row-span-4 grid grid-rows-subgrid gap-y-3"
    >
      <div className="mb-3 rounded-xl bg-zinc-100 p-6 ring-1 ring-zinc-950/10 transition-colors group-hover:bg-zinc-200/70 sm:p-8">
        <Picture
          src={template.src}
          srcSet={templateSrcSet(template)}
          sizes={TEMPLATE_PAGE_SIZES}
          alt={template.alt}
          width={TEMPLATE_RENDER_SIZE.width}
          height={TEMPLATE_RENDER_SIZE.height}
          loading={isAboveFold ? "eager" : "lazy"}
          fetchPriority={isFirst ? "high" : undefined}
          className="block h-auto w-full bg-white shadow-[0_4px_16px_-6px_rgb(0_0_0/0.12)] outline-1 -outline-offset-1 outline-zinc-950/5"
        />
      </div>
      <div className="flex flex-col">
        <h2 className={cn(HEADING, typeClass("subtitle"))}>
          {template.name} invoice
        </h2>
        <p className={cn(typeClass("caption"), "text-zinc-500")}>
          Set in {fontName}
        </p>
      </div>
      <p className={BODY_TEXT}>{template.description}</p>
      <Link
        to="/create"
        search={{ font: template.font, new: true }}
        className={cn(
          "text-ink group-hover:text-brand-600 inline-flex items-center gap-1 justify-self-start rounded-sm font-medium after:absolute after:inset-0 after:rounded-xl",
          typeClass("body"),
          FOCUS_RING
        )}
      >
        Start in {fontName}
        <IconArrowRight className="size-4 shrink-0" aria-hidden="true" />
      </Link>
    </li>
  );
}
