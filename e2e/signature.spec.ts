import type { Page } from "@playwright/test";
import { APP_NAME } from "../consts/app";
import { expect, test } from "./fixtures";
import {
  clickFileMenuItem,
  exportData,
  gotoEditorReady,
  libraryRow,
  nameInvoice,
  selectImportFile,
  storeContains
} from "./helpers";

// A signature (issue #128): uploaded or drawn, printed last on the page.

// A 300 x 100 PNG, black on white, made in the page so the test carries no
// image file.
async function signaturePng(page: Page) {
  const base64 = await page.evaluate(() => {
    const canvas = document.createElement("canvas");

    canvas.width = 300;
    canvas.height = 100;

    const context = canvas.getContext("2d");

    if (!context) throw new Error("No canvas context");

    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, 300, 100);
    context.fillStyle = "#000000";
    context.fillRect(20, 40, 260, 10);

    return canvas.toDataURL("image/png").split(",")[1];
  });

  return {
    name: "signature.png",
    mimeType: "image/png",
    buffer: Buffer.from(base64, "base64")
  };
}

async function addSignature(page: Page) {
  await page.getByRole("button", { name: "Add to the footer" }).click();
  await page.getByRole("menuitem", { name: "Signature" }).click();
}

async function drawSignature(page: Page) {
  await page.getByRole("button", { name: "Draw" }).click();

  const dialog = page.getByRole("dialog", { name: "Draw your signature" });
  const pad = dialog.getByLabel("Signature pad");
  const box = await pad.boundingBox();

  if (!box) throw new Error("The signature pad isn't on screen");

  await page.mouse.move(box.x + box.width * 0.1, box.y + box.height * 0.7);
  await page.mouse.down();

  for (let step = 1; step <= 20; step++) {
    await page.mouse.move(
      box.x + box.width * (0.1 + step * 0.04),
      box.y + box.height * (0.7 - Math.sin(step / 3) * 0.4)
    );
  }

  await page.mouse.up();
  await dialog.getByRole("button", { name: "Done" }).click();
  await expect(dialog).toHaveCount(0);
}

// The width and height of each image the open invoice's PDF embeds.
async function pdfImageSizes(page: Page) {
  return page.evaluate(async globalName => {
    const api: unknown = Reflect.get(window, globalName);

    if (typeof api !== "object" || api === null) {
      throw new Error("No automation API");
    }

    const getPdf: unknown = Reflect.get(api, "getPdf");

    if (typeof getPdf !== "function") throw new Error("No getPdf");

    const blob: unknown = await getPdf.call(api);

    if (!(blob instanceof Blob)) throw new Error("No PDF");

    const text = new TextDecoder("latin1").decode(await blob.arrayBuffer());

    return [
      ...text.matchAll(
        /\/Subtype\s*\/Image[^>]*?\/Width\s+(\d+)[^>]*?\/Height\s+(\d+)/g
      )
    ].map(match => `${match[1]}x${match[2]}`);
  }, APP_NAME.toLowerCase());
}

test("a drawn signature is stored at print resolution and printed", async ({
  page
}) => {
  await gotoEditorReady(page);
  await addSignature(page);
  await drawSignature(page);

  const signature = page.getByRole("img", { name: "Signature" });

  await expect(signature).toBeVisible();
  await expect
    .poll(() =>
      signature.evaluate(image =>
        image instanceof HTMLImageElement
          ? `${image.naturalWidth}x${image.naturalHeight}`
          : ""
      )
    )
    .toBe("567x227");
  await page.getByLabel("Signature caption").fill("Jane Doe, Director");
  expect(await pdfImageSizes(page)).toContain("567x227");
});

test("an uploaded signature prints at its own size, with its caption", async ({
  page
}) => {
  await gotoEditorReady(page);
  await addSignature(page);
  await page
    .getByLabel("Upload a signature")
    .setInputFiles(await signaturePng(page));

  await expect(page.getByRole("img", { name: "Signature" })).toBeVisible();
  await page.getByLabel("Signature caption").fill("Jane Doe");
  await page
    .getByRole("group", { name: "Mode" })
    .getByRole("button", { name: "Preview" })
    .click();
  await expect(page.getByText("Jane Doe", { exact: true })).toBeVisible();
  expect(await pdfImageSizes(page)).toContain("300x100");
});

test("hiding the signature keeps its image for when it's back on", async ({
  page
}) => {
  await gotoEditorReady(page);
  await addSignature(page);
  await drawSignature(page);
  await expect(page.getByRole("img", { name: "Signature" })).toBeVisible();

  await page.getByRole("button", { name: "Hide signature" }).click();

  await expect(page.getByRole("img", { name: "Signature" })).toHaveCount(0);
  expect(await pdfImageSizes(page)).not.toContain("567x227");

  await addSignature(page);

  await expect(page.getByRole("img", { name: "Signature" })).toBeVisible();
  expect(await pdfImageSizes(page)).toContain("567x227");
});

test("export and import bring the signature along", async ({
  page,
  resetDb
}) => {
  await gotoEditorReady(page, "Signed title");
  await nameInvoice(page, "Signed doc");
  await addSignature(page);
  await drawSignature(page);
  await expect(page.getByRole("img", { name: "Signature" })).toBeVisible();
  await page.getByLabel("Signature caption").fill("Signed by Jane");
  await expect
    .poll(() => storeContains(page, "invoices", "Signed by Jane"))
    .toBe(true);

  const { json } = await exportData(page);
  const exported = json as {
    invoices: { invoiceData: { signature: { image: string } } }[];
    images: { id: string }[];
  };
  const signatureId = exported.invoices.at(0)?.invoiceData.signature.image;

  expect(signatureId).toBeTruthy();
  expect(exported.images.map(image => image.id)).toContain(signatureId);

  await resetDb();
  await page.reload();
  await expect(page.getByRole("img", { name: "Signature" })).toHaveCount(0);

  const dialog = await selectImportFile(page, json);

  await dialog.getByRole("button", { name: "Import", exact: true }).click();
  await expect(dialog.getByText(/Successfully imported/)).toBeVisible();
  await dialog.getByRole("button", { name: "Done" }).click();
  await clickFileMenuItem(page, "Open Invoice");
  await libraryRow(page, "Signed doc").click();

  await expect(page.getByRole("img", { name: "Signature" })).toBeVisible();
});
