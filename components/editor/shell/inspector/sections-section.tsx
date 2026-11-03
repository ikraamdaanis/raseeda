import {
  InspectorGroupLabel,
  InspectorSection,
  InspectorSwitch
} from "~/components/editor/shell/inspector/inspector-controls";
import { useSectionsSlice } from "~/stores/invoice-selectors";
import type { InvoiceSectionKey } from "~/types";

const SECTION_GROUPS: {
  label: string;
  items: { key: InvoiceSectionKey; label: string }[];
}[] = [
  {
    label: "Header",
    items: [
      { key: "logo", label: "Logo" },
      { key: "poNumber", label: "PO number" },
      { key: "supplyDate", label: "Date of supply" },
      { key: "servicePeriod", label: "Service period" },
      { key: "shipping", label: "Shipping address" }
    ]
  },
  {
    label: "Totals",
    items: [
      { key: "discounts", label: "Discounts" },
      { key: "tax", label: "Tax" },
      { key: "fees", label: "Fees" },
      { key: "amountPaid", label: "Amount paid" },
      { key: "paidStamp", label: "Paid stamp" }
    ]
  },
  {
    label: "Footer",
    items: [
      { key: "paymentDetails", label: "Payment details" },
      { key: "notes", label: "Notes" },
      { key: "terms", label: "Terms" },
      { key: "latePayment", label: "Late payment fee" }
    ]
  }
];

// Turns the invoice's optional parts on and off. Off hides a part from the
// page and the PDF (and its money from the totals) but keeps what was typed.
export function SectionsSection() {
  return (
    <InspectorSection id="sections" title="Sections">
      {SECTION_GROUPS.map(group => (
        <div key={group.label} className="flex flex-col gap-0.5">
          <InspectorGroupLabel>{group.label}</InspectorGroupLabel>
          {group.items.map(item => (
            <SectionSwitch
              key={item.key}
              section={item.key}
              label={item.label}
            />
          ))}
        </div>
      ))}
    </InspectorSection>
  );
}

function SectionSwitch({
  section,
  label
}: {
  section: InvoiceSectionKey;
  label: string;
}) {
  const { sections, setSection } = useSectionsSlice();

  return (
    <InspectorSwitch
      label={label}
      checked={sections[section]}
      onCheckedChange={checked => setSection(section, checked)}
    />
  );
}
