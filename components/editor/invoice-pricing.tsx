import type { CSSProperties, ReactNode } from "react";
import { useEffect, useState } from "react";
import { InvoiceInput } from "~/components/editor/invoice-input";
import { formatCurrency, formatCurrencyWithCode } from "~/consts/currencies";
import { useCurrencyConversion } from "~/hooks/use-currency-conversion";
import { useIsPreview, useShownSections } from "~/hooks/use-shown-sections";
import { cn } from "~/lib/utils";
import {
  useCurrencySymbol,
  useInvoiceTotals,
  usePricingSlice,
  useTheme
} from "~/stores/invoice-selectors";
import { withConvertedAmount } from "~/utils/currency-conversion";
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
        "hover:bg-paper-muted focus-visible:ring-ring shrink-0 rounded px-1.5 py-0.5 text-xs transition-[color,opacity] outline-none focus-visible:ring-1",
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
// Totals in two currencies need half the page rather than a third.
export function InvoicePricing() {
  const sections = useShownSections();
  const conversion = useCurrencyConversion();

  return (
    <div
      data-field-area="pricing"
      data-converted={conversion ? "" : undefined}
      className="group/pricing flex flex-col gap-1 text-right"
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
    <div className="ml-auto flex w-1/3 items-center justify-end gap-1 text-sm group-data-converted/pricing:w-1/2">
      <InvoiceInput
        aria-label="Subtotal label"
        data-field="labels.subtotal"
        value={labels.subtotal}
        onChange={value => setLabels(prev => ({ ...prev, subtotal: value }))}
        className="w-full min-w-fit"
        style={getTextStyles({ settings: labelSettings })}
        placeholder="Subtotal"
      />
      <span
        data-testid="subtotal-value"
        className="text-paper-foreground inline-block min-w-40 shrink-0 text-right whitespace-nowrap"
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

function TaxRow() {
  const { tax, currency, setTax, labels, setLabels } = usePricingSlice();
  const { taxAmount } = useInvoiceTotals();
  const conversion = useCurrencyConversion();
  const isPreview = useIsPreview();
  const theme = useTheme();
  const labelSettings = getRoleSettings(theme, "totalsLabel");
  const valueSettings = getRoleSettings(theme, "totalsValue");

  const [taxInput, setTaxInput] = usePricingInput(tax.percentage);

  return (
    <div className="group/pricing-row ml-auto flex w-1/3 items-center justify-end gap-1 text-sm group-data-converted/pricing:w-1/2">
      <PricingRowToggle
        label="Toggle tax exempt"
        active={tax.exempt}
        onClick={() => setTax(prev => ({ ...prev, exempt: !prev.exempt }))}
      >
        {tax.exempt ? "Exempt" : "%"}
      </PricingRowToggle>
      <div
        className="flex w-full items-center"
        style={{ justifyContent: labelSettings.align }}
      >
        <InvoiceInput
          aria-label="Tax label"
          data-field="labels.tax"
          value={labels.tax}
          onChange={value => setLabels(prev => ({ ...prev, tax: value }))}
          className="field-sizing-content w-auto min-w-fit pr-0.5"
          style={getTextStyles({ settings: labelSettings, remove: ["align"] })}
          placeholder="Tax"
        />
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
              className="w-10 p-0 text-right focus-visible:w-14"
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
          className="ml-auto min-w-40 text-right"
          style={getTextStyles({ settings: valueSettings })}
          placeholder="e.g. Reverse charge"
        />
      ) : (
        <span
          data-testid="tax-amount"
          className="ml-auto min-w-40 shrink-0 items-center whitespace-nowrap"
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

  const [feesInput, setFeesInput] = usePricingInput(fees);

  return (
    <div className="ml-auto flex w-1/3 items-center justify-end gap-1 text-sm group-data-converted/pricing:w-1/2">
      <InvoiceInput
        aria-label="Fees label"
        data-field="labels.fees"
        value={labels.fees}
        onChange={value => setLabels(prev => ({ ...prev, fees: value }))}
        className="w-full min-w-fit"
        style={getTextStyles({ settings: labelSettings })}
        placeholder="Fees"
      />
      <span
        className="ml-auto flex min-w-40 items-center"
        style={{ justifyContent: valueSettings.align }}
      >
        <MoneyInput
          label="Fees amount"
          field="fees"
          input={feesInput}
          amount={fees}
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

  const [discountsInput, setDiscountsInput] = usePricingInput(discounts);
  const isPercentage = discountType === "percentage";

  return (
    <div className="group/pricing-row ml-auto flex w-1/3 items-center justify-end gap-1 text-sm group-data-converted/pricing:w-1/2">
      <PricingRowToggle
        label="Toggle discount type"
        active={isPercentage}
        onClick={() => setDiscountType(isPercentage ? "fixed" : "percentage")}
      >
        {isPercentage ? "%" : currencySymbol}
      </PricingRowToggle>
      <div
        className="flex w-full items-center"
        style={{ justifyContent: labelSettings.align }}
      >
        <InvoiceInput
          aria-label="Discounts label"
          data-field="labels.discounts"
          value={labels.discounts}
          onChange={value => setLabels(prev => ({ ...prev, discounts: value }))}
          className="field-sizing-content w-auto min-w-fit pr-0.5"
          style={getTextStyles({ settings: labelSettings, remove: ["align"] })}
          placeholder="Discounts"
        />
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
              className="w-10 p-0 text-right focus-visible:w-14"
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
          className="ml-auto min-w-40 items-center"
          style={getTextStyles({ settings: valueSettings })}
        >
          {`-${formatCurrency(discountAmount, currency)}`}
        </span>
      ) : (
        <span
          className="ml-auto flex min-w-40 items-center"
          style={{ justifyContent: valueSettings.align }}
        >
          <MoneyInput
            label="Discounts amount"
            field="discounts"
            input={discountsInput}
            amount={discounts}
            display={
              discountAmount > 0
                ? `-${formatCurrency(discountAmount, currency)}`
                : undefined
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
    <div className="ml-auto flex w-1/3 items-center justify-end gap-1 text-sm group-data-converted/pricing:w-1/2">
      <InvoiceInput
        aria-label="Total label"
        data-field="labels.total"
        value={labels.total}
        onChange={value => setLabels(prev => ({ ...prev, total: value }))}
        className="w-full min-w-fit"
        style={getTextStyles({ settings: labelSettings })}
        placeholder="Total"
      />
      <span
        data-testid="total-value"
        className={cn(
          "inline-block min-w-40 shrink-0 text-right whitespace-nowrap",
          hasPayment ? "" : "font-bold"
        )}
        style={getTextStyles({ settings: valueSettings })}
      >
        {withConvertedAmount(
          formatCurrencyWithCode(total, currency, currencyCode),
          total,
          conversion
        )}
      </span>
    </div>
  );
}

function AmountPaidRow() {
  const { amountPaid, setAmountPaid, currency, labels, setLabels } =
    usePricingSlice();
  const currencySymbol = useCurrencySymbol();
  const theme = useTheme();
  const labelSettings = getRoleSettings(theme, "totalsLabel");
  const valueSettings = getRoleSettings(theme, "totalsValue");

  const [amountPaidInput, setAmountPaidInput] = usePricingInput(amountPaid);

  return (
    <div className="ml-auto flex w-1/3 items-center justify-end gap-1 text-sm group-data-converted/pricing:w-1/2">
      <InvoiceInput
        aria-label="Amount paid label"
        data-field="labels.amountPaid"
        value={labels.amountPaid}
        onChange={value => setLabels(prev => ({ ...prev, amountPaid: value }))}
        className="w-full min-w-fit"
        style={getTextStyles({ settings: labelSettings })}
        placeholder="Amount paid"
      />
      <span
        className="ml-auto flex min-w-40 items-center"
        style={{ justifyContent: valueSettings.align }}
      >
        <MoneyInput
          label="Amount paid"
          field="amountPaid"
          input={amountPaidInput}
          amount={amountPaid}
          display={
            amountPaid > 0
              ? `-${formatCurrency(amountPaid, currency)}`
              : undefined
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
  const theme = useTheme();
  const labelSettings = getRoleSettings(theme, "grandTotalLabel");
  const valueSettings = getRoleSettings(theme, "grandTotalValue");

  if (amountPaid <= 0) {
    return null;
  }

  return (
    <div className="ml-auto flex w-1/3 items-center justify-end gap-1 text-sm group-data-converted/pricing:w-1/2">
      <InvoiceInput
        aria-label="Balance due label"
        data-field="labels.balanceDue"
        value={labels.balanceDue}
        onChange={value => setLabels(prev => ({ ...prev, balanceDue: value }))}
        className="w-full min-w-fit"
        style={getTextStyles({ settings: labelSettings })}
        placeholder="Balance due"
      />
      <span
        data-testid="balance-due-value"
        className="inline-block min-w-40 text-right font-bold"
        style={getTextStyles({ settings: valueSettings })}
      >
        {formatCurrencyWithCode(balanceDue, currency, currencyCode)}
      </span>
    </div>
  );
}
