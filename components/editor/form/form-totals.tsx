import { IconX } from "@tabler/icons-react";
import type { ReactNode } from "react";
import { useId } from "react";
import { flushSync } from "react-dom";
import {
  FormAddParts,
  FormAmount,
  FormArea,
  FormField,
  FormFieldTitle,
  FormInput,
  FormNumberInput,
  FormSwitch,
  formFieldClassName,
  formIconButtonClassName,
  formLabelClassName,
  readKeypadDecimal
} from "~/components/editor/form/form-controls";
import { useAddableParts } from "~/components/editor/invoice-add-part";
import { InvoiceDateField } from "~/components/editor/invoice-date-field";
import { useExchangeRateField } from "~/components/editor/invoice-exchange-rate";
import { isInvoiceTaxRow } from "~/components/editor/invoice-pricing";
import {
  CurrencyControls,
  SECOND_CURRENCY_ID
} from "~/components/editor/invoice-total-currency";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { ToggleGroup, ToggleGroupItem } from "~/components/ui/toggle-group";
import { formatCurrency } from "~/consts/currencies";
import { DOCUMENT_TYPE_DEFAULTS } from "~/consts/document-types";
import { useCurrencyConversion } from "~/hooks/use-currency-conversion";
import { useSecondCurrency } from "~/hooks/use-second-currency";
import { useShownSections } from "~/hooks/use-shown-sections";
import { cn } from "~/lib/utils";
import {
  useCurrencyConversionSlice,
  useDocumentType,
  useMoneyFormat,
  usePricingSlice,
  useSectionsSlice,
  useSummaryInputs
} from "~/stores/invoice-selectors";
import type { InvoiceSectionKey, InvoiceSummaryRow } from "~/types";
import { buildEditorSummaryRows } from "~/utils/build-invoice-view-model";
import { getTypeSettledSections } from "~/utils/document-type";
import { formatPlainNumber } from "~/utils/format-number";

const dateTriggerClassName = cn(
  formFieldClassName,
  "border-input dark:bg-input/30 focus-visible:border-ring aria-expanded:border-ring rounded-surface w-full border px-2.5 text-left outline-none"
);

// What each row is called before it's renamed.
const ROW_NAMES = {
  subtotal: "Subtotal",
  discounts: "Discounts",
  fees: "Fees",
  total: "Total",
  amountPaid: "Amount paid",
  balanceDue: "Balance due"
} as const;

// What a row is called before it's renamed: the total is named by the
// document's type (Total, Amount due, Total refund).
function useRowName() {
  const documentType = useDocumentType();

  return (id: InvoiceSummaryRow["id"]) => {
    if (id === "tax") return "Tax";
    if (id === "total")
      return DOCUMENT_TYPE_DEFAULTS[documentType].labels.total;

    return ROW_NAMES[id];
  };
}

// The totals as the page lists them, in print order: the typed figures inline,
// each with what it comes to, and the sums read-only, the total and balance
// due last. Then the second currency and the exchange rate, once added, and
// the rows that are switched off, the second currency among them. The invoice's own currency is with the details, before
// any price is typed.
export function FormTotals() {
  const invoice = useSummaryInputs();
  const sections = useShownSections();
  const conversion = useCurrencyConversion();
  const { currencyConversion, setCurrencyConversion } =
    useCurrencyConversionSlice();
  const addableParts = useAddableParts("totals");
  const secondCurrency = useSecondCurrency();
  const { labels, setLabels } = usePricingSlice();
  const rowName = useRowName();
  const rows = buildEditorSummaryRows({ invoice, sections, conversion });
  const taxRows = rows.filter(row => row.id === "tax");
  // The rows that print, the tax rows once: they share one label.
  const printedRows = rows.filter(
    row => row.isVisible && (row.id !== "tax" || row === taxRows.at(0))
  );
  const currencyParts = secondCurrency.isOn
    ? []
    : [
        {
          id: "secondCurrency",
          label: "Second currency",
          onAdd: () => {
            flushSync(secondCurrency.add);
            document.getElementById(SECOND_CURRENCY_ID)?.focus();
          }
        }
      ];
  const rateParts =
    conversion && !currencyConversion.showRate
      ? [
          {
            id: "exchangeRate",
            label: "Exchange rate",
            onAdd: () =>
              setCurrencyConversion(prev => ({ ...prev, showRate: true }))
          }
        ]
      : [];

  return (
    <FormArea
      area="pricing"
      title="Totals"
      labels={printedRows.map(row => ({
        name: rowName(row.id),
        value: labels[row.id],
        field: `labels.${row.id}`,
        onChange: value => setLabels(prev => ({ ...prev, [row.id]: value }))
      }))}
    >
      <div className="flex flex-col gap-6">
        {rows.map(row => {
          if (!row.isVisible) return null;

          if (row.id === "tax") {
            return row === taxRows.at(0) ? (
              <TaxRows key="tax" rows={taxRows} />
            ) : null;
          }

          return <SummaryRow key={row.id} id={row.id} row={row} />;
        })}
      </div>
      {secondCurrency.isOn && (
        <div className="border-border flex flex-col gap-4 border-t pt-5">
          <CurrencyControls
            part="second"
            classNames={{
              field: cn(formFieldClassName, "leading-11"),
              label: formLabelClassName,
              action:
                "text-muted-foreground flex h-11 items-center gap-2 self-start text-base [&_svg]:size-5"
            }}
          />
        </div>
      )}
      <ExchangeRate />
      <FormAddParts parts={[...addableParts, ...currencyParts, ...rateParts]} />
    </FormArea>
  );
}

