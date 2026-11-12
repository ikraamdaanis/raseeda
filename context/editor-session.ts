import { isEqual } from "lodash-es";
import { toast } from "sonner";
import { APP_NAME } from "~/consts/app";
import { claimEditor, holdsEditor, releaseEditor } from "~/context/editor-lock";
import { createSaveController } from "~/context/save-controller";
import {
  addInvoiceVersion,
  cleanupOrphanedImages,
  createInvoice,
  deleteAllData,
  deleteInvoices,
  getAllInvoices,
  getInvoice,
  getLastOpenedInvoiceId,
  isStorageFullError,
  onDatabaseUpgradeElsewhere,
  openDatabase,
  registerImageKeeper,
  renameInvoice,
  setLastOpenedInvoiceId,
  updateInvoiceContent
} from "~/db";
import { getChangeOrigin, runWithOrigin } from "~/stores/change-origin";
import { useDocumentStore } from "~/stores/document-store";
import {
  clearInvoiceHistory,
  getHistoryImageIds,
  recordHistoryAction,
  setInvoiceHistoryEnabled,
  startInvoiceHistory
} from "~/stores/invoice-history";
import {
  INVOICE_DATA_KEYS,
  selectInvoiceData
} from "~/stores/invoice-selectors";
import type { InvoiceStore } from "~/stores/invoice-store";
import {
  createBlankDocument,
  createBlankInvoice,
  invoiceDefault,
  useInvoiceStore
} from "~/stores/invoice-store";
import type {
  DocumentType,
  Invoice,
  InvoiceDocument,
  InvoiceFont,
  InvoiceNameSource,
  InvoiceTemplate,
  InvoiceVersion,
  InvoiceVersionReason,
  SiteTemplateId
} from "~/types";
import { ensureRowIds } from "~/utils/ensure-row-ids";
import { downloadBackupFile } from "~/utils/export-data";
import { isBlankInvoice, isLargeRemoval } from "~/utils/invoice-content";
import { describeCopy, prepareInvoiceCopy } from "~/utils/invoice-copy";
import { deriveInvoiceName } from "~/utils/invoice-name";
import { createSiteTemplateInvoice } from "~/utils/site-template";
import { trackInvoice } from "~/utils/track";

// The editor session (docs/adr/0001): which invoice is open, saving it as
// it's edited. One tab has the editor at a time (context/editor-lock), and
// only that tab opens the database, so nothing else writes the open invoice:
// - each open invoice gets its own save controller, which creates it on its
//   first real edit and after that updates its content;
// - a failed write is shown, kept in memory and retried, never stashed;
// - an invoice with an automatic name edited back to blank is deleted when
//   it's left;
// - the invoice keeps a version history: when opened, after a pause in
//   editing, before a restore and before a change that removes most of it.

// A pause this long after an edit keeps a version, at most this often.
const VERSION_IDLE_MS = 30_000;

const VERSION_MIN_INTERVAL_MS = 10 * 60_000;

// Per tab: which invoice this tab has open, so a reload reopens it.
const OPEN_INVOICE_KEY = "open-invoice";

const BACKUP_REMINDER_KEY = "backup-reminder";

// Thrown when an invoice that's being opened no longer exists.
export class DocumentNotFoundError extends Error {
  constructor() {
    super("That invoice no longer exists.");
    this.name = "DocumentNotFoundError";
  }
}

type DocumentStatus = ReturnType<typeof useDocumentStore.getState>["status"];

type Session = {
  id: string;
  // Whether the invoice is in the library yet.
  isRecord: boolean;
  name: string;
  nameSource: InvoiceNameSource;
  templateId: string | null;
  // For a new invoice, what it started as (a blank, or a template). Until the
  // content differs from it, nothing has been edited.
  pristine: Invoice | null;
  status: DocumentStatus;
  controller: ReturnType<typeof createSaveController<Invoice>>;
  failure: unknown;
  failureEpisode: number;
  idleVersionTimer: ReturnType<typeof setTimeout> | null;
  lastVersionAt: number;
  // This tab is deleting the invoice, so nothing more is written to it.
  deleting: boolean;
  disposed: boolean;
};

