// The editor lock: one tab has the editor at a time. It holds an app-wide Web
// Lock for as long as the editor is open; any other tab waits in line for it
// and can ask for it with Use here, over a BroadcastChannel. The tab holding
// it then lets go (writing what's pending first), and the asking tab, first
// in line, gets it. Without the Web Locks API the editor just opens.

const LOCK_NAME = "editor";

const CHANNEL_NAME = "editor";

const USE_HERE_MESSAGE = "use-here";

type EditorLockHandlers = {
  // This tab got the editor after waiting for it.
  onGranted: () => void;
  // Another tab asked for the editor: get ready to let go. The lock is
  // released once it resolves.
  onLetGo: () => Promise<void>;
};

let handlers: EditorLockHandlers | null = null;
let releaseLock: (() => void) | null = null;
let stopWaiting: AbortController | null = null;
let channel: BroadcastChannel | null = null;

function locksSupported() {
  return typeof navigator !== "undefined" && "locks" in navigator;
}

function openChannel() {
  if (channel || typeof BroadcastChannel === "undefined") return;

  channel = new BroadcastChannel(CHANNEL_NAME);
  channel.onmessage = (event: MessageEvent) => {
    if (event.data === USE_HERE_MESSAGE) void letGo();
  };
}

// Holds the lock until the returned promise's release is called.
function hold(): Promise<void> {
  return new Promise(release => {
    releaseLock = release;
  });
}

async function letGo() {
  const release = releaseLock;
  const current = handlers;

  if (!release || !current) return;

  releaseLock = null;

  try {
    await current.onLetGo();
  } finally {
    release();

    if (handlers === current) waitInLine();
  }
}

function waitInLine() {
  if (stopWaiting || releaseLock) return;

  const abort = new AbortController();

  stopWaiting = abort;
  navigator.locks
    .request(LOCK_NAME, { signal: abort.signal }, () => {
      stopWaiting = null;

      if (abort.signal.aborted || !handlers) return;

      const granted = hold();

      handlers.onGranted();

      return granted;
    })
    .catch((error: unknown) => {
      if (stopWaiting === abort) stopWaiting = null;
      if (error instanceof DOMException && error.name === "AbortError") return;

      console.error("[EditorLock] Web Lock failed", error);
    });
}

// Takes the editor if no other tab has it, and resolves whether it did. When
// another tab has it, this one waits in line, and onGranted runs once it gets
// it.
export function claimEditor(callbacks: EditorLockHandlers): Promise<boolean> {
  handlers = callbacks;

  if (!locksSupported()) return Promise.resolve(true);
  if (releaseLock) return Promise.resolve(true);

  openChannel();

  if (stopWaiting) return Promise.resolve(false);

  return new Promise(resolve => {
    navigator.locks
      .request(LOCK_NAME, { ifAvailable: true }, lock => {
        if (!lock || handlers !== callbacks) {
          resolve(false);

          if (handlers === callbacks) waitInLine();

          return;
        }

        const granted = hold();

        resolve(true);

        return granted;
      })
      .catch((error: unknown) => {
        console.error("[EditorLock] Web Lock failed", error);
        resolve(true);
      });
  });
}

// Whether this tab has the editor.
export function holdsEditor(): boolean {
  return !locksSupported() || releaseLock !== null;
}

// Use here: asks the tab that has the editor to let go of it.
export function askForEditor() {
  channel?.postMessage(USE_HERE_MESSAGE);
}

// The editor closed: lets go of the lock, or stops waiting for it.
export function releaseEditor() {
  handlers = null;
  stopWaiting?.abort();
  stopWaiting = null;
  releaseLock?.();
  releaseLock = null;
  channel?.close();
  channel = null;
}
