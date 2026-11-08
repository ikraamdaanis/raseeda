import { DOCUMENT_TYPES } from "~/schema/invoice";
import type { DocumentType } from "~/types";

// What each document type is called in menus and the inspector.
export const DOCUMENT_TYPE_NAMES = {
  invoice: "Invoice",
  quote: "Quote",
  "proforma-invoice": "Proforma invoice",
  receipt: "Receipt",
  "credit-note": "Credit note"
} as const satisfies Record<DocumentType, string>;

// The title, sample number and labels that differ between document types
// (issue #132). Every other label is the same whatever the type. Each is only
// a default: changed, it stays as typed when the type changes. The number is
// still typed in; nothing counts between documents. `dueDays` is how far after its
// issue date a new blank's due date starts: a receipt's reads "Date paid", so
// it starts on the day. Changing the type never moves a date.
export const DOCUMENT_TYPE_DEFAULTS = {
  invoice: {
    title: "Invoice",
    number: "INV-0001",
    dueDays: 30,
    labels: {
      invoiceNumber: "Invoice No.",
      paymentDue: "Due date",
      total: "Total"
    }
  },
  quote: {
    title: "Quote",
    number: "QUO-0001",
    dueDays: 30,
    labels: {
      invoiceNumber: "Quote No.",
      paymentDue: "Valid until",
      total: "Total"
    }
  },
  "proforma-invoice": {
    title: "Proforma invoice",
    number: "PRO-0001",
    dueDays: 30,
    labels: {
      invoiceNumber: "Proforma No.",
      paymentDue: "Due date",
      total: "Total"
    }
  },
  receipt: {
    title: "Receipt",
    number: "REC-0001",
    dueDays: 0,
    labels: {
      invoiceNumber: "Receipt No.",
      paymentDue: "Date paid",
      total: "Total"
    }
  },
  "credit-note": {
    title: "Credit note",
    number: "CN-0001",
    dueDays: 30,
    labels: {
      invoiceNumber: "Credit note No.",
      paymentDue: "Due date",
      total: "Total credit"
    }
  }
} as const satisfies Record<
  DocumentType,
  {
    title: string;
    number: string;
    dueDays: number;
    labels: { invoiceNumber: string; paymentDue: string; total: string };
  }
>;

// New Invoice is the one most reach for, so menus list it on its own and the
// other types after it.
export const OTHER_DOCUMENT_TYPES = DOCUMENT_TYPES.filter(
  documentType => documentType !== "invoice"
);