let current: Session | null = null;
let failureEpisodes = 0;
let hydrated = false;
let hydrationPromise: Promise<void> | null = null;
let persistenceRequested = false;
let storageUnavailable = false;

// Session operations run one at a time, so two can never interleave.
let queue: Promise<unknown> = Promise.resolve();

function enqueue<TResult>(operation: () => Promise<TResult>): Promise<TResult> {
  const result = queue.then(operation);

  queue = result.catch(() => {});

  return result;
}

const lockCallbacks = {
  onGranted: () => void enqueue(editorGranted),
  onLetGo: () => enqueue(letEditorGo)
};

function isActive(session: Session) {
  return session === current && !session.disposed;
}

function liveContent(): Invoice {
  return selectInvoiceData(useInvoiceStore.getState());
}

function displayName(session: Session, content: Invoice = liveContent()) {
  return session.nameSource === "user"
    ? session.name
    : deriveInvoiceName(content);
}

export function failureMessage(failure: unknown): string {
  if (isStorageFullError(failure)) {
    return `Browser storage is full, so your latest changes aren't saved. They're kept in this tab while ${APP_NAME} tries again.`;
  }

  return `Your latest changes couldn't be saved. They're kept in this tab while ${APP_NAME} tries again.`;
}

function publish(session: Session) {
  if (session !== current) return;

  useDocumentStore.setState({
    documentId: session.id,
    isRecord: session.isRecord,
    documentName: session.name,
    nameSource: session.nameSource,
    status: session.status,
    saveFailure: session.failure
      ? {
          message: failureMessage(session.failure),
          storageFull: isStorageFullError(session.failure),
          episode: session.failureEpisode
        }
      : null
  });
  setInvoiceHistoryEnabled(
    session.status === "editing" || session.status === "unavailable"
  );
}

function readStorage(
  area: "sessionStorage" | "localStorage",
  key: string
): string | null {
  try {
    return typeof window === "undefined" ? null : window[area].getItem(key);
  } catch {
    return null;
  }
}

function writeStorage(
  area: "sessionStorage" | "localStorage",
  key: string,
  value: string
) {
  try {
    if (typeof window !== "undefined") window[area].setItem(key, value);
  } catch {
    // Storage full or blocked: nothing depends on it landing.
  }
}

// Whether the content has anything in it worth keeping.
function hasEdits(session: Session, content: Invoice) {
  return session.pristine
    ? !isEqual(content, session.pristine)
    : !isBlankInvoice(content);
}

async function keepVersion(
  session: Session,
  content: Invoice,
  reason: InvoiceVersionReason
): Promise<void> {
  if (!session.isRecord) return;

  const added = await addInvoiceVersion({
    invoiceId: session.id,
    name: displayName(session, content),
    invoiceData: structuredClone(content),
    reason
  });

  if (added) session.lastVersionAt = Date.now();
}

function keepVersionQuietly(
  session: Session,
  content: Invoice,
  reason: InvoiceVersionReason
) {
  keepVersion(session, content, reason).catch((error: unknown) =>
    console.error("[EditorSession] Failed to keep a version", error)
  );
}

// Asks the browser to keep the app's storage once an invoice exists. Safari
// is the one that clears storage on its own, so a no there suggests a
// backup, once.
async function requestPersistentStorage() {
  if (persistenceRequested) return;

  persistenceRequested = true;

  if (typeof navigator === "undefined" || !("storage" in navigator)) return;

  try {
    if (await navigator.storage.persisted()) return;
    if (await navigator.storage.persist()) return;
  } catch {
    return;
  }

  if (!navigator.vendor.startsWith("Apple")) return;
  if (readStorage("localStorage", BACKUP_REMINDER_KEY)) return;

  useDocumentStore.setState({ backupReminder: true });
}

function dismissCopyReview() {
  useDocumentStore.setState({ copyReview: null });
}

