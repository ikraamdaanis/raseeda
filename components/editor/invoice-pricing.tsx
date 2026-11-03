import type { CSSProperties, ReactNode } from "react";
import { useEffect, useState } from "react";
import { useShallow } from "zustand/react/shallow";
import { InvoiceDateField } from "~/components/editor/invoice-date-field";
import { InvoiceInput } from "~/components/editor/invoice-input";
import { formatCurrency } from "~/consts/currencies";
import { useCurrencyConversion } from "~/hooks/use-currency-conversion";
import { useIsPreview, useShownSections } from "~/hooks/use-shown-sections";
import { cn } from "~/lib/utils";
import {
  useCurrencySymbol,
  useInvoiceTotals,
  usePricingSlice,
  useTheme
} from "~/stores/invoice-selectors";
import { useInvoiceStore } from "~/stores/invoice-store";
import type { InvoiceSummaryRow } from "~/types";
import { buildTaxRows } from "~/utils/build-invoice-view-model";
import { calculateInvoiceTotals } from "~/utils/calculate-invoice-totals";
import {
  formatDeduction,
  formatInvoiceTotal,
  withConvertedAmount
} from "~/utils/currency-conversion";
import { getRoleSettings } from "~/utils/get-role-settings";
import { getTextStyles } from "~/utils/get-text-styles";
import { handleCurrencyInput } from "~/utils/handle-currency-input";
import { handlePercentageInput } from "~/utils/handle-percentage-input";
import { reconcilePricingInput } from "~/utils/reconcile-pricing-input";

function handleInputBlur(
  currentInput: string,
  setter: (value: string) => void,
  setValue: (value: number) => void
) {
  // When input loses focus, ensure valid number
  if (currentInput === "" || currentInput === ".") {
    setter("0");
    setValue(0);
  } else if (currentInput.endsWith(".")) {
    const cleanValue = currentInput.slice(0, -1);
    setter(cleanValue);
    setValue(Number(cleanValue));
  }
  // Note: Totals are auto-recalculated by Zustand store actions
}

// Tracks a pricing field's local input string, refreshing it from the store
// value whenever the active document is replaced (see reconcilePricingInput).
function usePricingInput(storeValue: number) {
  const [input, setInput] = useState(storeValue.toString());

  useEffect(() => {
    setInput(prev => reconcilePricingInput(prev, storeValue));
  }, [storeValue]);

  return [input, setInput] as const;
}

// A small editor-only toggle shown to the left of a pricing row (e.g. switch a
// discount between fixed and percentage, or mark tax exempt). Like the add /
// remove item buttons, it is an editing affordance that never appears in the
// rendered PDF. It stays out of sight until the row is hovered or focused,
// unless it's showing a non-default choice (a % discount, exempt tax).
function PricingRowToggle({
  label,
  active,
  onClick,
  children
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  const isPreview = useIsPreview();

  if (isPreview) return null;

  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "hover:bg-paper-muted focus-visible:ring-ring absolute top-1/2 right-full mr-1 shrink-0 -translate-y-1/2 rounded px-1.5 py-0.5 text-xs whitespace-nowrap transition-[color,opacity] outline-none focus-visible:ring-1",
        active
          ? "text-paper-foreground"
          : "text-paper-muted-foreground opacity-0 group-focus-within/pricing-row:opacity-100 group-hover/pricing-row:opacity-100 pointer-coarse:opacity-100"
      )}
    >
      {children}
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
  input,
  amount,
  display,
  currency,
  currencySymbol,
  style,
  onInput,
  onCommit
}: {
  label: string;
  // The data-field path, for undo to find the field again.
  field: string;
  input: string;
  amount: number;
  display?: string;
  currency: string;
  currencySymbol: string;
  style: CSSProperties;
  onInput: (numericValue: string) => void;
  onCommit: () => void;
}) {
  const [focused, setFocused] = useState(false);

  return (
    <InvoiceInput
      aria-label={label}
      data-field={field}
      value={
        focused
          ? `${currencySymbol}${input}`
          : (display ?? formatCurrency(amount, currency))
      }
      className="field-sizing-content min-w-20 text-right"
      style={style}
      placeholder={currencySymbol}
      onFocus={() => setFocused(true)}
      onChange={value => onInput(handleCurrencyInput(value, currencySymbol))}
      onBlur={() => {
        setFocused(false);
        onCommit();
      }}
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
  const { currency, labels, setLabels } = usePricingSlice();
  const { subtotal } = useInvoiceTotals();
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
        {withConvertedAmount(
          formatCurrency(subtotal, currency),
          subtotal,
          conversion
        )}
      </span>
    </div>
  );
}

