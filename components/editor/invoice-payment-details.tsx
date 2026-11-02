import { InvoiceInput } from "~/components/editor/invoice-input";
import {
  OptionalSection,
  RemoveSectionButton
} from "~/components/editor/invoice-optional-section";
import { InvoiceTextArea } from "~/components/editor/invoice-textarea";
import { useIsPreview, useShownSections } from "~/hooks/use-shown-sections";
import {
  usePaymentDetailsSlice,
  useSectionsSlice,
  useTheme
} from "~/stores/invoice-selectors";
import { getRoleSettings } from "~/utils/get-role-settings";
import { getTextStyles } from "~/utils/get-text-styles";

const PAYMENT_FIELDS = [
  { key: "bankName", label: "Bank name", placeholder: "Acme Bank" },
  {
    key: "accountName",
    label: "Account name",
    placeholder: "Acme Studio Ltd"
  },
  { key: "accountNumber", label: "Account number", placeholder: "12345678" },
  { key: "routingNumber", label: "Routing number", placeholder: "021000021" },
  {
    key: "iban",
    label: "IBAN",
    placeholder: "GB29 NWBK 6016 1331 9268 19"
  },
  { key: "bic", label: "BIC / SWIFT", placeholder: "NWBKGB2L" },
  { key: "sortCode", label: "Sort code", placeholder: "12-34-56" }
] as const;

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
            label={field.label}
            placeholder={field.placeholder}
          />
        ))}
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
  label,
  placeholder
}: {
  fieldKey: (typeof PAYMENT_FIELDS)[number]["key"];
  label: string;
  placeholder: string;
}) {
  const { paymentDetails, setPaymentDetails } = usePaymentDetailsSlice();
  const theme = useTheme();
  const isPreview = useIsPreview();
  const fieldId = `invoice-payment-field-${fieldKey}`;

  if (isPreview && !paymentDetails[fieldKey].trim()) return null;

  return (
    <div className="flex items-center gap-2">
      <label
        htmlFor={fieldId}
        className="w-32 shrink-0"
        style={getTextStyles({
          settings: getRoleSettings(theme, "termsContent")
        })}
      >
        {label}
      </label>
      <InvoiceInput
        id={fieldId}
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
