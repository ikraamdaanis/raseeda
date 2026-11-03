import { addDays, format } from "date-fns";
import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";
import {
  DEFAULT_CURRENCY_CONVERSION,
  DEFAULT_INVOICE_DATE_FORMAT,
  DEFAULT_INVOICE_SECTIONS,
  DEFAULT_INVOICE_THEME
} from "~/schema/invoice";
import { migrateInvoiceData } from "~/schema/migrations";
import type {
  Invoice,
  InvoiceClient,
  InvoiceItem,
  InvoiceLabels,
  InvoicePaymentDetails,
  InvoiceSectionKey,
  InvoiceSeller,
  InvoiceTerms,
  InvoiceTheme,
  PdfSettings,
  TableSettings
} from "~/types";
import {
  isSameCurrency,
  pickSecondCurrency
} from "~/utils/currency-conversion";

export const invoiceDefault: Invoice = {
  id: "1",
  title: "Invoice",
  image: "",
  number: "INV-0001",
  poNumber: "",
  // Dates are stamped per invoice in createBlankInvoice(), not baked in here.
  // Keeping the module-level default static (empty) means every isolate renders
  // the same first paint, so a server crossing midnight can't disagree with the
  // client's local date and trigger a hydration mismatch.
  invoiceDate: "",
  dueDate: "",
  servicePeriod: "",
  supplyDate: "",
  seller: {
    label: "From",
    content: "",
    placeholder:
      "Acme Inc.\n123 Main St.\nAnytown, USA 12345\n(555) 555-5555\ninfo@acmeinc.com"
  },
  client: {
    label: "To",
    content: "",
    placeholder:
      "John Doe\n123 Main St.\nAnytown, USA 12345\n(555) 555-5555\njohn.doe@example.com"
  },
  shipping: {
    label: "Ship to",
    content: "",
    placeholder:
      "John Doe\n456 Delivery Rd.\nAnytown, USA 12345\n(555) 555-5555"
  },
  items: [
    {
      id: crypto.randomUUID(),
      description: "Item 1",
      quantity: 1,
      unit: "",
      unitPrice: 0
    }
  ],
  tableSettings: {
    columnLabels: {
      description: "Item",
      quantity: "Quantity",
      unit: "Unit",
      unitPrice: "Unit Price",
      amount: "Amount"
    },
    backgroundColor: "#f9fafb",
    borderColor: "#e5e7eb"
  },
  labels: {
    invoiceNumber: "Invoice No.",
    invoiceDate: "Date",
    paymentDue: "Due date",
    poNumber: "PO number",
    servicePeriod: "Service period",
    supplyDate: "Date of supply",
    subtotal: "Subtotal",
    tax: "Tax",
    fees: "Fees",
    discounts: "Discounts",
    total: "Total",
    amountPaid: "Amount paid",
    balanceDue: "Balance due"
  },
  tax: {
    percentage: 0,
    exempt: false,
    note: "",
    perLine: false
  },
  fees: 0,
  discounts: 0,
  discountType: "fixed",
  amountPaid: 0,
  paidDate: "",
  currencyConversion: DEFAULT_CURRENCY_CONVERSION,
  terms: {
    label: "Terms and conditions",
    content: ""
  },
  notes: {
    label: "Notes",
    content: ""
  },
  latePayment: {
    label: "Late payment",
    content: ""
  },
  paymentDetails: {
    label: "Payment details",
    bankName: "",
    accountName: "",
    accountNumber: "",
    routingNumber: "",
    iban: "",
    bic: "",
    sortCode: "",
    terms: ""
  },
  pdfSettings: {
    backgroundColor: "#ffffff"
  },
  currency: "$",
  currencyCode: "USD",
  theme: DEFAULT_INVOICE_THEME,
  sections: DEFAULT_INVOICE_SECTIONS,
  dateFormat: DEFAULT_INVOICE_DATE_FORMAT
};

/**
 * The single factory that seeds a fresh, blank invoice. Every new invoice is
 * created here. A new invoice always starts blank (including a static default
 * number the user edits inline); the returned invoice is a fully independent
 * snapshot, never sharing nested objects with the default. The invoice and due
 * dates are stamped from the clock at call time (due 30 days out), so an invoice
 * created today is dated today rather than whenever the module was loaded.
 */
export function createBlankInvoice(): Invoice {
  const now = new Date();

  return {
    ...structuredClone(invoiceDefault),
    invoiceDate: format(now, "yyyy-MM-dd"),
    dueDate: format(addDays(now, 30), "yyyy-MM-dd"),
    items: invoiceDefault.items.map(item => ({
      ...item,
      id: crypto.randomUUID()
    }))
  };
}

