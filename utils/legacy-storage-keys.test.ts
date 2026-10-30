import { describe, expect, it } from "vitest";
import { RENAME_LEGACY_STORAGE_KEYS_SCRIPT } from "~/utils/legacy-storage-keys";

// A stand-in for localStorage or sessionStorage, seeded with the given keys.
function createStorage(entries: Record<string, string>) {
  const items = new Map(Object.entries(entries));

  return {
    items,
    get length() {
      return items.size;
    },
    key: (index: number) => [...items.keys()][index] ?? null,
    getItem: (key: string) => items.get(key) ?? null,
    setItem: (key: string, value: string) => items.set(key, value),
    removeItem: (key: string) => items.delete(key)
  };
}

function runScript({
  local,
  session
}: {
  local: ReturnType<typeof createStorage>;
  session: ReturnType<typeof createStorage>;
}) {
  new Function(
    "localStorage",
    "sessionStorage",
    RENAME_LEGACY_STORAGE_KEYS_SCRIPT
  )(local, session);
}

describe("legacy storage keys", () => {
  it("drops the billsend prefix from keys in both storage areas", () => {
    const local = createStorage({
      "billsend-editor-theme": "dark",
      "billsend-unsaved:inv-1": "{}",
      "tsr-scroll-restoration-v1_3": "{}"
    });
    const session = createStorage({ "billsend-open-invoice": "inv-1" });

    runScript({ local, session });

    expect(Object.fromEntries(local.items)).toEqual({
      "editor-theme": "dark",
      "unsaved:inv-1": "{}",
      "tsr-scroll-restoration-v1_3": "{}"
    });
    expect(Object.fromEntries(session.items)).toEqual({
      "open-invoice": "inv-1"
    });
  });

  it("keeps a value already under the new name", () => {
    const local = createStorage({
      "billsend-editor-theme": "dark",
      "editor-theme": "light"
    });
    const session = createStorage({});

    runScript({ local, session });

    expect(Object.fromEntries(local.items)).toEqual({
      "editor-theme": "light"
    });
  });
});
