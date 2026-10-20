import Dexie from "dexie";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DATABASE_NAME } from "~/consts/database";
import { canUseStorage } from "~/utils/can-use-storage";

async function listDatabaseNames() {
  const databases = await indexedDB.databases();

  return databases.map(database => database.name);
}

describe("canUseStorage", () => {
  afterEach(async () => {
    vi.restoreAllMocks();
    await Dexie.delete(DATABASE_NAME);
  });

  it("reports storage as usable without creating the database", async () => {
    expect(await canUseStorage()).toBe(true);
    expect(await listDatabaseNames()).not.toContain(DATABASE_NAME);
  });

  it("opens an existing database without changing it", async () => {
    const existing = new Dexie(DATABASE_NAME);

    existing.version(3).stores({ invoices: "id" });
    await existing.open();
    existing.close();

    expect(await canUseStorage()).toBe(true);

    const reopened = await new Dexie(DATABASE_NAME).open();

    expect(reopened.verno).toBe(3);
    reopened.close();
  });

  it("reports storage as blocked when the browser refuses to open it", async () => {
    vi.spyOn(indexedDB, "open").mockImplementation(() => {
      throw new DOMException("The operation is insecure.", "SecurityError");
    });

    expect(await canUseStorage()).toBe(false);
  });
});
