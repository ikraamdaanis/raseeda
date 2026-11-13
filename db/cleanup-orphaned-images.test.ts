import { beforeEach, describe, expect, it } from "vitest";
import {
  addInvoiceVersion,
  cleanupOrphanedImages,
  db,
  getAllImages,
  saveInvoice,
  saveTemplate
} from "~/db";
import { createBlankInvoice } from "~/stores/invoice-store";

async function storeBlob(imageId: string) {
  await db.images.put({
    id: imageId,
    data: new Uint8Array([1, 2, 3]).buffer,
    type: "image/png",
    createdAt: new Date()
  });
}

async function saveInvoiceWithImage(id: string, imageId: string) {
  const now = new Date();
  const invoiceData = createBlankInvoice();

  invoiceData.image = imageId;

  await saveInvoice({
    id,
    name: id,
    nameSource: "user",
    invoiceData,
    templateId: null,
    rev: 1,
    createdAt: now,
    updatedAt: now
  });
}

async function storedImageIds() {
  const images = await getAllImages();

  return images.map(image => image.id).sort();
}

describe("cleanupOrphanedImages", () => {
  beforeEach(async () => {
    await getAllImages();
    await Promise.all([
      db.images.clear(),
      db.invoices.clear(),
      db.templates.clear(),
      db.versions.clear()
    ]);
  });

  it("keeps a blob two saved invoices share and collects an unreferenced one", async () => {
    await storeBlob("shared-logo");
    await storeBlob("orphan-logo");
    await saveInvoiceWithImage("inv-a", "shared-logo");
    await saveInvoiceWithImage("inv-b", "shared-logo");

    await cleanupOrphanedImages();

    expect(await storedImageIds()).toEqual(["shared-logo"]);
  });

  it("keeps a blob an invoice's version history still names", async () => {
    const invoiceData = createBlankInvoice();

    invoiceData.image = "versioned-logo";
    await storeBlob("versioned-logo");
    await addInvoiceVersion({
      invoiceId: "inv-a",
      name: "Acme",
      invoiceData,
      reason: "opened"
    });

    await cleanupOrphanedImages();

    expect(await storedImageIds()).toEqual(["versioned-logo"]);
  });

  it("collects a blob nothing references, however new", async () => {
    await storeBlob("gone-logo");

    await cleanupOrphanedImages();

    expect(await storedImageIds()).toEqual([]);
  });

  it("keeps a signature an invoice, a template or a version names", async () => {
    const now = new Date();
    const invoiceData = createBlankInvoice();
    const templateData = createBlankInvoice();
    const versionData = createBlankInvoice();

    invoiceData.signature.image = "invoice-signature";
    templateData.signature.image = "template-signature";
    versionData.signature.image = "versioned-signature";
    await storeBlob("invoice-signature");
    await storeBlob("template-signature");
    await storeBlob("versioned-signature");
    await storeBlob("orphan-signature");
    await saveInvoice({
      id: "inv-a",
      name: "inv-a",
      nameSource: "user",
      invoiceData,
      templateId: null,
      rev: 1,
      createdAt: now,
      updatedAt: now
    });
    await saveTemplate({
      id: "tpl-a",
      name: "tpl-a",
      description: null,
      isDefault: false,
      templateData,
      screenshotUrl: null,
      createdAt: now,
      updatedAt: now
    });
    await addInvoiceVersion({
      invoiceId: "inv-b",
      name: "Acme",
      invoiceData: versionData,
      reason: "opened"
    });

    await cleanupOrphanedImages();

    expect(await storedImageIds()).toEqual([
      "invoice-signature",
      "template-signature",
      "versioned-signature"
    ]);
  });
});
