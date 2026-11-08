import { pick } from "lodash-es";
import { APP_NAME } from "~/consts/app";
import { documentActions } from "~/context/document-session";
import { createInvoice, getAllInvoices, getInvoice } from "~/db";
import { STORED_INVOICE_FORMATS } from "~/schema/invoice";
import {
  CURRENT_INVOICE_SCHEMA_VERSION,
  migrateInvoiceData
} from "~/schema/migrations";
import { useDocumentStore } from "~/stores/document-store";
import {
  INVOICE_DATA_KEYS,
  selectInvoiceData
} from "~/stores/invoice-selectors";
import { createBlankInvoice, useInvoiceStore } from "~/stores/invoice-store";
import type { InvoiceDocument } from "~/types";
import { buildPdf } from "~/utils/build-pdf";
import { applyDocumentType, readDocumentType } from "~/utils/document-type";
import { ensureRowIds } from "~/utils/ensure-row-ids";
import { executeImport, parseExportText } from "~/utils/import-data";
import {
  getClientName,
  getInvoiceDate,
  getInvoiceTotal
} from "~/utils/invoice-library";
import { deriveInvoiceName } from "~/utils/invoice-name";
import { saveFile, toPdfFileName } from "~/utils/save-file";
import { track, trackInvoice } from "~/utils/track";

// Bumped when a call changes in a way existing scripts would notice.
const API_VERSION = 1;

// The global the API sits on: the app's name in lower case, as the README
// and llms.txt document it.
const GLOBAL_NAME = APP_NAME.toLowerCase();

function summarize(document: InvoiceDocument) {
  const { invoiceData } = document;

  return {
    id: document.id,
    name: document.name,
    documentType: invoiceData.documentType,
    number: invoiceData.number,
    client: getClientName(document),
    total: getInvoiceTotal(document),
    currency: invoiceData.currency,
    currencyCode: invoiceData.currencyCode,
    invoiceDate: getInvoiceDate(document) ? invoiceData.invoiceDate : null,
    dueDate: invoiceData.dueDate || null,
    updatedAt: new Date(document.updatedAt).toISOString()
  };
}

async function requireInvoice(id: string): Promise<InvoiceDocument> {
  const document = await getInvoice(id);

  if (!document) throw new Error(`No invoice with the id "${id}"`);

  return document;
}

// The invoice named, or the open one (with edits still in the save delay)
// when none is.
async function invoiceForPdf(id?: string) {
  const openId = useDocumentStore.getState().documentId;

  if (id && id !== openId) {
    const document = await requireInvoice(id);

    return { invoice: document.invoiceData, name: document.name };
  }

  const invoice = selectInvoiceData(useInvoiceStore.getState());
  const { documentName, nameSource } = useDocumentStore.getState();

  return {
    invoice,
    name:
      nameSource === "user" && documentName
        ? documentName
        : deriveInvoiceName(invoice)
  };
}

// A small API for scripts and assistants driving the editor in a browser, so
// they can make and export invoices without clicking. It only reads and writes
// this browser's storage, as the editor does; nothing is sent anywhere.
const api = {
  version: API_VERSION,
  // Every invoice in the library, most recently edited first.
  async listInvoices() {
    const documents = await getAllInvoices();

    return documents
      .map(summarize)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  },
  // An invoice's data, as it appears in an export's `invoiceData`.
  async getInvoice(id: string) {
    return structuredClone((await requireInvoice(id)).invoiceData);
  },
  // Adds an invoice to the library and opens it. Takes invoice data as an
  // export's `invoiceData` has it; anything left out takes a new invoice's
  // value (today's date, due in 30 days and so on). Returns its id. Tax is
  // `tax: { percentage, exempt, note, perLine }`; with `perLine` on, an item's
  // own `tax: { percentage, exempt }` overrides the invoice's rate.
  // `numberFormat` ("comma-dot", "dot-comma", "space-comma", "apostrophe-dot",
  // "indian"), `currencyPosition` ("before", "after") and `paperSize` ("A4",
  // "Letter") are "comma-dot", "before" and "A4" when left out, whatever the
  // browser's language. `paymentDetails.labels` renames the bank fields, and
  // `paymentDetails.methods` (`{ id, name, detail }[]`) lists other ways to
  // pay, printed below them. `paymentDetails.paymentLink` is a link to pay
  // online, printed last and clickable in the PDF. `documentType` ("invoice",
  // "quote", "proforma-invoice", "receipt", "credit-note") is "invoice" when
  // left out; the title and the number, due date and total labels left out
  // take that type's ("Quote", "Valid until" and so on).
  async createInvoice(data: unknown) {
    if (typeof data !== "object" || data === null || Array.isArray(data)) {
      throw new TypeError("Invoice data must be an object");
    }

    const known = pick(data, INVOICE_DATA_KEYS);
    // A blank of the type asked for, so a quote left without a title or
    // labels takes the quote's.
    const blank = applyDocumentType(
      createBlankInvoice(STORED_INVOICE_FORMATS),
      readDocumentType(Reflect.get(data, "documentType"))
    );
    const invoiceData = ensureRowIds(
      migrateInvoiceData({ ...blank, ...known }, CURRENT_INVOICE_SCHEMA_VERSION)
    );
    const now = new Date();
    const document: InvoiceDocument = {
      id: crypto.randomUUID(),
      name: deriveInvoiceName(invoiceData),
      nameSource: "auto",
      invoiceData,
      templateId: null,
      rev: 1,
      createdAt: now,
      updatedAt: now
    };

    await createInvoice(document);
    trackInvoice("invoice_saved", invoiceData);
    await documentActions.openInvoice(document.id);

    return document.id;
  },
  async openInvoice(id: string) {
    await requireInvoice(id);
    await documentActions.openInvoice(id);
  },
  // The PDF of the invoice named, or of the open one, as a Blob.
  async getPdf(id?: string) {
    const { invoice } = await invoiceForPdf(id);

    return buildPdf(invoice);
  },
  // Saves the PDF of the invoice named, or of the open one, as a download.
  async downloadPdf(id?: string) {
    const { invoice, name } = await invoiceForPdf(id);

    saveFile(await buildPdf(invoice), toPdfFileName(name));
    trackInvoice("pdf_downloaded", invoice);
  },
  // Imports a whole export file (its JSON text, or the parsed object), as the
  // Import dialog does.
  async importData(json: unknown) {
    const parsed = parseExportText(
      typeof json === "string" ? json : JSON.stringify(json)
    );
    const result = await executeImport(parsed);

    track("data_imported");

    return result;
  }
};

// Puts the API on window while the editor is open. Returns a function that
// takes it off again.
export function exposeAutomationApi() {
  Object.assign(window, { [GLOBAL_NAME]: api });

  return () => {
    Reflect.deleteProperty(window, GLOBAL_NAME);
  };
}
