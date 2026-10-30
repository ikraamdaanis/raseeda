import {
  IconCalendar,
  IconChevronDown,
  IconDownload,
  IconFileTypePdf,
  IconLayoutSidebarRight,
  IconPlayerPlay,
  IconPointerFilled,
  IconSearch
} from "@tabler/icons-react";
import type { ComponentType, CSSProperties, ReactNode } from "react";
import { ScaledFrame } from "~/components/home/editor-preview";
import { buttonVariants } from "~/components/ui/button";
import { formatCurrencyWithCode } from "~/consts/currencies";
import {
  FONT_DEMO_WORD,
  getHomePreviewFontClass
} from "~/consts/home-preview-fonts";
import { INVOICE_FONTS } from "~/consts/invoice-fonts";
import { useOnScreen } from "~/hooks/use-on-screen";
import { cn } from "~/lib/utils";

// The homepage cards' demos: each tile plays a short loop of the editor doing
// that card's job, built from the editor's own pieces (its fields, inspector
// rows, switches, library rows and download popover, under
// data-editor-chrome for its light palette) rather than drawings of them.
// The motion lives in styles/home-demos.css; a scene sets its loop length
// with --loop and its elements pick their part with demo-* classes.

/**
 * A card's tile: a pale wash of its first hue with soft blobs of both drifting
 * across it, and a scene scaled to fit it. Each card takes its own pair of the
 * page's hues (TILE_HUES), so neighbouring cards never match. A bleeding
 * scene (`isBleeding`) fills the tile edge to edge, for a scene that runs off
 * its sides. A phone gets the scene in its narrower `phoneSize`
 * layout, so its text shrinks far less than the wide layout would. The scene
 * plays only while the tile is at least a third on screen, so it doesn't run
 * unseen and a visitor scrolling to it catches the loop near its start.
 */
export function DemoTile({
  scene: Scene,
  hues,
  size,
  phoneSize,
  isBleeding = false,
  className
}: {
  scene: ComponentType<{ width: number; height: number }>;
  hues: [number, number];
  size: { width: number; height: number };
  phoneSize?: { width: number; height: number };
  isBleeding?: boolean;
  className?: string;
}) {
  const { ref: tileRef, isOnScreen: isPlaying } = useOnScreen<HTMLDivElement>({
    threshold: 0.33
  });

  return (
    <div
      ref={tileRef}
      aria-hidden="true"
      data-playing={isPlaying ? "" : undefined}
      className={cn(
        "bg-tile relative isolate flex items-center justify-center overflow-hidden rounded-2xl ring-1 ring-zinc-950/5",
        !isBleeding && "p-4 sm:p-6",
        className
      )}
      style={
        {
          "--tile-hue-a": hues[0],
          "--tile-hue-b": hues[1]
        } as CSSProperties
      }
    >
      <span className="demo-anim demo-drift-a absolute -top-1/3 -left-1/4 -z-10 aspect-square w-[85%] rounded-full bg-[radial-gradient(closest-side,oklch(0.94_0.035_var(--tile-hue-a)),transparent)]" />
      <span className="demo-anim demo-drift-b absolute -right-1/4 -bottom-1/3 -z-10 aspect-square w-[80%] rounded-full bg-[radial-gradient(closest-side,oklch(0.95_0.03_var(--tile-hue-b)),transparent)]" />
      {phoneSize && (
        <ScaledFrame frame={phoneSize} fill={isBleeding} className="sm:hidden">
          <Scene {...phoneSize} />
        </ScaledFrame>
      )}
      <ScaledFrame
        frame={size}
        fill={isBleeding}
        className={cn(phoneSize && "max-sm:hidden")}
      >
        <Scene {...size} />
      </ScaledFrame>
    </div>
  );
}

// The page's hues, as oklch hue angles: the sky, then the secondary tints.
export const TILE_HUES = {
  sky: 205,
  lavender: 295,
  sage: 145,
  butter: 92,
  blush: 35
};

