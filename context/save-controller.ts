// Writes one invoice's content as it's edited, the way tldraw's local
// persistence does:
// - a write waits for a 500ms pause in editing, but never more than 2s, so
//   continuous typing still saves;
// - one write runs at a time, and edits made while it runs are merged into
//   the next one;
// - a failed write keeps the content and tries again, waiting longer each
//   time, until it lands.
// A controller belongs to one invoice for its whole life, so a timer that
// fires after the editor has moved on still writes to the invoice the edits
// were made in, never to whichever one is open by then.

const SAVE_DEBOUNCE_MS = 500;

const SAVE_MAX_WAIT_MS = 2000;

// How long to wait before each retry of a failed write; the last repeats.
const SAVE_RETRY_DELAYS_MS = [1000, 2000, 5000, 10_000, 30_000];

export function createSaveController<TContent>({
  write,
  onChange,
  debounceMs = SAVE_DEBOUNCE_MS,
  maxWaitMs = SAVE_MAX_WAIT_MS,
  retryDelaysMs = SAVE_RETRY_DELAYS_MS
}: {
  // Persists the content, throwing when it couldn't.
  write: (content: TContent) => Promise<void>;
  // Called whenever whether there's unsaved content, or the failure, changes.
  onChange?: (state: { pending: boolean; failure: unknown }) => void;
  debounceMs?: number;
  maxWaitMs?: number;
  retryDelaysMs?: number[];
}) {
  // The newest content not yet written, or null when everything is saved.
  let unsaved: { content: TContent } | null = null;
  let running: Promise<boolean> | null = null;
  // A timer fired while a write was running: write again once it's done.
  let writeWhenDone = false;
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;
  let maxWaitTimer: ReturnType<typeof setTimeout> | null = null;
  let retryTimer: ReturnType<typeof setTimeout> | null = null;
  let failure: unknown = null;
  let failedAttempts = 0;
  let stopped = false;
  let lastReported: { pending: boolean; failure: unknown } | null = null;

  function isPending() {
    return unsaved !== null || running !== null;
  }

  function report() {
    const state = { pending: isPending(), failure };

    if (
      lastReported &&
      lastReported.pending === state.pending &&
      lastReported.failure === state.failure
    ) {
      return;
    }

    lastReported = state;
    onChange?.(state);
  }

  function clearTimers() {
    if (debounceTimer) clearTimeout(debounceTimer);
    if (maxWaitTimer) clearTimeout(maxWaitTimer);
    if (retryTimer) clearTimeout(retryTimer);

    debounceTimer = null;
    maxWaitTimer = null;
    retryTimer = null;
  }

  function onTimer() {
    clearTimers();

    if (running) {
      writeWhenDone = true;

      return;
    }

    void writeNext();
  }

  // Writes the newest unsaved content once. Resolves whether it landed.
  function writeNext(): Promise<boolean> {
    if (running) return running;

    const next = unsaved;

    if (!next || stopped) return Promise.resolve(failure === null);

    unsaved = null;
    clearTimers();
    running = (async () => {
      try {
        await write(next.content);
        failure = null;
        failedAttempts = 0;

        return true;
      } catch (error) {
        // Edits made while it ran are newer and take its place.
        unsaved ??= next;
        failure = error;
        failedAttempts++;

        return false;
      }
    })();
    report();

    return running.then(saved => {
      running = null;

      if (stopped) return saved;

      if (!saved) {
        scheduleRetry();
      } else if (writeWhenDone) {
        writeWhenDone = false;
        void writeNext();
      }

      report();

      return saved;
    });
  }

  function scheduleRetry() {
    clearTimers();
    writeWhenDone = false;

    const delay =
      retryDelaysMs[Math.min(failedAttempts - 1, retryDelaysMs.length - 1)];

    retryTimer = setTimeout(() => {
      retryTimer = null;
      void writeNext();
    }, delay);
  }

  return {
    // Takes the newest content, to be written after a pause.
    schedule(content: TContent) {
      if (stopped) return;

      unsaved = { content };

      // While failing, the retry timer decides when to try again.
      if (failure === null) {
        if (debounceTimer) clearTimeout(debounceTimer);

        debounceTimer = setTimeout(onTimer, debounceMs);
        maxWaitTimer ??= setTimeout(onTimer, maxWaitMs);
      }

      report();
    },
    // Writes everything now and resolves once it has all landed (true) or a
    // write failed (false). Edits made meanwhile are written too.
    async flush(): Promise<boolean> {
      clearTimers();
      writeWhenDone = false;

      while (!stopped) {
        // A failure ends the flush rather than retrying in a loop; the retry
        // timer carries on from there.
        const saved = running
          ? await running
          : unsaved === null
            ? failure === null
            : await writeNext();

        if (!saved) return false;
        if (!running && unsaved === null) return true;
      }

      return failure === null && unsaved === null;
    },
    // Tries a failed write again straight away.
    retry(): Promise<boolean> {
      if (retryTimer) clearTimeout(retryTimer);

      retryTimer = null;

      return writeNext();
    },
    // Drops what hasn't been written and stops for good, leaving any write
    // already running to finish. It reports nothing from here on: what it
    // dropped wasn't written, so an empty queue no longer means saved.
    stop() {
      stopped = true;
      unsaved = null;
      writeWhenDone = false;
      clearTimers();
    },
    isPending,
    hasFailed() {
      return failure !== null;
    }
  };
}
