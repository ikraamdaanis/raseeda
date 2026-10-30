import { isEqual } from "lodash-es";
import { toast } from "sonner";
import { APP_NAME } from "~/consts/app";
import { createSaveController } from "~/context/save-controller";
import {
  addInvoiceVersion,
  cleanupOrphanedImages,
  createInvoice,
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
  watchInvoice,
  writeInvoiceContent
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
import { createBlankInvoice, useInvoiceStore } from "~/stores/invoice-store";
import type {
  Invoice,
  InvoiceDocument,
  InvoiceFont,
  InvoiceNameSource,
  InvoiceTemplate,
  InvoiceVersion,
  InvoiceVersionReason
} from "~/types";
import { ensureItemIds } from "~/utils/ensure-item-ids";
import { downloadBackupFile } from "~/utils/export-data";
import { isBlankInvoice, isLargeRemoval } from "~/utils/invoice-content";
import { deriveInvoiceName } from "~/utils/invoice-name";
import { track } from "~/utils/track";

// The editor session: which invoice is open, saving it as it's edited, and
// keeping it in step with other tabs. Every invoice saves itself; there is no
// Save step. This lives outside React on purpose, so it outlives any one
// mounted editor: leaving the editor and coming back never drops an edit.
//
// - Each open invoice gets its own save controller (context/save-controller),
//   so a write always lands in the invoice it was made in.
// - Every content write is a compare-and-swap on the invoice's revision, so
//   no two writers overwrite each other.
// - A new invoice joins the library on its first real edit, and an invoice
//   with an automatic name that's edited back to blank is deleted on leaving.
// - One tab edits an invoice at a time: it holds the invoice's Web Lock.
//   Another tab with the same invoice open follows it read-only, and can take
//   it over with "Edit here".
// - The invoice keeps a version history: when opened, after a pause in
//   editing, before a restore and before a change that removes most of it.

// A pause this long after an edit keeps a version, at most this often.
const VERSION_IDLE_MS = 30_000;

const VERSION_MIN_INTERVAL_MS = 10 * 60_000;

const LOCK_PREFIX = "invoice-lock:";

// Per tab: which invoice this tab has open, so a reload reopens it.
const OPEN_INVOICE_KEY = "open-invoice";

// Per tab: edits not yet known to be written when the page went away.
const UNSAVED_KEY_PREFIX = "unsaved:";

const BACKUP_REMINDER_KEY = "backup-reminder";

// Per browser: invoices a page left blank as it went away, to delete.
const BLANK_KEY_PREFIX = "blank:";

// Thrown when an invoice that's being opened no longer exists (it was deleted,
// perhaps in another tab).
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
  // The stored revision this tab's content was edited from.
  rev: number;
  // The revision a running write will produce, so the live query doesn't
  // mistake this tab's own write for another tab's.
  writingRev: number | null;
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
  // The content the read-only view shows, put back if anything changes it.
  shownContent: Invoice;
  attached: boolean;
  releaseLock: (() => void) | null;
  stopWaitingForLock: (() => void) | null;
  stopWatching: (() => void) | null;
  idleVersionTimer: ReturnType<typeof setTimeout> | null;
  lastVersionAt: number;
  // This tab is deleting the invoice, so its disappearance is expected.
  deleting: boolean;
  disposed: boolean;
};

let current: Session | null = null;
let failureEpisodes = 0;
let hydrated = false;
let hydrationPromise: Promise<void> | null = null;
let persistenceRequested = false;
let storageUnavailable = false;

// Session operations (open, new, delete, attach, ...) run one at a time, so
// two of them can never interleave their awaits.
let queue: Promise<unknown> = Promise.resolve();

function enqueue<TResult>(operation: () => Promise<TResult>): Promise<TResult> {
  const result = queue.then(operation);

  queue = result.catch(() => {});

  return result;
}

// Whether a session is still the open invoice. A check after an await, when
// another operation may have moved on.
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
  value: string | null
) {
  try {
    if (typeof window === "undefined") return;

    if (value === null) {
      window[area].removeItem(key);
    } else {
      window[area].setItem(key, value);
    }
  } catch {
    // Storage full or blocked: the in-memory copy is still there.
  }
}

