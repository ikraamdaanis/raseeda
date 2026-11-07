import { IconChevronDown } from "@tabler/icons-react";
import {
  ColourRow,
  InspectorGroupLabel,
  InspectorSection,
  ResetColoursButton,
  SegmentedControl
} from "~/components/editor/shell/inspector/inspector-controls";
import {
  FONT_WEIGHT_OPTIONS,
  getAvailableFontWeights,
  INVOICE_FONTS
} from "~/consts/invoice-fonts";
import { parseBoolean, usePersistentState } from "~/hooks/use-persistent-state";
import { cn } from "~/lib/utils";
import { DEFAULT_INVOICE_THEME } from "~/schema/invoice";
import { useThemeSlice } from "~/stores/invoice-selectors";
import type { InvoiceFont, InvoiceSize } from "~/types";
import { getContrastWithWhite } from "~/utils/contrast";

// Collapsed, the font grid is two rows.
const COLLAPSED_FONT_COUNT = 4;

const SIZE_OPTIONS: { value: InvoiceSize; label: string }[] = [
  { value: "small", label: "Small" },
  { value: "medium", label: "Medium" },
  { value: "large", label: "Large" }
];

// Below this ratio against the white page, WCAG calls text of the body's size
// hard to read. The accent is held to it too: only the title is large enough
// for WCAG's lower bar, the headings, the table's header and the total aren't.
const MIN_CONTRAST = 4.5;

export function StyleSection() {
  const { theme, setTheme } = useThemeSlice();
  const weightOptions = FONT_WEIGHT_OPTIONS.filter(option =>
    getAvailableFontWeights(theme.font).includes(option.value)
  );
  const [showAllFonts, setShowAllFonts] = usePersistentState(
    "editor-inspector-all-fonts",
    false,
    parseBoolean
  );
  // Collapsed, the chosen font stays in view: it takes the last place when
  // it isn't one of the first few.
  const firstFonts = INVOICE_FONTS.slice(0, COLLAPSED_FONT_COUNT);
  const chosenFont = INVOICE_FONTS.find(font => font.id === theme.font);
  const collapsedFonts =
    !chosenFont || firstFonts.includes(chosenFont)
      ? firstFonts
      : [...firstFonts.slice(0, -1), chosenFont];
  const fonts = showAllFonts ? INVOICE_FONTS : collapsedFonts;
  const hasDefaultColours =
    theme.accent === DEFAULT_INVOICE_THEME.accent &&
    theme.textColor === DEFAULT_INVOICE_THEME.textColor;
  const lightColours = [
    getContrastWithWhite(theme.accent) < MIN_CONTRAST && "accent",
    getContrastWithWhite(theme.textColor) < MIN_CONTRAST && "text colour"
  ].filter(Boolean);

  // A font that lacks the current weight falls back to Regular.
  function selectFont(font: InvoiceFont) {
    const available = getAvailableFontWeights(font);

    setTheme(previous => ({
      ...previous,
      font,
      fontWeight: available.includes(previous.fontWeight)
        ? previous.fontWeight
        : "Normal"
    }));
  }

  return (
    <InspectorSection id="style" title="Style">
      <div className="flex flex-col gap-1.5">
        <InspectorGroupLabel>Font</InspectorGroupLabel>
        <div
          role="group"
          aria-label="Font"
          className="grid grid-cols-2 gap-1.5"
        >
          {fonts.map(font => (
            <button
              key={font.id}
              type="button"
              aria-pressed={theme.font === font.id}
              onClick={() => selectFont(font.id)}
              className="bg-muted hover:border-input aria-pressed:border-foreground aria-pressed:bg-popover focus-visible:ring-ring flex min-w-0 flex-col items-start gap-0.5 rounded-lg border border-transparent px-2.5 py-2 text-left outline-none focus-visible:ring-1"
            >
              <span
                aria-hidden="true"
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
            </button>
          ))}
        </div>
        <button
          type="button"
          aria-expanded={showAllFonts}
          onClick={() => setShowAllFonts(!showAllFonts)}
          className="text-muted-foreground hover:text-foreground focus-visible:ring-ring relative -mx-1 flex h-6 w-fit items-center gap-1 rounded-md px-1 text-xs outline-none focus-visible:ring-1"
        >
          {showAllFonts
            ? "Show less"
            : `Show all ${INVOICE_FONTS.length} fonts`}
          <IconChevronDown
            aria-hidden="true"
            className={cn(
              "size-3.5 shrink-0 transition-transform motion-reduce:transition-none",
              showAllFonts && "rotate-180"
            )}
          />
          <span
            aria-hidden="true"
            className="absolute top-1/2 left-1/2 size-[max(100%,3rem)] -translate-1/2 pointer-fine:hidden"
          />
        </button>
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
      <div className="flex flex-col gap-1.5">
        <InspectorGroupLabel>Colours</InspectorGroupLabel>
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
        <p className="text-muted-foreground text-xs">
          {lightColours.length === 0
            ? "The accent colours the title, headings, table header and total."
            : `The ${lightColours.join(" and ")} ${lightColours.length === 1 ? "is" : "are"} light enough to be hard to read on paper.`}
        </p>
        {!hasDefaultColours && (
          <ResetColoursButton
            onClick={() =>
              setTheme(previous => ({
                ...previous,
                accent: DEFAULT_INVOICE_THEME.accent,
                textColor: DEFAULT_INVOICE_THEME.textColor
              }))
            }
          />
        )}
      </div>
    </InspectorSection>
  );
}
