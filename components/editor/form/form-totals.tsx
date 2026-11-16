import { IconX } from "@tabler/icons-react";
import type { ReactNode } from "react";
import { useId } from "react";
import {
  FormAddParts,
  FormAmount,
  FormArea,
  FormField,
  FormInput,
  FormNumberInput,
  FormSelect,
  FormSwitch,
  formFieldClassName,
  formIconButtonClassName,
  formLabelClassName,
  readKeypadDecimal,
  useIsEditingLabels
} from "~/components/editor/form/form-controls";
import { useAddableParts } from "~/components/editor/invoice-add-part";
import { InvoiceDateField } from "~/components/editor/invoice-date-field";
import { useExchangeRateField } from "~/components/editor/invoice-exchange-rate";
import { isInvoiceTaxRow } from "~/components/editor/invoice-pricing";
import { CurrencyControls } from "~/components/editor/invoice-total-currency";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { DOCUMENT_TYPE_DEFAULTS } from "~/consts/document-types";
import { useCurrencyConversion } from "~/hooks/use-currency-conversion";
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

// What each row is called, for its label's placeholder.
const ROW_NAMES = {
  subtotal: "Subtotal",
  discounts: "Discounts",
  fees: "Fees",
  total: "Total",
  amountPaid: "Amount paid",
  balanceDue: "Balance due"
} as const;

// The totals as the page lists them, in print order: the typed figures inline,
// each with what it comes to, and the sums read-only, the total and balance
// due last. Then the invoice's currencies and the exchange rate, and the rows
// that are switched off.
export function FormTotals() {
  const invoice = useSummaryInputs();
  const sections = useShownSections();
  const conversion = useCurrencyConversion();
  const { currencyConversion, setCurrencyConversion } =
    useCurrencyConversionSlice();
  const addableParts = useAddableParts("totals");
  const rows = buildEditorSummaryRows({ invoice, sections, conversion });
  const taxRows = rows.filter(row => row.id === "tax");
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
    <FormArea area="pricing" title="Totals">
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
      <div className="border-border flex flex-col gap-4 border-t pt-5">
        <CurrencyControls
          classNames={{
            field: cn(formFieldClassName, "leading-11"),
            label: formLabelClassName,
            action:
              "text-muted-foreground flex h-11 items-center gap-2 self-start text-base [&_svg]:size-5"
          }}
        />
      </div>
      <ExchangeRate />
      <FormAddParts parts={[...addableParts, ...rateParts]} />
    </FormArea>
  );
}

