import { useShallow } from "zustand/react/shallow";
import { getMoneyFormat } from "~/consts/currencies";
import type { InvoiceStore } from "~/stores/invoice-store";
import { useInvoiceStore } from "~/stores/invoice-store";
import type { Invoice, InvoiceTotals, MoneyFormat } from "~/types";
import { calculateInvoiceTotals } from "~/utils/calculate-invoice-totals";
import {
  calculateConvertedTotals,
  getCurrencyConversion
} from "~/utils/currency-conversion";

// The persisted invoice fields, in one place. `satisfies` rejects typos and
// keys that aren't on Invoice; the MissingKey assertion below rejects forgetting
// a key, so adding a field to Invoice forces adding it here (or the build fails).
export const INVOICE_DATA_KEYS = [
  "id",
  // Ahead of the title and labels it changes, so undo names a type change
  // after the type (stores/invoice-history.ts takes the first key changed).
  "documentType",
  "title",
  "image",
  "number",
  "refersTo",
  "poNumber",
  "invoiceDate",
  "dueDate",
  "servicePeriod",
  "supplyDate",
  "seller",
  "client",
  "shipping",
  "items",
  "tableSettings",
  "labels",
  "tax",
  "fees",
  "discounts",
  "discountType",
  "amountPaid",
  "paidDate",
  "currencyConversion",
  "terms",
  "notes",
  "latePayment",
  "paymentDetails",
  "pdfSettings",
  "currency",
  "currencyCode",
  "theme",
  "sections",
  "dateFormat",
  "numberFormat",
  "currencyPosition",
  "paperSize"
] as const satisfies ReadonlyArray<keyof Invoice>;

type MissingInvoiceKey = Exclude<
  keyof Invoice,
  (typeof INVOICE_DATA_KEYS)[number]
>;
// Runtime no-op whose only job is the compile-time constraint: a non-never type
// argument (an Invoice key missing from the list above) fails to type-check.
function assertAllInvoiceKeysListed<TMissing extends never>(): TMissing[] {
  return [];
}
assertAllInvoiceKeysListed<MissingInvoiceKey>();

// Picks the persisted invoice fields out of the store state, dropping the
// action methods. Shared by the useInvoiceData hook and imperative reads
// (e.g. provider document actions) so the shape stays in one place.
export function selectInvoiceData(state: InvoiceStore): Invoice {
  return Object.fromEntries(
    INVOICE_DATA_KEYS.map(key => [key, state[key]])
  ) as Invoice;
}

// Theme slice - global font / size / accent for the whole invoice
export function useThemeSlice() {
  return useInvoiceStore(
    useShallow(state => ({
      theme: state.theme,
      setTheme: state.setTheme
    }))
  );
}

// Sections slice - which optional parts of the invoice are switched on
export function useSectionsSlice() {
  return useInvoiceStore(
    useShallow(state => ({
      sections: state.sections,
      setSection: state.setSection
    }))
  );
}

// Theme value only - for components that render styled text but don't edit it
export function useTheme() {
  return useInvoiceStore(state => state.theme);
}

// Title slice
export function useTitleSlice() {
  return useInvoiceStore(
    useShallow(state => ({
      title: state.title,
      setTitle: state.setTitle
    }))
  );
}

// Seller slice
export function useSellerSlice() {
  return useInvoiceStore(
    useShallow(state => ({
      seller: state.seller,
      setSeller: state.setSeller
    }))
  );
}

// Client slice
export function useClientSlice() {
  return useInvoiceStore(
    useShallow(state => ({
      client: state.client,
      setClient: state.setClient
    }))
  );
}

// Details slice
export function useDetailsSlice() {
  return useInvoiceStore(
    useShallow(state => ({
      number: state.number,
      refersTo: state.refersTo,
      poNumber: state.poNumber,
      invoiceDate: state.invoiceDate,
      dueDate: state.dueDate,
      servicePeriod: state.servicePeriod,
      supplyDate: state.supplyDate,
      dateFormat: state.dateFormat,
      labels: state.labels,
      setNumber: state.setNumber,
      setRefersTo: state.setRefersTo,
      setPoNumber: state.setPoNumber,
      setInvoiceDate: state.setInvoiceDate,
      setDueDate: state.setDueDate,
      setServicePeriod: state.setServicePeriod,
      setSupplyDate: state.setSupplyDate,
      setDateFormat: state.setDateFormat,
      setLabels: state.setLabels
    }))
  );
}

