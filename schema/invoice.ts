import { z } from "zod";
import { getAvailableFontWeights } from "~/consts/invoice-fonts";
import "~/lib/configure-zod";

// The Zod schema is the single source of truth for the persisted invoice shape.
// Every field is resilient (`.catch(...)`): parsing a partial, legacy, or
// corrupt record yields a valid invoice with sensible defaults rather than
// throwing, so stored data is repaired in place and never dropped. Derived money
// fields (subtotal, total, per-item amount, tax.amount) are intentionally absent
// and stripped on parse, since totals are computed at render.

export const CURRENT_INVOICE_SCHEMA_VERSION = 4;

const INVOICE_FONTS = [
  "schibsted-grotesk",
  "geist",
  "inter",
  "bricolage-grotesque",
  "dm-sans",
  "ibm-plex-sans",
  "lora",
  "libre-baskerville",
  "geist-mono",
  "jetbrains-mono",
  "ibm-plex-mono"
] as const;

// What kind of document it is (issue #132). The type sets the default title
// and a few labels (consts/document-types.ts); everything else is shared.
export const DOCUMENT_TYPES = [
  "invoice",
  "quote",
  "proforma-invoice",
  "receipt",
  "credit-note"
] as const;

const FONT_WEIGHTS = ["Normal", "Medium", "Semibold", "Bold"] as const;
const INVOICE_SIZES = ["small", "medium", "large"] as const;

// A new invoice starts in Schibsted Grotesk, the app's own face.
export const DEFAULT_INVOICE_THEME = {
  font: "schibsted-grotesk",
  fontWeight: "Normal",
  size: "medium",
  accent: "#1a1a1a",
  textColor: "#1a1a1a"
} as const;

// A stored invoice with no usable theme was drawn in Geist, the default
// before Schibsted Grotesk, so repairing it keeps Geist rather than
// restyling saved work.
export const STORED_INVOICE_THEME_FALLBACK = {
  ...DEFAULT_INVOICE_THEME,
  font: "geist"
} as const;

const DEFAULT_LABELS = {
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
  balanceDue: "Balance due",
  refersTo: "Refers to invoice",
  paidBy: "Paid by"
} as const;

// How the invoice and due dates are written on the invoice (date-fns
// patterns). Dates are stored as yyyy-MM-dd whatever the display.
export const INVOICE_DATE_FORMATS = [
  "d MMM yyyy",
  "MMMM d, yyyy",
  "dd/MM/yyyy",
  "MM/dd/yyyy",
  "yyyy-MM-dd"
] as const;

export const DEFAULT_INVOICE_DATE_FORMAT = "d MMM yyyy";

// How amounts are written (issue #117): the grouping and decimal separators,
// named by those two in order. Formatted by raseeda itself, never Intl, so
// the editor, the PDF and the tests agree: 1,234.56 (UK, US), 1.234,56
// (Germany, Brazil), 1 234,56 with a no-break space (France, Poland),
// 1’234.56 (Switzerland), 12,34,567.89 (India).
export const INVOICE_NUMBER_FORMATS = [
  "comma-dot",
  "dot-comma",
  "space-comma",
  "apostrophe-dot",
  "indian"
] as const;

// Whether the currency's marker sits before the figure ($1,234.56) or after
// it (1.234,56 €).
export const CURRENCY_POSITIONS = ["before", "after"] as const;

// The page the PDF and the canvas are cut to: A4 (595.28 x 841.89 pt) or US
// Letter (612 x 792 pt), wider and shorter.
export const INVOICE_PAPER_SIZES = ["A4", "Letter"] as const;

// What an invoice stored before these settings existed reads as, so it
// prints exactly as it did. A new blank invoice takes the browser's locale
// instead (utils/locale-defaults.ts).
export const STORED_INVOICE_FORMATS = {
  numberFormat: "comma-dot",
  currencyPosition: "before",
  paperSize: "A4"
} as const;

