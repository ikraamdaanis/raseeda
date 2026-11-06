import type {
  ANALYTICS_EVENTS,
  PAGE_VIEW_PATHS,
  REFERRERS,
  SOURCES
} from "~/consts/analytics-events";
import type { Invoice } from "~/schema/invoice";

// The persisted invoice shape is defined and validated by the Zod schema; its
// re-export here keeps `~/types` the single import site for the inferred
// type while making it usable by the document/template types below.
export type { Invoice };

export type InvoiceNumberFormat = Invoice["numberFormat"];

export type CurrencyPosition = Invoice["currencyPosition"];

export type TextSettings = {
  align: "left" | "center" | "right";
  size: string;
  weight: "Normal" | "Medium" | "Semibold" | "Bold";
  color: string;
  fontFamily?: string;
  pdfFontFamily?: string;
  letterSpacing?: string;
};

export type TableSettings = {
  columnLabels: {
    description: string;
    quantity: string;
    unit: string;
    unitPrice: string;
    // Blank, the Tax column reads as the tax row's label.
    tax: string;
    amount: string;
  };
  // Which of the optional columns are on. Off, Quantity and price leave each
  // line a description and an amount, typed in, and take Unit with them.
  columns: {
    quantityAndPrice: boolean;
    unit: boolean;
  };
  backgroundColor: string;
  borderColor: string;
};

export type InvoiceLabels = {
  invoiceNumber: string;
  invoiceDate: string;
  paymentDue: string;
  poNumber: string;
  servicePeriod: string;
  supplyDate: string;
  subtotal: string;
  tax: string;
  fees: string;
  discounts: string;
  total: string;
  amountPaid: string;
  balanceDue: string;
};

export type InvoiceFont =
  | "schibsted-grotesk"
  | "geist"
  | "inter"
  | "bricolage-grotesque"
  | "dm-sans"
  | "ibm-plex-sans"
  | "lora"
  | "libre-baskerville"
  | "geist-mono"
  | "jetbrains-mono"
  | "ibm-plex-mono";

export type InvoiceSize = "small" | "medium" | "large";

// The invoice's optional parts and whether each is switched on.
export type InvoiceSections = Invoice["sections"];

export type InvoiceSectionKey = keyof InvoiceSections;

// How the saved-invoice lists are ordered, grouped and narrowed down.
export type InvoiceLibrarySort =
  | "updated"
  | "invoiceDate"
  | "dueDate"
  | "name"
  | "client"
  | "amount"
  | "number";

export type SortDirection = "asc" | "desc";

export type InvoiceLibraryGroup = "client" | "month" | "none";

export type InvoiceLibraryDateRange =
  "all" | "thisMonth" | "last30" | "thisQuarter" | "thisYear" | "lastYear";

export type InvoiceLibraryView = {
  sort: InvoiceLibrarySort;
  direction: SortDirection;
  group: InvoiceLibraryGroup;
  dateRange: InvoiceLibraryDateRange;
  client: string | null;
  currency: string | null;
};

// The editor chrome's colour scheme. The preference is what the person chose
// ("system" follows the operating system); the theme is what it resolves to.
export type EditorThemePreference = "light" | "dark" | "system";

export type EditorTheme = "light" | "dark";

export type InvoiceTheme = {
  font: InvoiceFont;
  fontWeight: TextSettings["weight"];
  size: InvoiceSize;
  accent: string;
};

export type TextRole =
  | "title"
  | "sectionLabel"
  | "sectionContent"
  | "termsContent"
  | "detailLabel"
  | "detailValue"
  | "tableHeaderLeft"
  | "tableHeaderCenter"
  | "tableHeaderRight"
  | "tableRowLeft"
  | "tableRowCenter"
  | "tableRowRight"
  | "totalsLabel"
  | "totalsValue"
  | "grandTotalLabel"
  | "grandTotalValue";

// A line's own tax rate. As on the invoice, an exempt line ignores its
// percentage.
export type InvoiceItemTax = {
  percentage: number;
  exempt: boolean;
};

export type InvoiceItem = {
  id: string;
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  tax?: InvoiceItemTax;
};

export type InvoiceItemWithAmount = InvoiceItem & { amount: number };

export type InvoiceSeller = {
  label: string;
  content: string;
  placeholder: string;
};

export type InvoiceClient = {
  label: string;
  content: string;
  placeholder: string;
};

export type InvoiceTerms = {
  label: string;
  content: string;
};

export type InvoicePaymentDetails = {
  label: string;
  bankName: string;
  accountName: string;
  accountNumber: string;
  routingNumber: string;
  iban: string;
  bic: string;
  sortCode: string;
  terms: string;
};

export type PdfSettings = {
  backgroundColor: string;
};

export type InvoiceDetailRow = {
  id:
    | "number"
    | "poNumber"
    | "invoiceDate"
    | "supplyDate"
    | "dueDate"
    | "servicePeriod";
  labelKey:
    | "invoiceNumber"
    | "poNumber"
    | "invoiceDate"
    | "supplyDate"
    | "paymentDue"
    | "servicePeriod";
  label: string;
  value: string;
  // Optional rows (PO number, service period) are always shown on the editable
  // canvas but hidden from the PDF/read-only render when their value is empty.
  isOptional: boolean;
};

export type InvoiceLineItemRow = {
  id: string;
  description: string;
  // Written in the invoice's number format, "1,5" on a 1.234,56 invoice.
  quantity: string;
  unit: string;
  unitPrice: string;
  amount: string;
  // The amount in the second currency, when the invoice shows one.
  convertedAmount?: string;
  // The line's tax rate, "20%" or "Exempt", for the Tax column.
  tax: string;
};

