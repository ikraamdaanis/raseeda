import {
  differenceInCalendarDays,
  endOfMonth,
  endOfQuarter,
  endOfYear,
  format,
  isValid,
  isWithinInterval,
  startOfMonth,
  startOfQuarter,
  startOfYear,
  subYears
} from "date-fns";
import { normalizeCurrency } from "~/consts/currencies";
import { DOCUMENT_TYPE_NAMES } from "~/consts/document-types";
import { DOCUMENT_TYPES } from "~/schema/invoice";
import type {
  DocumentType,
  InvoiceDocument,
  InvoiceLibraryDateRange,
  InvoiceLibraryGroup,
  InvoiceLibrarySort,
  InvoiceLibraryView,
  SortDirection
} from "~/types";
import { calculateInvoiceTotals } from "~/utils/calculate-invoice-totals";
import { readInvoiceDate } from "~/utils/read-invoice-date";

// Sorting, filtering and grouping for the saved-invoice lists (the invoices
// panel and the Open Invoice dialog), kept pure so both lists agree and the
// rules can be tested.

export const NO_CLIENT = "No client yet";

export const DEFAULT_LIBRARY_VIEW: InvoiceLibraryView = {
  sort: "updated",
  direction: "desc",
  group: "client",
  dateRange: "all",
  client: null,
  currency: null,
  documentType: null
};

export const LIBRARY_SORTS: {
  value: InvoiceLibrarySort;
  label: string;
  // The direction a sort starts in when picked: newest, biggest, A to Z.
  defaultDirection: SortDirection;
}[] = [
  { value: "updated", label: "Last edited", defaultDirection: "desc" },
  { value: "invoiceDate", label: "Invoice date", defaultDirection: "desc" },
  { value: "dueDate", label: "Due date", defaultDirection: "asc" },
  { value: "name", label: "Name", defaultDirection: "asc" },
  { value: "client", label: "Client", defaultDirection: "asc" },
  { value: "amount", label: "Amount", defaultDirection: "desc" },
  { value: "number", label: "Invoice number", defaultDirection: "desc" }
];

export const LIBRARY_GROUPS: { value: InvoiceLibraryGroup; label: string }[] = [
  { value: "client", label: "Client" },
  { value: "month", label: "Month" },
  { value: "none", label: "None" }
];

export const LIBRARY_DATE_RANGES: {
  value: InvoiceLibraryDateRange;
  label: string;
}[] = [
  { value: "all", label: "Any date" },
  { value: "thisMonth", label: "This month" },
  { value: "last30", label: "Last 30 days" },
  { value: "thisQuarter", label: "This quarter" },
  { value: "thisYear", label: "This year" },
  { value: "lastYear", label: "Last year" }
];

// The client an invoice is filed under: the first line of its "To" block.
export function getClientName(document: InvoiceDocument): string {
  const firstLine = document.invoiceData.client.content
    .split("\n")
    .map(line => line.trim())
    .find(Boolean);

  return firstLine ?? NO_CLIENT;
}

export function getInvoiceTotal(document: InvoiceDocument): number {
  return calculateInvoiceTotals(document.invoiceData).total;
}

// The invoice's own date, falling back to when it was last edited for an
// invoice whose date was cleared or mistyped. Null only for a damaged record
// with neither.
export function getInvoiceDate(document: InvoiceDocument): Date | null {
  const fallback = new Date(document.updatedAt);

  return (
    readInvoiceDate(document.invoiceData.invoiceDate) ??
    (isValid(fallback) ? fallback : null)
  );
}

function getDueDate(document: InvoiceDocument): Date | null {
  return readInvoiceDate(document.invoiceData.dueDate);
}

// A stored timestamp, or null when it isn't a real date.
function toTime(value: Date | string | number): number | null {
  const time = new Date(value).getTime();

  return Number.isNaN(time) ? null : time;
}