// The backup suggestion was dismissed or acted on: it doesn't come back.
function dismissBackupReminder() {
  writeStorage("localStorage", BACKUP_REMINDER_KEY, new Date().toISOString());
  useDocumentStore.setState({ backupReminder: false });
}

// Adds a new invoice to the library, and counts it.
async function joinLibrary(
  session: Session,
  content: Invoice,
  { name, nameSource }: { name: string; nameSource: InvoiceNameSource }
) {
  const now = new Date();

  await createInvoice({
    id: session.id,
    name,
    nameSource,
    invoiceData: content,
    templateId: session.templateId,
    rev: 1,
    createdAt: now,
    updatedAt: now
  });
  session.isRecord = true;
  publish(session);
  void setLastOpenedInvoiceId(session.id);
  void requestPersistentStorage();
  trackInvoice("invoice_saved", content);
}

// The one write path: creates the invoice on its first real edit, then
// updates its content. A tab without the editor writes nothing, so its edits
// stay unwritten until it gets the editor back.
async function writeContent(session: Session, content: Invoice): Promise<void> {
  if (session.deleting) return;

  if (session.status !== "editing") {
    throw session.failure ?? new Error("This tab doesn't have the editor.");
  }

  if (!session.isRecord) {
    if (!hasEdits(session, content)) return;

    await joinLibrary(session, content, {
      name: displayName(session, content),
      nameSource: session.nameSource
    });

    return;
  }

  const outcome = await updateInvoiceContent({
    id: session.id,
    invoiceData: content
  });

  if (outcome === "missing" && !isBeingDeleted(session)) markDeleted(session);
}

// Read through a call, since an await may have changed it.
function isBeingDeleted(session: Session) {
  return session.deleting;
}

function isEditing(session: Session) {
  return session.status === "editing";
}

function markDeleted(session: Session) {
  session.status = "deleted";
  session.controller.stop();
  clearInvoiceHistory();
  publish(session);
}

function clearIdleVersion(session: Session) {
  if (session.idleVersionTimer) clearTimeout(session.idleVersionTimer);

  session.idleVersionTimer = null;
}

function dispose(session: Session) {
  clearIdleVersion(session);
  session.disposed = true;
  session.controller.stop();
}

function createSession({
  id,
  isRecord,
  name,
  nameSource,
  templateId,
  pristine
}: {
  id: string;
  isRecord: boolean;
  name: string;
  nameSource: InvoiceNameSource;
  templateId: string | null;
  pristine: Invoice | null;
}): Session {
  const session: Session = {
    id,
    isRecord,
    name,
    nameSource,
    templateId,
    pristine,
    status: storageUnavailable ? "unavailable" : "editing",
    failure: null,
    failureEpisode: 0,
    idleVersionTimer: null,
    lastVersionAt: 0,
    deleting: false,
    disposed: false,
    controller: createSaveController<Invoice>({
      write: latest => writeContent(session, latest),
      onChange: ({ failure }) => {
        if (failure && !session.failure) {
          session.failureEpisode = ++failureEpisodes;

          // Make room by dropping logos nothing uses any more.
          if (isStorageFullError(failure)) void cleanupOrphanedImages();
        }

        session.failure = failure;
        publish(session);
      }
    })
  };

  return session;
}

function sessionFromDocument(document: InvoiceDocument): Session {
  return createSession({
    id: document.id,
    isRecord: true,
    name: document.name,
    nameSource: document.nameSource,
    templateId: document.templateId,
    pristine: null
  });
}

function newSession(
  content: Invoice,
  {
    templateId = null,
    pristine = true
  }: { templateId?: string | null; pristine?: boolean } = {}
): Session {
  return createSession({
    id: crypto.randomUUID(),
    isRecord: false,
    name: "",
    nameSource: "auto",
    templateId,
    pristine: pristine ? content : null
  });
}

function setContent(content: Invoice) {
  runWithOrigin("load", () => {
    useInvoiceStore
      .getState()
      .setInvoice(ensureRowIds(structuredClone(content)));
  });
  clearInvoiceHistory();
}

