import { IconPlus, IconX } from "@tabler/icons-react";
import type { CSSProperties } from "react";
import { useId, useState } from "react";
import { flushSync } from "react-dom";
import { CustomCurrencyDialog } from "~/components/dialogs/custom-currency-dialog";
import { inspectorFieldClassName } from "~/components/editor/shell/inspector/inspector-controls";
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from "~/components/ui/popover";
import { NativeSelect } from "~/components/ui/select";
import {
  currencyOptions,
  getCurrencyCodeForSymbol,
  getCurrencyMarker,
  normalizeCurrency
} from "~/consts/currencies";
import { useSecondCurrency } from "~/hooks/use-second-currency";
import { useIsPreview } from "~/hooks/use-shown-sections";
import { cn } from "~/lib/utils";
import {
  useCurrencyConversionSlice,
  useCurrencySlice,
  useTheme
} from "~/stores/invoice-selectors";
import { isSameCurrency } from "~/utils/currency-conversion";

const CUSTOM_CURRENCY = "__custom";
const SECOND_CURRENCY_ID = "total-second-currency";

const linkClassName =
  "text-muted-foreground hover:text-foreground focus-visible:ring-ring relative -mx-1 flex h-6 w-fit items-center gap-1 rounded-md px-1 text-xs outline-none focus-visible:ring-1 pointer-coarse:h-11";

// How the currency rows look in the inspector's popover; the phone's form
// passes its own.
const POPOVER_CLASS_NAMES = {
  field: inspectorFieldClassName,
  label: "text-muted-foreground text-xs",
  action: linkClassName
};

/**
 * The total as it prints. In Edit mode it opens the invoice's currency, and
 * the second currency every amount is also shown in; a custom one is typed in
 * a dialog, which outlives the popover closing behind it.
 */
export function InvoiceTotalCurrency({
  value,
  isEmphasised,
  style
}: {
  value: string;
  isEmphasised: boolean;
  style: CSSProperties;
}) {
  const isPreview = useIsPreview();
  const [open, setOpen] = useState(false);
  const [customFor, setCustomFor] = useState<"currency" | "second" | null>(
    null
  );
  const valueClassName = cn(
    "text-right whitespace-nowrap",
    isEmphasised && "font-bold"
  );

  function handleCustom(target: "currency" | "second") {
    setOpen(false);
    setCustomFor(target);
  }

  if (isPreview) {
    return (
      <span data-testid="total-value" className={valueClassName} style={style}>
        {value}
      </span>
    );
  }

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          aria-label={`${value}, change currency`}
          className={cn(
            valueClassName,
            "rounded-surface hover:bg-brand-50 aria-expanded:bg-brand-50 focus-visible:border-brand-500 relative -mx-px border border-transparent outline-none pointer-coarse:after:absolute pointer-coarse:after:inset-x-0 pointer-coarse:after:inset-y-[calc((100%-2.75rem)/2)]"
          )}
          style={style}
        >
          <span data-testid="total-value">{value}</span>
        </PopoverTrigger>
        <PopoverContent align="end" className="gap-3 p-3">
          <CurrencyRows onCustom={handleCustom} />
        </PopoverContent>
      </Popover>
      <CustomCurrency
        customFor={customFor}
        onClose={() => setCustomFor(null)}
      />
    </>
  );
}

/**
 * The currency and second currency on their own, for the phone's form, where
 * there's no popover to close before the custom currency dialog opens.
 */
export function CurrencyControls({
  classNames
}: {
  classNames: { field: string; label: string; action: string };
}) {
  const [customFor, setCustomFor] = useState<"currency" | "second" | null>(
    null
  );

  return (
    <>
      <CurrencyRows onCustom={setCustomFor} classNames={classNames} />
      <CustomCurrency
        customFor={customFor}
        onClose={() => setCustomFor(null)}
      />
    </>
  );
}

// The dialog a custom currency is typed in, for the invoice's currency or the
// second one, never the same as the other.
function CustomCurrency({
  customFor,
  onClose
}: {
  customFor: "currency" | "second" | null;
  onClose: () => void;
}) {
  const { currency, currencyCode, setCurrency } = useCurrencySlice();
  const { currencyConversion, setSecondCurrency } =
    useCurrencyConversionSlice();
  const custom =
    customFor === "second"
      ? {
          symbol: currencyConversion.currency,
          code: currencyConversion.currencyCode,
          exclude: { currency, currencyCode },
          onSubmit: setSecondCurrency
        }
      : {
          symbol: currency,
          code: currencyCode,
          exclude: undefined,
          onSubmit: setCurrency
        };
  const customSymbol = normalizeCurrency(custom.symbol);
  const isCustom = !isPresetCurrency(customSymbol);

  return (
    <CustomCurrencyDialog
      open={customFor !== null}
      onOpenChange={isOpen => {
        if (!isOpen) onClose();
      }}
      currentSymbol={isCustom ? customSymbol : ""}
      currentCode={isCustom ? custom.code : ""}
      title={customFor === "second" ? "Custom second currency" : undefined}
      isTaken={(symbol, code) =>
        custom.exclude !== undefined &&
        isSameCurrency(custom.exclude, {
          currency: symbol,
          currencyCode: code
        })
      }
      onSubmit={custom.onSubmit}
    />
  );
}

