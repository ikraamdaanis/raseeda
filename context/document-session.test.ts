import Dexie from "dexie";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CURRENT_INVOICE_SCHEMA_VERSION } from "~/schema/migrations";
import { invoiceDefault } from "~/stores/invoice-store";
import type { InvoiceDocument } from "~/types";

// The usage counts, as the session reports them (utils/track.ts). The module
// is reloaded for every page, so the spy lives outside it.
const { trackInvoice } = vi.hoisted(() => ({ trackInvoice: vi.fn() }));

vi.mock("~/utils/track", () => ({
  track: vi.fn(),
  trackInvoice,
  trackPageView: vi.fn()
}));

// Every page, closed after each test so a page from an earlier test (its
// timers, its live queries, the Web Locks it holds) can't reach the next.
const openPages: {
  detachEditor: () => Promise<void>;
  db: { close: (options?: { disableAutoOpen: boolean }) => void };
}[] = [];

async function closePages() {
  for (const page of openPages.splice(0)) {
    await page.detachEditor();
    page.db.close({ disableAutoOpen: true });
  }
}

type FailWrites = {
  current: Error | null;
  tables?: string[];
  // Holds each failing write in flight until it settles.
  hold?: Promise<void>;
};

// The session is module state (one open invoice per page), so every test
// loads a fresh copy of it, as a page load would, over a fresh database.
async function loadPage({
  failWrites,
  attachEditor = true
}: {
  failWrites?: FailWrites;
  attachEditor?: boolean;
} = {}) {
  vi.resetModules();

  const database = await import("~/db");

  if (failWrites) {
    // Fails every write to the invoices table (or the tables listed) while
    // `current` is set, as a full disk or a closing database would.
    async function failWrite(error: Error): Promise<never> {
      await failWrites?.hold;

      throw error;
    }

    database.db.use({
      stack: "dbcore",
      name: "fail-writes",
      create: down => ({
        ...down,
        table: name => {
          const table = down.table(name);

          return {
            ...table,
            mutate: request =>
              failWrites.current &&
              (failWrites.tables ?? ["invoices"]).includes(name)
                ? failWrite(failWrites.current)
                : table.mutate(request)
          };
        }
      })
    });
  }

  const session = await import("~/context/document-session");
  const { useInvoiceStore } = await import("~/stores/invoice-store");
  const { useDocumentStore } = await import("~/stores/document-store");
  const history = await import("~/stores/invoice-history");

  await session.hydrateDocument();

  if (attachEditor) await session.attachEditor();

  openPages.push({ detachEditor: session.detachEditor, db: database.db });

  return {
    ...session,
    ...session.documentActions,
    ...database,
    history,
    edit: useInvoiceStore.getState,
    invoice: () => useInvoiceStore.getState(),
    documentState: () => useDocumentStore.getState()
  };
}

// Lets the debounce run out, then waits for real IndexedDB work (writes,
// versions, live queries) to finish, which runs outside the fake clock.
async function settle(ms = 600) {
  await vi.advanceTimersByTimeAsync(ms);

  for (let i = 0; i < 50; i++) {
    await new Promise(resolve => globalThis.setImmediate(resolve));
  }
}

function memoryStorage(entries: Record<string, string> = {}) {
  const items = new Map(Object.entries(entries));

  return {
    getItem: (key: string) => items.get(key) ?? null,
    setItem: (key: string, value: string) => void items.set(key, value),
    removeItem: (key: string) => void items.delete(key)
  };
}

// Local storage whose entries are its own keys, as the browser's are, so code
// that lists them (Object.keys) finds them.
class ListableStorage {
  getItem(key: string): string | null {
    const value: unknown = Reflect.get(this, key);

    return typeof value === "string" ? value : null;
  }

  setItem(key: string, value: string) {
    Reflect.set(this, key, value);
  }

  removeItem(key: string) {
    Reflect.deleteProperty(this, key);
  }
}

function storedInvoice(overrides: Partial<InvoiceDocument>): InvoiceDocument {
  const now = new Date();

  return {
    id: "stored",
    name: "Stored invoice",
    nameSource: "user",
    invoiceData: structuredClone(invoiceDefault),
    templateId: null,
    rev: 1,
    createdAt: now,
    updatedAt: now,
    ...overrides
  };
}

