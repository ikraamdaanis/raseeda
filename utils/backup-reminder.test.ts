import { subDays } from "date-fns";
import { describe, expect, it } from "vitest";
import { getBackupReminder } from "~/utils/backup-reminder";

const now = new Date("2026-11-22T12:00:00Z");

const nothingYet = {
  now,
  lastBackup: null,
  lastReminder: null,
  documentCount: 1,
  storageMayBeCleared: false
};

describe("getBackupReminder", () => {
  it("asks on Safari once an invoice exists", () => {
    expect(
      getBackupReminder({ ...nothingYet, storageMayBeCleared: true })
    ).toBe("safari");
  });

  it("waits elsewhere until the library holds three documents", () => {
    expect(getBackupReminder({ ...nothingYet, documentCount: 2 })).toBeNull();
    expect(getBackupReminder({ ...nothingYet, documentCount: 3 })).toBe(
      "library"
    );
  });

  it("says nothing within a month of a backup", () => {
    const backedUp = {
      ...nothingYet,
      documentCount: 10,
      storageMayBeCleared: true
    };

    expect(
      getBackupReminder({ ...backedUp, lastBackup: subDays(now, 29) })
    ).toBeNull();
    expect(
      getBackupReminder({ ...backedUp, lastBackup: subDays(now, 30) })
    ).toBe("safari");
  });

  it("says nothing within a month of the last suggestion", () => {
    const reminded = { ...nothingYet, documentCount: 10 };

    expect(
      getBackupReminder({ ...reminded, lastReminder: subDays(now, 29) })
    ).toBeNull();
    expect(
      getBackupReminder({ ...reminded, lastReminder: subDays(now, 31) })
    ).toBe("library");
  });

  it("says nothing with an empty library", () => {
    expect(
      getBackupReminder({
        ...nothingYet,
        documentCount: 0,
        storageMayBeCleared: true
      })
    ).toBeNull();
  });
});
