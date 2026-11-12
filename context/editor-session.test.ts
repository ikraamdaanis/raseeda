import Dexie from "dexie";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { invoiceDefault } from "~/stores/invoice-store";
import type { Invoice, InvoiceDocument } from "~/types";

// Spies that outlive the module reset each page load makes.
const { trackInvoice, toastError, downloadBackupFile } = vi.hoisted(() => ({
  trackInvoice: vi.fn(),
  toastError: vi.fn(),
  downloadBackupFile: vi.fn((_open: { invoiceData: Invoice } | null) =>
    Promise.resolve()
  )
}));

vi.mock("~/utils/track", () => ({
  track: vi.fn(),
  trackInvoice,
  trackPageView: vi.fn()
}));

vi.mock("sonner", () => ({
  toast: { error: toastError, warning: vi.fn(), success: vi.fn() }
}));

vi.mock("~/utils/export-data", () => ({ downloadBackupFile }));

// Every page, closed after each test so its timers and the editor lock it
// holds can't reach the next.
const openPages: {
  detachEditor: () => Promise<void>;
  db: { close: (options?: { disableAutoOpen: boolean }) => void };
}[] = [];

async function closePage(page: (typeof openPages)[number]) {
  openPages.splice(openPages.indexOf(page), 1);
  await page.detachEditor();
  page.db.close({ disableAutoOpen: true });
}

async function closePages() {
  for (const page of [...openPages].reverse()) await closePage(page);
}

// Fails writes to (and, with `reads`, reads from) the invoices table while
// `current` is set, as a full disk or a broken database would.
type FailWrites = { current: Error | null; reads?: boolean };

// The session is module state, so every page loads a fresh copy of it, as a
// page load would, over the one database.
async function loadPage({
  failWrites,
  openFails = false
}: {
  failWrites?: FailWrites;
  openFails?: boolean;
} = {}) {
  vi.resetModules();

  const database = await import("~/db");

  if (openFails) {
    vi.spyOn(database.db, "open").mockRejectedValue(
      new DOMException("Unknown", "UnknownError")
    );
  }

  if (failWrites) {
    database.db.use({
      stack: "dbcore",
      name: "fail-writes",
      create: down => ({
        ...down,
        table: name => {
          const table = down.table(name);

          function failure() {
            return name === "invoices" ? failWrites?.current : null;
          }

          return {
            ...table,
            mutate: request => {
              const error = failure();

              return error ? Promise.reject(error) : table.mutate(request);
            },
            get: request => {
              const error = failWrites.reads ? failure() : null;

              return error ? Promise.reject(error) : table.get(request);
            }
          };
        }
      })
    });
  }

  const session = await import("~/context/editor-session");
  const lock = await import("~/context/editor-lock");
  const { useInvoiceStore } = await import("~/stores/invoice-store");
  const { useDocumentStore } = await import("~/stores/document-store");
  const history = await import("~/stores/invoice-history");

  await session.hydrateDocument();
  await session.attachEditor();

  const page = { detachEditor: session.detachEditor, db: database.db };

  openPages.push(page);

  return {
    ...session,
    ...session.documentActions,
    ...database,
    askForEditor: lock.askForEditor,
    history,
    close: () => closePage(page),
    edit: useInvoiceStore.getState,
    invoice: () => useInvoiceStore.getState(),
    documentState: () => useDocumentStore.getState()
  };
}

type Page = Awaited<ReturnType<typeof loadPage>>;

// Lets the debounce run out, then waits for real IndexedDB work, which runs
// outside the fake clock.
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

