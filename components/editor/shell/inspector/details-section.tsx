import { IconCalendar, IconPlus, IconX } from "@tabler/icons-react";
import { format } from "date-fns";
import { useId, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { CustomCurrencyDialog } from "~/components/dialogs/custom-currency-dialog";
import { useExchangeRateField } from "~/components/editor/invoice-exchange-rate";
import {
  inspectorFieldClassName,
  InspectorRow,
  InspectorSection
} from "~/components/editor/shell/inspector/inspector-controls";
import { Button } from "~/components/ui/button";
import { Calendar } from "~/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from "~/components/ui/popover";
import { NativeSelect } from "~/components/ui/select";
import { Switch } from "~/components/ui/switch";
import {
  currencyOptions,
  formatCurrency,
  getCurrencyCodeForSymbol,
  getCurrencyMarker,
  normalizeCurrency
} from "~/consts/currencies";
import {
  DOCUMENT_TYPE_NAMES,
  DOCUMENT_TYPE_ROWS
} from "~/consts/document-types";
import { useCurrencyConversion } from "~/hooks/use-currency-conversion";
import { useSecondCurrency } from "~/hooks/use-second-currency";
import { cn } from "~/lib/utils";
import {
  CURRENCY_POSITIONS,
  DOCUMENT_TYPES,
  INVOICE_DATE_FORMATS,
  INVOICE_NUMBER_FORMATS,
  INVOICE_PAPER_SIZES
} from "~/schema/invoice";
import {
  useAmountFormatSlice,
  useCurrencyConversionSlice,
  useCurrencySlice,
  useDetailsSlice,
  useDocumentType,
  useDocumentTypeSlice,
  useMoneyFormat,
  usePaperSizeSlice,
  useTheme
} from "~/stores/invoice-selectors";
import { isSameCurrency } from "~/utils/currency-conversion";
import { formatInvoiceDate } from "~/utils/format-invoice-date";
import { formatNumber } from "~/utils/format-number";
import {
  addDaysToIsoDate,
  dueDateForNewInvoiceDate,
  getPaymentTermsDays,
  PAYMENT_TERMS
} from "~/utils/payment-terms";
import { readInvoiceDate } from "~/utils/read-invoice-date";

const CUSTOM_CURRENCY = "__custom";
const CUSTOM_TERMS = "custom";
const SECOND_CURRENCY_ID = "inspector-second-currency";

export function DetailsSection() {
  return (
    <InspectorSection id="details" title="Details">
      <DocumentTypeRow />
      <CurrencyRows />
      <DatesRows />
      <DateFormatRow />
      <NumberFormatRow />
      <CurrencyPositionRow />
      <PaperSizeRow />
    </InspectorSection>
  );
}

// The currency, and a second one (never the same) the amounts are also shown
// in: a quiet link under the currency until one is added, then its own picker
// with a way to remove it. Focus follows, to the new picker or back to the
// link.
function CurrencyRows() {
  const { currency, currencyCode, setCurrency } = useCurrencySlice();
  const { currencyConversion, setSecondCurrency } =
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
        onChange={setCurrency}
      />
      {secondCurrency.isOn ? (
        <>
          <CurrencyPicker
            id={SECOND_CURRENCY_ID}
            label="Also show in"
            currency={currencyConversion.currency}
            currencyCode={currencyConversion.currencyCode}
            exclude={{ currency, currencyCode }}
            customTitle="Custom second currency"
            onChange={setSecondCurrency}
          />
          <div className="before:bg-border relative flex flex-col gap-3 before:absolute before:inset-y-0.5 before:left-0 before:w-px">
            <ExchangeRateRows />
            <button
              type="button"
              onClick={handleRemove}
              className="text-muted-foreground hover:text-foreground focus-visible:ring-ring relative ml-2 flex h-6 w-fit items-center gap-1 rounded-md px-1 text-xs outline-none focus-visible:ring-1"
            >
              <IconX aria-hidden="true" className="size-3.5 shrink-0" />
              Remove second currency
              <span
                aria-hidden="true"
                className="absolute top-1/2 left-1/2 size-[max(100%,3rem)] -translate-1/2 pointer-fine:hidden"
              />
            </button>
          </div>
        </>
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

// The rate the second currency is worked out at, with where it's from, its
// date and whether the line under the totals prints: the same fields as that
// line, so either can be used. They sit indented under the second currency,
// a rule down their left, so they read as part of it.
function ExchangeRateRows() {
  const conversion = useCurrencyConversion();
  const { currencyConversion, setCurrencyConversion } =
    useCurrencyConversionSlice();
  const rateInput = useExchangeRateField();

  if (!conversion) return null;

  return (
    <>
      <InspectorRow
        label={`1 ${conversion.fromCode} =`}
        htmlFor="inspector-exchange-rate"
        nested
      >
        <div
          className={cn(
            inspectorFieldClassName,
            "focus-within:border-ring flex items-center gap-1"
          )}
        >
          <input
            id="inspector-exchange-rate"
            aria-label={`Exchange rate, ${conversion.toCode} per ${conversion.fromCode}`}
            data-field="currencyConversion.rate"
            inputMode="decimal"
            value={rateInput.value}
            onChange={event => rateInput.onChange(event.target.value)}
            onFocus={rateInput.onFocus}
            onBlur={rateInput.onBlur}
            placeholder={rateInput.placeholder}
            className="placeholder:text-muted-foreground min-w-0 flex-1 bg-transparent outline-none"
          />
          <span className="text-muted-foreground shrink-0">
            {conversion.toCode}
          </span>
        </div>
      </InspectorRow>
      <InspectorRow label="Source" htmlFor="inspector-exchange-source" nested>
        <input
          id="inspector-exchange-source"
          data-field="currencyConversion.source"
          value={currencyConversion.source}
          onChange={event =>
            setCurrencyConversion(prev => ({
              ...prev,
              source: event.target.value
            }))
          }
          placeholder="e.g. Central bank rate"
          className={cn(
            inspectorFieldClassName,
            "placeholder:text-muted-foreground"
          )}
        />
      </InspectorRow>
      <InspectorRow label="Date" htmlFor="inspector-exchange-date" nested>
        <InspectorDatePicker
          id="inspector-exchange-date"
          value={currencyConversion.date}
          onChange={date => setCurrencyConversion(prev => ({ ...prev, date }))}
          canClear
        />
      </InspectorRow>
      <InspectorRow label="Show rate" htmlFor="inspector-exchange-show" nested>
        <Switch
          id="inspector-exchange-show"
          size="sm"
          checked={currencyConversion.showRate}
          onCheckedChange={showRate =>
            setCurrencyConversion(prev => ({ ...prev, showRate }))
          }
          className="justify-self-end"
        />
      </InspectorRow>
    </>
  );
}

function CurrencyPicker({
  id,
  label,
  currency,
  currencyCode,
  exclude,
  customTitle,
  onChange
}: {
  id: string;
  label: string;
  currency: string;
  currencyCode: string;
  exclude?: { currency: string; currencyCode: string };
  customTitle?: string;
  onChange: (symbol: string, code: string) => void;
}) {
  const [customOpen, setCustomOpen] = useState(false);
  const { font } = useTheme();
  const selected = normalizeCurrency(currency);
  const isCustom = !currencyOptions.some(option => option.symbol === selected);
  // The selected preset stays listed even when excluded, so the select never
  // shows a currency the invoice doesn't have.
  const options = currencyOptions.filter(
    option =>
      option.symbol === selected ||
      !exclude ||
      !isSameCurrency(exclude, {
        currency: option.symbol,
        currencyCode: option.code
      })
  );

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
            {options.map(({ symbol, code, label: name }) => (
              <option key={symbol} value={symbol}>
                {`${getCurrencyMarker({ currency: symbol, currencyCode: code, font })} ${name} · ${code}`}
              </option>
            ))}
            <option value={CUSTOM_CURRENCY}>
              {isCustom ? `Custom (${selected})` : "Custom…"}
            </option>
          </NativeSelect>
        </div>
      </InspectorRow>
      <CustomCurrencyDialog
        open={customOpen}
        onOpenChange={setCustomOpen}
        currentSymbol={isCustom ? selected : ""}
        currentCode={isCustom ? currencyCode : ""}
        title={customTitle}
        isTaken={(symbol, code) =>
          exclude !== undefined &&
          isSameCurrency(exclude, { currency: symbol, currencyCode: code })
        }
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

// Each format is shown as a sample amount written that way.
function NumberFormatRow() {
  const { numberFormat, setNumberFormat } = useAmountFormatSlice();

  return (
    <InspectorRow label="Number format" htmlFor="inspector-number-format">
      <NativeSelect
        id="inspector-number-format"
        value={numberFormat}
        onChange={event => {
          const next = INVOICE_NUMBER_FORMATS.find(
            option => option === event.target.value
          );

          if (next) setNumberFormat(next);
        }}
        className={cn(inspectorFieldClassName, "pr-7")}
      >
        {INVOICE_NUMBER_FORMATS.map(option => (
          <option key={option} value={option}>
            {formatNumber(1234567.89, { numberFormat: option, decimals: 2 })}
          </option>
        ))}
      </NativeSelect>
    </InspectorRow>
  );
}

// Which side of the figure the currency sits, each shown as an amount in the
// invoice's own currency and format.
function CurrencyPositionRow() {
  const { currencyPosition, setCurrencyPosition } = useAmountFormatSlice();
  const money = useMoneyFormat();

  return (
    <InspectorRow label="Symbol" htmlFor="inspector-currency-position">
      <NativeSelect
        id="inspector-currency-position"
        value={currencyPosition}
        onChange={event => {
          const next = CURRENCY_POSITIONS.find(
            option => option === event.target.value
          );

          if (next) setCurrencyPosition(next);
        }}
        className={cn(inspectorFieldClassName, "pr-7")}
      >
        {CURRENCY_POSITIONS.map(position => (
          <option key={position} value={position}>
            {`${position === "before" ? "Before" : "After"}: ${formatCurrency(1234.5, { ...money, position })}`}
          </option>
        ))}
      </NativeSelect>
    </InspectorRow>
  );
}

// What kind of document it is. Changing it swaps the title and the labels
// still on the old type's defaults; renamed ones stay as typed.
function DocumentTypeRow() {
  const { documentType, setDocumentType } = useDocumentTypeSlice();

  return (
    <InspectorRow label="Type" htmlFor="inspector-document-type">
      <NativeSelect
        id="inspector-document-type"
        value={documentType}
        onChange={event => {
          const next = DOCUMENT_TYPES.find(
            option => option === event.target.value
          );

          if (next) setDocumentType(next);
        }}
        className={cn(inspectorFieldClassName, "pr-7")}
      >
        {DOCUMENT_TYPES.map(option => (
          <option key={option} value={option}>
            {DOCUMENT_TYPE_NAMES[option]}
          </option>
        ))}
      </NativeSelect>
    </InspectorRow>
  );
}

const PAPER_SIZE_LABELS = {
  A4: "A4 · 210 × 297 mm",
  Letter: "Letter · 8.5 × 11 in"
};

// The page the PDF, the canvas and print are cut to.
function PaperSizeRow() {
  const { paperSize, setPaperSize } = usePaperSizeSlice();

  return (
    <InspectorRow label="Paper" htmlFor="inspector-paper-size">
      <NativeSelect
        id="inspector-paper-size"
        value={paperSize}
        onChange={event => {
          const next = INVOICE_PAPER_SIZES.find(
            option => option === event.target.value
          );

          if (next) setPaperSize(next);
        }}
        className={cn(inspectorFieldClassName, "pr-7")}
      >
        {INVOICE_PAPER_SIZES.map(option => (
          <option key={option} value={option}>
            {PAPER_SIZE_LABELS[option]}
          </option>
        ))}
      </NativeSelect>
    </InspectorRow>
  );
}

// The same calendar as the page's date fields, with the date written in the
// invoice's format. An optional date can be cleared from under the calendar.
function InspectorDatePicker({
  id,
  value,
  canClear = false,
  onChange
}: {
  id: string;
  value: string;
  canClear?: boolean;
  onChange: (isoDate: string) => void;
}) {
  const { dateFormat } = useDetailsSlice();
  const [open, setOpen] = useState(false);
  const selected = readInvoiceDate(value) ?? undefined;
  const text = value ? formatInvoiceDate(value, dateFormat) : "";
  const textId = useId();

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        id={id}
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
        {canClear && value && (
          <div className="px-3 pb-3">
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => {
                onChange("");
                setOpen(false);
              }}
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

// Payment terms are for a date to pay by, so a receipt (paid on its date) and
// a credit note (no due date) leave them out.
function DatesRows() {
  const { invoiceDate, dueDate, setInvoiceDate, setDueDate } =
    useDetailsSlice();
  const documentType = useDocumentType();
  const termsDays = getPaymentTermsDays(invoiceDate, dueDate);
  // Terms count from the issue date, so they wait until there is one.
  const hasIssueDate = readInvoiceDate(invoiceDate) !== null;

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
        <InspectorDatePicker
          id="inspector-issue-date"
          value={invoiceDate}
          onChange={handleInvoiceDateChange}
        />
      </InspectorRow>
      {DOCUMENT_TYPE_ROWS[documentType].paymentTerms && (
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
      )}
    </>
  );
}