export type InvoiceSummaryRow = {
  id:
    | "subtotal"
    | "tax"
    | "fees"
    | "discounts"
    | "total"
    | "amountPaid"
    | "balanceDue";
  label: string;
  value: string;
  percentage?: number;
  note?: string;
  isVisible: boolean;
  isTotal: boolean;
};

// An invoice's amounts shown in a second currency: the rate typed in, and the
// codes that name the columns and the rate line.
export type CurrencyConversion = {
  rate: number;
  fromCode: string;
  toCurrency: string;
  toCode: string;
  // The second currency's marker in the invoice's font: its symbol, or its
  // code when the font can't draw the symbol.
  toMarker: string;
  // The second currency's own decimals: 0 for yen, 2 for most.
  toDecimals: number;
};

// How an invoice writes its amounts: the currency's marker (its symbol or,
// where the invoice's font can't draw that, its code), the number format,
// which side of the figure the marker sits, and the currency's decimals.
export type MoneyFormat = {
  marker: string;
  numberFormat: InvoiceNumberFormat;
  position: CurrencyPosition;
  decimals: number;
};

export type InvoiceViewModel = {
  detailRows: InvoiceDetailRow[];
  lineItems: InvoiceLineItemRow[];
  summaryRows: InvoiceSummaryRow[];
  conversion: CurrencyConversion | null;
  // Whether the line items show a Tax column: only when their rates differ.
  hasTaxColumn: boolean;
};

// The lines taxed at one rate (or exempt), after their share of the discount.
export type InvoiceTaxGroup = {
  percentage: number;
  exempt: boolean;
  taxableAmount: number;
  taxAmount: number;
};

export type InvoiceTotals = {
  items: InvoiceItemWithAmount[];
  subtotal: number;
  // Highest rate first, then 0%, then exempt.
  taxGroups: InvoiceTaxGroup[];
  taxAmount: number;
  discountAmount: number;
  // The fees and payment the total and balance count, 0 while their row is
  // switched off.
  fees: number;
  amountPaid: number;
  total: number;
  balanceDue: number;
};

// Where an invoice's name comes from: "auto" follows its number and client as
// they're edited, "user" is a name someone gave it and stays put.
export type InvoiceNameSource = "auto" | "user";

export type InvoiceDocument = {
  id: string;
  name: string;
  nameSource: InvoiceNameSource;
  invoiceData: Invoice;
  templateId: string | null;
  // The content revision. Every content write is a compare-and-swap on it, so
  // two writers can never overwrite each other.
  rev: number;
  schemaVersion?: number;
  createdAt: Date;
  updatedAt: Date;
};

// Why a version of an invoice was kept.
export type InvoiceVersionReason =
  | "opened"
  | "idle"
  | "beforeRestore"
  | "beforeRemoval"
  | "conflict"
  | "beforeAutosave";

// A snapshot of an invoice in its version history. Images are kept by id, so
// a version never copies a logo.
export type InvoiceVersion = {
  id: string;
  invoiceId: string;
  name: string;
  invoiceData: Invoice;
  // The logo it names (invoiceData.image), indexed so the image sweep can
  // read which logos versions keep without loading every snapshot.
  imageId: string;
  reason: InvoiceVersionReason;
  schemaVersion?: number;
  createdAt: Date;
};

// The working draft from before autosave: one record holding the live editing
// session. Only read by the upgrade that turns it into library invoices; the
// table goes after one release.
export type InvoiceDraft = {
  id: string;
  invoiceData: Invoice;
  documentId: string | null;
  documentName: string | null;
  lastSavedInvoice: Invoice | null;
  schemaVersion?: number;
  updatedAt: Date;
};

export type ExportFile = {
  meta: {
    version: number;
    exportedAt: string;
    appName: string;
  };
  templates: Array<{
    id: string;
    name: string;
    description: string | null;
    isDefault: boolean;
    templateData: Invoice;
    screenshotUrl: string | null;
    schemaVersion?: number;
    createdAt: string;
    updatedAt: string;
  }>;
  invoices: Array<{
    id: string;
    name: string;
    nameSource?: InvoiceNameSource;
    invoiceData: Invoice;
    templateId: string | null;
    schemaVersion?: number;
    createdAt: string;
    updatedAt: string;
  }>;
  images: Array<{
    id: string;
    data: string;
    type: string;
    createdAt: string;
  }>;
};

export type ImportAnalysis = {
  templates: { total: number; new: number; conflicts: string[] };
  invoices: { total: number; new: number; conflicts: string[] };
  images: { total: number; new: number; duplicates: number };
};

export type ImportResult = {
  templatesImported: number;
  invoicesImported: number;
  imagesImported: number;
};

export type InvoiceTemplate = {
  id: string;
  name: string;
  description: string | null;
  isDefault: boolean;
  templateData: Invoice;
  screenshotUrl: string | null;
  schemaVersion?: number;
  createdAt: Date;
  updatedAt: Date;
};

// The anonymous usage events the site counts (consts/analytics-events.ts).
export type AnalyticsEvent = (typeof ANALYTICS_EVENTS)[number];

export type PageViewPath = (typeof PAGE_VIEW_PATHS)[number];

// The kinds of site a visit is counted as coming from (utils/traffic-source.ts).
export type Referrer = (typeof REFERRERS)[number];

export type TrafficSource = (typeof SOURCES)[number];

// The buckets a User-Agent is reduced to; the User-Agent itself is never kept.
export type BrowserFamily =
  "chrome" | "safari" | "firefox" | "edge" | "samsung" | "other";

export type OperatingSystem =
  "ios" | "android" | "macos" | "windows" | "linux" | "other";

export type DeviceType = "mobile" | "tablet" | "desktop";