// Edits that might not have reached the database when the page went away. A
// write started as a page closes isn't guaranteed to land (and while the
// browser asks "Leave site?", the page can't run at all), so they're also put
// in local storage, which is synchronous and always lands. The next tab to
// edit the invoice picks them up.
type UnsavedStash = {
  rev: number;
  // The revision a write running at the time would have produced. If it
  // landed, the stash still follows straight on from it.
  writingRev: number | null;
  isRecord: boolean;
  name: string;
  nameSource: InvoiceNameSource;
  templateId: string | null;
  invoiceData: Invoice;
};

function stashUnsaved(session: Session) {
  if (!session.controller.isPending() && !session.controller.hasFailed()) {
    return;
  }

  const stash: UnsavedStash = {
    rev: session.rev,
    writingRev: session.writingRev,
    isRecord: session.isRecord,
    name: session.name,
    nameSource: session.nameSource,
    templateId: session.templateId,
    invoiceData: liveContent()
  };

  writeStorage(
    "localStorage",
    `${UNSAVED_KEY_PREFIX}${session.id}`,
    JSON.stringify(stash)
  );
}

function readStash(id: string): UnsavedStash | null {
  const raw = readStorage("localStorage", `${UNSAVED_KEY_PREFIX}${id}`);

  if (!raw) return null;

  try {
    return JSON.parse(raw) as UnsavedStash;
  } catch {
    return null;
  }
}

function takeStash(id: string): UnsavedStash | null {
  const stash = readStash(id);

  clearStash(id);

  return stash;
}

function clearStash(id: string) {
  writeStorage("localStorage", `${UNSAVED_KEY_PREFIX}${id}`, null);
}

// The invoice ids under a local storage key prefix.
function storedKeys(prefix: string): string[] {
  try {
    if (typeof window === "undefined") return [];

    return Object.keys(window.localStorage)
      .filter(key => key.startsWith(prefix))
      .map(key => key.slice(prefix.length));
  } catch {
    return [];
  }
}

// Whether a stash follows straight on from the stored revision: nothing was
// written since it was taken, or only the write that was running then.
function followsOn(storedRev: number, stash: UnsavedStash) {
  return storedRev === stash.rev || storedRev === stash.writingRev;
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
    console.error("[DocumentSession] Failed to keep a version", error)
  );
}

// Asks the browser to keep the app's storage when it runs short, once an
// invoice exists to keep. Chrome decides from how much the site is used,
// Firefox asks, and Safari mostly says no in a browser tab, where it also
// clears storage after seven days without a visit. Safari is the one that
// clears storage on its own, so a no there suggests a backup, once; Chrome
// and Firefox only clear storage when the disk runs out.
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

// The backup suggestion was dismissed or acted on: it doesn't come back.
function dismissBackupReminder() {
  writeStorage("localStorage", BACKUP_REMINDER_KEY, new Date().toISOString());
  useDocumentStore.setState({ backupReminder: false });
}

// Writes the content to the library: creating the invoice on its first real
// edit, and after that as a compare-and-swap on its revision.
async function writeContent(session: Session, content: Invoice): Promise<void> {
  if (session.status !== "editing" || session.deleting) return;

  if (!session.isRecord) {
    if (!hasEdits(session, content)) return;

    const now = new Date();

    session.writingRev = 1;

    try {
      await createInvoice({
        id: session.id,
        name:
          session.nameSource === "user"
            ? session.name
            : deriveInvoiceName(content),
        nameSource: session.nameSource,
        invoiceData: content,
        templateId: session.templateId,
        rev: 1,
        createdAt: now,
        updatedAt: now
      });
    } finally {
      session.writingRev = null;
    }

    session.isRecord = true;
    session.rev = 1;
    publish(session);
    clearStash(session.id);
    void setLastOpenedInvoiceId(session.id);
    void requestPersistentStorage();
    track("invoice_saved");

    return;
  }

  session.writingRev = session.rev + 1;

  let result: Awaited<ReturnType<typeof writeInvoiceContent>>;

  try {
    result = await writeInvoiceContent({
      id: session.id,
      expectedRev: session.rev,
      invoiceData: content
    });
  } finally {
    session.writingRev = null;
  }

  if (result.outcome === "saved") {
    session.rev = result.rev;

    return;
  }

  if (result.outcome === "missing") {
    if (!isBeingDeleted(session)) markDeleted(session);

    return;
  }

  // Someone else wrote the invoice since this tab last read it. Never
  // overwrite: keep this tab's copy as a version and show theirs. Edits made
  // while this write ran were made on this tab's copy too, so they go into
  // that version rather than being written over theirs.
  const mine = session.controller.takeUnsaved() ?? content;

  adopt(session, result.document);
  await keepVersion(session, mine, "conflict");
  toast.warning("This invoice was changed in another tab", {
    description:
      "Their version is shown now. Yours is kept in the invoice's version history."
  });
}

