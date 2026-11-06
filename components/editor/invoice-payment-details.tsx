import {
  IconArrowDown,
  IconArrowUp,
  IconMinus,
  IconPlus
} from "@tabler/icons-react";
import { useRef } from "react";
import { InvoiceInput } from "~/components/editor/invoice-input";
import {
  OptionalSection,
  RemoveSectionButton
} from "~/components/editor/invoice-optional-section";
import { InvoiceTextArea } from "~/components/editor/invoice-textarea";
import { Button } from "~/components/ui/button";
import { useIsPreview, useShownSections } from "~/hooks/use-shown-sections";
import { DEFAULT_PAYMENT_LABELS } from "~/schema/invoice";
import {
  usePaymentDetailsSlice,
  useSectionsSlice,
  useTheme
} from "~/stores/invoice-selectors";
import type { InvoicePaymentMethod } from "~/types";
import { getRoleSettings } from "~/utils/get-role-settings";
import { getTextStyles } from "~/utils/get-text-styles";

const PAYMENT_FIELDS = [
  { key: "bankName", placeholder: "Acme Bank" },
  { key: "accountName", placeholder: "Acme Studio Ltd" },
  { key: "accountNumber", placeholder: "12345678" },
  { key: "routingNumber", placeholder: "021000021" },
  { key: "iban", placeholder: "GB29 NWBK 6016 1331 9268 19" },
  { key: "bic", placeholder: "NWBKGB2L" },
  { key: "sortCode", placeholder: "12-34-56" }
] as const;

// Offered as the name of another way to pay. Any other name can be typed.
const PAYMENT_METHOD_SUGGESTIONS = [
  "PayPal",
  "Venmo",
  "Zelle",
  "Cash App",
  "Wise",
  "Revolut",
  "UPI",
  "Pix",
  "Interac e-Transfer",
  "Bizum",
  "Swish",
  "MobilePay",
  "Vipps",
  "BLIK",
  "M-Pesa"
];

const PAYMENT_METHOD_NAMES_ID = "invoice-payment-method-names";

export function InvoicePaymentDetails() {
  const { setSection } = useSectionsSlice();
  const sections = useShownSections();

  if (!sections.paymentDetails) return null;

  return (
    <OptionalSection data-field-area="paymentDetails" className="mt-6">
      <div className="flex items-center gap-1">
        <PaymentDetailsLabel />
        <RemoveSectionButton
          label="Hide payment details"
          onClick={() => setSection("paymentDetails", false)}
        />
      </div>
      <div className="mt-2 flex flex-col gap-1">
        {PAYMENT_FIELDS.map(field => (
          <PaymentDetailsField
            key={field.key}
            fieldKey={field.key}
            placeholder={field.placeholder}
          />
        ))}
        <PaymentMethods />
      </div>
      <PaymentDetailsTerms />
    </OptionalSection>
  );
}

function PaymentDetailsLabel() {
  const { paymentDetails, setPaymentDetails } = usePaymentDetailsSlice();
  const theme = useTheme();

  return (
    <InvoiceInput
      aria-label="Payment details section label"
      data-field="paymentDetails.label"
      value={paymentDetails.label}
      className="font-medium"
      onChange={value => setPaymentDetails(prev => ({ ...prev, label: value }))}
      placeholder="Payment details"
      style={getTextStyles({
        settings: getRoleSettings(theme, "sectionLabel")
      })}
    />
  );
}

function PaymentDetailsField({
  fieldKey,
  placeholder
}: {
  fieldKey: (typeof PAYMENT_FIELDS)[number]["key"];
  placeholder: string;
}) {
  const { paymentDetails, setPaymentDetails } = usePaymentDetailsSlice();
  const theme = useTheme();
  const isPreview = useIsPreview();
  const defaultLabel = DEFAULT_PAYMENT_LABELS[fieldKey];
  const label = paymentDetails.labels[fieldKey];
  const shownLabel = label.trim() || defaultLabel;

  if (isPreview && !paymentDetails[fieldKey].trim()) return null;

  // The label is renameable, so "Routing number" can read "BSB" or "IFSC";
  // cleared, it prints as the default.
  return (
    <div className="flex items-center gap-2">
      <InvoiceInput
        aria-label={`${defaultLabel} label`}
        data-field={`paymentDetails.labels.${fieldKey}`}
        value={isPreview ? shownLabel : label}
        onChange={value =>
          setPaymentDetails(prev => ({
            ...prev,
            labels: { ...prev.labels, [fieldKey]: value }
          }))
        }
        placeholder={defaultLabel}
        className="w-32 shrink-0"
        style={getTextStyles({
          settings: getRoleSettings(theme, "termsContent")
        })}
      />
      <InvoiceInput
        aria-label={shownLabel}
        data-field={`paymentDetails.${fieldKey}`}
        value={paymentDetails[fieldKey]}
        onChange={value =>
          setPaymentDetails(prev => ({ ...prev, [fieldKey]: value }))
        }
        placeholder={placeholder}
        style={getTextStyles({
          settings: getRoleSettings(theme, "termsContent")
        })}
      />
    </div>
  );
}

