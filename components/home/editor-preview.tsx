import {
  IconAdjustmentsHorizontal,
  IconCalendar,
  IconChevronDown,
  IconCommand,
  IconEye,
  IconLayoutSidebar,
  IconLayoutSidebarRight,
  IconMinus,
  IconMoon,
  IconPencil,
  IconPlayerPlay,
  IconPlus,
  IconSearch
} from "@tabler/icons-react";
import type { CSSProperties, ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { buttonVariants } from "~/components/ui/button";
import { FONT_WEIGHT_OPTIONS, INVOICE_FONTS } from "~/consts/invoice-fonts";
import { cn } from "~/lib/utils";
import type { InvoiceFont, InvoiceTheme, TextRole } from "~/types";
import { getRoleSettings } from "~/utils/get-role-settings";
import { getTextStyles } from "~/utils/get-text-styles";

// Static replicas of the editor for the homepage, built from the editor's own
// chrome and role styles at its native pixel size, then scaled down as a
// whole, so a preview is the real layout at a smaller scale rather than a
// drawing of it. Class names mirror components/editor/*; keep them in step
// when the editor changes.

// The A4 page in CSS pixels (210mm x 297mm), and the editor's top bar height.
export const PAGE_WIDTH = 793.7;

export const PAGE_HEIGHT = 1122.5;

const TOP_BAR_HEIGHT = 48;

function getSampleTheme(font: InvoiceFont): InvoiceTheme {
  return { font, fontWeight: "Normal", size: "medium", accent: "#1a1a1a" };
}

function roleStyle(
  theme: InvoiceTheme,
  role: TextRole,
  remove: "align"[] = []
): CSSProperties {
  return getTextStyles({ settings: getRoleSettings(theme, role), remove });
}

/**
 * Shows a `width` x `height` window onto native-size content, scaled to the
 * width of its container (never above 1:1 unless `fill` is set), with `x` and
 * `y` picking the region. The first paint scales in pure CSS, where
 * tan(atan2(a, b)) turns the ratio of two lengths into a number. Once hydrated
 * the frame measures itself instead: iOS Safari resolves that 100cqw before a
 * flex item grows and never updates it, which left grown frames drawn tiny.
 */
export function ScaledFrame({
  width,
  height,
  x = 0,
  y = 0,
  fill = false,
  className,
  children
}: {
  width: number;
  height: number;
  x?: number;
  y?: number;
  fill?: boolean;
  className?: string;
  children: ReactNode;
}) {
  const frameRef = useRef<HTMLDivElement>(null);
  const [measuredScale, setMeasuredScale] = useState<number | null>(null);

  useEffect(() => {
    const frame = frameRef.current;

    if (!frame) return;

    const observer = new ResizeObserver(entries => {
      const frameWidth = entries[0]?.contentRect.width;

      if (frameWidth) setMeasuredScale(frameWidth / width);
    });

    observer.observe(frame);

    return () => observer.disconnect();
  }, [width]);

  return (
    <div
      ref={frameRef}
      aria-hidden="true"
      inert
      className={cn("@container relative w-full overflow-hidden", className)}
      style={{
        maxWidth: fill ? undefined : width,
        aspectRatio: `${width} / ${height}`
      }}
    >
      <div
        className="absolute top-0 left-0 origin-top-left"
        style={{
          width,
          height,
          scale: measuredScale ?? `tan(atan2(100cqw, ${width}px))`
        }}
      >
        <div className="absolute" style={{ left: -x, top: -y }}>
          {children}
        </div>
      </div>
    </div>
  );
}

/**
 * The editor on a desktop window with both side panels open: the top bar, the
 * invoices panel, the desk with the canvas pill and, as `children`, the
 * invoice page at 100%, then the inspector. `data-editor-chrome` gives it the
 * editor's own light palette.
 */
export function EditorWindow({
  documentName,
  width,
  height,
  children
}: {
  documentName: string;
  width: number;
  height: number;
  children: ReactNode;
}) {
  return (
    <div
      data-editor-chrome
      className="bg-background text-foreground font-geist relative flex flex-col [font-feature-settings:normal] antialiased"
      style={{ width, height }}
    >
      <EditorTopBar documentName={documentName} />
      <div className="flex min-h-0 flex-1">
        <PanelReplica side="left">
          <InvoicesPanelReplica />
        </PanelReplica>
        <div className="bg-desk relative flex min-h-0 min-w-0 flex-1 flex-col">
          <div className="relative flex h-full flex-col items-center-safe justify-center-safe overflow-hidden p-8 pb-20">
            <div
              className="shrink-0"
              style={{ width: PAGE_WIDTH, height: PAGE_HEIGHT }}
            >
              {children}
            </div>
          </div>
          <CanvasPill />
        </div>
        <PanelReplica side="right">
          <InspectorReplica />
        </PanelReplica>
      </div>
    </div>
  );
}

// Mirrors components/editor/shell/side-panel.tsx, open.
function PanelReplica({
  side,
  children
}: {
  side: "left" | "right";
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "bg-background border-border flex min-h-0 shrink-0 flex-col overflow-hidden",
        side === "left" ? "w-64 border-r" : "w-72 border-l"
      )}
    >
      {children}
    </div>
  );
}

