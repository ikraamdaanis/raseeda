import { IconPlus } from "@tabler/icons-react";
import { useShallow } from "zustand/react/shallow";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "~/components/ui/dropdown-menu";
import { useIsPreview } from "~/hooks/use-shown-sections";
import { useInvoiceStore } from "~/stores/invoice-store";
import type { InvoiceSectionKey } from "~/types";
import { getTypeSettledSections } from "~/utils/document-type";

// The parts each area of the page can add, in the order they print.
const AREA_SECTIONS = {
  logo: [{ key: "logo", label: "Logo" }],
  shipping: [{ key: "shipping", label: "Shipping" }],
  details: [
    { key: "poNumber", label: "PO number" },
    { key: "supplyDate", label: "Date of supply" },
    { key: "servicePeriod", label: "Service period" }
  ],
  totals: [
    { key: "discounts", label: "Discounts" },
    { key: "tax", label: "Tax" },
    { key: "fees", label: "Fees" },
    { key: "amountPaid", label: "Amount paid" }
  ],
  footer: [
    { key: "paymentDetails", label: "Payment details" },
    { key: "notes", label: "Notes" },
    { key: "terms", label: "Terms" },
    { key: "latePayment", label: "Late payment fee" }
  ]
} as const satisfies Record<
  string,
  readonly { key: InvoiceSectionKey; label: string }[]
>;

const slotClassName =
  "text-paper-muted-foreground/70 hover:text-paper-foreground hover:bg-paper-muted aria-expanded:bg-paper-muted aria-expanded:text-paper-foreground focus-visible:ring-ring flex h-6 w-fit items-center gap-1 rounded-md px-1.5 text-xs outline-none focus-visible:ring-1 pointer-coarse:h-11";

/**
 * Where an area's switched-off parts would print, a faint "+ Add" that lists
 * them; picking one switches it on. With only one part to add, the slot names
 * it ("+ Logo"). Edit mode only: Preview and the PDF never show it. A part
 * the document's type settles (a quote's amount paid) isn't offered.
 */
export function AddSectionSlot({
  area,
  className
}: {
  area: keyof typeof AREA_SECTIONS;
  className?: string;
}) {
  const isPreview = useIsPreview();
  const { sections, documentType, setSection } = useInvoiceStore(
    useShallow(state => ({
      sections: state.sections,
      documentType: state.documentType,
      setSection: state.setSection
    }))
  );
  const settled = getTypeSettledSections(documentType);
  const offered = AREA_SECTIONS[area].filter(
    part => !sections[part.key] && !settled.includes(part.key)
  );

  if (isPreview || offered.length === 0) return null;

  if (offered.length === 1) {
    const [part] = offered;

    return (
      <div data-add-slot={area} className={className}>
        <button
          type="button"
          onClick={() => setSection(part.key, true)}
          className={slotClassName}
        >
          <IconPlus aria-hidden="true" className="size-3.5 shrink-0" />
          {part.label}
        </button>
      </div>
    );
  }

  return (
    <div data-add-slot={area} className={className}>
      <DropdownMenu>
        <DropdownMenuTrigger
          aria-label={`Add to the ${area}`}
          className={slotClassName}
        >
          <IconPlus aria-hidden="true" className="size-3.5 shrink-0" />
          Add
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-auto min-w-40">
          {offered.map(part => (
            <DropdownMenuItem
              key={part.key}
              onClick={() => setSection(part.key, true)}
            >
              {part.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
