import { format } from "date-fns";
import { APP_NAME } from "~/consts/app";
import { CURRENT_EXPORT_VERSION } from "~/consts/export";
import { getAllImages, getAllInvoices, getAllTemplates } from "~/db";
import { CURRENT_INVOICE_SCHEMA_VERSION } from "~/schema/migrations";
import type { ExportFile, Invoice, InvoiceNameSource } from "~/types";

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

// Snapshots the whole local setup (templates, invoices, and images) into the
// serializable export shape. Kept separate from the download so it can be
// exercised in tests, which have no DOM to drive the file save.
export async function buildExportData(): Promise<ExportFile> {
  const [templates, invoices, images] = await Promise.all([
    getAllTemplates(),
    getAllInvoices(),
    getAllImages()
  ]);

  return {
    meta: {
      version: CURRENT_EXPORT_VERSION,
      exportedAt: new Date().toISOString(),
      appName: APP_NAME
    },
    templates: templates.map(template => ({
      ...template,
      createdAt: new Date(template.createdAt).toISOString(),
      updatedAt: new Date(template.updatedAt).toISOString()
    })),
    invoices: invoices.map(invoice => ({
      ...invoice,
      createdAt: new Date(invoice.createdAt).toISOString(),
      updatedAt: new Date(invoice.updatedAt).toISOString()
    })),
    images: images.map(image => ({
      id: image.id,
      data: arrayBufferToBase64(image.data),
      type: image.type,
      createdAt: new Date(image.createdAt).toISOString()
    }))
  };
}

function saveJsonFile(data: ExportFile, fileName: string) {
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.click();

  // Defer the revoke: Safari has historically aborted the download when the
  // object URL is revoked synchronously in the same tick as the click, so let
  // the download start before releasing the blob.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function exportAllData(): Promise<void> {
  saveJsonFile(
    await buildExportData(),
    `${APP_NAME}-export-${format(new Date(), "yyyy-MM-dd")}.json`
  );
}

// A backup made when saving has failed: everything in this browser's storage,
// with the open invoice as it is in memory, which may be ahead of storage.
// When storage can't be read at all, it holds the open invoice alone. Either
// way it imports like any export.
export async function downloadBackupFile(
  open: {
    id: string;
    name: string;
    nameSource: InvoiceNameSource;
    templateId: string | null;
    invoiceData: Invoice;
  } | null
): Promise<void> {
  const now = new Date().toISOString();
  let data: ExportFile;

  try {
    data = await buildExportData();
  } catch {
    data = {
      meta: {
        version: CURRENT_EXPORT_VERSION,
        exportedAt: now,
        appName: APP_NAME
      },
      templates: [],
      invoices: [],
      images: []
    };
  }

  if (open) {
    const stored = data.invoices.find(invoice => invoice.id === open.id);

    data.invoices = [
      ...data.invoices.filter(invoice => invoice.id !== open.id),
      {
        id: open.id,
        name: open.name,
        nameSource: open.nameSource,
        invoiceData: open.invoiceData,
        templateId: open.templateId,
        schemaVersion: CURRENT_INVOICE_SCHEMA_VERSION,
        createdAt: stored?.createdAt ?? now,
        updatedAt: now
      }
    ];
  }

  saveJsonFile(
    data,
    `${APP_NAME}-backup-${format(new Date(), "yyyy-MM-dd-HHmm")}.json`
  );
}