// Writes a list date, or null for one that can't be read, so a single damaged
// record never throws while the list renders.
export function formatLibraryDate(
  value: Date | string | number | null
): string | null {
  const time = value === null ? null : toTime(value);

  return time === null ? null : format(time, "d MMM yyyy");
}

// The calendar ranges take in the whole month, quarter or year, so an invoice
// dated later this month still counts as this month's.
function inDateRange(
  date: Date | null,
  range: InvoiceLibraryDateRange,
  now: Date
): boolean {
  if (range === "all") return true;
  if (!date) return false;

  switch (range) {
    case "thisMonth":
      return isWithinInterval(date, {
        start: startOfMonth(now),
        end: endOfMonth(now)
      });
    case "last30":
      return (
        differenceInCalendarDays(now, date) <= 30 &&
        differenceInCalendarDays(now, date) >= 0
      );
    case "thisQuarter":
      return isWithinInterval(date, {
        start: startOfQuarter(now),
        end: endOfQuarter(now)
      });
    case "thisYear":
      return isWithinInterval(date, {
        start: startOfYear(now),
        end: endOfYear(now)
      });
    case "lastYear": {
      const lastYear = subYears(now, 1);

      return isWithinInterval(date, {
        start: startOfYear(lastYear),
        end: endOfYear(lastYear)
      });
    }
  }
}

// Search matches the name, client, invoice and PO numbers, line items, the
// "To" block and the document's type ("quote"), case-insensitively; every
// word typed has to match somewhere.
function matchesSearch(document: InvoiceDocument, query: string): boolean {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);

  if (words.length === 0) return true;

  const { invoiceData } = document;
  const haystack = [
    document.name,
    invoiceData.client.content,
    invoiceData.number,
    invoiceData.poNumber,
    DOCUMENT_TYPE_NAMES[invoiceData.documentType],
    ...invoiceData.items.map(item => item.description)
  ]
    .join(" ")
    .toLowerCase();

  return words.every(word => haystack.includes(word));
}

export function filterInvoices(
  documents: InvoiceDocument[],
  { query, view, now }: { query: string; view: InvoiceLibraryView; now: Date }
): InvoiceDocument[] {
  return documents.filter(
    document =>
      matchesSearch(document, query) &&
      inDateRange(getInvoiceDate(document), view.dateRange, now) &&
      (view.client === null || getClientName(document) === view.client) &&
      (view.currency === null ||
        normalizeCurrency(document.invoiceData.currency) === view.currency) &&
      (view.documentType === null ||
        document.invoiceData.documentType === view.documentType)
  );
}

const textCollator = new Intl.Collator(undefined, {
  numeric: true,
  sensitivity: "base"
});

// What an invoice is sorted on; null when it has nothing to sort by (no due
// date, no client), which always sorts last, whichever way the list runs.
function sortValue(
  document: InvoiceDocument,
  sort: InvoiceLibrarySort
): string | number | null {
  switch (sort) {
    case "updated":
      return toTime(document.updatedAt);
    case "invoiceDate":
      return getInvoiceDate(document)?.getTime() ?? null;
    case "dueDate":
      return getDueDate(document)?.getTime() ?? null;
    case "name":
      return document.name;
    case "client": {
      const client = getClientName(document);

      return client === NO_CLIENT ? null : client;
    }
    case "amount":
      return getInvoiceTotal(document);
    case "number":
      return document.invoiceData.number;
  }
}

function compareValues(
  first: string | number | null,
  second: string | number | null
): number {
  if (typeof first === "string" && typeof second === "string") {
    return textCollator.compare(first, second);
  }

  if (typeof first === "number" && typeof second === "number") {
    return first - second;
  }

  return 0;
}