// The browser around the pages: its storage, which outlives a page, and the
// page events each page listens for.
function stubBrowser(session: Record<string, string> = {}) {
  const sessionStorage = memoryStorage(session);
  let listeners = new Map<string, (event?: unknown) => void>();

  function listen(type: string, listener: () => void) {
    listeners.set(type, listener);
  }

  vi.stubGlobal("window", {
    sessionStorage,
    localStorage: memoryStorage(),
    addEventListener: listen,
    removeEventListener: vi.fn()
  });
  vi.stubGlobal("document", {
    addEventListener: listen,
    removeEventListener: vi.fn(),
    visibilityState: "visible"
  });

  return {
    openInvoice: () => sessionStorage.getItem("open-invoice"),
    // The events of the pages loaded so far; the next page gets its own.
    takePageEvents() {
      const events = listeners;

      listeners = new Map();

      return {
        hidePage: () => events.get("pagehide")?.(),
        // Whether closing the page now would ask first.
        asksBeforeClosing: () => {
          const event = { preventDefault: vi.fn(), returnValue: undefined };

          events.get("beforeunload")?.(event);

          return event.preventDefault.mock.calls.length > 0;
        }
      };
    }
  };
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

async function versionReasons(page: Page, id: string) {
  return (await page.getInvoiceVersions(id)).map(version => version.reason);
}

beforeEach(async () => {
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "Date"] });
  await Dexie.delete("InvoiceDatabase");
  trackInvoice.mockClear();
  toastError.mockClear();
  downloadBackupFile.mockClear();
});