// Shipping slice
export function useShippingSlice() {
  return useInvoiceStore(
    useShallow(state => ({
      shipping: state.shipping,
      setShipping: state.setShipping
    }))
  );
}

// Line items slice
export function useLineItemsSlice() {
  return useInvoiceStore(
    useShallow(state => ({
      items: state.items,
      tableSettings: state.tableSettings,
      addItem: state.addItem,
      removeItem: state.removeItem,
      updateItem: state.updateItem,
      setItemTax: state.setItemTax,
      setItemAmount: state.setItemAmount,
      setTableSettings: state.setTableSettings
    }))
  );
}

// Table settings slice - the line items' columns, their labels and colours,
// with the tax row's label (the Tax column's until it has its own) and the
// Per line switch
export function useTableSettingsSlice() {
  return useInvoiceStore(
    useShallow(state => ({
      tableSettings: state.tableSettings,
      taxLabel: state.labels.tax,
      hasTax: state.sections.tax,
      isPerLine: state.tax.perLine,
      setTableSettings: state.setTableSettings,
      setTax: state.setTax
    }))
  );
}

// The tax row's Exempt setting, for the inspector's switch
export function useTaxExemptSlice() {
  return useInvoiceStore(
    useShallow(state => ({
      isExempt: state.tax.exempt,
      isPerLine: state.tax.perLine,
      setTax: state.setTax
    }))
  );
}

// Pricing slice (inputs only; the derived totals come from useInvoiceTotals)
export function usePricingSlice() {
  return useInvoiceStore(
    useShallow(state => ({
      tax: state.tax,
      fees: state.fees,
      discounts: state.discounts,
      discountType: state.discountType,
      amountPaid: state.amountPaid,
      paidDate: state.paidDate,
      currencyCode: state.currencyCode,
      labels: state.labels,
      setTax: state.setTax,
      setFees: state.setFees,
      setDiscounts: state.setDiscounts,
      setDiscountType: state.setDiscountType,
      setAmountPaid: state.setAmountPaid,
      setPaidDate: state.setPaidDate,
      setLabels: state.setLabels
    }))
  );
}

// Currency conversion slice - the second currency and the rate to it
export function useCurrencyConversionSlice() {
  return useInvoiceStore(
    useShallow(state => ({
      currencyConversion: state.currencyConversion,
      dateFormat: state.dateFormat,
      numberFormat: state.numberFormat,
      setCurrencyConversion: state.setCurrencyConversion,
      setSecondCurrency: state.setSecondCurrency
    }))
  );
}

// Derived money totals (subtotal, tax amount, discount amount, grand total,
// amount paid, balance due), recomputed from the pricing inputs. Returns plain
// numbers so shallow equality only fires a re-render when a total actually
// changes, not on every unrelated edit.
export function useInvoiceTotals(): {
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  total: number;
  amountPaid: number;
  balanceDue: number;
} {
  return useInvoiceStore(
    useShallow(state => {
      const totals = calculateInvoiceTotals({
        documentType: state.documentType,
        items: state.items,
        tax: state.tax,
        fees: state.fees,
        discounts: state.discounts,
        discountType: state.discountType,
        amountPaid: state.amountPaid,
        currency: state.currency,
        currencyCode: state.currencyCode,
        sections: state.sections
      });

      return {
        subtotal: totals.subtotal,
        taxAmount: totals.taxAmount,
        discountAmount: totals.discountAmount,
        total: totals.total,
        amountPaid: totals.amountPaid,
        balanceDue: totals.balanceDue
      };
    })
  );
}

const NO_CONVERTED_TOTALS = {
  subtotal: 0,
  total: 0,
  amountPaid: 0,
  balanceDue: 0
};

