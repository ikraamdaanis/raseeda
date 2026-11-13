import { IconX } from "@tabler/icons-react";
import { kebabCase } from "lodash-es";
import type { CSSProperties, ReactNode } from "react";
import {
  AddPartSlot,
  useAddableParts
} from "~/components/editor/invoice-add-part";
import { InvoiceDateField } from "~/components/editor/invoice-date-field";
import { InvoiceInput } from "~/components/editor/invoice-input";
import { InvoiceTotalCurrency } from "~/components/editor/invoice-total-currency";
import { NumberField } from "~/components/editor/number-field";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger
} from "~/components/ui/tooltip";
import { formatCurrency } from "~/consts/currencies";
import { DOCUMENT_TYPE_DEFAULTS } from "~/consts/document-types";
import { useCurrencyConversion } from "~/hooks/use-currency-conversion";
import { useIsPreview, useShownSections } from "~/hooks/use-shown-sections";
import { cn } from "~/lib/utils";
import {
  useCurrencyConversionSlice,
  useDocumentType,
  useMoneyFormat,
  usePricingSlice,
  useSectionsSlice,
  useSummaryInputs,
  useTheme
} from "~/stores/invoice-selectors";
import type {
  InvoiceSectionKey,
  InvoiceSummaryRow,
  MoneyFormat
} from "~/types";
import { buildEditorSummaryRows } from "~/utils/build-invoice-view-model";
import { getTypeSettledSections } from "~/utils/document-type";
import { formatPlainNumber } from "~/utils/format-number";
import { getRoleSettings } from "~/utils/get-role-settings";
import { getTextStyles } from "~/utils/get-text-styles";

// Small editor-only toggles shown to the left of a pricing row (e.g. switch a
// discount between fixed and percentage, or mark tax exempt). Like the add /
// remove item buttons, they are editing affordances that never appear in the
// rendered PDF.
function PricingRowToggles({ children }: { children: ReactNode }) {
  const isPreview = useIsPreview();

  if (isPreview) return null;

  return (
    <span className="absolute top-1/2 right-full mr-1 flex -translate-y-1/2 items-center">
      {children}
    </span>
  );
}

// A toggle stays out of sight until the row is hovered or focused, unless
// it's showing a non-default choice (a % discount, exempt tax) or is always
// shown. A tooltip says what it does and what a click changes.
function PricingRowToggle({
  label,
  field,
  active,
  isAlwaysVisible = false,
  tooltip,
  onClick,
  children
}: {
  label: string;
  // The data-field path, for undo to find the toggle again.
  field?: string;
  active: boolean;
  isAlwaysVisible?: boolean;
  tooltip?: string;
  onClick: () => void;
  children: ReactNode;
}) {
  const button = (
    <button
      type="button"
      aria-label={label}
      aria-pressed={active}
      data-field={field}
      onClick={onClick}
      className={cn(
        "hover:bg-paper-muted focus-visible:ring-ring shrink-0 rounded px-1.5 py-0.5 text-xs whitespace-nowrap transition-[color,opacity] outline-none focus-visible:ring-1",
        active ? "text-paper-foreground" : "text-paper-muted-foreground",
        !active &&
          !isAlwaysVisible &&
          "opacity-0 group-focus-within/pricing-row:opacity-100 group-hover/pricing-row:opacity-100 pointer-coarse:opacity-100"
      )}
    >
      {children}
    </button>
  );

  if (!tooltip) return button;

  return (
    <Tooltip>
      <TooltipTrigger render={button} />
      <TooltipContent className="max-w-60">{tooltip}</TooltipContent>
    </Tooltip>
  );
}

