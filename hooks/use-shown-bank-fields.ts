import { useState } from "react";
import { usePaymentDetailsSlice } from "~/stores/invoice-selectors";
import { useInvoiceStore } from "~/stores/invoice-store";
import {
  getUsualBankFields,
  PAYMENT_BANK_FIELDS
} from "~/utils/payment-details";

// The bank rows the editor offers: the ones the invoice's currency usually
// needs and any filled in, or all of them once showAll is called. A row once
// filled stays while the editor is open, so clearing it to retype doesn't
// take it away.
export function useShownBankFields() {
  const { paymentDetails } = usePaymentDetailsSlice();
  const currencyCode = useInvoiceStore(state => state.currencyCode);
  const [showsAll, setShowsAll] = useState(false);
  const [keptFields, setKeptFields] = useState<ReadonlySet<string>>(
    () => new Set()
  );
  const usualFields = getUsualBankFields(currencyCode);
  const filledFields = PAYMENT_BANK_FIELDS.filter(
    field => paymentDetails[field].trim() !== ""
  );
  const shownFields = PAYMENT_BANK_FIELDS.filter(
    field =>
      showsAll ||
      usualFields.includes(field) ||
      filledFields.includes(field) ||
      keptFields.has(field)
  );

  if (filledFields.some(field => !keptFields.has(field))) {
    setKeptFields(new Set([...keptFields, ...filledFields]));
  }

  return {
    shownFields,
    hasHiddenFields: shownFields.length < PAYMENT_BANK_FIELDS.length,
    showAll: () => setShowsAll(true)
  };
}
