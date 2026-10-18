import {
  IconAlertTriangleFilled,
  IconCircleXFilled,
  IconInfoCircleFilled,
  IconX
} from "@tabler/icons-react";
import type { ReactNode } from "react";
import { createContext, useContext, useState } from "react";
import { toast } from "sonner";
import { APP_NAME } from "~/consts/app";
import { useFileActions } from "~/context/file-actions-context";
import { useInvoiceDocument } from "~/context/invoice-document-context";
import { cn } from "~/lib/utils";

// Says where the open invoice stands, but only when something needs saying.
// While saves work nothing shows at all (no "Saving…" flicker), as in Google
// Docs and Figma. A failed save stays here until it's resolved, announced once
// per run of failures rather than on every retry. In Safari, which clears a
// site's storage after a week unused, it also suggests a backup, once.
export function DocumentStatusBanner() {
  const {
    status,
    saveFailure,
    backupReminder,
    retrySave,
    downloadBackup,
    dismissBackupReminder,
    takeOver,
    keepDeletedCopy
  } = useInvoiceDocument();
  const { newInvoice } = useFileActions();
  const [busy, setBusy] = useState(false);

  async function act(action: () => Promise<unknown>) {
    setBusy(true);

    try {
      await action();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something failed");
    } finally {
      setBusy(false);
    }
  }

  if (status === "reloadRequired") {
    return (
      <Banner tone="warning">
        {APP_NAME} was updated in another tab.{" "}
        <Action onClick={() => window.location.reload()}>Reload</Action> to keep
        editing; your latest changes come back with you.
      </Banner>
    );
  }

  if (status === "unavailable") {
    return (
      <Banner tone="warning" busy={busy}>
        This browser isn’t letting {APP_NAME} store anything, so this invoice
        can’t be saved here.{" "}
        <Action onClick={() => void act(downloadBackup)}>
          Download a backup
        </Action>{" "}
        to keep it.
      </Banner>
    );
  }

  if (status === "readOnly") {
    return (
      <Banner tone="info" busy={busy}>
        This invoice is open in another tab, and changes made there show here.{" "}
        <Action onClick={() => void act(takeOver)}>Edit here</Action> instead.
      </Banner>
    );
  }

  if (status === "deleted") {
    return (
      <Banner tone="error" busy={busy}>
        This invoice was deleted in another tab, so changes here aren’t saved.{" "}
        <Action onClick={() => void act(keepDeletedCopy)}>Keep a copy</Action>{" "}
        or start a <Action onClick={newInvoice}>new invoice</Action>.
      </Banner>
    );
  }

  if (saveFailure) {
    return (
      <Banner key={saveFailure.episode} tone="error" alert busy={busy}>
        {saveFailure.message}{" "}
        <Action onClick={() => void act(retrySave)}>Retry now</Action> or{" "}
        <Action onClick={() => void act(downloadBackup)}>
          download a backup
        </Action>
        .
      </Banner>
    );
  }

  if (backupReminder) {
    return (
      <Banner tone="info" busy={busy} onDismiss={dismissBackupReminder}>
        Safari clears sites left unopened for a week.{" "}
        <Action
          onClick={() =>
            void act(async () => {
              await downloadBackup();
              dismissBackupReminder();
            })
          }
        >
          Download a backup
        </Action>{" "}
        of your invoices to keep them.
      </Banner>
    );
  }

  return null;
}

