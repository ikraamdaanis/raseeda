import type { Table } from "dexie";
import Dexie, { liveQuery } from "dexie";
import { isEqual } from "lodash-es";
import { DATABASE_NAME } from "~/consts/database";
import {
  LAST_OPENED_INVOICE_KEY,
  migrateToAutosave
} from "~/db/autosave-migration";
import {
  CURRENT_INVOICE_SCHEMA_VERSION,
  migrateInvoiceData
} from "~/schema/migrations";
import type {
  Invoice,
  InvoiceDocument,
  InvoiceDraft,
  InvoiceTemplate,
  InvoiceVersion
} from "~/types";
import { deriveInvoiceName } from "~/utils/invoice-name";
import { selectOrphanedImageIds } from "~/utils/select-orphaned-images";
import { selectVersionsToDelete } from "~/utils/version-thinning";

// The business profile was removed in schema version 6. Its fixed id is
// retained only so the v5 migration can provision (and v6 can drop) the row.
const LEGACY_BUSINESS_PROFILE_ID = "business-profile";

// Validate + migrate stored data on the way out, stamping the current schema
// version. Old records (no version) are treated as v0 and brought fully current.
// An invoice as stored. Records from before autosave have no revision or name
// source until the version 8 upgrade has run over them.
type StoredInvoice = Omit<InvoiceDocument, "rev" | "nameSource"> &
  Partial<Pick<InvoiceDocument, "rev" | "nameSource">>;

function migrateStoredInvoice(document: StoredInvoice): InvoiceDocument {
  return {
    ...document,
    nameSource: document.nameSource ?? "user",
    rev: document.rev ?? 1,
    invoiceData: migrateInvoiceData(
      document.invoiceData,
      document.schemaVersion ?? 0
    ),
    schemaVersion: CURRENT_INVOICE_SCHEMA_VERSION
  };
}

function migrateStoredVersion(version: InvoiceVersion): InvoiceVersion {
  return {
    ...version,
    invoiceData: migrateInvoiceData(
      version.invoiceData,
      version.schemaVersion ?? 0
    ),
    schemaVersion: CURRENT_INVOICE_SCHEMA_VERSION
  };
}

function migrateStoredTemplate(template: InvoiceTemplate): InvoiceTemplate {
  return {
    ...template,
    templateData: migrateInvoiceData(
      template.templateData,
      template.schemaVersion ?? 0
    ),
    schemaVersion: CURRENT_INVOICE_SCHEMA_VERSION
  };
}

export interface StoredImage {
  id: string;
  data: ArrayBuffer;
  type: string;
  createdAt: Date;
}

interface ErrorWithOptionalFields {
  name?: unknown;
  message?: unknown;
}

function getErrorName(error: unknown): string | null {
  if (!error || typeof error !== "object") return null;

  const { name } = error as ErrorWithOptionalFields;

  return typeof name === "string" && name.length > 0 ? name : null;
}

function getErrorMessage(error: unknown): string | null {
  if (!error || typeof error !== "object") return null;

  const { message } = error as ErrorWithOptionalFields;

  return typeof message === "string" && message.length > 0 ? message : null;
}

function isUpgradeError(error: unknown): boolean {
  const name = getErrorName(error);

  if (!name) return false;

  return (
    name === "UpgradeError" || name === "VersionError" || name === "SchemaError"
  );
}

function getFriendlyIndexedDbErrorMessage(error: unknown): string {
  const name = getErrorName(error);

  if (name === "MissingAPIError") {
    return "Local storage is not available in this browser. Please use a browser that supports IndexedDB.";
  }

  if (name === "SecurityError") {
    return "Local storage is blocked by your browser settings. Please enable site storage/IndexedDB and try again.";
  }

  if (name === "QuotaExceededError") {
    return "Your browser storage is full. Please free up space (or remove saved templates) and try again.";
  }

  if (name === "InvalidStateError") {
    return "Local storage is temporarily unavailable. If you have this app open in another tab, close it and refresh.";
  }

  const message = getErrorMessage(error);

  if (message) return message;

  return "Unable to access local storage. Please check your browser settings and ensure IndexedDB is enabled.";
}

