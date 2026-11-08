import type { Invoice } from "~/schema/invoice";
import {
  CURRENT_INVOICE_SCHEMA_VERSION,
  DEFAULT_INVOICE_SECTIONS,
  invoiceSchema
} from "~/schema/invoice";

// Ordered registry of structural migrations applied before schema parsing.
// Each step reshapes data that the resilient schema can't recover on its own
// (renamed/relocated keys), because `.catch()` would discard the legacy value
// rather than carry it forward. Leaf defaulting and stripping of obsolete keys
// is left to invoiceSchema. The schema version travels on the stored document
// envelope, so only the steps newer than a record's version run.

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function readLabel(value: unknown): string | undefined {
  if (!isRecord(value)) return undefined;

  const { label } = value;

  return typeof label === "string" ? label : undefined;
}

// v0 -> v1: collapse the legacy per-column header settings into `columnLabels`
// and map the legacy `textFont` onto the single theme `font`. Everything else
// (defaults, dropping derived money fields) is handled by the schema.
function migrateV0ToV1(raw: Record<string, unknown>): Record<string, unknown> {
  const next: Record<string, unknown> = { ...raw };

  if (isRecord(next.theme)) {
    const theme = { ...next.theme };

    if (theme.font == null && typeof theme.textFont === "string") {
      theme.font = theme.textFont;
    }

    next.theme = theme;
  }

  if (isRecord(next.tableSettings) && next.tableSettings.columnLabels == null) {
    const table = next.tableSettings;

    next.tableSettings = {
      ...table,
      columnLabels: {
        description: readLabel(table.descriptionHeaderSettings),
        quantity: readLabel(table.quantityHeaderSettings),
        unitPrice: readLabel(table.unitPriceHeaderSettings),
        amount: readLabel(table.amountHeaderSettings)
      }
    };
  }

  return next;
}

function hasContent(value: unknown): boolean {
  return (
    isRecord(value) &&
    typeof value.content === "string" &&
    value.content.trim().length > 0
  );
}

// v1 -> v2: section switches. Before v2 a section existed when it had content,
// so the switches start on for anything already filled in. The rest take the
// new-invoice defaults, which match what the editor showed before (PO, service
// period, the pricing rows and payment details were always on the page).
function migrateV1ToV2(raw: Record<string, unknown>): Record<string, unknown> {
  if (isRecord(raw.sections)) return raw;

  return {
    ...raw,
    sections: {
      ...DEFAULT_INVOICE_SECTIONS,
      shipping: hasContent(raw.shipping),
      notes: hasContent(raw.notes),
      terms: hasContent(raw.terms),
      latePayment: hasContent(raw.latePayment)
    }
  };
}

// v2 -> v3: the Amount column's label follows the tax section, reading "Net
// amount" while tax is on, until one is typed. Before v3 every invoice stored
// the old default, "Amount", which would now read as typed, so it's cleared.
function migrateV2ToV3(raw: Record<string, unknown>): Record<string, unknown> {
  const table = raw.tableSettings;

  if (!isRecord(table) || !isRecord(table.columnLabels)) return raw;
  if (table.columnLabels.amount !== "Amount") return raw;

  return {
    ...raw,
    tableSettings: {
      ...table,
      columnLabels: { ...table.columnLabels, amount: "" }
    }
  };
}

// v3 -> v4: document types (issue #132). Everything stored before them is an
// invoice, labels and all.
function migrateV3ToV4(raw: Record<string, unknown>): Record<string, unknown> {
  return { ...raw, documentType: "invoice" };
}

const migrations: {
  to: number;
  up: (raw: Record<string, unknown>) => Record<string, unknown>;
}[] = [
  { to: 1, up: migrateV0ToV1 },
  { to: 2, up: migrateV1ToV2 },
  { to: 3, up: migrateV2ToV3 },
  { to: 4, up: migrateV3ToV4 }
];

/**
 * Bring any stored or imported invoice data to the current shape: run the
 * structural migrations newer than `fromVersion`, then parse with the resilient
 * schema. Never throws and never drops a record (repair & keep); a hopelessly
 * corrupt value yields a blank-but-valid invoice.
 */
export function migrateInvoiceData(raw: unknown, fromVersion = 0): Invoice {
  let working: Record<string, unknown> = isRecord(raw) ? { ...raw } : {};

  for (const migration of migrations) {
    if (fromVersion < migration.to) {
      working = migration.up(working);
    }
  }

  return invoiceSchema.parse(working);
}

export { CURRENT_INVOICE_SCHEMA_VERSION };
