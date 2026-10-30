import { IconArrowRight, IconArrowUpRight } from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { APP_NAME } from "~/consts/app";
import { typeClass } from "~/lib/type-scale";
import { cn } from "~/lib/utils";
import { MAKER_NAME, MAKER_URL, SOURCE_URL } from "~/utils/site-meta";

// The marketing pages' shared frame: column, focus ring, wordmark and footer.
// The homepage and the privacy page draw it the same way.

export const CONTAINER = "mx-auto max-w-6xl px-6 lg:px-8";

export const FOCUS_RING =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600";

// The pages' primary action: a pill in the homepage ink, larger on touch
// screens. Its hover colour eases in and out over 200ms rather than snapping.
export const INK_PILL = cn(
  "bg-ink hover:bg-ink/85 relative inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-full px-4 py-2.5 text-base font-medium whitespace-nowrap text-white shadow-[inset_0_1px_0_rgb(255_255_255/0.12),0_1px_2px_rgb(0_0_0/0.16)] transition-colors duration-200 ease-in-out sm:py-2 sm:text-sm",
  FOCUS_RING
);

// The secondary action beside an INK_PILL: the same pill, frosted white over
// a coloured panel, so it never outweighs the ink one.
export const SOFT_PILL = cn(
  "text-ink relative inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-full bg-white/60 px-4 py-2.5 text-base font-medium whitespace-nowrap ring-1 ring-white/80 backdrop-blur-sm transition-colors duration-200 ease-in-out hover:bg-white/85 sm:py-2 sm:text-sm",
  FOCUS_RING
);

// The bar at the top of the pages other than the homepage: the wordmark, and
// a quiet way into the editor.
export function PageHeader() {
  return (
    <header>
      <div className={cn(CONTAINER, "flex h-16 items-center gap-4")}>
        <div className="flex flex-1 items-center">
          <Wordmark />
        </div>
        <Link
          to="/create"
          className={cn(
            "hover:text-brand-600 text-ink relative inline-flex min-h-11 items-center gap-1 rounded-sm px-1 font-medium whitespace-nowrap",
            typeClass("body", "compact"),
            FOCUS_RING
          )}
        >
          Open the editor
          <IconArrowRight className="size-4 shrink-0" aria-hidden="true" />
        </Link>
      </div>
    </header>
  );
}

// The wordmark: the name alone in the page's own face and ink, a touch looser
// than Tailwind's tight tracking. The flat-foot r mark (public/logo-mark.svg)
// is kept for the favicon and app icons, where the name can't fit; beside the
// name it only repeated its first letter. The 44px box keeps it a comfortable
// tap target without changing the type.
export function Wordmark() {
  return (
    <Link
      to="/"
      aria-label={`${APP_NAME} home`}
      className={cn(
        "text-ink flex min-h-11 items-center rounded-md text-lg font-semibold tracking-[-0.0175em]",
        FOCUS_RING
      )}
    >
      {APP_NAME}
    </Link>
  );
}

// Links to the homepage's sections carry the path, so they work from the
// privacy page too; on the homepage they just scroll.
const FOOTER_COLUMNS: {
  title: string;
  links: { label: string; href: string; isExternal?: boolean }[];
}[] = [
  {
    title: "Make invoices",
    links: [
      { label: "Create invoice", href: "/create" },
      { label: "Your invoices", href: "/create?open=invoices" },
      { label: "How it works", href: "/#how-it-works" },
      { label: "Features", href: "/#features" }
    ]
  },
  {
    title: "Learn more",
    links: [
      { label: "Compare", href: "/#compare" },
      { label: "Questions", href: "/#questions" },
      { label: "Privacy policy", href: "/privacy" }
    ]
  },
  {
    title: "Open source",
    links: [
      { label: "Source on GitHub", href: SOURCE_URL, isExternal: true },
      {
        label: "Report an issue",
        href: `${SOURCE_URL}/issues`,
        isExternal: true
      },
      {
        label: "MIT licence",
        href: `${SOURCE_URL}/blob/main/LICENSE`,
        isExternal: true
      }
    ]
  }
];

// A column's title labels its list rather than standing as a heading, so the
// page's outline ends at its last section.
function footerColumnId(title: string) {
  return `footer-${title.toLowerCase().replaceAll(" ", "-")}`;
}