function createStorageError(error: unknown, fallbackMessage: string): Error {
  return new Error(error instanceof Error ? error.message : fallbackMessage, {
    cause: error
  });
}

// Whether a storage failure, or anything it was caused by, is the browser
// running out of room for this site.
export function isStorageFullError(error: unknown): boolean {
  let current: unknown = error;

  for (let depth = 0; current && depth < 5; depth++) {
    const name = getErrorName(current);

    if (name === "QuotaExceededError") return true;

    current =
      (current as { cause?: unknown; inner?: unknown }).cause ??
      (current as { inner?: unknown }).inner;
  }

  return false;
}

/**
 * InvoiceDatabase - IndexedDB database for storing invoices, templates, and images.
 *
 * MIGRATION GUIDELINES:
 * - Always increment the version number when changing the schema
 * - Keep ALL previous version definitions (Dexie needs them for migrations)
 * - For new tables: No upgrade callback needed - Dexie handles it automatically
 * - For schema changes (adding/removing indexes): No upgrade callback needed
 * - For data transformations: Use .upgrade(tx => { ... }) to transform existing data
 * - NEVER delete the database automatically - this causes data loss
 *
 * Example migration with data transformation:
 *   this.version(3)
 *     .stores({ templates: "id, name, createdAt, updatedAt, newField" })
 *     .upgrade(async tx => {
 *       await tx.table("templates").toCollection().modify(template => {
 *         template.newField = "default value";
 *       });
 *     });
 */
class InvoiceDatabase extends Dexie {
  templates!: Table<InvoiceTemplate, string>;
  invoices!: Table<InvoiceDocument, string>;
  images!: Table<StoredImage, string>;
  drafts!: Table<InvoiceDraft, string>;
  versions!: Table<InvoiceVersion, string>;
  meta!: Table<{ key: string; value: unknown }, string>;

  constructor() {
    super(DATABASE_NAME);
    // Version 1: Initial schema with templates and images
    this.version(1).stores({
      templates: "id, name, createdAt, updatedAt",
      images: "id"
    });
    // Version 2: Added invoices table (no data migration needed - new table only)
    // Dexie automatically handles adding new tables - no upgrade callback needed
    this.version(2).stores({
      templates: "id, name, createdAt, updatedAt",
      invoices: "id, name, createdAt, updatedAt",
      images: "id"
    });
    // Version 3: Replaced per-field text settings with a single global theme.
    // Transform stored invoiceData/templateData into the new model: add a
    // default theme, collapse the old table header settings into column labels,
    // and drop the obsolete per-field *Settings keys.
    this.version(3)
      .stores({
        templates: "id, name, createdAt, updatedAt",
        invoices: "id, name, createdAt, updatedAt",
        images: "id"
      })
      .upgrade(async tx => {
        await tx
          .table("invoices")
          .toCollection()
          .modify(invoice => {
            invoice.invoiceData = migrateInvoiceData(invoice.invoiceData, 0);
            invoice.schemaVersion = CURRENT_INVOICE_SCHEMA_VERSION;
          });
        await tx
          .table("templates")
          .toCollection()
          .modify(template => {
            template.templateData = migrateInvoiceData(
              template.templateData,
              0
            );
            template.schemaVersion = CURRENT_INVOICE_SCHEMA_VERSION;
          });
      });
    // Version 4: Stopped persisting derived money fields (subtotal, total,
    // per-item amount, tax.amount); they are now computed at render. Re-run the
    // invoice migration, which strips those keys and stamps the schema version.
    this.version(4)
      .stores({
        templates: "id, name, createdAt, updatedAt",
        invoices: "id, name, createdAt, updatedAt",
        images: "id"
      })
      .upgrade(async tx => {
        await tx
          .table("invoices")
          .toCollection()
          .modify(invoice => {
            invoice.invoiceData = migrateInvoiceData(invoice.invoiceData, 0);
            invoice.schemaVersion = CURRENT_INVOICE_SCHEMA_VERSION;
          });
        await tx
          .table("templates")
          .toCollection()
          .modify(template => {
            template.templateData = migrateInvoiceData(
              template.templateData,
              0
            );
            template.schemaVersion = CURRENT_INVOICE_SCHEMA_VERSION;
          });
      });
    // Version 5: Added the singleton business profile. Existing invoices,
    // templates, and images are untouched; the upgrade only provisions a
    // default (empty) profile so returning users have one to edit. The profile
    // was later removed (v6); the default is inlined here so this historical
    // migration no longer depends on the deleted profile module.
    this.version(5)
      .stores({
        templates: "id, name, createdAt, updatedAt",
        invoices: "id, name, createdAt, updatedAt",
        images: "id",
        profiles: "id"
      })
      .upgrade(async tx => {
        const existing = await tx
          .table("profiles")
          .get(LEGACY_BUSINESS_PROFILE_ID);

        if (existing) return;

        await tx.table("profiles").put({
          id: LEGACY_BUSINESS_PROFILE_ID,
          businessName: "",
          address: "",
          email: "",
          phone: "",
          logoImageId: "",
          paymentDetails: {
            bankName: "",
            accountNumber: "",
            iban: "",
            sortCode: "",
            terms: ""
          },
          numbering: { prefix: "INV-", padding: 4, nextNumber: 1 }
        });
      });
    // Version 6: Remove the business profile entirely. Its sender details, logo,
    // and payment defaults were pre-fill conveniences that new invoices no
    // longer use, and invoice numbering is no longer persisted (each new invoice
    // just carries a static default number the user edits), so the whole table
    // is dropped.
    this.version(6).stores({
      templates: "id, name, createdAt, updatedAt",
      invoices: "id, name, createdAt, updatedAt",
      images: "id",
      profiles: null
    });
    // Version 7: Added the singleton autosaved working draft. New table only, so
    // Dexie provisions it automatically; existing data is untouched.
    this.version(7).stores({
      templates: "id, name, createdAt, updatedAt",
      invoices: "id, name, createdAt, updatedAt",
      images: "id",
      drafts: "id"
    });
    // Version 8: Autosave. Invoices gain a content revision and a name source,
    // each invoice keeps a version history, and the shared working draft is
    // moved into the library (see migrateToAutosave). The drafts table stays
    // for one release so a rollback still finds it.
    this.version(8)
      .stores({
        templates: "id, name, createdAt, updatedAt",
        invoices: "id, name, createdAt, updatedAt",
        images: "id",
        drafts: "id",
        versions: "id, invoiceId, imageId",
        meta: "key"
      })
      .upgrade(tx => migrateToAutosave(tx));
  }
}

