import type { Transaction } from "dexie";
import { isEqual } from "lodash-es";
import { STORED_INVOICE_FORMATS } from "~/schema/invoice";
import {
  CURRENT_INVOICE_SCHEMA_VERSION,
  migrateInvoiceData
} from "~/schema/migrations";
import type {
  Invoice,
  InvoiceDocument,
  InvoiceDraft,
  InvoiceVersion
} from "~/types";
import { isBlankInvoice } from "~/utils/invoice-content";
import { deriveInvoiceName } from "~/utils/invoice-name";

// The one working draft every tab shared before autosave.
const LEGACY_DRAFT_ID = "current-draft";

// The meta row naming the invoice a new tab opens.
export const LAST_OPENED_INVOICE_KEY = "lastOpenedInvoiceId";

function newInvoiceFromDraft(
  invoiceData: Invoice,
  name: string | null,
  now: Date
): InvoiceDocument {
  return {
    id: crypto.randomUUID(),
    name: name ?? deriveInvoiceName(invoiceData),
    nameSource: name ? "user" : "auto",
    invoiceData,
    templateId: null,
    rev: 1,
    schemaVersion: CURRENT_INVOICE_SCHEMA_VERSION,
    createdAt: now,
    updatedAt: now
  };
}

// Moves the editor from Save to autosave: every library invoice gets a content
// revision and a name source, and the shared working draft becomes part of the
// library, so nothing typed before the update is lost.
//
// - A draft of a library invoice that's ahead of it: the saved copy is kept as
//   a version ("Before autosave"), then the draft is written into the invoice.
// - A draft whose invoice changed since the draft was taken (another tab saved
//   it): the invoice is left alone and the draft becomes a copy beside it.
// - A draft of an invoice that has since been deleted, or one that was never
//   saved, becomes a new library invoice when it has anything in it.
//
// The invoice the draft continues as opens next. Version 11 drops the drafts
// table afterwards. Runs inside Dexie's upgrade transaction.
export async function migrateToAutosave(
  tx: Transaction,
  now: Date = new Date()
): Promise<void> {
  const invoices = tx.table<InvoiceDocument, string>("invoices");
  const versions = tx.table<InvoiceVersion, string>("versions");

  // Records from before autosave have neither.
  await tx
    .table<Partial<Pick<InvoiceDocument, "rev" | "nameSource">>>("invoices")
    .toCollection()
    .modify(invoice => {
      invoice.rev ??= 1;
      invoice.nameSource ??= "user";
    });

  const draft = await tx
    .table<InvoiceDraft, string>("drafts")
    .get(LEGACY_DRAFT_ID);

  if (!draft) return;

  const draftVersion = draft.schemaVersion ?? 0;
  const content = migrateInvoiceData(draft.invoiceData, draftVersion);
  const baseline = draft.lastSavedInvoice
    ? migrateInvoiceData(draft.lastSavedInvoice, draftVersion)
    : null;
  const untouched = baseline !== null && isEqual(content, baseline);
  const record = draft.documentId
    ? await invoices.get(draft.documentId)
    : undefined;
  let openId: string | null = null;

  if (record) {
    const saved = migrateInvoiceData(
      record.invoiceData,
      record.schemaVersion ?? 0
    );

    if (untouched || isEqual(content, saved)) {
      openId = record.id;
    } else if (baseline !== null && isEqual(saved, baseline)) {
      await versions.add({
        id: crypto.randomUUID(),
        invoiceId: record.id,
        name: record.name,
        invoiceData: saved,
        imageId: saved.image,
        signatureId: saved.signature.image,
        reason: "beforeAutosave",
        schemaVersion: CURRENT_INVOICE_SCHEMA_VERSION,
        createdAt: now
      });
      await invoices.put({
        ...record,
        invoiceData: content,
        rev: record.rev + 1,
        schemaVersion: CURRENT_INVOICE_SCHEMA_VERSION,
        updatedAt: now
      });
      openId = record.id;
    } else {
      const copy = newInvoiceFromDraft(
        content,
        `${draft.documentName ?? record.name} (unsaved edits)`,
        now
      );

      await invoices.add(copy);
      openId = copy.id;
    }
  } else if (
    !untouched &&
    // The draft predates number formats, so it reads in the stored ones.
    !isBlankInvoice(content, STORED_INVOICE_FORMATS)
  ) {
    const created = newInvoiceFromDraft(content, draft.documentName, now);

    await invoices.add(created);
    openId = created.id;
  }

  if (openId) {
    await tx.table("meta").put({ key: LAST_OPENED_INVOICE_KEY, value: openId });
  }
}