describe("autosave", () => {
  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "Date"] });
    await Dexie.delete("InvoiceDatabase");
  });

  afterEach(async () => {
    await closePages();
    vi.useRealTimers();
  });

  it("adds a new invoice to the library on its first edit, not before", async () => {
    const page = await loadPage();

    await settle(5000);

    expect(await page.getAllInvoices()).toEqual([]);
    expect(page.documentState()).toMatchObject({ isRecord: false });

    page.edit().setTitle("Quote");
    await settle();

    const [created] = await page.getAllInvoices();

    expect(created).toMatchObject({
      id: page.documentState().documentId,
      name: "INV-0001",
      nameSource: "auto",
      rev: 1
    });
    expect(created.invoiceData.title).toBe("Quote");
    expect(page.documentState().isRecord).toBe(true);
  });

  it("reopens the last invoice after a reload", async () => {
    const first = await loadPage();

    first.edit().setTitle("Survives a reload");
    await settle();

    const second = await loadPage();

    expect(second.invoice().title).toBe("Survives a reload");
    expect(second.documentState().documentId).toBe(
      first.documentState().documentId
    );
  });

  it("writes an edit made just before switching to the invoice it was made in", async () => {
    const page = await loadPage();

    await page.saveInvoice(
      storedInvoice({ id: "other", name: "Other invoice" })
    );
    page.edit().setTitle("Edited");
    await settle();

    const firstId = page.documentState().documentId;

    page.edit().setTitle("Edited again, mid-debounce");
    await page.openInvoice("other");

    const first = await page.getInvoice(firstId ?? "");
    const other = await page.getInvoice("other");

    expect(first?.invoiceData.title).toBe("Edited again, mid-debounce");
    expect(other?.invoiceData.title).toBe("Invoice");
    expect(page.invoice().title).toBe("Invoice");
    expect(page.documentState().documentId).toBe("other");

    await settle(3000);

    expect((await page.getInvoice("other"))?.rev).toBe(1);
  });

  it("never overwrites a revision someone else wrote", async () => {
    const page = await loadPage();

    page.edit().setTitle("Mine");
    await settle();

    const id = page.documentState().documentId ?? "";
    const stored = await page.getInvoice(id);

    page.edit().setTitle("Mine, edited");
    // Another writer gets in before this tab's debounce runs out.
    await page.saveInvoice({
      ...(stored as InvoiceDocument),
      invoiceData: {
        ...(stored as InvoiceDocument).invoiceData,
        title: "Theirs"
      },
      rev: 2
    });
    await settle();

    const after = await page.getInvoice(id);
    const versions = await page.getInvoiceVersions(id);

    expect(after?.invoiceData.title).toBe("Theirs");
    expect(after?.rev).toBe(2);
    expect(
      versions.find(version => version.reason === "conflict")?.invoiceData.title
    ).toBe("Mine, edited");
    expect(page.invoice().title).toBe("Theirs");
    expect(page.history.useInvoiceHistory.getState().canUndo).toBe(false);
  });

  it("never writes edits queued during a conflicting write over theirs", async () => {
    const page = await loadPage();

    page.edit().setTitle("Mine");
    await settle();

    const id = page.documentState().documentId ?? "";
    const stored = (await page.getInvoice(id)) as InvoiceDocument;

    await page.saveInvoice({
      ...stored,
      invoiceData: { ...stored.invoiceData, title: "Theirs" },
      rev: 2
    });
    page.edit().setTitle("Mine, edited");
    // The write starts and hits the conflict while this edit is queued.
    await vi.advanceTimersByTimeAsync(500);
    page.edit().setTitle("Mine, edited more");
    await settle(3000);

    expect((await page.getInvoice(id))?.invoiceData.title).toBe("Theirs");
    expect(
      (await page.getInvoiceVersions(id)).find(
        version => version.reason === "conflict"
      )?.invoiceData.title
    ).toBe("Mine, edited more");
  });

  it("shows another tab's write when nothing is pending here", async () => {
    const page = await loadPage();

    page.edit().setTitle("Mine");
    await settle();

    const id = page.documentState().documentId ?? "";
    const stored = await page.getInvoice(id);

    await page.saveInvoice({
      ...(stored as InvoiceDocument),
      invoiceData: {
        ...(stored as InvoiceDocument).invoiceData,
        title: "From another tab"
      },
      rev: 5
    });
    await settle(50);

    expect(page.invoice().title).toBe("From another tab");
    expect(page.history.useInvoiceHistory.getState().canUndo).toBe(false);

    page.edit().setTitle("Mine again");
    await settle();

    expect((await page.getInvoice(id))?.rev).toBe(6);
  });

  it("deletes an invoice edited back to blank when it's left", async () => {
    const page = await loadPage();

    page.edit().setTitle("Briefly edited");
    await settle();

    const id = page.documentState().documentId ?? "";

    expect(await page.getInvoice(id)).toBeDefined();

    page.edit().setTitle("Invoice");
    await page.newInvoice();

    expect(await page.getInvoice(id)).toBeUndefined();
  });

  it("keeps a named invoice even when it's blank", async () => {
    const page = await loadPage();

    await page.renameCurrent("Keep me");

    const id = page.documentState().documentId ?? "";

    await page.newInvoice();

    expect(await page.getInvoice(id)).toMatchObject({
      name: "Keep me",
      nameSource: "user"
    });
  });

  it("names an invoice from its number and client until it's renamed", async () => {
    const page = await loadPage();

    page.edit().setNumber("INV-7");
    page
      .edit()
      .setClient(client => ({ ...client, content: "Acme Ltd\nLondon" }));
    await settle();

    const id = page.documentState().documentId ?? "";

    expect((await page.getInvoice(id))?.name).toBe("INV-7 · Acme Ltd");

    await page.renameCurrent("Acme retainer");
    page.edit().setNumber("INV-8");
    await settle();

    expect(await page.getInvoice(id)).toMatchObject({
      name: "Acme retainer",
      nameSource: "user"
    });
    expect((await page.getInvoice(id))?.invoiceData.number).toBe("INV-8");
  });

  it("starts a new blank when the open invoice is deleted", async () => {
    const page = await loadPage();

    page.edit().setTitle("Doomed");
    await settle();

    const id = page.documentState().documentId ?? "";

    await page.deleteFromLibrary([id]);

    expect(await page.getInvoice(id)).toBeUndefined();
    expect(page.documentState().documentId).not.toBe(id);
    expect(page.documentState().isRecord).toBe(false);
    expect(page.invoice().title).toBe("Invoice");
  });

  it("deletes all data and starts a new blank", async () => {
    const page = await loadPage();

    page.edit().setTitle("Everything goes");
    await settle();
    await page.renameCurrent("Kept by name");

    const id = page.documentState().documentId ?? "";

    page.edit().setTitle("Typed a moment ago");
    await page.deleteEverything();
    await settle();

    expect(await page.getAllInvoices()).toHaveLength(0);
    expect(await page.getAllTemplates()).toHaveLength(0);
    expect(page.documentState().documentId).not.toBe(id);
    expect(page.documentState().isRecord).toBe(false);
    expect(page.invoice().title).toBe("Invoice");
  });

  it("stops writing an invoice deleted elsewhere instead of re-creating it", async () => {
    const page = await loadPage();

    page.edit().setTitle("Here");
    await settle();

    const id = page.documentState().documentId ?? "";

    await page.deleteInvoices([id]);
    await settle(50);

    expect(page.documentState().status).toBe("deleted");

    page.edit().setTitle("Typed after the delete");
    await settle(3000);

    expect(await page.getInvoice(id)).toBeUndefined();
    expect(page.invoice().title).toBe("Here");

    await page.keepDeletedCopy();
    await settle();

    const [copy] = await page.getAllInvoices();

    expect(copy.id).not.toBe(id);
    expect(copy.invoiceData.title).toBe("Here");
  });

  it("starts a template's invoice that joins the library once edited", async () => {
    const page = await loadPage();
    const now = new Date();

    await page.applyTemplate({
      id: "template",
      name: "Retainer",
      description: null,
      isDefault: false,
      templateData: { ...structuredClone(invoiceDefault), title: "Retainer" },
      screenshotUrl: null,
      createdAt: now,
      updatedAt: now
    });
    await settle(3000);

    expect(page.invoice().title).toBe("Retainer");
    expect(await page.getAllInvoices()).toEqual([]);

    page.edit().setNumber("RET-1");
    await settle();

    expect(await page.getAllInvoices()).toHaveLength(1);
    expect((await page.getAllInvoices())[0].templateId).toBe("template");
  });

  it("duplicates the open invoice from the library with edits still in the save delay", async () => {
    const page = await loadPage();

    await page.renameCurrent("Open one");

    const id = page.documentState().documentId ?? "";
    const listed = (await page.getInvoice(id)) as InvoiceDocument;

    page.edit().setTitle("Typed a moment ago");

    const copy = await page.duplicateInvoice(listed);

    expect(copy.invoiceData.title).toBe("Typed a moment ago");
    expect(page.documentState().documentId).toBe(id);
  });

  it("duplicates the open invoice and opens the copy", async () => {
    const page = await loadPage();

    await page.renameCurrent("Original");
    page.edit().setTitle("Copied content");

    const copy = await page.duplicateCurrent();

    expect(copy).toMatchObject({ name: "Original copy", nameSource: "user" });
    expect(page.documentState().documentId).toBe(copy?.id);
    expect(page.invoice().title).toBe("Copied content");
    expect(await page.getAllInvoices()).toHaveLength(2);
  });

  it("numbers the copy as the next invoice and says what to check", async () => {
    const page = await loadPage();

    page.edit().setNumber("FRL-0014");
    page.edit().setServicePeriod("October 2026");
    await page.flushNow();

    const copy = await page.duplicateCurrent();

    expect(copy?.invoiceData.number).toBe("FRL-0015");
    expect(page.documentState().copyReview).toEqual({
      documentId: copy?.id,
      message: "Copied from FRL-0014. Check the service period."
    });
  });

  it("duplicates a quote as an invoice and leaves the quote as it was", async () => {
    const page = await loadPage();

    await page.newDocument("quote");
    page.edit().setClient(client => ({ ...client, content: "Acme Ltd" }));
    page.edit().updateItem(0, "description", "Website");
    page.edit().updateItem(0, "unitPrice", 900);
    await page.flushNow();

    const quoteId = page.documentState().documentId ?? "";
    const quote = await page.getInvoice(quoteId);
    const copy = await page.duplicateCurrent("invoice");

    expect(copy?.id).not.toBe(quoteId);
    expect(page.documentState().documentId).toBe(copy?.id);
    expect(page.invoice()).toMatchObject({
      documentType: "invoice",
      title: "Invoice",
      number: "INV-0001",
      client: quote?.invoiceData.client,
      items: quote?.invoiceData.items
    });
    expect(page.invoice().labels.paymentDue).toBe("Due date");
    expect(page.documentState().copyReview?.message).toBe(
      "Copied from QUO-0001 as an invoice and dated today."
    );
    expect(await page.getInvoice(quoteId)).toEqual(quote);
  });

  it("starts the copy's undo history afresh, so undo can't reach the original", async () => {
    const page = await loadPage();

    await page.newDocument("quote");
    page.edit().setClient(client => ({ ...client, content: "Acme Ltd" }));
    await page.flushNow();

    const quoteId = page.documentState().documentId ?? "";
    const quote = await page.getInvoice(quoteId);

    await page.duplicateCurrent("invoice");

    expect(page.history.useInvoiceHistory.getState().canUndo).toBe(false);
    expect(page.history.undoInvoiceChange()).toBe(false);

    page.edit().setTitle("Final invoice");
    await settle();
    page.history.undoInvoiceChange();
    page.history.undoInvoiceChange();

    expect(page.invoice()).toMatchObject({
      documentType: "invoice",
      title: "Invoice"
    });
    expect(page.invoice().client.content).toBe("Acme Ltd");

    await settle();

    expect(await page.getInvoice(quoteId)).toEqual(quote);
  });

  it("duplicates a library invoice as another type without opening it", async () => {
    const page = await loadPage();

    await page.createInvoice(
      storedInvoice({
        id: "listed",
        nameSource: "auto",
        invoiceData: {
          ...structuredClone(invoiceDefault),
          number: "INV-0042",
          invoiceDate: "2026-10-03",
          dateFormat: "d MMM yyyy"
        }
      })
    );

    const listed = await page.getInvoice("listed");

    if (!listed) throw new Error("The invoice wasn't stored");

    const copy = await page.duplicateInvoice(listed, "credit-note");

    expect(copy.invoiceData).toMatchObject({
      documentType: "credit-note",
      title: "Credit note",
      number: "CN-0001",
      refersTo: "INV-0042, 3 Oct 2026"
    });
    expect(copy.name).toBe("CN-0001");
    expect(page.documentState().documentId).not.toBe(copy.id);
    expect(await page.getInvoice("listed")).toEqual(listed);
  });
});