// A totals row: the typed rows (discounts, fees, amount paid) hold their own
// box where the figure would be, so what's typed shows once; the sums are
// read-only.
function SummaryRow({
  id,
  row
}: {
  id: keyof typeof ROW_NAMES;
  row: InvoiceSummaryRow;
}) {
  const { labels } = usePricingSlice();
  const name = useRowName()(id);
  const parts = ROW_PARTS[id];

  return (
    <RowGroup
      name={name}
      label={labels[id]}
      field={`labels.${id}`}
      value={row.value}
      control={parts && <parts.Control row={row} name={name} />}
      isTotal={row.isTotal}
      section={ROW_SECTIONS[id]}
    >
      {parts?.Below && <parts.Below row={row} />}
    </RowGroup>
  );
}

// The rows that are a section of their own, hidden with their own ×.
const ROW_SECTIONS: Partial<Record<keyof typeof ROW_NAMES, InvoiceSectionKey>> =
  {
    discounts: "discounts",
    fees: "fees",
    amountPaid: "amountPaid"
  };

// Every row lays out on the same three columns (its label, its figure or box,
// and room for a Hide button), so the figures line up down one right edge as
// the printed totals do.
const ROW_GRID_CLASS_NAME =
  "grid grid-cols-[minmax(0,1fr)_auto_2.25rem] items-center gap-x-3";

// A read-only figure's digits end where a box's do, inside its padding.
const ROW_FIGURE_CLASS_NAME = "col-start-2 pr-2.5";

/**
 * One row: its label as it prints, its figure (or the box it's typed in), a
 * Hide button where it's a part of its own, and anything it adds under it.
 * The total sits under a rule, as it prints.
 */
function RowGroup({
  name,
  label,
  field,
  value,
  control,
  isTotal = false,
  section,
  children
}: {
  name: string;
  label: string;
  field: string;
  value: string;
  control?: ReactNode;
  isTotal?: boolean;
  section?: InvoiceSectionKey;
  children?: ReactNode;
}) {
  const { setSection } = useSectionsSlice();
  const documentType = useDocumentType();
  const canHide =
    section !== undefined &&
    !getTypeSettledSections(documentType).includes(section);

  return (
    <div
      className={cn(
        "flex flex-col gap-3",
        isTotal && "border-border border-t pt-5"
      )}
    >
      <div className={cn(ROW_GRID_CLASS_NAME, "min-h-11")}>
        <div className="flex min-w-0">
          <FormFieldTitle
            field={field}
            className={isTotal ? "text-lg font-semibold" : "font-medium"}
          >
            {label.trim() || name}
          </FormFieldTitle>
        </div>
        {control ?? (
          <FormAmount
            value={value}
            isTotal={isTotal}
            className={ROW_FIGURE_CLASS_NAME}
          />
        )}
        {canHide && (
          <Button
            variant="ghost"
            aria-label={`Hide ${name.toLowerCase()}`}
            onClick={() => setSection(section, false)}
            className={cn(formIconButtonClassName, "-mr-2 justify-self-end")}
          >
            <IconX aria-hidden="true" className="size-5" />
          </Button>
        )}
      </div>
      {children}
    </div>
  );
}

