import { getImageBlob } from "~/db";
import type { Invoice } from "~/types";
import { isDirectImageUrl } from "~/utils/is-direct-image-url";

// react-pdf can only decode PNG and JPEG. Any other image format the uploader
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
        reject(new Error("Failed to convert the image to PNG"));
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

// An image the invoice names (an id in IndexedDB, or a blob: or data: URL) as
// a URL react-pdf can read, and whether it was minted here to be released.
async function resolvePdfImage(
  image: string
): Promise<{ url: string; isOwned: boolean }> {
  if (isDirectImageUrl(image)) return { url: image, isOwned: false };
  if (!image) return { url: "", isOwned: false };

  const blob = await getImageBlob(image);

  if (!blob) return { url: "", isOwned: false };

  return {
    url: URL.createObjectURL(await toPdfSafeImageBlob(blob)),
    isOwned: true
  };
}

// Builds an invoice's PDF. The logo and signature are read from IndexedDB
// here rather than taken from the reactive image loader, which can still be
// an empty string right after opening a saved invoice.
export async function buildPdf(invoice: Invoice): Promise<Blob> {
  const images: { url: string; isOwned: boolean }[] = [];

  try {
    const logo = await resolvePdfImage(invoice.image);

    images.push(logo);

    const signature = await resolvePdfImage(invoice.signature.image);

    images.push(signature);

    const { buildInvoicePdfBlob } = await loadPdfBuilder();

    return await buildInvoicePdfBlob({
      ...invoice,
      image: logo.url,
      signature: { ...invoice.signature, image: signature.url }
    });
  } finally {
    // toBlob() has already embedded the images, so the source URLs we minted
    // for them can be released regardless of success.
    for (const image of images) {
      if (image.isOwned) URL.revokeObjectURL(image.url);
    }
  }
}