describe("save failures", () => {
  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "Date"] });
    await Dexie.delete("InvoiceDatabase");
  });

  afterEach(async () => {
    await closePages();
    vi.useRealTimers();
  });

  it("announces a full disk once, keeps retrying and recovers", async () => {
    const failWrites: { current: Error | null } = { current: null };
    const page = await loadPage({ failWrites });

    page.edit().setTitle("First");
    await settle();

    failWrites.current = new DOMException("Full", "QuotaExceededError");
    page.edit().setTitle("Not saved yet");
    await settle();

    const failure = page.documentState().saveFailure;

    expect(failure).toMatchObject({ storageFull: true });
    expect(page.invoice().title).toBe("Not saved yet");

    // Retries don't start a new episode, so it's announced once.
    await settle(4000);

    expect(page.documentState().saveFailure?.episode).toBe(failure?.episode);

    failWrites.current = null;
    await expect(page.retrySave()).resolves.toBe(true);

    const id = page.documentState().documentId ?? "";

    expect(page.documentState().saveFailure).toBeNull();
    expect((await page.getInvoice(id))?.invoiceData.title).toBe(
      "Not saved yet"
    );

    failWrites.current = new DOMException("Closing", "InvalidStateError");
    page.edit().setTitle("Fails differently");
    await settle();

    expect(page.documentState().saveFailure).toMatchObject({
      storageFull: false
    });
    expect(page.documentState().saveFailure?.episode).not.toBe(
      failure?.episode
    );
  });

  it("never writes an edit over theirs when its version can't be kept", async () => {
    const failWrites: FailWrites = { current: null, tables: ["versions"] };
    const page = await loadPage({ failWrites });

    page.edit().setTitle("Mine");
    await settle();

    const id = page.documentState().documentId ?? "";
    const stored = await page.getInvoice(id);

    if (!stored) throw new Error("The invoice wasn't written");

    failWrites.current = new DOMException("Full", "QuotaExceededError");
    page.edit().setTitle("Mine, edited");
    await page.saveInvoice({
      ...stored,
      invoiceData: { ...stored.invoiceData, title: "Theirs" },
      rev: stored.rev + 1
    });
    await settle();
    failWrites.current = null;
    await settle(5000);

    expect((await page.getInvoice(id))?.invoiceData.title).toBe("Theirs");
    expect(page.invoice().title).toBe("Theirs");
  });

  it("keeps the invoice open when its edits can't be written", async () => {
    const failWrites: { current: Error | null } = { current: null };
    const page = await loadPage({ failWrites });

    page.edit().setTitle("First");
    await settle();

    const id = page.documentState().documentId;

    failWrites.current = new DOMException("Full", "QuotaExceededError");
    page.edit().setTitle("Unsaved");
    await page.newInvoice();

    expect(page.documentState().documentId).toBe(id);
    expect(page.invoice().title).toBe("Unsaved");
  });
});

