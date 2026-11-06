import { round } from "lodash-es";
import { useEffect, useState } from "react";
import { useCurrencyConversionSlice } from "~/stores/invoice-selectors";
import { useInvoiceStore } from "~/stores/invoice-store";
import type { InvoiceNumberFormat } from "~/types";
import { formatExchangeRate } from "~/utils/currency-conversion";
import { toPlainDecimal } from "~/utils/decimal-input";
import { formatPlainNumber } from "~/utils/format-number";
import { readInvoiceDate } from "~/utils/read-invoice-date";

// Digits and one decimal point, read in the invoice's number format ("1,2875"
// on a 1.234,56 invoice). Past six decimal places, as central banks quote
// rates, the rate is rounded to six, so a pasted 0.7834129 reads 0.783413.
function normalizeRateInput(
  value: string,
  numberFormat: InvoiceNumberFormat
): string {
  const [whole = "", ...rest] = toPlainDecimal(value, {
    numberFormat,
    decimals: 6
  })
    .replace(/[^0-9.]/g, "")
    .split(".");
  const decimals = rest.join("");

  if (rest.length === 0) return whole;
  if (decimals.length <= 6) return `${whole}.${decimals}`;

  return String(round(Number(`${whole}.${decimals}`), 6));
}

// The rate a draft stands for. A lone "." on the way to ".78" is none yet,
// not NaN.
function parseRate(draft: string) {
  return Number(draft) || 0;
}

// A set rate as a draft, "1.20" with a dot whatever the invoice's format
// (the field shows it in that format); none is an empty field.
function formatRateInput(rate: number) {
  return rate ? formatExchangeRate(rate, "comma-dot") : "";
}

// The exchange rate as it's being typed: "1." stays "1." while the invoice
// already has 1, and leaving the field writes it as it prints. The rate is
// typed on the page and in the inspector, so a change from the other one,
// undo, redo or another tab replaces the draft.
export function useExchangeRateInput() {
  const { currencyConversion, numberFormat, setCurrencyConversion } =
    useCurrencyConversionSlice();
  const [draft, setDraft] = useState(formatRateInput(currencyConversion.rate));

  useEffect(() => {
    setDraft(current =>
      parseRate(current) === currencyConversion.rate
        ? current
        : formatRateInput(currencyConversion.rate)
    );
  }, [currencyConversion.rate]);

  function onChange(value: string) {
    const rate = normalizeRateInput(value, numberFormat);
    const { invoiceDate, supplyDate, sections } = useInvoiceStore.getState();
    // A rate typed in with no date is dated to the supply (its first day,
    // for a period), or failing that the invoice, since that's the day its
    // rate should be from. Anything that isn't a date is left out.
    const fallbackDate =
      [sections.supplyDate ? supplyDate.split("/")[0] : "", invoiceDate].find(
        candidate => readInvoiceDate(candidate) !== null
      ) ?? "";

    setDraft(rate);
    setCurrencyConversion(prev => ({
      ...prev,
      rate: parseRate(rate),
      date:
        !prev.date && !prev.rate && parseRate(rate) ? fallbackDate : prev.date
    }));
  }

  function onBlur() {
    setDraft(formatRateInput(currencyConversion.rate));
  }

  return { value: formatPlainNumber(draft, numberFormat), onChange, onBlur };
}