export const db = new InvoiceDatabase();

let dbOpenPromise: Promise<void> | null = null;

// Ensure database is ready before use
async function ensureDbReady(): Promise<void> {
  if (db.isOpen()) return;
  if (dbOpenPromise) return dbOpenPromise;

  dbOpenPromise = (async () => {
    try {
      await db.open();
      return;
    } catch (error) {
      // Dexie handles migrations automatically when versions are properly defined.
      // Upgrade errors should be rare and usually indicate a serious issue.
      // We should NOT automatically delete user data - that would cause data loss.
      if (isUpgradeError(error)) {
        // Log the error for debugging
        console.error(
          "[InvoiceDatabase] Migration error - this should not happen with proper version definitions",
          error
        );
        // Provide a helpful error message without deleting data
        const message = getErrorMessage(error);

        throw new Error(
          `Database migration failed. Your data is safe, but the app cannot start. Please refresh the page.${message ? ` (${message})` : ""}`,
          { cause: error }
        );
      }

      // Log raw error for debugging without breaking UX messaging.
      console.error("[InvoiceDatabase] Failed to open IndexedDB", error);

      throw new Error(getFriendlyIndexedDbErrorMessage(error), {
        cause: error
      });
    } finally {
      dbOpenPromise = null;
    }
  })();

  return dbOpenPromise;
}

export async function getAllTemplates(): Promise<InvoiceTemplate[]> {
  try {
    await ensureDbReady();
    return (await db.templates.toArray()).map(migrateStoredTemplate);
  } catch (error) {
    throw createStorageError(
      error,
      "Failed to load templates from local storage."
    );
  }
}

export async function saveTemplate(template: InvoiceTemplate): Promise<string> {
  try {
    await ensureDbReady();
    return await db.templates.put({
      ...template,
      schemaVersion: CURRENT_INVOICE_SCHEMA_VERSION
    });
  } catch (error) {
    throw createStorageError(
      error,
      "Failed to save template to local storage."
    );
  }
}

