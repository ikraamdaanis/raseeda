import {
  AddPartSlot,
  useAddableParts
} from "~/components/editor/invoice-add-part";
import { InvoiceInput } from "~/components/editor/invoice-input";
import {
  OptionalSection,
  RemoveSectionButton
} from "~/components/editor/invoice-optional-section";
import { InvoiceTextArea } from "~/components/editor/invoice-textarea";
import { useShownSections } from "~/hooks/use-shown-sections";
import {
  useSectionsSlice,
  useShippingSlice,
  useTheme
} from "~/stores/invoice-selectors";
import { getRoleSettings } from "~/utils/get-role-settings";
import { getTextStyles } from "~/utils/get-text-styles";

// Shown while the Shipping address section is on; while it's off, a slot
// under the client adds it.
export function InvoiceShipping() {
  const { setSection } = useSectionsSlice();
  const sections = useShownSections();
  const addableParts = useAddableParts("shipping");

  if (!sections.shipping) {
    return (
      <AddPartSlot areaName="shipping" parts={addableParts} className="-mx-1" />
    );
  }

  return (
    <OptionalSection data-field-area="shipping" className="gap-1">
      <div className="flex items-center gap-1">
        <ShippingLabel />
        <RemoveSectionButton
          label="Hide shipping address"
          onClick={() => setSection("shipping", false)}
        />
      </div>
      <ShippingContent />
    </OptionalSection>
  );
}

function ShippingLabel() {
  const { shipping, setShipping } = useShippingSlice();
  const theme = useTheme();

  return (
    <InvoiceInput
      aria-label="Shipping section label"
      data-field="shipping.label"
      value={shipping.label}
      className="font-medium"
      onChange={value => setShipping(prev => ({ ...prev, label: value }))}
      placeholder="Ship to"
      style={getTextStyles({
        settings: getRoleSettings(theme, "sectionLabel")
      })}
    />
  );
}

function ShippingContent() {
  const { shipping, setShipping } = useShippingSlice();
  const theme = useTheme();

  return (
    <InvoiceTextArea
      id="invoice-field-shipping"
      aria-label={`${shipping.label || "Shipping"} address`}
      data-field="shipping.content"
      value={shipping.content}
      onChange={value => setShipping(prev => ({ ...prev, content: value }))}
      className="field-sizing-content min-h-[4lh] w-full max-w-[500px]"
      style={getTextStyles({
        settings: getRoleSettings(theme, "sectionContent")
      })}
      placeholder={shipping.placeholder}
    />
  );
}
