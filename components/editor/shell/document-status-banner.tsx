import {
  IconAlertTriangleFilled,
  IconCircleXFilled,
  IconInfoCircleFilled,
  IconX
} from "@tabler/icons-react";
import type { ReactNode } from "react";
import { createContext, Fragment, useContext, useState } from "react";
import { toast } from "sonner";
import { useStyleChoices } from "~/components/editor/shell/inspector/style-section";
import { APP_NAME } from "~/consts/app";
import { INVOICE_FONTS } from "~/consts/invoice-fonts";
import { useFileActions } from "~/context/file-actions-context";
import { useInvoiceDocument } from "~/context/invoice-document-context";
import { useFontCoverageGaps } from "~/hooks/use-font-coverage-gaps";
import { cn } from "~/lib/utils";
import type { InvoiceFont } from "~/types";

// Says where the open invoice stands, but only when something needs saying.
// While saves work nothing shows at all (no "Saving…" flicker), as in Google
// Docs and Figma. A failed save stays here until it's resolved, announced once
// per run of failures rather than on every retry. It suggests a backup when
// one is due (see getBackupReminder), at most once a month. Last, it says when
// the invoice's font can't print some of its text.
export function DocumentStatusBanner() {
  const {
    status,
    saveFailure,
    backupReminder,
    retrySave,
    downloadBackup,
    dismissBackupReminder,
    copyReview,
    dismissCopyReview,
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

  if (copyReview) {
    return (
      <Banner tone="info" onDismiss={dismissCopyReview}>
        {copyReview}
      </Banner>
    );
  }

  if (backupReminder) {
    return (
      <Banner tone="info" busy={busy} onDismiss={dismissBackupReminder}>
        {backupReminder === "safari"
          ? "Safari clears sites left unopened for a week."
          : "Your invoices are saved only in this browser."}{" "}
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
        to keep a copy somewhere safe.
      </Banner>
    );
  }

  return <FontCoverageNote />;
}

// How many of the characters a note names before it says how many more.
const NAMED_CHARACTERS = 8;

// How many fonts a note offers to switch to.
const OFFERED_FONTS = 3;

function nameCharacters(characters: string[]) {
  const named = characters.slice(0, NAMED_CHARACTERS).join(" ");
  const more = characters.length - NAMED_CHARACTERS;

  return more > 0 ? `${named} and ${more} more` : named;
}

function fontName(font: InvoiceFont) {
  return INVOICE_FONTS.find(definition => definition.id === font)?.name ?? font;
}

// The PDF has no font fallback, so a character the invoice's font has no
// glyph for prints as junk, though the page shows it in a system font. This
// names them once, with the fonts that print them a click away, and sets
// apart those no invoice font has (emoji, scripts none covers).
function FontCoverageNote() {
  const gaps = useFontCoverageGaps();
  const { theme, selectFont } = useStyleChoices();

  if (!gaps) return null;

  const fonts = gaps.fonts.slice(0, OFFERED_FONTS);

  return (
    <Banner tone="warning">
      {gaps.characters.length > 0 && (
        <>
          {`${fontName(theme.font)} can’t print ${nameCharacters(gaps.characters)}, so the PDF would show them wrong.`}{" "}
          {fonts.length > 0 && (
            <>
              Switch to{" "}
              {fonts.map((font, index) => (
                <Fragment key={font}>
                  {index > 0 && (index === fonts.length - 1 ? " or " : ", ")}
                  <Action onClick={() => selectFont(font)}>
                    {fontName(font)}
                  </Action>
                </Fragment>
              ))}
              .{" "}
            </>
          )}
        </>
      )}
      {gaps.unprintable.length > 0 &&
        `${nameCharacters(gaps.unprintable)} won’t print in any font.`}
    </Banner>
  );
}

// Each tone's tint, icon and text: soft on the light editor, and on the dark
// one the tone mixed into the popover colour, so the alert stays opaque over
// the page scrolling under it.
const TONES = {
  info: {
    icon: IconInfoCircleFilled,
    surface:
      "bg-brand-50 border-brand-600/10 dark:bg-[color-mix(in_oklab,var(--color-brand-500)_14%,var(--popover))] dark:border-brand-400/20",
    iconColour: "text-brand-500 dark:text-brand-400",
    text: "text-brand-800 dark:text-brand-200/80",
    action:
      "focus-visible:outline-brand-600 dark:focus-visible:outline-brand-400",
    dismiss:
      "text-brand-900 hover:bg-brand-100 dark:text-brand-100 dark:hover:bg-brand-500/15"
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