afterEach(async () => {
  await closePages();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("one editor tab", () => {
  it("keeps a second tab out of the database until Use here hands it over", async () => {
    const first = await loadPage();

    first.edit().setTitle("One");
    await settle();

    const id = first.documentState().documentId ?? "";
    const second = await loadPage();

    expect(second.documentState()).toMatchObject({
      status: "elsewhere",
      documentId: null
    });
    expect(second.db.isOpen()).toBe(false);

    first.edit().setTitle("Typed just before Use here");
    second.askForEditor();

    await vi.waitFor(() =>
      expect(second.documentState().status).toBe("editing")
    );

    expect(first.documentState().status).toBe("elsewhere");
    expect(second.documentState().documentId).toBe(id);
    expect(second.invoice().title).toBe("Typed just before Use here");

    // The tab without the editor writes nothing.
    first.edit().setTitle("Typed in the tab without the editor");
    await settle(3000);

    expect((await second.getInvoice(id))?.invoiceData.title).toBe(
      "Typed just before Use here"
    );
  });

  it("hands over while writes fail, keeping the edits in the first tab", async () => {
    const browser = stubBrowser();
    const failWrites: FailWrites = { current: null };
    const first = await loadPage({ failWrites });
    const firstEvents = browser.takePageEvents();

    first.edit().setTitle("Written");
    await settle();

    const id = first.documentState().documentId ?? "";

    failWrites.current = new DOMException("Full", "QuotaExceededError");
    first.edit().setTitle("Not written");
    await settle();

    const failure = first.documentState().saveFailure;

    expect(failure).not.toBeNull();

    const second = await loadPage();

    second.askForEditor();
    await vi.waitFor(() =>
      expect(second.documentState().status).toBe("editing")
    );

    expect(second.invoice().title).toBe("Written");
    expect(first.documentState()).toMatchObject({
      status: "elsewhere",
      saveFailure: { episode: failure?.episode }
    });
    expect(first.invoice().title).toBe("Not written");
    expect(firstEvents.asksBeforeClosing()).toBe(true);

    await first.downloadBackup();

    expect(downloadBackupFile.mock.calls[0][0]?.invoiceData.title).toBe(
      "Not written"
    );

    // Retries while it doesn't have the editor never reach the database.
    failWrites.current = null;
    await settle(5000);

    expect((await second.getInvoice(id))?.invoiceData.title).toBe("Written");

    // Back with the editor, it writes the edits it couldn't.
    await second.close();
    await vi.waitFor(() =>
      expect(first.documentState().status).toBe("editing")
    );
    await settle();

    expect((await first.getInvoice(id))?.invoiceData.title).toBe("Not written");
    expect(first.documentState().saveFailure).toBeNull();
  });

  it("reads the invoice afresh when it gets the editor back with everything written", async () => {
    const first = await loadPage();

    first.edit().setTitle("One");
    await settle();

    const second = await loadPage();

    second.askForEditor();
    await vi.waitFor(() =>
      expect(second.documentState().status).toBe("editing")
    );
    second.edit().setTitle("Written by the second tab");
    await second.close();

    await vi.waitFor(() =>
      expect(first.documentState().status).toBe("editing")
    );
    await vi.waitFor(() =>
      expect(first.invoice().title).toBe("Written by the second tab")
    );
  });
});

describe("autosave", () => {
  it("adds a new invoice to the library on its first edit, counted once", async () => {
    const page = await loadPage();

    await settle(5000);

    expect(await page.getAllInvoices()).toEqual([]);
    expect(page.documentState().isRecord).toBe(false);
    expect(trackInvoice).not.toHaveBeenCalled();

    page.edit().setTitle("Quote");
    await settle();
    page.edit().setTitle("Quote for May");
    await settle(5000);

    const [created] = await page.getAllInvoices();

    expect(created).toMatchObject({
      id: page.documentState().documentId,
      name: "INV-0001",
      nameSource: "auto"
    });
    expect(created.invoiceData.title).toBe("Quote for May");
    expect(page.documentState().isRecord).toBe(true);
    expect(trackInvoice).toHaveBeenCalledExactlyOnceWith(
      "invoice_saved",
      expect.objectContaining({ currencyCode: "USD" })
    );
  });

  it("adds a new invoice renamed before its first edit under that name", async () => {
    const page = await loadPage();

    await page.renameCurrent("Named first");
    page.edit().setTitle("Then edited");
    await settle();

    expect(await page.getAllInvoices()).toMatchObject([
      { name: "Named first", nameSource: "user" }
    ]);
    expect(trackInvoice).toHaveBeenCalledOnce();
  });

  it("saves later edits as a plain content update, with no revision check", async () => {
    const page = await loadPage();

    page.edit().setTitle("Mine");
    await settle();

    const id = page.documentState().documentId ?? "";
    const stored = await page.getInvoice(id);

    if (!stored) throw new Error("The invoice wasn't written");

    await page.saveInvoice({ ...stored, rev: 7 });
    page.edit().setTitle("Mine, edited");
    await settle();

    expect(await page.getInvoice(id)).toMatchObject({
      rev: 7,
      invoiceData: { title: "Mine, edited" }
    });
  });

  it("names an invoice from its content until it's renamed", async () => {
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
      nameSource: "user",
      invoiceData: { number: "INV-8" }
    });
  });

  it("waits for a pause in editing, but never more than 2s", async () => {
    const page = await loadPage();

    page.edit().setTitle("First");
    await settle();

    const id = page.documentState().documentId ?? "";

    page.edit().setTitle("Typed");
    await settle(400);

    expect((await page.getInvoice(id))?.invoiceData.title).toBe("First");

    for (let i = 0; i < 7; i++) {
      page.edit().setTitle(`Still typing ${i}`);
      await settle(300);
    }

    expect((await page.getInvoice(id))?.invoiceData.title).toMatch(
      /^Still typing/
    );
  });

  it("writes at once when the page is hidden", async () => {
    const browser = stubBrowser();
    const page = await loadPage();
    const events = browser.takePageEvents();

    page.edit().setTitle("First");
    await settle();

    const id = page.documentState().documentId ?? "";

    page.edit().setTitle("Hidden mid-pause");
    events.hidePage();
    await settle(0);

    expect((await page.getInvoice(id))?.invoiceData.title).toBe(
      "Hidden mid-pause"
    );
  });

  it("asks before closing only while a write is pending or failing", async () => {
    const browser = stubBrowser();
    const failWrites: FailWrites = { current: null };
    const page = await loadPage({ failWrites });
    const events = browser.takePageEvents();

    expect(events.asksBeforeClosing()).toBe(false);

    page.edit().setTitle("Pending");

    expect(events.asksBeforeClosing()).toBe(true);

    await settle();

    expect(events.asksBeforeClosing()).toBe(false);

    failWrites.current = new DOMException("Full", "QuotaExceededError");
    page.edit().setTitle("Failing");
    await settle();

    expect(events.asksBeforeClosing()).toBe(true);
  });

  it("asks before closing while storage is unavailable and the invoice has edits", async () => {
    const browser = stubBrowser();
    const page = await loadPage({ openFails: true });
    const events = browser.takePageEvents();

    expect(page.documentState().status).toBe("unavailable");
    expect(events.asksBeforeClosing()).toBe(false);

    page.edit().setTitle("Can't be saved");

    expect(events.asksBeforeClosing()).toBe(true);
    expect(page.invoice().title).toBe("Can't be saved");

    await page.newInvoice();

    expect(page.invoice().title).toBe("Can't be saved");
    expect(toastError).toHaveBeenCalled();
  });
});