// Puts a session's content in the editor and makes it the open invoice. A
// load whose read failed leaves the tab pointing at the invoice it couldn't
// read, so a later reload opens it again.
function show(session: Session, content: Invoice, keepPointer = false) {
  current = session;
  setContent(content);

  if (session.pristine) session.pristine = liveContent();
  if (!keepPointer)
    writeStorage("sessionStorage", OPEN_INVOICE_KEY, session.id);

  publish(session);
}

function switchTo(session: Session, content: Invoice) {
  show(session, content);

  if (session.isRecord && session.status === "editing") {
    void setLastOpenedInvoiceId(session.id);
    keepVersionQuietly(session, liveContent(), "opened");
    void requestPersistentStorage();
  }

  void cleanupOrphanedImages();
}

// Leaves the open invoice: writes what's pending, and deletes it when it has
// an automatic name and was edited back to blank. Resolves false when it
// can't be left, in which case it stays open.
async function leaveCurrent(): Promise<boolean> {
  const session = current;

  if (!session || session.status === "elsewhere") return false;

  const wasEditing = session.status === "editing";
  const saved = !wasEditing || (await session.controller.flush());

  if (session.status === "reloadRequired") {
    toast.error("Reload the page to open another invoice", {
      description: `${APP_NAME} was updated in another tab.`
    });

    return false;
  }

  // Nothing here can be written, so moving on would lose this invoice.
  if (session.status === "unavailable" && hasEdits(session, liveContent())) {
    toast.error("This invoice can't be saved in this browser", {
      description: "Download a backup to keep it before starting another."
    });

    return false;
  }

  if (wasEditing && !saved) {
    toast.error("This invoice couldn't be saved, so it stays open", {
      description: "Try again, or download a backup to keep a copy."
    });

    return false;
  }

  if (wasEditing) await deleteIfBlank(session);

  dispose(session);

  return true;
}

// Deletes the open invoice when it has an automatic name and was edited back
// to blank. Resolves whether it did.
async function deleteIfBlank(session: Session): Promise<boolean> {
  if (!session.isRecord || session.nameSource !== "auto") return false;
  if (hasEdits(session, liveContent())) return false;

  session.deleting = true;

  try {
    await deleteInvoices([session.id]);

    return true;
  } catch (error) {
    console.error("[EditorSession] Failed to delete a blank invoice", error);

    return false;
  } finally {
    session.deleting = false;
  }
}

function openInvoice(documentId: string): Promise<void> {
  return enqueue(async () => {
    if (current?.id === documentId && !current.disposed) return;

    const document = await getInvoice(documentId);

    if (!document) throw new DocumentNotFoundError();
    if (!(await leaveCurrent())) return;

    // Read again: the invoice may have changed while this one was saved.
    const latest = (await getInvoice(documentId)) ?? document;

    switchTo(sessionFromDocument(latest), latest.invoiceData);
  });
}

// Starts something new in place of the open invoice, once it's been left.
async function replaceCurrent(
  create: () => { content: Invoice; templateId?: string | null }
) {
  if (!(await leaveCurrent())) return;

  const { content, templateId } = create();

  switchTo(newSession(content, { templateId }), content);
}

function startNew(
  create: () => { content: Invoice; templateId?: string | null }
): Promise<void> {
  return enqueue(() => replaceCurrent(create));
}

// Starts a new, blank document of the type given. It joins the library on
// its first edit.
function newDocument(documentType: DocumentType): Promise<void> {
  return startNew(() => ({ content: createBlankDocument(documentType) }));
}

function newInvoice(): Promise<void> {
  return newDocument("invoice");
}

// Starts a new invoice from a template. Like a blank, it joins the library
// once it's edited.
function applyTemplate(template: InvoiceTemplate): Promise<void> {
  return startNew(() => ({
    content: ensureRowIds(structuredClone(template.templateData)),
    templateId: template.id
  }));
}

