import { IconPlus, IconX } from "@tabler/icons-react";
import type { CSSProperties, ReactNode } from "react";
import { useState } from "react";
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
import { cn } from "~/lib/utils";
import {
  useCurrencyConversionSlice,
  useCurrencySlice,
  useTheme
} from "~/stores/invoice-selectors";
import { isSameCurrency } from "~/utils/currency-conversion";

const CUSTOM_CURRENCY = "__custom";
const CURRENCY_ID = "invoice-currency";
const SECOND_CURRENCY_ID = "invoice-second-currency";

/**
 * The total on the page, which in Edit mode opens the invoice's currency and
 * the second one its amounts are also shown in. The custom currency dialog
 * sits outside the popover, so it stays open once the popover closes.
 */
export function CurrencyPopover({
  label,
  className,
  style,
  children
}: {
  label: string;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
}) {
  const { currency, currencyCode, setCurrency } = useCurrencySlice();
  const { currencyConversion, setSecondCurrency } =
    useCurrencyConversionSlice();
  const secondCurrency = useSecondCurrency();
  const [open, setOpen] = useState(false);
  const [customFor, setCustomFor] = useState<"currency" | "second" | null>(
    null
  );
  const invoiceCurrency = { currency, currencyCode };

  function openCustom(target: "currency" | "second") {
    setOpen(false);
    setCustomFor(target);
  }

  // Focus follows the second currency: to its picker once added, back to the
  // add button once removed.
  function handleAdd() {
    flushSync(secondCurrency.add);
    document.getElementById(SECOND_CURRENCY_ID)?.focus();
  }

  function handleRemove() {
    flushSync(secondCurrency.remove);
    document.getElementById(`${SECOND_CURRENCY_ID}-add`)?.focus();
  }

  const customTarget =
    customFor === "second"
      ? {
          currency: currencyConversion.currency,
          currencyCode: currencyConversion.currencyCode
        }
      : invoiceCurrency;
  const isCustom = !currencyOptions.some(
    option => option.symbol === normalizeCurrency(customTarget.currency)
  );

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          aria-label={label}
          className={cn(
            "rounded-surface hover:bg-brand-50 aria-expanded:bg-brand-50 focus-visible:border-brand-500 -mx-px border border-transparent outline-none",
            className
          )}
          style={style}
        >
          {children}
        </PopoverTrigger>
        <PopoverContent align="end" className="w-80 gap-3">
          <CurrencySelect
            id={CURRENCY_ID}
            label="Currency"
            currency={currency}
            onChange={setCurrency}
            onCustom={() => openCustom("currency")}
          />
          {secondCurrency.isOn ? (
            <div className="flex flex-col gap-1">
              <CurrencySelect
                id={SECOND_CURRENCY_ID}
                label="Also show in"
                currency={currencyConversion.currency}
                exclude={invoiceCurrency}
                onChange={setSecondCurrency}
                onCustom={() => openCustom("second")}
              />
              <button
                type="button"
                onClick={handleRemove}
                className="text-muted-foreground hover:text-foreground focus-visible:ring-ring -mx-1 flex h-6 w-fit items-center gap-1 rounded-md px-1 text-xs outline-none focus-visible:ring-1 pointer-coarse:h-11"
              >
                <IconX aria-hidden="true" className="size-3.5 shrink-0" />
                Remove second currency
              </button>
            </div>
          ) : (
            <button
              id={`${SECOND_CURRENCY_ID}-add`}
              type="button"
              onClick={handleAdd}
              className="text-muted-foreground hover:text-foreground focus-visible:ring-ring -mx-1 flex h-6 w-fit items-center gap-1 rounded-md px-1 text-xs outline-none focus-visible:ring-1 pointer-coarse:h-11"
            >
              <IconPlus aria-hidden="true" className="size-3.5 shrink-0" />
              Also show in another currency
            </button>
          )}
        </PopoverContent>
      </Popover>
      <CustomCurrencyDialog
        open={customFor !== null}
        onOpenChange={isOpen => {
          if (!isOpen) setCustomFor(null);
        }}
        currentSymbol={isCustom ? normalizeCurrency(customTarget.currency) : ""}
        currentCode={isCustom ? customTarget.currencyCode : ""}
        title={customFor === "second" ? "Custom second currency" : undefined}
        isTaken={(symbol, code) =>
          customFor === "second" &&
          isSameCurrency(invoiceCurrency, {
            currency: symbol,
            currencyCode: code
          })
        }
        onSubmit={customFor === "second" ? setSecondCurrency : setCurrency}
      />
    </>
  );
}

// Every preset currency and a custom one. The selected preset stays listed
// even when excluded, so the select never shows a currency the invoice
// doesn't have. A preset stores its symbol and its default ISO code together,
// so a bare "$" still carries an explicit code the user can override.
function CurrencySelect({
  id,
  label,
  currency,
  exclude,
  onChange,
  onCustom
}: {
  id: string;
  label: string;
  currency: string;
  exclude?: { currency: string; currencyCode: string };
  onChange: (symbol: string, code: string) => void;
  onCustom: () => void;
}) {
  const { font } = useTheme();
  const selected = normalizeCurrency(currency);
  const isCustom = !currencyOptions.some(option => option.symbol === selected);
  const options = currencyOptions.filter(
    option =>
      option.symbol === selected ||
      !exclude ||
      !isSameCurrency(exclude, {
        currency: option.symbol,
        currencyCode: option.code
      })
  );

  function handleChange(value: string) {
    if (value === CUSTOM_CURRENCY) {
      onCustom();

      return;
    }

    onChange(value, getCurrencyCodeForSymbol(value));
  }

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-muted-foreground text-[13px]">
        {label}
      </label>
      <NativeSelect
        id={id}
        value={isCustom ? CUSTOM_CURRENCY : selected}
        onChange={event => handleChange(event.target.value)}
        className={cn(inspectorFieldClassName, "pr-7")}
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