// Helper to apply updater (value or function)
function applyUpdater<T>(current: T, updater: T | ((prev: T) => T)): T {
  return typeof updater === "function"
    ? (updater as (prev: T) => T)(current)
    : updater;
}

// Actions type
interface InvoiceActions {
  // Whole state operations
  setInvoice: (invoice: Invoice) => void;
  resetInvoice: () => void;

  // Theme
  setTheme: (
    theme: InvoiceTheme | ((prev: InvoiceTheme) => InvoiceTheme)
  ) => void;

  // Sections
  setSection: (section: InvoiceSectionKey, on: boolean) => void;

  // Dates
  setDateFormat: (dateFormat: Invoice["dateFormat"]) => void;

  // Title
  setTitle: (title: string) => void;

  // Image
  setImage: (image: string) => void;

  // Currency
  setCurrency: (
    currency: Invoice["currency"],
    currencyCode: Invoice["currencyCode"]
  ) => void;

  // Seller
  setSeller: (
    seller: InvoiceSeller | ((prev: InvoiceSeller) => InvoiceSeller)
  ) => void;

  // Client
  setClient: (
    client: InvoiceClient | ((prev: InvoiceClient) => InvoiceClient)
  ) => void;

  // Shipping
  setShipping: (
    shipping:
      Invoice["shipping"] | ((prev: Invoice["shipping"]) => Invoice["shipping"])
  ) => void;

  // Details
  setNumber: (number: string) => void;
  setPoNumber: (poNumber: string) => void;
  setInvoiceDate: (date: string) => void;
  setDueDate: (date: string) => void;
  setServicePeriod: (servicePeriod: string) => void;
  setSupplyDate: (date: string) => void;

  // Labels
  setLabels: (
    labels: InvoiceLabels | ((prev: InvoiceLabels) => InvoiceLabels)
  ) => void;

  // Line Items
  setTableSettings: (
    settings: TableSettings | ((prev: TableSettings) => TableSettings)
  ) => void;
  addItem: (item: InvoiceItem) => void;
  removeItem: (itemId: string) => void;
  updateItem: (
    index: number,
    field: keyof InvoiceItem,
    value: string | number
  ) => void;

  // Pricing
  setTax: (
    tax: Invoice["tax"] | ((prev: Invoice["tax"]) => Invoice["tax"])
  ) => void;
  setFees: (fees: number) => void;
  setDiscounts: (discounts: number) => void;
  setDiscountType: (discountType: Invoice["discountType"]) => void;
  setAmountPaid: (amountPaid: number) => void;
  setPaidDate: (paidDate: string) => void;
  setSecondCurrency: (
    currency: Invoice["currency"],
    currencyCode: Invoice["currencyCode"]
  ) => void;
  setCurrencyConversion: (
    currencyConversion:
      | Invoice["currencyConversion"]
      | ((prev: Invoice["currencyConversion"]) => Invoice["currencyConversion"])
  ) => void;

  // Terms
  setTerms: (
    terms: InvoiceTerms | ((prev: InvoiceTerms) => InvoiceTerms)
  ) => void;

  // Notes
  setNotes: (
    notes: InvoiceTerms | ((prev: InvoiceTerms) => InvoiceTerms)
  ) => void;

  // Late payment
  setLatePayment: (
    latePayment: InvoiceTerms | ((prev: InvoiceTerms) => InvoiceTerms)
  ) => void;

  // Payment details
  setPaymentDetails: (
    paymentDetails:
      | InvoicePaymentDetails
      | ((prev: InvoicePaymentDetails) => InvoicePaymentDetails)
  ) => void;

  // PDF
  setPdfSettings: (
    settings: PdfSettings | ((prev: PdfSettings) => PdfSettings)
  ) => void;
}

export type InvoiceStore = Invoice & InvoiceActions;

