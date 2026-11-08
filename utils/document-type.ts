import { DOCUMENT_TYPE_DEFAULTS } from "~/consts/document-types";
import { DOCUMENT_TYPES } from "~/schema/invoice";
import type { DocumentType, Invoice } from "~/types";

const TYPED_LABEL_KEYS = ["invoiceNumber", "paymentDue", "total"] as const;

// The value if it's still the old type's default, else what was typed.
function follow(value: string, oldDefault: string, newDefault: string) {
  return value === oldDefault ? newDefault : value;
}

/**
 * The invoice as another document type. The title, the sample number and the
 * labels that differ between types swap to the new type's defaults only where
 * they're still on the old type's defaults; a changed one (an emptied one
 * included) stays as typed, even when it matches some other type's default.
 */
export function applyDocumentType<
  T extends Pick<Invoice, "documentType" | "title" | "number" | "labels">
>(invoice: T, documentType: DocumentType): T {
  const before = DOCUMENT_TYPE_DEFAULTS[invoice.documentType];
  const after = DOCUMENT_TYPE_DEFAULTS[documentType];
  const labels = { ...invoice.labels };

  for (const key of TYPED_LABEL_KEYS) {
    labels[key] = follow(labels[key], before.labels[key], after.labels[key]);
  }

  return {
    ...invoice,
    documentType,
    title: follow(invoice.title, before.title, after.title),
    number: follow(invoice.number, before.number, after.number),
    labels
  };
}

// A document type read from untrusted input, such as a script's data; anything
// else is an invoice, as the schema reads it.
export function readDocumentType(value: unknown): DocumentType {
  return (
    DOCUMENT_TYPES.find(documentType => documentType === value) ?? "invoice"
  );
}
