import type { ComponentProps } from "react";
import { useEffect, useState } from "react";
import { InvoiceInput } from "~/components/editor/invoice-input";
import type { MoneyFormat } from "~/types";
import {
  formatDecimalDraft,
  normalizeDecimalInput,
  parseDecimalDraft
} from "~/utils/decimal-input";
import { formatPlainNumber } from "~/utils/format-number";

// A number typed into the editor. While focused it keeps the draft as typed
// ("5," on a 1.234,56 invoice, "5." on a 1,234.56 one), read in the invoice's
// number format with `toPlainDecimal`, and stores the number it stands for
// with every keystroke. At rest, and whenever the number changes from outside
// (another invoice, a template, undo), it shows the stored value: `display`
// when given, else the plain figure.
//
// `value` undefined is an empty field; with `onClear`, clearing the field
// calls it instead of storing 0 (a line's rate going back on the invoice's).
// `showMarker` keeps the currency beside the draft as it's typed. A `min` of 0
// or more drops a typed minus, and anything outside `min` to `max` is clamped.
export function useNumberField({
  value,
  onChange,
  onClear,
  money,
  decimals,
  min,
  max,
  display,
  showMarker = false
}: {
  value: number | undefined;
  onChange: (value: number) => void;
  onClear?: () => void;
  money: MoneyFormat;
  decimals: number;
  min?: number;
  max?: number;
  display?: string;
  showMarker?: boolean;
}) {
  // Null while the field isn't focused, when it shows the stored value.
  const [draft, setDraft] = useState<string | null>(null);
  const format = { numberFormat: money.numberFormat, decimals };

  // While typing, the draft already stands for the stored number ("5." is 5),
  // so it's left alone; a number changed from outside replaces it.
  useEffect(() => {
    setDraft(previous =>
      previous === null || parseDecimalDraft(previous) === (value ?? 0)
        ? previous
        : toDraft(value)
    );
  }, [value]);

  function handleChange(text: string) {
    // The marker goes first: one with a dot in it (the dirham "د.إ", a custom
    // "Rs.") would otherwise survive as a stray decimal point.
    const typed = showMarker ? text.replace(money.marker, "") : text;
    const normalized = normalizeDecimalInput(typed, format);
    let next =
      min !== undefined && min >= 0 ? normalized.replace("-", "") : normalized;
    const number = parseDecimalDraft(next);

    if (max !== undefined && number > max) next = String(max);
    if (min !== undefined && number < min) next = String(min);

    setDraft(next);

    if (next === "" && onClear) {
      onClear();

      return;
    }

    onChange(parseDecimalDraft(next));
  }

  function getShownValue() {
    if (draft === null) {
      return display ?? formatPlainNumber(toDraft(value), money.numberFormat);
    }

    return showMarker
      ? formatDecimalDraft(draft, money)
      : formatPlainNumber(draft, money.numberFormat);
  }

  return {
    value: getShownValue(),
    onChange: handleChange,
    onFocus: () => setDraft(toDraft(value)),
    onBlur: () => setDraft(null)
  };
}

function toDraft(value: number | undefined) {
  return value === undefined ? "" : String(value);
}

// A number field on the page, an `InvoiceInput` driven by `useNumberField`.
export function NumberField({
  value,
  onChange,
  onClear,
  money,
  decimals,
  min,
  max,
  display,
  showMarker,
  ...props
}: Omit<
  ComponentProps<typeof InvoiceInput>,
  "value" | "onChange" | "onFocus" | "onBlur"
> &
  Parameters<typeof useNumberField>[0]) {
  const field = useNumberField({
    value,
    onChange,
    onClear,
    money,
    decimals,
    min,
    max,
    display,
    showMarker
  });

  return <InvoiceInput {...props} {...field} />;
}