function isBeingDeleted(session: Session) {
  return session.deleting;
}

function markDeleted(session: Session) {
  session.status = "deleted";
  session.shownContent = liveContent();
  session.controller.stop();
  clearInvoiceHistory();
  publish(session);
}

// Shows a version of the invoice another tab wrote. Undo can't reach past it,
// so it can never put back what the other tab replaced.
function adopt(session: Session, document: InvoiceDocument) {
  session.rev = document.rev;
  session.name = document.name;
  session.nameSource = document.nameSource;

  if (!isEqual(liveContent(), document.invoiceData)) {
    runWithOrigin("load", () => {
      useInvoiceStore
        .getState()
        .setInvoice(ensureItemIds(structuredClone(document.invoiceData)));
    });
    clearInvoiceHistory();
  }

  session.shownContent = liveContent();
  publish(session);
}

function onStoredInvoice(
  session: Session,
  document: InvoiceDocument | undefined
) {
  if (!isActive(session)) return;

  if (!document) {
    if (session.isRecord && !session.deleting && session.status !== "deleted") {
      markDeleted(session);
    }

    return;
  }

  if (
    document.name !== session.name ||
    document.nameSource !== session.nameSource
  ) {
    session.name = document.name;
    session.nameSource = document.nameSource;
    publish(session);
  }

  if (!session.isRecord) return;
  if (document.rev <= Math.max(session.rev, session.writingRev ?? 0)) return;

  // This tab has edits on the way: the compare-and-swap settles it.
  if (session.status === "editing" && session.controller.isPending()) return;

  adopt(session, document);
}

function locksSupported() {
  return typeof navigator !== "undefined" && "locks" in navigator;
}

// Requests the invoice's Web Lock. Resolves whether it was granted; when it's
// later taken by another tab's "Edit here", onLockLost runs.
function requestLock(
  session: Session,
  options: { ifAvailable?: boolean; steal?: boolean; wait?: boolean }
): Promise<boolean> {
  return new Promise(resolve => {
    let granted = false;
    const abort = options.wait ? new AbortController() : null;

    if (abort) {
      session.stopWaitingForLock = () => abort.abort();
    }

    navigator.locks
      .request(
        `${LOCK_PREFIX}${session.id}`,
        options.wait
          ? { signal: abort?.signal }
          : options.steal
            ? { steal: true }
            : { ifAvailable: true },
        lock => {
          if (!lock || session.disposed || !session.attached) {
            resolve(false);

            return;
          }

          granted = true;

          return new Promise<void>(release => {
            session.releaseLock = release;
            resolve(true);
          });
        }
      )
      .catch((error: unknown) => {
        if (granted) {
          session.releaseLock = null;
          void onLockLost(session);
        }

        resolve(false);

        if (!(error instanceof DOMException && error.name === "AbortError")) {
          console.error("[DocumentSession] Web Lock failed", error);
        }
      });
  });
}

// Another tab took the invoice over: write what's pending, then follow it.
async function onLockLost(session: Session) {
  if (!isActive(session) || session.status !== "editing") {
    return;
  }

  await session.controller.flush();

  if (!isActive(session)) return;

  session.status = "readOnly";
  session.shownContent = liveContent();
  clearInvoiceHistory();
  publish(session);
  void waitForLock(session);
}

// While read-only, waits in line for the invoice, so this tab edits again
// once the tab editing it moves on or closes.
async function waitForLock(session: Session) {
  if (!locksSupported()) return;

  const granted = await requestLock(session, { wait: true });

  session.stopWaitingForLock = null;

  if (granted) await startEditing(session);
}

