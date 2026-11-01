import { IconCalendar } from "@tabler/icons-react";
import { format } from "date-fns";
import { useId, useState } from "react";
import { CustomCurrencyDialog } from "~/components/dialogs/custom-currency-dialog";
import {
  inspectorFieldClassName,
  InspectorRow,
  InspectorSection
} from "~/components/editor/shell/inspector/inspector-controls";
import { Calendar } from "~/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from "~/components/ui/popover";
import { NativeSelect } from "~/components/ui/select";
import {
  currencyOptions,
  getCurrencyCodeForSymbol,
  getCurrencyMarker,
  normalizeCurrency
} from "~/consts/currencies";
import { cn } from "~/lib/utils";
import { INVOICE_DATE_FORMATS } from "~/schema/invoice";
import {
  useCurrencyConversionSlice,
  useCurrencySlice,
  useDetailsSlice,
  useSectionsSlice
} from "~/stores/invoice-selectors";
import { formatInvoiceDate } from "~/utils/format-invoice-date";
import { parseIsoDate } from "~/utils/parse-iso-date";
import {
  addDaysToIsoDate,
  dueDateForNewInvoiceDate,
  getPaymentTermsDays,
  PAYMENT_TERMS
} from "~/utils/payment-terms";

const CUSTOM_CURRENCY = "__custom";
const CUSTOM_TERMS = "custom";

export function DetailsSection() {
  return (
    <InspectorSection id="details" title="Details">
      <CurrencyRow />
      <ConversionCurrencyRow />
      <DatesRows />
      <DateFormatRow />
    </InspectorSection>
  );
}

function CurrencyRow() {
  const { currency, currencyCode, setCurrency, setCurrencyCode } =
    useCurrencySlice();

  return (
    <CurrencyPicker
      id="inspector-currency"
      label="Currency"
      currency={currency}
      currencyCode={currencyCode}
      onChange={(symbol, code) => {
        setCurrency(symbol);
        setCurrencyCode(code);
      }}
    />
  );
}

// The second currency the amounts are also shown in, while it's switched on.
function ConversionCurrencyRow() {
  const { sections } = useSectionsSlice();
  const { currencyConversion, setCurrencyConversion } =
    useCurrencyConversionSlice();

  if (!sections.currencyConversion) return null;

  return (
    <CurrencyPicker
      id="inspector-conversion-currency"
      label="Also show in"
      currency={currencyConversion.currency}
      currencyCode={currencyConversion.currencyCode}
      onChange={(symbol, code) =>
        setCurrencyConversion(prev => ({
          ...prev,
          currency: symbol,
          currencyCode: code
        }))
      }
    />
  );
}

function CurrencyPicker({
  id,
  label,
  currency,
  currencyCode,
  onChange
}: {
  id: string;
  label: string;
  currency: string;
  currencyCode: string;
  onChange: (symbol: string, code: string) => void;
}) {
  const [customOpen, setCustomOpen] = useState(false);
  const selected = normalizeCurrency(currency);
  const isCustom = !currencyOptions.some(option => option.symbol === selected);

  // A preset stores its symbol and its default ISO code together, so a bare
  // "$" still carries an explicit code the user can override.
  function handleChange(value: string) {
    if (value === CUSTOM_CURRENCY) {
      setCustomOpen(true);

      return;
    }

    onChange(value, getCurrencyCodeForSymbol(value));
  }

  return (
    <>
      <InspectorRow label={label} htmlFor={id}>
        <NativeSelect
          id={id}
          value={isCustom ? CUSTOM_CURRENCY : selected}
          onChange={event => handleChange(event.target.value)}
          className={cn(inspectorFieldClassName, "pr-7")}
        >
          {currencyOptions.map(({ symbol, code, label: name }) => (
            <option key={symbol} value={symbol}>
              {`${getCurrencyMarker(symbol)} ${name} · ${code}`}
            </option>
          ))}
          <option value={CUSTOM_CURRENCY}>
            {isCustom ? `Custom (${selected})` : "Custom…"}
          </option>
        </NativeSelect>
      </InspectorRow>
      <CustomCurrencyDialog
        open={customOpen}
        onOpenChange={setCustomOpen}
        currentSymbol={selected}
        currentCode={isCustom ? currencyCode : ""}
        onSubmit={onChange}
      />
    </>
  );
}

