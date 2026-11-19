import { IconPhotoUp, IconReplace, IconTrash } from "@tabler/icons-react";
import type { FileRejection } from "react-dropzone";
import Dropzone from "react-dropzone";
import {
  ContactSuggestion,
  SuggestionList
} from "~/components/editor/field-suggestions";
import {
  FormAddParts,
  FormArea,
  FormTextArea
} from "~/components/editor/form/form-controls";
import { useAddableParts } from "~/components/editor/invoice-add-part";
import { useClientSuggestions } from "~/components/editor/invoice-client-details";
import { useSellerSuggestions } from "~/components/editor/invoice-seller-details";
import { Button } from "~/components/ui/button";
import { useImageLoader } from "~/hooks/use-image-loader";
import { useShownSections } from "~/hooks/use-shown-sections";
import { cn } from "~/lib/utils";
import {
  useClientSlice,
  useImageSlice,
  useSectionsSlice,
  useSellerSlice,
  useShippingSlice
} from "~/stores/invoice-selectors";
import {
  MAX_IMAGE_SIZE_BYTES,
  storeUploadedImage,
  UPLOADED_IMAGE_TYPES
} from "~/utils/store-uploaded-image";

// The logo, picked from the phone's photos or files, as the page's dropzone
// takes it. With none yet, the whole tile picks one. A logo shows on white, as
// it prints. Removing the image keeps the part on, ready for another. Its
// tile is one row, the height of a field or so.
export function FormLogo() {
  const { image: imageId, setImage } = useImageSlice();
  const { sections, setSection } = useSectionsSlice();
  const imageUrl = useImageLoader(imageId);

  async function handleDrop(
    acceptedFiles: File[],
    fileRejections: FileRejection[]
  ) {
    const newImageId = await storeUploadedImage(acceptedFiles, fileRejections);

    if (newImageId) setImage(newImageId);
  }

  if (!sections.logo) return null;

  return (
    <FormArea
      area="logo"
      title="Logo"
      removeLabel="Hide logo"
      onRemove={() => setSection("logo", false)}
    >
      <Dropzone
        onDrop={handleDrop}
        accept={UPLOADED_IMAGE_TYPES}
        maxSize={MAX_IMAGE_SIZE_BYTES}
        noClick
        noKeyboard
      >
        {({ getRootProps, getInputProps, open, isDragActive }) => (
          <div {...getRootProps()}>
            <input
              {...getInputProps({ name: "logo" })}
              aria-label="Upload logo"
            />
            {imageUrl ? (
              <div className="flex items-center gap-4">
                <div className="flex h-24 w-36 shrink-0 items-center justify-center rounded-md bg-white p-3 outline-1 -outline-offset-1 outline-black/10 dark:outline-white/10">
                  <img
                    src={imageUrl}
                    alt="Invoice logo"
                    className="max-h-full max-w-full object-contain"
                  />
                </div>
                <div className="flex min-w-0 flex-col items-start gap-1">
                  <Button
                    variant="outline"
                    className="h-11 pr-4 pl-3 text-base"
                    onClick={open}
                  >
                    <IconReplace aria-hidden="true" className="size-5" />
                    Change
                  </Button>
                  <Button
                    variant="ghost"
                    aria-label="Remove invoice logo"
                    className="text-muted-foreground h-11 pr-4 pl-3 text-base"
                    onClick={() => setImage("")}
                  >
                    <IconTrash aria-hidden="true" className="size-5" />
                    Remove
                  </Button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={open}
                className={cn(
                  "border-input text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 active:bg-accent flex w-full items-center gap-3 rounded-md border border-dashed p-2.5 text-left transition-colors outline-none focus-visible:ring-3",
                  isDragActive && "border-ring bg-accent"
                )}
              >
                <span className="bg-muted flex size-11 shrink-0 items-center justify-center rounded-sm">
                  <IconPhotoUp aria-hidden="true" className="size-5" />
                </span>
                <span className="flex min-w-0 flex-col">
                  <span className="text-foreground text-base/6 font-medium">
                    Upload logo
                  </span>
                  <span className="text-[0.9375rem]/5.5">
                    PNG, JPG or WebP, up to 5 MB
                  </span>
                </span>
              </button>
            )}
          </div>
        )}
      </Dropzone>
    </FormArea>
  );
}

export function FormSeller() {
  const { seller, setSeller } = useSellerSlice();
  const {
    suggestions,
    isShown,
    activeIndex,
    listId,
    pick,
    onType,
    fieldProps
  } = useSellerSuggestions();
  const title = seller.label.trim() || "From";

  return (
    <FormArea
      area="seller"
      title="From"
      label={{
        value: seller.label,
        field: "seller.label",
        onChange: value => setSeller(prev => ({ ...prev, label: value }))
      }}
    >
      <div className="relative">
        <FormTextArea
          aria-label={`${title} details`}
          {...fieldProps}
          data-field="seller.content"
          value={seller.content}
          onChange={value => {
            setSeller(prev => ({ ...prev, content: value }));
            onType();
          }}
          rows={4}
          placeholder={seller.placeholder}
        />
        {isShown && (
          <SuggestionList
            listId={listId}
            label="Your details from past invoices"
            suggestions={suggestions}
            activeIndex={activeIndex}
            pick={pick}
            getKey={suggestion => suggestion.name}
            renderSuggestion={suggestion => (
              <ContactSuggestion
                name={suggestion.name}
                content={suggestion.content}
              />
            )}
          />
        )}
      </div>
    </FormArea>
  );
}

export function FormClient() {
  const { client, setClient } = useClientSlice();
  const addableParts = useAddableParts("shipping");
  const {
    suggestions,
    isShown,
    activeIndex,
    listId,
    pick,
    onType,
    fieldProps
  } = useClientSuggestions();
  const title = client.label.trim() || "To";

  return (
    <FormArea
      area="client"
      title="To"
      label={{
        value: client.label,
        field: "client.label",
        onChange: value => setClient(prev => ({ ...prev, label: value }))
      }}
    >
      <div className="relative">
        <FormTextArea
          aria-label={`${title} details`}
          {...fieldProps}
          data-field="client.content"
          value={client.content}
          onChange={value => {
            setClient(prev => ({ ...prev, content: value }));
            onType();
          }}
          rows={4}
          placeholder={client.placeholder}
        />
        {isShown && (
          <SuggestionList
            listId={listId}
            label="Clients from past invoices"
            suggestions={suggestions}
            activeIndex={activeIndex}
            pick={pick}
            getKey={suggestion => suggestion.name}
            renderSuggestion={suggestion => (
              <ContactSuggestion
                name={suggestion.name}
                content={suggestion.content}
              />
            )}
          />
        )}
      </div>
      <FormAddParts parts={addableParts} />
    </FormArea>
  );
}

export function FormShipping() {
  const { shipping, setShipping } = useShippingSlice();
  const { setSection } = useSectionsSlice();
  const sections = useShownSections();
  const title = shipping.label.trim() || "Ship to";

  if (!sections.shipping) return null;

  return (
    <FormArea
      area="shipping"
      title="Ship to"
      label={{
        value: shipping.label,
        field: "shipping.label",
        onChange: value => setShipping(prev => ({ ...prev, label: value }))
      }}
      removeLabel="Hide shipping address"
      onRemove={() => setSection("shipping", false)}
    >
      <FormTextArea
        aria-label={`${title} address`}
        data-field="shipping.content"
        value={shipping.content}
        onChange={value => setShipping(prev => ({ ...prev, content: value }))}
        rows={3}
        placeholder={shipping.placeholder}
      />
    </FormArea>
  );
}