// This tab now edits the invoice. It reads the stored copy first, in case the
// tab that edited it last wrote something this one hasn't seen.
async function startEditing(session: Session) {
  if (!isActive(session)) return;

  if (session.isRecord) {
    try {
      const document = await getInvoice(session.id);

      if (!document) {
        markDeleted(session);

        return;
      }

      if (document.rev !== session.rev) adopt(session, document);
    } catch (error) {
      console.error("[DocumentSession] Failed to reload the invoice", error);
    }
  }

  if (!isActive(session)) return;

  session.status = "editing";
  clearInvoiceHistory();
  publish(session);

  if (session.isRecord) {
    keepVersionQuietly(session, liveContent(), "opened");
    void requestPersistentStorage();
  }

  try {
    await recoverUnsaved(session);
  } catch (error) {
    console.error("[DocumentSession] Failed to recover unsaved edits", error);
  }
}

async function attach(session: Session) {
  if (session.attached || session.disposed) return;

  session.attached = true;
  session.stopWatching = watchInvoice(
    session.id,
    document => onStoredInvoice(session, document),
    error =>
      console.error("[DocumentSession] Failed to follow the invoice", error)
  );

  if (session.status === "unavailable" || session.status === "deleted") return;

  if (!locksSupported()) {
    await startEditing(session);

    return;
  }

  const granted = await requestLock(session, { ifAvailable: true });

  if (granted) {
    await startEditing(session);

    return;
  }

  if (!isActive(session)) return;

  session.status = "readOnly";
  session.shownContent = liveContent();
  clearInvoiceHistory();
  publish(session);
  void waitForLock(session);
}

// Stops following the invoice and lets another tab edit it. Pending edits
// keep saving in the background.
function detach(session: Session) {
  session.attached = false;
  session.stopWatching?.();
  session.stopWatching = null;
  session.stopWaitingForLock?.();
  session.stopWaitingForLock = null;
  session.releaseLock?.();
  session.releaseLock = null;

  if (session.idleVersionTimer) clearTimeout(session.idleVersionTimer);

  session.idleVersionTimer = null;
}

function dispose(session: Session) {
  detach(session);
  session.disposed = true;
  session.controller.stop();
}