// Starts what a site template page offers, leaving the open one in the
// library.
function startSiteTemplate(id: SiteTemplateId): Promise<void> {
  return startNew(() => ({ content: createSiteTemplateInvoice(id) }));
}

// "Name copy", or "Name copy 2" and so on when that's taken.
function nextCopyName(name: string, takenNames: string[]) {
  const taken = new Set(takenNames.map(takenName => takenName.toLowerCase()));
  let candidate = `${name} copy`;

  for (let i = 2; taken.has(candidate.toLowerCase()); i++) {
    candidate = `${name} copy ${i}`;
  }

  return candidate;
}

// Copies a library invoice as the next one of `documentType`
// (utils/invoice-copy.ts). A copy of an invoice with an automatic name keeps
// an automatic name; a named one becomes "Name copy".
async function copyInvoice(
  document: InvoiceDocument,
  documentType: DocumentType
): Promise<InvoiceDocument> {
  const now = new Date();
  const library = await getAllInvoices();
  const invoiceData = prepareInvoiceCopy({
    invoice: ensureRowIds(structuredClone(document.invoiceData)),
    documentType,
    library: library.map(invoice => ({
      number: invoice.invoiceData.number,
      documentType: invoice.invoiceData.documentType,
      createdAt: invoice.createdAt
    })),
    today: now
  });
  const copy: InvoiceDocument = {
    id: crypto.randomUUID(),
    name:
      document.nameSource === "user"
        ? nextCopyName(
            document.name,
            library.map(invoice => invoice.name)
          )
        : deriveInvoiceName(invoiceData),
    nameSource: document.nameSource,
    invoiceData,
    templateId: document.templateId,
    rev: 1,
    createdAt: now,
    updatedAt: now
  };

  await createInvoice(copy);
  trackInvoice("invoice_saved", copy.invoiceData);

  return copy;
}

// Duplicates a library invoice, as `documentType` or else as its own type.
// The open one is written first, so its edits still in the save delay come
// along, and a copy's number counts it.
function duplicateInvoice(
  document: InvoiceDocument,
  documentType?: DocumentType
): Promise<InvoiceDocument> {
  return enqueue(async () => {
    const session = current;

    if (session?.status === "editing") {
      const saved = await session.controller.flush();

      if (!saved && session.id === document.id) {
        throw new Error(
          "This invoice couldn't be saved, so it can't be duplicated yet."
        );
      }
    }

    const stored =
      session?.id === document.id
        ? ((await getInvoice(document.id)) ?? document)
        : document;

    return copyInvoice(stored, documentType ?? stored.invoiceData.documentType);
  });
}

// Duplicates the open invoice and opens the copy, which starts with its own
// undo history.
function duplicateCurrent(
  documentType?: DocumentType
): Promise<InvoiceDocument | null> {
  return enqueue(async () => {
    const session = current;

    if (!session || session.status !== "editing") return null;

    if (!(await session.controller.flush())) {
      toast.error(
        "This invoice couldn't be saved, so it can't be duplicated yet"
      );

      return null;
    }

    if (!session.isRecord) return null;

    const document = await getInvoice(session.id);

    if (!document) return null;

    const copy = await copyInvoice(
      document,
      documentType ?? document.invoiceData.documentType
    );

    if (!(await leaveCurrent())) return copy;

    switchTo(sessionFromDocument(copy), copy.invoiceData);
    useDocumentStore.setState({
      copyReview: {
        documentId: copy.id,
        message: describeCopy({
          original: document.invoiceData.number.trim() || document.name,
          copy: copy.invoiceData,
          originalType: document.invoiceData.documentType
        })
      }
    });

    return copy;
  });
}

// Names the open invoice. One that isn't in the library yet joins it under
// that name.
function renameCurrent(name: string): Promise<void> {
  return enqueue(async () => {
    const session = current;
    const trimmed = name.trim();

    if (!session || !trimmed) return;

    if (session.status === "editing") {
      await session.controller.flush();

      if (session.isRecord) {
        await renameInvoice(session.id, trimmed);
      } else {
        await joinLibrary(session, liveContent(), {
          name: trimmed,
          nameSource: "user"
        });
      }
    } else if (session.status !== "unavailable") {
      throw new Error("This invoice can't be renamed in this tab.");
    }

    session.name = trimmed;
    session.nameSource = "user";
    publish(session);
  });
}

