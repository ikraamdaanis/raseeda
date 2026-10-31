import Dexie from "dexie";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { invoiceDefault } from "~/stores/invoice-store";
import type { InvoiceDocument } from "~/types";

// The usage counts, as the session reports them (utils/track.ts). The module
// is reloaded for every page, so the spy lives outside it.
const { track } = vi.hoisted(() => ({ track: vi.fn() }));

vi.mock("~/utils/track", () => ({ track, trackPageView: vi.fn() }));

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

// The session is module state (one open invoice per page), so every test
// loads a fresh copy of it, as a page load would, over a fresh database.
async function loadPage({
  failWrites
}: { failWrites?: { current: Error | null } } = {}) {
  vi.resetModules();

  const database = await import("~/db");

  if (failWrites) {
    // Fails every write to the invoices table while `current` is set, as a
    // full disk or a closing database would.
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
              failWrites.current && name === "invoices"
                ? Promise.reject(failWrites.current)
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
  await session.attachEditor();
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
    track.mockClear();
  });

  afterEach(async () => {
    await closePages();
    vi.useRealTimers();
  });

  it("counts a new invoice once, when it joins the library", async () => {
    const page = await loadPage();

    await settle(5000);

    expect(track).not.toHaveBeenCalled();

    page.edit().setTitle("Quote");
    await settle();
    page.edit().setTitle("Quote for May");
    await settle(5000);

    expect(track).toHaveBeenCalledExactlyOnceWith("invoice_saved");
  });

  it("counts a new invoice named before its first edit", async () => {
    const page = await loadPage();

    await page.renameCurrent("Named first");

    expect(track).toHaveBeenCalledExactlyOnceWith("invoice_saved");
  });

  it("counts a duplicate as a new invoice", async () => {
    const page = await loadPage();

    await page.renameCurrent("Original");
    await page.duplicateCurrent();

    expect(track.mock.calls).toEqual([["invoice_saved"], ["invoice_saved"]]);
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