describe("version history", () => {
  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "Date"] });
    await Dexie.delete("InvoiceDatabase");
  });

  afterEach(async () => {
    await closePages();
    vi.useRealTimers();
  });

  it("keeps a version when an invoice is opened", async () => {
    const page = await loadPage();

    await page.saveInvoice(
      storedInvoice({
        id: "kept",
        invoiceData: { ...structuredClone(invoiceDefault), title: "As opened" }
      })
    );
    await page.openInvoice("kept");

    const versions = await vi.waitFor(async () => {
      const kept = await page.getInvoiceVersions("kept");

      expect(kept).toHaveLength(1);

      return kept;
    });

    expect(versions[0]).toMatchObject({ reason: "opened" });
    expect(versions[0].invoiceData.title).toBe("As opened");
  });

  it("keeps one opened version of an imported invoice whose rows have no ids", async () => {
    const page = await loadPage();
    const invoiceData = structuredClone(invoiceDefault);

    invoiceData.paymentDetails.methods = [
      { id: "", name: "Venmo", detail: "@jane" },
      { id: "", name: "Pix", detail: "jane@example.com" }
    ];
    await page.saveInvoice(storedInvoice({ id: "kept", invoiceData }));
    await page.saveInvoice(storedInvoice({ id: "other", name: "Other" }));

    for (let i = 0; i < 3; i++) {
      await page.openInvoice("kept");
      await settle();
      await vi.advanceTimersByTimeAsync(10 * 60 * 1000);
      await page.openInvoice("other");
      await settle();
      await vi.advanceTimersByTimeAsync(10 * 60 * 1000);
    }

    expect(await page.getInvoiceVersions("kept")).toHaveLength(1);
  });

  it("restores a version as one undoable step, keeping the current state first", async () => {
    const page = await loadPage();

    await page.saveInvoice(
      storedInvoice({
        id: "kept",
        invoiceData: {
          ...structuredClone(invoiceDefault),
          title: "Version one"
        }
      })
    );
    await page.openInvoice("kept");

    const opened = await vi.waitFor(async () => {
      const [version] = await page.getInvoiceVersions("kept");

      expect(version).toBeDefined();

      return version;
    });

    page.edit().setTitle("Version two");
    await settle();

    await page.restoreVersion(opened);

    expect(page.invoice().title).toBe("Version one");
    expect(
      (await page.getInvoiceVersions("kept")).find(
        version => version.reason === "beforeRestore"
      )?.invoiceData.title
    ).toBe("Version two");

    await settle();

    expect((await page.getInvoice("kept"))?.invoiceData.title).toBe(
      "Version one"
    );

    page.history.undoInvoiceChange();

    expect(page.invoice().title).toBe("Version two");
  });

  it("keeps a version before a change that removes most of the invoice", async () => {
    const page = await loadPage();

    page.edit().setClient(client => ({
      ...client,
      content: "Acme Ltd\n1 High Street\nLondon\nUnited Kingdom\nVAT GB123"
    }));
    await settle();
    page.edit().setClient(client => ({ ...client, content: "" }));
    await settle();

    const id = page.documentState().documentId ?? "";
    const removal = (await page.getInvoiceVersions(id)).find(
      version => version.reason === "beforeRemoval"
    );

    expect(removal?.invoiceData.client.content).toContain("Acme Ltd");
  });

  it("keeps a version after a pause in editing, at most every 10 minutes", async () => {
    const page = await loadPage();

    page.edit().setTitle("Typed");
    await settle();
    await settle(31_000);

    const id = page.documentState().documentId ?? "";

    expect(
      (await page.getInvoiceVersions(id)).filter(
        version => version.reason === "idle"
      )
    ).toHaveLength(1);

    page.edit().setTitle("Typed more");
    await settle();
    await settle(31_000);

    expect(
      (await page.getInvoiceVersions(id)).filter(
        version => version.reason === "idle"
      )
    ).toHaveLength(1);

    await settle(10 * 60_000);
    page.edit().setTitle("Typed later");
    await settle();
    await settle(31_000);

    expect(
      (await page.getInvoiceVersions(id)).filter(
        version => version.reason === "idle"
      )
    ).toHaveLength(2);
  });
});

// Two pages in one process share IndexedDB and Web Locks, as two tabs do.
describe("two tabs on one invoice", () => {
  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "Date"] });
    await Dexie.delete("InvoiceDatabase");
  });

  afterEach(async () => {
    await closePages();
    vi.useRealTimers();
  });

  it("lets one tab edit while the other follows it read-only", async () => {
    const first = await loadPage();

    first.edit().setTitle("Started in the first tab");
    await settle();

    const second = await loadPage();

    expect(second.documentState()).toMatchObject({
      documentId: first.documentState().documentId,
      status: "readOnly"
    });
    expect(second.invoice().title).toBe("Started in the first tab");

    first.edit().setTitle("Still typing in the first tab");
    await settle();

    await vi.waitFor(() =>
      expect(second.invoice().title).toBe("Still typing in the first tab")
    );

    // Anything that changes the read-only copy is put back.
    second.edit().setTitle("Typed into the read-only tab");
    await settle(0);

    expect(second.invoice().title).toBe("Still typing in the first tab");
  });

  it("hands editing over with Edit here, writing the first tab's pending edit", async () => {
    const first = await loadPage();

    first.edit().setTitle("One");
    await settle();

    const second = await loadPage();
    const id = first.documentState().documentId ?? "";

    first.edit().setTitle("Typed just before the hand-over");
    await second.takeOver();

    await vi.waitFor(() =>
      expect(first.documentState().status).toBe("readOnly")
    );
    await vi.waitFor(() =>
      expect(second.invoice().title).toBe("Typed just before the hand-over")
    );

    expect(second.documentState().status).toBe("editing");

    second.edit().setTitle("Now edited in the second tab");
    await settle();

    await vi.waitFor(() =>
      expect(first.invoice().title).toBe("Now edited in the second tab")
    );

    const stored = await first.getInvoice(id);

    expect(stored?.invoiceData.title).toBe("Now edited in the second tab");
    expect(
      (await first.getInvoiceVersions(id)).filter(
        version => version.reason === "conflict"
      )
    ).toEqual([]);
  });

  it("lets the read-only tab edit once the editing tab moves on", async () => {
    const first = await loadPage();

    first.edit().setTitle("One");
    await settle();

    const second = await loadPage();

    expect(second.documentState().status).toBe("readOnly");

    await first.newInvoice();

    await vi.waitFor(() =>
      expect(second.documentState().status).toBe("editing")
    );
  });
});