// Which optional parts of the invoice are switched on. Switching one off hides
// it in the editor and the PDF, and leaves out its money from the totals, but
// keeps what was typed, so switching it back on restores it. An on section
// still only prints when it has something in it.
export const INVOICE_SECTION_KEYS = [
  "logo",
  "poNumber",
  "servicePeriod",
  "supplyDate",
  "shipping",
  "discounts",
  "tax",
  "fees",
  "amountPaid",
  "paidStamp",
  "currencyConversion",
  "paymentDetails",
  "notes",
  "terms",
  "latePayment"
] as const;

export const DEFAULT_INVOICE_SECTIONS = {
  logo: true,
  poNumber: true,
  servicePeriod: true,
  supplyDate: false,
  shipping: false,
  discounts: true,
  tax: true,
  fees: true,
  amountPaid: true,
  paidStamp: false,
  currencyConversion: false,
  paymentDetails: true,
  notes: false,
  terms: false,
  latePayment: false
} as const satisfies Record<(typeof INVOICE_SECTION_KEYS)[number], boolean>;

// What each bank field is called on the page. Renameable, so "Routing number"
// can read "BSB", "IFSC", "Transit number" or "CLABE".
export const DEFAULT_PAYMENT_LABELS = {
  bankName: "Bank name",
  accountName: "Account name",
  accountNumber: "Account number",
  routingNumber: "Routing number",
  iban: "IBAN",
  bic: "BIC / SWIFT",
  sortCode: "Sort code",
  paymentLink: "Pay online"
} as const;

const DEFAULT_PAYMENT_DETAILS = {
  label: "Payment details",
  labels: DEFAULT_PAYMENT_LABELS,
  bankName: "",
  accountName: "",
  accountNumber: "",
  routingNumber: "",
  iban: "",
  bic: "",
  sortCode: "",
  paymentLink: "",
  terms: ""
} as const;

// A second currency the invoice's amounts are also shown in (issue #99), at a
// rate typed in and stored with the invoice, so the converted figures never
// change after the fact.
export const DEFAULT_CURRENCY_CONVERSION = {
  currency: "$",
  currencyCode: "USD",
  rate: 0,
  date: "",
  source: "",
  showRate: true
} as const;

const DEFAULT_COLUMN_LABELS = {
  description: "Item",
  quantity: "Quantity",
  unit: "Unit",
  unitPrice: "Unit Price",
  tax: "",
  amount: ""
} as const;

const DEFAULT_TABLE_COLUMNS = { quantityAndPrice: true, unit: true } as const;

export const DEFAULT_TABLE_SETTINGS = {
  columnLabels: DEFAULT_COLUMN_LABELS,
  columns: DEFAULT_TABLE_COLUMNS,
  backgroundColor: "#f9fafb",
  borderColor: "#e5e7eb"
} as const;

function contactSchema(defaultLabel: string) {
  return z
    .object({
      label: z.string().catch(defaultLabel),
      content: z.string().catch(""),
      placeholder: z.string().catch("")
    })
    .catch({ label: defaultLabel, content: "", placeholder: "" });
}

// A labelled free-text block (notes, late-payment terms, etc.): a customizable
// heading plus content, mirroring the terms section. An empty block is
// suppressed at render.
function textSectionSchema(defaultLabel: string) {
  return z
    .object({
      label: z.string().catch(defaultLabel),
      content: z.string().catch("")
    })
    .catch({ label: defaultLabel, content: "" });
}

// Another way to be paid besides the bank (issue #117): a name ("PayPal",
// "Venmo", "Pix", or anything typed) and the detail to pay to, as typed (a
// handle, an email, a phone number, a Pix key). Printed below the bank
// fields; a method with no detail isn't.
const paymentMethodSchema = z.object({
  id: z.string().catch(""),
  name: z.string().catch(""),
  detail: z.string().catch("")
});