// Each format is shown as today's date written that way, so the choice is
// obvious without reading a pattern.
function DateFormatRow() {
  const { dateFormat, setDateFormat } = useDetailsSlice();
  const today = new Date();

  return (
    <InspectorRow label="Date format" htmlFor="inspector-date-format">
      <NativeSelect
        id="inspector-date-format"
        value={dateFormat}
        onChange={event => {
          const next = INVOICE_DATE_FORMATS.find(
            option => option === event.target.value
          );

          if (next) setDateFormat(next);
        }}
        className={cn(inspectorFieldClassName, "pr-7")}
      >
        {INVOICE_DATE_FORMATS.map(option => (
          <option key={option} value={option}>
            {format(today, option)}
          </option>
        ))}
      </NativeSelect>
    </InspectorRow>
  );
}

// The same calendar as the page's date fields, with the date written in the
// invoice's format.
function IssueDatePicker({
  value,
  onChange
}: {
  value: string;
  onChange: (isoDate: string) => void;
}) {
  const { dateFormat } = useDetailsSlice();
  const [open, setOpen] = useState(false);
  const selected = parseIsoDate(value) ?? undefined;
  const text = value ? formatInvoiceDate(value, dateFormat) : "";
  const textId = useId();

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        id="inspector-issue-date"
        aria-describedby={textId}
        className={cn(
          inspectorFieldClassName,
          "flex items-center justify-between gap-2 text-left tabular-nums"
        )}
      >
        <span id={textId} className="truncate">
          {text || "Pick a date"}
        </span>
        <IconCalendar
          aria-hidden="true"
          className="text-muted-foreground size-3.5 shrink-0"
        />
      </PopoverTrigger>
      <PopoverContent align="end" className="w-auto p-0">
        <Calendar
          mode="single"
          required
          selected={selected}
          defaultMonth={selected}
          onSelect={date => {
            onChange(format(date, "yyyy-MM-dd"));
            setOpen(false);
          }}
          autoFocus
          className="pointer-coarse:[--cell-size:--spacing(10)]"
        />
      </PopoverContent>
    </Popover>
  );
}

function DatesRows() {
  const { invoiceDate, dueDate, setInvoiceDate, setDueDate } =
    useDetailsSlice();
  const termsDays = getPaymentTermsDays(invoiceDate, dueDate);
  // Terms count from the issue date, so they wait until there is one.
  const hasIssueDate = parseIsoDate(invoiceDate) !== null;

  // Moving the invoice date keeps a preset's gap, so Net 30 stays Net 30.
  function handleInvoiceDateChange(value: string) {
    const nextDueDate = dueDateForNewInvoiceDate({
      invoiceDate,
      dueDate,
      nextInvoiceDate: value
    });

    setInvoiceDate(value);
    if (nextDueDate) setDueDate(nextDueDate);
  }

  function handleTermsChange(value: string) {
    if (value === CUSTOM_TERMS) return;

    const nextDueDate = addDaysToIsoDate(invoiceDate, Number(value));

    if (nextDueDate) setDueDate(nextDueDate);
  }

  return (
    <>
      <InspectorRow label="Issue date" htmlFor="inspector-issue-date">
        <IssueDatePicker
          value={invoiceDate}
          onChange={handleInvoiceDateChange}
        />
      </InspectorRow>
      <InspectorRow label="Payment terms" htmlFor="inspector-terms">
        <NativeSelect
          id="inspector-terms"
          disabled={!hasIssueDate}
          title={hasIssueDate ? undefined : "Pick an issue date first"}
          value={termsDays === null ? CUSTOM_TERMS : String(termsDays)}
          onChange={event => handleTermsChange(event.target.value)}
          className={cn(inspectorFieldClassName, "pr-7")}
        >
          {PAYMENT_TERMS.map(term => (
            <option key={term.days} value={String(term.days)}>
              {term.label}
            </option>
          ))}
          {termsDays === null && (
            <option value={CUSTOM_TERMS}>Custom due date</option>
          )}
        </NativeSelect>
      </InspectorRow>
    </>
  );
}
