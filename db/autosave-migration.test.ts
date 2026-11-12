import Dexie from "dexie";
import { beforeEach, describe, expect, it } from "vitest";
import {
  db,
  getAllInvoices,
  getInvoiceVersions,
  getLastOpenedInvoiceId
} from "~/db";
import { invoiceDefault } from "~/stores/invoice-store";
import type { Invoice } from "~/types";

const SAVED_AT = new Date(2026, 9, 10);

function invoiceWith(overrides: Partial<Invoice>): Invoice {
  return { ...structuredClone(invoiceDefault), ...overrides };
}

// Builds the database as the last version before autosave left it, so opening
// the app's database runs the version 8 upgrade over it.
async function seedVersion7({
  invoices = [],
  draft
}: {
  invoices?: { id: string; name: string; invoiceData: Invoice }[];
  draft?: {
    invoiceData: Invoice;
    documentId: string | null;
    documentName: string | null;
    lastSavedInvoice: Invoice | null;
  };
}) {
  db.close();
  await Dexie.delete("InvoiceDatabase");

  const legacy = new Dexie("InvoiceDatabase");

  legacy.version(7).stores({
    templates: "id, name, createdAt, updatedAt",
    invoices: "id, name, createdAt, updatedAt",
    images: "id",
    drafts: "id"
  });
  await legacy.open();

  for (const invoice of invoices) {
    await legacy.table("invoices").put({
      ...invoice,
      templateId: null,
      schemaVersion: 7,
      createdAt: SAVED_AT,
      updatedAt: SAVED_AT
    });
  }

  if (draft) {
    await legacy.table("drafts").put({
      id: "current-draft",
      ...draft,
      schemaVersion: 7,
      updatedAt: SAVED_AT
    });
  }

  legacy.close();
}

describe("the move to autosave", () => {
  beforeEach(() => {
    db.close();
  });

  it("gives every saved invoice a revision and a name it keeps", async () => {
    await seedVersion7({
      invoices: [
        { id: "a", name: "Acme retainer", invoiceData: invoiceWith({}) }
      ]
    });

    const [invoice] = await getAllInvoices();

    expect(invoice).toMatchObject({
      id: "a",
      name: "Acme retainer",
      nameSource: "user",
      rev: 1
    });
  });

  it("writes a draft that's ahead into its invoice, keeping the saved copy as a version", async () => {
    const saved = invoiceWith({ title: "Saved" });
    const edited = invoiceWith({ title: "Edited after saving" });

    await seedVersion7({
      invoices: [{ id: "a", name: "Acme", invoiceData: saved }],
      draft: {
        invoiceData: edited,
        documentId: "a",
        documentName: "Acme",
        lastSavedInvoice: saved
      }
    });

    const invoices = await getAllInvoices();
    const versions = await getInvoiceVersions("a");

    expect(invoices).toHaveLength(1);
    expect(invoices[0].invoiceData.title).toBe("Edited after saving");
    expect(invoices[0].rev).toBe(2);
    expect(versions).toHaveLength(1);
    expect(versions[0]).toMatchObject({
      reason: "beforeAutosave",
      name: "Acme"
    });
    expect(versions[0].invoiceData.title).toBe("Saved");
    expect(await getLastOpenedInvoiceId()).toBe("a");
  });

  it("leaves an invoice another tab saved since and copies the draft beside it", async () => {
    const baseline = invoiceWith({ title: "Baseline" });
    const savedElsewhere = invoiceWith({ title: "Saved in another tab" });
    const draft = invoiceWith({ title: "This tab's edit" });

    await seedVersion7({
      invoices: [{ id: "a", name: "Acme", invoiceData: savedElsewhere }],
      draft: {
        invoiceData: draft,
        documentId: "a",
        documentName: "Acme",
        lastSavedInvoice: baseline
      }
    });

    const invoices = await getAllInvoices();
    const original = invoices.find(invoice => invoice.id === "a");
    const copy = invoices.find(invoice => invoice.id !== "a");

    expect(invoices).toHaveLength(2);
    expect(original?.invoiceData.title).toBe("Saved in another tab");
    expect(original?.rev).toBe(1);
    expect(copy).toMatchObject({
      name: "Acme (unsaved edits)",
      nameSource: "user",
      rev: 1
    });
    expect(copy?.invoiceData.title).toBe("This tab's edit");
    expect(await getLastOpenedInvoiceId()).toBe(copy?.id);
  });

  it("changes nothing for a draft that matches its invoice", async () => {
    const saved = invoiceWith({ title: "Saved" });

    await seedVersion7({
      invoices: [{ id: "a", name: "Acme", invoiceData: saved }],
      draft: {
        invoiceData: saved,
        documentId: "a",
        documentName: "Acme",
        lastSavedInvoice: saved
      }
    });

    const invoices = await getAllInvoices();

    expect(invoices).toHaveLength(1);
    expect(invoices[0].rev).toBe(1);
    expect(await getInvoiceVersions("a")).toEqual([]);
    expect(await getLastOpenedInvoiceId()).toBe("a");
  });

  it("turns an unsaved draft with content into a new invoice", async () => {
    const blank = invoiceWith({});
    const draft = invoiceWith({
      number: "INV-0042",
      client: { ...blank.client, content: "Acme Ltd\n1 High St" }
    });

    await seedVersion7({
      draft: {
        invoiceData: draft,
        documentId: null,
        documentName: null,
        lastSavedInvoice: blank
      }
    });

    const invoices = await getAllInvoices();

    expect(invoices).toHaveLength(1);
    expect(invoices[0]).toMatchObject({
      name: "INV-0042 · Acme Ltd",
      nameSource: "auto",
      rev: 1
    });
    expect(await getLastOpenedInvoiceId()).toBe(invoices[0].id);
  });

  it("keeps a draft whose invoice was deleted as a new invoice", async () => {
    const baseline = invoiceWith({ title: "Baseline" });

    await seedVersion7({
      draft: {
        invoiceData: invoiceWith({ title: "Still wanted" }),
        documentId: "gone",
        documentName: "Deleted elsewhere",
        lastSavedInvoice: baseline
      }
    });

    const invoices = await getAllInvoices();

    expect(invoices).toHaveLength(1);
    expect(invoices[0]).toMatchObject({
      name: "Deleted elsewhere",
      nameSource: "user"
    });
    expect(invoices[0].invoiceData.title).toBe("Still wanted");
  });

  it("adds nothing for an untouched blank draft", async () => {
    const blank = invoiceWith({ invoiceDate: "2026-10-01" });

    await seedVersion7({
      draft: {
        invoiceData: blank,
        documentId: null,
        documentName: null,
        lastSavedInvoice: blank
      }
    });

    expect(await getAllInvoices()).toEqual([]);
    expect(await getLastOpenedInvoiceId()).toBeNull();
  });

  it("drops the drafts table once the draft is in the library", async () => {
    await seedVersion7({
      draft: {
        invoiceData: invoiceWith({ title: "Kept" }),
        documentId: null,
        documentName: null,
        lastSavedInvoice: null
      }
    });

    const invoices = await getAllInvoices();

    expect(invoices.map(invoice => invoice.invoiceData.title)).toEqual([
      "Kept"
    ]);
    expect(db.tables.map(table => table.name)).not.toContain("drafts");
  });
});