// Each scene is drawn at its tile's frame size and centres its pieces in it:
// a step's, a feature's, or on phones a feature's narrower layout (a scene
// narrower than COMPACT_WIDTH tightens its pieces to fit).
export const STEP_SCENE = { width: 360, height: 280 };

export const FEATURE_SCENE = { width: 500, height: 280 };

export const FEATURE_PHONE_SCENE = { width: 360, height: 300 };

const COMPACT_WIDTH = 400;

// Scenes are set in Schibsted Grotesk (font-home), which is both the
// invoice's default face, for their bits of the page, and the face of the
// editor's own panels and menus in them.
const SCENE =
  "font-home text-foreground relative flex items-center justify-center [font-feature-settings:normal] antialiased";

// White paper or panel lifted off the tile.
const LIFTED =
  "bg-white shadow-[0_8px_24px_-8px_rgb(16_40_60/0.18)] ring-1 ring-zinc-950/5";

function sceneStyle(width: number, height: number, loopSeconds: number) {
  return {
    width,
    height,
    "--loop": `${loopSeconds}s`
  } as CSSProperties;
}

// Add the details: the client's name types into the focused Bill to field (the
// page's own focus style), then the line items arrive and the total keeps up.
export function DetailsDemo({
  width,
  height
}: {
  width: number;
  height: number;
}) {
  return (
    <div
      data-editor-chrome
      className={SCENE}
      style={sceneStyle(width, height, 7)}
    >
      <div
        className={cn(
          LIFTED,
          "demo-anim demo-scene flex w-80 flex-col gap-4 rounded-lg p-4"
        )}
      >
        <div className="flex flex-col gap-1.5">
          <span className="text-paper-muted-foreground text-xs font-medium">
            Bill to
          </span>
          <span className="border-brand-500 bg-brand-50 text-paper-foreground rounded-surface flex border px-2 py-1 text-sm">
            <span className="relative">
              <span className="demo-anim demo-type block whitespace-nowrap">
                Fernhill Press
              </span>
              <span className="demo-anim demo-type-caret absolute inset-y-0 left-0 w-full">
                <span className="demo-anim demo-blink bg-brand-600 block h-full w-px" />
              </span>
            </span>
          </span>
        </div>
        <div className="text-paper-foreground flex flex-col text-[13px] tabular-nums">
          <span className="bg-paper-muted text-paper-muted-foreground flex justify-between rounded-md px-2 py-1.5 text-xs font-medium">
            <span>Item</span>
            <span>Amount</span>
          </span>
          <span className="demo-anim demo-line-1 border-paper-border/60 flex justify-between border-b px-2 py-2">
            <span>Editorial illustrations</span>
            <span>$1,800.00</span>
          </span>
          <span className="demo-anim demo-line-2 border-paper-border/60 flex justify-between border-b px-2 py-2">
            <span>Cover artwork</span>
            <span>$950.00</span>
          </span>
          <span className="flex justify-between px-2 pt-2.5 font-semibold">
            <span>Total</span>
            <span className="grid justify-items-end">
              <span className="demo-anim demo-sum-0 col-start-1 row-start-1 opacity-0">
                $0.00
              </span>
              <span className="demo-anim demo-sum-1 col-start-1 row-start-1 opacity-0">
                $1,800.00
              </span>
              <span className="demo-anim demo-sum-2 col-start-1 row-start-1">
                $2,750.00
              </span>
            </span>
          </span>
        </div>
      </div>
    </div>
  );
}