// Payment details mirror the terms section: a customizable label plus content.
// The content is a set of free-text bank fields, each with a renameable label,
// so they work across banking conventions (bank name, account name, account
// and routing numbers, IBAN, BIC/SWIFT, sort code), other ways to pay
// (`methods`), a link to pay online (`paymentLink`) and free-text instructions
// (e.g. "Net 30"). An all-empty section is suppressed at render.
const paymentDetailsSchema = z
  .object({
    label: z.string().catch(DEFAULT_PAYMENT_DETAILS.label),
    labels: z
      .object({
        bankName: z.string().catch(DEFAULT_PAYMENT_LABELS.bankName),
        accountName: z.string().catch(DEFAULT_PAYMENT_LABELS.accountName),
        accountNumber: z.string().catch(DEFAULT_PAYMENT_LABELS.accountNumber),
        routingNumber: z.string().catch(DEFAULT_PAYMENT_LABELS.routingNumber),
        iban: z.string().catch(DEFAULT_PAYMENT_LABELS.iban),
        bic: z.string().catch(DEFAULT_PAYMENT_LABELS.bic),
        sortCode: z.string().catch(DEFAULT_PAYMENT_LABELS.sortCode),
        paymentLink: z.string().catch(DEFAULT_PAYMENT_LABELS.paymentLink)
      })
      .catch(DEFAULT_PAYMENT_LABELS),
    // One bad entry drops only itself, as the line items do.
    methods: z
      .array(z.unknown())
      .catch([])
      .transform(methods =>
        methods.flatMap(method => {
          const parsed = paymentMethodSchema.safeParse(method);

          return parsed.success ? [parsed.data] : [];
        })
      ),
    bankName: z.string().catch(""),
    accountName: z.string().catch(""),
    accountNumber: z.string().catch(""),
    routingNumber: z.string().catch(""),
    iban: z.string().catch(""),
    bic: z.string().catch(""),
    sortCode: z.string().catch(""),
    // A link to pay online (issue #136), typed in and printed after the other
    // ways to pay; the PDF makes it clickable.
    paymentLink: z.string().catch(""),
    terms: z.string().catch("")
  })
  .catch(() => ({ ...DEFAULT_PAYMENT_DETAILS, methods: [] }));

const invoiceSectionsSchema = z
  .object({
    logo: z.boolean().catch(DEFAULT_INVOICE_SECTIONS.logo),
    poNumber: z.boolean().catch(DEFAULT_INVOICE_SECTIONS.poNumber),
    servicePeriod: z.boolean().catch(DEFAULT_INVOICE_SECTIONS.servicePeriod),
    supplyDate: z.boolean().catch(DEFAULT_INVOICE_SECTIONS.supplyDate),
    shipping: z.boolean().catch(DEFAULT_INVOICE_SECTIONS.shipping),
    discounts: z.boolean().catch(DEFAULT_INVOICE_SECTIONS.discounts),
    tax: z.boolean().catch(DEFAULT_INVOICE_SECTIONS.tax),
    fees: z.boolean().catch(DEFAULT_INVOICE_SECTIONS.fees),
    amountPaid: z.boolean().catch(DEFAULT_INVOICE_SECTIONS.amountPaid),
    paidStamp: z.boolean().catch(DEFAULT_INVOICE_SECTIONS.paidStamp),
    currencyConversion: z
      .boolean()
      .catch(DEFAULT_INVOICE_SECTIONS.currencyConversion),
    paymentDetails: z.boolean().catch(DEFAULT_INVOICE_SECTIONS.paymentDetails),
    notes: z.boolean().catch(DEFAULT_INVOICE_SECTIONS.notes),
    terms: z.boolean().catch(DEFAULT_INVOICE_SECTIONS.terms),
    latePayment: z.boolean().catch(DEFAULT_INVOICE_SECTIONS.latePayment)
  })
  .catch(DEFAULT_INVOICE_SECTIONS);

const invoiceItemSchema = z.object({
  id: z.string().catch(""),
  description: z.string().catch(""),
  quantity: z.coerce.number().catch(0),
  unit: z.string().catch(""),
  unitPrice: z.coerce.number().catch(0),
  // The line's own rate, used while the invoice's tax is per line. Without
  // one, the line takes the invoice's rate. As on the invoice, an exempt line
  // keeps its rate but charges none.
  tax: z
    .object({
      percentage: z.coerce.number().catch(0),
      exempt: z.boolean().catch(false)
    })
    .optional()
    .catch(undefined)
});

