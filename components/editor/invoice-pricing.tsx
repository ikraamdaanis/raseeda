import type { CSSProperties, ReactNode } from "react";
import { InvoiceDateField } from "~/components/editor/invoice-date-field";
import { InvoiceInput } from "~/components/editor/invoice-input";
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
  useConvertedTotals,
  useDocumentType,
  useInvoiceTotals,
  useMoneyFormat,
  usePricingSlice,
  useTaxGroups,
  useTheme
} from "~/stores/invoice-selectors";
import type { InvoiceSummaryRow, MoneyFormat } from "~/types";
import { buildTaxRows } from "~/utils/build-invoice-view-model";
import {
  formatDeduction,
  formatInvoiceTotal,
  withConvertedAmount
} from "~/utils/currency-conversion";
import { formatPlainNumber, roundToDecimals } from "~/utils/format-number";
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

/**
 * Displays the pricing information for the invoice.
 */
// Two columns, as in the PDF: the labels right-aligned, 3rem left of values
// as wide as the widest one, so the labels sit close to every figure.
export function InvoicePricing() {
  const sections = useShownSections();

  return (
    <div
      data-field-area="pricing"
      className="grid grid-cols-[auto_auto] justify-end gap-x-12 gap-y-1 text-right"
    >
      <SubtotalRow />
      {sections.discounts && <DiscountsRow />}
      {sections.tax && <TaxRow />}
      {sections.fees && <FeesRow />}
      <TotalRow />
      {sections.amountPaid && <AmountPaidRow />}
      {sections.amountPaid && <BalanceDueRow />}
    </div>
  );
}

function SubtotalRow() {
  const { labels, setLabels } = usePricingSlice();
  const money = useMoneyFormat();
  const { subtotal } = useInvoiceTotals();
  const converted = useConvertedTotals();
  const conversion = useCurrencyConversion();
  const theme = useTheme();
  const labelSettings = getRoleSettings(theme, "totalsLabel");
  const valueSettings = getRoleSettings(theme, "totalsValue");

  return (
    <div className="col-span-2 grid grid-cols-subgrid items-center text-sm">
      <InvoiceInput
        aria-label="Subtotal label"
        data-field="labels.subtotal"
        value={labels.subtotal}
        onChange={value => setLabels(prev => ({ ...prev, subtotal: value }))}
        className="field-sizing-content w-full"
        style={getTextStyles({ settings: labelSettings })}
        placeholder="Subtotal"
      />
      <span
        data-testid="subtotal-value"
        className="text-paper-foreground text-right whitespace-nowrap"
        style={getTextStyles({ settings: valueSettings })}
      >
        {withConvertedAmount({
          value: formatCurrency(subtotal, money),
          amount: subtotal,
          conversion,
          money,
          convertedAmount: converted.subtotal
        })}
      </span>
    </div>
  );
}

// The tax rows the PDF prints: one per rate when the lines' rates differ.
function usePrintedTaxRows(): InvoiceSummaryRow[] {
  const { tax, labels } = usePricingSlice();
  const money = useMoneyFormat();
  const { taxGroups, taxAmount } = useTaxGroups();
  const conversion = useCurrencyConversion();

  return buildTaxRows({
    label: labels.tax,
    tax,
    taxGroups,
    taxAmount,
    money,
    conversion,
    isVisible: true
  });
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
function TaxRow() {
  const { tax } = usePricingSlice();
  const isPreview = useIsPreview();
  const printedRows = usePrintedTaxRows();
  const readsAsPrinted =
    printedRows.length > 1 || !isInvoiceTaxRow(printedRows[0], tax);

  if (isPreview) {
    return readsAsPrinted ? (
      <PrintedTaxRows rows={printedRows} />
    ) : (
      <InvoiceTaxRow isDefault={false} />
    );
  }

  return (
    <>
      <InvoiceTaxRow isDefault={readsAsPrinted} />
      {readsAsPrinted && <PrintedTaxRows rows={printedRows} />}
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
// what it comes to. While the lines' rates are printed in rows of their own
// below it, it's the default the lines without one follow, and says so.
function InvoiceTaxRow({ isDefault }: { isDefault: boolean }) {
  const { tax, setTax, labels, setLabels } = usePricingSlice();
  const money = useMoneyFormat();
  const { taxAmount } = useInvoiceTotals();
  const conversion = useCurrencyConversion();
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
          {withConvertedAmount({
            value: formatCurrency(taxAmount, money),
            amount: taxAmount,
            conversion,
            money
          })}
        </span>
      )}
    </div>
  );
}