export function SiteFooter() {
  return (
    <footer className="pt-16 sm:pt-20">
      <div className={cn(CONTAINER, "pb-16 sm:pb-20")}>
        <div className="grid grid-cols-2 gap-x-8 gap-y-12 sm:grid-cols-3">
          {FOOTER_COLUMNS.map(column => (
            <div key={column.title} className="flex flex-col gap-4">
              <p
                id={footerColumnId(column.title)}
                className={cn(typeClass("body"), "text-zinc-500")}
              >
                {column.title}
              </p>
              <ul
                aria-labelledby={footerColumnId(column.title)}
                className={cn(
                  typeClass("body"),
                  "text-ink flex flex-col gap-1"
                )}
              >
                {column.links.map(link => (
                  <li key={link.label}>
                    <FooterLink href={link.href} isExternal={link.isExternal}>
                      {link.label}
                    </FooterLink>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
      <div className="border-t border-zinc-950/10">
        <div
          className={cn(
            CONTAINER,
            "flex flex-col gap-2 py-6 sm:flex-row sm:items-center sm:justify-between sm:gap-6"
          )}
        >
          <div className="flex items-center gap-2">
            <Wordmark />
            <p
              className={cn(
                typeClass("body"),
                "flex items-center gap-1 text-zinc-500"
              )}
            >
              by
              <FooterLink href={MAKER_URL} isExternal>
                {MAKER_NAME}
              </FooterLink>
            </p>
          </div>
          <p className={cn(typeClass("body"), "text-zinc-500")}>
            MIT licensed. Your invoices stay on your device.
          </p>
        </div>
      </div>
    </footer>
  );
}

// A link in the footer: in the ink, a comfortable tap target on phones.
// Links off the site open in a new tab, marked with an arrow.
function FooterLink({
  href,
  isExternal = false,
  children
}: {
  href: string;
  isExternal?: boolean;
  children: ReactNode;
}) {
  return (
    <a
      href={href}
      target={isExternal ? "_blank" : undefined}
      rel={isExternal ? "noopener noreferrer" : undefined}
      className={cn(
        "text-ink hover:text-brand-700 inline-flex min-h-11 items-center gap-1 rounded-sm sm:min-h-9",
        FOCUS_RING
      )}
    >
      {children}
      {isExternal && (
        <>
          <IconArrowUpRight
            className="size-4 shrink-0 text-zinc-400"
            aria-hidden="true"
          />
          <span className="sr-only"> (opens in a new tab)</span>
        </>
      )}
    </a>
  );
}

// GitHub's mark, standing in for the O of "Open source": round, a little
// under the cap height so it sits on the line like the letter would.
export function GithubMark() {
  return (
    <svg
      viewBox="0 0 98 96"
      aria-hidden="true"
      className="mr-px size-[0.78em] shrink-0 fill-current"
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M48.854 0C21.839 0 0 22 0 49.217c0 21.756 13.993 40.172 33.405 46.69 2.427.49 3.316-1.059 3.316-2.362 0-1.141-.08-5.052-.08-9.127-13.59 2.934-16.42-5.867-16.42-5.867-2.184-5.704-5.42-7.17-5.42-7.17-4.448-3.015.324-3.015.324-3.015 4.934.326 7.523 5.052 7.523 5.052 4.367 7.496 11.404 5.378 14.235 4.074.404-3.178 1.699-5.378 3.074-6.6-10.839-1.141-22.243-5.378-22.243-24.283 0-5.378 1.94-9.778 5.014-13.2-.485-1.222-2.184-6.275.486-13.038 0 0 4.125-1.304 13.426 5.052a46.97 46.97 0 0 1 12.214-1.63c4.125 0 8.33.571 12.213 1.63 9.302-6.356 13.427-5.052 13.427-5.052 2.67 6.763.97 11.816.485 13.038 3.155 3.422 5.015 7.822 5.015 13.2 0 18.905-11.404 23.06-22.324 24.283 1.78 1.548 3.316 4.481 3.316 9.126 0 6.6-.08 11.897-.08 13.526 0 1.304.89 2.853 3.316 2.364 19.412-6.52 33.405-24.935 33.405-46.691C97.707 22 75.788 0 48.854 0z"
      />
    </svg>
  );
}
