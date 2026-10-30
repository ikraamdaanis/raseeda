import { DATABASE_NAME } from "~/consts/database";

/**
 * Whether this browser lets the site keep invoices, checked without loading
 * the database module or leaving anything behind. It opens the invoice
 * database at whatever version it has: a returning visitor's opens and closes
 * untouched, and a new visitor's is created only to have its creation called
 * off, so no database is left on a device that has only seen the homepage.
 * Reaching that point proves storage works; a browser that refuses site data
 * fails the open before it.
 */
export function canUseStorage(): Promise<boolean> {
  return new Promise(resolve => {
    let request: IDBOpenDBRequest;

    try {
      request = indexedDB.open(DATABASE_NAME);
    } catch {
      resolve(false);

      return;
    }

    let isNew = false;

    request.onupgradeneeded = () => {
      isNew = true;
      request.transaction?.abort();
    };

    request.onsuccess = () => {
      request.result.close();
      resolve(true);
    };

    request.onerror = event => {
      // The open we called off fails too; that one is a success.
      event.preventDefault();
      resolve(isNew);
    };

    request.onblocked = () => resolve(true);
  });
}
