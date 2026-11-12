import { afterEach, describe, expect, it, vi } from "vitest";

// Each tab is its own copy of the module, as each page load is.
const openTabs: { releaseEditor: () => void }[] = [];

async function openTab() {
  vi.resetModules();

  const lock = await import("~/context/editor-lock");
  const onGranted = vi.fn();
  const onLetGo = vi.fn(() => Promise.resolve());

  openTabs.push(lock);

  return {
    ...lock,
    onGranted,
    onLetGo,
    claim: () => lock.claimEditor({ onGranted, onLetGo })
  };
}

describe("the editor lock", () => {
  afterEach(() => {
    for (const tab of openTabs.splice(0)) tab.releaseEditor();

    vi.unstubAllGlobals();
  });

  it("gives the editor to one tab, and hands it over with Use here", async () => {
    const first = await openTab();
    const second = await openTab();

    await expect(first.claim()).resolves.toBe(true);
    await expect(second.claim()).resolves.toBe(false);

    expect(first.holdsEditor()).toBe(true);
    expect(second.holdsEditor()).toBe(false);

    second.askForEditor();

    await vi.waitFor(() => expect(second.onGranted).toHaveBeenCalledOnce());

    expect(first.onLetGo).toHaveBeenCalledOnce();
    expect(first.holdsEditor()).toBe(false);
    expect(second.holdsEditor()).toBe(true);
  });

  it("hands over only once the tab letting go is ready", async () => {
    const first = await openTab();
    const second = await openTab();
    let ready = () => {};

    first.onLetGo.mockImplementation(
      () =>
        new Promise<void>(resolve => {
          ready = resolve;
        })
    );
    await first.claim();
    await second.claim();
    second.askForEditor();

    await vi.waitFor(() => expect(first.onLetGo).toHaveBeenCalledOnce());
    await new Promise(resolve => setTimeout(resolve, 20));

    expect(second.onGranted).not.toHaveBeenCalled();

    ready();

    await vi.waitFor(() => expect(second.onGranted).toHaveBeenCalledOnce());
  });

  it("gives the editor back to a tab that let it go once the other closes", async () => {
    const first = await openTab();
    const second = await openTab();

    await first.claim();
    await second.claim();
    second.askForEditor();
    await vi.waitFor(() => expect(second.onGranted).toHaveBeenCalledOnce());

    second.releaseEditor();

    await vi.waitFor(() => expect(first.onGranted).toHaveBeenCalledOnce());

    expect(first.holdsEditor()).toBe(true);
  });

  it("stops waiting once the editor closes", async () => {
    const first = await openTab();
    const second = await openTab();

    await first.claim();
    await second.claim();
    second.releaseEditor();
    first.releaseEditor();

    const third = await openTab();

    await expect(third.claim()).resolves.toBe(true);
    await new Promise(resolve => setTimeout(resolve, 20));

    expect(second.onGranted).not.toHaveBeenCalled();
  });

  it("opens the editor unblocked without the Web Locks API", async () => {
    vi.stubGlobal("navigator", {});

    const first = await openTab();
    const second = await openTab();

    await expect(first.claim()).resolves.toBe(true);
    await expect(second.claim()).resolves.toBe(true);

    expect(second.holdsEditor()).toBe(true);
  });
});