export async function deleteTemplate(id: string): Promise<void> {
  try {
    await ensureDbReady();
    await db.templates.delete(id);
  } catch (error) {
    throw createStorageError(
      error,
      "Failed to delete template from local storage."
    );
  }
}

// Deletes several templates in one transaction, so a failure part way leaves
// them all in place.
export async function deleteTemplates(ids: string[]): Promise<void> {
  try {
    await ensureDbReady();
    await db.templates.bulkDelete(ids);
  } catch (error) {
    throw createStorageError(
      error,
      "Failed to delete templates from local storage."
    );
  }
}

// Changes only a template's name (and when it was edited), so content saved
// from another tab since the list was read is kept.
export async function renameTemplate(id: string, name: string): Promise<void> {
  try {
    await ensureDbReady();
    const updated = await db.templates.update(id, {
      name,
      updatedAt: new Date()
    });

    if (updated === 0) throw new Error("That template no longer exists.");
  } catch (error) {
    throw createStorageError(
      error,
      "Failed to rename template in local storage."
    );
  }
}

// Keeps a listener in step with a table: called with the current rows, then
// again whenever they change, in this tab or another (Dexie's live queries).
// The database is opened first, outside the live query, which may only await
// Dexie calls. Returns the unsubscribe.
function watchTable<TRow>(
  read: () => Promise<TRow[]>,
  onChange: (rows: TRow[]) => void,
  onError: (error: Error) => void
): () => void {
  let subscription: { unsubscribe: () => void } | null = null;
  let stopped = false;

  ensureDbReady()
    .then(() => {
      if (stopped) return;

      subscription = liveQuery(read).subscribe({
        next: onChange,
        error: (error: unknown) =>
          onError(createStorageError(error, "Failed to load from storage."))
      });
    })
    .catch((error: unknown) =>
      onError(error instanceof Error ? error : new Error(String(error)))
    );

  return () => {
    stopped = true;
    subscription?.unsubscribe();
  };
}

export function watchInvoices(
  onChange: (invoices: InvoiceDocument[]) => void,
  onError: (error: Error) => void
): () => void {
  return watchTable(
    async () => (await db.invoices.toArray()).map(migrateStoredInvoice),
    onChange,
    onError
  );
}

export function watchTemplates(
  onChange: (templates: InvoiceTemplate[]) => void,
  onError: (error: Error) => void
): () => void {
  return watchTable(
    async () => (await db.templates.toArray()).map(migrateStoredTemplate),
    onChange,
    onError
  );
}

export async function getAllInvoices(): Promise<InvoiceDocument[]> {
  try {
    await ensureDbReady();
    return (await db.invoices.toArray()).map(migrateStoredInvoice);
  } catch (error) {
    throw createStorageError(
      error,
      "Failed to load invoices from local storage."
    );
  }
}

export async function countInvoices(): Promise<number> {
  try {
    await ensureDbReady();
    return await db.invoices.count();
  } catch (error) {
    throw createStorageError(
      error,
      "Failed to count invoices in local storage."
    );
  }
}

// Writes a whole invoice record as given, for seeding and tests. The editor
// writes through createInvoice and writeInvoiceContent instead.
export async function saveInvoice(invoice: InvoiceDocument): Promise<string> {
  try {
    await ensureDbReady();
    return await db.invoices.put({
      ...invoice,
      schemaVersion: CURRENT_INVOICE_SCHEMA_VERSION
    });
  } catch (error) {
    throw createStorageError(error, "Failed to save invoice to local storage.");
  }
}

// Adds a new invoice to the library. Fails rather than replacing one that
// already has its id.
export async function createInvoice(invoice: InvoiceDocument): Promise<void> {
  try {
    await ensureDbReady();
    await db.invoices.add({
      ...invoice,
      schemaVersion: CURRENT_INVOICE_SCHEMA_VERSION
    });
  } catch (error) {
    throw createStorageError(error, "Failed to save invoice to local storage.");
  }
}

