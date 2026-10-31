import interFont from "@fontsource-variable/inter/files/inter-latin-opsz-normal.woff2?url";
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
  TEMPLATE_RENDER_SIZE
} from "~/components/templates/invoice-templates";
import { getInvoiceFontDefinition } from "~/consts/invoice-fonts";
import { typeClass } from "~/lib/type-scale";
import { cn } from "~/lib/utils";
import { canonicalLink, siteMeta } from "~/utils/site-meta";

export const Route = createFileRoute("/invoice-template")({
  component: InvoiceTemplatePage,
  head: () => ({
    meta: siteMeta({
      path: "/invoice-template",
      title: "billsend invoice templates: Fill In Free, Download a PDF",
      description:
        "Free invoice templates for freelancers, consultants, contractors, photographers and small businesses. Pick a style, fill it in online and download a PDF. No account."
    }),
    links: [
      canonicalLink("/invoice-template"),
      {
        rel: "preload",
        href: interFont,
        as: "font",
        type: "font/woff2",
        crossOrigin: "anonymous"
      }
    ]
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

// A gallery of real billsend PDFs, one per line of work. Each opens the
// editor on a new invoice in its template's font (`?font=` with `new`), and
// an invoice already under way stays in the library. The pictures show a
// finished invoice in that style, not a form to fill.
function InvoiceTemplatePage() {
  return (
    <div className="home-type selection:bg-brand-100 bg-canvas text-ink isolate min-h-svh font-sans font-features-['cv02','cv03','cv04','cv11'] antialiased">
      <PageHeader />
      <main>
        <div className={cn(CONTAINER, "pt-12 pb-16 sm:pt-20 sm:pb-24")}>
          <div className="flex max-w-[64ch] flex-col gap-6">
            <h1 className={cn(HEADING, typeClass("title"))}>
              Free invoice templates
            </h1>
            <p className={cn(BODY_TEXT, "text-lg/7")}>
              Six invoices made in billsend, each for a different line of work
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
                    className="text-ink-blue mt-1 size-4 shrink-0"
                    aria-hidden="true"
                  />
                  {part}
                </li>
              ))}
            </ul>
          </div>
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

// One template: its invoice on a sheet of paper, then its name, font and use.
// The whole card is the link (its ::after covers the card); the rows line up
// across a row of cards through the list's subgrid.
function TemplateCard({
  template,
  isAboveFold
}: {
  template: (typeof INVOICE_TEMPLATES)[number];
  isAboveFold: boolean;
}) {
  const fontName = getInvoiceFontDefinition(template.font).name;

  return (
    <li className="group relative row-span-4 grid grid-rows-subgrid gap-y-3">
      <div className="mb-3 rounded-xl bg-zinc-100 p-6 ring-1 ring-zinc-950/10 transition-colors group-hover:bg-zinc-200/70 sm:p-8">
        <Picture
          src={template.src}
          alt={template.alt}
          width={TEMPLATE_RENDER_SIZE.width}
          height={TEMPLATE_RENDER_SIZE.height}
          loading={isAboveFold ? "eager" : "lazy"}
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
          "text-ink group-hover:text-ink-blue inline-flex items-center gap-1 justify-self-start rounded-sm font-medium after:absolute after:inset-0 after:rounded-xl",
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