/**
 * A row's own box, where its figure would be. An amount reads with its
 * currency at rest; a rate carries its % inside the box. Tapping a
 * right-aligned figure would put the caret before it, so it's selected and
 * typing replaces it.
 */
function RowNumberBox({
  suffix,
  ...props
}: Parameters<typeof FormNumberInput>[0] & { suffix?: string }) {
  return (
    <div
      className="relative col-start-2 w-32"
      onFocus={event => {
        const input = event.target;

        if (input instanceof HTMLInputElement) {
          requestAnimationFrame(() => input.select());
        }
      }}
    >
      <FormNumberInput
        {...props}
        className={cn("text-right", suffix && "pr-8")}
      />
      {suffix && (
        <span
          aria-hidden="true"
          className="text-muted-foreground pointer-events-none absolute inset-y-0 right-3 flex items-center text-base"
        >
          {suffix}
        </span>
      )}
    </div>
  );
}

/**
 * A quiet line under a row's box, in its figure's column: what a rate comes
 * to, or an amount in the second currency. `value` is a row's figure, the
 * second currency's after " / ".
 */
function RowNote({
  value,
  prefix,
  start
}: {
  value: string;
  prefix?: string;
  start?: ReactNode;
}) {
  const [amount, converted] = value.split(" / ");
  const lines = [
    ...(prefix ? [`${prefix} ${amount}`] : []),
    ...(converted ? [converted] : [])
  ];

  if (lines.length === 0 && !start) return null;

  return (
    <div className={cn(ROW_GRID_CLASS_NAME, "-mt-1")}>
      {start}
      <span className="text-muted-foreground col-start-2 flex flex-col items-end pr-2.5 text-base tabular-nums">
        {lines.map(line => (
          <span key={line} className="whitespace-nowrap">
            {line}
          </span>
        ))}
      </span>
    </div>
  );
}

function FeesControl({ name }: { row: InvoiceSummaryRow; name: string }) {
  const { fees, setFees } = usePricingSlice();
  const money = useMoneyFormat();

  return (
    <RowNumberBox
      aria-label={name}
      data-field="fees"
      value={fees}
      onChange={setFees}
      money={money}
      decimals={money.decimals}
      min={0}
      display={formatCurrency(fees, money)}
      showMarker
    />
  );
}

function FeesBelow({ row }: { row: InvoiceSummaryRow }) {
  return <RowNote value={row.value} />;
}

function PaidControl({ name }: { row: InvoiceSummaryRow; name: string }) {
  const { amountPaid, setAmountPaid } = usePricingSlice();
  const money = useMoneyFormat();

  return (
    <RowNumberBox
      aria-label={name}
      data-field="amountPaid"
      value={amountPaid}
      onChange={setAmountPaid}
      money={money}
      decimals={money.decimals}
      min={0}
      display={formatCurrency(amountPaid, money)}
      showMarker
    />
  );
}

// The date it was paid and the PAID stamp, which prints by the title once the
// payment covers the total (never on a document whose type leaves it off).
function PaidBelow({ row }: { row: InvoiceSummaryRow }) {
  const { paidDate, setPaidDate } = usePricingSlice();
  const { sections, setSection } = useSectionsSlice();
  const documentType = useDocumentType();
  const dateId = useId();
  const offersStamp =
    !getTypeSettledSections(documentType).includes("paidStamp");

  return (
    <>
      <RowNote value={row.value} />
      <FormField id={dateId} title="Date paid">
        <InvoiceDateField
          value={paidDate}
          label="Payment date"
          placeholder="Pick a date"
          canClear
          triggerClassName={dateTriggerClassName}
          onSelect={setPaidDate}
        />
      </FormField>
      {offersStamp && (
        <FormSwitch
          label="PAID stamp"
          description="Prints by the title once the total is paid."
          field="sections.paidStamp"
          checked={sections.paidStamp}
          onCheckedChange={checked => setSection("paidStamp", checked)}
        />
      )}
    </>
  );
}

