import type { FileRejection } from "react-dropzone";
import { toast } from "sonner";
import { getImageBlob, saveImage } from "~/db";

// An image is embedded verbatim into every data export (base64), so an
// oversized one bloats storage and later slows exports to a crawl. Cap it well
// above any reasonable logo or signature.
export const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;

// What the logo and signature dropzones accept.
export const UPLOADED_IMAGE_TYPES = {
  "image/*": [".png", ".jpg", ".jpeg", ".webp"]
};

/**
 * Stores the image dropped or picked on a dropzone and resolves its id, or
 * null (having said why) when nothing usable came through or it couldn't be
 * saved. A valid image dropped alongside a stray non-image still uploads.
 */
export async function storeUploadedImage(
  acceptedFiles: File[],
  fileRejections: FileRejection[]
): Promise<string | null> {
  const file = acceptedFiles.at(0);

  if (!file) {
    const tooLarge = fileRejections.some(rejection =>
      rejection.errors.some(error => error.code === "file-too-large")
    );

    toast.error(
      tooLarge
        ? "That image is too large. Please upload an image under 5 MB."
        : "That file isn't a supported image. Upload a PNG, JPG, or WebP."
    );

    return null;
  }

  return storeImageBlob(file, file.type);
}

// Stores an image blob under a new id and resolves the id, or null (having
// said why) when it couldn't be saved.
export async function storeImageBlob(
  blob: Blob,
  type: string
): Promise<string | null> {
  const imageId = crypto.randomUUID();

  try {
    await saveImage(imageId, blob, type);

    const verifyBlob = await getImageBlob(imageId);

    if (!verifyBlob) throw new Error("Image was not saved correctly");

    return imageId;
  } catch (error) {
    toast.error(
      error instanceof Error
        ? error.message
        : "Failed to save image. Please try again."
    );

    return null;
  }
}
