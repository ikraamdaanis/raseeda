import { format } from "date-fns";
import type { CSSProperties } from "react";
import { useId, useState } from "react";
import { Calendar } from "~/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from "~/components/ui/popover";
import { useIsPreview } from "~/hooks/use-shown-sections";
import { cn } from "~/lib/utils";
import { useInvoiceStore } from "~/stores/invoice-store";
import { formatInvoiceDate } from "~/utils/format-invoice-date";
import { parseIsoDate, parseIsoDateRange } from "~/utils/parse-iso-date";

// A date on the page: written in the invoice's date format, and picked from a
// calendar rather than typed, so it's always a real date. A field that allows
// a range takes the first click as the date, and a second click as the other
// end of a range, stored as yyyy-MM-dd/yyyy-MM-dd.
export function InvoiceDateField({
  value,
  label,
  placeholder,
  style,
  allowsRange = false,
  onSelect
}: {
  value: string;
  label: string;
  placeholder: string;
  style: CSSProperties;
  allowsRange?: boolean;
  onSelect: (isoDate: string) => void;
}) {
  const dateFormat = useInvoiceStore(state => state.dateFormat);
  const [open, setOpen] = useState(false);
  const [rangeStart, setRangeStart] = useState<Date | null>(null);
  const textId = useId();
  const isPreview = useIsPreview();
  const selected = parseIsoDate(value) ?? undefined;
  const selectedRange = parseIsoDateRange(value) ?? undefined;
  const text = value ? formatInvoiceDate(value, dateFormat) : "";

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    setRangeStart(null);
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

  if (isPreview) {
    return (
      <span className="leading-paper-row text-paper-foreground" style={style}>
        {text}
      </span>
    );
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger
        aria-label={label}
        aria-describedby={textId}
        data-date={value}
        className={cn(
          "leading-paper-row rounded-surface hover:bg-brand-50 aria-expanded:bg-brand-50 focus-visible:border-brand-500 -mx-px w-full border border-transparent text-left outline-none",
          text ? "text-paper-foreground" : "text-paper-muted-foreground"
        )}
        style={style}
      >
        <span id={textId}>{text || placeholder}</span>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-0">
        {allowsRange ? (
          <>
            <Calendar
              mode="range"
              selected={selectedRange}
              defaultMonth={selectedRange?.from}
              onSelect={handleRangeSelect}
              autoFocus
              className="pointer-coarse:[--cell-size:--spacing(10)]"
            />
            <p className="text-muted-foreground px-3 pb-3 text-xs">
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
            className="pointer-coarse:[--cell-size:--spacing(10)]"
          />
        )}
      </PopoverContent>
    </Popover>
  );
}
