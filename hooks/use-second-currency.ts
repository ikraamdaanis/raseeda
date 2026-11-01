import { useShallow } from "zustand/react/shallow";
import { useInvoiceStore } from "~/stores/invoice-store";
import {
  isSameCurrency,
  pickSecondCurrency
} from "~/utils/currency-conversion";

// Adds and removes the invoice's second currency. Adding one that would match
// the invoice's own currency picks another, so something always shows.
export function useSecondCurrency() {
  const { isOn, currency, currencyCode, target, setSection, setTarget } =
    useInvoiceStore(
      useShallow(state => ({
        isOn: state.sections.currencyConversion,
        currency: state.currency,
        currencyCode: state.currencyCode,
        target: state.currencyConversion,
        setSection: state.setSection,
        setTarget: state.setCurrencyConversion
      }))
    );

  function add() {
    const invoice = { currency, currencyCode };

    if (isSameCurrency(invoice, target)) {
      setTarget(prev => ({ ...prev, ...pickSecondCurrency(invoice) }));
    }

    setSection("currencyConversion", true);
  }

  function remove() {
    setSection("currencyConversion", false);
  }

  return { isOn, add, remove };
}