// Deletes invoices from the library, or everything this browser stores.
// Deleting the open one starts a new blank invoice in its place; its pending
// edits are written first, so no write lands after the delete.
function deleteAndStartBlank(
  includesOpen: (session: Session) => boolean,
  remove: () => Promise<void>
): Promise<void> {
  return enqueue(async () => {
    const session = current;

    if (session?.status === "elsewhere") {
      throw new Error(`${APP_NAME} is open in another tab.`);
    }

    const open = session && includesOpen(session) ? session : null;

    if (open) {
      if (open.status === "editing") await open.controller.flush();

      open.deleting = true;
    }

    try {
      await remove();
    } catch (error) {
      if (open) open.deleting = false;

      throw error;
    }

    if (!open) return;

    dispose(open);

    const blank = createBlankInvoice();

    switchTo(newSession(blank), blank);
  });
}

function deleteFromLibrary(ids: string[]): Promise<void> {
  return deleteAndStartBlank(
    session => ids.includes(session.id),
    () => deleteInvoices(ids)
  );
}

function deleteEverything(): Promise<void> {
  return deleteAndStartBlank(() => true, deleteAllData);
}

// Keeps what a deleted invoice shows as a new invoice.
function keepDeletedCopy(): Promise<void> {
  return enqueue(() => {
    const session = current;

    if (!session || session.status !== "deleted") return Promise.resolve();

    const content = liveContent();

    dispose(session);

    const copy = newSession(content, { pristine: false });

    if (session.nameSource === "user") {
      copy.name = session.name;
      copy.nameSource = "user";
    }

    switchTo(copy, content);
    copy.controller.schedule(liveContent());

    return Promise.resolve();
  });
}

// ⌘S: writes everything now. Resolves whether it all landed.
async function flushNow(): Promise<boolean> {
  const session = current;

  if (!session || session.status !== "editing") return true;

  return session.controller.flush();
}

function retrySave(): Promise<boolean> {
  return current ? current.controller.retry() : Promise.resolve(true);
}

// Puts a version back. The invoice as it is now is kept as a version first,
// and the restore is one undo step.
function restoreVersion(version: InvoiceVersion): Promise<void> {
  return enqueue(async () => {
    const session = current;

    if (
      !session ||
      session.status !== "editing" ||
      session.id !== version.invoiceId
    ) {
      return;
    }

    await keepVersion(session, liveContent(), "beforeRestore");
    recordHistoryAction("Restore version", "page", () => {
      useInvoiceStore
        .getState()
        .setInvoice(ensureRowIds(structuredClone(version.invoiceData)));
    });
  });
}

// Saves a file with everything in this browser plus the open invoice as it
// is in memory, which may be ahead of storage.
async function downloadBackup(): Promise<void> {
  const session = current;

  await downloadBackupFile(
    session
      ? {
          id: session.id,
          name: displayName(session),
          nameSource: session.nameSource,
          templateId: session.templateId,
          invoiceData: liveContent()
        }
      : null
  );
}

// A new invoice nobody has edited yet, so not in the library either.
function isUntouchedBlank(session: Session) {
  return (
    !session.isRecord &&
    session.pristine !== null &&
    isEqual(liveContent(), session.pristine)
  );
}

// Sets the font on a new invoice nobody has edited yet. It isn't an edit: the
// invoice still starts from that font.
function applyStartingFont(font: InvoiceFont): void {
  const session = current;

  if (!session || !isUntouchedBlank(session)) return;
  if (liveContent().theme.font === font) return;

  runWithOrigin("load", () => {
    useInvoiceStore.getState().setTheme(theme => ({ ...theme, font }));
  });
  session.pristine = liveContent();
}

