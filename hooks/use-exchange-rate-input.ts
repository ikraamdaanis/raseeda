import { round } from "lodash-es";
import { useEffect, useState } from "react";
import { useCurrencyConversionSlice } from "~/stores/invoice-selectors";
import { formatExchangeRate } from "~/utils/currency-conversion";

// Digits and one dot. Past six decimal places, as central banks quote rates,
// the rate is rounded to six, so a pasted 0.7834129 reads 0.783413.
function normalizeRateInput(value: string): string {
  const [whole = "", ...rest] = value.replace(/[^0-9.]/g, "").split(".");
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

// A set rate written as it prints, "1.20"; none is an empty field.
function formatRateInput(rate: number) {
  return rate ? formatExchangeRate(rate) : "";
}

// The exchange rate as it's being typed: "1." stays "1." while the invoice
// already has 1, and leaving the field writes it as it prints. The rate is
// typed on the page and in the inspector, so a change from the other one,
// undo, redo or another tab replaces the draft.
export function useExchangeRateInput() {
  const { currencyConversion, setCurrencyConversion } =
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
    const rate = normalizeRateInput(value);

    setDraft(rate);
    setCurrencyConversion(prev => ({ ...prev, rate: parseRate(rate) }));
  }

  function onBlur() {
    setDraft(formatRateInput(currencyConversion.rate));
  }

  return { value: draft, onChange, onBlur };
}
