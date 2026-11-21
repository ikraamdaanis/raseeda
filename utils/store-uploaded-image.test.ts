import { beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "~/db";
import { useDocumentStore } from "~/stores/document-store";
import { storeImageBlob } from "~/utils/store-uploaded-image";

vi.mock("sonner", () => ({ toast: { error: vi.fn() } }));

beforeEach(async () => {
  await db.images.clear();
  useDocumentStore.setState({ documentId: "first" });
});

describe("storeImageBlob", () => {
  it("resolves the stored image's id", async () => {
    const imageId = await storeImageBlob(new Blob(["logo"]), "image/png");

    expect(imageId).toEqual(expect.any(String));
  });

  it("resolves null once another document has opened", async () => {
    const stored = storeImageBlob(new Blob(["logo"]), "image/png");

    useDocumentStore.setState({ documentId: "second" });

    expect(await stored).toBeNull();
  });
});