// Writes an invoice's content as a compare-and-swap on its revision, in one
// read-write transaction: when the stored revision isn't the one the content
// was edited from, someone else wrote it in the meantime and nothing is
// overwritten. Only the content, the revision and when it was edited change;
// the name moves too only while it's still the automatic one, read inside the
// same transaction so a rename made elsewhere always wins.
export async function writeInvoiceContent({
  id,
  expectedRev,
  invoiceData
}: {
  id: string;
  expectedRev: number;
  invoiceData: Invoice;
}): Promise<
  | { outcome: "saved"; rev: number }
  | { outcome: "conflict"; document: InvoiceDocument }
  | { outcome: "missing" }
> {
  try {
    await ensureDbReady();

    return await db.transaction("rw", db.invoices, async () => {
      const stored: StoredInvoice | undefined = await db.invoices.get(id);

      if (!stored) return { outcome: "missing" } as const;

      const storedRev = stored.rev ?? 1;

      if (storedRev !== expectedRev) {
        return {
          outcome: "conflict",
          document: migrateStoredInvoice(stored)
        } as const;
      }

      const rev = storedRev + 1;

      await db.invoices.update(id, {
        invoiceData,
        rev,
        updatedAt: new Date(),
        schemaVersion: CURRENT_INVOICE_SCHEMA_VERSION,
        ...(stored.nameSource === "auto"
          ? { name: deriveInvoiceName(invoiceData) }
          : {})
      });

      return { outcome: "saved", rev } as const;
    });
  } catch (error) {
    throw createStorageError(error, "Failed to save invoice to local storage.");
  }
}

// Calls back with an invoice whenever it changes, in this tab or another, and
// with undefined once it no longer exists. Returns the unsubscribe.
export function watchInvoice(
  id: string,
  onChange: (invoice: InvoiceDocument | undefined) => void,
  onError: (error: Error) => void
): () => void {
  let subscription: { unsubscribe: () => void } | null = null;
  let stopped = false;

  ensureDbReady()
    .then(() => {
      if (stopped) return;

      subscription = liveQuery(() => db.invoices.get(id)).subscribe({
        next: invoice =>
          onChange(invoice ? migrateStoredInvoice(invoice) : undefined),
        error: (error: unknown) =>
          onError(createStorageError(error, "Failed to load from storage."))
      });
    })
    .catch((error: unknown) =>
      onError(error instanceof Error ? error : new Error(String(error)))
    );

  return () => {
    stopped = true;
    subscription?.unsubscribe();
  };
}

export async function getInvoice(
  id: string
): Promise<InvoiceDocument | undefined> {
  try {
    await ensureDbReady();
    const document = await db.invoices.get(id);

    return document ? migrateStoredInvoice(document) : undefined;
  } catch (error) {
    throw createStorageError(
      error,
      "Failed to load invoice from local storage."
    );
  }
}

export async function deleteInvoice(id: string): Promise<void> {
  await deleteInvoices([id]);
}

// Deletes several invoices and their version histories in one transaction, so
// a failure part way leaves them all in place.
export async function deleteInvoices(ids: string[]): Promise<void> {
  try {
    await ensureDbReady();
    await db.transaction("rw", db.invoices, db.versions, async () => {
      await db.invoices.bulkDelete(ids);
      await db.versions.where("invoiceId").anyOf(ids).delete();
    });
  } catch (error) {
    throw createStorageError(
      error,
      "Failed to delete invoices from local storage."
    );
  }
}

// Changes only an invoice's name (and when it was edited), so content saved
// from another tab since the list was read is kept. A name given this way is
// the invoice's own from then on: it no longer follows the content.
export async function renameInvoice(id: string, name: string): Promise<void> {
  try {
    await ensureDbReady();
    const updated = await db.invoices.update(id, {
      name,
      nameSource: "user",
      updatedAt: new Date()
    });

    if (updated === 0) throw new Error("That invoice no longer exists.");
  } catch (error) {
    throw createStorageError(
      error,
      "Failed to rename invoice in local storage."
    );
  }
}