// The tax rows the PDF prints: one per rate when the lines' rates differ.
function usePrintedTaxRows(): InvoiceSummaryRow[] {
  const invoice = useInvoiceStore(
    useShallow(state => ({
      items: state.items,
      tax: state.tax,
      fees: state.fees,
      discounts: state.discounts,
      discountType: state.discountType,
      amountPaid: state.amountPaid,
      sections: state.sections,
      labels: state.labels,
      currency: state.currency
    }))
  );
  const conversion = useCurrencyConversion();
  const totals = calculateInvoiceTotals(invoice);

  return buildTaxRows({
    label: invoice.labels.tax,
    tax: invoice.tax,
    taxGroups: totals.taxGroups,
    taxAmount: totals.taxAmount,
    currency: invoice.currency,
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

// Editing, the tax row sets the invoice's rate. In Preview, an invoice whose
// lines carry rates of their own reads as the PDF does instead: a row per
// rate, or the one rate they all share.
function TaxRow() {
  const { tax } = usePricingSlice();
  const isPreview = useIsPreview();
  const printedRows = usePrintedTaxRows();
  const readsAsPrinted =
    isPreview &&
    (printedRows.length > 1 || !isInvoiceTaxRow(printedRows[0], tax));

  if (readsAsPrinted) return <PrintedTaxRows rows={printedRows} />;

  return <InvoiceTaxRow />;
}

function PrintedTaxRows({ rows }: { rows: InvoiceSummaryRow[] }) {
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
              : `${row.label} ${row.percentage}%`}
          </span>
          <span
            data-testid="tax-amount"
            className="border border-transparent whitespace-nowrap"
            style={valueStyle}
          >
            {row.value}
          </span>
        </div>
      ))}
    </>
  );
}

function InvoiceTaxRow() {
  const { tax, currency, setTax, labels, setLabels } = usePricingSlice();
  const { taxAmount } = useInvoiceTotals();
  const conversion = useCurrencyConversion();
  const isPreview = useIsPreview();
  const theme = useTheme();
  const labelSettings = getRoleSettings(theme, "totalsLabel");
  const valueSettings = getRoleSettings(theme, "totalsValue");

  const [taxInput, setTaxInput] = usePricingInput(tax.percentage);

  return (
    <div className="group/pricing-row col-span-2 grid grid-cols-subgrid items-center text-sm">
      <div
        className="flex w-full items-center gap-2"
        style={{ justifyContent: labelSettings.align }}
      >
        <span className="relative flex items-center">
          <PricingRowToggle
            label="Toggle tax exempt"
            active={tax.exempt}
            onClick={() => setTax(prev => ({ ...prev, exempt: !prev.exempt }))}
          >
            {tax.exempt ? "Exempt" : "%"}
          </PricingRowToggle>
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
            <InvoiceInput
              id="invoice-field-totals"
              aria-label="Tax percentage"
              data-field="tax.percentage"
              value={taxInput}
              onChange={value => {
                const numericValue = handlePercentageInput(value);
                setTaxInput(numericValue);
                setTax(prev => ({ ...prev, percentage: Number(numericValue) }));
              }}
              onBlur={() =>
                handleInputBlur(taxInput, setTaxInput, (val: number) =>
                  setTax(prev => ({ ...prev, percentage: val }))
                )
              }
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
      {tax.exempt ? (
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
          {withConvertedAmount(
            formatCurrency(taxAmount, currency),
            taxAmount,
            conversion
          )}
        </span>
      )}
    </div>
  );
}