describe("save failures", () => {
  it("keeps the edits, shows the failure once per run, retries and won't leave", async () => {
    const failWrites: FailWrites = { current: null };
    const page = await loadPage({ failWrites });

    page.edit().setTitle("First");
    await settle();

    const id = page.documentState().documentId ?? "";

    failWrites.current = new DOMException("Full", "QuotaExceededError");
    page.edit().setTitle("Not saved yet");
    await settle();

    const failure = page.documentState().saveFailure;

    expect(failure).toMatchObject({ storageFull: true });

    await settle(4000);

    expect(page.documentState().saveFailure?.episode).toBe(failure?.episode);

    await page.newInvoice();

    expect(page.documentState().documentId).toBe(id);
    expect(page.invoice().title).toBe("Not saved yet");
    expect(toastError).toHaveBeenCalledWith(
      "This invoice couldn't be saved, so it stays open",
      expect.anything()
    );

    failWrites.current = null;
    await settle(30_000);

    expect(page.documentState().saveFailure).toBeNull();
    expect((await page.getInvoice(id))?.invoiceData.title).toBe(
      "Not saved yet"
    );

    failWrites.current = new DOMException("Closing", "InvalidStateError");
    page.edit().setTitle("Fails differently");
    await settle();

    expect(page.documentState().saveFailure?.episode).not.toBe(
      failure?.episode
    );
  });

  it("shows a write that finds the invoice gone as deleted, and keeps a copy", async () => {
    const page = await loadPage();

    page.edit().setTitle("Here");
    await settle();

    const id = page.documentState().documentId ?? "";

    await page.deleteInvoices([id]);
    page.edit().setTitle("Typed after the delete");
    await settle();

    expect(page.documentState().status).toBe("deleted");
    expect(await page.getInvoice(id)).toBeUndefined();

    await page.keepDeletedCopy();
    await settle();

    const [copy] = await page.getAllInvoices();

    expect(copy.id).not.toBe(id);
    expect(copy.invoiceData.title).toBe("Typed after the delete");
    expect(page.documentState()).toMatchObject({
      status: "editing",
      documentId: copy.id
    });
  });
});