// A blank invoice, whatever font an earlier link gave it.
function isBlankInAnyFont(invoice: Invoice) {
  return isBlankInvoice({
    ...invoice,
    theme: { ...invoice.theme, font: invoiceDefault.theme.font }
  });
}

// Starts a new invoice in a font, leaving the open one in the library. An
// untouched blank invoice takes the font instead, so following a link twice
// never leaves a spare blank behind.
function startInFont(font: InvoiceFont): Promise<void> {
  return enqueue(async () => {
    if (
      current &&
      !current.disposed &&
      current.templateId === null &&
      liveContent().documentType === "invoice" &&
      isBlankInAnyFont(liveContent()) &&
      isUntouchedBlank(current)
    ) {
      applyStartingFont(font);

      return;
    }

    await replaceCurrent(() => {
      const content = createBlankInvoice();

      content.theme.font = font;

      return { content };
    });
  });
}

function scheduleIdleVersion(session: Session) {
  clearIdleVersion(session);
  session.idleVersionTimer = setTimeout(() => {
    session.idleVersionTimer = null;

    if (!isActive(session) || session.status !== "editing") return;
    if (session.deleting) return;
    if (Date.now() - session.lastVersionAt < VERSION_MIN_INTERVAL_MS) return;

    keepVersionQuietly(session, liveContent(), "idle");
  }, VERSION_IDLE_MS);
}

function onInvoiceChange(state: InvoiceStore, previous: InvoiceStore) {
  const session = current;

  if (!session || session.disposed || session.status !== "editing") return;
  if (getChangeOrigin() === "load") return;
  if (INVOICE_DATA_KEYS.every(key => state[key] === previous[key])) return;

  const content = selectInvoiceData(state);

  if (
    session.isRecord &&
    isLargeRemoval(selectInvoiceData(previous), content)
  ) {
    keepVersionQuietly(session, selectInvoiceData(previous), "beforeRemoval");
  }

  session.controller.schedule(content);
  scheduleIdleVersion(session);
}

// Hiding the page writes what's pending at once.
function onPageHidden() {
  if (current?.status === "editing") void current.controller.flush();
}

function onVisibilityChange() {
  if (document.visibilityState === "hidden") onPageHidden();
}

// The browser asks before closing the page while an edit is unwritten or
// failing, and while storage is unavailable and the invoice has edits.
function onBeforeUnload(event: BeforeUnloadEvent) {
  const session = current;

  if (!session) return;

  const unwritten =
    session.controller.isPending() ||
    session.controller.hasFailed() ||
    (session.status === "unavailable" && hasEdits(session, liveContent()));

  if (!unwritten) return;

  onPageHidden();
  event.preventDefault();
  // Older browsers need returnValue set to ask.
  event.returnValue = "";
}

// Another tab upgraded the database, so nothing more can be written here
// until a reload. Edits still unwritten stay as a failed write.
function onUpgradeElsewhere() {
  storageUnavailable = true;

  if (!current) return;

  current.status = "reloadRequired";
  publish(current);
}

function startListeners() {
  if (typeof window === "undefined") return;

  window.addEventListener("pagehide", onPageHidden);
  window.addEventListener("beforeunload", onBeforeUnload);
  document.addEventListener("visibilitychange", onVisibilityChange);
}

// This tab doesn't have the editor: show "open in another tab".
function goElsewhere() {
  const session = current;

  if (!session) {
    useDocumentStore.setState({ status: "elsewhere" });

    return;
  }

  if (session.status === "reloadRequired") return;

  session.status = "elsewhere";
  clearIdleVersion(session);
  clearInvoiceHistory();
  publish(session);
}

// Another tab asked for the editor: write what's pending, then let go. A
// write that fails doesn't hold the other tab up; its edits stay here.
async function letEditorGo() {
  if (current?.status === "editing") await current.controller.flush();

  goElsewhere();
}