// Other ways to be paid besides the bank, each a name and the detail to pay
// to, printed below the bank fields in the order they're put in.
function PaymentMethods() {
  const { paymentDetails, setPaymentDetails } = usePaymentDetailsSlice();
  const isPreview = useIsPreview();
  const { methods } = paymentDetails;
  // The way to pay just added, whose name takes focus once its row mounts.
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

  function removeMethod(id: string) {
    setPaymentDetails(prev => ({
      ...prev,
      methods: prev.methods.filter(method => method.id !== id)
    }));
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
    <>
      {methods.map((method, index) => (
        <PaymentMethodRow
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
          onRemove={() => removeMethod(method.id)}
        />
      ))}
      {!isPreview && (
        <>
          <datalist id={PAYMENT_METHOD_NAMES_ID}>
            {PAYMENT_METHOD_SUGGESTIONS.map(name => (
              <option key={name} value={name} />
            ))}
          </datalist>
          <button
            type="button"
            onClick={addMethod}
            className="text-paper-muted-foreground hover:bg-paper-muted hover:text-paper-foreground focus-visible:ring-ring rounded-control -mx-2 my-0.5 flex h-7 w-fit items-center gap-1.5 px-2 text-sm transition-colors outline-none focus-visible:ring-1 pointer-coarse:h-11"
          >
            <IconPlus aria-hidden="true" className="size-3.5" />
            Add a way to pay
          </button>
        </>
      )}
    </>
  );
}

function PaymentMethodRow({
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
  nameRef: (element: HTMLInputElement | null) => void;
  onChange: (changes: Partial<InvoicePaymentMethod>) => void;
  onMove: (offset: number) => void;
  onRemove: () => void;
}) {
  const theme = useTheme();
  const isPreview = useIsPreview();
  const textStyle = getTextStyles({
    settings: getRoleSettings(theme, "termsContent")
  });
  const name = method.name.trim() || `Way to pay ${index + 1}`;

  if (isPreview && !method.detail.trim()) return null;

  return (
    <div className="group/method flex items-center gap-2">
      <InvoiceInput
        ref={nameRef}
        aria-label={`Way to pay ${index + 1} name`}
        data-field={`paymentDetails.methods.${method.id}.name`}
        list={PAYMENT_METHOD_NAMES_ID}
        value={method.name}
        onChange={value => onChange({ name: value })}
        placeholder="PayPal"
        className="w-32 shrink-0"
        style={textStyle}
      />
      <InvoiceInput
        aria-label={`${name} detail`}
        data-field={`paymentDetails.methods.${method.id}.detail`}
        value={method.detail}
        onChange={value => onChange({ detail: value })}
        placeholder="Handle, email or number"
        style={textStyle}
      />
      {!isPreview && (
        <div className="flex shrink-0 items-center opacity-0 group-focus-within/method:opacity-100 group-hover/method:opacity-100 pointer-coarse:opacity-100">
          <Button
            size="icon-xs"
            variant="ghost"
            aria-label={`Move ${name} up`}
            disabled={index === 0}
            onClick={() => onMove(-1)}
            className="text-paper-muted-foreground hover:text-paper-foreground pointer-coarse:size-11"
          >
            <IconArrowUp aria-hidden="true" />
          </Button>
          <Button
            size="icon-xs"
            variant="ghost"
            aria-label={`Move ${name} down`}
            disabled={index === count - 1}
            onClick={() => onMove(1)}
            className="text-paper-muted-foreground hover:text-paper-foreground pointer-coarse:size-11"
          >
            <IconArrowDown aria-hidden="true" />
          </Button>
          <Button
            size="icon-xs"
            variant="ghost"
            aria-label={`Remove ${name}`}
            onClick={onRemove}
            className="text-paper-muted-foreground hover:text-destructive pointer-coarse:size-11"
          >
            <IconMinus aria-hidden="true" />
          </Button>
        </div>
      )}
    </div>
  );
}

function PaymentDetailsTerms() {
  const { paymentDetails, setPaymentDetails } = usePaymentDetailsSlice();
  const theme = useTheme();
  const isPreview = useIsPreview();

  if (isPreview && !paymentDetails.terms.trim()) return null;

  return (
    <InvoiceTextArea
      id="invoice-field-payment-terms"
      aria-label="Payment instructions"
      data-field="paymentDetails.terms"
      value={paymentDetails.terms}
      onChange={value => setPaymentDetails(prev => ({ ...prev, terms: value }))}
      className="mt-2 field-sizing-content w-full"
      style={getTextStyles({
        settings: getRoleSettings(theme, "termsContent")
      })}
      placeholder="Add payment instructions (e.g. Net 30)"
    />
  );
}
