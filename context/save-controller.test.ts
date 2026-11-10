import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createSaveController } from "~/context/save-controller";

// A write the test settles by hand, to hold one in flight.
function deferred() {
  let resolve = () => {};
  let reject: (error: unknown) => void = () => {};
  const promise = new Promise<void>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });

  return { promise, resolve, reject };
}

describe("the save controller", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("writes the newest content 500ms after the last edit", async () => {
    const write = vi.fn(async (_content: string) => {});
    const controller = createSaveController({ write });

    controller.schedule("a");
    await vi.advanceTimersByTimeAsync(300);
    controller.schedule("ab");
    await vi.advanceTimersByTimeAsync(499);

    expect(write).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(1);

    expect(write).toHaveBeenCalledExactlyOnceWith("ab");
    expect(controller.isPending()).toBe(false);
  });

  it("writes within 2s while typing never pauses", async () => {
    const write = vi.fn(async (_content: string) => {});
    const controller = createSaveController({ write });

    for (let i = 1; i <= 19; i++) {
      controller.schedule(`edit ${i}`);
      await vi.advanceTimersByTimeAsync(100);
    }

    controller.schedule("edit 20");
    await vi.advanceTimersByTimeAsync(100);

    expect(write).toHaveBeenCalledTimes(1);
    expect(write).toHaveBeenCalledWith("edit 20");
  });

  it("runs one write at a time and merges edits made meanwhile", async () => {
    const first = deferred();
    const write = vi
      .fn<(content: string) => Promise<void>>()
      .mockImplementationOnce(() => first.promise)
      .mockResolvedValue(undefined);
    const controller = createSaveController({ write });

    controller.schedule("one");
    await vi.advanceTimersByTimeAsync(500);

    expect(write).toHaveBeenCalledTimes(1);

    controller.schedule("two");
    controller.schedule("three");
    await vi.advanceTimersByTimeAsync(2000);

    expect(write).toHaveBeenCalledTimes(1);

    first.resolve();
    await vi.advanceTimersByTimeAsync(0);

    expect(write).toHaveBeenCalledTimes(2);
    expect(write).toHaveBeenLastCalledWith("three");
  });

  it("flushes at once, waiting for a write already running", async () => {
    const first = deferred();
    const write = vi
      .fn<(content: string) => Promise<void>>()
      .mockImplementationOnce(() => first.promise)
      .mockResolvedValue(undefined);
    const controller = createSaveController({ write });

    controller.schedule("one");
    await vi.advanceTimersByTimeAsync(500);
    controller.schedule("two");

    const flushed = controller.flush();

    first.resolve();

    await expect(flushed).resolves.toBe(true);
    expect(write.mock.calls).toEqual([["one"], ["two"]]);
    expect(controller.isPending()).toBe(false);
  });

  it("keeps failed content and retries it, reporting the failure", async () => {
    const failure = new DOMException("Full", "QuotaExceededError");
    const write = vi
      .fn<(content: string) => Promise<void>>()
      .mockRejectedValueOnce(failure)
      .mockResolvedValue(undefined);
    const states: { pending: boolean; failure: unknown }[] = [];
    const controller = createSaveController({
      write,
      onChange: state => states.push(state)
    });

    controller.schedule("kept");
    await vi.advanceTimersByTimeAsync(500);

    expect(controller.hasFailed()).toBe(true);
    expect(controller.getUnsaved()).toBe("kept");
    expect(states.at(-1)).toEqual({ pending: true, failure });

    await vi.advanceTimersByTimeAsync(1000);

    expect(write).toHaveBeenCalledTimes(2);
    expect(write).toHaveBeenLastCalledWith("kept");
    expect(controller.hasFailed()).toBe(false);
    expect(states.at(-1)).toEqual({ pending: false, failure: null });
  });

  it("retries with the newest content when edits arrive while failing", async () => {
    const write = vi
      .fn<(content: string) => Promise<void>>()
      .mockRejectedValueOnce(new Error("Blocked"))
      .mockResolvedValue(undefined);
    const controller = createSaveController({ write });

    controller.schedule("first");
    await vi.advanceTimersByTimeAsync(500);
    controller.schedule("second");
    // While failing, edits wait for the retry rather than writing at 500ms.
    await vi.advanceTimersByTimeAsync(500);

    expect(write).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(500);

    expect(write).toHaveBeenLastCalledWith("second");
  });

  it("waits longer before each retry", async () => {
    const write = vi
      .fn<(content: string) => Promise<void>>()
      .mockRejectedValue(new Error("Blocked"));
    const controller = createSaveController({
      write,
      retryDelaysMs: [1000, 2000, 5000]
    });

    controller.schedule("x");
    await vi.advanceTimersByTimeAsync(500);
    await vi.advanceTimersByTimeAsync(1000);

    expect(write).toHaveBeenCalledTimes(2);

    await vi.advanceTimersByTimeAsync(1999);

    expect(write).toHaveBeenCalledTimes(2);

    await vi.advanceTimersByTimeAsync(1);

    expect(write).toHaveBeenCalledTimes(3);

    await vi.advanceTimersByTimeAsync(5000);
    await vi.advanceTimersByTimeAsync(5000);

    expect(write).toHaveBeenCalledTimes(5);
  });

  it("resolves a flush false when the write fails", async () => {
    const write = vi.fn(() => Promise.reject(new Error("Blocked")));
    const controller = createSaveController({ write });

    controller.schedule("x");

    await expect(controller.flush()).resolves.toBe(false);
    expect(controller.getUnsaved()).toBe("x");
  });

  it("tries again straight away on retry", async () => {
    const write = vi
      .fn<(content: string) => Promise<void>>()
      .mockRejectedValueOnce(new Error("Blocked"))
      .mockResolvedValue(undefined);
    const controller = createSaveController({ write });

    controller.schedule("x");
    await vi.advanceTimersByTimeAsync(500);

    await expect(controller.retry()).resolves.toBe(true);
    expect(write).toHaveBeenCalledTimes(2);
  });

  it("hands back queued content without writing it", async () => {
    const write = vi.fn(async (_content: string) => {});
    const controller = createSaveController({ write });

    controller.schedule("queued");

    expect(controller.takeUnsaved()).toBe("queued");

    await vi.advanceTimersByTimeAsync(5000);

    expect(write).not.toHaveBeenCalled();
    expect(controller.isPending()).toBe(false);

    controller.schedule("next");
    await vi.advanceTimersByTimeAsync(500);

    expect(write).toHaveBeenCalledExactlyOnceWith("next");
  });

  it("drops the failure with the content it hands back", async () => {
    const write = vi
      .fn<(content: string) => Promise<void>>()
      .mockRejectedValueOnce(new Error("Full"))
      .mockResolvedValue(undefined);
    const onChange = vi.fn();
    const controller = createSaveController({ write, onChange });

    controller.schedule("failed");
    await vi.advanceTimersByTimeAsync(500);

    expect(controller.hasFailed()).toBe(true);
    expect(controller.takeUnsaved()).toBe("failed");
    expect(controller.hasFailed()).toBe(false);
    expect(onChange).toHaveBeenLastCalledWith({
      pending: false,
      failure: null
    });

    controller.schedule("next");
    await vi.advanceTimersByTimeAsync(500);

    expect(write).toHaveBeenLastCalledWith("next");
    expect(write).toHaveBeenCalledTimes(2);
  });

  it("drops unwritten content when stopped", async () => {
    const write = vi.fn(async (_content: string) => {});
    const controller = createSaveController({ write });

    controller.schedule("x");
    controller.stop();
    await vi.advanceTimersByTimeAsync(5000);

    expect(write).not.toHaveBeenCalled();
    expect(controller.isPending()).toBe(false);
  });

  it("doesn't report dropped content as saved when stopped", () => {
    const onChange = vi.fn();
    const controller = createSaveController({
      write: async (_content: string) => {},
      onChange
    });

    controller.schedule("x");
    onChange.mockClear();
    controller.stop();

    expect(onChange).not.toHaveBeenCalled();
  });

  it("reports nothing when a write outlives the stop", async () => {
    const onChange = vi.fn();
    let finishWrite = () => {};
    const controller = createSaveController({
      write: (_content: string) =>
        new Promise<void>(resolve => {
          finishWrite = resolve;
        }),
      onChange
    });

    controller.schedule("x");
    await vi.advanceTimersByTimeAsync(500);
    onChange.mockClear();
    controller.stop();
    finishWrite();
    await vi.advanceTimersByTimeAsync(0);

    expect(onChange).not.toHaveBeenCalled();
    expect(controller.isPending()).toBe(false);
  });
});
