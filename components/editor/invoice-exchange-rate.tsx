import { round } from "lodash-es";
import { useEffect, useState } from "react";
import { InvoiceDateField } from "~/components/editor/invoice-date-field";
import { InvoiceInput } from "~/components/editor/invoice-input";
import { useCurrencyConversion } from "~/hooks/use-currency-conversion";
import { useIsPreview } from "~/hooks/use-shown-sections";
import {
  useCurrencyConversionSlice,
  useTheme
} from "~/stores/invoice-selectors";
import { buildExchangeRateLine } from "~/utils/currency-conversion";
import { getRoleSettings } from "~/utils/get-role-settings";
import { getTextStyles } from "~/utils/get-text-styles";

// Digits and one dot. Past six decimal places, as central banks quote rates,
// the rate is rounded to six, so a pasted 0.7834129 reads 0.783413.
function normalizeRateInput(value: string): string {
  const [whole = "", ...rest] = value.replace(/[^0-9.]/g, "").split(".");
  const decimals = rest.join("");

  if (rest.length === 0) return whole;
  if (decimals.length <= 6) return `${whole}.${decimals}`;

  return String(round(Number(`${whole}.${decimals}`), 6));
}

// The rate under the totals, typed into the line as it prints: "Exchange
// rate: 1 GBP = 1.2875 USD (Bank of England rate, 30 Oct 2026)". The brackets
// and comma hug the fields beside them, as they do in print.
export function InvoiceExchangeRate() {
  const conversion = useCurrencyConversion();
  const { currencyConversion, dateFormat, setCurrencyConversion } =
    useCurrencyConversionSlice();
  const isPreview = useIsPreview();
  const theme = useTheme();
  const style = getTextStyles({
    settings: getRoleSettings(theme, "totalsLabel"),
    remove: ["align"]
  });
  const [rateInput, setRateInput] = useState(
    currencyConversion.rate ? String(currencyConversion.rate) : ""
  );

  // Undo, redo or another tab can change the rate under the field.
  useEffect(() => {
    setRateInput(draft =>
      Number(draft || 0) === currencyConversion.rate
        ? draft
        : String(currencyConversion.rate || "")
    );
  }, [currencyConversion.rate]);

  if (!conversion) return null;

  if (isPreview) {
    return (
      <p
        data-field-area="pricing"
        className="text-paper-foreground mt-3 text-right text-sm"
        style={style}
      >
        {buildExchangeRateLine({ conversion, currencyConversion, dateFormat })}
      </p>
    );
  }

  return (
    <div
      data-field-area="pricing"
      className="text-paper-foreground mt-3 flex flex-wrap items-center justify-end gap-x-1 text-sm"
      style={style}
    >
      <span>{`Exchange rate: 1 ${conversion.fromCode} =`}</span>
      <InvoiceInput
        aria-label={`Exchange rate, ${conversion.toCode} per ${conversion.fromCode}`}
        data-field="currencyConversion.rate"
        inputMode="decimal"
        value={rateInput}
        onChange={value => {
          const rate = normalizeRateInput(value);

          setRateInput(rate);
          setCurrencyConversion(prev => ({ ...prev, rate: Number(rate) }));
        }}
        className="field-sizing-content w-auto min-w-4 text-right"
        style={style}
        placeholder="0.000000"
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
          onSelect={date => setCurrencyConversion(prev => ({ ...prev, date }))}
        />
        )
      </span>
    </div>
  );
}