export const useInvoiceStore = create<InvoiceStore>()(
  subscribeWithSelector(
    immer(set => ({
      // Initial state
      ...invoiceDefault,

      // Whole state operations
      setInvoice: invoice =>
        set(() => {
          // Validate + migrate any legacy/imported shape to the current schema.
          // Totals are derived at render, so there is nothing to recompute here.
          return migrateInvoiceData(invoice);
        }),

      resetInvoice: () =>
        set(() => {
          // Route blank creation through the single factory.
          return createBlankInvoice();
        }),

      // Theme
      setTheme: theme =>
        set(state => {
          state.theme = applyUpdater(state.theme, theme);
        }),

      // Sections
      setSection: (section, on) =>
        set(state => {
          state.sections[section] = on;
        }),

      // Dates
      setDateFormat: dateFormat =>
        set(state => {
          state.dateFormat = dateFormat;
        }),

      // Title
      setTitle: title =>
        set(state => {
          state.title = title;
        }),

      // Image
      setImage: image =>
        set(state => {
          state.image = image;
        }),

      // Currency. A rate quoted for the old currency would be wrong for the
      // new one, so it's cleared with its date, and a second currency the
      // invoice now matches moves to another.
      setCurrency: (currency, currencyCode) =>
        set(state => {
          const next = { currency, currencyCode };
          const conversion = state.currencyConversion;
          const matchesSecond = isSameCurrency(next, conversion);

          if (!isSameCurrency(state, next) || matchesSecond) {
            conversion.rate = 0;
            conversion.date = "";
          }

          if (matchesSecond) {
            Object.assign(conversion, pickSecondCurrency(next));
          }

          state.currency = currency;
          state.currencyCode = currencyCode;
        }),

      // Seller
      setSeller: seller =>
        set(state => {
          state.seller = applyUpdater(state.seller, seller);
        }),

      // Client
      setClient: client =>
        set(state => {
          state.client = applyUpdater(state.client, client);
        }),

      // Shipping
      setShipping: shipping =>
        set(state => {
          state.shipping = applyUpdater(state.shipping, shipping);
        }),

      // Details
      setNumber: number =>
        set(state => {
          state.number = number;
        }),

      setPoNumber: poNumber =>
        set(state => {
          state.poNumber = poNumber;
        }),

      setInvoiceDate: date =>
        set(state => {
          state.invoiceDate = date;
        }),

      setDueDate: date =>
        set(state => {
          state.dueDate = date;
        }),

      setServicePeriod: servicePeriod =>
        set(state => {
          state.servicePeriod = servicePeriod;
        }),

      setSupplyDate: date =>
        set(state => {
          state.supplyDate = date;
        }),

      // Labels
      setLabels: labels =>
        set(state => {
          state.labels = applyUpdater(state.labels, labels);
        }),

      // Line Items
      setTableSettings: settings =>
        set(state => {
          state.tableSettings = applyUpdater(state.tableSettings, settings);
        }),

      addItem: item =>
        set(state => {
          state.items.push(item);
        }),

      removeItem: itemId =>
        set(state => {
          state.items = state.items.filter(item => item.id !== itemId);
        }),

      updateItem: (index, field, value) =>
        set(state => {
          // A late blur can name a row that has since been removed.
          if (index < 0 || index >= state.items.length) return;

          const item = state.items[index];

          switch (field) {
            case "id":
            case "description":
            case "unit":
              item[field] = String(value);
              break;
            case "quantity":
            case "unitPrice":
              item[field] = Number(value);
              break;
          }
        }),

      // Pricing
      setTax: tax =>
        set(state => {
          state.tax = applyUpdater(state.tax, tax);
        }),

      setFees: fees =>
        set(state => {
          state.fees = fees;
        }),

      setDiscounts: discounts =>
        set(state => {
          state.discounts = discounts;
        }),

      setDiscountType: discountType =>
        set(state => {
          state.discountType = discountType;

          // A fixed amount larger than 100 becomes an impossible percentage on
          // toggle (the % input itself caps at 100), so clamp it rather than
          // silently discounting the whole invoice.
          if (discountType === "percentage" && state.discounts > 100) {
            state.discounts = 100;
          }
        }),

      setAmountPaid: amountPaid =>
        set(state => {
          state.amountPaid = amountPaid;
        }),

      setPaidDate: paidDate =>
        set(state => {
          state.paidDate = paidDate;
        }),

      // Like the invoice currency, a new second currency clears the old rate.
      setSecondCurrency: (currency, currencyCode) =>
        set(state => {
          const conversion = state.currencyConversion;
          const next = { currency, currencyCode };

          if (!isSameCurrency(conversion, next)) {
            conversion.rate = 0;
            conversion.date = "";
          }

          conversion.currency = currency;
          conversion.currencyCode = currencyCode;
        }),

      setCurrencyConversion: currencyConversion =>
        set(state => {
          state.currencyConversion = applyUpdater(
            state.currencyConversion,
            currencyConversion
          );
        }),

      // Terms
      setTerms: terms =>
        set(state => {
          state.terms = applyUpdater(state.terms, terms);
        }),

      // Notes
      setNotes: notes =>
        set(state => {
          state.notes = applyUpdater(state.notes, notes);
        }),

      // Late payment
      setLatePayment: latePayment =>
        set(state => {
          state.latePayment = applyUpdater(state.latePayment, latePayment);
        }),

      // Payment details
      setPaymentDetails: paymentDetails =>
        set(state => {
          state.paymentDetails = applyUpdater(
            state.paymentDetails,
            paymentDetails
          );
        }),

      // PDF
      setPdfSettings: settings =>
        set(state => {
          state.pdfSettings = applyUpdater(state.pdfSettings, settings);
        })
    }))
  )
);
