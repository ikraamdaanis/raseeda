import { isEqual } from "lodash-es";
import {
  DOCUMENT_TYPE_LABEL_PRESETS,
  LABEL_LANGUAGES,
  LABEL_PRESETS
} from "~/consts/label-presets";
import type {
  DocumentType,
  Invoice,
  InvoiceLabels,
  LabelLanguage
} from "~/types";

// The parts of an invoice that hold a printed label.
type LabelledInvoice = Pick<
  Invoice,
  | "documentType"
  | "title"
  | "labels"
  | "tableSettings"
  | "seller"
  | "client"
  | "shipping"
  | "paymentDetails"
  | "terms"
  | "notes"
  | "latePayment"
>;

// The details and totals labels a document of this type has in a language.
function getPresetLabels(
  documentType: DocumentType,
  language: LabelLanguage
): InvoiceLabels {
  const typed = DOCUMENT_TYPE_LABEL_PRESETS[documentType];

  return {
    invoiceNumber: typed.invoiceNumber[language],
    invoiceDate: typed.invoiceDate[language],
    paymentDue: typed.paymentDue[language],
    poNumber: LABEL_PRESETS.poNumber[language],
    servicePeriod: LABEL_PRESETS.servicePeriod[language],
    supplyDate: LABEL_PRESETS.supplyDate[language],
    subtotal: LABEL_PRESETS.subtotal[language],
    tax: LABEL_PRESETS.tax[language],
    fees: LABEL_PRESETS.fees[language],
    discounts: LABEL_PRESETS.discounts[language],
    total: typed.total[language],
    amountPaid: LABEL_PRESETS.amountPaid[language],
    balanceDue: LABEL_PRESETS.balanceDue[language],
    refersTo: LABEL_PRESETS.refersTo[language],
    paidBy: LABEL_PRESETS.paidBy[language]
  };
}

/**
 * The invoice with every printed label in a language (issue #126): the title,
 * the details' and totals' labels, the table's headers, the parties', the
 * payment details' and the text sections' headings, as its document type has
 * them. Whatever was typed over them before is overwritten; nothing else
 * changes.
 */
export function applyLabelPreset<T extends LabelledInvoice>(
  invoice: T,
  language: LabelLanguage
): T {
  const label = (row: keyof typeof LABEL_PRESETS) =>
    LABEL_PRESETS[row][language];

  return {
    ...invoice,
    title: DOCUMENT_TYPE_LABEL_PRESETS[invoice.documentType].title[language],
    labels: getPresetLabels(invoice.documentType, language),
    tableSettings: {
      ...invoice.tableSettings,
      columnLabels: {
        description: label("descriptionColumn"),
        quantity: label("quantityColumn"),
        unit: label("unitColumn"),
        unitPrice: label("unitPriceColumn"),
        tax: label("taxColumn"),
        amount: label("amountColumn")
      }
    },
    seller: { ...invoice.seller, label: label("seller") },
    client: { ...invoice.client, label: label("client") },
    shipping: { ...invoice.shipping, label: label("shipping") },
    paymentDetails: {
      ...invoice.paymentDetails,
      label: label("paymentDetails"),
      labels: {
        bankName: label("bankName"),
        accountName: label("accountName"),
        accountNumber: label("accountNumber"),
        routingNumber: label("routingNumber"),
        iban: label("iban"),
        bic: label("bic"),
        sortCode: label("sortCode"),
        paymentLink: label("paymentLink")
      }
    },
    terms: { ...invoice.terms, label: label("terms") },
    notes: { ...invoice.notes, label: label("notes") },
    latePayment: { ...invoice.latePayment, label: label("latePayment") }
  };
}

// The language whose preset every label is still on, or null once one has
// been renamed (or the labels were typed in some other language).
export function findLabelLanguage(
  invoice: LabelledInvoice
): LabelLanguage | null {
  return (
    LABEL_LANGUAGES.find(language =>
      isEqual(applyLabelPreset(invoice, language), invoice)
    ) ?? null
  );
}

/**
 * The preset languages, the one the title and labels are most in first (ties
 * in LABEL_LANGUAGES' order), so a label both languages share, such as
 * "Total" in English and French, is read as the invoice's language.
 */
export function rankLabelLanguages(
  invoice: Pick<Invoice, "documentType" | "title" | "labels">
): LabelLanguage[] {
  const scores = new Map(
    LABEL_LANGUAGES.map(language => {
      const labels = getPresetLabels(invoice.documentType, language);
      const title =
        DOCUMENT_TYPE_LABEL_PRESETS[invoice.documentType].title[language];
      const matches = Object.entries(labels).filter(
        ([key, value]) => Reflect.get(invoice.labels, key) === value
      ).length;

      return [language, matches + (invoice.title === title ? 1 : 0)];
    })
  );

  return [...LABEL_LANGUAGES].sort(
    (a, b) => (scores.get(b) ?? 0) - (scores.get(a) ?? 0)
  );
}

// A preset language read from untrusted input, such as a script's data;
// anything else is English.
export function readLabelLanguage(value: unknown): LabelLanguage {
  return LABEL_LANGUAGES.find(language => language === value) ?? "en";
}