// Each tone's tint, icon and text: soft on the light editor, and on the dark
// one the tone mixed into the popover colour, so the alert stays opaque over
// the page scrolling under it.
const TONES = {
  info: {
    icon: IconInfoCircleFilled,
    surface:
      "bg-blue-50 border-blue-600/10 dark:bg-[color-mix(in_oklab,var(--color-blue-500)_14%,var(--popover))] dark:border-blue-400/20",
    iconColour: "text-blue-500 dark:text-blue-400",
    text: "text-blue-800 dark:text-blue-200/80",
    action:
      "focus-visible:outline-blue-600 dark:focus-visible:outline-blue-400",
    dismiss:
      "text-blue-900 hover:bg-blue-100 dark:text-blue-100 dark:hover:bg-blue-500/15"
  },
  warning: {
    icon: IconAlertTriangleFilled,
    surface:
      "bg-amber-50 border-amber-600/15 dark:bg-[color-mix(in_oklab,var(--color-amber-500)_14%,var(--popover))] dark:border-amber-400/20",
    iconColour: "text-amber-500 dark:text-amber-400",
    text: "text-amber-800 dark:text-amber-200/80",
    action:
      "focus-visible:outline-amber-600 dark:focus-visible:outline-amber-400",
    dismiss:
      "text-amber-900 hover:bg-amber-100 dark:text-amber-100 dark:hover:bg-amber-500/15"
  },
  error: {
    icon: IconCircleXFilled,
    surface:
      "bg-red-50 border-red-600/10 dark:bg-[color-mix(in_oklab,var(--color-red-500)_14%,var(--popover))] dark:border-red-400/20",
    iconColour: "text-red-500 dark:text-red-400",
    text: "text-red-800 dark:text-red-200/80",
    action: "focus-visible:outline-red-600 dark:focus-visible:outline-red-400",
    dismiss:
      "text-red-900 hover:bg-red-100 dark:text-red-100 dark:hover:bg-red-500/15"
  }
} as const;

const BannerContext = createContext<{
  tone: keyof typeof TONES;
  busy: boolean;
}>({ tone: "info", busy: false });

// A tinted strip across the top of the canvas, above the page, which scrolls
// away under it. It sits outside the canvas's scrolling, so neither a tall
// nor a wide (zoomed-in) page can move it. It says its piece in one sentence,
// with the ways out as words in it (see Action), and a dismiss button at the
// end if it can be put away.
function Banner({
  tone,
  alert = false,
  busy = false,
  onDismiss,
  children
}: {
  tone: keyof typeof TONES;
  alert?: boolean;
  busy?: boolean;
  onDismiss?: () => void;
  children: ReactNode;
}) {
  const colours = TONES[tone];
  const Icon = colours.icon;

  return (
    <BannerContext.Provider value={{ tone, busy }}>
      <div
        role={alert ? "alert" : "status"}
        className={cn(
          "animate-in fade-in-0 flex shrink-0 items-start gap-3 border-b px-4 py-3 duration-200 ease-(--ease-out-strong)",
          colours.surface
        )}
      >
        <Icon
          aria-hidden="true"
          className={cn("size-5 shrink-0", colours.iconColour)}
        />
        <p className={cn("min-w-0 flex-1 text-sm/5 text-pretty", colours.text)}>
          {children}
        </p>
        {onDismiss && (
          <button
            type="button"
            aria-label="Dismiss"
            onClick={onDismiss}
            className={cn(
              "relative -m-1.5 flex size-8 shrink-0 items-center justify-center rounded-md focus-visible:outline-2 focus-visible:outline-offset-2",
              colours.dismiss
            )}
          >
            <IconX aria-hidden="true" className="size-5" />
            <span
              aria-hidden="true"
              className="absolute top-1/2 left-1/2 size-[max(100%,3rem)] -translate-1/2 pointer-fine:hidden"
            />
          </button>
        )}
      </div>
    </BannerContext.Provider>
  );
}

// A way out, written into the alert's sentence: the sentence's own colour,
// a step heavier and underlined.
function Action({
  onClick,
  children
}: {
  onClick: () => void;
  children: ReactNode;
}) {
  const { tone, busy } = useContext(BannerContext);

  return (
    <button
      type="button"
      disabled={busy}
      onClick={onClick}
      className={cn(
        "rounded-sm font-medium underline decoration-current/40 underline-offset-2 hover:decoration-current focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-50",
        TONES[tone].action
      )}
    >
      {children}
    </button>
  );
}