function isPresetCurrency(symbol: string) {
  return currencyOptions.some(option => option.symbol === symbol);
}

// The currency, and a second one (never the same) the amounts are also shown
// in: a quiet link under the currency until one is added, then its own picker
// with a way to remove it. Focus follows, to the new picker or back to the
// link.
function CurrencyRows({
  onCustom,
  classNames = POPOVER_CLASS_NAMES
}: {
  onCustom: (target: "currency" | "second") => void;
  classNames?: { field: string; label: string; action: string };
}) {
  const { currency, currencyCode, setCurrency } = useCurrencySlice();
  const { currencyConversion, setSecondCurrency } =
    useCurrencyConversionSlice();
  const secondCurrency = useSecondCurrency();
  const addButtonId = useId();

  function handleAdd() {
    flushSync(secondCurrency.add);
    document.getElementById(SECOND_CURRENCY_ID)?.focus();
  }

  function handleRemove() {
    flushSync(secondCurrency.remove);
    document.getElementById(addButtonId)?.focus();
  }

  return (
    <>
      <CurrencySelect
        id="total-currency"
        label="Currency"
        currency={currency}
        onChange={setCurrency}
        onCustom={() => onCustom("currency")}
        classNames={classNames}
      />
      {secondCurrency.isOn ? (
        <div className="flex flex-col gap-1">
          <CurrencySelect
            id={SECOND_CURRENCY_ID}
            label="Also show in"
            currency={currencyConversion.currency}
            exclude={{ currency, currencyCode }}
            onChange={setSecondCurrency}
            onCustom={() => onCustom("second")}
            classNames={classNames}
          />
          <button
            type="button"
            onClick={handleRemove}
            className={classNames.action}
          >
            <IconX aria-hidden="true" className="size-3.5 shrink-0" />
            Remove second currency
          </button>
        </div>
      ) : (
        <button
          id={addButtonId}
          type="button"
          onClick={handleAdd}
          className={classNames.action}
        >
          <IconPlus aria-hidden="true" className="size-3.5 shrink-0" />
          Add second currency
        </button>
      )}
    </>
  );
}

function CurrencySelect({
  id,
  label,
  currency,
  exclude,
  onChange,
  onCustom,
  classNames
}: {
  id: string;
  label: string;
  currency: string;
  exclude?: { currency: string; currencyCode: string };
  onChange: (symbol: string, code: string) => void;
  onCustom: () => void;
  classNames: { field: string; label: string };
}) {
  const { font } = useTheme();
  const selected = normalizeCurrency(currency);
  const isCustom = !isPresetCurrency(selected);
  // The selected preset stays listed even when excluded, so the select never
  // shows a currency the invoice doesn't have.
  const options = currencyOptions.filter(
    option =>
      option.symbol === selected ||
      !exclude ||
      !isSameCurrency(exclude, {
        currency: option.symbol,
        currencyCode: option.code
      })
  );

  // A preset stores its symbol and its default ISO code together, so a bare
  // "$" still carries an explicit code the user can override.
  function handleChange(value: string) {
    if (value === CUSTOM_CURRENCY) {
      onCustom();

      return;
    }

    onChange(value, getCurrencyCodeForSymbol(value));
  }

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className={classNames.label}>
        {label}
      </label>
      <NativeSelect
        id={id}
        value={isCustom ? CUSTOM_CURRENCY : selected}
        onChange={event => handleChange(event.target.value)}
        className={cn(classNames.field, "pr-7")}
      >
        {options.map(({ symbol, code, label: name }) => (
          <option key={symbol} value={symbol}>
            {`${getCurrencyMarker({ currency: symbol, currencyCode: code, font })} ${name} · ${code}`}
          </option>
        ))}
        <option value={CUSTOM_CURRENCY}>
          {isCustom ? `Custom (${selected})` : "Custom…"}
        </option>
      </NativeSelect>
    </div>
  );
}