describe("usage counts", () => {
  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "Date"] });
    await Dexie.delete("InvoiceDatabase");
    trackInvoice.mockClear();
  });

  afterEach(async () => {
    await closePages();
    vi.useRealTimers();
  });

  it("counts a new invoice once, when it joins the library", async () => {
    const page = await loadPage();

    await settle(5000);

    expect(trackInvoice).not.toHaveBeenCalled();

    page.edit().setTitle("Quote");
    await settle();
    page.edit().setTitle("Quote for May");
    await settle(5000);

    expect(trackInvoice).toHaveBeenCalledExactlyOnceWith(
      "invoice_saved",
      expect.objectContaining({ currencyCode: "USD" })
    );
  });

  it("counts a new invoice named before its first edit", async () => {
    const page = await loadPage();

    await page.renameCurrent("Named first");

    expect(trackInvoice).toHaveBeenCalledExactlyOnceWith(
      "invoice_saved",
      expect.objectContaining({ currencyCode: "USD" })
    );
  });

  it("counts a duplicate as a new invoice", async () => {
    const page = await loadPage();

    await page.renameCurrent("Original");
    await page.duplicateCurrent();

    expect(trackInvoice.mock.calls.map(([event]) => event)).toEqual([
      "invoice_saved",
      "invoice_saved"
    ]);
  });
});

describe("starting in a font", () => {
  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "Date"] });
    await Dexie.delete("InvoiceDatabase");
  });

  afterEach(async () => {
    await closePages();
    vi.useRealTimers();
  });

  it("starts a new invoice and keeps the one under way", async () => {
    const page = await loadPage();

    page.edit().setTitle("Half-finished invoice");
    await settle();

    const previousId = page.documentState().documentId;

    await page.startInFont("lora");

    expect(page.documentState()).toMatchObject({ isRecord: false });
    expect(page.documentState().documentId).not.toBe(previousId);
    expect(page.invoice().theme.font).toBe("lora");
    expect(page.invoice().title).toBe(invoiceDefault.title);
    expect(await page.getAllInvoices()).toMatchObject([
      { id: previousId, invoiceData: { title: "Half-finished invoice" } }
    ]);
  });

  it("starts an invoice rather than restyling an untouched blank quote", async () => {
    const page = await loadPage();

    await page.newDocument("quote");

    const quoteId = page.documentState().documentId;

    await page.startInFont("lora");

    expect(page.documentState().documentId).not.toBe(quoteId);
    expect(page.invoice().documentType).toBe("invoice");
    expect(page.invoice().theme.font).toBe("lora");
  });

  it("sets an untouched blank in the font rather than replacing it", async () => {
    const page = await loadPage();
    const blankId = page.documentState().documentId;

    await page.startInFont("lora");
    await page.startInFont("lora");

    expect(page.documentState().documentId).toBe(blankId);
    expect(page.invoice().theme.font).toBe("lora");

    await settle(5000);

    expect(await page.getAllInvoices()).toEqual([]);
  });
});

describe("starting from a site template", () => {
  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "Date"] });
    await Dexie.delete("InvoiceDatabase");
  });

  afterEach(async () => {
    await closePages();
    vi.useRealTimers();
  });

  it("opens the template and saves nothing until it's edited", async () => {
    const page = await loadPage();

    await page.startSiteTemplate("contractor");
    await settle(5000);

    expect(page.invoice().shipping.label).toBe("Job site");
    expect(page.documentState()).toMatchObject({ isRecord: false });
    expect(await page.getAllInvoices()).toEqual([]);
  });

  it("joins the library on its first edit", async () => {
    const page = await loadPage();

    await page.startSiteTemplate("freelance");
    page.edit().setNumber("HRS-1");
    await settle();

    expect(await page.getAllInvoices()).toMatchObject([
      { templateId: null, invoiceData: { number: "HRS-1" } }
    ]);
    expect(page.documentState()).toMatchObject({ isRecord: true });
  });

  it("opens a document type's page as a blank of that type", async () => {
    const page = await loadPage();

    await page.startSiteTemplate("receipt");
    await settle(5000);

    expect(page.invoice().documentType).toBe("receipt");
    expect(await page.getAllInvoices()).toEqual([]);
  });

  it("starts a new invoice rather than restyling an untouched trade template", async () => {
    const page = await loadPage();

    await page.startSiteTemplate("contractor");

    const templateDocumentId = page.documentState().documentId;

    await page.startInFont("lora");

    expect(page.documentState().documentId).not.toBe(templateDocumentId);
    expect(page.invoice().theme.font).toBe("lora");
    expect(page.invoice().shipping.label).toBe(invoiceDefault.shipping.label);
  });

  it("keeps the invoice under way in the library", async () => {
    const page = await loadPage();

    page.edit().setTitle("Half-finished invoice");
    await settle();

    const previousId = page.documentState().documentId;

    await page.startSiteTemplate("retail");

    expect(page.documentState().documentId).not.toBe(previousId);
    expect(page.invoice().tax.perLine).toBe(true);
    expect(await page.getAllInvoices()).toMatchObject([
      { id: previousId, invoiceData: { title: "Half-finished invoice" } }
    ]);
  });
});

describe("starting from a link before the editor has attached", () => {
  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "Date"] });
    await Dexie.delete("InvoiceDatabase");
  });

  afterEach(async () => {
    await closePages();
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  // The last open invoice has edits stashed at page exit that never reached
  // the database. A start link's effect runs before the provider's attach, so
  // this page is left unattached, as the link finds it.
  async function loadPageWithStashedEdits() {
    const earlierPage = await loadPage();

    await earlierPage.createInvoice(
      storedInvoice({
        invoiceData: { ...structuredClone(invoiceDefault), title: "Stored" }
      })
    );
    await earlierPage.setLastOpenedInvoiceId("stored");

    const stash = {
      rev: 1,
      writingRev: 2,
      isRecord: true,
      name: "Stored invoice",
      nameSource: "user",
      templateId: null,
      invoiceData: { ...structuredClone(invoiceDefault), title: "Typed" }
    };

    vi.stubGlobal("window", {
      sessionStorage: memoryStorage(),
      localStorage: memoryStorage({ "unsaved:stored": JSON.stringify(stash) }),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn()
    });
    vi.stubGlobal("document", {
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      visibilityState: "visible"
    });

    return loadPage({ attachEditor: false });
  }

  it("keeps stashed edits when a site template starts", async () => {
    const page = await loadPageWithStashedEdits();

    await page.startSiteTemplate("receipt");
    await settle();

    expect(page.invoice().documentType).toBe("receipt");
    expect((await page.getInvoice("stored"))?.invoiceData.title).toBe("Typed");
  });

  it("keeps stashed edits when a font link starts a new invoice", async () => {
    const page = await loadPageWithStashedEdits();

    await page.startInFont("lora");
    await settle();

    expect(page.invoice().theme.font).toBe("lora");
    expect((await page.getInvoice("stored"))?.invoiceData.title).toBe("Typed");
  });
});

