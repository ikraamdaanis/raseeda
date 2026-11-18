import { IconX } from "@tabler/icons-react";
import { format } from "date-fns";
import type { CSSProperties } from "react";
import { useState } from "react";
import { Button } from "~/components/ui/button";
import { Calendar } from "~/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from "~/components/ui/popover";
import { useIsPreview } from "~/hooks/use-shown-sections";
import { cn } from "~/lib/utils";
import { useInvoiceStore } from "~/stores/invoice-store";
import type { Invoice } from "~/types";
import { formatInvoiceDate } from "~/utils/format-invoice-date";
import {
  readInvoiceDate,
  readInvoiceDateRange
} from "~/utils/read-invoice-date";

// Day cells are 44px on a touch screen or a phone, and on a phone the text is
// 16px, as the phone's form is.
const CALENDAR_CLASS_NAME =
  "pointer-coarse:[--cell-size:--spacing(11)] max-md:[--cell-size:--spacing(11)] max-md:**:text-base";

// A date on the page: written in the invoice's date format, and picked from a
// calendar rather than typed, so it's always a real date. A field that allows
// a range takes the first click as the date, and a second click as the other
// end of a range, stored as yyyy-MM-dd/yyyy-MM-dd. An optional date can be
// cleared from under the calendar. formatValue writes the stored value, for a
// field that doesn't follow the invoice's date format to the letter. Presets,
// such as the due date's payment terms, sit above the calendar, each a date
// it picks in one click. The button is named by its label and the date it
// shows ("Due date, 15 Dec 2026"), so it can be found by either. The phone's
// form gives it `triggerClassName`, drawing the button as a form field instead
// of as text on the page.
export function InvoiceDateField({
  value,
  label,
  placeholder,
  style,
  allowsRange = false,
  canClear = false,
  formatValue = formatInvoiceDate,
  presets = [],
  triggerClassName,
  onSelect
}: {
  value: string;
  label: string;
  placeholder: string;
  style?: CSSProperties;
  allowsRange?: boolean;
  canClear?: boolean;
  formatValue?: (value: string, dateFormat: Invoice["dateFormat"]) => string;
  presets?: { label: string; value: string; isSelected: boolean }[];
  triggerClassName?: string;
  onSelect: (isoDate: string) => void;
}) {
  const dateFormat = useInvoiceStore(state => state.dateFormat);
  const [open, setOpen] = useState(false);
  const [rangeStart, setRangeStart] = useState<Date | null>(null);
  const isPreview = useIsPreview();
  const selected = readInvoiceDate(value) ?? undefined;
  const selectedRange = readInvoiceDateRange(value) ?? undefined;
  const text = value ? formatValue(value, dateFormat) : "";

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
  }

  function handleSelect(date: Date | undefined) {
    if (!date) return;

    onSelect(format(date, "yyyy-MM-dd"));
    setOpen(false);
  }

  function handleRangeSelect(_range: unknown, day: Date) {
    if (!rangeStart) {
      setRangeStart(day);
      onSelect(format(day, "yyyy-MM-dd"));

      return;
    }

    const [from, to] = day < rangeStart ? [day, rangeStart] : [rangeStart, day];
    const fromValue = format(from, "yyyy-MM-dd");
    const toValue = format(to, "yyyy-MM-dd");

    onSelect(fromValue === toValue ? fromValue : `${fromValue}/${toValue}`);
    handleOpenChange(false);
  }

  function handleClear() {
    onSelect("");
    handleOpenChange(false);
  }

  if (isPreview) {
    return (
      <span className="leading-paper-row text-paper-foreground" style={style}>
        {text}
      </span>
    );
  }

  return (
    <Popover
      open={open}
      onOpenChange={handleOpenChange}
      onOpenChangeComplete={isOpen => {
        if (!isOpen) setRangeStart(null);
      }}
    >
      <PopoverTrigger
        aria-label={`${label}, ${text || placeholder}`}
        data-date={value}
        className={
          triggerClassName
            ? cn(triggerClassName, !text && "text-muted-foreground")
            : cn(
                "leading-paper-row rounded-surface hover:bg-brand-50 aria-expanded:bg-brand-50 focus-visible:border-brand-500 -mx-px w-full border border-transparent text-left outline-none",
                text ? "text-paper-foreground" : "text-paper-muted-foreground"
              )
        }
        style={style}
      >
        {text || placeholder}
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-auto p-0 max-md:max-h-(--available-height) max-md:overflow-y-auto"
      >
        {presets.length > 0 && (
          <div
            role="group"
            aria-label="Payment terms"
            className="flex max-w-min min-w-full flex-wrap gap-1 px-3 pt-3 max-md:gap-2"
          >
            {presets.map(preset => (
              <Button
                key={preset.label}
                variant="outline"
                size="xs"
                aria-pressed={preset.isSelected}
                className="aria-pressed:bg-accent aria-pressed:text-accent-foreground whitespace-nowrap max-md:h-11 max-md:px-3 max-md:text-base"
                onClick={() => {
                  onSelect(preset.value);
                  handleOpenChange(false);
                }}
              >
                {preset.label}
              </Button>
            ))}
          </div>
        )}
        {allowsRange ? (
          <>
            <Calendar
              mode="range"
              selected={selectedRange}
              defaultMonth={selectedRange?.from}
              onSelect={handleRangeSelect}
              autoFocus
              className={CALENDAR_CLASS_NAME}
            />
            <p className="text-muted-foreground px-3 pb-3 text-xs max-md:text-base">
              {rangeStart ? "Pick the last day" : "Pick a day or a range"}
            </p>
          </>
        ) : (
          <Calendar
            mode="single"
            required
            selected={selected}
            defaultMonth={selected}
            onSelect={handleSelect}
            autoFocus
            className={CALENDAR_CLASS_NAME}
          />
        )}
        {canClear && value && (
          <div className="px-3 pb-3">
            <Button
              variant="outline"
              size="sm"
              className="w-full max-md:h-11 max-md:text-base"
              onClick={handleClear}
            >
              <IconX aria-hidden="true" />
              Clear date
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