// Each invoice's sort value is worked out once, not on every comparison.
// Ties fall back to the most recently edited first, so the order is stable.
export function sortInvoices(
  documents: InvoiceDocument[],
  sort: InvoiceLibrarySort,
  direction: SortDirection
): InvoiceDocument[] {
  const sign = direction === "asc" ? 1 : -1;
  const rows = documents.map(document => ({
    document,
    value: sortValue(document, sort),
    updated: toTime(document.updatedAt) ?? 0
  }));

  return rows
    .sort((a, b) => {
      if (a.value === null || b.value === null) {
        return (
          Number(a.value === null) - Number(b.value === null) ||
          b.updated - a.updated
        );
      }

      return compareValues(a.value, b.value) * sign || b.updated - a.updated;
    })
    .map(row => row.document);
}

// Groups keep the sorted order: a group appears where its first invoice falls.
export function groupInvoices(
  documents: InvoiceDocument[],
  group: InvoiceLibraryGroup
): { key: string; label: string; documents: InvoiceDocument[] }[] {
  if (group === "none") {
    return documents.length > 0 ? [{ key: "all", label: "", documents }] : [];
  }

  const groups = new Map<
    string,
    { key: string; label: string; documents: InvoiceDocument[] }
  >();

  documents.forEach(document => {
    const date = getInvoiceDate(document);
    const key =
      group === "client"
        ? getClientName(document)
        : date
          ? format(date, "yyyy-MM")
          : "no-date";
    const label =
      group === "client" ? key : date ? format(date, "MMMM yyyy") : "No date";
    const existing = groups.get(key);

    if (existing) existing.documents.push(document);
    else groups.set(key, { key, label, documents: [document] });
  });

  return [...groups.values()];
}

// "No client yet" comes last, after every named client.
export function listClients(documents: InvoiceDocument[]): string[] {
  return [...new Set(documents.map(getClientName))].sort(
    (a, b) =>
      Number(a === NO_CLIENT) - Number(b === NO_CLIENT) ||
      textCollator.compare(a, b)
  );
}

export function listCurrencies(documents: InvoiceDocument[]): string[] {
  return [
    ...new Set(
      documents.map(document =>
        normalizeCurrency(document.invoiceData.currency)
      )
    )
  ].sort((a, b) => textCollator.compare(a, b));
}

// The types the library holds, in the order the New menu lists them.
export function listDocumentTypes(
  documents: InvoiceDocument[]
): DocumentType[] {
  const held = new Set(
    documents.map(document => document.invoiceData.documentType)
  );

  return DOCUMENT_TYPES.filter(documentType => held.has(documentType));
}

export function countActiveFilters(view: InvoiceLibraryView): number {
  return [
    view.dateRange !== "all",
    view.client !== null,
    view.currency !== null,
    view.documentType !== null
  ].filter(Boolean).length;
}

const SORTS = new Set(LIBRARY_SORTS.map(sort => sort.value));
const GROUPS = new Set(LIBRARY_GROUPS.map(group => group.value));
const DATE_RANGES = new Set(LIBRARY_DATE_RANGES.map(range => range.value));

// Vets a stored view (storage can hold anything), keeping each valid choice
// and falling back to the default for the rest.
export function parseLibraryView(
  stored: unknown
): InvoiceLibraryView | undefined {
  if (typeof stored !== "object" || stored === null) return undefined;

  const record = stored as Record<string, unknown>;
  const pick = <TValue extends string>(
    value: unknown,
    allowed: Set<TValue>,
    fallback: TValue
  ) => (allowed.has(value as TValue) ? (value as TValue) : fallback);

  return {
    sort: pick(record.sort, SORTS, DEFAULT_LIBRARY_VIEW.sort),
    direction:
      record.direction === "asc" || record.direction === "desc"
        ? record.direction
        : DEFAULT_LIBRARY_VIEW.direction,
    group: pick(record.group, GROUPS, DEFAULT_LIBRARY_VIEW.group),
    dateRange: pick(
      record.dateRange,
      DATE_RANGES,
      DEFAULT_LIBRARY_VIEW.dateRange
    ),
    client: typeof record.client === "string" ? record.client : null,
    currency: typeof record.currency === "string" ? record.currency : null,
    documentType:
      DOCUMENT_TYPES.find(
        documentType => documentType === record.documentType
      ) ?? null
  };
}
