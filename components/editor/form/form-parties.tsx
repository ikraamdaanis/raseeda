import { IconUpload } from "@tabler/icons-react";
import type { FileRejection } from "react-dropzone";
import Dropzone from "react-dropzone";
import {
  ContactSuggestion,
  SuggestionList
} from "~/components/editor/field-suggestions";
import {
  FormAddParts,
  FormArea,
  FormInput,
  FormTextArea
} from "~/components/editor/form/form-controls";
import { useAddableParts } from "~/components/editor/invoice-add-part";
import { useClientSuggestions } from "~/components/editor/invoice-client-details";
import { useSellerSuggestions } from "~/components/editor/invoice-seller-details";
import { Button } from "~/components/ui/button";
import { DOCUMENT_TYPE_DEFAULTS } from "~/consts/document-types";
import { useImageLoader } from "~/hooks/use-image-loader";
import { useShownSections } from "~/hooks/use-shown-sections";
import {
  useClientSlice,
  useDocumentType,
  useImageSlice,
  useSectionsSlice,
  useSellerSlice,
  useShippingSlice,
  useTitleSlice
} from "~/stores/invoice-selectors";
import {
  MAX_IMAGE_SIZE_BYTES,
  storeUploadedImage,
  UPLOADED_IMAGE_TYPES
} from "~/utils/store-uploaded-image";

export function FormTitle() {
  const { title, setTitle } = useTitleSlice();
  const documentType = useDocumentType();
  const addableParts = useAddableParts("logo");

  return (
    <FormArea area="title" title="Title">
      <FormInput
        aria-label="Invoice title"
        data-field="title"
        value={title}
        onChange={setTitle}
        placeholder={DOCUMENT_TYPE_DEFAULTS[documentType].title}
        className="-mt-2"
      />
      <FormAddParts parts={addableParts} />
    </FormArea>
  );
}

// The logo, picked from the phone's photos or files, as the page's dropzone
// takes it. Removing the image keeps the part on, ready for another.
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
        {({ getRootProps, getInputProps, open }) => (
          <div {...getRootProps()} className="flex items-center gap-4">
            <input {...getInputProps()} aria-label="Upload logo" />
            {imageUrl ? (
              <img
                src={imageUrl}
                alt="Invoice logo"
                width={80}
                height={80}
                className="bg-muted size-20 shrink-0 rounded-lg object-cover"
              />
            ) : (
              <div className="border-border text-muted-foreground flex size-20 shrink-0 items-center justify-center rounded-lg border border-dashed">
                <IconUpload aria-hidden="true" className="size-6" />
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" className="h-11" onClick={open}>
                {imageUrl ? "Change logo" : "Upload logo"}
              </Button>
              {imageUrl && (
                <Button
                  variant="ghost"
                  aria-label="Remove invoice logo"
                  className="text-destructive hover:text-destructive h-11"
                  onClick={() => setImage("")}
                >
                  Remove
                </Button>
              )}
            </div>
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
