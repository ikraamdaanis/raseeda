import type {
  ANALYTICS_EVENTS,
  PAGE_VIEW_PATHS
} from "~/consts/analytics-events";
import type { Invoice } from "~/schema/invoice";

// The persisted invoice shape is defined and validated by the Zod schema; its
// re-export here keeps `~/types` the single import site for the inferred
// type while making it usable by the document/template types below.
export type { Invoice };

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
    amount: string;
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

export type InvoiceItem = {
  id: string;
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
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
  id: "number" | "poNumber" | "invoiceDate" | "dueDate" | "servicePeriod";
  labelKey:
    | "invoiceNumber"
    | "poNumber"
    | "invoiceDate"
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
  quantity: number;
  unit: string;
  unitPrice: string;
  amount: string;
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

export type InvoiceViewModel = {
  detailRows: InvoiceDetailRow[];
  lineItems: InvoiceLineItemRow[];
  summaryRows: InvoiceSummaryRow[];
};

export type InvoiceTotals = {
  items: InvoiceItemWithAmount[];
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
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

// The buckets a User-Agent is reduced to; the User-Agent itself is never kept.
export type BrowserFamily =
  "chrome" | "safari" | "firefox" | "edge" | "samsung" | "other";

export type OperatingSystem =
  "ios" | "android" | "macos" | "windows" | "linux" | "other";

export type DeviceType = "mobile" | "tablet" | "desktop";