describe("after another tab upgrades the database", () => {
  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "Date"] });
    await Dexie.delete("InvoiceDatabase");
  });

  afterEach(async () => {
    await closePages();
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  function upgradeElsewhere(page: Awaited<ReturnType<typeof loadPage>>) {
    page.db.on.versionchange.fire(
      new IDBVersionChangeEvent("versionchange", {
        newVersion: 999,
        oldVersion: 1
      })
    );
  }

  async function loadPageAwayFromTheEditor() {
    const page = await loadPage();

    upgradeElsewhere(page);
    await page.detachEditor();

    return page;
  }

  // The browser's storage, which outlives a page, so a reload in the test
  // finds what the page before it stashed.
  function stubBrowser() {
    const localStorage = memoryStorage();
    const listeners = new Map<string, () => void>();

    vi.stubGlobal("window", {
      sessionStorage: memoryStorage(),
      localStorage,
      addEventListener: (type: string, listener: () => void) =>
        void listeners.set(type, listener),
      removeEventListener: vi.fn()
    });
    vi.stubGlobal("document", {
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      visibilityState: "visible"
    });

    return {
      stash: () => localStorage.getItem("unsaved:stored"),
      hidePage: () => listeners.get("pagehide")?.()
    };
  }

  async function loadStoredInvoice(options?: {
    failWrites: { current: Error | null };
  }) {
    const earlierPage = await loadPage();

    await earlierPage.createInvoice(storedInvoice({}));
    await earlierPage.setLastOpenedInvoiceId("stored");

    const browser = stubBrowser();

    return { browser, page: await loadPage(options) };
  }

  async function reload(page: Awaited<ReturnType<typeof loadPage>>) {
    await page.detachEditor();

    const reloaded = await loadPage();

    await settle();

    return reloaded;
  }

  it("brings back an edit made inside the save delay", async () => {
    const { page } = await loadStoredInvoice();

    page.edit().setTitle("Typed");
    upgradeElsewhere(page);

    const reloaded = await reload(page);

    expect(reloaded.invoice().title).toBe("Typed");
    expect((await reloaded.getInvoice("stored"))?.invoiceData.title).toBe(
      "Typed"
    );
  });

  it("brings back an edit made while a write was running", async () => {
    const { page } = await loadStoredInvoice();

    page.edit().setTitle("Written");
    await vi.advanceTimersByTimeAsync(500);
    page.edit().setTitle("Typed after");
    upgradeElsewhere(page);
    await settle(0);

    const reloaded = await reload(page);

    expect(reloaded.invoice().title).toBe("Typed after");
  });

  it("brings back the first edit of a new invoice", async () => {
    stubBrowser();

    const page = await loadPage();

    page.edit().setTitle("Typed");
    upgradeElsewhere(page);

    const reloaded = await reload(page);

    expect(reloaded.invoice().title).toBe("Typed");
  });

  it("brings back an edit made during a new invoice's first write", async () => {
    stubBrowser();

    const page = await loadPage();

    page.edit().setTitle("Written");
    await vi.advanceTimersByTimeAsync(500);
    page.edit().setTitle("Typed after");
    upgradeElsewhere(page);
    await settle(0);

    const reloaded = await reload(page);

    expect(reloaded.invoice().title).toBe("Typed after");
  });

  it("stays open with the edit stashed if it arrives while leaving", async () => {
    const { page } = await loadStoredInvoice();

    page.edit().setTitle("Written");
    await vi.advanceTimersByTimeAsync(500);
    page.edit().setTitle("Typed after");

    const leaving = page.newInvoice();

    await vi.advanceTimersByTimeAsync(0);
    upgradeElsewhere(page);
    await leaving;
    await settle(0);

    expect(page.documentState().status).toBe("reloadRequired");

    const reloaded = await reload(page);

    expect(reloaded.invoice().title).toBe("Typed after");
  });

  it("keeps a tab waiting for the invoice asking for a reload", async () => {
    const { browser, page: editingTab } = await loadStoredInvoice();
    const waitingTab = await loadPage();

    expect(waitingTab.documentState().status).toBe("readOnly");

    editingTab.edit().setTitle("Typed");
    upgradeElsewhere(editingTab);
    upgradeElsewhere(waitingTab);
    await editingTab.detachEditor();
    await settle(0);

    expect(waitingTab.documentState().status).toBe("reloadRequired");
    expect(browser.stash()).not.toBeNull();

    const reloaded = await reload(editingTab);

    expect(reloaded.documentState().status).toBe("editing");
    expect(reloaded.invoice().title).toBe("Typed");
  });

  it("still clears the stash once a save completes", async () => {
    const { browser, page } = await loadStoredInvoice();

    page.edit().setTitle("Typed");
    browser.hidePage();

    expect(browser.stash()).not.toBeNull();

    await settle(0);

    expect(browser.stash()).toBeNull();
  });

  it("clears the stash of an invoice deleted elsewhere", async () => {
    const { browser, page } = await loadStoredInvoice();

    page.edit().setTitle("Typed");

    const deleted = page.db.invoices.delete("stored");

    browser.hidePage();
    await deleted;
    await settle(0);

    expect(page.documentState().status).toBe("deleted");
    expect(browser.stash()).toBeNull();
  });

  async function loadFailedWriteDeletedElsewhere() {
    const failWrites: { current: Error | null } = { current: null };
    const { browser, page } = await loadStoredInvoice({ failWrites });

    failWrites.current = new DOMException("Full", "QuotaExceededError");
    page.edit().setTitle("Typed");
    await settle();
    browser.hidePage();
    await settle(0);
    failWrites.current = null;
    await page.db.invoices.delete("stored");
    await settle(0);

    return { browser, page };
  }

  it("keeps the stash of a failed write when deleted elsewhere", async () => {
    const { browser, page } = await loadFailedWriteDeletedElsewhere();

    expect(page.documentState().status).toBe("deleted");
    expect(browser.stash()).not.toBeNull();
  });

  it("clears that stash once the deleted invoice is kept as a copy", async () => {
    const { browser, page } = await loadFailedWriteDeletedElsewhere();

    await page.keepDeletedCopy();

    expect(browser.stash()).toBeNull();
  });

  it("keeps what it shows when a late blur changes the invoice", async () => {
    const { page } = await loadStoredInvoice();

    page.edit().setTitle("Typed");
    await settle();
    upgradeElsewhere(page);
    page.edit().setTax(tax => ({ ...tax, percentage: 12 }));
    await settle();

    expect(page.invoice().title).toBe("Typed");
  });

  it("keeps the stash when a late blur follows a failed write", async () => {
    const failWrites: { current: Error | null } = { current: null };
    const { browser, page } = await loadStoredInvoice({ failWrites });

    failWrites.current = new DOMException("Full", "QuotaExceededError");
    page.edit().setTitle("Typed");
    await settle();
    upgradeElsewhere(page);
    page.edit().setTax(tax => ({ ...tax, percentage: 12 }));
    await settle();
    browser.hidePage();
    failWrites.current = null;

    const reloaded = await reload(page);

    expect(reloaded.invoice().title).toBe("Typed");
  });

  it("keeps asking for a reload when the editor comes back", async () => {
    const page = await loadPageAwayFromTheEditor();

    await page.attachEditor();
    await settle();

    expect(page.documentState().status).toBe("reloadRequired");
  });

  it("won't start a template until the page is reloaded", async () => {
    const page = await loadPageAwayFromTheEditor();
    const { documentId } = page.documentState();

    await page.startSiteTemplate("quote");
    await settle();

    expect(page.documentState()).toMatchObject({
      documentId,
      status: "reloadRequired"
    });
  });
});

