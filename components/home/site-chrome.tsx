import { IconArrowRight } from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { typeClass } from "~/lib/type-scale";
import { cn } from "~/lib/utils";
import { MAKER_NAME, MAKER_URL, SOURCE_URL } from "~/utils/site-meta";

// The marketing pages' shared frame: column, focus ring, wordmark, the way
// into the editor and the footer. The homepage, the template gallery and the
// privacy page draw it the same way.

export const CONTAINER = "mx-auto max-w-6xl px-6 lg:px-8";

export const FOCUS_RING =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600";

// The wordmark: the name in Geist, in the homepage's heading blue. The 44px
// box keeps it a comfortable tap target without changing the type.
export function Wordmark() {
  return (
    <Link
      to="/"
      aria-label="Homepage"
      className={cn(
        "font-geist flex min-h-11 items-center rounded-md text-lg font-semibold tracking-tight",
        FOCUS_RING
      )}
    >
      <span className="text-ink-blue">billsend</span>
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
        "bg-ink hover:bg-ink/85 relative inline-flex shrink-0 items-center rounded-full px-4 py-2.5 text-base font-medium whitespace-nowrap text-white shadow-[inset_0_1px_0_rgb(255_255_255/0.12),0_1px_2px_rgb(0_0_0/0.16)] sm:py-2 sm:text-sm",
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
            "hover:text-ink-blue text-ink relative inline-flex min-h-11 items-center gap-1 rounded-sm px-1 font-medium whitespace-nowrap",
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

export function SiteFooter() {
  return (
    <footer>
      <div
        className={cn(
          CONTAINER,
          "flex flex-col gap-6 py-10 sm:flex-row sm:items-center sm:justify-between"
        )}
      >
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <Wordmark />
          <p className={cn(typeClass("body"), "text-zinc-500")}>
            Invoices that stay on your device.
          </p>
        </div>
        <ul
          className={cn(
            typeClass("body"),
            "flex flex-wrap items-center gap-x-6 gap-y-2 text-zinc-600"
          )}
        >
          <li>
            <Link
              to="/invoice-template"
              className={cn(
                "hover:text-ink inline-flex min-h-11 items-center rounded-sm sm:min-h-10",
                FOCUS_RING
              )}
            >
              Invoice templates
            </Link>
          </li>
          <li>
            <Link
              to="/privacy"
              className={cn(
                "hover:text-ink inline-flex min-h-11 items-center rounded-sm sm:min-h-10",
                FOCUS_RING
              )}
            >
              Privacy
            </Link>
          </li>
          <li>
            <FooterLink href={`${SOURCE_URL}/issues`}>
              Report an issue
            </FooterLink>
          </li>
          <li>
            <FooterLink href={SOURCE_URL}>Source on GitHub</FooterLink>
          </li>
          <li>
            Made by <FooterLink href={MAKER_URL}>{MAKER_NAME}</FooterLink>
          </li>
        </ul>
      </div>
    </footer>
  );
}

function FooterLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "hover:text-ink inline-flex min-h-11 items-center rounded-sm sm:min-h-10",
        FOCUS_RING
      )}
    >
      {children}
      <span className="sr-only"> (opens in a new tab)</span>
    </a>
  );
}
