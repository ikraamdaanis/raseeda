import { IconSignature, IconUpload } from "@tabler/icons-react";
import { useState } from "react";
import type { FileRejection } from "react-dropzone";
import Dropzone from "react-dropzone";
import { InvoiceInput } from "~/components/editor/invoice-input";
import {
  OptionalSection,
  RemoveSectionButton
} from "~/components/editor/invoice-optional-section";
import { SignaturePadDialog } from "~/components/editor/signature-pad-dialog";
import { Button } from "~/components/ui/button";
import { useImageLoader } from "~/hooks/use-image-loader";
import { useIsPreview } from "~/hooks/use-shown-sections";
import { cn } from "~/lib/utils";
import { useSignatureSlice, useTheme } from "~/stores/invoice-selectors";
import { getRoleSettings } from "~/utils/get-role-settings";
import { getTextStyles } from "~/utils/get-text-styles";
import {
  MAX_IMAGE_SIZE_BYTES,
  storeUploadedImage,
  UPLOADED_IMAGE_TYPES
} from "~/utils/store-uploaded-image";

const slotButtonClassName =
  "text-paper-muted-foreground hover:text-paper-foreground hover:bg-paper-muted pointer-coarse:h-11";

/**
 * The signature, last on the page against the right margin: an uploaded image
 * or one drawn in the editor, in the 5 x 2cm box it prints in, with a name or
 * caption under it. Removing the image only detaches it, so undo, versions
 * and templates that still name it keep it.
 */
export function InvoiceSignature({ onRemove }: { onRemove: () => void }) {
  const { signature, setSignature } = useSignatureSlice();
  const isPreview = useIsPreview();
  const imageUrl = useImageLoader(signature.image);
  const theme = useTheme();
  const [isDragging, setIsDragging] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const captionStyle = getTextStyles({
    settings: getRoleSettings(theme, "termsContent")
  });

  function setImage(image: string) {
    setSignature(prev => ({ ...prev, image }));
  }

  async function handleDrop(
    acceptedFiles: File[],
    fileRejections: FileRejection[]
  ) {
    setIsDragging(false);

    const imageId = await storeUploadedImage(acceptedFiles, fileRejections);

    if (imageId) setImage(imageId);
  }

  if (isPreview) {
    return (
      <OptionalSection data-field-area="signature" className="mt-6 items-end">
        <div className="flex w-[50mm] flex-col items-center gap-1">
          {imageUrl && (
            <img
              src={imageUrl}
              alt="Signature"
              className="h-[20mm] w-[50mm] object-contain"
            />
          )}
          {signature.caption.trim() && (
            <p className="w-full text-center" style={captionStyle}>
              {signature.caption}
            </p>
          )}
        </div>
      </OptionalSection>
    );
  }

  return (
    <OptionalSection data-field-area="signature" className="mt-6 items-end">
      <div className="group relative flex w-[50mm] flex-col items-center gap-1">
        {imageUrl ? (
          <div className="relative">
            <img
              src={imageUrl}
              alt="Signature"
              className="h-[20mm] w-[50mm] object-contain"
            />
            <Button
              variant="outline"
              size="xs"
              aria-label="Remove signature"
              className="text-destructive hover:text-destructive shadow-menu absolute right-1.5 bottom-1.5 opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100 hover:bg-[color-mix(in_oklch,var(--background),var(--destructive)_10%)] focus-visible:opacity-100 pointer-coarse:h-8 [@media(hover:none)]:opacity-100"
              onClick={() => setImage("")}
            >
              Remove
            </Button>
          </div>
        ) : (
          <Dropzone
            onDrop={handleDrop}
            onDragEnter={() => setIsDragging(true)}
            onDragLeave={() => setIsDragging(false)}
            accept={UPLOADED_IMAGE_TYPES}
            maxSize={MAX_IMAGE_SIZE_BYTES}
            noClick
            noKeyboard
          >
            {({ getRootProps, getInputProps, open }) => (
              <div
                {...getRootProps()}
                className={cn(
                  "rounded-surface flex h-[20mm] w-full items-center justify-center gap-1",
                  isDragging
                    ? "bg-brand-100 border-brand-500 border-2 border-dashed"
                    : "border-paper-border border border-dashed"
                )}
              >
                <input {...getInputProps()} aria-label="Upload a signature" />
                <Button
                  variant="ghost"
                  size="xs"
                  className={slotButtonClassName}
                  onClick={open}
                >
                  <IconUpload aria-hidden="true" />
                  Upload
                </Button>
                <Button
                  variant="ghost"
                  size="xs"
                  className={slotButtonClassName}
                  onClick={() => setIsDrawing(true)}
                >
                  <IconSignature aria-hidden="true" />
                  Draw
                </Button>
              </div>
            )}
          </Dropzone>
        )}
        <InvoiceInput
          aria-label="Signature caption"
          data-field="signature.caption"
          value={signature.caption}
          onChange={caption => setSignature(prev => ({ ...prev, caption }))}
          placeholder="Name or caption"
          className="text-center"
          style={captionStyle}
        />
        <RemoveSectionButton
          label="Hide signature"
          onClick={onRemove}
          className="bg-paper/90 absolute -top-1 -right-8"
        />
      </div>
      <SignaturePadDialog
        open={isDrawing}
        onOpenChange={setIsDrawing}
        onDone={setImage}
      />
    </OptionalSection>
  );
}
