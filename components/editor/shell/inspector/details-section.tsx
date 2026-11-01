import { IconCalendar, IconPlus, IconX } from "@tabler/icons-react";
import { format } from "date-fns";
import type { ReactNode } from "react";
import { useId, useRef, useState } from "react";
import { flushSync } from "react-dom";
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
import { useSecondCurrency } from "~/hooks/use-second-currency";
import { cn } from "~/lib/utils";
import { INVOICE_DATE_FORMATS } from "~/schema/invoice";
import {
  useCurrencyConversionSlice,
  useCurrencySlice,
  useDetailsSlice
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
const SECOND_CURRENCY_ID = "inspector-second-currency";

export function DetailsSection() {
  return (
    <InspectorSection id="details" title="Details">
      <CurrencyRows />
      <DatesRows />
      <DateFormatRow />
    </InspectorSection>
  );
}

// The currency, and a second one the amounts are also shown in: a quiet link
// under the currency until one is added, then its own picker with a way to
// remove it. Focus follows, to the new picker or back to the link.
function CurrencyRows() {
  const { currency, currencyCode, setCurrency, setCurrencyCode } =
    useCurrencySlice();
  const { currencyConversion, setCurrencyConversion } =
    useCurrencyConversionSlice();
  const secondCurrency = useSecondCurrency();
  const addButtonRef = useRef<HTMLButtonElement>(null);

  function handleAdd() {
    flushSync(secondCurrency.add);
    document.getElementById(SECOND_CURRENCY_ID)?.focus();
  }

  function handleRemove() {
    flushSync(secondCurrency.remove);
    addButtonRef.current?.focus();
  }

  return (
    <div
      className={cn("flex flex-col", secondCurrency.isOn ? "gap-3" : "gap-1")}
    >
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
      {secondCurrency.isOn ? (
        <CurrencyPicker
          id={SECOND_CURRENCY_ID}
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
          action={
            <button
              type="button"
              aria-label="Remove second currency"
              onClick={handleRemove}
              className="text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-ring relative -mr-1 flex h-8 w-6 shrink-0 items-center justify-center rounded-md outline-none focus-visible:ring-1"
            >
              <IconX aria-hidden="true" className="size-3.5 shrink-0" />
              <span
                aria-hidden="true"
                className="absolute top-1/2 left-1/2 size-[max(100%,3rem)] -translate-1/2 pointer-fine:hidden"
              />
            </button>
          }
        />
      ) : (
        <div className="grid grid-cols-[6rem_minmax(0,1fr)] gap-2">
          <button
            ref={addButtonRef}
            type="button"
            onClick={handleAdd}
            className="text-muted-foreground hover:text-foreground focus-visible:ring-ring relative col-start-2 -mx-1 flex h-6 w-fit items-center gap-1 rounded-md px-1 text-xs outline-none focus-visible:ring-1"
          >
            <IconPlus aria-hidden="true" className="size-3.5 shrink-0" />
            Add second currency
            <span
              aria-hidden="true"
              className="absolute top-1/2 left-1/2 size-[max(100%,3rem)] -translate-1/2 pointer-fine:hidden"
            />
          </button>
        </div>
      )}
    </div>
  );
}

function CurrencyPicker({
  id,
  label,
  currency,
  currencyCode,
  action,
  onChange
}: {
  id: string;
  label: string;
  currency: string;
  currencyCode: string;
  action?: ReactNode;
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
        <div className="flex min-w-0 items-center gap-0.5">
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
          {action}
        </div>
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