// Keeps a copy of an invoice in its version history, unless it's the same as
// the newest one there, then lets old versions go (see selectVersionsToDelete).
// Resolves whether a version was added.
export async function addInvoiceVersion(
  version: Omit<
    InvoiceVersion,
    "id" | "createdAt" | "schemaVersion" | "imageId"
  >
): Promise<boolean> {
  try {
    await ensureDbReady();

    return await db.transaction("rw", db.versions, async () => {
      const existing = await db.versions
        .where("invoiceId")
        .equals(version.invoiceId)
        .toArray();
      const newest = existing.reduce<InvoiceVersion | null>(
        (latest, candidate) =>
          !latest || candidate.createdAt > latest.createdAt
            ? candidate
            : latest,
        null
      );

      if (
        newest &&
        isEqual(migrateStoredVersion(newest).invoiceData, version.invoiceData)
      ) {
        return false;
      }

      const now = new Date();
      const added: InvoiceVersion = {
        ...version,
        imageId: version.invoiceData.image,
        id: crypto.randomUUID(),
        schemaVersion: CURRENT_INVOICE_SCHEMA_VERSION,
        createdAt: now
      };

      await db.versions.add(added);

      const toDelete = selectVersionsToDelete([...existing, added], now);

      if (toDelete.length > 0) await db.versions.bulkDelete(toDelete);

      return true;
    });
  } catch (error) {
    throw createStorageError(
      error,
      "Failed to keep a version in local storage."
    );
  }
}

// An invoice's version history, newest first.
export async function getInvoiceVersions(
  invoiceId: string
): Promise<InvoiceVersion[]> {
  try {
    await ensureDbReady();
    const versions = await db.versions
      .where("invoiceId")
      .equals(invoiceId)
      .toArray();

    return versions
      .map(migrateStoredVersion)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  } catch (error) {
    throw createStorageError(
      error,
      "Failed to load version history from local storage."
    );
  }
}

// The invoice a new tab opens: the one opened or created most recently in any
// tab. Resolves null when there isn't one or it can't be read.
export async function getLastOpenedInvoiceId(): Promise<string | null> {
  await ensureDbReady();
  const row = await db.meta.get(LAST_OPENED_INVOICE_KEY);

  return typeof row?.value === "string" ? row.value : null;
}

export async function setLastOpenedInvoiceId(id: string): Promise<void> {
  try {
    await ensureDbReady();
    await db.meta.put({ key: LAST_OPENED_INVOICE_KEY, value: id });
  } catch (error) {
    console.error(
      "[InvoiceDatabase] Failed to remember the open invoice",
      error
    );
  }
}

// Runs when a newer version of the app in another tab needs to upgrade the database.
// Dexie closes this tab's connection so the upgrade can go ahead, after which
// nothing here can be written until the page reloads. Returns the unsubscribe.
export function onDatabaseUpgradeElsewhere(listener: () => void): () => void {
  function handler() {
    listener();
  }

  db.on("versionchange", handler);

  return () => db.on("versionchange").unsubscribe(handler);
}

// Whether storage opens at all in this browser, for telling a broken or
// blocked IndexedDB apart from an empty one.
export async function openDatabase(): Promise<void> {
  await ensureDbReady();
}

export async function saveImage(
  id: string,
  blob: Blob,
  type: string
): Promise<string> {
  try {
    await ensureDbReady();
    // Convert blob to ArrayBuffer for reliable storage
    const arrayBuffer = await blob.arrayBuffer();
    const image: StoredImage = {
      id,
      data: arrayBuffer,
      type,
      createdAt: new Date()
    };
    await db.images.put(image);
    // Verify save worked
    const verify = await db.images.get(id);
    if (!verify) {
      throw new Error(
        "Failed to save image. The image may be too large or your browser storage may be full."
      );
    }
    return id;
  } catch (error) {
    throw createStorageError(error, "Failed to save image to local storage.");
  }
}

export async function deleteImage(id: string): Promise<void> {
  try {
    await ensureDbReady();
    await db.images.delete(id);
  } catch (error) {
    throw createStorageError(
      error,
      "Failed to delete image from local storage."
    );
  }
}