function FeesRow() {
  const { fees, setFees, labels, setLabels } = usePricingSlice();
  const money = useMoneyFormat();
  const theme = useTheme();
  const labelSettings = getRoleSettings(theme, "totalsLabel");
  const valueSettings = getRoleSettings(theme, "totalsValue");
  const conversion = useCurrencyConversion();

  return (
    <div className="col-span-2 grid grid-cols-subgrid items-center text-sm">
      <InvoiceInput
        aria-label="Fees label"
        data-field="labels.fees"
        value={labels.fees}
        onChange={value => setLabels(prev => ({ ...prev, fees: value }))}
        className="field-sizing-content w-full"
        style={getTextStyles({ settings: labelSettings })}
        placeholder="Fees"
      />
      <span
        className="flex items-center"
        style={{ justifyContent: valueSettings.align }}
      >
        <MoneyInput
          label="Fees amount"
          field="fees"
          amount={fees}
          display={withConvertedAmount({
            value: formatCurrency(fees, money),
            // As the total counts it, whole on a yen invoice, so the second
            // currency's column adds up.
            amount: roundToDecimals(fees, money.decimals),
            conversion,
            money
          })}
          money={money}
          style={getTextStyles({ settings: valueSettings })}
          onChange={setFees}
        />
      </span>
    </div>
  );
}

function DiscountsRow() {
  const {
    discounts,
    discountType,
    setDiscounts,
    setDiscountType,
    labels,
    setLabels
  } = usePricingSlice();
  const money = useMoneyFormat();
  const { discountAmount } = useInvoiceTotals();
  const theme = useTheme();
  const labelSettings = getRoleSettings(theme, "totalsLabel");
  const valueSettings = getRoleSettings(theme, "totalsValue");
  const conversion = useCurrencyConversion();
  const isPercentage = discountType === "percentage";

  return (
    <div className="group/pricing-row col-span-2 grid grid-cols-subgrid items-center text-sm">
      <div
        className="flex w-full items-center gap-2"
        style={{ justifyContent: labelSettings.align }}
      >
        <span className="relative flex items-center">
          <PricingRowToggles>
            <PricingRowToggle
              label="Toggle discount type"
              active={isPercentage}
              onClick={() =>
                setDiscountType(isPercentage ? "fixed" : "percentage")
              }
            >
              {isPercentage ? "%" : money.marker}
            </PricingRowToggle>
          </PricingRowToggles>
          <InvoiceInput
            aria-label="Discounts label"
            data-field="labels.discounts"
            value={labels.discounts}
            onChange={value =>
              setLabels(prev => ({ ...prev, discounts: value }))
            }
            className="field-sizing-content w-auto min-w-fit pr-0.5"
            style={getTextStyles({
              settings: labelSettings,
              remove: ["align"]
            })}
            placeholder="Discounts"
          />
        </span>
        {isPercentage && (
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
        )}
      </div>
      {isPercentage ? (
        <span
          className="whitespace-nowrap"
          style={getTextStyles({ settings: valueSettings })}
        >
          {formatDeduction({ amount: discountAmount, money, conversion })}
        </span>
      ) : (
        <span
          className="flex items-center"
          style={{ justifyContent: valueSettings.align }}
        >
          <MoneyInput
            label="Discounts amount"
            field="discounts"
            amount={discounts}
            display={
              discountAmount > 0
                ? formatDeduction({
                    amount: discountAmount,
                    money,
                    conversion
                  })
                : withConvertedAmount({
                    value: formatCurrency(discounts, money),
                    amount: discounts,
                    conversion,
                    money
                  })
            }
            money={money}
            style={getTextStyles({ settings: valueSettings })}
            onChange={setDiscounts}
          />
        </span>
      )}
    </div>
  );
}