// Hides a row's section, kept out of sight until the row is hovered or
// focused. A row the document's type settles (a receipt's amount paid) can't
// be hidden.
function HideRowButton({
  section,
  name
}: {
  section: InvoiceSectionKey;
  name: string;
}) {
  const { setSection } = useSectionsSlice();
  const documentType = useDocumentType();

  if (getTypeSettledSections(documentType).includes(section)) return null;

  return (
    <button
      type="button"
      aria-label={`Hide ${name.toLowerCase()}`}
      onClick={() => setSection(section, false)}
      className="text-paper-muted-foreground hover:text-paper-foreground hover:bg-paper-muted focus-visible:ring-ring flex size-5 shrink-0 items-center justify-center rounded opacity-0 transition-opacity outline-none group-focus-within/pricing-row:opacity-100 group-hover/pricing-row:opacity-100 focus-visible:ring-1 pointer-coarse:size-11 pointer-coarse:opacity-100"
    >
      <IconX aria-hidden="true" className="size-3.5" />
    </button>
  );
}

// A currency amount typed straight onto the page. At rest it reads like every
// other total ("$1,200.00"), or as `display` when the PDF prints something
// else there (a deduction as "-$50.00"); focused it shows the raw number being
// typed, so thousands separators and padded decimals never get in the way.
function MoneyInput({
  label,
  field,
  amount,
  display,
  money,
  style,
  onChange
}: {
  label: string;
  // The data-field path, for undo to find the field again.
  field: string;
  amount: number;
  display?: string;
  money: MoneyFormat;
  style: CSSProperties;
  onChange: (value: number) => void;
}) {
  return (
    <NumberField
      aria-label={label}
      data-field={field}
      value={amount}
      onChange={onChange}
      money={money}
      decimals={money.decimals}
      min={0}
      display={display ?? formatCurrency(amount, money)}
      showMarker
      className="field-sizing-content min-w-20 text-right"
      style={style}
      placeholder={money.marker}
    />
  );
}

// What each row is called, for its label's placeholder and aria-label.
const ROW_NAMES = {
  subtotal: "Subtotal",
  discounts: "Discounts",
  fees: "Fees",
  total: "Total",
  amountPaid: "Amount paid",
  balanceDue: "Balance due"
} as const;

// The inputs a row adds to its label and value, beyond the label itself:
// toggles to the label's left, inputs after it, and the value typed in.
const ROW_INPUTS: Partial<
  Record<
    keyof typeof ROW_NAMES,
    {
      Toggles?: () => ReactNode;
      LabelInputs?: () => ReactNode;
      Value?: (props: {
        row: InvoiceSummaryRow;
        style: CSSProperties;
      }) => ReactNode;
    }
  >
> = {
  discounts: {
    Toggles: DiscountTypeToggle,
    LabelInputs: DiscountPercentageInput,
    Value: DiscountValue
  },
  fees: { Value: FeesValue },
  total: { Value: TotalValue },
  amountPaid: {
    Toggles: PaidStampToggle,
    LabelInputs: PaidDateInput,
    Value: AmountPaidValue
  }
};

// The rows that are a section of their own, hidden with their own ×.
const ROW_SECTIONS: Partial<Record<keyof typeof ROW_NAMES, InvoiceSectionKey>> =
  {
    discounts: "discounts",
    fees: "fees",
    amountPaid: "amountPaid"
  };

// The totals rows: the PDF's summary rows, and while editing every row whose
// section is on, even at 0. Two columns, as in the PDF: the labels
// right-aligned, 3rem left of values as wide as the widest one, so the labels
// sit close to every figure.
export function InvoicePricing() {
  const invoice = useSummaryInputs();
  const sections = useShownSections();
  const conversion = useCurrencyConversion();
  const rows = buildEditorSummaryRows({ invoice, sections, conversion });
  const taxRows = rows.filter(row => row.id === "tax");

  return (
    <div
      data-field-area="pricing"
      className="grid grid-cols-[auto_auto] justify-end gap-x-12 gap-y-1 text-right"
    >
      {rows.map(row => {
        if (!row.isVisible) return null;

        // The tax rows render together, in the first one's place.
        if (row.id === "tax") {
          return row === taxRows.at(0) ? (
            <TaxRow key="tax" rows={taxRows} />
          ) : null;
        }

        return <SummaryRow key={row.id} id={row.id} row={row} />;
      })}
    </div>
  );
}

