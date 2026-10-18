import Dexie from "dexie";
import { beforeEach, describe, expect, it } from "vitest";
import { APP_NAME } from "~/consts/app";
import { CURRENT_EXPORT_VERSION } from "~/consts/export";
import {
  getAllImages,
  getAllInvoices,
  getImageBlob,
  saveImage,
  saveInvoice
} from "~/db";
import { invoiceDefault } from "~/stores/invoice-store";
import type { ExportFile } from "~/types";
import { buildExportData } from "~/utils/export-data";
import {
  analyzeImport,
  executeImport,
  parseExportFile
} from "~/utils/import-data";

// Clears every table through an independent connection so each test starts from
// an empty database, matching a fresh device.
async function resetDb() {
  const connection = new Dexie("InvoiceDatabase");
  connection.version(6).stores({
    templates: "id, name, createdAt, updatedAt",
    invoices: "id, name, createdAt, updatedAt",
    images: "id"
  });
  await connection.open();
  await Promise.all([
    connection.table("templates").clear(),
    connection.table("invoices").clear(),
    connection.table("images").clear()
  ]);
  connection.close();
}

function toFile(value: unknown): File {
  return new File([JSON.stringify(value)], "export.json", {
    type: "application/json"
  });
}

describe("data backup/restore", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("round-trips saved invoices through export and import", async () => {
    const now = new Date();
    await saveInvoice({
      id: "inv-1",
      name: "My invoice",
      nameSource: "user",
      rev: 1,
      invoiceData: { ...structuredClone(invoiceDefault), number: "INV-0007" },
      templateId: null,
      createdAt: now,
      updatedAt: now
    });

    const exported = await buildExportData();

    await resetDb();

    const result = await executeImport(exported);
    const invoices = await getAllInvoices();

    expect(result.invoicesImported).toBe(1);
    expect(invoices).toHaveLength(1);
    expect(invoices[0].name).toBe("My invoice");
    expect(invoices[0].invoiceData.number).toBe("INV-0007");
  });

  it("keeps an automatic name automatic through export and import", async () => {
    const now = new Date();
    await saveInvoice({
      id: "inv-auto",
      name: "INV-0008",
      nameSource: "auto",
      rev: 3,
      invoiceData: { ...structuredClone(invoiceDefault), number: "INV-0008" },
      templateId: null,
      createdAt: now,
      updatedAt: now
    });

    const exported = await buildExportData();

    await resetDb();
    await executeImport(exported);

    const [imported] = await getAllInvoices();

    expect(imported).toMatchObject({
      name: "INV-0008",
      nameSource: "auto",
      rev: 1
    });
  });

  it("imports an older profile-bearing export, ignoring the profile", async () => {
    const exported = await buildExportData();
    const legacy = {
      ...exported,
      meta: { ...exported.meta, version: 2 },
      profile: {
        id: "business-profile",
        businessName: "Acme Inc.",
        numbering: { prefix: "ACME-", padding: 3, nextNumber: 8 }
      }
    };

    const parsed = await parseExportFile(toFile(legacy));

    // The profile field is not part of the current schema, so it is stripped.
    expect("profile" in parsed).toBe(false);

    const result = await executeImport(parsed);

    expect(result).toEqual({
      templatesImported: 0,
      invoicesImported: 0,
      imagesImported: 0
    });
  });

  it("round-trips an invoice and its logo image through export and import", async () => {
    const now = new Date();
    await saveImage(
      "logo-1",
      new Blob(["PNGDATA"], { type: "image/png" }),
      "image/png"
    );
    await saveInvoice({
      id: "inv-logo",
      name: "Logo invoice",
      nameSource: "user",
      rev: 1,
      invoiceData: { ...structuredClone(invoiceDefault), image: "logo-1" },
      templateId: null,
      createdAt: now,
      updatedAt: now
    });

    const exported = await buildExportData();
    expect(exported.images).toHaveLength(1);

    await resetDb();

    const result = await executeImport(exported);
    const invoices = await getAllInvoices();
    const images = await getAllImages();

    expect(result.imagesImported).toBe(1);
    expect(images).toHaveLength(1);
    expect(invoices[0].invoiceData.image).toBe("logo-1");

    const blob = await getImageBlob("logo-1");
    expect(blob).not.toBeNull();
    expect(await blob?.text()).toBe("PNGDATA");
  });

  it("rejects a file created by a newer format version", async () => {
    const exported = await buildExportData();
    const future = {
      ...exported,
      meta: { ...exported.meta, version: CURRENT_EXPORT_VERSION + 1 }
    };

    await expect(parseExportFile(toFile(future))).rejects.toThrow(
      /newer version/i
    );
  });

  it("leaves the database untouched when an import fails partway", async () => {
    const good = buildImageExport("aGVsbG8=");
    const corrupt = buildImageExport("@@not-base64@@");

    await expect(executeImport(corrupt)).rejects.toThrow();

    expect(await getAllInvoices()).toHaveLength(0);
    expect(await getAllImages()).toHaveLength(0);

    const result = await executeImport(good);
    expect(result.invoicesImported).toBe(1);
    expect(await getAllInvoices()).toHaveLength(1);
    expect(await getAllImages()).toHaveLength(1);
  });

  it("reports and imports only the images that are actually new", async () => {
    await saveImage(
      "shared",
      new Blob(["EXISTING"], { type: "image/png" }),
      "image/png"
    );

    const nowIso = new Date().toISOString();
    const parsed = buildImageExport("aGVsbG8=", [
      { id: "shared", data: "d29ybGQ=", type: "image/png", createdAt: nowIso },
      { id: "fresh", data: "aGVsbG8=", type: "image/png", createdAt: nowIso }
    ]);

    const analysis = await analyzeImport(parsed);
    expect(analysis.images).toEqual({ total: 2, new: 1, duplicates: 1 });

    const result = await executeImport(parsed);
    expect(result.imagesImported).toBe(1);
    expect(await getAllImages()).toHaveLength(2);
  });

  it("coerces an unparseable date on import instead of storing Invalid Date", async () => {
    const nowIso = new Date().toISOString();
    const parsed: ExportFile = {
      meta: {
        version: CURRENT_EXPORT_VERSION,
        exportedAt: nowIso,
        appName: APP_NAME
      },
      templates: [],
      invoices: [
        {
          id: "inv-bad-date",
          name: "Bad date",
          invoiceData: structuredClone(invoiceDefault),
          templateId: null,
          createdAt: "not-a-real-date",
          updatedAt: "yesterday"
        }
      ],
      images: []
    };

    await executeImport(parsed);
    const invoices = await getAllInvoices();

    expect(invoices).toHaveLength(1);
    expect(Number.isNaN(invoices[0].createdAt.getTime())).toBe(false);
    expect(Number.isNaN(invoices[0].updatedAt.getTime())).toBe(false);
  });

  it("still imports an export made under the app's former name", async () => {
    const legacy = buildImageExport("data:image/png;base64,AAAA");
    legacy.meta = { ...legacy.meta, appName: "billsend" };

    const parsed = await parseExportFile(toFile(legacy));

    expect(parsed.invoices).toHaveLength(1);
  });

  it("reports a newer-version file before failing on its body shape", async () => {
    const future = {
      meta: {
        version: CURRENT_EXPORT_VERSION + 1,
        exportedAt: new Date().toISOString(),
        appName: APP_NAME
      },
      invoices: "not-an-array"
    };

    await expect(parseExportFile(toFile(future))).rejects.toThrow(
      /newer version/i
    );
  });
});

// A minimal export carrying one invoice plus the given images, so tests can drive
// the failure and dedupe paths without round-tripping through buildExportData.
function buildImageExport(
  imageData: string,
  images?: ExportFile["images"]
): ExportFile {
  const nowIso = new Date().toISOString();

  return {
    meta: {
      version: CURRENT_EXPORT_VERSION,
      exportedAt: nowIso,
      appName: APP_NAME
    },
    templates: [],
    invoices: [
      {
        id: "inv-1",
        name: "Invoice",
        invoiceData: structuredClone(invoiceDefault),
        templateId: null,
        createdAt: nowIso,
        updatedAt: nowIso
      }
    ],
    images: images ?? [
      { id: "img-1", data: imageData, type: "image/png", createdAt: nowIso }
    ]
  };
}