describe("opening and leaving", () => {
  it("reopens the last invoice after a reload", async () => {
    const first = await loadPage();

    first.edit().setTitle("Survives a reload");
    await settle();

    const id = first.documentState().documentId;

    await first.close();

    const second = await loadPage();

    expect(second.documentState().documentId).toBe(id);
    expect(second.invoice().title).toBe("Survives a reload");
  });

  it("writes an edit made just before switching to the invoice it was made in", async () => {
    const page = await loadPage();

    await page.saveInvoice(storedInvoice({ id: "other" }));
    page.edit().setTitle("Edited");
    await settle();

    const firstId = page.documentState().documentId ?? "";

    page.edit().setTitle("Edited again, mid-pause");
    await page.openInvoice("other");
    await settle(3000);

    expect((await page.getInvoice(firstId))?.invoiceData.title).toBe(
      "Edited again, mid-pause"
    );
    expect((await page.getInvoice("other"))?.invoiceData.title).toBe("Invoice");
    expect(page.documentState().documentId).toBe("other");
  });

  it("deletes an invoice edited back to blank when it's left, and keeps a named one", async () => {
    const page = await loadPage();

    page.edit().setTitle("Briefly edited");
    await settle();

    const blankId = page.documentState().documentId ?? "";

    page.edit().setTitle("Invoice");
    await page.newInvoice();

    expect(await page.getInvoice(blankId)).toBeUndefined();

    await page.renameCurrent("Keep me");

    const namedId = page.documentState().documentId ?? "";

    await page.newInvoice();

    expect(await page.getInvoice(namedId)).toMatchObject({ name: "Keep me" });
  });

  it("leaves the tab pointing at an invoice it couldn't read, to open on reload", async () => {
    const earlier = await loadPage();

    await earlier.saveInvoice(
      storedInvoice({
        invoiceData: { ...structuredClone(invoiceDefault), title: "Stored" }
      })
    );
    await earlier.close();

    const browser = stubBrowser({ "open-invoice": "stored" });

    const failed = await loadPage({
      failWrites: { current: new Error("Read failed"), reads: true }
    });

    expect(failed.invoice().title).toBe("Invoice");
    expect(browser.openInvoice()).toBe("stored");

    await failed.close();

    const reloaded = await loadPage();

    expect(reloaded.documentState().documentId).toBe("stored");
    expect(reloaded.invoice().title).toBe("Stored");
  });
});

describe("logo cleanup", () => {
  async function storeLogo(page: Page, id: string) {
    await page.saveImage(
      id,
      new Blob([new Uint8Array([1, 2, 3])]),
      "image/png"
    );
  }

  async function storedLogoIds(page: Page) {
    const images = await page.getAllImages();

    return images.map(image => image.id).sort();
  }

  it("deletes logos nothing references on load, and keeps the ones in use", async () => {
    const earlier = await loadPage();

    await Promise.all(
      ["invoice-logo", "template-logo", "version-logo", "unused-logo"].map(id =>
        storeLogo(earlier, id)
      )
    );
    await earlier.saveInvoice(
      storedInvoice({
        invoiceData: {
          ...structuredClone(invoiceDefault),
          image: "invoice-logo"
        }
      })
    );
    await earlier.saveTemplate({
      id: "template",
      name: "Template",
      description: null,
      isDefault: false,
      screenshotUrl: null,
      templateData: {
        ...structuredClone(invoiceDefault),
        image: "template-logo"
      },
      createdAt: new Date(),
      updatedAt: new Date()
    });
    await earlier.addInvoiceVersion({
      invoiceId: "gone",
      name: "Gone",
      invoiceData: {
        ...structuredClone(invoiceDefault),
        image: "version-logo"
      },
      reason: "opened"
    });
    await earlier.close();

    const page = await loadPage();

    expect(await storedLogoIds(page)).toEqual([
      "invoice-logo",
      "template-logo",
      "version-logo"
    ]);
  });

  it("keeps a logo removed from the open invoice until the next load", async () => {
    const page = await loadPage();

    await storeLogo(page, "removed-logo");
    page.edit().setImage("removed-logo");
    await settle();
    page.edit().setImage("");
    await settle(3000);

    expect(page.invoice().image).toBe("");
    expect(await storedLogoIds(page)).toEqual(["removed-logo"]);

    await page.close();

    const reloaded = await loadPage();

    expect(await storedLogoIds(reloaded)).toEqual([]);
  });
});