// The totals' switched-off rows, and the exchange rate line once there's a
// second currency, added back from under the totals.
export function InvoiceTotalsSlot() {
  const parts = useAddableParts("totals");
  const conversion = useCurrencyConversion();
  const { currencyConversion, setCurrencyConversion } =
    useCurrencyConversionSlice();
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
    <div className="mt-1 flex justify-end">
      <AddPartSlot
        areaName="totals"
        parts={[...parts, ...rateParts]}
        align="end"
      />
    </div>
  );
}

// A row's renameable label and its value as the PDF prints it, with the
// inputs the row adds. The emphasised row (the total, or the balance due
// once a payment counts) takes the grand total's style.
function SummaryRow({
  id,
  row
}: {
  id: keyof typeof ROW_NAMES;
  row: InvoiceSummaryRow;
}) {
  const { labels, setLabels } = usePricingSlice();
  const documentType = useDocumentType();
  const theme = useTheme();
  const labelSettings = getRoleSettings(
    theme,
    row.isTotal ? "grandTotalLabel" : "totalsLabel"
  );
  const valueSettings = getRoleSettings(
    theme,
    row.isTotal ? "grandTotalValue" : "totalsValue"
  );
  const valueStyle = getTextStyles({ settings: valueSettings });
  const { Toggles, LabelInputs, Value } = ROW_INPUTS[id] ?? {};
  const section = ROW_SECTIONS[id];
  const placeholder =
    id === "total"
      ? DOCUMENT_TYPE_DEFAULTS[documentType].labels.total
      : ROW_NAMES[id];

  return (
    <div className="group/pricing-row col-span-2 grid grid-cols-subgrid items-center text-sm">
      <div
        className="flex w-full min-w-0 items-center gap-1"
        style={{ justifyContent: labelSettings.align }}
      >
        <span className="relative flex min-w-0 items-center">
          {(Toggles || section) && (
            <PricingRowToggles>
              {section && (
                <HideRowButton section={section} name={ROW_NAMES[id]} />
              )}
              {Toggles && <Toggles />}
            </PricingRowToggles>
          )}
          <InvoiceInput
            aria-label={`${ROW_NAMES[id]} label`}
            data-field={`labels.${id}`}
            value={labels[id]}
            onChange={value => setLabels(prev => ({ ...prev, [id]: value }))}
            className="field-sizing-content w-auto min-w-0 pr-0.5"
            style={getTextStyles({
              settings: labelSettings,
              remove: ["align"]
            })}
            placeholder={placeholder}
          />
        </span>
        {LabelInputs && <LabelInputs />}
      </div>
      {Value ? (
        <span
          className="flex items-center"
          style={{ justifyContent: valueSettings.align }}
        >
          <Value row={row} style={valueStyle} />
        </span>
      ) : (
        <span
          data-testid={`${kebabCase(id)}-value`}
          className={cn(
            "text-right whitespace-nowrap",
            row.isTotal && "font-bold"
          )}
          style={valueStyle}
        >
          {row.value}
        </span>
      )}
    </div>
  );
}

// Whether a printed row reads as the tax row below does: the invoice's own
// rate, or its exempt note.
function isInvoiceTaxRow(
  row: InvoiceSummaryRow,
  tax: { percentage: number; exempt: boolean }
) {
  return tax.exempt
    ? row.percentage === undefined
    : row.percentage === tax.percentage;
}

