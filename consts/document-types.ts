import { DOCUMENT_TYPES } from "~/schema/invoice";
import type { DocumentType, InvoiceSections } from "~/types";

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

// The closing rows and fields that differ between types (issue #133), which
// the type settles whatever the switches say. `sections` overrides a switch
// while the document is that type: a quote has nothing paid and no PAID stamp,
// a proforma invoice isn't paid yet, and a receipt is for what was paid. The
// switches keep what was chosen, so switching back to an invoice brings the
// rows back with what was typed in them. `dueDate` is whether the due date
// row prints (a credit note has nothing to pay by a date), `paymentTerms`
// whether the inspector offers Net 7 to 60 for it, and `refersTo` whether the
// "Refers to invoice" row is there.
export const DOCUMENT_TYPE_ROWS = {
  invoice: {
    sections: {},
    dueDate: true,
    paymentTerms: true,
    refersTo: false
  },
  quote: {
    sections: { amountPaid: false, paidStamp: false },
    dueDate: true,
    paymentTerms: true,
    refersTo: false
  },
  "proforma-invoice": {
    sections: { paidStamp: false },
    dueDate: true,
    paymentTerms: true,
    refersTo: false
  },
  receipt: {
    sections: { amountPaid: true },
    dueDate: true,
    paymentTerms: false,
    refersTo: false
  },
  "credit-note": {
    sections: {},
    dueDate: false,
    paymentTerms: false,
    refersTo: true
  }
} as const satisfies Record<
  DocumentType,
  {
    sections: Partial<Pick<InvoiceSections, "amountPaid" | "paidStamp">>;
    dueDate: boolean;
    paymentTerms: boolean;
    refersTo: boolean;
  }
>;

// New Invoice is the one most reach for, so menus list it on its own and the
// other types after it.
export const OTHER_DOCUMENT_TYPES = DOCUMENT_TYPES.filter(
  documentType => documentType !== "invoice"
);
