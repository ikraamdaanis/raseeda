import { useState } from "react";
import { useInvoiceDocument } from "~/context/invoice-document-context";
import { usePaymentDetailsSlice } from "~/stores/invoice-selectors";
import { useInvoiceStore } from "~/stores/invoice-store";
import {
  getUsualBankFields,
  PAYMENT_BANK_FIELDS
} from "~/utils/payment-details";

// The bank rows the editor offers: the ones the invoice's currency usually
// needs and any filled in, or all of them once showAll is called. A row once
// filled stays while the document is open, so clearing it to retype doesn't
// take it away; another document starts afresh.
export function useShownBankFields() {
  const { paymentDetails } = usePaymentDetailsSlice();
  const currencyCode = useInvoiceStore(state => state.currencyCode);
  const { currentDocumentId } = useInvoiceDocument();
  const [shownFor, setShownFor] = useState(currentDocumentId);
  const [showsAll, setShowsAll] = useState(false);
  const [keptFields, setKeptFields] = useState<ReadonlySet<string>>(
    () => new Set()
  );

  // Another document starts afresh, read as such in this render too.
  const isNewDocument = shownFor !== currentDocumentId;
  const showsAllHere = !isNewDocument && showsAll;
  const keptHere: ReadonlySet<string> = isNewDocument ? new Set() : keptFields;
  const usualFields = getUsualBankFields(currencyCode);
  const filledFields = PAYMENT_BANK_FIELDS.filter(
    field => paymentDetails[field].trim() !== ""
  );
  const shownFields = PAYMENT_BANK_FIELDS.filter(
    field =>
      showsAllHere ||
      usualFields.includes(field) ||
      filledFields.includes(field) ||
      keptHere.has(field)
  );

  if (isNewDocument) {
    setShownFor(currentDocumentId);
    setShowsAll(false);
  }

  if (isNewDocument || filledFields.some(field => !keptHere.has(field))) {
    setKeptFields(new Set([...keptHere, ...filledFields]));
  }

  return {
    shownFields,
    hasHiddenFields: shownFields.length < PAYMENT_BANK_FIELDS.length,
    showAll: () => setShowsAll(true)
  };
}