// The tax row sets the invoice's rate. When the lines' own rates make the
// PDF print something else (a row per rate, or the one rate the lines all
// share), the printed rows show too, so the totals always add up. Preview
// shows only those; editing keeps the invoice's rate as the first row, which
// stays put whatever the rates do, so the control being used never swaps out
// mid-edit.
function TaxRow({ rows }: { rows: InvoiceSummaryRow[] }) {
  const { tax } = usePricingSlice();
  const isPreview = useIsPreview();
  const firstRow = rows.at(0);
  const readsAsPrinted =
    rows.length > 1 || !firstRow || !isInvoiceTaxRow(firstRow, tax);
  const amount = firstRow?.value ?? "";

  if (isPreview) {
    return readsAsPrinted ? (
      <PrintedTaxRows rows={rows} />
    ) : (
      <InvoiceTaxRow isDefault={false} amount={amount} />
    );
  }

  return (
    <>
      <InvoiceTaxRow isDefault={readsAsPrinted} amount={amount} />
      {readsAsPrinted && <PrintedTaxRows rows={rows} />}
    </>
  );
}

// An exempt row's value is the invoice's note, which editing can change
// there, as on the invoice's own row.
function PrintedTaxRows({ rows }: { rows: InvoiceSummaryRow[] }) {
  const { tax, setTax } = usePricingSlice();
  const money = useMoneyFormat();
  const isPreview = useIsPreview();
  const theme = useTheme();
  const labelStyle = getTextStyles({
    settings: getRoleSettings(theme, "totalsLabel")
  });
  const valueStyle = getTextStyles({
    settings: getRoleSettings(theme, "totalsValue")
  });

  return (
    <>
      {rows.map(row => (
        <div
          key={row.label}
          className="col-span-2 grid grid-cols-subgrid items-center text-sm"
        >
          <span
            className="border border-transparent whitespace-nowrap"
            style={labelStyle}
          >
            {row.percentage === undefined
              ? row.label
              : `${row.label} ${formatPlainNumber(row.percentage, money.numberFormat)}%`}
          </span>
          {row.note !== undefined && !isPreview ? (
            <InvoiceInput
              aria-label="Tax exempt note"
              data-field="tax.note"
              value={tax.note}
              onChange={value => setTax(prev => ({ ...prev, note: value }))}
              className="text-right"
              style={valueStyle}
              placeholder="e.g. Reverse charge"
            />
          ) : (
            <span
              data-testid="tax-amount"
              className="border border-transparent whitespace-nowrap"
              style={valueStyle}
            >
              {row.value}
            </span>
          )}
        </div>
      ))}
    </>
  );
}

// What the tax row's % / Exempt toggle does now, and what a click changes.
// With Per line on it only decides the lines that have no rate of their own.
function getExemptTooltip(tax: { exempt: boolean; perLine: boolean }) {
  if (tax.perLine) {
    return tax.exempt
      ? 'Lines without their own rate are exempt: no tax, with a note such as "Reverse charge". Click to tax them at a rate instead.'
      : 'Lines without their own rate are taxed at this rate. Click to make them exempt: no tax, with a note such as "Reverse charge".';
  }

  return tax.exempt
    ? 'The invoice is exempt: no tax, with a note such as "Reverse charge". Click to charge tax at a rate instead.'
    : 'Tax is charged at this rate. Click to make the invoice exempt: no tax, with a note such as "Reverse charge".';
}