const invoiceThemeSchema = z
  .object({
    font: z.enum(INVOICE_FONTS).catch(STORED_INVOICE_THEME_FALLBACK.font),
    fontWeight: z
      .enum(FONT_WEIGHTS)
      .catch(STORED_INVOICE_THEME_FALLBACK.fontWeight),
    size: z.enum(INVOICE_SIZES).catch(STORED_INVOICE_THEME_FALLBACK.size),
    // The title, table header and grand total take the accent (issue #129);
    // every other piece of text takes the text colour.
    accent: z.string().catch(STORED_INVOICE_THEME_FALLBACK.accent),
    textColor: z.string().catch(STORED_INVOICE_THEME_FALLBACK.textColor)
  })
  // A stored weight may not be offered by the chosen font; fall back if so.
  .transform(theme => ({
    ...theme,
    fontWeight: getAvailableFontWeights(theme.font).includes(theme.fontWeight)
      ? theme.fontWeight
      : STORED_INVOICE_THEME_FALLBACK.fontWeight
  }))
  .catch(STORED_INVOICE_THEME_FALLBACK);

const tableSettingsSchema = z
  .object({
    columnLabels: z
      .object({
        description: z.string().catch(DEFAULT_COLUMN_LABELS.description),
        quantity: z.string().catch(DEFAULT_COLUMN_LABELS.quantity),
        unit: z.string().catch(DEFAULT_COLUMN_LABELS.unit),
        unitPrice: z.string().catch(DEFAULT_COLUMN_LABELS.unitPrice),
        tax: z.string().catch(DEFAULT_COLUMN_LABELS.tax),
        amount: z.string().catch(DEFAULT_COLUMN_LABELS.amount)
      })
      .catch(DEFAULT_COLUMN_LABELS),
    columns: z
      .object({
        quantityAndPrice: z
          .boolean()
          .catch(DEFAULT_TABLE_COLUMNS.quantityAndPrice),
        unit: z.boolean().catch(DEFAULT_TABLE_COLUMNS.unit)
      })
      .catch(DEFAULT_TABLE_COLUMNS),
    backgroundColor: z.string().catch(DEFAULT_TABLE_SETTINGS.backgroundColor),
    borderColor: z.string().catch(DEFAULT_TABLE_SETTINGS.borderColor)
  })
  .catch(DEFAULT_TABLE_SETTINGS);

const invoiceLabelsSchema = z
  .object({
    invoiceNumber: z.string().catch(DEFAULT_LABELS.invoiceNumber),
    invoiceDate: z.string().catch(DEFAULT_LABELS.invoiceDate),
    paymentDue: z.string().catch(DEFAULT_LABELS.paymentDue),
    poNumber: z.string().catch(DEFAULT_LABELS.poNumber),
    servicePeriod: z.string().catch(DEFAULT_LABELS.servicePeriod),
    supplyDate: z.string().catch(DEFAULT_LABELS.supplyDate),
    subtotal: z.string().catch(DEFAULT_LABELS.subtotal),
    tax: z.string().catch(DEFAULT_LABELS.tax),
    fees: z.string().catch(DEFAULT_LABELS.fees),
    discounts: z.string().catch(DEFAULT_LABELS.discounts),
    total: z.string().catch(DEFAULT_LABELS.total),
    amountPaid: z.string().catch(DEFAULT_LABELS.amountPaid),
    balanceDue: z.string().catch(DEFAULT_LABELS.balanceDue),
    refersTo: z.string().catch(DEFAULT_LABELS.refersTo),
    paidBy: z.string().catch(DEFAULT_LABELS.paidBy)
  })
  .catch(DEFAULT_LABELS);