// A discount is a fixed amount or a percentage of the subtotal.
function DiscountControl({ name }: { row: InvoiceSummaryRow; name: string }) {
  const { discounts, discountType, setDiscounts } = usePricingSlice();
  const money = useMoneyFormat();
  const isPercentage = discountType === "percentage";

  return (
    <RowNumberBox
      aria-label={isPercentage ? `${name} (%)` : name}
      data-field="discounts"
      value={discounts}
      onChange={setDiscounts}
      money={money}
      decimals={isPercentage ? 2 : money.decimals}
      min={0}
      max={isPercentage ? 100 : undefined}
      display={isPercentage ? undefined : formatCurrency(discounts, money)}
      showMarker={!isPercentage}
      suffix={isPercentage ? "%" : undefined}
    />
  );
}

// Whether the discount is an amount or a percentage, switched under its
// label, with what a percentage comes to under its box.
function DiscountBelow({ row }: { row: InvoiceSummaryRow }) {
  const { discountType, setDiscountType } = usePricingSlice();
  const money = useMoneyFormat();
  const isPercentage = discountType === "percentage";

  return (
    <RowNote
      value={row.value}
      prefix={isPercentage ? "comes to" : undefined}
      start={
        <ToggleGroup
          aria-label="Discount as"
          data-field="discountType"
          value={[discountType]}
          onValueChange={next => {
            const type = next.at(0);

            if (type === "fixed" || type === "percentage") {
              setDiscountType(type);
            }
          }}
          variant="outline"
          spacing={0}
          className="self-start"
        >
          <ToggleGroupItem
            value="fixed"
            aria-label="Amount"
            className="h-11 min-w-11 text-base"
          >
            {money.marker}
          </ToggleGroupItem>
          <ToggleGroupItem
            value="percentage"
            aria-label="Percentage"
            className="h-11 min-w-11 text-base"
          >
            %
          </ToggleGroupItem>
        </ToggleGroup>
      }
    />
  );
}

const ROW_PARTS: Partial<
  Record<
    keyof typeof ROW_NAMES,
    {
      Control: (props: { row: InvoiceSummaryRow; name: string }) => ReactNode;
      Below?: (props: { row: InvoiceSummaryRow }) => ReactNode;
    }
  >
> = {
  discounts: { Control: DiscountControl, Below: DiscountBelow },
  fees: { Control: FeesControl, Below: FeesBelow },
  amountPaid: { Control: PaidControl, Below: PaidBelow }
};

/**
 * The invoice's own tax rate, typed in the row's box, with what it comes to
 * under it, then Exempt and Per line. When the lines' own rates make the PDF
 * print other rows (a row per rate, or the one rate they all share), those
 * show under it, read-only, so the totals always add up, and the box is the
 * default rate.
 */
function TaxRows({ rows }: { rows: InvoiceSummaryRow[] }) {
  const { tax, setTax, labels } = usePricingSlice();
  const money = useMoneyFormat();
  const noteId = useId();
  const firstRow = rows.at(0);
  const readsAsPrinted =
    rows.length > 1 || !firstRow || !isInvoiceTaxRow(firstRow, tax);

  return (
    <RowGroup
      name="Tax"
      label={labels.tax}
      field="labels.tax"
      value=""
      control={
        tax.exempt ? (
          <span className="text-muted-foreground col-start-2 pr-2.5 text-base">
            Exempt
          </span>
        ) : (
          <RowNumberBox
            aria-label={readsAsPrinted ? "Default tax rate" : "Tax rate"}
            data-field="tax.percentage"
            value={tax.percentage}
            onChange={percentage => setTax(prev => ({ ...prev, percentage }))}
            money={money}
            decimals={2}
            min={0}
            max={100}
            suffix="%"
          />
        )
      }
      section="tax"
    >
      {!tax.exempt && !readsAsPrinted && (
        <RowNote value={firstRow.value} prefix="comes to" />
      )}
      {tax.exempt && (
        <FormField id={noteId} title="Exempt note">
          <FormInput
            id={noteId}
            data-field="tax.note"
            value={tax.note}
            onChange={value => setTax(prev => ({ ...prev, note: value }))}
            placeholder="e.g. Reverse charge"
          />
        </FormField>
      )}
      <FormSwitch
        label="Exempt"
        description={
          tax.perLine
            ? "Lines without their own rate charge no tax."
            : "No tax is charged, with a note such as Reverse charge."
        }
        checked={tax.exempt}
        onCheckedChange={exempt => setTax(prev => ({ ...prev, exempt }))}
      />
      <FormSwitch
        label="Rate per line"
        description="Each line can have its own rate."
        field="tax.perLine"
        checked={tax.perLine}
        onCheckedChange={perLine => setTax(prev => ({ ...prev, perLine }))}
      />
      {readsAsPrinted &&
        rows.map(row => (
          <div key={row.label} className={cn(ROW_GRID_CLASS_NAME, "min-h-11")}>
            <span className="text-muted-foreground min-w-0 truncate">
              {row.percentage === undefined
                ? row.label
                : `${row.label} ${formatPlainNumber(row.percentage, money.numberFormat)}%`}
            </span>
            {row.note === undefined ? (
              <FormAmount value={row.value} className={ROW_FIGURE_CLASS_NAME} />
            ) : (
              <span className="text-muted-foreground col-start-2 pr-2.5 text-right">
                {row.note.trim() || "Exempt"}
              </span>
            )}
          </div>
        ))}
    </RowGroup>
  );
}

