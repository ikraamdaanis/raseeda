import { InvoiceDateField } from "~/components/editor/invoice-date-field";
import { InvoiceInput } from "~/components/editor/invoice-input";
import { RemoveSectionButton } from "~/components/editor/invoice-optional-section";
import { useNumberField } from "~/components/editor/number-field";
import { useCurrencyConversion } from "~/hooks/use-currency-conversion";
import { useIsPreview } from "~/hooks/use-shown-sections";
import {
  useCurrencyConversionSlice,
  useMoneyFormat,
  useTheme
} from "~/stores/invoice-selectors";
import { useInvoiceStore } from "~/stores/invoice-store";
import {
  buildExchangeRateLine,
  formatExchangeRate
} from "~/utils/currency-conversion";
import { formatPlainNumber } from "~/utils/format-number";
import { getRoleSettings } from "~/utils/get-role-settings";
import { getTextStyles } from "~/utils/get-text-styles";
import { readInvoiceDate } from "~/utils/read-invoice-date";

// The exchange rate's field: up to six decimal places, as central banks quote
// rates, and empty while there's no rate. At rest it reads as it prints.
function useExchangeRateField() {
  const { currencyConversion, numberFormat, setCurrencyConversion } =
    useCurrencyConversionSlice();
  const money = useMoneyFormat();
  const { rate } = currencyConversion;

  function setRate(next: number) {
    const { invoiceDate, supplyDate, sections } = useInvoiceStore.getState();
    // A rate typed in with no date is dated to the supply (its first day,
    // for a period), or failing that the invoice, since that's the day its
    // rate should be from. Anything that isn't a date is left out.
    const fallbackDate =
      [sections.supplyDate ? supplyDate.split("/")[0] : "", invoiceDate].find(
        candidate => readInvoiceDate(candidate) !== null
      ) ?? "";

    setCurrencyConversion(prev => ({
      ...prev,
      rate: next,
      date: !prev.date && !prev.rate && next ? fallbackDate : prev.date
    }));
  }

  const field = useNumberField({
    value: rate || undefined,
    onChange: setRate,
    onClear: () => setRate(0),
    money,
    decimals: 6,
    min: 0,
    display: rate ? formatExchangeRate(rate, numberFormat) : ""
  });

  return {
    ...field,
    placeholder: formatPlainNumber("0.000000", numberFormat)
  };
}

// The rate under the totals, typed into the line as it prints: "Exchange
// rate: 1 GBP = 1.2875 USD (Bank of England rate, 30 Oct 2026)". The brackets
// and comma hug the fields beside them, as they do in print. Its × leaves the
// line out of print; the totals' slot brings it back.
export function InvoiceExchangeRate() {
  const conversion = useCurrencyConversion();
  const {
    currencyConversion,
    dateFormat,
    numberFormat,
    setCurrencyConversion
  } = useCurrencyConversionSlice();
  const isPreview = useIsPreview();
  const theme = useTheme();
  const style = getTextStyles({
    settings: getRoleSettings(theme, "totalsLabel"),
    remove: ["align"]
  });
  const rateInput = useExchangeRateField();

  if (!conversion || !currencyConversion.showRate) return null;

  if (isPreview) {
    return (
      <p
        data-field-area="pricing"
        className="text-paper-foreground mt-3 text-right text-sm"
        style={style}
      >
        {buildExchangeRateLine({
          conversion,
          currencyConversion,
          dateFormat,
          numberFormat
        })}
      </p>
    );
  }

  // Only while editing, never in print: a rate with no source or date.
  const missing =
    currencyConversion.rate > 0
      ? [
          !currencyConversion.source.trim() && "source",
          !currencyConversion.date && "date"
        ].filter(Boolean)
      : [];

  return (
    <div
      data-field-area="pricing"
      className="group/optional mt-3 flex flex-col gap-1"
    >
      <div
        className="text-paper-foreground flex flex-wrap items-center justify-end gap-x-1 text-sm"
        style={style}
      >
        <RemoveSectionButton
          label="Hide exchange rate"
          onClick={() =>
            setCurrencyConversion(prev => ({ ...prev, showRate: false }))
          }
        />
        <span>{`Exchange rate: 1 ${conversion.fromCode} =`}</span>
        <InvoiceInput
          aria-label={`Exchange rate, ${conversion.toCode} per ${conversion.fromCode}`}
          data-field="currencyConversion.rate"
          inputMode="decimal"
          {...rateInput}
          className="field-sizing-content w-auto min-w-4 text-right"
          style={style}
        />
        <span>{conversion.toCode}</span>
        <span className="flex items-center">
          (
          <InvoiceInput
            aria-label="Exchange rate source"
            data-field="currencyConversion.source"
            value={currencyConversion.source}
            onChange={value =>
              setCurrencyConversion(prev => ({ ...prev, source: value }))
            }
            className="field-sizing-content w-auto min-w-4"
            style={style}
            placeholder="e.g. Central bank rate"
          />
          ,
        </span>
        <span className="flex items-center whitespace-nowrap">
          <InvoiceDateField
            value={currencyConversion.date}
            label="Exchange rate date"
            placeholder="Pick the rate date"
            style={style}
            canClear
            onSelect={date =>
              setCurrencyConversion(prev => ({ ...prev, date }))
            }
          />
          )
        </span>
      </div>
      {missing.length > 0 && (
        <p className="text-right text-xs text-pretty text-amber-700">
          {`Add the rate’s ${missing.join(" and ")}: tax invoices that show a converted amount usually have to say whose rate it is and from when.`}
        </p>
      )}
    </div>
  );
}
