import { IconArrowDown, IconArrowUp, IconTrash } from "@tabler/icons-react";
import { useId, useRef, useState } from "react";
import {
  FormAddButton,
  FormArea,
  formCardClassName,
  formEnterClassName,
  FormField,
  formHintClassName,
  formIconButtonClassName,
  FormInput,
  formLabelClassName,
  FormSelect,
  FormSwitch,
  FormTextArea
} from "~/components/editor/form/form-controls";
import {
  OTHER_PAYMENT_METHOD,
  PAYMENT_FIELDS,
  PAYMENT_LINK_FIELD,
  PAYMENT_METHOD_SUGGESTIONS
} from "~/components/editor/invoice-payment-details";
import {
  getPaymentLinkNote,
  MISSING_NOTES,
  QR_CODE_CONTENT_LABELS,
  usePaymentQrCode
} from "~/components/editor/invoice-payment-qr-code";
import { Button } from "~/components/ui/button";
import { useShownBankFields } from "~/hooks/use-shown-bank-fields";
import { useShownSections } from "~/hooks/use-shown-sections";
import { cn } from "~/lib/utils";
import {
  DEFAULT_PAYMENT_LABELS,
  PAYMENT_QR_CODE_CONTENTS
} from "~/schema/invoice";
import {
  usePaymentDetailsSlice,
  useSectionsSlice
} from "~/stores/invoice-selectors";
import type { InvoicePaymentMethod } from "~/types";

// How to pay, as the page lists it: the bank rows under their labels, other
// ways to pay in order, the payment link, the QR code and the instructions. A
// bank row's label prints, and is renamed, once the row is filled in. Only
// the bank rows the invoice's currency usually needs show, and any filled
// in; More bank fields shows the rest (useShownBankFields).
export function FormPaymentDetails() {
  const { paymentDetails, setPaymentDetails } = usePaymentDetailsSlice();
  const { setSection } = useSectionsSlice();
  const sections = useShownSections();
  const termsId = useId();
  const { shownFields, hasHiddenFields, showAll } = useShownBankFields();
  const shownBankFields = PAYMENT_FIELDS.filter(field =>
    shownFields.includes(field.key)
  );

  if (!sections.paymentDetails) return null;

  return (
    <FormArea
      area="paymentDetails"
      title="Payment details"
      className="gap-6"
      label={{
        value: paymentDetails.label,
        field: "paymentDetails.label",
        onChange: value =>
          setPaymentDetails(prev => ({ ...prev, label: value }))
      }}
      labels={[...PAYMENT_FIELDS, PAYMENT_LINK_FIELD]
        .filter(field => paymentDetails[field.key].trim() !== "")
        .map(field => ({
          name: DEFAULT_PAYMENT_LABELS[field.key],
          value: paymentDetails.labels[field.key],
          field: `paymentDetails.labels.${field.key}`,
          onChange: value =>
            setPaymentDetails(prev => ({
              ...prev,
              labels: { ...prev.labels, [field.key]: value }
            }))
        }))}
      removeLabel="Hide payment details"
      onRemove={() => setSection("paymentDetails", false)}
    >
      {shownBankFields.map(field => (
        <div key={field.key} className={formEnterClassName}>
          <PaymentField fieldKey={field.key} placeholder={field.placeholder} />
        </div>
      ))}
      {hasHiddenFields && (
        <div className="-mt-3 flex">
          <FormAddButton onClick={showAll}>More bank fields</FormAddButton>
        </div>
      )}
      <PaymentMethods />
      <PaymentField
        fieldKey={PAYMENT_LINK_FIELD.key}
        placeholder={PAYMENT_LINK_FIELD.placeholder}
        type="url"
      />
      <PaymentQrCode />
      <FormField id={termsId} title="Payment instructions">
        <FormTextArea
          id={termsId}
          data-field="paymentDetails.terms"
          value={paymentDetails.terms}
          onChange={value =>
            setPaymentDetails(prev => ({ ...prev, terms: value }))
          }
          placeholder="e.g. Net 30"
        />
      </FormField>
    </FormArea>
  );
}