// The hero invoice's sender, Marlow Studio, has billed these clients. The
// library groups by client and sorts by last edit, as it does by default,
// with the hero invoice open (INV-0043 is $4,200.00 less 10%). There are
// enough rows to run past the foot of the hero's frame.
const SAMPLE_LIBRARY: {
  client: string;
  invoices: { number: string; total: string; edited: string }[];
}[] = [
  {
    client: "Fernhill Press",
    invoices: [
      { number: "INV-0043", total: "$3,780.00", edited: "18 Oct 2026" },
      { number: "INV-0038", total: "$2,150.00", edited: "2 Sep 2026" }
    ]
  },
  {
    client: "Hollis Coffee Roasters",
    invoices: [
      { number: "INV-0042", total: "$3,400.00", edited: "12 Oct 2026" },
      { number: "INV-0036", total: "$1,275.00", edited: "14 Aug 2026" }
    ]
  },
  {
    client: "Northside Quarterly",
    invoices: [{ number: "INV-0041", total: "$860.00", edited: "29 Sep 2026" }]
  },
  {
    client: "Calder Architecture",
    invoices: [
      { number: "INV-0040", total: "$1,980.00", edited: "21 Sep 2026" },
      { number: "INV-0034", total: "$640.00", edited: "30 Jul 2026" }
    ]
  },
  {
    client: "Greenpoint Food Co-op",
    invoices: [
      { number: "INV-0039", total: "$1,450.00", edited: "16 Sep 2026" },
      { number: "INV-0033", total: "$720.00", edited: "8 Jul 2026" }
    ]
  },
  {
    client: "Wren Theatre Company",
    invoices: [
      { number: "INV-0037", total: "$2,600.00", edited: "27 Aug 2026" },
      { number: "INV-0032", total: "$1,180.00", edited: "1 Jul 2026" }
    ]
  },
  {
    client: "Ashby Records",
    invoices: [
      { number: "INV-0035", total: "$950.00", edited: "5 Aug 2026" },
      { number: "INV-0030", total: "$1,600.00", edited: "18 Jun 2026" }
    ]
  }
];

const CURRENT_INVOICE_NUMBER = "INV-0043";

// Mirrors components/editor/shell/invoices-panel.tsx.
function InvoicesPanelReplica() {
  return (
    <>
      <div className="flex shrink-0 flex-col gap-2 px-3 pt-2.5 pb-2">
        <SegmentedReplica
          options={["Invoices", "Templates"]}
          selected="Invoices"
        />
        <div className="flex items-center gap-1.5">
          <span className="bg-muted text-muted-foreground flex h-8 min-w-0 flex-1 items-center gap-1.5 rounded-md border border-transparent px-2 text-[13px]">
            <IconSearch aria-hidden="true" className="size-3.5 shrink-0" />
            Search invoices
          </span>
          <span className="bg-muted text-muted-foreground flex size-8 items-center justify-center rounded-md">
            <IconAdjustmentsHorizontal aria-hidden="true" className="size-4" />
          </span>
        </div>
      </div>
      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden px-1.5 pb-2">
        {SAMPLE_LIBRARY.map(group => (
          <div key={group.client} className="flex flex-col gap-px">
            <span className="text-muted-foreground flex items-center justify-between gap-2 px-2 pt-1 pb-0.5 text-[11px] font-medium">
              <span className="truncate">{group.client}</span>
              <span className="tabular-nums">{group.invoices.length}</span>
            </span>
            {group.invoices.map(invoice => (
              <span
                key={invoice.number}
                className={cn(
                  "grid grid-cols-[minmax(0,1fr)_auto] gap-x-2 rounded-md py-1.5 pr-9 pl-2",
                  invoice.number === CURRENT_INVOICE_NUMBER && "bg-accent"
                )}
              >
                <span className="text-foreground truncate text-[13px] font-medium">
                  {invoice.number} · {group.client}
                </span>
                <span className="text-muted-foreground text-xs leading-5 tabular-nums">
                  {invoice.total}
                </span>
                <span className="text-muted-foreground col-span-2 truncate text-xs">
                  No. {invoice.number} · Edited {invoice.edited}
                </span>
              </span>
            ))}
          </div>
        ))}
      </div>
      <div className="border-border flex shrink-0 flex-col border-t p-3">
        <span
          className={buttonVariants({
            variant: "secondary",
            className: "w-full"
          })}
        >
          <IconPlus aria-hidden="true" />
          New invoice
        </span>
      </div>
    </>
  );
}

