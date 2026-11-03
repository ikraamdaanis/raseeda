import {
  IconCheck,
  IconChevronDown,
  IconCopy,
  IconRotate
} from "@tabler/icons-react";
import type { ErrorComponentProps } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { FOCUS_RING, INK_PILL, SOFT_PILL } from "~/components/home/site-chrome";
import { StatusPage } from "~/components/status-page";
import { typeClass } from "~/lib/type-scale";
import { cn } from "~/lib/utils";

// The error itself stays folded away under the actions: most visitors only
// need to know their invoices are safe and how to get going again, and the
// message is there for a bug report. The panel floats below the toggle
// (10rem at most, 0.75rem under it) over room kept for it whether it's open
// or not, so opening it moves nothing. The sky's bottom padding (6rem, 8rem
// from `sm`) counts towards that room, less 2rem kept clear of its edge.
export function RootErrorBoundary({ error, reset }: ErrorComponentProps) {
  const [hasCopied, setHasCopied] = useState(false);
  const messageRef = useRef<HTMLPreElement>(null);

  const name = error instanceof Error ? error.name : "Error";
  const message =
    error instanceof Error && error.message
      ? error.message
      : "An unexpected error occurred.";

  function handleReload() {
    window.location.reload();
  }

  // Where the browser refuses the clipboard, the message is selected instead,
  // ready to copy by hand.
  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(`${name}: ${message}`);
    } catch {
      if (messageRef.current) {
        window.getSelection()?.selectAllChildren(messageRef.current);
      }

      return;
    }

    setHasCopied(true);
    window.setTimeout(() => setHasCopied(false), 2000);
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
      <div className="pb-27 sm:pb-19">
        <details className="group relative">
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
          <div className="absolute inset-x-0 top-full mt-3 flex max-h-40 flex-col overflow-hidden rounded-2xl bg-white/60 text-left shadow-[0_1px_2px_rgb(0_0_0/0.04),0_8px_24px_-12px_rgb(0_0_0/0.12)] ring-1 ring-white/80 backdrop-blur-sm motion-safe:transition-[opacity,translate] motion-safe:duration-200 motion-safe:ease-out starting:opacity-0 motion-safe:starting:-translate-y-1">
            <div className="flex shrink-0 items-center justify-between gap-3 border-b border-zinc-950/5 py-1.5 pr-1.5 pl-4">
              <p
                className={cn(
                  "font-geist-mono font-medium text-red-800",
                  typeClass("caption")
                )}
              >
                {name}
              </p>
              <button
                type="button"
                onClick={handleCopy}
                className={cn(
                  "hover:text-ink relative flex cursor-pointer items-center gap-1 rounded-full py-1 pr-2.5 pl-2 font-medium text-zinc-700 hover:bg-white/70",
                  typeClass("caption"),
                  FOCUS_RING
                )}
              >
                {hasCopied ? (
                  <IconCheck className="size-4 shrink-0" aria-hidden="true" />
                ) : (
                  <IconCopy className="size-4 shrink-0" aria-hidden="true" />
                )}
                {hasCopied ? "Copied" : "Copy"}
                <span
                  aria-hidden="true"
                  className="absolute top-1/2 left-1/2 size-[max(100%,3rem)] -translate-1/2 pointer-fine:hidden"
                />
              </button>
            </div>
            <pre
              ref={messageRef}
              className="font-geist-mono min-h-0 overflow-auto p-4 text-sm/6 wrap-break-word whitespace-pre-wrap text-zinc-800 sm:text-[0.8125rem]/5"
            >
              {message}
            </pre>
          </div>
        </details>
      </div>
    </StatusPage>
  );
}