// The invoice's own rate: its label, rate, Exempt and Per line toggles, and
// what it comes to (its printed row's value). While the lines' rates are
// printed in rows of their own below it, it's the default the lines without
// one follow, and says so.
function InvoiceTaxRow({
  isDefault,
  amount
}: {
  isDefault: boolean;
  amount: string;
}) {
  const { tax, setTax, labels, setLabels } = usePricingSlice();
  const money = useMoneyFormat();
  const isPreview = useIsPreview();
  const theme = useTheme();
  const labelSettings = getRoleSettings(theme, "totalsLabel");
  const valueSettings = getRoleSettings(theme, "totalsValue");

  return (
    <div className="group/pricing-row col-span-2 grid grid-cols-subgrid items-center text-sm">
      <div
        className="flex w-full items-center gap-2"
        style={{ justifyContent: labelSettings.align }}
      >
        <span className="relative flex items-center">
          <PricingRowToggles>
            <HideRowButton section="tax" name="Tax" />
            <PricingRowToggle
              label="Toggle tax per line"
              field="tax.perLine"
              active={tax.perLine}
              tooltip={
                tax.perLine
                  ? "Each line can have its own rate, in the Tax column. Click to tax the whole invoice at one rate."
                  : "The whole invoice is taxed at one rate. Click to give lines their own rates, in a Tax column."
              }
              onClick={() =>
                setTax(prev => ({ ...prev, perLine: !prev.perLine }))
              }
            >
              Per line
            </PricingRowToggle>
            <PricingRowToggle
              label="Toggle tax exempt"
              active={tax.exempt}
              isAlwaysVisible
              tooltip={getExemptTooltip(tax)}
              onClick={() =>
                setTax(prev => ({ ...prev, exempt: !prev.exempt }))
              }
            >
              {tax.exempt ? "Exempt" : "%"}
            </PricingRowToggle>
          </PricingRowToggles>
          <InvoiceInput
            aria-label="Tax label"
            data-field="labels.tax"
            value={labels.tax}
            onChange={value => setLabels(prev => ({ ...prev, tax: value }))}
            className="field-sizing-content w-auto min-w-fit pr-0.5"
            style={getTextStyles({
              settings: labelSettings,
              remove: ["align"]
            })}
            placeholder="Tax"
          />
        </span>
        {!tax.exempt && (
          <span className="flex items-center">
            <NumberField
              id="invoice-field-totals"
              aria-label="Tax percentage"
              data-field="tax.percentage"
              value={tax.percentage}
              onChange={percentage => setTax(prev => ({ ...prev, percentage }))}
              money={money}
              decimals={2}
              min={0}
              max={100}
              className="field-sizing-content w-auto min-w-[1ch] text-right"
              style={getTextStyles({
                settings: labelSettings,
                remove: ["align"]
              })}
            />
            <span style={getTextStyles({ settings: labelSettings })}>%</span>
          </span>
        )}
      </div>
      {isDefault ? (
        <span className="text-paper-muted-foreground border border-transparent text-xs whitespace-nowrap">
          {tax.exempt ? "Exempt by default" : "Default rate"}
        </span>
      ) : tax.exempt ? (
        <InvoiceInput
          aria-label="Tax exempt note"
          data-field="tax.note"
          value={isPreview ? tax.note.trim() || "Exempt" : tax.note}
          onChange={value => setTax(prev => ({ ...prev, note: value }))}
          className="text-right"
          style={getTextStyles({ settings: valueSettings })}
          placeholder="e.g. Reverse charge"
        />
      ) : (
        <span
          data-testid="tax-amount"
          className="whitespace-nowrap"
          style={getTextStyles({ settings: valueSettings })}
        >
          {amount}
        </span>
      )}
    </div>
  );
}

function DiscountTypeToggle() {
  const { discountType, setDiscountType } = usePricingSlice();
  const money = useMoneyFormat();
  const isPercentage = discountType === "percentage";

  return (
    <PricingRowToggle
      label="Toggle discount type"
      active={isPercentage}
      onClick={() => setDiscountType(isPercentage ? "fixed" : "percentage")}
    >
      {isPercentage ? "%" : money.marker}
    </PricingRowToggle>
  );
}

function DiscountPercentageInput() {
  const { discounts, discountType, setDiscounts } = usePricingSlice();
  const money = useMoneyFormat();
  const theme = useTheme();
  const labelSettings = getRoleSettings(theme, "totalsLabel");

  if (discountType !== "percentage") return null;

  return (
    <span className="flex items-center">
      <NumberField
        aria-label="Discount percentage"
        data-field="discounts"
        value={discounts}
        onChange={setDiscounts}
        money={money}
        decimals={2}
        min={0}
        max={100}
        className="field-sizing-content w-auto min-w-[1ch] text-right"
        style={getTextStyles({
          settings: labelSettings,
          remove: ["align"]
        })}
      />
      <span style={getTextStyles({ settings: labelSettings })}>%</span>
    </span>
  );
}