describe("version history", () => {
  it("keeps a version when an invoice is opened", async () => {
    const page = await loadPage();

    await page.saveInvoice(storedInvoice({ id: "kept" }));
    await page.openInvoice("kept");

    await vi.waitFor(async () =>
      expect(await versionReasons(page, "kept")).toEqual(["opened"])
    );
  });

  it("keeps a version after a 30s pause, at most every 10 minutes", async () => {
    const page = await loadPage();

    page.edit().setTitle("Typed");
    await settle();
    await settle(31_000);

    const id = page.documentState().documentId ?? "";

    expect(await versionReasons(page, id)).toEqual(["idle"]);

    page.edit().setTitle("Typed more");
    await settle();
    await settle(31_000);

    expect(await versionReasons(page, id)).toEqual(["idle"]);

    await settle(10 * 60_000);
    page.edit().setTitle("Typed later");
    await settle();
    await settle(31_000);

    expect(await versionReasons(page, id)).toEqual(["idle", "idle"]);
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

  it("restores a version as one undoable step, keeping the current state first", async () => {
    const page = await loadPage();

    await page.saveInvoice(
      storedInvoice({
        id: "kept",
        invoiceData: { ...structuredClone(invoiceDefault), title: "One" }
      })
    );
    await page.openInvoice("kept");

    const opened = await vi.waitFor(async () => {
      const [version] = await page.getInvoiceVersions("kept");

      expect(version).toBeDefined();

      return version;
    });

    page.edit().setTitle("Two");
    await settle();
    await page.restoreVersion(opened);
    await settle();

    expect(page.invoice().title).toBe("One");
    expect((await page.getInvoice("kept"))?.invoiceData.title).toBe("One");
    expect(
      (await page.getInvoiceVersions("kept")).find(
        version => version.reason === "beforeRestore"
      )?.invoiceData.title
    ).toBe("Two");

    page.history.undoInvoiceChange();

    expect(page.invoice().title).toBe("Two");
  });
});

describe("library actions", () => {
  it("duplicates the open invoice from the library with edits still in the save delay", async () => {
    const page = await loadPage();

    await page.renameCurrent("Open one");

    const id = page.documentState().documentId ?? "";
    const listed = await page.getInvoice(id);

    if (!listed) throw new Error("The invoice wasn't written");

    page.edit().setTitle("Typed a moment ago");

    const copy = await page.duplicateInvoice(listed);

    expect(copy).toMatchObject({
      name: "Open one copy",
      invoiceData: { title: "Typed a moment ago" }
    });
    expect(page.documentState().documentId).toBe(id);
    expect(trackInvoice).toHaveBeenCalledTimes(2);
  });

  it("duplicates the open invoice, opens the copy and says what to check", async () => {
    const page = await loadPage();

    page.edit().setNumber("FRL-0014");
    page.edit().setServicePeriod("October 2026");

    const copy = await page.duplicateCurrent();

    expect(copy?.invoiceData.number).toBe("FRL-0015");
    expect(page.documentState().documentId).toBe(copy?.id);
    expect(page.documentState().copyReview).toEqual({
      documentId: copy?.id,
      message: "Copied from FRL-0014. Check the service period."
    });
    expect(page.history.useInvoiceHistory.getState().canUndo).toBe(false);
    expect(await page.getAllInvoices()).toHaveLength(2);
  });

  it("duplicates a quote as an invoice and leaves the quote as it was", async () => {
    const page = await loadPage();

    await page.newDocument("quote");
    page.edit().setClient(client => ({ ...client, content: "Acme Ltd" }));
    await page.flushNow();

    const quoteId = page.documentState().documentId ?? "";
    const quote = await page.getInvoice(quoteId);
    const copy = await page.duplicateCurrent("invoice");

    expect(page.invoice()).toMatchObject({
      documentType: "invoice",
      number: "INV-0001",
      client: quote?.invoiceData.client
    });
    expect(page.documentState().copyReview?.message).toBe(
      "Copied from QUO-0001 as an invoice and dated today."
    );
    expect(copy?.id).not.toBe(quoteId);
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
      number: "CN-0001",
      refersTo: "INV-0042, 3 Oct 2026"
    });
    expect(page.documentState().documentId).not.toBe(copy.id);
  });

  it("starts a new blank when the open invoice is deleted from the library", async () => {
    const page = await loadPage();

    page.edit().setTitle("Doomed");
    await settle();

    const id = page.documentState().documentId ?? "";

    page.edit().setTitle("Doomed, still in the save delay");
    await page.deleteFromLibrary([id]);
    await settle(3000);

    expect(await page.getInvoice(id)).toBeUndefined();
    expect(page.documentState()).toMatchObject({
      isRecord: false,
      status: "editing"
    });
    expect(page.documentState().documentId).not.toBe(id);
    expect(page.invoice().title).toBe("Invoice");
  });

  it("deletes everything and starts a new blank", async () => {
    const page = await loadPage();

    await page.renameCurrent("Kept by name");
    page.edit().setTitle("Typed a moment ago");
    await page.deleteEverything();
    await settle(3000);

    expect(await page.getAllInvoices()).toEqual([]);
    expect(page.documentState().isRecord).toBe(false);
    expect(page.invoice().title).toBe("Invoice");
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

    expect(await page.getAllInvoices()).toMatchObject([
      { templateId: "template" }
    ]);
  });

  it("starts a site template that joins the library on its first edit", async () => {
    const page = await loadPage();

    page.edit().setTitle("Half-finished invoice");
    await settle();

    const previousId = page.documentState().documentId;

    await page.startSiteTemplate("contractor");
    await settle(3000);

    expect(page.invoice().shipping.label).toBe("Job site");
    expect(page.documentState().documentId).not.toBe(previousId);
    expect(await page.getAllInvoices()).toHaveLength(1);

    page.edit().setNumber("JOB-1");
    await settle();

    expect(await page.getAllInvoices()).toHaveLength(2);
  });

  it("starts a new invoice in a font and keeps the one under way", async () => {
    const page = await loadPage();

    page.edit().setTitle("Half-finished invoice");
    await settle();

    const previousId = page.documentState().documentId;

    await page.startInFont("lora");

    expect(page.documentState().documentId).not.toBe(previousId);
    expect(page.invoice()).toMatchObject({
      title: invoiceDefault.title,
      theme: { font: "lora" }
    });
    expect(await page.getAllInvoices()).toMatchObject([{ id: previousId }]);
  });

  it("sets an untouched blank in the font rather than replacing it", async () => {
    const page = await loadPage();
    const blankId = page.documentState().documentId;

    await page.startInFont("lora");
    await page.startInFont("lora");
    await settle(5000);

    expect(page.documentState().documentId).toBe(blankId);
    expect(page.invoice().theme.font).toBe("lora");
    expect(await page.getAllInvoices()).toEqual([]);
  });
});

describe("storage that can't be used", () => {
  it("asks for a reload once another tab upgrades the database", async () => {
    const page = await loadPage();

    page.edit().setTitle("Before the upgrade");
    await settle();
    page.db.on.versionchange.fire(
      new IDBVersionChangeEvent("versionchange", {
        newVersion: 999,
        oldVersion: 1
      })
    );

    expect(page.documentState().status).toBe("reloadRequired");

    await page.newInvoice();

    expect(page.invoice().title).toBe("Before the upgrade");
    expect(toastError).toHaveBeenCalledWith(
      "Reload the page to open another invoice",
      expect.anything()
    );
  });

  it("opens a blank that saves nothing when storage won't open", async () => {
    const page = await loadPage({ openFails: true });

    expect(page.documentState().status).toBe("unavailable");

    page.edit().setTitle("Typed");
    await settle(3000);

    expect(page.documentState().saveFailure).toBeNull();
    expect(page.invoice().title).toBe("Typed");
  });
});
