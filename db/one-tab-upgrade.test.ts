import Dexie from "dexie";
import { describe, expect, it } from "vitest";
import { db, getAllInvoices } from "~/db";

// Opens the database as the release before the one-tab editor left it
// (version 10), as a tab still running that release would hold it.
async function openOldRelease() {
  const legacy = new Dexie("InvoiceDatabase");

  legacy.version(10).stores({
    templates: "id, name, createdAt, updatedAt",
    invoices: "id, name, createdAt, updatedAt",
    images: "id",
    drafts: "id",
    versions: "id, invoiceId, imageId",
    meta: "key"
  });
  await legacy.open();
  await legacy.table("invoices").put({
    id: "a",
    name: "Kept invoice",
    invoiceData: { title: "Kept" },
    templateId: null,
    rev: 1,
    nameSource: "user",
    schemaVersion: 4,
    createdAt: new Date(),
    updatedAt: new Date()
  });

  return legacy;
}

describe("the upgrade to the one-tab editor", () => {
  it("tells a tab on the old release to stop writing", async () => {
    db.close();
    await Dexie.delete("InvoiceDatabase");

    const legacy = await openOldRelease();
    let versionChanges = 0;

    legacy.on("versionchange", () => {
      versionChanges++;
    });

    const invoices = await getAllInvoices();

    expect(versionChanges).toBe(1);
    expect(legacy.isOpen()).toBe(false);
    expect(invoices.map(invoice => invoice.name)).toEqual(["Kept invoice"]);
    expect(db.verno).toBeGreaterThanOrEqual(11);
    expect(db.tables.map(table => table.name)).not.toContain("drafts");
  });
});