// Send the PDF: the right end of the top bar. The pointer clicks Download, the
// download popover opens from it, and the pointer clicks Download PDF.
export function DownloadDemo({
  width,
  height
}: {
  width: number;
  height: number;
}) {
  return (
    <div
      data-editor-chrome
      className={cn(SCENE, "items-start justify-end")}
      style={sceneStyle(width, height, 7)}
    >
      <div
        className={cn(
          LIFTED,
          "bg-background font-home absolute inset-x-0 top-0 flex h-12 items-center justify-end gap-1 rounded-t-lg px-3"
        )}
      >
        <span className="text-muted-foreground flex size-7 items-center justify-center">
          <IconLayoutSidebarRight className="size-4" />
        </span>
        <span className="text-muted-foreground mr-1 flex size-7 items-center justify-center">
          <IconPlayerPlay className="size-4" />
        </span>
        <span
          className={cn(
            buttonVariants({ variant: "primary", size: "sm" }),
            "demo-anim demo-press-1 h-8 px-3"
          )}
        >
          Download
        </span>
      </div>
      <div className="demo-anim demo-popover bg-popover font-home ring-foreground/10 shadow-menu rounded-surface absolute top-14 right-3 flex w-72 flex-col gap-3 p-3 text-sm ring-1">
        <div className="flex items-center gap-2.5">
          <span className="bg-muted text-muted-foreground flex size-9 shrink-0 items-center justify-center rounded-md">
            <IconFileTypePdf className="size-5" />
          </span>
          <div className="flex min-w-0 flex-col">
            <span className="truncate font-medium">INV-0043.pdf</span>
            <span className="text-muted-foreground text-xs">
              PDF · A4 · opens in a new tab
            </span>
          </div>
        </div>
        <div className="border-border flex flex-col gap-1.5 border-y py-2.5 text-[13px]">
          <span className="flex items-center justify-between gap-3">
            <span className="text-muted-foreground">Total</span>
            <span className="tabular-nums">$3,780.00 USD</span>
          </span>
          <span className="flex items-center justify-between gap-3">
            <span className="text-muted-foreground">Last saved</span>
            <span>less than a minute ago</span>
          </span>
        </div>
        <span
          className={cn(
            buttonVariants({ variant: "primary" }),
            "demo-anim demo-press-2"
          )}
        >
          <IconDownload />
          Download PDF
        </span>
      </div>
      <IconPointerFilled className="demo-anim demo-cursor absolute top-7 right-9 size-5 text-zinc-900 opacity-0 drop-shadow-[0_1px_1px_rgb(255_255_255)] [--to-x:-92px] [--to-y:176px]" />
    </div>
  );
}

// The library rows the Keep a copy scene starts with, under the repeat
// client's group, newest first.
const KEPT_INVOICES = [
  { number: "INV-0043", total: "$3,780.00", edited: "18 Oct 2026" },
  { number: "INV-0038", total: "$2,150.00", edited: "2 Sep 2026" },
  { number: "INV-0031", total: "$1,960.00", edited: "11 Jul 2026" }
];

function LibraryRow({
  number,
  total,
  edited,
  className,
  children
}: {
  number: string;
  total: string;
  edited: string;
  className?: string;
  children?: ReactNode;
}) {
  return (
    <span
      className={cn(
        "relative isolate grid h-(--row) grid-cols-[minmax(0,1fr)_auto] content-center gap-x-2 rounded-md pr-9 pl-2",
        className
      )}
    >
      {children}
      <span className="truncate text-[13px] font-medium">
        {number} · Fernhill Press
      </span>
      <span className="text-muted-foreground text-xs leading-5 tabular-nums">
        {total}
      </span>
      <span className="text-muted-foreground col-span-2 truncate text-xs">
        No. {number} · Edited {edited}
      </span>
    </span>
  );
}