// Mirrors components/editor/shell/inspector/*, set to the hero invoice: Geist
// at Regular and Medium, US dollars, issued 5 Oct 2026 on Net 30.
function InspectorReplica() {
  return (
    <div className="min-h-0 flex-1 overflow-hidden">
      <InspectorSectionReplica title="Style">
        <div className="flex flex-col gap-1.5">
          <InspectorLabelReplica>Font</InspectorLabelReplica>
          <div className="grid grid-cols-2 gap-1.5">
            {INVOICE_FONTS.map(font => (
              <span
                key={font.id}
                className={cn(
                  "bg-muted flex min-w-0 flex-col items-start gap-0.5 rounded-lg border border-transparent px-2.5 py-2",
                  font.id === "geist" && "border-foreground bg-popover"
                )}
              >
                <span
                  className={cn(
                    "text-foreground text-xl leading-tight",
                    font.previewClassName
                  )}
                >
                  Aa
                </span>
                <span className="text-muted-foreground w-full truncate text-[11.5px]">
                  {font.name}
                </span>
              </span>
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <InspectorLabelReplica>Weight</InspectorLabelReplica>
          <SegmentedReplica
            options={FONT_WEIGHT_OPTIONS.map(option => option.label)}
            selected="Regular"
            optionClassNames={FONT_WEIGHT_OPTIONS.map(
              option => option.className
            )}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <InspectorLabelReplica>Text size</InspectorLabelReplica>
          <SegmentedReplica
            options={["Small", "Medium", "Large"]}
            selected="Medium"
          />
        </div>
      </InspectorSectionReplica>
      <InspectorSectionReplica title="Details">
        <InspectorRowReplica label="Currency" value="$ Dollar · USD" />
        <InspectorRowReplica label="Issue date" value="5 Oct 2026" isDate />
        <InspectorRowReplica label="Payment terms" value="Net 30" />
        <InspectorRowReplica label="Date format" value="18 Oct 2026" />
      </InspectorSectionReplica>
      <InspectorSectionReplica title="Sections">
        <div className="flex flex-col gap-0.5">
          <InspectorLabelReplica>Header</InspectorLabelReplica>
          <SwitchRowReplica label="Logo" isOn />
          <SwitchRowReplica label="PO number" />
          <SwitchRowReplica label="Service period" />
          <SwitchRowReplica label="Shipping address" />
        </div>
      </InspectorSectionReplica>
    </div>
  );
}

function InspectorSectionReplica({
  title,
  children
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="border-border flex flex-col border-b px-4 pb-4 last:border-b-0">
      <span className="text-foreground flex h-11 items-center justify-between text-[13px] font-semibold">
        {title}
        <IconChevronDown
          aria-hidden="true"
          className="text-muted-foreground size-3.5"
        />
      </span>
      <div className="flex flex-col gap-3">{children}</div>
    </div>
  );
}

function InspectorLabelReplica({ children }: { children: ReactNode }) {
  return (
    <span className="text-muted-foreground text-xs font-medium">
      {children}
    </span>
  );
}

function InspectorRowReplica({
  label,
  value,
  isDate = false
}: {
  label: string;
  value: string;
  isDate?: boolean;
}) {
  const Icon = isDate ? IconCalendar : IconChevronDown;

  return (
    <div className="grid grid-cols-[6rem_minmax(0,1fr)] items-center gap-2">
      <span className="text-muted-foreground text-[13px]">{label}</span>
      <span className="bg-muted text-foreground flex h-8 min-w-0 items-center justify-between gap-2 rounded-md border border-transparent px-2 text-[13px] tabular-nums">
        <span className="truncate">{value}</span>
        <Icon
          aria-hidden="true"
          className={cn(
            "shrink-0",
            isDate ? "text-muted-foreground size-3.5" : "size-4"
          )}
        />
      </span>
    </div>
  );
}

// Mirrors the Switch in components/ui/switch.tsx. The hero invoice has a
// logo but no PO number, service period or shipping address.
function SwitchRowReplica({
  label,
  isOn = false
}: {
  label: string;
  isOn?: boolean;
}) {
  return (
    <span className="-mx-1.5 flex h-8 items-center justify-between gap-3 rounded-md px-1.5 text-[13px]">
      <span className="text-foreground">{label}</span>
      <span
        className={cn(
          "flex h-[18.4px] w-[32px] shrink-0 items-center rounded-full border border-transparent",
          isOn ? "bg-ring" : "bg-input"
        )}
      >
        <span
          className={cn(
            "block size-4 rounded-full bg-white shadow-xs",
            isOn && "translate-x-[calc(100%-2px)]"
          )}
        />
      </span>
    </span>
  );
}

// Mirrors SegmentedControl in components/editor/shell/inspector/inspector-controls.tsx.
function SegmentedReplica({
  options,
  selected,
  optionClassNames = []
}: {
  options: string[];
  selected: string;
  optionClassNames?: string[];
}) {
  return (
    <span className="bg-muted flex w-full items-center rounded-lg p-0.5">
      {options.map((option, index) => (
        <span
          key={option}
          className={cn(
            "text-muted-foreground flex h-7 min-w-0 flex-1 items-center justify-center truncate rounded-md px-1.5 text-xs",
            option === selected &&
              "bg-popover text-foreground ring-foreground/10 shadow-xs ring-1",
            optionClassNames[index]
          )}
        >
          {option}
        </span>
      ))}
    </span>
  );
}

// Mirrors components/editor/shell/editor-top-bar.tsx.
function EditorTopBar({ documentName }: { documentName: string }) {
  return (
    <div
      className="bg-background border-border grid w-full shrink-0 grid-cols-[1fr_auto_1fr] items-center gap-3 border-b px-3"
      style={{ height: TOP_BAR_HEIGHT }}
    >
      <div className="flex min-w-0 items-center gap-1">
        <span className="text-muted-foreground flex h-8 items-center gap-0.5 rounded-md pr-1 pl-0.5">
          <img src="/favicon.svg" alt="" className="size-6 rounded-[6px]" />
          <IconChevronDown aria-hidden="true" className="size-3.5" />
        </span>
        <span className="text-foreground flex size-7 items-center justify-center">
          <IconLayoutSidebar aria-hidden="true" className="size-4" />
        </span>
      </div>
      <div className="flex min-w-0 items-center gap-2">
        <span className="text-foreground flex h-7 items-center px-2 text-sm font-medium">
          {documentName}
        </span>
        <span className="flex size-6 items-center justify-center">
          <span aria-hidden="true" className="bg-success size-2 rounded-full" />
          <span className="sr-only">Draft on this device</span>
        </span>
      </div>
      <div className="flex min-w-0 items-center justify-end gap-1">
        <span className="text-foreground flex size-7 items-center justify-center">
          <IconLayoutSidebarRight aria-hidden="true" className="size-4" />
        </span>
        <span className="text-muted-foreground mr-1 flex size-7 items-center justify-center">
          <IconPlayerPlay aria-hidden="true" className="size-4" />
        </span>
        <span
          className={buttonVariants({
            variant: "primary",
            size: "sm",
            className: "h-8 px-3"
          })}
        >
          Download
        </span>
      </div>
    </div>
  );
}

// Mirrors components/editor/shell/canvas-pill.tsx.
function CanvasPill() {
  return (
    <div className="bg-popover ring-foreground/10 shadow-menu absolute bottom-3 left-1/2 z-20 flex -translate-x-1/2 items-center gap-1 rounded-xl p-1 ring-1">
      <div className="bg-muted flex items-center rounded-lg p-0.5">
        <span className="bg-popover text-foreground ring-foreground/10 flex h-6 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium shadow-xs ring-1">
          <IconPencil aria-hidden="true" className="size-3.5" />
          Edit
        </span>
        <span className="text-muted-foreground flex h-6 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium">
          <IconEye aria-hidden="true" className="size-3.5" />
          Preview
        </span>
      </div>
      <PillDivider />
      <span className="text-muted-foreground flex size-7 items-center justify-center">
        <IconMinus aria-hidden="true" className="size-4" />
      </span>
      <span className="flex h-7 min-w-16 items-center justify-center gap-0.5 px-1.5 text-xs font-medium tabular-nums">
        100%
        <IconChevronDown
          aria-hidden="true"
          className="text-muted-foreground size-3"
        />
      </span>
      <span className="text-muted-foreground flex size-7 items-center justify-center">
        <IconPlus aria-hidden="true" className="size-4" />
      </span>
      <PillDivider />
      <span className="text-muted-foreground flex size-7 items-center justify-center">
        <IconMoon aria-hidden="true" className="size-4" />
      </span>
      <span className="text-muted-foreground flex size-7 items-center justify-center">
        <IconCommand aria-hidden="true" className="size-4" />
      </span>
    </div>
  );
}

function PillDivider() {
  return <span aria-hidden="true" className="bg-border mx-0.5 h-5 w-px" />;
}

/**
 * The invoice title as the editor sets it, in the given face.
 */
export function getTitleStyle(font: InvoiceFont): CSSProperties {
  return roleStyle(getSampleTheme(font), "title");
}