// This tab has the editor (again). It writes the edits it couldn't, or
// otherwise reads the invoice afresh, since another tab may have written it.
async function editorGranted() {
  const session = current;

  if (!session) {
    await load();

    return;
  }

  if (session.disposed || session.status === "deleted") return;
  if (session.status === "reloadRequired") return;

  session.status = storageUnavailable ? "unavailable" : "editing";
  publish(session);

  if (session.status === "unavailable") return;

  if (session.controller.isPending() || session.controller.hasFailed()) {
    void session.controller.retry();

    return;
  }

  if (!session.isRecord) return;

  try {
    const document = await getInvoice(session.id);

    if (!isActive(session) || !isEditing(session)) return;

    if (!document) {
      markDeleted(session);

      return;
    }

    session.name = document.name;
    session.nameSource = document.nameSource;

    if (!isEqual(liveContent(), document.invoiceData)) {
      setContent(document.invoiceData);
    }

    publish(session);
  } catch (error) {
    console.error("[EditorSession] Failed to read the invoice", error);
  }
}

// Opens the database and the invoice this tab had open, or the last one
// opened, or else a blank.
async function load() {
  try {
    await openDatabase();
  } catch (error) {
    console.error("[EditorSession] Storage is unavailable", error);
    storageUnavailable = true;
  }

  let document: InvoiceDocument | undefined;
  let readFailed = storageUnavailable;

  if (!storageUnavailable) {
    try {
      const openId =
        readStorage("sessionStorage", OPEN_INVOICE_KEY) ??
        (await getLastOpenedInvoiceId());

      document = openId ? await getInvoice(openId) : undefined;
    } catch (error) {
      console.error("[EditorSession] Failed to open the last invoice", error);
      readFailed = true;
    }
  }

  const content = document?.invoiceData ?? createBlankInvoice();
  const session = document
    ? sessionFromDocument(document)
    : newSession(content);

  show(session, content, readFailed);
  useInvoiceStore.subscribe(onInvoiceChange);
  startInvoiceHistory();
  registerImageKeeper(() => [liveContent().image, ...getHistoryImageIds()]);

  if (!storageUnavailable) onDatabaseUpgradeElsewhere(onUpgradeElsewhere);

  if (document && session.status === "editing") {
    keepVersionQuietly(session, liveContent(), "opened");
    void requestPersistentStorage();
  }
}

// Takes the editor, then opens the database. A tab that doesn't get the
// editor opens nothing, and waits in line for it.
async function runHydration(): Promise<void> {
  startListeners();

  if (await claimEditor(lockCallbacks)) {
    await load();
  } else {
    goElsewhere();
  }

  hydrated = true;
}

export function hydrateDocument(): Promise<void> {
  hydrationPromise ??= enqueue(runHydration);

  return hydrationPromise;
}

// Whether hydration has already completed. Lets the provider seed its gate
// state synchronously on remount.
export function isDocumentHydrated(): boolean {
  return hydrated;
}

// The editor mounted: take the editor, or wait in line for it.
export function attachEditor(): Promise<void> {
  return enqueue(async () => {
    if (holdsEditor()) return;

    if (await claimEditor(lockCallbacks)) {
      await editorGranted();
    } else {
      goElsewhere();
    }
  });
}

// The editor unmounted: write what's pending, drop an invoice edited back to
// blank, and let another tab have the editor.
export function detachEditor(): Promise<void> {
  return enqueue(async () => {
    const session = current;

    if (session && !session.disposed && session.status === "editing") {
      await session.controller.flush();

      if (await deleteIfBlank(session)) session.isRecord = false;

      clearIdleVersion(session);
    }

    releaseEditor();
  });
}

export const documentActions = {
  openInvoice,
  newInvoice,
  newDocument,
  applyTemplate,
  duplicateInvoice,
  duplicateCurrent,
  renameCurrent,
  deleteFromLibrary,
  deleteEverything,
  keepDeletedCopy,
  flushNow,
  retrySave,
  restoreVersion,
  downloadBackup,
  dismissBackupReminder,
  dismissCopyReview,
  applyStartingFont,
  startInFont,
  startSiteTemplate
} as const;
