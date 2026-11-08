import { IconArrowRight, IconCheck } from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import { Picture } from "~/components/home/picture";
import {
  CONTAINER,
  FOCUS_RING,
  PageHeader,
  SiteFooter
} from "~/components/home/site-chrome";
import {
  TEMPLATE_RENDER_SIZE,
  templateSrcSet
} from "~/components/templates/invoice-templates";
import { SITE_TEMPLATES } from "~/consts/site-templates";
import { typeClass } from "~/lib/type-scale";
import { cn } from "~/lib/utils";
import type { SiteTemplateId } from "~/types";

const HEADING = "font-medium tracking-[-0.035em] text-balance";

const BODY_TEXT = cn("text-balance text-zinc-600", typeClass("body"));

// The picture's width as `sizes`: half of a column at most 1152px wide from
// `lg`, otherwise the whole of it, less the panel's padding.
const PICTURE_SIZES = [
  "(min-width: 1024px) 430px",
  "(min-width: 512px) 420px",
  "calc(100vw - 96px)"
].join(", ");

// A page that opens the editor ready for one job: what the document is for,
// a finished example (a real PDF), what the template sets up and a way to the
// others. The copy is each template's own (consts/site-templates.ts), since a
// page only exists if its template differs from the rest.
export function SiteTemplatePage({ id }: { id: SiteTemplateId }) {
  const template = SITE_TEMPLATES.find(siteTemplate => siteTemplate.id === id);

  if (!template) return null;

  const others = SITE_TEMPLATES.filter(other => other.id !== id);

  return (
    <div className="home-type selection:bg-brand-100 bg-canvas text-ink font-home isolate min-h-svh antialiased">
      <PageHeader />
      <main>
        <div
          className={cn(
            CONTAINER,
            "grid items-center gap-12 pt-12 pb-16 sm:pt-20 sm:pb-24 lg:grid-cols-2 lg:gap-16"
          )}
        >
          <div className="flex max-w-[52ch] flex-col items-start gap-6">
            <h1 className={cn(HEADING, typeClass("title"))}>
              {template.heading}
            </h1>
            <p className={cn(BODY_TEXT, "text-lg/7")}>{template.intro}</p>
            <Link
              to="/create"
              search={{ template: template.id }}
              className={cn(
                "bg-ink hover:bg-ink/85 inline-flex min-h-11 items-center gap-1.5 rounded-full px-5 font-medium text-white",
                typeClass("body", "compact"),
                FOCUS_RING
              )}
            >
              {template.startLabel}
              <IconArrowRight className="size-4 shrink-0" aria-hidden="true" />
            </Link>
          </div>
          <div className="max-w-md rounded-xl bg-zinc-100 p-6 ring-1 ring-zinc-950/10 sm:p-8 lg:justify-self-end">
            <Picture
              src={template.src}
              srcSet={templateSrcSet(template)}
              sizes={PICTURE_SIZES}
              alt={template.alt}
              width={TEMPLATE_RENDER_SIZE.width}
              height={TEMPLATE_RENDER_SIZE.height}
              loading="eager"
              fetchPriority="high"
              className="block h-auto w-full bg-white shadow-[0_4px_16px_-6px_rgb(0_0_0/0.12)] outline-1 -outline-offset-1 outline-zinc-950/5"
            />
          </div>
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
                {template.whenHeading}
              </h2>
              <p className={BODY_TEXT}>{template.when}</p>
            </div>
            <div className="flex max-w-2xl flex-col gap-6">
              <h2 className={cn(HEADING, typeClass("subtitle"))}>
                What the template sets up
              </h2>
              <ul className="grid gap-x-10 gap-y-5 sm:grid-cols-2">
                {template.includes.map(part => (
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
          </div>
        </section>
        <section
          className={cn(CONTAINER, "flex flex-col gap-8 py-16 sm:py-24")}
        >
          <h2 className={cn(HEADING, typeClass("title"))}>More templates</h2>
          <ul className="grid gap-x-8 gap-y-6 sm:grid-cols-2 lg:grid-cols-3">
            <li className="flex flex-col gap-1">
              <TemplateLink to="/invoice-template" name="Invoice templates" />
              <p className={BODY_TEXT}>
                Six invoices, one for each line of work.
              </p>
            </li>
            {others.map(other => (
              <li key={other.id} className="flex flex-col gap-1">
                <TemplateLink to={other.path} name={other.name} />
                <p className={BODY_TEXT}>{other.summary}</p>
              </li>
            ))}
          </ul>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}

function TemplateLink({
  to,
  name
}: {
  to: (typeof SITE_TEMPLATES)[number]["path"] | "/invoice-template";
  name: string;
}) {
  return (
    <Link
      to={to}
      className={cn(
        "hover:text-brand-600 w-fit rounded-sm font-medium",
        typeClass("body"),
        FOCUS_RING
      )}
    >
      {name}
    </Link>
  );
}