// The grand total suppresses its emphasis when a payment has been recorded, so
// the balance-due row below reads as the figure to pay instead. A payment only
// counts while its row is switched on, as in the PDF (a receipt's always is,
// paid in full until an amount is typed; a quote's never is).
function TotalRow() {
  const { currencyCode, labels, setLabels } = usePricingSlice();
  const documentType = useDocumentType();
  const money = useMoneyFormat();
  const { total, amountPaid } = useInvoiceTotals();
  const converted = useConvertedTotals();
  const conversion = useCurrencyConversion();
  const theme = useTheme();
  const sections = useShownSections();
  const hasPayment = sections.amountPaid && amountPaid > 0;
  const role = hasPayment ? "totalsLabel" : "grandTotalLabel";
  const labelSettings = getRoleSettings(theme, role);
  const valueSettings = getRoleSettings(
    theme,
    hasPayment ? "totalsValue" : "grandTotalValue"
  );

  return (
    <div className="col-span-2 grid grid-cols-subgrid items-center text-sm">
      <InvoiceInput
        aria-label="Total label"
        data-field="labels.total"
        value={labels.total}
        onChange={value => setLabels(prev => ({ ...prev, total: value }))}
        className="field-sizing-content w-full"
        style={getTextStyles({ settings: labelSettings })}
        placeholder={DOCUMENT_TYPE_DEFAULTS[documentType].labels.total}
      />
      <span
        data-testid="total-value"
        className={cn(
          "text-right whitespace-nowrap",
          hasPayment ? "" : "font-bold"
        )}
        style={getTextStyles({ settings: valueSettings })}
      >
        {formatInvoiceTotal({
          amount: total,
          convertedAmount: converted.total,
          money,
          currencyCode,
          conversion
        })}
      </span>
    </div>
  );
}

// The payment's date sits in brackets after the label, as it prints:
// "Amount paid (1 Oct 2026)". On a receipt with no amount typed it reads the
// total, as it prints.
function AmountPaidRow() {
  const {
    amountPaid,
    paidDate,
    setAmountPaid,
    setPaidDate,
    labels,
    setLabels
  } = usePricingSlice();
  const money = useMoneyFormat();
  const theme = useTheme();
  const isPreview = useIsPreview();
  const labelSettings = getRoleSettings(theme, "totalsLabel");
  const valueSettings = getRoleSettings(theme, "totalsValue");
  const labelStyle = getTextStyles({ settings: labelSettings });
  const conversion = useCurrencyConversion();
  const totals = useInvoiceTotals();
  const converted = useConvertedTotals();

  return (
    <div className="col-span-2 grid grid-cols-subgrid items-center text-sm">
      <span className="flex min-w-0 items-center gap-1">
        <InvoiceInput
          aria-label="Amount paid label"
          data-field="labels.amountPaid"
          value={labels.amountPaid}
          onChange={value =>
            setLabels(prev => ({ ...prev, amountPaid: value }))
          }
          className="field-sizing-content min-w-0"
          style={labelStyle}
          placeholder="Amount paid"
        />
        {(paidDate || !isPreview) && (
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
        )}
      </span>
      <span
        className="flex items-center"
        style={{ justifyContent: valueSettings.align }}
      >
        <MoneyInput
          label="Amount paid"
          field="amountPaid"
          amount={amountPaid}
          display={
            totals.amountPaid > 0
              ? formatDeduction({
                  amount: totals.amountPaid,
                  money,
                  conversion,
                  convertedAmount: converted.amountPaid
                })
              : withConvertedAmount({
                  value: formatCurrency(amountPaid, money),
                  amount: roundToDecimals(amountPaid, money.decimals),
                  conversion,
                  money
                })
          }
          money={money}
          style={getTextStyles({ settings: valueSettings })}
          onChange={setAmountPaid}
        />
      </span>
    </div>
  );
}

function BalanceDueRow() {
  const { currencyCode, labels, setLabels } = usePricingSlice();
  const money = useMoneyFormat();
  const { amountPaid, balanceDue } = useInvoiceTotals();
  const converted = useConvertedTotals();
  const conversion = useCurrencyConversion();
  const theme = useTheme();
  const labelSettings = getRoleSettings(theme, "grandTotalLabel");
  const valueSettings = getRoleSettings(theme, "grandTotalValue");

  if (amountPaid <= 0) {
    return null;
  }

  return (
    <div className="col-span-2 grid grid-cols-subgrid items-center text-sm">
      <InvoiceInput
        aria-label="Balance due label"
        data-field="labels.balanceDue"
        value={labels.balanceDue}
        onChange={value => setLabels(prev => ({ ...prev, balanceDue: value }))}
        className="field-sizing-content w-full"
        style={getTextStyles({ settings: labelSettings })}
        placeholder="Balance due"
      />
      <span
        data-testid="balance-due-value"
        className="text-right font-bold whitespace-nowrap"
        style={getTextStyles({ settings: valueSettings })}
      >
        {formatInvoiceTotal({
          amount: balanceDue,
          convertedAmount: converted.balanceDue,
          money,
          currencyCode,
          conversion
        })}
      </span>
    </div>
  );
}