// The rate every amount is converted at, once there's a second currency: the
// rate, whose it is and from when, as the line under the totals prints them.
function ExchangeRate() {
  const conversion = useCurrencyConversion();
  const { currencyConversion, numberFormat, setCurrencyConversion } =
    useCurrencyConversionSlice();
  const rateInput = useExchangeRateField();
  const rateId = useId();
  const sourceId = useId();
  const dateId = useId();

  if (!conversion || !currencyConversion.showRate) return null;

  const missing =
    currencyConversion.rate > 0
      ? [
          !currencyConversion.source.trim() && "source",
          !currencyConversion.date && "date"
        ].filter(Boolean)
      : [];

  return (
    <section
      aria-labelledby={`${rateId}-heading`}
      className="border-border flex flex-col gap-4 border-t pt-5"
    >
      <div className="flex min-h-9 items-center gap-3">
        <h3 id={`${rateId}-heading`} className="flex-1 font-semibold">
          Exchange rate
        </h3>
        <Button
          variant="ghost"
          aria-label="Hide exchange rate"
          onClick={() =>
            setCurrencyConversion(prev => ({ ...prev, showRate: false }))
          }
          className={cn(formIconButtonClassName, "-mr-2")}
        >
          <IconX aria-hidden="true" className="size-5" />
        </Button>
      </div>
      <FormField
        id={rateId}
        title={`${conversion.toCode} per 1 ${conversion.fromCode}`}
      >
        <Input
          id={rateId}
          type="text"
          inputMode="decimal"
          enterKeyHint="next"
          autoComplete="off"
          data-field="currencyConversion.rate"
          value={rateInput.value}
          placeholder={rateInput.placeholder}
          onFocus={rateInput.onFocus}
          onBlur={rateInput.onBlur}
          onChange={event =>
            rateInput.onChange(
              readKeypadDecimal(event.target.value, numberFormat)
            )
          }
          className={cn(formFieldClassName, "tabular-nums")}
        />
      </FormField>
      <div className="grid grid-cols-2 gap-x-3 gap-y-4">
        <FormField id={sourceId} title="Source">
          <FormInput
            id={sourceId}
            data-field="currencyConversion.source"
            value={currencyConversion.source}
            onChange={value =>
              setCurrencyConversion(prev => ({ ...prev, source: value }))
            }
            placeholder="e.g. Central bank"
          />
        </FormField>
        <FormField id={dateId} title="Date">
          <InvoiceDateField
            value={currencyConversion.date}
            label="Exchange rate date"
            placeholder="Pick a date"
            canClear
            triggerClassName={dateTriggerClassName}
            onSelect={date =>
              setCurrencyConversion(prev => ({ ...prev, date }))
            }
          />
        </FormField>
      </div>
      {missing.length > 0 && (
        <p className="text-base/6 text-pretty text-amber-700 dark:text-amber-500">
          {`Add the rate’s ${missing.join(" and ")}: tax invoices that show a converted amount usually have to say whose rate it is and from when.`}
        </p>
      )}
    </section>
  );
}