// Keep a copy: the invoices panel. The next invoice for a repeat client joins
// the top of the library under that client and becomes the open one.
export function SavedDemo({
  width,
  height
}: {
  width: number;
  height: number;
}) {
  return (
    <div
      data-editor-chrome
      className={SCENE}
      style={sceneStyle(width, height, 7)}
    >
      <div
        className={cn(
          LIFTED,
          "bg-background font-home flex h-64 w-72 flex-col overflow-hidden rounded-lg [--row:--spacing(11)]"
        )}
      >
        <div className="flex shrink-0 flex-col gap-2 px-3 pt-2.5 pb-2">
          <span className="bg-muted flex w-full items-center rounded-lg p-0.5">
            <span className="bg-popover ring-foreground/10 flex h-7 flex-1 items-center justify-center rounded-md text-xs shadow-xs ring-1">
              Invoices
            </span>
            <span className="text-muted-foreground flex h-7 flex-1 items-center justify-center text-xs">
              Templates
            </span>
          </span>
          <span className="bg-muted text-muted-foreground flex h-8 items-center gap-1.5 rounded-md px-2 text-[13px]">
            <IconSearch className="size-3.5 shrink-0" />
            Search invoices
          </span>
        </div>
        <div className="flex min-h-0 flex-1 flex-col gap-px px-1.5">
          <span className="text-muted-foreground flex items-center justify-between gap-2 px-2 pt-1 pb-0.5 text-[11px] font-medium">
            Fernhill Press
            <span className="grid justify-items-end tabular-nums">
              <span className="demo-anim demo-depart col-start-1 row-start-1 opacity-0">
                3
              </span>
              <span className="demo-anim demo-arrive col-start-1 row-start-1">
                4
              </span>
            </span>
          </span>
          <div className="min-h-0 flex-1 overflow-hidden mask-b-from-60%">
            <div className="demo-anim demo-list-shift flex flex-col gap-px">
              <LibraryRow
                number="INV-0044"
                total="$2,640.00"
                edited="18 Oct 2026"
                className="demo-anim demo-arrive"
              >
                <span className="bg-accent absolute inset-0 -z-10 rounded-md" />
              </LibraryRow>
              {KEPT_INVOICES.map((invoice, index) => (
                <LibraryRow key={invoice.number} {...invoice}>
                  {index === 0 && (
                    <span className="demo-anim demo-depart bg-accent absolute inset-0 -z-10 rounded-md opacity-0" />
                  )}
                </LibraryRow>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// The second row runs the fonts in a different order, so the two rows never
// show the same face one above the other.
const FONT_ROWS = [
  INVOICE_FONTS,
  [...INVOICE_FONTS.slice(5), ...INVOICE_FONTS.slice(0, 5)]
];

// Your logo, your type: every invoice font the editor offers, the invoice title
// set in each, on two rows drifting past in opposite directions without end.
// Each row is its fonts twice over, sliding by exactly one set, so the loop has
// no seam. Its tile bleeds, so the rows run off the tile's edges.
export function FontDemo({ width, height }: { width: number; height: number }) {
  return (
    <div
      data-editor-chrome
      className={cn(SCENE, "flex-col gap-3 overflow-hidden")}
      style={sceneStyle(width, height, 40)}
    >
      {FONT_ROWS.map((fonts, rowIndex) => (
        <div
          key={rowIndex}
          className={cn(
            "demo-anim demo-marquee flex w-max self-start",
            rowIndex === 1 && "demo-marquee-reverse"
          )}
        >
          {[0, 1].map(copy => (
            <div key={copy} className="flex gap-3 pr-3">
              {fonts.map(font => (
                <span
                  key={font.id}
                  className={cn(
                    LIFTED,
                    "text-paper-foreground flex shrink-0 flex-col gap-1 rounded-lg px-5 py-4"
                  )}
                >
                  <span
                    className={cn(
                      "text-3xl leading-none",
                      getHomePreviewFontClass(font)
                    )}
                  >
                    {FONT_DEMO_WORD}
                  </span>
                  <span className="text-paper-muted-foreground text-xs">
                    {font.name}
                  </span>
                </span>
              ))}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

const DEMO_CURRENCIES = [
  { symbol: "$", code: "USD", label: "Dollar" },
  { symbol: "£", code: "GBP", label: "Pound" },
  { symbol: "€", code: "EUR", label: "Euro" },
  { symbol: "¥", code: "JPY", label: "Yen" }
];

// Any currency: the inspector's Currency row moving through four currencies,
// and the invoice's total, written by the editor's own formatter, following.
export function CurrencyDemo({
  width,
  height
}: {
  width: number;
  height: number;
}) {
  return (
    <div
      data-editor-chrome
      className={cn(SCENE, "flex-col gap-4")}
      style={sceneStyle(width, height, 8)}
    >
      <div
        className={cn(
          LIFTED,
          "bg-background font-home flex w-full flex-col gap-3 rounded-lg p-4"
        )}
      >
        <span className="grid grid-cols-[6rem_minmax(0,1fr)] items-center gap-2">
          <span className="text-muted-foreground text-[13px]">Currency</span>
          <span className="bg-muted flex h-8 items-center justify-between gap-2 rounded-md px-2 text-[13px]">
            <span className="grid">
              {DEMO_CURRENCIES.map((currency, index) => (
                <span
                  key={currency.code}
                  className={cn(
                    "demo-anim demo-phase-slide col-start-1 row-start-1",
                    index > 0 && "opacity-0"
                  )}
                  style={{ "--phase": index } as CSSProperties}
                >
                  {currency.symbol} {currency.label} · {currency.code}
                </span>
              ))}
            </span>
            <IconChevronDown className="size-4 shrink-0" />
          </span>
        </span>
        <span className="grid grid-cols-[6rem_minmax(0,1fr)] items-center gap-2">
          <span className="text-muted-foreground text-[13px]">Issue date</span>
          <span className="bg-muted flex h-8 items-center justify-between gap-2 rounded-md px-2 text-[13px] tabular-nums">
            5 Oct 2026
            <IconCalendar className="text-muted-foreground size-3.5 shrink-0" />
          </span>
        </span>
      </div>
      <div
        className={cn(
          LIFTED,
          "text-paper-foreground flex w-full items-baseline justify-between rounded-lg px-5 py-4"
        )}
      >
        <span className="text-lg font-semibold">Total</span>
        <span className="grid justify-items-end text-2xl font-semibold tabular-nums">
          {DEMO_CURRENCIES.map((currency, index) => (
            <span
              key={currency.code}
              className={cn(
                "demo-anim demo-phase-slide col-start-1 row-start-1",
                index > 0 && "opacity-0"
              )}
              style={{ "--phase": index } as CSSProperties}
            >
              {formatCurrencyWithCode(2475, currency.symbol, currency.code)}
            </span>
          ))}
        </span>
      </div>
    </div>
  );
}

// A print studio's job: a 10% discount, New York City's 8.875% sales tax and a
// delivery fee, switched on in that order.
const DEMO_ADJUSTMENTS = [
  { switchLabel: "Discounts", row: "Discounts 10%", amount: "-$251.50" },
  { switchLabel: "Tax", row: "Tax 8.875%", amount: "$200.89" },
  { switchLabel: "Fees", row: "Delivery", amount: "$45.00" }
];

const DEMO_RUNNING_TOTALS = [
  "$2,515.00",
  "$2,263.50",
  "$2,464.39",
  "$2,509.39"
];

// Tax, fees and discounts: the Sections panel's Totals switches turn on one by
// one, each opening its row on the page and moving the total.
export function TotalsDemo({
  width,
  height
}: {
  width: number;
  height: number;
}) {
  const isCompact = width < COMPACT_WIDTH;

  return (
    <div
      data-editor-chrome
      className={cn(SCENE, isCompact ? "gap-3" : "gap-4")}
      style={sceneStyle(width, height, 9)}
    >
      <div
        className={cn(
          LIFTED,
          "bg-background font-home flex shrink-0 flex-col gap-0.5 rounded-lg py-3",
          isCompact ? "w-36 px-3" : "w-48 px-4"
        )}
      >
        <span className="text-muted-foreground pb-1 text-xs font-medium">
          Totals
        </span>
        {DEMO_ADJUSTMENTS.map((adjustment, index) => (
          <span
            key={adjustment.switchLabel}
            className="flex h-8 items-center justify-between gap-3 text-[13px]"
          >
            {adjustment.switchLabel}
            <span className="bg-input relative isolate flex h-[18.4px] w-[32px] shrink-0 items-center rounded-full border border-transparent">
              <span
                className={`demo-anim demo-switch-${index + 1} bg-ring absolute -inset-px -z-10 rounded-full`}
              />
              <span
                className={`demo-anim demo-thumb-${index + 1} block size-4 translate-x-3.5 rounded-full bg-white shadow-xs`}
              />
            </span>
          </span>
        ))}
        <span
          className={cn(
            "flex h-8 items-center justify-between gap-3 text-[13px]",
            isCompact && "hidden"
          )}
        >
          Amount paid
          <span className="bg-input flex h-[18.4px] w-[32px] shrink-0 items-center rounded-full border border-transparent">
            <span className="block size-4 rounded-full bg-white shadow-xs" />
          </span>
        </span>
      </div>
      <div
        className={cn(
          LIFTED,
          "text-paper-foreground flex min-w-0 flex-1 flex-col rounded-lg py-4 text-sm tabular-nums",
          isCompact ? "px-3.5" : "px-5"
        )}
      >
        <span className="flex justify-between py-1">
          <span className="font-medium">Subtotal</span>
          <span>$2,515.00</span>
        </span>
        {DEMO_ADJUSTMENTS.map((adjustment, index) => (
          <span
            key={adjustment.row}
            className={`demo-anim demo-open-${index + 1} grid`}
          >
            <span className="flex min-h-0 justify-between overflow-hidden">
              <span className="py-1 font-medium">{adjustment.row}</span>
              <span className="py-1">{adjustment.amount}</span>
            </span>
          </span>
        ))}
        <span className="border-paper-border mt-1 flex justify-between border-t pt-2 font-semibold">
          <span>Total</span>
          <span className="grid justify-items-end">
            {DEMO_RUNNING_TOTALS.map((total, index) => (
              <span
                key={total}
                className={cn(
                  `demo-anim demo-total-${index} col-start-1 row-start-1`,
                  index < DEMO_RUNNING_TOTALS.length - 1 && "opacity-0"
                )}
              >
                {total} USD
              </span>
            ))}
          </span>
        </span>
      </div>
    </div>
  );
}

const DEMO_PAYMENT_ROWS = [
  { label: "Bank name", value: "Bank of America, N.A." },
  { label: "Account number", value: "3250 8874 1196" },
  { label: "Routing number", value: "121000358" },
  { label: "BIC / SWIFT", value: "BOFAUS3N" }
];

// Payment details clients can use: the page's payment block filling in, a row
// at a time, down to the terms.
export function PaymentDemo({
  width,
  height
}: {
  width: number;
  height: number;
}) {
  const isCompact = width < COMPACT_WIDTH;

  return (
    <div
      data-editor-chrome
      className={SCENE}
      style={sceneStyle(width, height, 8)}
    >
      <div
        className={cn(
          LIFTED,
          "text-paper-foreground flex w-full max-w-96 flex-col gap-1.5 rounded-lg py-5 text-sm",
          isCompact ? "px-5" : "px-6"
        )}
      >
        <span className="pb-1 font-semibold">Payment details</span>
        {DEMO_PAYMENT_ROWS.map((row, index) => (
          <span
            key={row.label}
            className={cn(
              "demo-anim demo-rise grid gap-3",
              isCompact
                ? "grid-cols-[7.5rem_minmax(0,1fr)]"
                : "grid-cols-[9rem_minmax(0,1fr)]"
            )}
            style={{ "--i": index } as CSSProperties}
          >
            <span className="text-paper-muted-foreground">{row.label}</span>
            <span className="tabular-nums">{row.value}</span>
          </span>
        ))}
        <span
          className="demo-anim demo-rise pt-1"
          style={{ "--i": DEMO_PAYMENT_ROWS.length } as CSSProperties}
        >
          Payment due within 30 days.
        </span>
      </div>
    </div>
  );
}
