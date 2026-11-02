import { getImageBlob } from "~/db";
import type { Invoice } from "~/types";
import { isDirectImageUrl } from "~/utils/is-direct-image-url";

// react-pdf can only decode PNG and JPEG. Any other logo format the uploader
// accepts (WebP, GIF, ...) is silently dropped from the PDF, so re-encode it as
// PNG first.
async function toPdfSafeImageBlob(blob: Blob): Promise<Blob> {
  if (blob.type === "image/png" || blob.type === "image/jpeg") return blob;

  const bitmap = await createImageBitmap(blob);
  const canvas = document.createElement("canvas");
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  canvas.getContext("2d")?.drawImage(bitmap, 0, 0);
  bitmap.close();

  return new Promise((resolve, reject) => {
    canvas.toBlob(pngBlob => {
      if (pngBlob) {
        resolve(pngBlob);
      } else {
        reject(new Error("Failed to convert the logo to PNG"));
      }
    }, "image/png");
  });
}

// The PDF engine is most of the editor's code, so it stays out of the
// editor's first load. It is fetched once the editor is idle (so a PDF can
// still be made after going offline), or sooner when the button is hovered
// or focused; a click awaits whichever request is already under way.
function loadPdfBuilder() {
  return import("~/components/pdf/build-invoice-pdf");
}

export function prefetchPdfBuilder() {
  loadPdfBuilder().catch(() => {
    // A click tries again and reports the failure.
  });
}

// Builds an invoice's PDF. The logo is read from IndexedDB here rather than
// taken from the reactive image loader, which can still be an empty string
// right after opening a saved invoice.
export async function buildPdf(invoice: Invoice): Promise<Blob> {
  let logoUrl = "";
  let logoUrlIsOwned = false;

  try {
    if (isDirectImageUrl(invoice.image)) {
      logoUrl = invoice.image;
    } else if (invoice.image) {
      const blob = await getImageBlob(invoice.image);

      if (blob) {
        logoUrl = URL.createObjectURL(await toPdfSafeImageBlob(blob));
        logoUrlIsOwned = true;
      }
    }

    const { buildInvoicePdfBlob } = await loadPdfBuilder();

    return await buildInvoicePdfBlob({ ...invoice, image: logoUrl });
  } finally {
    // toBlob() has already embedded the logo, so the source URL we minted for
    // it can be released regardless of success.
    if (logoUrlIsOwned) URL.revokeObjectURL(logoUrl);
  }
}
