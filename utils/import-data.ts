import { z } from "zod";
import { APP_NAME } from "~/consts/app";
import { CURRENT_EXPORT_VERSION } from "~/consts/export";
import type { StoredImage } from "~/db";
import {
  getAllImages,
  getAllInvoices,
  getAllTemplates,
  importDataAtomically
} from "~/db";
import "~/lib/configure-zod";
import {
  CURRENT_INVOICE_SCHEMA_VERSION,
  migrateInvoiceData
} from "~/schema/migrations";
import type {
  ExportFile,
  ImportAnalysis,
  ImportResult,
  InvoiceDocument,
  InvoiceTemplate
} from "~/types";
import { deriveInvoiceName } from "~/utils/invoice-name";

const metaSchema = z.object({
  version: z.number().int().positive(),
  exportedAt: z.string(),
  // The app's name when the file was made, which has changed before.
  appName: z.string()
});

const exportFileSchema = z.object({
  meta: metaSchema,
  templates: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      description: z.string().nullable(),
      isDefault: z.boolean(),
      templateData: z.record(z.string(), z.unknown()),
      screenshotUrl: z.string().nullable(),
      schemaVersion: z.number().int().catch(0),
      createdAt: z.string(),
      updatedAt: z.string()
    })
  ),
  invoices: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      nameSource: z.enum(["auto", "user"]).optional().catch(undefined),
      invoiceData: z.record(z.string(), z.unknown()),
      templateId: z.string().nullable(),
      schemaVersion: z.number().int().catch(0),
      createdAt: z.string(),
      updatedAt: z.string()
    })
  ),
  images: z.array(
    z.object({
      id: z.string(),
      data: z.string(),
      type: z.string(),
      createdAt: z.string()
    })
  )
});

export async function parseExportFile(file: File): Promise<ExportFile> {
  let text: string;
  try {
    text = await file.text();
  } catch {
    throw new Error("Failed to read the selected file.");
  }

  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error("The selected file is not valid JSON.");
  }

  // Check the version stamp before validating the whole body. A newer export may
  // have changed shape; without this, such a file fails the full parse with a
  // misleading "not a valid export" error instead of the accurate "please update"
  // message that the version stamp exists to produce.
  const rawMeta =
    json && typeof json === "object"
      ? (json as Record<string, unknown>).meta
      : undefined;
  const meta = metaSchema.safeParse(rawMeta);

  if (meta.success && meta.data.version > CURRENT_EXPORT_VERSION) {
    throw new Error(
      `This file was created by a newer version of ${APP_NAME} and can't be imported. Please update ${APP_NAME} and try again.`
    );
  }

  const result = exportFileSchema.safeParse(json);
  if (!result.success) {
    const firstError = result.error.issues[0]?.message ?? "Unknown error";

    throw new Error(
      `The file is not a valid ${APP_NAME} export: ${firstError}`
    );
  }

  return result.data as unknown as ExportFile;
}

export async function analyzeImport(
  parsed: ExportFile
): Promise<ImportAnalysis> {
  const [existingTemplates, existingInvoices, existingImages] =
    await Promise.all([getAllTemplates(), getAllInvoices(), getAllImages()]);

  const existingTemplateNames = new Set(
    existingTemplates.map(template => template.name.toLowerCase())
  );
  const existingInvoiceNames = new Set(
    existingInvoices.map(invoice => invoice.name.toLowerCase())
  );
  const existingImageIds = new Set(existingImages.map(image => image.id));

  const templateConflicts = parsed.templates
    .filter(template => existingTemplateNames.has(template.name.toLowerCase()))
    .map(template => template.name);

  const invoiceConflicts = parsed.invoices
    .filter(invoice => existingInvoiceNames.has(invoice.name.toLowerCase()))
    .map(invoice => invoice.name);

  const imageDuplicates = parsed.images.filter(image =>
    existingImageIds.has(image.id)
  ).length;

  return {
    templates: {
      total: parsed.templates.length,
      new: parsed.templates.length - templateConflicts.length,
      conflicts: templateConflicts
    },
    invoices: {
      total: parsed.invoices.length,
      new: parsed.invoices.length - invoiceConflicts.length,
      conflicts: invoiceConflicts
    },
    images: {
      total: parsed.images.length,
      new: parsed.images.length - imageDuplicates,
      duplicates: imageDuplicates
    }
  };
}