function PaymentField({
  fieldKey,
  placeholder,
  type = "text"
}: {
  fieldKey: keyof typeof DEFAULT_PAYMENT_LABELS;
  placeholder: string;
  type?: "text" | "url";
}) {
  const { paymentDetails, setPaymentDetails } = usePaymentDetailsSlice();
  const id = useId();
  const defaultLabel = DEFAULT_PAYMENT_LABELS[fieldKey];
  const label = paymentDetails.labels[fieldKey];

  return (
    <FormField
      id={id}
      title={label.trim() || defaultLabel}
      labelField={`paymentDetails.labels.${fieldKey}`}
    >
      <FormInput
        id={id}
        type={type}
        inputMode={type === "url" ? "url" : undefined}
        autoCapitalize="off"
        autoCorrect="off"
        spellCheck={false}
        data-field={`paymentDetails.${fieldKey}`}
        value={paymentDetails[fieldKey]}
        onChange={value =>
          setPaymentDetails(prev => ({ ...prev, [fieldKey]: value }))
        }
        placeholder={placeholder}
      />
    </FormField>
  );
}

// Other ways to pay, each a name (picked from a list, or typed under Other…)
// and the handle, email or number to pay to, moved up and down as they print.
function PaymentMethods() {
  const { paymentDetails, setPaymentDetails } = usePaymentDetailsSlice();
  const { methods } = paymentDetails;
  const addedIdRef = useRef<string | null>(null);

  function updateMethod(id: string, changes: Partial<InvoicePaymentMethod>) {
    setPaymentDetails(prev => ({
      ...prev,
      methods: prev.methods.map(method =>
        method.id === id ? { ...method, ...changes } : method
      )
    }));
  }

  function moveMethod(id: string, offset: number) {
    setPaymentDetails(prev => {
      const index = prev.methods.findIndex(method => method.id === id);
      const target = index + offset;

      if (index === -1 || target < 0 || target >= prev.methods.length) {
        return prev;
      }

      const next = [...prev.methods];
      const [moved] = next.splice(index, 1);

      next.splice(target, 0, moved);

      return { ...prev, methods: next };
    });
  }

  function addMethod() {
    const id = crypto.randomUUID();

    addedIdRef.current = id;
    setPaymentDetails(prev => ({
      ...prev,
      methods: [...prev.methods, { id, name: "", detail: "" }]
    }));
  }

  return (
    <fieldset className="flex flex-col gap-4">
      <legend className={cn(formLabelClassName, "mb-2")}>
        Other ways to pay
      </legend>
      {methods.map((method, index) => (
        <PaymentMethodCard
          key={method.id}
          method={method}
          index={index}
          count={methods.length}
          nameRef={element => {
            if (!element || addedIdRef.current !== method.id) return;

            addedIdRef.current = null;
            element.focus();
          }}
          onChange={changes => updateMethod(method.id, changes)}
          onMove={offset => moveMethod(method.id, offset)}
          onRemove={() =>
            setPaymentDetails(prev => ({
              ...prev,
              methods: prev.methods.filter(each => each.id !== method.id)
            }))
          }
        />
      ))}
      <FormAddButton onClick={addMethod}>Add a way to pay</FormAddButton>
    </fieldset>
  );
}