export const invoiceSchema = z.object({
  id: z.string().catch("1"),
  documentType: z.enum(DOCUMENT_TYPES).catch("invoice"),
  title: z.string().catch("Invoice"),
  image: z.string().catch(""),
  number: z.string().catch("1"),
  // The invoice a credit note refers to, as printed text (issue #133);
  // nothing links the two documents. Only a credit note prints it.
  refersTo: z.string().catch(""),
  poNumber: z.string().catch(""),
  invoiceDate: z.string().catch(""),
  dueDate: z.string().catch(""),
  // How a receipt was paid ("Card", "Bank transfer"), as printed text. Only a
  // receipt prints it, under its date paid.
  paidBy: z.string().catch(""),
  servicePeriod: z.string().catch(""),
  supplyDate: z.string().catch(""),
  seller: contactSchema("From"),
  client: contactSchema("To"),
  shipping: contactSchema("Ship to"),
  // Resilience lives on each element, not the array: a single unparseable entry
  // (e.g. a `null` from a hand-edited or merge-conflicted backup) drops only
  // that entry, never the whole line-item list. Putting `.catch([])` on the
  // array instead would silently blank every item to recover from one bad one.
  items: z
    .array(z.unknown())
    .catch([])
    .transform(items =>
      items.flatMap(item => {
        const parsed = invoiceItemSchema.safeParse(item);

        return parsed.success ? [parsed.data] : [];
      })
    ),
  tableSettings: tableSettingsSchema,
  labels: invoiceLabelsSchema,
  // The invoice's tax rate, with a tax-exempt flag and a free-text note (e.g.
  // "Reverse charge"). When exempt, the rate is ignored and no tax is charged.
  // It's every line's rate unless `perLine` is on, when a line with a rate of
  // its own uses that instead (issue #102). Switched off, the lines' own rates
  // are kept but ignored. The note covers every exempt line.
  tax: z
    .object({
      percentage: z.coerce.number().catch(0),
      // Not z.coerce.boolean(): Boolean("false") is true, so a hand-edited
      // backup with `"exempt": "false"` would silently flip to exempt.
      exempt: z.boolean().catch(false),
      note: z.string().catch(""),
      perLine: z.boolean().catch(false)
    })
    .catch({ percentage: 0, exempt: false, note: "", perLine: false }),
  fees: z.coerce.number().catch(0),
  discounts: z.coerce.number().catch(0),
  // A fixed discount is a currency amount; a percentage discount is applied to
  // the subtotal. The numeric value lives in `discounts` either way.
  discountType: z.enum(["fixed", "percentage"]).catch("fixed"),
  amountPaid: z.coerce.number().catch(0),
  // The day the amount paid came in (yyyy-MM-dd), or empty.
  paidDate: z.string().catch(""),
  currencyConversion: z
    .object({
      currency: z.string().catch(DEFAULT_CURRENCY_CONVERSION.currency),
      currencyCode: z.string().catch(DEFAULT_CURRENCY_CONVERSION.currencyCode),
      rate: z.coerce.number().catch(DEFAULT_CURRENCY_CONVERSION.rate),
      date: z.string().catch(DEFAULT_CURRENCY_CONVERSION.date),
      source: z.string().catch(DEFAULT_CURRENCY_CONVERSION.source),
      // Whether the exchange rate line prints under the totals.
      showRate: z.boolean().catch(DEFAULT_CURRENCY_CONVERSION.showRate)
    })
    .catch(DEFAULT_CURRENCY_CONVERSION),
  terms: z
    .object({
      label: z.string().catch("Terms and conditions"),
      content: z.string().catch("")
    })
    .catch({ label: "Terms and conditions", content: "" }),
  notes: textSectionSchema("Notes"),
  latePayment: textSectionSchema("Late payment"),
  paymentDetails: paymentDetailsSchema,
  pdfSettings: z
    .object({ backgroundColor: z.string().catch("#ffffff") })
    .catch({ backgroundColor: "#ffffff" }),
  currency: z.string().catch("$"),
  currencyCode: z.string().catch(""),
  theme: invoiceThemeSchema,
  sections: invoiceSectionsSchema,
  dateFormat: z.enum(INVOICE_DATE_FORMATS).catch(DEFAULT_INVOICE_DATE_FORMAT),
  numberFormat: z
    .enum(INVOICE_NUMBER_FORMATS)
    .catch(STORED_INVOICE_FORMATS.numberFormat),
  currencyPosition: z
    .enum(CURRENCY_POSITIONS)
    .catch(STORED_INVOICE_FORMATS.currencyPosition),
  paperSize: z.enum(INVOICE_PAPER_SIZES).catch(STORED_INVOICE_FORMATS.paperSize)
});

export type Invoice = z.infer<typeof invoiceSchema>;