// A totals row's renameable label, the figure it prints, and the inputs it
// adds.
function SummaryRow({
  id,
  row
}: {
  id: keyof typeof ROW_NAMES;
  row: InvoiceSummaryRow;
}) {
  const { labels, setLabels } = usePricingSlice();
  const documentType = useDocumentType();
  const name =
    id === "total"
      ? DOCUMENT_TYPE_DEFAULTS[documentType].labels.total
      : ROW_NAMES[id];
  const section = ROW_SECTIONS[id];
  const Inputs = ROW_INPUTS[id];

  return (
    <RowGroup
      name={name}
      label={labels[id]}
      field={`labels.${id}`}
      onRename={value => setLabels(prev => ({ ...prev, [id]: value }))}
      value={row.value}
      isTotal={row.isTotal}
      section={section}
    >
      {Inputs && <Inputs row={row} />}
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

const ROW_INPUTS: Partial<
  Record<
    keyof typeof ROW_NAMES,
    (props: { row: InvoiceSummaryRow }) => ReactNode
  >
> = {
  discounts: DiscountInputs,
  fees: FeesInput,
  amountPaid: AmountPaidInputs
};

// One row: its label (renamed while Edit labels is on), what it comes to, a
// Hide button where it's a part of its own, and its inputs under it.
function RowGroup({
  name,
  label,
  field,
  onRename,
  value,
  isTotal = false,
  section,
  children
}: {
  name: string;
  label: string;
  field: string;
  onRename: (value: string) => void;
  value: string;
  isTotal?: boolean;
  section?: InvoiceSectionKey;
  children?: ReactNode;
}) {
  const isEditingLabels = useIsEditingLabels();
  const { setSection } = useSectionsSlice();
  const documentType = useDocumentType();
  const canHide =
    section !== undefined &&
    !getTypeSettledSections(documentType).includes(section);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex min-h-11 items-center gap-3">
        {isEditingLabels ? (
          <Input
            aria-label={`${name} label`}
            data-field={field}
            value={label}
            placeholder={name}
            onChange={event => onRename(event.target.value)}
            className={cn(formFieldClassName, "min-w-0 flex-1")}
          />
        ) : (
          <span
            className={cn(
              "min-w-0 flex-1 truncate",
              isTotal ? "text-lg font-semibold" : "font-medium"
            )}
          >
            {label.trim() || name}
          </span>
        )}
        <FormAmount value={value} isTotal={isTotal} />
        {canHide && (
          <Button
            variant="ghost"
            aria-label={`Hide ${name.toLowerCase()}`}
            onClick={() => setSection(section, false)}
            className={cn(formIconButtonClassName, "-mr-2")}
          >
            <IconX aria-hidden="true" className="size-5" />
          </Button>
        )}
      </div>
      {children}
    </div>
  );
}

// A discount is a fixed amount or a percentage of the subtotal.
function DiscountInputs() {
  const { discounts, discountType, setDiscounts, setDiscountType } =
    usePricingSlice();
  const money = useMoneyFormat();
  const typeId = useId();
  const amountId = useId();
  const isPercentage = discountType === "percentage";

  return (
    <div className="grid grid-cols-2 gap-x-3 gap-y-4">
      <FormField id={typeId} title="Discount as">
        <FormSelect
          id={typeId}
          data-field="discountType"
          value={discountType}
          onChange={event =>
            setDiscountType(
              event.target.value === "percentage" ? "percentage" : "fixed"
            )
          }
        >
          <option value="fixed">{`Amount (${money.marker})`}</option>
          <option value="percentage">Percentage (%)</option>
        </FormSelect>
      </FormField>
      <FormField
        id={amountId}
        title={isPercentage ? "Percentage (%)" : `Amount (${money.marker})`}
      >
        <FormNumberInput
          id={amountId}
          data-field="discounts"
          value={discounts}
          onChange={setDiscounts}
          money={money}
          decimals={isPercentage ? 2 : money.decimals}
          min={0}
          max={isPercentage ? 100 : undefined}
        />
      </FormField>
    </div>
  );
}

function FeesInput() {
  const { fees, setFees } = usePricingSlice();
  const money = useMoneyFormat();
  const id = useId();

  return (
    <FormField id={id} title={`Fees (${money.marker})`}>
      <FormNumberInput
        id={id}
        data-field="fees"
        value={fees}
        onChange={setFees}
        money={money}
        decimals={money.decimals}
        min={0}
      />
    </FormField>
  );
}

// The payment, the date it was made, and the PAID stamp that prints by the
// title once it covers the total (never on a document whose type leaves it
// off).
function AmountPaidInputs() {
  const { amountPaid, setAmountPaid, paidDate, setPaidDate } =
    usePricingSlice();
  const { sections, setSection } = useSectionsSlice();
  const documentType = useDocumentType();
  const money = useMoneyFormat();
  const amountId = useId();
  const dateId = useId();
  const offersStamp =
    !getTypeSettledSections(documentType).includes("paidStamp");

  return (
    <>
      <div className="grid grid-cols-2 gap-x-3 gap-y-4">
        <FormField id={amountId} title={`Paid (${money.marker})`}>
          <FormNumberInput
            id={amountId}
            data-field="amountPaid"
            value={amountPaid}
            onChange={setAmountPaid}
            money={money}
            decimals={money.decimals}
            min={0}
          />
        </FormField>
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
      </div>
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

// The invoice's own tax rate, with Exempt and Per line, and what it comes to.
// When the lines' own rates make the PDF print other rows (a row per rate, or
// the one rate they all share), those show under it, read-only, so the totals
// always add up.
function TaxRows({ rows }: { rows: InvoiceSummaryRow[] }) {
  const { tax, setTax, labels, setLabels } = usePricingSlice();
  const money = useMoneyFormat();
  const rateId = useId();
  const noteId = useId();
  const firstRow = rows.at(0);
  const readsAsPrinted =
    rows.length > 1 || !firstRow || !isInvoiceTaxRow(firstRow, tax);

  return (
    <RowGroup
      name="Tax"
      label={labels.tax}
      field="labels.tax"
      onRename={value => setLabels(prev => ({ ...prev, tax: value }))}
      value={readsAsPrinted || tax.exempt ? "" : firstRow.value}
      section="tax"
    >
      {tax.exempt ? (
        <FormField id={noteId} title="Exempt note">
          <FormInput
            id={noteId}
            data-field="tax.note"
            value={tax.note}
            onChange={value => setTax(prev => ({ ...prev, note: value }))}
            placeholder="e.g. Reverse charge"
          />
        </FormField>
      ) : (
        <FormField
          id={rateId}
          title={readsAsPrinted ? "Default rate (%)" : "Rate (%)"}
        >
          <FormNumberInput
            id={rateId}
            data-field="tax.percentage"
            value={tax.percentage}
            onChange={percentage => setTax(prev => ({ ...prev, percentage }))}
            money={money}
            decimals={2}
            min={0}
            max={100}
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
          <div key={row.label} className="flex min-h-11 items-center gap-3">
            <span className="text-muted-foreground min-w-0 flex-1 truncate">
              {row.percentage === undefined
                ? row.label
                : `${row.label} ${formatPlainNumber(row.percentage, money.numberFormat)}%`}
            </span>
            {row.note === undefined ? (
              <FormAmount value={row.value} />
            ) : (
              <span className="text-muted-foreground">
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