describe("a tab that loses the invoice while its saves fail", () => {
  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "Date"] });
    await Dexie.delete("InvoiceDatabase");
  });

  afterEach(async () => {
    await closePages();
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  type KeptEdit = { invoiceData: { title: string } };

  // Two tabs on the stored invoice, sharing the browser's storage. Each tab's
  // page listeners are kept apart, so one tab can be hidden or closed alone.
  async function loadTwoTabs(failWrites: FailWrites) {
    const earlierPage = await loadPage();

    await earlierPage.createInvoice(storedInvoice({}));
    await earlierPage.setLastOpenedInvoiceId("stored");

    const localStorage = new ListableStorage();
    const tabListeners: Map<string, (event?: unknown) => void>[] = [];

    vi.stubGlobal("window", {
      sessionStorage: memoryStorage(),
      localStorage,
      addEventListener: (type: string, listener: (event?: unknown) => void) => {
        // Each page adds its pagehide listener first.
        if (type === "pagehide") tabListeners.push(new Map());

        tabListeners.at(-1)?.set(type, listener);
      },
      removeEventListener: vi.fn()
    });
    vi.stubGlobal("document", {
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      visibilityState: "visible"
    });

    const first = await loadPage({ failWrites });

    first.edit().setTitle("Saved");
    await settle();

    const second = await loadPage();

    expect(second.documentState().status).toBe("readOnly");

    return {
      first,
      second,
      localStorage,
      // The titles kept in local storage for the stored invoice: its stash,
      // and what any tab left there unwritten.
      keptTitles: () =>
        Object.keys(localStorage)
          .filter(
            key =>
              key === "unsaved:stored" ||
              (key.startsWith("unwritten:") && key.endsWith(":stored"))
          )
          .flatMap(key => {
            // What the session wrote there: one stash, or a list of them.
            const kept = JSON.parse(localStorage.getItem(key) ?? "[]") as
              KeptEdit | KeptEdit[];

            return Array.isArray(kept) ? kept : [kept];
          })
          .map(kept => kept.invoiceData.title),
      hideFirst: () => tabListeners[0]?.get("pagehide")?.(),
      closeFirst: () => {
        const event = { preventDefault: vi.fn(), returnValue: undefined };

        tabListeners[0]?.get("beforeunload")?.(event);

        return event;
      }
    };
  }

  // The first tab's writes fail with an edit in it, then the second tab takes
  // the invoice over.
  async function loadTakenOverWithAFailedEdit(
    options: { tables?: string[]; hideFirst?: boolean } = {}
  ) {
    const failWrites: FailWrites = { current: null, tables: options.tables };
    const tabs = await loadTwoTabs(failWrites);

    failWrites.current = new DOMException("Full", "QuotaExceededError");
    tabs.first.edit().setTitle("Unwritten");
    await settle();

    expect(tabs.first.documentState().saveFailure).not.toBeNull();

    if (options.hideFirst) {
      tabs.hideFirst();
      await settle(0);
    }

    await tabs.second.takeOver();
    await vi.waitFor(() =>
      expect(tabs.first.documentState().status).toBe("readOnly")
    );

    return { ...tabs, failWrites };
  }

  async function conflictTitles(page: Awaited<ReturnType<typeof loadPage>>) {
    return (await page.getInvoiceVersions("stored"))
      .filter(version => version.reason === "conflict")
      .map(version => version.invoiceData.title);
  }

  it("keeps the stash of an edit it couldn't write when hidden", async () => {
    const tabs = await loadTakenOverWithAFailedEdit();

    tabs.hideFirst();
    await settle(0);

    expect(tabs.keptTitles()).toContain("Unwritten");
  });

  it("still asks before closing once the retry timer has fired", async () => {
    const tabs = await loadTakenOverWithAFailedEdit();

    await settle(5000);

    const event = tabs.closeFirst();

    expect(event.preventDefault).toHaveBeenCalled();
    expect(tabs.keptTitles()).toContain("Unwritten");
  });

  it("hands an edit stashed before the takeover to the other tab", async () => {
    const tabs = await loadTakenOverWithAFailedEdit({ hideFirst: true });

    await vi.waitFor(() =>
      expect(tabs.second.invoice().title).toBe("Unwritten")
    );
    await settle();

    expect((await tabs.second.getInvoice("stored"))?.invoiceData.title).toBe(
      "Unwritten"
    );
    expect(await conflictTitles(tabs.second)).toEqual([]);
  });

  it("follows a write the other tab made while its own was failing", async () => {
    const failWrites: FailWrites = { current: null };
    const tabs = await loadTwoTabs(failWrites);
    let release = () => {};

    failWrites.current = new DOMException("Full", "QuotaExceededError");
    tabs.first.edit().setTitle("Unwritten");
    await settle();
    failWrites.hold = new Promise(resolve => (release = resolve));
    tabs.hideFirst();
    await tabs.second.takeOver();
    await settle();

    expect((await tabs.second.getInvoice("stored"))?.invoiceData.title).toBe(
      "Unwritten"
    );

    release();
    await vi.waitFor(() =>
      expect(tabs.first.documentState().status).toBe("readOnly")
    );
    await settle(0);
    tabs.second.edit().setTitle("Written in the second tab");
    await settle();

    await vi.waitFor(() =>
      expect(tabs.first.invoice().title).toBe("Written in the second tab")
    );
    await settle();

    expect(await conflictTitles(tabs.first)).toEqual([]);
  });

  it("keeps the edit as a version when the other tab writes over it", async () => {
    const tabs = await loadTakenOverWithAFailedEdit();

    tabs.second.edit().setTitle("Written in the second tab");
    await settle();

    await vi.waitFor(() =>
      expect(tabs.first.invoice().title).toBe("Written in the second tab")
    );
    await settle();

    expect(await conflictTitles(tabs.first)).toEqual(["Unwritten"]);
    expect(tabs.keptTitles()).toEqual([]);
  });

  async function loadWithAVersionThatFailed() {
    const tabs = await loadTakenOverWithAFailedEdit({
      tables: ["invoices", "versions"]
    });

    tabs.second.edit().setTitle("Written in the second tab");
    await settle();

    await vi.waitFor(() =>
      expect(tabs.first.invoice().title).toBe("Written in the second tab")
    );
    await settle();

    return tabs;
  }

  it("keeps the edit through the other tab's saves when its version fails too", async () => {
    const tabs = await loadWithAVersionThatFailed();

    expect(tabs.keptTitles()).toContain("Unwritten");

    tabs.second.edit().setTitle("Written again in the second tab");
    await settle();

    expect(tabs.keptTitles()).toContain("Unwritten");
    expect(tabs.closeFirst().preventDefault).toHaveBeenCalled();
  });

  it("keeps the edit when it opens another invoice after its version failed", async () => {
    const tabs = await loadWithAVersionThatFailed();

    await tabs.first.newInvoice();
    tabs.second.edit().setTitle("Written again in the second tab");
    await settle();

    expect(tabs.keptTitles()).toContain("Unwritten");
  });

  it("keeps the edit when it opens the invoice again, still read-only", async () => {
    const tabs = await loadTakenOverWithAFailedEdit();

    await tabs.first.newInvoice();
    await tabs.first.openInvoice("stored");

    expect(tabs.first.documentState().status).toBe("readOnly");

    tabs.hideFirst();
    await settle(0);

    expect(tabs.keptTitles()).toContain("Unwritten");
  });

  it("brings the edit in when it opens the invoice again to edit it", async () => {
    const tabs = await loadTakenOverWithAFailedEdit();

    await tabs.first.newInvoice();
    await tabs.second.newInvoice();
    tabs.failWrites.current = null;
    await tabs.first.openInvoice("stored");
    await settle();

    expect(tabs.first.documentState().status).toBe("editing");
    expect((await tabs.first.getInvoice("stored"))?.invoiceData.title).toBe(
      "Unwritten"
    );
    expect(tabs.keptTitles()).toEqual([]);
  });

  it("writes the edit of a tab that left it when another page loads", async () => {
    const tabs = await loadTakenOverWithAFailedEdit();

    await tabs.first.newInvoice();
    await tabs.second.newInvoice();

    const later = await loadPage();

    await settle();

    expect((await later.getInvoice("stored"))?.invoiceData.title).toBe(
      "Unwritten"
    );
    expect(tabs.keptTitles()).toEqual([]);
  });

  it("drops the edit when the invoice is deleted from the library", async () => {
    const tabs = await loadTakenOverWithAFailedEdit();

    await tabs.first.newInvoice();
    await tabs.second.newInvoice();
    tabs.failWrites.current = null;
    await tabs.first.deleteFromLibrary(["stored"]);

    expect(tabs.keptTitles()).toEqual([]);

    const later = await loadPage();

    await settle();

    expect(
      (await later.getAllInvoices()).map(invoice => invoice.invoiceData.title)
    ).not.toContain("Unwritten");
  });

  it("keeps both tabs' edits when another tab upgrades the database", async () => {
    const tabs = await loadTakenOverWithAFailedEdit();

    tabs.second.edit().setTitle("Pending in the second tab");

    for (const page of [tabs.first, tabs.second]) {
      page.db.on.versionchange.fire(
        new IDBVersionChangeEvent("versionchange", {
          newVersion: 999,
          oldVersion: 1
        })
      );
    }

    tabs.hideFirst();
    await settle(0);

    expect(tabs.keptTitles()).toEqual(
      expect.arrayContaining(["Unwritten", "Pending in the second tab"])
    );
  });

  it("drops the edit when all data is deleted", async () => {
    const tabs = await loadTakenOverWithAFailedEdit();

    await tabs.first.newInvoice();
    await tabs.second.deleteEverything();

    expect(tabs.keptTitles()).toEqual([]);
  });

  it("keeps a closed tab's edit through the other tab's saves", async () => {
    const tabs = await loadTakenOverWithAFailedEdit();

    tabs.closeFirst();
    await tabs.first.detachEditor();
    tabs.second.edit().setTitle("Written in the second tab");
    await settle();

    expect(tabs.keptTitles()).toContain("Unwritten");

    await tabs.second.detachEditor();

    const reopened = await loadPage();

    await settle();

    expect(await conflictTitles(reopened)).toContain("Unwritten");
    expect(tabs.keptTitles()).toEqual([]);
  });

  it("keeps its own edit in the history when it gets the invoice back with another tab's stash", async () => {
    const tabs = await loadTakenOverWithAFailedEdit();
    const stored = await tabs.second.getInvoice("stored");

    if (!stored) throw new Error("The stored invoice is missing");

    tabs.failWrites.current = null;
    // The second tab closed inside its save delay, so its edit is only
    // stashed.
    tabs.localStorage.setItem(
      "unsaved:stored",
      JSON.stringify({
        rev: stored.rev,
        writingRev: null,
        isRecord: true,
        name: stored.name,
        nameSource: stored.nameSource,
        templateId: null,
        invoiceData: {
          ...stored.invoiceData,
          title: "Stashed by the second tab"
        },
        schemaVersion: CURRENT_INVOICE_SCHEMA_VERSION
      })
    );
    await tabs.second.detachEditor();

    await vi.waitFor(() =>
      expect(tabs.first.documentState().status).toBe("editing")
    );
    await settle();

    expect((await tabs.first.getInvoice("stored"))?.invoiceData.title).toBe(
      "Stashed by the second tab"
    );
    // The version kept as it opened holds it.
    expect(
      (await tabs.first.getInvoiceVersions("stored")).map(
        version => version.invoiceData.title
      )
    ).toContain("Unwritten");
  });

  it("writes the edit once it gets the invoice back untouched", async () => {
    const tabs = await loadTakenOverWithAFailedEdit();

    await settle(5000);
    tabs.failWrites.current = null;
    await tabs.second.newInvoice();

    await vi.waitFor(() =>
      expect(tabs.first.documentState().status).toBe("editing")
    );
    await settle();

    expect((await tabs.first.getInvoice("stored"))?.invoiceData.title).toBe(
      "Unwritten"
    );
    expect(tabs.first.documentState().saveFailure).toBeNull();
  });

  it("never writes the edit over the other tab's once it gets it back", async () => {
    const tabs = await loadTakenOverWithAFailedEdit();

    tabs.second.edit().setTitle("Written in the second tab");
    await settle();
    tabs.failWrites.current = null;
    await tabs.second.newInvoice();

    await vi.waitFor(() =>
      expect(tabs.first.documentState().status).toBe("editing")
    );
    await settle(5000);

    expect((await tabs.first.getInvoice("stored"))?.invoiceData.title).toBe(
      "Written in the second tab"
    );
    expect(await conflictTitles(tabs.first)).toEqual(["Unwritten"]);
  });

  it("keeps the edit stashed when it opens another invoice", async () => {
    const tabs = await loadTakenOverWithAFailedEdit();

    await tabs.first.newInvoice();
    tabs.second.edit().setTitle("Written in the second tab");
    await settle();

    expect(tabs.first.documentState().documentId).not.toBe("stored");
    expect(tabs.keptTitles()).toContain("Unwritten");
  });
});