// Writes a whole backup (images, templates, invoices) in one read-write
// transaction so it either fully applies or fully rolls back. If any put fails
// partway (e.g. a quota error), Dexie aborts the transaction and the database is
// left exactly as it was, which also stops a retry from duplicating records that
// a partial commit would otherwise have left behind. Callers must decode/prepare
// every record before calling this; the callback does only Dexie work so the
// transaction never commits early on a foreign await.
export async function importDataAtomically(records: {
  images: StoredImage[];
  templates: InvoiceTemplate[];
  invoices: InvoiceDocument[];
}): Promise<void> {
  try {
    await ensureDbReady();
    await db.transaction(
      "rw",
      db.images,
      db.templates,
      db.invoices,
      async () => {
        await db.images.bulkPut(records.images);
        await db.templates.bulkPut(records.templates);
        await db.invoices.bulkPut(records.invoices);
      }
    );
  } catch (error) {
    throw createStorageError(
      error,
      "Failed to import data into local storage."
    );
  }
}

export async function getAllImages(): Promise<StoredImage[]> {
  try {
    await ensureDbReady();
    return await db.images.toArray();
  } catch (error) {
    throw createStorageError(
      error,
      "Failed to load images from local storage."
    );
  }
}

// A blob this new is never swept. Another tab's undo history may still point
// at a logo it uploaded and then removed, and no tab can see another's
// history; logos older than this are kept by the version taken when their
// invoice was opened.
const ORPHAN_GRACE_MS = 24 * 60 * 60 * 1000;

// Image ids in use outside the database, such as this tab's undo history and
// the invoice being edited before its next save.
const imageKeepers = new Set<() => Iterable<string>>();

export function registerImageKeeper(
  keeper: () => Iterable<string>
): () => void {
  imageKeepers.add(keeper);

  return () => {
    imageKeepers.delete(keeper);
  };
}

/**
 * Delete image blobs that nothing references: no saved invoice, template or
 * version, nothing a registered keeper names (this tab's undo history and the
 * invoice being edited), and nothing in `keepImageIds`. Blobs from the last
 * day are always kept, since another tab's undo history may need them.
 *
 * Best-effort: failures are logged but never thrown, since this is background
 * garbage collection that must not disrupt the upload/load/reset it follows.
 */
// Serialises orphan sweeps so overlapping callers (upload, load, save, reset)
// can't interleave their read-then-bulkDelete and drop a blob another sweep was
// about to keep. runOrphanCleanup never throws, so the chain never rejects.
let orphanCleanupChain: Promise<void> = Promise.resolve();

export function cleanupOrphanedImages(
  keepImageIds: string[] = []
): Promise<void> {
  orphanCleanupChain = orphanCleanupChain.then(() =>
    runOrphanCleanup(keepImageIds)
  );

  return orphanCleanupChain;
}

async function runOrphanCleanup(keepImageIds: string[]): Promise<void> {
  try {
    await ensureDbReady();

    const [invoices, templates, versionImageIds, images] = await Promise.all([
      db.invoices.toArray(),
      db.templates.toArray(),
      db.versions.orderBy("imageId").uniqueKeys(),
      db.images.toArray()
    ]);
    const referencedImageIds = [
      ...invoices.map(invoice => invoice.invoiceData.image),
      ...templates.map(template => template.templateData.image),
      ...versionImageIds.map(String)
    ];
    const keptByTabs = [...imageKeepers].flatMap(keeper => [...keeper()]);
    const graceStart = Date.now() - ORPHAN_GRACE_MS;
    const recentImageIds = images
      .filter(image => new Date(image.createdAt).getTime() > graceStart)
      .map(image => image.id);
    const orphanedImageIds = selectOrphanedImageIds(
      images.map(image => image.id),
      referencedImageIds,
      [...keepImageIds, ...keptByTabs, ...recentImageIds]
    );

    if (orphanedImageIds.length === 0) return;

    await db.images.bulkDelete(orphanedImageIds);
  } catch (error) {
    console.error(
      "[InvoiceDatabase] Failed to clean up orphaned images",
      error
    );
  }
}

export async function getImageBlob(id: string): Promise<Blob | null> {
  try {
    await ensureDbReady();
    const image = await db.images.get(id);
    if (!image) {
      return null;
    }
    // Convert ArrayBuffer back to Blob
    return new Blob([image.data], { type: image.type });
  } catch (error) {
    throw createStorageError(error, "Failed to load image from local storage.");
  }
}
