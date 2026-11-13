import {
  DOCUMENT_TYPE_DEFAULTS,
  DOCUMENT_TYPE_ROWS
} from "~/consts/document-types";
import { DOCUMENT_TYPE_LABEL_PRESETS } from "~/consts/label-presets";
import { DOCUMENT_TYPES, INVOICE_SECTION_KEYS } from "~/schema/invoice";
import type { DocumentType, Invoice, InvoiceSectionKey } from "~/types";
import { rankLabelLanguages } from "~/utils/label-preset";

const TYPED_LABEL_KEYS = [
  "invoiceNumber",
  "invoiceDate",
  "paymentDue",
  "total"
] as const;

/**
 * The invoice as another document type. The title, the sample number and the
 * labels that differ between types swap to the new type's defaults only where
 * they're still on the old type's defaults, in any preset language (a German
 * "Rechnung" becomes "Angebot"), in the language the labels are most in
 * first; a changed one (an emptied one included) stays as typed, even when it
 * matches some other type's default.
 */
export function applyDocumentType<
  T extends Pick<Invoice, "documentType" | "title" | "number" | "labels">
>(invoice: T, documentType: DocumentType): T {
  const before = DOCUMENT_TYPE_LABEL_PRESETS[invoice.documentType];
  const after = DOCUMENT_TYPE_LABEL_PRESETS[documentType];
  const languages = rankLabelLanguages(invoice);

  // The value if it's still the old type's default in a language, else what
  // was typed.
  function follow(
    key: "title" | (typeof TYPED_LABEL_KEYS)[number],
    value: string
  ) {
    const language = languages.find(
      candidate => before[key][candidate] === value
    );

    return language ? after[key][language] : value;
  }

  const labels = { ...invoice.labels };

  for (const key of TYPED_LABEL_KEYS) {
    labels[key] = follow(key, labels[key]);
  }

  const oldNumber = DOCUMENT_TYPE_DEFAULTS[invoice.documentType].number;

  return {
    ...invoice,
    documentType,
    title: follow("title", invoice.title),
    number:
      invoice.number === oldNumber
        ? DOCUMENT_TYPE_DEFAULTS[documentType].number
        : invoice.number,
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

/**
 * The section switches as a document of this type reads them: the ones its
 * type settles (a quote's amount paid, a receipt's) set as the type says,
 * the rest as chosen. Totals, Preview and the PDF all read the switches
 * through this, so they agree; the stored switches are never changed.
 */
export function getTypeSections<T extends Partial<Invoice["sections"]>>(
  sections: T,
  documentType: DocumentType
): T {
  const settled: Partial<Record<InvoiceSectionKey, boolean>> =
    DOCUMENT_TYPE_ROWS[documentType].sections;
  const result = { ...sections };

  for (const [key, isOn] of Object.entries(settled)) {
    if (key in result) Object.assign(result, { [key]: isOn });
  }

  return result;
}

// The switches a type settles, which the page and the command palette
// don't offer while the document is that type.
export function getTypeSettledSections(
  documentType: DocumentType
): InvoiceSectionKey[] {
  const settled = DOCUMENT_TYPE_ROWS[documentType].sections;

  return INVOICE_SECTION_KEYS.filter(key => key in settled);
}
