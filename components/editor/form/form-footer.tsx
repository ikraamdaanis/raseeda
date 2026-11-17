import { IconSignature, IconUpload } from "@tabler/icons-react";
import { useId, useState } from "react";
import type { FileRejection } from "react-dropzone";
import Dropzone from "react-dropzone";
import {
  FormAddParts,
  FormArea,
  FormField,
  FormInput,
  formSectionClassName,
  FormTextArea
} from "~/components/editor/form/form-controls";
import { useAddableParts } from "~/components/editor/invoice-add-part";
import { SignaturePadDialog } from "~/components/editor/signature-pad-dialog";
import { Button } from "~/components/ui/button";
import { useImageLoader } from "~/hooks/use-image-loader";
import { useShownSections } from "~/hooks/use-shown-sections";
import {
  useLatePaymentSlice,
  useNotesSlice,
  useSectionsSlice,
  useSignatureSlice,
  useTermsSlice
} from "~/stores/invoice-selectors";
import type { InvoiceSectionKey } from "~/types";
import {
  MAX_IMAGE_SIZE_BYTES,
  storeUploadedImage,
  UPLOADED_IMAGE_TYPES
} from "~/utils/store-uploaded-image";

// A labelled block of text at the foot of the page: notes, terms, the late
// payment fee.
function FormTextSection({
  area,
  title,
  section,
  block,
  setBlock,
  placeholder
}: {
  area: string;
  title: string;
  section: InvoiceSectionKey;
  block: { label: string; content: string };
  setBlock: (
    updater: (prev: { label: string; content: string }) => {
      label: string;
      content: string;
    }
  ) => void;
  placeholder: string;
}) {
  const { setSection } = useSectionsSlice();
  const name = block.label.trim() || title;

  return (
    <FormArea
      area={area}
      title={title}
      label={{
        value: block.label,
        field: `${area}.label`,
        onChange: value => setBlock(prev => ({ ...prev, label: value }))
      }}
      removeLabel={`Hide ${title.toLowerCase()}`}
      onRemove={() => setSection(section, false)}
    >
      <FormTextArea
        aria-label={`${name} content`}
        data-field={`${area}.content`}
        value={block.content}
        onChange={value => setBlock(prev => ({ ...prev, content: value }))}
        rows={3}
        placeholder={placeholder}
      />
    </FormArea>
  );
}

// The parts at the foot of the page, in the order they print, the signature
// last, then the ones that are off, to add.
export function FormFooter() {
  const sections = useShownSections();
  const { notes, setNotes } = useNotesSlice();
  const { terms, setTerms } = useTermsSlice();
  const { latePayment, setLatePayment } = useLatePaymentSlice();
  const addableParts = useAddableParts("footer");
  const addHeadingId = useId();

  return (
    <>
      {sections.notes && (
        <FormTextSection
          area="notes"
          title="Notes"
          section="notes"
          block={notes}
          setBlock={setNotes}
          placeholder="Add any additional notes"
        />
      )}
      {sections.terms && (
        <FormTextSection
          area="terms"
          title="Terms and conditions"
          section="terms"
          block={terms}
          setBlock={setTerms}
          placeholder="Add terms and conditions"
        />
      )}
      {sections.latePayment && (
        <FormTextSection
          area="latePayment"
          title="Late payment"
          section="latePayment"
          block={latePayment}
          setBlock={setLatePayment}
          placeholder="e.g. A 2% monthly fee applies to overdue balances."
        />
      )}
      {sections.signature && <FormSignature />}
      {addableParts.length > 0 && (
        <section
          aria-labelledby={addHeadingId}
          className={formSectionClassName}
        >
          <h2 id={addHeadingId} className="text-lg font-semibold">
            Add to the invoice
          </h2>
          <FormAddParts parts={addableParts} />
        </section>
      )}
    </>
  );
}

// The signature, uploaded or drawn, with a name or caption under it. Removing
// the image only detaches it, as on the page.
function FormSignature() {
  const { signature, setSignature } = useSignatureSlice();
  const { setSection } = useSectionsSlice();
  const imageUrl = useImageLoader(signature.image);
  const [isDrawing, setIsDrawing] = useState(false);
  const captionId = useId();

  function setImage(image: string) {
    setSignature(prev => ({ ...prev, image }));
  }

  async function handleDrop(
    acceptedFiles: File[],
    fileRejections: FileRejection[]
  ) {
    const imageId = await storeUploadedImage(acceptedFiles, fileRejections);

    if (imageId) setImage(imageId);
  }

  return (
    <FormArea
      area="signature"
      title="Signature"
      removeLabel="Hide signature"
      onRemove={() => setSection("signature", false)}
    >
      {imageUrl ? (
        <div className="flex items-center gap-3">
          <img
            src={imageUrl}
            alt="Signature"
            className="border-border h-20 w-[12.5rem] rounded-md border bg-white object-contain"
          />
          <Button
            variant="ghost"
            aria-label="Remove signature"
            className="text-muted-foreground h-11 text-base"
            onClick={() => setImage("")}
          >
            Remove
          </Button>
        </div>
      ) : (
        <Dropzone
          onDrop={handleDrop}
          accept={UPLOADED_IMAGE_TYPES}
          maxSize={MAX_IMAGE_SIZE_BYTES}
          noClick
          noKeyboard
        >
          {({ getRootProps, getInputProps, open }) => (
            <div {...getRootProps()}>
              <input {...getInputProps()} aria-label="Upload a signature" />
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  className="h-11 pr-4 pl-3 text-base"
                  onClick={open}
                >
                  <IconUpload aria-hidden="true" className="size-5" />
                  Upload
                </Button>
                <Button
                  variant="outline"
                  className="h-11 pr-4 pl-3 text-base"
                  onClick={() => setIsDrawing(true)}
                >
                  <IconSignature aria-hidden="true" className="size-5" />
                  Draw
                </Button>
              </div>
            </div>
          )}
        </Dropzone>
      )}
      <FormField id={captionId} title="Name or caption">
        <FormInput
          id={captionId}
          data-field="signature.caption"
          value={signature.caption}
          onChange={caption => setSignature(prev => ({ ...prev, caption }))}
          placeholder="e.g. Jane Doe, Director"
        />
      </FormField>
      <SignaturePadDialog
        open={isDrawing}
        onOpenChange={setIsDrawing}
        onDone={setImage}
      />
    </FormArea>
  );
}