function createSession({
  id,
  isRecord,
  rev,
  name,
  nameSource,
  templateId,
  content,
  pristine,
  status
}: {
  id: string;
  isRecord: boolean;
  rev: number;
  name: string;
  nameSource: InvoiceNameSource;
  templateId: string | null;
  content: Invoice;
  pristine: Invoice | null;
  status: DocumentStatus;
}): Session {
  const session: Session = {
    id,
    isRecord,
    rev,
    writingRev: null,
    name,
    nameSource,
    templateId,
    pristine,
    status,
    failure: null,
    failureEpisode: 0,
    shownContent: content,
    attached: false,
    releaseLock: null,
    stopWaitingForLock: null,
    stopWatching: null,
    idleVersionTimer: null,
    lastVersionAt: 0,
    deleting: false,
    disposed: false,
    controller: createSaveController<Invoice>({
      write: latest => writeContent(session, latest),
      onChange: ({ pending, failure }) => {
        // Everything is written, so nothing needs recovering after a close.
        if (!pending && !failure) clearStash(session.id);

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

// Puts a session's content in the editor and makes it the open invoice.
function show(session: Session, content: Invoice) {
  current = session;
  runWithOrigin("load", () => {
    useInvoiceStore
      .getState()
      .setInvoice(ensureItemIds(structuredClone(content)));
  });

  const normalized = liveContent();

  session.shownContent = normalized;
  if (session.pristine) session.pristine = normalized;

  clearInvoiceHistory();
  writeStorage("sessionStorage", OPEN_INVOICE_KEY, session.id);
  publish(session);
}

function sessionFromDocument(document: InvoiceDocument): Session {
  return createSession({
    id: document.id,
    isRecord: true,
    rev: document.rev,
    name: document.name,
    nameSource: document.nameSource,
    templateId: document.templateId,
    content: document.invoiceData,
    pristine: null,
    status: storageUnavailable ? "unavailable" : "editing"
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
    rev: 0,
    name: "",
    nameSource: "auto",
    templateId,
    content,
    pristine: pristine ? content : null,
    status: storageUnavailable ? "unavailable" : "editing"
  });
}

// Leaves the open invoice: writes what's pending, and deletes it when it has
// an automatic name and was edited back to blank. Resolves false when its
// edits couldn't be written, in which case it stays open.
async function leaveCurrent(): Promise<boolean> {
  const session = current;

  if (!session) return true;

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

  if (session.status === "editing") {
    const saved = await session.controller.flush();

    if (!saved) {
      toast.error("This invoice couldn't be saved, so it stays open", {
        description: "Try again, or download a backup to keep a copy."
      });

      return false;
    }

    if (
      session.isRecord &&
      session.nameSource === "auto" &&
      !hasEdits(session, liveContent())
    ) {
      session.deleting = true;

      try {
        await deleteInvoices([session.id]);
      } catch (error) {
        console.error(
          "[DocumentSession] Failed to delete a blank invoice",
          error
        );
      }
    }
  }

  clearStash(session.id);
  dispose(session);

  return true;
}

async function switchTo(session: Session, content: Invoice) {
  show(session, content);
  await attach(session);

  if (session.isRecord) void setLastOpenedInvoiceId(session.id);

  void cleanupOrphanedImages();
}

function openInvoice(documentId: string): Promise<void> {
  return enqueue(async () => {
    if (current?.id === documentId && !current.disposed) return;

    const document = await getInvoice(documentId);

    if (!document) throw new DocumentNotFoundError();
    if (!(await leaveCurrent())) return;

    // Read again: the invoice may have changed while this one was saved.
    const latest = (await getInvoice(documentId)) ?? document;

    await switchTo(sessionFromDocument(latest), latest.invoiceData);
  });
}

// Starts a new, blank invoice. It joins the library on its first edit.
function newInvoice(): Promise<void> {
  return enqueue(async () => {
    if (!(await leaveCurrent())) return;

    const blank = createBlankInvoice();

    await switchTo(newSession(blank), blank);
  });
}

// Starts a new invoice from a template. Like a blank, it joins the library
// once it's edited.
function applyTemplate(template: InvoiceTemplate): Promise<void> {
  return enqueue(async () => {
    if (!(await leaveCurrent())) return;

    const content = ensureItemIds(structuredClone(template.templateData));

    await switchTo(newSession(content, { templateId: template.id }), content);
  });
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

// Copies a library invoice as a new one. A copy of an invoice with an
// automatic name keeps an automatic name; a named one becomes "Name copy".
async function copyInvoice(
  document: InvoiceDocument
): Promise<InvoiceDocument> {
  const now = new Date();
  const name =
    document.nameSource === "user"
      ? nextCopyName(
          document.name,
          (await getAllInvoices()).map(invoice => invoice.name)
        )
      : deriveInvoiceName(document.invoiceData);
  const copy: InvoiceDocument = {
    id: crypto.randomUUID(),
    name,
    nameSource: document.nameSource,
    invoiceData: ensureItemIds(structuredClone(document.invoiceData)),
    templateId: document.templateId,
    rev: 1,
    createdAt: now,
    updatedAt: now
  };

  await createInvoice(copy);
  track("invoice_saved");

  return copy;
}

// Duplicates a library invoice. The open one is written first and copied as
// stored then, so edits still in the save delay come along.
function duplicateInvoice(document: InvoiceDocument): Promise<InvoiceDocument> {
  return enqueue(async () => {
    const session = current;

    if (session?.id !== document.id || session.status !== "editing") {
      return copyInvoice(document);
    }

    if (!(await session.controller.flush())) {
      throw new Error(
        "This invoice couldn't be saved, so it can't be duplicated yet."
      );
    }

    return copyInvoice((await getInvoice(document.id)) ?? document);
  });
}

// Duplicates the open invoice and opens the copy (Apple's autosaving apps do
// the same; it takes Save As's place and its ⇧⌘S).
function duplicateCurrent(): Promise<InvoiceDocument | null> {
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

    const copy = await copyInvoice(document);

    if (!(await leaveCurrent())) return copy;

    await switchTo(sessionFromDocument(copy), copy.invoiceData);

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

    if (session.status === "editing") await session.controller.flush();

    if (session.isRecord) {
      await renameInvoice(session.id, trimmed);
    } else if (session.status === "editing") {
      const now = new Date();

      session.writingRev = 1;

      try {
        await createInvoice({
          id: session.id,
          name: trimmed,
          nameSource: "user",
          invoiceData: liveContent(),
          templateId: session.templateId,
          rev: 1,
          createdAt: now,
          updatedAt: now
        });
      } finally {
        session.writingRev = null;
      }

      session.isRecord = true;
      session.rev = 1;
      void setLastOpenedInvoiceId(session.id);
      void requestPersistentStorage();
      track("invoice_saved");
    } else if (session.status !== "unavailable") {
      throw new Error("This invoice can't be renamed in this tab.");
    }

    session.name = trimmed;
    session.nameSource = "user";
    publish(session);
  });
}

// Deletes invoices from the library. Deleting the open one starts a new blank
// invoice in its place.
function deleteFromLibrary(ids: string[]): Promise<void> {
  return enqueue(async () => {
    const session = current;
    const includesOpen = !!session && ids.includes(session.id);

    if (session && includesOpen) {
      if (session.status === "editing") await session.controller.flush();

      session.deleting = true;
    }

    try {
      await deleteInvoices(ids);
    } catch (error) {
      if (session) session.deleting = false;

      throw error;
    }

    if (!session || !includesOpen) return;

    clearStash(session.id);
    dispose(session);

    const blank = createBlankInvoice();

    await switchTo(newSession(blank), blank);
  });
}

// "Edit here": takes the invoice over from the tab editing it.
function takeOver(): Promise<void> {
  return enqueue(async () => {
    const session = current;

    if (!session || session.status !== "readOnly") return;

    if (!locksSupported()) {
      await startEditing(session);

      return;
    }

    session.stopWaitingForLock?.();
    session.stopWaitingForLock = null;

    if (await requestLock(session, { steal: true })) {
      await startEditing(session);
    }
  });
}

// Keeps what a deleted invoice showed as a new invoice.
function keepDeletedCopy(): Promise<void> {
  return enqueue(async () => {
    const session = current;

    if (!session || session.status !== "deleted") return;

    const content = liveContent();
    const name = session.nameSource === "user" ? session.name : "";

    dispose(session);

    const copy = newSession(content, { pristine: false });

    if (name) {
      copy.name = name;
      copy.nameSource = "user";
    }

    await switchTo(copy, content);
    copy.controller.schedule(liveContent());
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
        .setInvoice(ensureItemIds(structuredClone(version.invoiceData)));
    });
  });
}

// Saves a file with everything in this browser plus the open invoice as it
// is in memory, which may be ahead of storage. Works even when storage
// doesn't, with just the open invoice then.
async function downloadBackup(): Promise<void> {
  const session = current;
  const open = session
    ? {
        id: session.id,
        name: displayName(session),
        nameSource: session.nameSource,
        templateId: session.templateId,
        invoiceData: liveContent()
      }
    : null;

  await downloadBackupFile(open);
}

// Sets the font on a new invoice nobody has edited yet, such as one started
// from the homepage's font picker. It isn't an edit: the invoice still starts
// from that font.
function applyStartingFont(font: InvoiceFont): void {
  const session = current;

  if (!session || session.isRecord || !session.pristine) return;
  if (!isEqual(liveContent(), session.pristine)) return;
  if (session.pristine.theme.font === font) return;

  runWithOrigin("load", () => {
    useInvoiceStore.getState().setTheme(theme => ({ ...theme, font }));
  });
  session.pristine = liveContent();
  session.shownContent = session.pristine;
}

function scheduleIdleVersion(session: Session) {
  if (session.idleVersionTimer) clearTimeout(session.idleVersionTimer);

  session.idleVersionTimer = setTimeout(() => {
    session.idleVersionTimer = null;

    if (session !== current || session.status !== "editing") return;
    if (Date.now() - session.lastVersionAt < VERSION_MIN_INTERVAL_MS) return;

    keepVersionQuietly(session, liveContent(), "idle");
  }, VERSION_IDLE_MS);
}

function onInvoiceChange(state: InvoiceStore, previous: InvoiceStore) {
  const session = current;

  if (!session || session.disposed) return;
  if (getChangeOrigin() === "load") return;
  if (INVOICE_DATA_KEYS.every(key => state[key] === previous[key])) return;

  // Nothing changes an invoice this tab can't edit: put back what it shows.
  if (session.status !== "editing" && session.status !== "unavailable") {
    const shown = session.shownContent;

    queueMicrotask(() =>
      runWithOrigin("load", () => useInvoiceStore.getState().setInvoice(shown))
    );

    return;
  }

  if (session.status === "unavailable") return;

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

function onPageHidden() {
  const session = current;

  if (!session) return;

  stashUnsaved(session);
  void session.controller.flush();

  // Edited back to blank and now going away: the next page load deletes it,
  // as leaving it in the editor would have.
  if (
    session.isRecord &&
    session.status === "editing" &&
    session.nameSource === "auto" &&
    !hasEdits(session, liveContent())
  ) {
    writeStorage("localStorage", `${BLANK_KEY_PREFIX}${session.id}`, "1");
  }
}

function onVisibilityChange() {
  if (document.visibilityState === "hidden") onPageHidden();
}

// The browser asks before closing the page only while an edit is unwritten
// or failed. Writes started as a page goes away aren't guaranteed to land,
// which is why saves happen within half a second of an edit anyway.
function onBeforeUnload(event: BeforeUnloadEvent) {
  const session = current;

  if (!session) return;
  if (!session.controller.isPending() && !session.controller.hasFailed()) {
    return;
  }

  stashUnsaved(session);
  void session.controller.flush();
  event.preventDefault();
  // Older browsers need returnValue set to ask.
  event.returnValue = "";
}

function onUpgradeElsewhere() {
  const session = current;

  storageUnavailable = true;

  if (!session) return;

  stashUnsaved(session);
  session.controller.stop();
  session.status = "reloadRequired";
  publish(session);
}

let listenersStarted = false;

function startListeners() {
  if (listenersStarted || typeof window === "undefined") return;

  listenersStarted = true;
  window.addEventListener("pagehide", onPageHidden);
  window.addEventListener("beforeunload", onBeforeUnload);
  document.addEventListener("visibilitychange", onVisibilityChange);
}

// Deletes invoices a page left blank as it went away (edited back to blank,
// then the tab closed), when they're still blank, still automatically named
// and no tab has them open. Blank invoices that came any other way (imported,
// duplicated) are left alone.
async function sweepBlankInvoices(openId: string) {
  if (!locksSupported()) return;

  const markedIds = storedKeys(BLANK_KEY_PREFIX);

  for (const id of markedIds) {
    if (id === openId) continue;

    await navigator.locks.request(
      `${LOCK_PREFIX}${id}`,
      { ifAvailable: true },
      async lock => {
        if (!lock) return;

        writeStorage("localStorage", `${BLANK_KEY_PREFIX}${id}`, null);

        const invoice = await getInvoice(id);

        if (
          invoice?.nameSource === "auto" &&
          isBlankInvoice(invoice.invoiceData)
        ) {
          await deleteInvoices([id]);
        }
      }
    );
  }
}

// Brings back edits a page didn't get to write before it went away (a tab
// closed or reloaded inside the save delay), once this tab edits the invoice.
// They go in as an edit when nobody has written the invoice since; otherwise
// they're kept as a version, never written over someone else's work.
async function recoverUnsaved(session: Session) {
  const stash = takeStash(session.id);

  if (!stash || isEqual(liveContent(), stash.invoiceData)) return;

  const stored = session.isRecord ? await getInvoice(session.id) : undefined;

  if (stored && isEqual(stored.invoiceData, stash.invoiceData)) return;

  if (stored && !followsOn(stored.rev, stash)) {
    keepVersionQuietly(session, stash.invoiceData, "conflict");

    return;
  }

  runWithOrigin("load", () => {
    useInvoiceStore
      .getState()
      .setInvoice(ensureItemIds(structuredClone(stash.invoiceData)));
  });
  session.controller.schedule(liveContent());
}

// Brings back stashed edits for invoices no tab has open, such as one whose
// tab closed inside the save delay while this tab opens another.
async function recoverOtherStashes(openId: string) {
  if (!locksSupported()) return;

  for (const id of storedKeys(UNSAVED_KEY_PREFIX)) {
    if (id === openId) continue;

    await navigator.locks.request(
      `${LOCK_PREFIX}${id}`,
      { ifAvailable: true },
      async lock => {
        if (!lock) return;

        const stash = takeStash(id);

        if (!stash) return;

        const stored = await getInvoice(id);

        if (stored) {
          if (isEqual(stored.invoiceData, stash.invoiceData)) return;

          const written = followsOn(stored.rev, stash)
            ? await writeInvoiceContent({
                id,
                expectedRev: stored.rev,
                invoiceData: stash.invoiceData
              })
            : null;

          if (written?.outcome !== "saved") {
            await addInvoiceVersion({
              invoiceId: id,
              name: stored.name,
              invoiceData: stash.invoiceData,
              reason: "conflict"
            });
          }

          return;
        }

        if (isBlankInvoice(stash.invoiceData)) return;

        const now = new Date();

        // One deleted elsewhere comes back as a new invoice.
        await createInvoice({
          id: stash.isRecord ? crypto.randomUUID() : id,
          name:
            stash.nameSource === "user"
              ? stash.name
              : deriveInvoiceName(stash.invoiceData),
          nameSource: stash.nameSource,
          invoiceData: stash.invoiceData,
          templateId: stash.templateId,
          rev: 1,
          createdAt: now,
          updatedAt: now
        });
        track("invoice_saved");
      }
    );
  }
}

async function runHydration(): Promise<void> {
  startListeners();

  try {
    await openDatabase();
  } catch (error) {
    console.error("[DocumentSession] Storage is unavailable", error);
    storageUnavailable = true;
  }

  const pointer = readStorage("sessionStorage", OPEN_INVOICE_KEY);
  let openId = pointer;
  let document: InvoiceDocument | undefined;

  if (!storageUnavailable) {
    try {
      openId ??= await getLastOpenedInvoiceId();
      document = openId ? await getInvoice(openId) : undefined;
    } catch (error) {
      console.error("[DocumentSession] Failed to open the last invoice", error);
    }
  }

  // A new invoice this tab had open whose first edit never got written.
  const stash = pointer && !document ? takeStash(pointer) : null;
  let session: Session;
  let content: Invoice;

  if (document) {
    session = sessionFromDocument(document);
    content = document.invoiceData;
  } else if (stash) {
    // Its edits start a new invoice (as do edits to one deleted elsewhere
    // since), written once hydration is done.
    session = newSession(stash.invoiceData, {
      templateId: stash.templateId,
      pristine: false
    });
    session.name = stash.name;
    session.nameSource = stash.nameSource;
    content = stash.invoiceData;
  } else {
    content = createBlankInvoice();
    session = newSession(content);
  }

  show(session, content);
  useInvoiceStore.subscribe(onInvoiceChange);
  startInvoiceHistory();
  registerImageKeeper(() => [liveContent().image, ...getHistoryImageIds()]);

  if (!storageUnavailable) {
    onDatabaseUpgradeElsewhere(onUpgradeElsewhere);
  }

  hydrated = true;

  if (stash) session.controller.schedule(liveContent());

  if (!storageUnavailable) {
    recoverOtherStashes(session.id)
      .then(() => sweepBlankInvoices(session.id))
      .catch((error: unknown) =>
        console.error("[DocumentSession] Failed to tidy up storage", error)
      );
  }
}

export function hydrateDocument(): Promise<void> {
  hydrationPromise ??= runHydration();

  return hydrationPromise;
}

// Whether hydration has already completed. Lets the provider seed its gate
// state synchronously on remount, so a return visit shows the editor at once.
export function isDocumentHydrated(): boolean {
  return hydrated;
}

// The editor mounted: edit the open invoice here (or follow it read-only).
export function attachEditor(): Promise<void> {
  return enqueue(async () => {
    const session = current;

    if (!session || session.disposed) return;

    await attach(session);

    // Coming back to the editor: pick up what other tabs wrote meanwhile.
    if (
      session.isRecord &&
      session.status === "editing" &&
      !session.controller.isPending()
    ) {
      const document = await getInvoice(session.id).catch(() => undefined);

      if (document && document.rev > session.rev) adopt(session, document);
    }
  });
}

// The editor unmounted (leaving for another page): write what's pending,
// drop an untouched invoice, and let other tabs edit this one.
export function detachEditor(): Promise<void> {
  return enqueue(async () => {
    const session = current;

    if (!session || session.disposed || !session.attached) return;

    if (session.status === "editing") {
      await session.controller.flush();

      if (
        session.isRecord &&
        session.nameSource === "auto" &&
        !hasEdits(session, liveContent())
      ) {
        session.deleting = true;

        try {
          await deleteInvoices([session.id]);
          session.isRecord = false;
          session.rev = 0;
        } catch (error) {
          console.error(
            "[DocumentSession] Failed to delete a blank invoice",
            error
          );
        } finally {
          session.deleting = false;
        }
      }
    }

    detach(session);
  });
}

export const documentActions = {
  openInvoice,
  newInvoice,
  applyTemplate,
  duplicateInvoice,
  duplicateCurrent,
  renameCurrent,
  deleteFromLibrary,
  takeOver,
  keepDeletedCopy,
  flushNow,
  retrySave,
  restoreVersion,
  downloadBackup,
  dismissBackupReminder,
  applyStartingFont
} as const;
