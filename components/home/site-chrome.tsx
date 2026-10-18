import { IconArrowRight, IconArrowUpRight } from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { APP_NAME } from "~/consts/app";
import { typeClass } from "~/lib/type-scale";
import { cn } from "~/lib/utils";
import { MAKER_NAME, MAKER_URL, SOURCE_URL } from "~/utils/site-meta";

// The marketing pages' shared frame: column, focus ring, wordmark, the way
// into the editor and the footer. The homepage, the template gallery and the
// privacy page draw it the same way.

export const CONTAINER = "mx-auto max-w-6xl px-6 lg:px-8";

export const FOCUS_RING =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600";

// The wordmark: the name in the page's own face and ink, a touch looser than
// Tailwind's tight tracking. The 44px box keeps it a comfortable tap target
// without changing the type.
export function Wordmark() {
  return (
    <Link
      to="/"
      aria-label="Homepage"
      className={cn(
        "flex min-h-11 items-center rounded-md text-lg font-semibold tracking-[-0.0175em]",
        FOCUS_RING
      )}
    >
      <span className="text-ink">{APP_NAME}</span>
    </Link>
  );
}

// The page's one primary action, shaped the same everywhere it appears: a pill
// in the homepage ink, larger on touch screens. It preloads the editor on
// hover or touch (the router's default), not on sight: the editor's code is
// over 500 KB and, fetched at load, it held up the hero on phones.
export function CreateInvoiceLink() {
  return (
    <Link
      to="/create"
      className={cn(
        "bg-ink hover:bg-ink/85 relative inline-flex shrink-0 items-center rounded-full px-4 py-2.5 text-base font-medium whitespace-nowrap text-white shadow-[inset_0_1px_0_rgb(255_255_255/0.12),0_1px_2px_rgb(0_0_0/0.16)] transition-colors duration-200 ease-in-out sm:py-2 sm:text-sm",
        FOCUS_RING
      )}
    >
      Create invoice
      <span
        aria-hidden="true"
        className="absolute top-1/2 left-1/2 size-[max(100%,3rem)] -translate-1/2 pointer-fine:hidden"
      />
    </Link>
  );
}

// The header of a page other than the homepage: the wordmark home and a quiet
// way into the editor.
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

// Links to the homepage's sections carry the path, so they work from the
// privacy page too; on the homepage they just scroll.
const FOOTER_COLUMNS: {
  title: string;
  links: { label: string; href: string; isExternal?: boolean }[];
}[] = [
  {
    title: "Make invoices",
    links: [
      { label: "Create an invoice", href: "/create" },
      { label: "Invoice templates", href: "/invoice-template" },
      { label: "Your saved invoices", href: "/create?open=invoices" },
      { label: "How it works", href: "/#how-it-works" },
      { label: "Features", href: "/#features" }
    ]
  },
  {
    title: "Learn more",
    links: [
      { label: "Compare", href: "/#compare" },
      { label: "Questions", href: "/#questions" },
      { label: "Privacy", href: "/privacy" }
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

export function SiteFooter() {
  return (
    <footer className="pt-16 sm:pt-20">
      <div className={cn(CONTAINER, "pb-16 sm:pb-20")}>
        <div className="grid grid-cols-2 gap-x-8 gap-y-12 sm:grid-cols-3">
          {FOOTER_COLUMNS.map(column => (
            <div key={column.title} className="flex flex-col gap-4">
              <h2 className={cn(typeClass("body"), "text-zinc-500")}>
                {column.title}
              </h2>
              <ul
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