// Coerces an exported date string into a valid Date. A corrupt or unparseable
// value (e.g. a truncated ISO string, or free text from a hand-edited backup)
// falls back to now, so an Invalid Date can never reach storage and later throw
// when the invoice list formats it or a re-export calls toISOString on it.
function toValidDate(value: string): Date {
  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? new Date() : date;
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

function resolveConflictName(name: string, existingNames: Set<string>): string {
  if (!existingNames.has(name.toLowerCase())) return name;

  let candidate = `${name} (imported)`;
  let suffix = 1;
  while (existingNames.has(candidate.toLowerCase())) {
    suffix++;
    candidate = `${name} (imported ${suffix})`;
  }
  existingNames.add(candidate.toLowerCase());
  return candidate;
}

export async function executeImport(parsed: ExportFile): Promise<ImportResult> {
  const [existingTemplates, existingInvoices, existingImages] =
    await Promise.all([getAllTemplates(), getAllInvoices(), getAllImages()]);

  const existingTemplateNames = new Set(
    existingTemplates.map(template => template.name.toLowerCase())
  );
  const existingInvoiceNames = new Set(
    existingInvoices.map(invoice => invoice.name.toLowerCase())
  );
  const existingImageIds = new Set(existingImages.map(image => image.id));

  // Images keep their original id so referential integrity survives (invoice and
  // template records already point at that id, so nothing needs remapping) and a
  // re-import stays idempotent: an id already in the database is the same blob,
  // so we skip it rather than store a fresh copy. This is what analyzeImport
  // reports as "duplicates", keeping the preview honest about what runs here.
  const imagesToStore: StoredImage[] = [];
  for (const imageExport of parsed.images) {
    if (existingImageIds.has(imageExport.id)) continue;

    imagesToStore.push({
      id: imageExport.id,
      data: base64ToArrayBuffer(imageExport.data),
      type: imageExport.type,
      createdAt: toValidDate(imageExport.createdAt)
    });
  }

  const templateIdMap = new Map<string, string>();
  const templatesToStore: InvoiceTemplate[] = [];
  for (const templateExport of parsed.templates) {
    const newId = crypto.randomUUID();
    templateIdMap.set(templateExport.id, newId);
    const resolvedName = resolveConflictName(
      templateExport.name,
      existingTemplateNames
    );

    const templateData = migrateInvoiceData(
      structuredClone(templateExport.templateData),
      templateExport.schemaVersion ?? 0
    );

    templatesToStore.push({
      id: newId,
      name: resolvedName,
      description: templateExport.description,
      isDefault: false,
      templateData,
      screenshotUrl: templateExport.screenshotUrl,
      schemaVersion: CURRENT_INVOICE_SCHEMA_VERSION,
      createdAt: toValidDate(templateExport.createdAt),
      updatedAt: toValidDate(templateExport.updatedAt)
    });
  }

  const invoicesToStore: InvoiceDocument[] = [];
  for (const invoiceExport of parsed.invoices) {
    const newId = crypto.randomUUID();
    const resolvedName = resolveConflictName(
      invoiceExport.name,
      existingInvoiceNames
    );

    const invoiceData = migrateInvoiceData(
      structuredClone(invoiceExport.invoiceData),
      invoiceExport.schemaVersion ?? 0
    );

    const newTemplateId = invoiceExport.templateId
      ? (templateIdMap.get(invoiceExport.templateId) ??
        invoiceExport.templateId)
      : invoiceExport.templateId;

    // A name that follows the content can't clash, so it isn't renamed.
    const nameSource = invoiceExport.nameSource ?? "user";

    invoicesToStore.push({
      id: newId,
      name:
        nameSource === "auto" ? deriveInvoiceName(invoiceData) : resolvedName,
      nameSource,
      rev: 1,
      invoiceData,
      templateId: newTemplateId,
      schemaVersion: CURRENT_INVOICE_SCHEMA_VERSION,
      createdAt: toValidDate(invoiceExport.createdAt),
      updatedAt: toValidDate(invoiceExport.updatedAt)
    });
  }

  await importDataAtomically({
    images: imagesToStore,
    templates: templatesToStore,
    invoices: invoicesToStore
  });

  return {
    templatesImported: templatesToStore.length,
    invoicesImported: invoicesToStore.length,
    imagesImported: imagesToStore.length
  };
}
