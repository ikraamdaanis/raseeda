import { differenceInDays, isValid, parseISO } from "date-fns";

// When a backup was last downloaded, and when the editor last suggested one
// (shown and dismissed, or acted on). Both live in localStorage, which a
// browser clears along with the invoices, so neither outlives what it's about.
const LAST_BACKUP_KEY = "last-backup";
export const BACKUP_REMINDER_KEY = "backup-reminder";

// How long a backup counts as recent, and how long a suggestion stays quiet
// once it's been seen.
const BACKUP_REMINDER_DAYS = 30;

// The library size at which losing it starts to matter enough to ask.
const BACKUP_REMINDER_DOCUMENTS = 3;

export function readStoredDate(key: string): Date | null {
  try {
    const value =
      typeof window === "undefined" ? null : window.localStorage.getItem(key);
    const date = value ? parseISO(value) : null;

    return date && isValid(date) ? date : null;
  } catch {
    return null;
  }
}

export function writeStoredDate(key: string, date = new Date()) {
  try {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(key, date.toISOString());
    }
  } catch {
    // Storage full or blocked: the next reminder just comes sooner.
  }
}

export function readLastBackup(): Date | null {
  return readStoredDate(LAST_BACKUP_KEY);
}

// A backup file was just handed to the browser to save.
export function recordBackup() {
  writeStoredDate(LAST_BACKUP_KEY);
}

// Which backup suggestion to show, if any. Safari clears a site's storage
// after a week unused, so there it's asked for as soon as an invoice exists;
// elsewhere storage is rarely cleared, so only once the library holds a few
// documents. Either way, never within a month of a backup or of the last
// suggestion.
export function getBackupReminder({
  now,
  lastBackup,
  lastReminder,
  documentCount,
  storageMayBeCleared
}: {
  now: Date;
  lastBackup: Date | null;
  lastReminder: Date | null;
  documentCount: number;
  storageMayBeCleared: boolean;
}): "safari" | "library" | null {
  if (lastBackup && differenceInDays(now, lastBackup) < BACKUP_REMINDER_DAYS) {
    return null;
  }

  if (
    lastReminder &&
    differenceInDays(now, lastReminder) < BACKUP_REMINDER_DAYS
  ) {
    return null;
  }

  if (storageMayBeCleared && documentCount > 0) return "safari";
  if (documentCount >= BACKUP_REMINDER_DOCUMENTS) return "library";

  return null;
}
