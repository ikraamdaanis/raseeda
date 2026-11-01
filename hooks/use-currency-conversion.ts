import { useShallow } from "zustand/react/shallow";
import { useShownSections } from "~/hooks/use-shown-sections";
import { useInvoiceStore } from "~/stores/invoice-store";
import type { CurrencyConversion } from "~/types";
import { getCurrencyConversion } from "~/utils/currency-conversion";

// The conversion the page shows right now: while editing, whenever it's
// switched on (so the rate can be typed); in Preview, only once it has a
// rate, as in the PDF.
export function useCurrencyConversion(): CurrencyConversion | null {
  const isShown = useShownSections().currencyConversion;
  const conversion = useInvoiceStore(useShallow(getCurrencyConversion));

  return isShown ? conversion : null;
}
