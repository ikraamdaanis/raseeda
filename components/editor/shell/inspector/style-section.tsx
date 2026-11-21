import { IconChevronDown } from "@tabler/icons-react";
import {
  ColourRow,
  inspectorFieldClassName,
  InspectorGroupLabel,
  InspectorSection,
  ResetColoursButton,
  SegmentedControl
} from "~/components/editor/shell/inspector/inspector-controls";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger
} from "~/components/ui/dropdown-menu";
import type { InvoiceFontCategory } from "~/consts/invoice-fonts";
import {
  FONT_WEIGHT_OPTIONS,
  getAvailableFontWeights,
  INVOICE_FONTS
} from "~/consts/invoice-fonts";
import { cn } from "~/lib/utils";
import { DEFAULT_INVOICE_THEME } from "~/schema/invoice";
import { useThemeSlice } from "~/stores/invoice-selectors";
import type { InvoiceFont, InvoiceSize } from "~/types";
import { getContrastWithWhite } from "~/utils/contrast";

const FONT_CATEGORIES: { value: InvoiceFontCategory; label: string }[] = [
  { value: "sans-serif", label: "Sans serif" },
  { value: "serif", label: "Serif" },
  { value: "monospace", label: "Monospace" }
];

export const SIZE_OPTIONS: { value: InvoiceSize; label: string }[] = [
  { value: "small", label: "Small" },
  { value: "medium", label: "Medium" },
  { value: "large", label: "Large" }
];

// Below this ratio against the white page, WCAG calls text of the body's size
// hard to read. The accent is held to it too: only the title is large enough
// for WCAG's lower bar, the headings, the table's header and the total aren't.
const MIN_CONTRAST = 4.5;

// The theme and what the style controls offer for it, shared by the
// inspector's Style section and the phone's Style tray.
export function useStyleChoices() {
  const { theme, setTheme } = useThemeSlice();
  const weightOptions = FONT_WEIGHT_OPTIONS.filter(option =>
    getAvailableFontWeights(theme.font).includes(option.value)
  );
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

  return {
    theme,
    setTheme,
    weightOptions,
    selectFont,
    lightColoursWarning:
      lightColours.length === 0
        ? null
        : `The ${lightColours.join(" and ")} ${lightColours.length === 1 ? "is" : "are"} light enough to be hard to read on paper.`
  };
}

export function StyleSection() {
  const { theme, setTheme, weightOptions, selectFont, lightColoursWarning } =
    useStyleChoices();
  const hasDefaultColours =
    theme.accent === DEFAULT_INVOICE_THEME.accent &&
    theme.textColor === DEFAULT_INVOICE_THEME.textColor;

  return (
    <InspectorSection id="style" title="Style">
      <div className="flex flex-col gap-1.5 max-md:gap-2">
        <InspectorGroupLabel>Font</InspectorGroupLabel>
        <FontMenu value={theme.font} onChange={selectFont} />
      </div>
      <div className="flex flex-col gap-1.5 max-md:gap-2">
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
      <div className="flex flex-col gap-1.5 max-md:gap-2">
        <InspectorGroupLabel>Text size</InspectorGroupLabel>
        <SegmentedControl
          label="Text size"
          value={theme.size}
          options={SIZE_OPTIONS}
          onChange={size => setTheme(previous => ({ ...previous, size }))}
        />
      </div>
      <div className="flex flex-col gap-1.5 max-md:gap-2">
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
        <p className="text-muted-foreground text-xs text-pretty max-md:text-base/6">
          {lightColoursWarning ??
            "The accent colours the title, headings, table header and total."}
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

// The chosen font, set in itself, opens every font grouped by kind, each
// name set in its own face so the menu previews them. Shared by the
// inspector and the phone's Style tray.
export function FontMenu({
  value,
  onChange
}: {
  value: InvoiceFont;
  onChange: (font: InvoiceFont) => void;
}) {
  const chosenFont =
    INVOICE_FONTS.find(font => font.id === value) ?? INVOICE_FONTS[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={`Font: ${chosenFont.name}`}
        className={cn(
          inspectorFieldClassName,
          "aria-expanded:border-input flex items-center justify-between gap-2 text-left"
        )}
      >
        <span className={cn("min-w-0 truncate", chosenFont.previewClassName)}>
          {chosenFont.name}
        </span>
        <IconChevronDown
          aria-hidden="true"
          className="size-4 shrink-0 max-md:size-5"
        />
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuRadioGroup
          value={value}
          onValueChange={(font: unknown) => {
            const match = INVOICE_FONTS.find(option => option.id === font);
            if (match) onChange(match.id);
          }}
          className="flex flex-col gap-1"
        >
          {FONT_CATEGORIES.map(category => (
            <DropdownMenuGroup key={category.value} className="flex flex-col">
              <DropdownMenuLabel className="text-[11px] max-md:text-sm">
                {category.label}
              </DropdownMenuLabel>
              {INVOICE_FONTS.filter(
                font => font.category === category.value
              ).map(font => (
                <DropdownMenuRadioItem
                  key={font.id}
                  value={font.id}
                  closeOnClick
                  className={cn(
                    "py-1.5 text-sm max-md:text-base",
                    font.previewClassName
                  )}
                >
                  {font.name}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuGroup>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