// A percentage discount's amount is worked out; a fixed one is typed in.
function DiscountValue({
  row,
  style
}: {
  row: InvoiceSummaryRow;
  style: CSSProperties;
}) {
  const { discounts, discountType, setDiscounts } = usePricingSlice();
  const money = useMoneyFormat();

  if (discountType === "percentage") {
    return (
      <span className="whitespace-nowrap" style={style}>
        {row.value}
      </span>
    );
  }

  return (
    <MoneyInput
      label="Discounts amount"
      field="discounts"
      amount={discounts}
      display={row.value}
      money={money}
      style={style}
      onChange={setDiscounts}
    />
  );
}

function FeesValue({
  row,
  style
}: {
  row: InvoiceSummaryRow;
  style: CSSProperties;
}) {
  const { fees, setFees } = usePricingSlice();
  const money = useMoneyFormat();

  return (
    <MoneyInput
      label="Fees amount"
      field="fees"
      amount={fees}
      display={row.value}
      money={money}
      style={style}
      onChange={setFees}
    />
  );
}

// The total opens the invoice's currencies while editing.
function TotalValue({
  row,
  style
}: {
  row: InvoiceSummaryRow;
  style: CSSProperties;
}) {
  return (
    <InvoiceTotalCurrency
      value={row.value}
      isEmphasised={row.isTotal}
      style={style}
    />
  );
}

// The PAID stamp's switch, beside the amount paid it depends on: the stamp
// prints by the title once the payment leaves nothing to pay. A document whose
// type never prints it (a proforma invoice) doesn't offer it.
function PaidStampToggle() {
  const { sections, setSection } = useSectionsSlice();
  const documentType = useDocumentType();

  if (getTypeSettledSections(documentType).includes("paidStamp")) return null;

  return (
    <PricingRowToggle
      label="Toggle paid stamp"
      field="sections.paidStamp"
      active={sections.paidStamp}
      tooltip={
        sections.paidStamp
          ? "A PAID stamp prints by the title once the amount paid covers the total. Click to leave it off."
          : "Click to print a PAID stamp by the title once the amount paid covers the total."
      }
      onClick={() => setSection("paidStamp", !sections.paidStamp)}
    >
      PAID
    </PricingRowToggle>
  );
}

// The payment's date sits in brackets after the label, as it prints:
// "Amount paid (1 Oct 2026)".
function PaidDateInput() {
  const { paidDate, setPaidDate } = usePricingSlice();
  const theme = useTheme();
  const isPreview = useIsPreview();
  const labelStyle = getTextStyles({
    settings: getRoleSettings(theme, "totalsLabel")
  });

  if (!paidDate && isPreview) return null;

  return (
    <span
      className="text-paper-foreground flex shrink-0 items-center whitespace-nowrap"
      style={labelStyle}
    >
      (
      <InvoiceDateField
        value={paidDate}
        label="Payment date"
        placeholder="date paid"
        style={labelStyle}
        canClear
        onSelect={setPaidDate}
      />
      )
    </span>
  );
}

// On a receipt with no amount typed it reads the total, as it prints.
function AmountPaidValue({
  row,
  style
}: {
  row: InvoiceSummaryRow;
  style: CSSProperties;
}) {
  const { amountPaid, setAmountPaid } = usePricingSlice();
  const money = useMoneyFormat();

  return (
    <MoneyInput
      label="Amount paid"
      field="amountPaid"
      amount={amountPaid}
      display={row.value}
      money={money}
      style={style}
      onChange={setAmountPaid}
    />
  );
}
