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
import { parseIsoDate } from "~/utils/parse-iso-date";

// A date on the page: written in the invoice's date format, and picked from a
// calendar rather than typed, so it's always a real date.
export function InvoiceDateField({
  value,
  label,
  placeholder,
  style,
  onSelect
}: {
  value: string;
  label: string;
  placeholder: string;
  style: CSSProperties;
  onSelect: (isoDate: string) => void;
}) {
  const dateFormat = useInvoiceStore(state => state.dateFormat);
  const [open, setOpen] = useState(false);
  const textId = useId();
  const isPreview = useIsPreview();
  const selected = parseIsoDate(value) ?? undefined;
  const text = value ? formatInvoiceDate(value, dateFormat) : "";

  function handleSelect(date: Date | undefined) {
    if (!date) return;

    onSelect(format(date, "yyyy-MM-dd"));
    setOpen(false);
  }

  if (isPreview) {
    return (
      <span className="leading-paper-row text-paper-foreground" style={style}>
        {text}
      </span>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
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
        <Calendar
          mode="single"
          required
          selected={selected}
          defaultMonth={selected}
          onSelect={handleSelect}
          autoFocus
          className="pointer-coarse:[--cell-size:--spacing(10)]"
        />
      </PopoverContent>
    </Popover>
  );
}