function FeesRow() {
  const { fees, setFees, currency, labels, setLabels } = usePricingSlice();
  const currencySymbol = useCurrencySymbol();
  const theme = useTheme();
  const labelSettings = getRoleSettings(theme, "totalsLabel");
  const valueSettings = getRoleSettings(theme, "totalsValue");

  const conversion = useCurrencyConversion();
  const [feesInput, setFeesInput] = usePricingInput(fees);

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
          input={feesInput}
          amount={fees}
          display={withConvertedAmount(
            formatCurrency(fees, currency),
            fees,
            conversion
          )}
          currency={currency}
          currencySymbol={currencySymbol}
          style={getTextStyles({ settings: valueSettings })}
          onInput={numericValue => {
            setFeesInput(numericValue);
            setFees(Number(numericValue));
          }}
          onCommit={() => handleInputBlur(feesInput, setFeesInput, setFees)}
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
    currency,
    labels,
    setLabels
  } = usePricingSlice();
  const { discountAmount } = useInvoiceTotals();
  const currencySymbol = useCurrencySymbol();
  const theme = useTheme();
  const labelSettings = getRoleSettings(theme, "totalsLabel");
  const valueSettings = getRoleSettings(theme, "totalsValue");

  const conversion = useCurrencyConversion();
  const [discountsInput, setDiscountsInput] = usePricingInput(discounts);
  const isPercentage = discountType === "percentage";

  return (
    <div className="group/pricing-row col-span-2 grid grid-cols-subgrid items-center text-sm">
      <div
        className="flex w-full items-center gap-2"
        style={{ justifyContent: labelSettings.align }}
      >
        <span className="relative flex items-center">
          <PricingRowToggle
            label="Toggle discount type"
            active={isPercentage}
            onClick={() =>
              setDiscountType(isPercentage ? "fixed" : "percentage")
            }
          >
            {isPercentage ? "%" : currencySymbol}
          </PricingRowToggle>
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
            <InvoiceInput
              aria-label="Discount percentage"
              data-field="discounts"
              value={discountsInput}
              onChange={value => {
                const numericValue = handlePercentageInput(value);
                setDiscountsInput(numericValue);
                setDiscounts(Number(numericValue));
              }}
              onBlur={() =>
                handleInputBlur(discountsInput, setDiscountsInput, setDiscounts)
              }
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
          {formatDeduction({ amount: discountAmount, currency, conversion })}
        </span>
      ) : (
        <span
          className="flex items-center"
          style={{ justifyContent: valueSettings.align }}
        >
          <MoneyInput
            label="Discounts amount"
            field="discounts"
            input={discountsInput}
            amount={discounts}
            display={
              discountAmount > 0
                ? formatDeduction({
                    amount: discountAmount,
                    currency,
                    conversion
                  })
                : withConvertedAmount(
                    formatCurrency(discounts, currency),
                    discounts,
                    conversion
                  )
            }
            currency={currency}
            currencySymbol={currencySymbol}
            style={getTextStyles({ settings: valueSettings })}
            onInput={numericValue => {
              setDiscountsInput(numericValue);
              setDiscounts(Number(numericValue));
            }}
            onCommit={() =>
              handleInputBlur(discountsInput, setDiscountsInput, setDiscounts)
            }
          />
        </span>
      )}
    </div>
  );
}

// The grand total suppresses its emphasis when a payment has been recorded, so
// the balance-due row below reads as the figure to pay instead. A payment only
// counts while its row is switched on, as in the PDF.
function TotalRow() {
  const { currency, currencyCode, amountPaid, labels, setLabels } =
    usePricingSlice();
  const { total } = useInvoiceTotals();
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
        placeholder="Total"
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
          currency,
          currencyCode,
          conversion
        })}
      </span>
    </div>
  );
}

// The payment's date sits in brackets after the label, as it prints:
// "Amount paid (1 Oct 2026)".
function AmountPaidRow() {
  const {
    amountPaid,
    paidDate,
    setAmountPaid,
    setPaidDate,
    currency,
    labels,
    setLabels
  } = usePricingSlice();
  const currencySymbol = useCurrencySymbol();
  const theme = useTheme();
  const isPreview = useIsPreview();
  const labelSettings = getRoleSettings(theme, "totalsLabel");
  const valueSettings = getRoleSettings(theme, "totalsValue");
  const labelStyle = getTextStyles({ settings: labelSettings });
  const conversion = useCurrencyConversion();
  const [amountPaidInput, setAmountPaidInput] = usePricingInput(amountPaid);

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
          input={amountPaidInput}
          amount={amountPaid}
          display={
            amountPaid > 0
              ? formatDeduction({ amount: amountPaid, currency, conversion })
              : withConvertedAmount(
                  formatCurrency(amountPaid, currency),
                  amountPaid,
                  conversion
                )
          }
          currency={currency}
          currencySymbol={currencySymbol}
          style={getTextStyles({ settings: valueSettings })}
          onInput={numericValue => {
            setAmountPaidInput(numericValue);
            setAmountPaid(Number(numericValue));
          }}
          onCommit={() =>
            handleInputBlur(amountPaidInput, setAmountPaidInput, setAmountPaid)
          }
        />
      </span>
    </div>
  );
}

function BalanceDueRow() {
  const { amountPaid, currency, currencyCode, labels, setLabels } =
    usePricingSlice();
  const { balanceDue } = useInvoiceTotals();
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
          currency,
          currencyCode,
          conversion
        })}
      </span>
    </div>
  );
}
