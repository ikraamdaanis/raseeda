import { IconX } from "@tabler/icons-react";
import type { KeyboardEvent } from "react";
import { useEffect, useRef, useState } from "react";
import {
  ColourRow,
  InspectorGroupLabel,
  InspectorInlineRows,
  ResetColoursButton,
  SegmentedControl
} from "~/components/editor/shell/inspector/inspector-controls";
import {
  SIZE_OPTIONS,
  useStyleChoices
} from "~/components/editor/shell/inspector/style-section";
import { TableColumnSwitches } from "~/components/editor/shell/inspector/table-section";
import { Button } from "~/components/ui/button";
import { INVOICE_FONTS } from "~/consts/invoice-fonts";
import { useEditorUi } from "~/context/editor-ui-context";
import { useInvoiceDocument } from "~/context/invoice-document-context";
import { cn } from "~/lib/utils";
import {
  DEFAULT_INVOICE_THEME,
  DEFAULT_TABLE_SETTINGS
} from "~/schema/invoice";
import { recordHistoryAction } from "~/stores/invoice-history";
import { useTableSettingsSlice } from "~/stores/invoice-selectors";

const TRAY_TABS = [
  { id: "text", label: "Text" },
  { id: "colour", label: "Colour" },
  { id: "table", label: "Table" }
] as const;

// The Style button in the phone's tab bar, which the tray hands focus back
// to as it closes.
export const STYLE_BUTTON_ID = "phone-style-button";

export const STYLE_TRAY_ID = "phone-style-tray";

/**
 * On a phone, the look of the invoice in a short tray over the Page tab
 * (issue #213), like Pages' Format controls or Canva's tool trays: the page
 * stays in view above it, so each change shows as it's made. It isn't modal
 * and has no backdrop, which would dim the colours being chosen. Its three
 * tabs each fit without scrolling. Tapping the page, Style again, × or Escape
 * closes it. What's set once rather than watched (type, language, formats,
 * paper) is in the form; the column labels are renamed there too.
 */
export function StyleTray() {
  const { isNarrow, rightPanelOpen, closePanels } = useEditorUi();
  const { status } = useInvoiceDocument();
  const [tab, setTab] = useState<(typeof TRAY_TABS)[number]["id"]>("text");
  const trayRef = useRef<HTMLElement>(null);
  const canEdit = status === "editing" || status === "unavailable";

  // Focus starts in the tray as it opens, on its tab, so the keyboard and
  // screen readers begin there rather than on the page under it.
  useEffect(() => {
    if (!rightPanelOpen) return;

    trayRef.current
      ?.querySelector<HTMLElement>('[role="tab"][aria-selected="true"]')
      ?.focus({ preventScroll: true });
  }, [rightPanelOpen]);

  // Closing hands focus back to the Style button the tray opened from.
  function close() {
    closePanels();
    document.getElementById(STYLE_BUTTON_ID)?.focus();
  }

  // Escape inside the tray closes it, as × does.
  useEffect(() => {
    const tray = trayRef.current;

    if (!rightPanelOpen || !tray) return;

    function listener(event: globalThis.KeyboardEvent) {
      if (event.key !== "Escape") return;

      event.stopPropagation();
      close();
    }

    tray.addEventListener("keydown", listener);

    return () => tray.removeEventListener("keydown", listener);
  });

  if (!isNarrow) return null;

  // Arrow keys move between the tabs, as in any tab list.
  function handleTabKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;

    event.preventDefault();
    const index = TRAY_TABS.findIndex(trayTab => trayTab.id === tab);
    const step = event.key === "ArrowRight" ? 1 : -1;
    const next =
      TRAY_TABS[(index + step + TRAY_TABS.length) % TRAY_TABS.length].id;

    setTab(next);
    document.getElementById(`style-tray-tab-${next}`)?.focus();
  }

  return (
    <section
      ref={trayRef}
      id={STYLE_TRAY_ID}
      aria-label="Style"
      inert={!rightPanelOpen}
      className={cn(
        "bg-background border-border shadow-floating absolute inset-x-0 bottom-0 z-20 flex h-(--style-tray-height) flex-col rounded-t-2xl border-t transition-[translate] duration-200 ease-out motion-reduce:transition-none",
        !rightPanelOpen && "translate-y-full shadow-none"
      )}
    >
      <div className="flex shrink-0 items-center gap-2 pt-3 pr-[max(0.5rem,env(safe-area-inset-right))] pb-2 pl-[max(1rem,env(safe-area-inset-left))]">
        <div
          role="tablist"
          aria-label="Style"
          className="bg-muted flex min-w-0 flex-1 items-center rounded-lg p-0.5"
        >
          {TRAY_TABS.map(trayTab => {
            const isSelected = trayTab.id === tab;

            return (
              <button
                key={trayTab.id}
                id={`style-tray-tab-${trayTab.id}`}
                type="button"
                role="tab"
                aria-selected={isSelected}
                aria-controls="style-tray-panel"
                tabIndex={isSelected ? 0 : -1}
                onClick={() => setTab(trayTab.id)}
                onKeyDown={handleTabKeyDown}
                className={cn(
                  "text-muted-foreground focus-visible:ring-ring flex h-11 min-w-0 flex-1 items-center justify-center rounded-md text-base outline-none focus-visible:ring-1",
                  isSelected &&
                    "bg-popover text-foreground ring-foreground/10 shadow-xs ring-1"
                )}
              >
                {trayTab.label}
              </button>
            );
          })}
        </div>
        <Button
          variant="ghost"
          aria-label="Close style"
          onClick={close}
          className="text-muted-foreground size-11 shrink-0"
        >
          <IconX aria-hidden="true" className="size-5" />
        </Button>
      </div>
      <div
        id="style-tray-panel"
        role="tabpanel"
        aria-labelledby={`style-tray-tab-${tab}`}
        inert={!canEdit}
        className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto overscroll-contain px-[max(1rem,env(safe-area-inset-left))] pt-1 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
      >
        <InspectorInlineRows value={true}>
          {tab === "text" && <TextTab />}
          {tab === "colour" && <ColourTab />}
          {tab === "table" && <TableColumnSwitches />}
        </InspectorInlineRows>
      </div>
    </section>
  );
}

