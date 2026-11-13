import { IconUpload } from "@tabler/icons-react";
import { useState } from "react";
import type { FileRejection } from "react-dropzone";
import Dropzone from "react-dropzone";
import {
  AddPartSlot,
  useAddableParts
} from "~/components/editor/invoice-add-part";
import { RemoveSectionButton } from "~/components/editor/invoice-optional-section";
import { Button } from "~/components/ui/button";
import { useImageLoader } from "~/hooks/use-image-loader";
import { useIsPreview } from "~/hooks/use-shown-sections";
import { cn } from "~/lib/utils";
import { useImageSlice, useSectionsSlice } from "~/stores/invoice-selectors";
import {
  MAX_IMAGE_SIZE_BYTES,
  storeUploadedImage,
  UPLOADED_IMAGE_TYPES
} from "~/utils/store-uploaded-image";

/**
 * The invoice logo dropzone. Remove sits beside the dropzone rather than inside
 * it: a control nested in a role="button" is flattened away for assistive
 * technology.
 */
export function InvoiceImage() {
  const { image: imageId, setImage } = useImageSlice();
  const { sections, setSection } = useSectionsSlice();
  const addableParts = useAddableParts("logo");
  const isPreview = useIsPreview();
  const imageUrl = useImageLoader(imageId);
  const [isDragging, setIsDragging] = useState(false);

  async function handleDrop(
    acceptedFiles: File[],
    fileRejections: FileRejection[]
  ) {
    setIsDragging(false);

    const newImageId = await storeUploadedImage(acceptedFiles, fileRejections);

    if (newImageId) setImage(newImageId);
  }

  function handleRemoveImage() {
    // Only detach the blob; undo, versions or other invoices may still use
    // it, and the sweep when the editor next opens deletes it if not.
    setImage("");
  }

  if (!sections.logo) {
    return <AddPartSlot areaName="header" parts={addableParts} align="end" />;
  }

  // Preview shows the logo as the PDF prints it, or nothing.
  if (isPreview) {
    return imageUrl ? (
      <img
        data-field-area="logo"
        src={imageUrl}
        alt="Invoice logo"
        width={128}
        height={128}
        className="rounded-surface size-32 shrink-0 object-cover"
      />
    ) : null;
  }

  return (
    <Dropzone
      onDrop={handleDrop}
      onDragEnter={() => setIsDragging(true)}
      onDragLeave={() => setIsDragging(false)}
      accept={UPLOADED_IMAGE_TYPES}
      maxSize={MAX_IMAGE_SIZE_BYTES}
    >
      {({ getRootProps, getInputProps }) => (
        <div
          data-field-area="logo"
          className="group group/optional relative shrink-0"
        >
          <div
            {...getRootProps()}
            role="button"
            aria-label={`${imageUrl ? "Change" : "Upload"} invoice logo. Drop an image or activate to browse.`}
            className={cn(
              "rounded-surface focus-visible:ring-ring flex aspect-square h-32 min-w-32 cursor-pointer items-center justify-center overflow-hidden outline-none focus-visible:ring-2",
              isDragging
                ? "bg-brand-100 border-brand-500 border-2 border-dashed"
                : imageUrl
                  ? "bg-paper-muted"
                  : "border-paper-border hover:border-paper-muted-foreground hover:bg-paper-muted focus-visible:bg-paper-muted border border-dashed transition-colors"
            )}
          >
            <input {...getInputProps()} />
            {imageUrl ? (
              <img
                src={imageUrl}
                alt="Invoice logo"
                width={128}
                height={128}
                className="rounded-surface h-32 w-32 object-cover"
              />
            ) : (
              <div className="text-paper-muted-foreground flex flex-col items-center justify-center gap-2 p-2">
                <IconUpload className="size-6 opacity-60" aria-hidden="true" />
                <span className="text-center text-xs">Upload logo</span>
              </div>
            )}
          </div>
          <RemoveSectionButton
            label="Hide logo"
            onClick={() => setSection("logo", false)}
            className="bg-paper/90 absolute top-1 right-1"
          />
          {imageUrl && (
            <Button
              variant="outline"
              size="xs"
              aria-label="Remove invoice logo"
              className="text-destructive hover:text-destructive shadow-menu absolute right-1.5 bottom-1.5 opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100 hover:bg-[color-mix(in_oklch,var(--background),var(--destructive)_10%)] focus-visible:opacity-100 pointer-coarse:h-8 [@media(hover:none)]:opacity-100"
              onClick={handleRemoveImage}
            >
              Remove
            </Button>
          )}
        </div>
      )}
    </Dropzone>
  );
}