function PaymentMethodCard({
  method,
  index,
  count,
  nameRef,
  onChange,
  onMove,
  onRemove
}: {
  method: InvoicePaymentMethod;
  index: number;
  count: number;
  nameRef: (element: HTMLSelectElement | null) => void;
  onChange: (changes: Partial<InvoicePaymentMethod>) => void;
  onMove: (offset: number) => void;
  onRemove: () => void;
}) {
  const [isTyping, setIsTyping] = useState(false);
  const nameId = useId();
  const detailId = useId();
  const name = method.name.trim() || `Way to pay ${index + 1}`;
  const nameField = `paymentDetails.methods.${method.id}.name`;
  const isSuggested = PAYMENT_METHOD_SUGGESTIONS.includes(method.name);
  const showsTypedName = isTyping || (method.name !== "" && !isSuggested);

  function handleNameChange(value: string) {
    if (value !== OTHER_PAYMENT_METHOD) {
      onChange({ name: value });

      return;
    }

    if (isSuggested) onChange({ name: "" });
    setIsTyping(true);
  }

  return (
    <div className={cn(formCardClassName, formEnterClassName)}>
      <FormField id={nameId} title="Name">
        {showsTypedName ? (
          <FormInput
            id={nameId}
            ref={isTyping ? focusOnMount : undefined}
            data-field={nameField}
            value={method.name}
            onChange={value => onChange({ name: value })}
            onBlur={() => setIsTyping(false)}
            placeholder="Name"
          />
        ) : (
          <FormSelect
            id={nameId}
            ref={nameRef}
            data-field={nameField}
            value={method.name}
            onChange={event => handleNameChange(event.target.value)}
          >
            <option value="" disabled>
              Choose…
            </option>
            {PAYMENT_METHOD_SUGGESTIONS.map(suggestion => (
              <option key={suggestion} value={suggestion}>
                {suggestion}
              </option>
            ))}
            <option value={OTHER_PAYMENT_METHOD}>Other…</option>
          </FormSelect>
        )}
      </FormField>
      <FormField id={detailId} title="Handle, email or number">
        <FormInput
          id={detailId}
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          data-field={`paymentDetails.methods.${method.id}.detail`}
          value={method.detail}
          onChange={value => onChange({ detail: value })}
          placeholder="e.g. @acme"
        />
      </FormField>
      <div className="-mr-2 flex justify-end gap-3">
        <Button
          variant="ghost"
          aria-label={`Move ${name} up`}
          disabled={index === 0}
          onClick={() => onMove(-1)}
          className={formIconButtonClassName}
        >
          <IconArrowUp aria-hidden="true" className="size-5" />
        </Button>
        <Button
          variant="ghost"
          aria-label={`Move ${name} down`}
          disabled={index === count - 1}
          onClick={() => onMove(1)}
          className={formIconButtonClassName}
        >
          <IconArrowDown aria-hidden="true" className="size-5" />
        </Button>
        <Button
          variant="ghost"
          aria-label={`Remove ${name}`}
          onClick={onRemove}
          className={formIconButtonClassName}
        >
          <IconTrash aria-hidden="true" className="size-5" />
        </Button>
      </div>
    </div>
  );
}

function focusOnMount(element: HTMLInputElement | null) {
  element?.focus();
}

// The "Scan to pay" code's switch, what it encodes, and why it's left out
// when the invoice is missing what that needs.
function PaymentQrCode() {
  const { sections, setSection } = useSectionsSlice();
  const { paymentDetails, setPaymentDetails } = usePaymentDetailsSlice();
  const { missing } = usePaymentQrCode();
  const contentId = useId();
  const upiId = useId();
  const isOn = sections.paymentQrCode;
  const linkLabel =
    paymentDetails.labels.paymentLink.trim() ||
    DEFAULT_PAYMENT_LABELS.paymentLink;
  const hasLink = paymentDetails.paymentLink.trim() !== "";

  return (
    <div className="border-border flex flex-col gap-4 border-t pt-5">
      <FormSwitch
        label="Payment QR code"
        description="Prints a code to scan beside the bank details."
        field="sections.paymentQrCode"
        checked={isOn}
        onCheckedChange={checked => setSection("paymentQrCode", checked)}
      />
      {isOn && (
        <FormField id={contentId} title="Encodes">
          <FormSelect
            id={contentId}
            data-field="paymentDetails.qrCodeContent"
            value={paymentDetails.qrCodeContent}
            onChange={event => {
              const content = PAYMENT_QR_CODE_CONTENTS.find(
                candidate => candidate === event.target.value
              );

              if (!content) return;

              setPaymentDetails(prev => ({ ...prev, qrCodeContent: content }));
            }}
          >
            {PAYMENT_QR_CODE_CONTENTS.map(content => (
              <option key={content} value={content}>
                {QR_CODE_CONTENT_LABELS[content]}
              </option>
            ))}
          </FormSelect>
        </FormField>
      )}
      {isOn && paymentDetails.qrCodeContent === "upi" && (
        <FormField id={upiId} title="UPI ID">
          <FormInput
            id={upiId}
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            data-field="paymentDetails.upiId"
            value={paymentDetails.upiId}
            onChange={value =>
              setPaymentDetails(prev => ({ ...prev, upiId: value }))
            }
            placeholder="e.g. acme@okaxis"
          />
        </FormField>
      )}
      {isOn && missing && (
        <p className={formHintClassName}>
          {`The QR code is left out. ${
            missing === "paymentLink"
              ? getPaymentLinkNote({ linkLabel, hasLink })
              : MISSING_NOTES[missing]
          }`}
        </p>
      )}
    </div>
  );
}