// The font as a row of samples to swipe through, then its weight and size.
function TextTab() {
  const { theme, setTheme, weightOptions, selectFont } = useStyleChoices();
  const fontsRef = useRef<HTMLDivElement>(null);

  // The chosen font is scrolled into the row as the tab shows, never the tray
  // or the page around it.
  useEffect(() => {
    const row = fontsRef.current;
    const chosen = row?.querySelector<HTMLElement>('[aria-pressed="true"]');

    if (!row || !chosen) return;

    row.scrollLeft =
      chosen.offsetLeft - (row.clientWidth - chosen.offsetWidth) / 2;
  }, []);

  return (
    <>
      <div
        ref={fontsRef}
        role="group"
        aria-label="Font"
        className="-mx-4 flex shrink-0 snap-x scroll-px-4 [scrollbar-width:none] gap-2 overflow-x-auto overscroll-x-contain px-4"
      >
        {INVOICE_FONTS.map(font => (
          <button
            key={font.id}
            type="button"
            aria-pressed={theme.font === font.id}
            onClick={() => selectFont(font.id)}
            className="bg-muted aria-pressed:border-foreground aria-pressed:bg-popover focus-visible:ring-ring flex w-24 shrink-0 snap-start flex-col items-start gap-0.5 rounded-lg border border-transparent px-3 py-1.5 text-left outline-none focus-visible:ring-1"
          >
            <span
              aria-hidden="true"
              className={cn(
                "text-foreground text-2xl leading-tight",
                font.previewClassName
              )}
            >
              Aa
            </span>
            <span className="text-muted-foreground w-full truncate text-sm">
              {font.name}
            </span>
          </button>
        ))}
      </div>
      <div className="flex flex-col gap-1.5">
        <InspectorGroupLabel>Weight</InspectorGroupLabel>
        <SegmentedControl
          label="Weight"
          value={theme.fontWeight}
          options={weightOptions.map(option => ({
            value: option.value,
            label: option.label,
            className: option.className
          }))}
          onChange={fontWeight =>
            setTheme(previous => ({ ...previous, fontWeight }))
          }
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <InspectorGroupLabel>Text size</InspectorGroupLabel>
        <SegmentedControl
          label="Text size"
          value={theme.size}
          options={SIZE_OPTIONS}
          onChange={size => setTheme(previous => ({ ...previous, size }))}
        />
      </div>
    </>
  );
}

// Every colour the invoice prints in, with one way back to the defaults.
function ColourTab() {
  const { theme, setTheme, lightColoursWarning } = useStyleChoices();
  const { tableSettings, setTableSettings } = useTableSettingsSlice();
  const hasDefaultColours =
    theme.accent === DEFAULT_INVOICE_THEME.accent &&
    theme.textColor === DEFAULT_INVOICE_THEME.textColor &&
    tableSettings.backgroundColor === DEFAULT_TABLE_SETTINGS.backgroundColor &&
    tableSettings.borderColor === DEFAULT_TABLE_SETTINGS.borderColor;

  return (
    <div className="flex flex-col gap-2">
      <ColourRow
        label="Accent"
        field="theme.accent"
        value={theme.accent}
        onChange={accent => setTheme(previous => ({ ...previous, accent }))}
      />
      <ColourRow
        label="Text"
        field="theme.textColor"
        value={theme.textColor}
        onChange={textColor =>
          setTheme(previous => ({ ...previous, textColor }))
        }
      />
      <ColourRow
        label="Header"
        field="tableSettings.backgroundColor"
        value={tableSettings.backgroundColor}
        onChange={backgroundColor =>
          setTableSettings(previous => ({ ...previous, backgroundColor }))
        }
      />
      <ColourRow
        label="Borders"
        field="tableSettings.borderColor"
        value={tableSettings.borderColor}
        onChange={borderColor =>
          setTableSettings(previous => ({ ...previous, borderColor }))
        }
      />
      {lightColoursWarning && (
        <p className="text-muted-foreground text-base/6 text-pretty">
          {lightColoursWarning}
        </p>
      )}
      {!hasDefaultColours && (
        <ResetColoursButton
          onClick={() =>
            recordHistoryAction("Reset colours", "page", () => {
              setTheme(previous => ({
                ...previous,
                accent: DEFAULT_INVOICE_THEME.accent,
                textColor: DEFAULT_INVOICE_THEME.textColor
              }));
              setTableSettings(previous => ({
                ...previous,
                backgroundColor: DEFAULT_TABLE_SETTINGS.backgroundColor,
                borderColor: DEFAULT_TABLE_SETTINGS.borderColor
              }));
            })
          }
        />
      )}
    </div>
  );
}
