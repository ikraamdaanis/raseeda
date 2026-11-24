import { format, parseISO } from "date-fns";
import type { ReactNode } from "react";
import {
  CONTAINER,
  FOCUS_RING,
  PageHeader,
  SiteFooter
} from "~/components/home/site-chrome";
import { typeClass } from "~/lib/type-scale";
import { cn } from "~/lib/utils";

const HEADING = "font-medium tracking-[-0.035em] text-balance";

export const POLICY_PROSE = cn("text-pretty text-zinc-600", typeClass("body"));

export const POLICY_LINK = cn(
  "text-ink hover:text-brand-600 rounded-sm font-medium underline decoration-zinc-950/20 underline-offset-4",
  FOCUS_RING
);

// The privacy and terms pages: a title, a line on what the page is for, the
// date it last changed in substance (YYYY-MM-DD), the short version as a list,
// then its sections.
export function PolicyPage({
  title,
  intro,
  lastUpdated,
  summary,
  children
}: {
  title: string;
  intro: ReactNode;
  lastUpdated: string;
  summary: string[];
  children: ReactNode;
}) {
  return (
    <div className="home-type selection:bg-brand-100 bg-canvas text-ink font-home isolate min-h-svh antialiased">
      <PageHeader />
      <main className={cn(CONTAINER, "pt-12 pb-16 sm:pt-20 sm:pb-24")}>
        <article className="flex max-w-[64ch] flex-col gap-12">
          <div className="flex flex-col gap-6">
            <h1 className={cn(HEADING, typeClass("title"))}>{title}</h1>
            <p className={cn(POLICY_PROSE, "text-lg/7")}>{intro}</p>
            <p className={cn(typeClass("caption"), "text-zinc-500")}>
              Last updated{" "}
              <time dateTime={lastUpdated}>
                {format(parseISO(lastUpdated), "d MMMM yyyy")}
              </time>
            </p>
            <ul
              className={cn(POLICY_PROSE, "flex list-disc flex-col gap-2 pl-5")}
            >
              {summary.map(point => (
                <li key={point}>{point}</li>
              ))}
            </ul>
          </div>
          {children}
        </article>
      </main>
      <SiteFooter />
    </div>
  );
}

export function PolicySection({
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

export function PolicyExternalLink({
  href,
  children
}: {
  href: string;
  children: ReactNode;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={POLICY_LINK}
    >
      {children}
      <span className="sr-only"> (opens in a new tab)</span>
    </a>
  );
}