// The subtotal, total, amount paid and balance due in the second currency,
// each added up from the converted rows above it. All 0 while there's no conversion.
export function useConvertedTotals(): {
  subtotal: number;
  total: number;
  amountPaid: number;
  balanceDue: number;
} {
  return useInvoiceStore(
    useShallow(state => {
      const conversion = getCurrencyConversion(state);

      if (!conversion) return NO_CONVERTED_TOTALS;

      return calculateConvertedTotals({
        totals: calculateInvoiceTotals(state),
        conversion
      });
    })
  );
}

// The tax groups behind the totals' tax rows, one per rate the lines are
// taxed at, recomputed from the pricing inputs.
export function useTaxGroups(): Pick<InvoiceTotals, "taxGroups" | "taxAmount"> {
  const pricing = useInvoiceStore(
    useShallow(state => ({
      documentType: state.documentType,
      items: state.items,
      tax: state.tax,
      fees: state.fees,
      discounts: state.discounts,
      discountType: state.discountType,
      amountPaid: state.amountPaid,
      currency: state.currency,
      currencyCode: state.currencyCode,
      sections: state.sections
    }))
  );
  const { taxGroups, taxAmount } = calculateInvoiceTotals(pricing);

  return { taxGroups, taxAmount };
}

// Terms slice
export function useTermsSlice() {
  return useInvoiceStore(
    useShallow(state => ({
      terms: state.terms,
      setTerms: state.setTerms
    }))
  );
}

// Notes slice
export function useNotesSlice() {
  return useInvoiceStore(
    useShallow(state => ({
      notes: state.notes,
      setNotes: state.setNotes
    }))
  );
}

// Late payment slice
export function useLatePaymentSlice() {
  return useInvoiceStore(
    useShallow(state => ({
      latePayment: state.latePayment,
      setLatePayment: state.setLatePayment
    }))
  );
}

// Payment details slice
export function usePaymentDetailsSlice() {
  return useInvoiceStore(
    useShallow(state => ({
      paymentDetails: state.paymentDetails,
      setPaymentDetails: state.setPaymentDetails
    }))
  );
}

// Image slice
export function useImageSlice() {
  return useInvoiceStore(
    useShallow(state => ({
      image: state.image,
      setImage: state.setImage
    }))
  );
}

// Currency slice (for main settings)
export function useCurrencySlice() {
  return useInvoiceStore(
    useShallow(state => ({
      currency: state.currency,
      currencyCode: state.currencyCode,
      setCurrency: state.setCurrency
    }))
  );
}

// The document's type, for the inspector's Type row.
export function useDocumentTypeSlice() {
  return useInvoiceStore(
    useShallow(state => ({
      documentType: state.documentType,
      setDocumentType: state.setDocumentType
    }))
  );
}

export function useDocumentType() {
  return useInvoiceStore(state => state.documentType);
}

// The invoice's paper size, for the inspector's Paper row.
export function usePaperSizeSlice() {
  return useInvoiceStore(
    useShallow(state => ({
      paperSize: state.paperSize,
      setPaperSize: state.setPaperSize
    }))
  );
}

export function usePaperSize() {
  return useInvoiceStore(state => state.paperSize);
}

// How amounts are written, for the inspector's Number format and Currency
// position rows.
export function useAmountFormatSlice() {
  return useInvoiceStore(
    useShallow(state => ({
      numberFormat: state.numberFormat,
      currencyPosition: state.currencyPosition,
      setNumberFormat: state.setNumberFormat,
      setCurrencyPosition: state.setCurrencyPosition
    }))
  );
}

// How the invoice writes its amounts: its currency's marker in its font.
export function useMoneyFormat(): MoneyFormat {
  return useInvoiceStore(useShallow(getMoneyFormat));
}

// Full invoice data for serialization (save/load)
// This extracts only the Invoice data, not actions
export function useInvoiceData(): Invoice {
  return useInvoiceStore(useShallow(selectInvoiceData));
}

// Actions only (stable references, won't cause re-renders on data changes)
export function useInvoiceActions() {
  return useInvoiceStore(
    useShallow(state => ({
      setInvoice: state.setInvoice,
      resetInvoice: state.resetInvoice
    }))
  );
}

// For components that need both data and actions (like file menu)
export function useInvoiceDataAndActions() {
  const invoice = useInvoiceData();
  const actions = useInvoiceActions();
  return { invoice, ...actions };
}
