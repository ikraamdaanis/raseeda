import { IconChevronDown, IconRotate } from "@tabler/icons-react";
import type { ErrorComponentProps } from "@tanstack/react-router";
import { FOCUS_RING, INK_PILL, SOFT_PILL } from "~/components/home/site-chrome";
import { StatusPage } from "~/components/status-page";
import { typeClass } from "~/lib/type-scale";
import { cn } from "~/lib/utils";

// The error itself stays folded away under the actions: most visitors only
// need to know their invoices are safe and how to get going again, and the
// message is there for a bug report.
export function RootErrorBoundary({ error, reset }: ErrorComponentProps) {
  const message =
    error instanceof Error && error.message
      ? error.message
      : "An unexpected error occurred.";

  function handleReload() {
    window.location.reload();
  }

  return (
    <StatusPage
      tone="error"
      isNoIndex
      eyebrow="Something went wrong"
      title="The page hit a problem."
      description="Your invoices and templates are saved in this browser, on this device, and are safe. Try again, or reload the page."
      actions={
        <>
          <button type="button" onClick={reset} className={INK_PILL}>
            <IconRotate className="size-4 shrink-0" aria-hidden="true" />
            Try again
          </button>
          <button type="button" onClick={handleReload} className={SOFT_PILL}>
            Reload page
          </button>
        </>
      }
    >
      <details className="group">
        <summary
          className={cn(
            "hover:text-ink flex w-max cursor-pointer list-none items-center gap-1 rounded-sm text-zinc-800 sm:mx-auto [&::-webkit-details-marker]:hidden",
            typeClass("caption"),
            FOCUS_RING
          )}
        >
          Error details
          <IconChevronDown
            className="size-4 shrink-0 transition-transform duration-200 group-open:rotate-180"
            aria-hidden="true"
          />
        </summary>
        <pre className="font-geist-mono mt-3 max-h-40 overflow-auto rounded-xl bg-white/70 p-4 text-left text-xs/5 whitespace-pre-wrap text-zinc-700 ring-1 ring-zinc-950/5">
          {message}
        </pre>
      </details>
    </StatusPage>
  );
}
